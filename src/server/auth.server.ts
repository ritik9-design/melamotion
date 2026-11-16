import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getRequest, useSession } from "@tanstack/react-start/server";
import { credentialsMatch } from "@/lib/credentials";
import { clearRateLimit, isRateLimited, recordFailure } from "@/lib/rate-limit";
import { clientAddress } from "@/server/client-address.server";

type StudioSession = { email: string };

const mailKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_EMAIL", "SMTP_PASSWORD", "ENQUIRY_RECEIVER_EMAIL"];
let envLoaded = false;

function readEnvValue(text: string, key: string) {
  const line = text.split(/\r?\n/).find((entry) => entry.startsWith(`${key}=`));
  if (!line) return null;
  let value = line.slice(key.length + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return value;
}

export function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  if (!envLoaded) {
    envLoaded = true;
    process.loadEnvFile(envPath);
  }
  const text = readFileSync(envPath, "utf8");
  for (const key of mailKeys) {
    const value = readEnvValue(text, key);
    if (value !== null) process.env[key] = value;
  }
}

function studioCredentials() {
  loadLocalEnv();
  return {
    email: process.env["ADMIN_EMAIL"] ?? "",
    password: process.env["ADMIN_PASSWORD"] ?? "",
    secret: process.env["AUTH_SECRET"] ?? "",
  };
}

function sessionConfig() {
  const { secret } = studioCredentials();
  if (secret.length < 32) return null;
  return {
    password: secret,
    name: "mela_studio",
    maxAge: 60 * 60 * 12,
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: process.env["NODE_ENV"] === "production",
    },
  };
}

export async function currentUser() {
  const config = sessionConfig();
  if (!config) return null;
  const cookie = getRequest().headers.get("cookie") ?? "";
  const hasSession = cookie.split(";").some((part) => {
    const [name, value] = part.trim().split("=");
    return name === config.name && Boolean(value);
  });
  if (!hasSession) return null;
  const current = await useSession<StudioSession>(config);
  const email = current.data.email;
  const expected = studioCredentials().email.trim().toLowerCase();
  if (!email || email !== expected) return null;
  return email;
}

export async function login(email: string, password: string) {
  const key = `login:${clientAddress()}`;
  if (isRateLimited(key, 10, 15 * 60 * 1000)) {
    return { ok: false as const, error: "Too many sign-in attempts. Wait a few minutes and try again." };
  }
  const { email: expectedEmail, password: expectedPassword } = studioCredentials();
  if (!expectedEmail || !expectedPassword || !sessionConfig()) {
    console.error("Studio sign-in is not configured.");
    return { ok: false as const, error: "Studio sign-in is unavailable right now." };
  }
  if (!credentialsMatch(email, password, expectedEmail, expectedPassword)) {
    recordFailure(key, 15 * 60 * 1000);
    return { ok: false as const, error: "That email and password could not be verified. Please check them and try again." };
  }
  clearRateLimit(key);
  const config = sessionConfig();
  if (!config) {
    console.error("Studio sign-in is not configured.");
    return { ok: false as const, error: "Studio sign-in is unavailable right now." };
  }
  const current = await useSession<StudioSession>(config);
  await current.update({ email: expectedEmail.trim().toLowerCase() });
  return { ok: true as const };
}

export async function logout() {
  const config = sessionConfig();
  if (!config) return;
  const current = await useSession<StudioSession>(config);
  await current.clear();
}

export async function requireStudio() {
  const email = await currentUser();
  if (!email) throw new Error("Unauthorized");
  return email;
}
