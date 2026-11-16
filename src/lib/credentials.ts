import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

function same(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

export function credentialsMatch(
  email: string,
  password: string,
  expectedEmail: string,
  expectedPassword: string,
) {
  if (!expectedEmail || !expectedPassword) return false;
  const emailMatches = same(email.trim().toLowerCase(), expectedEmail.trim().toLowerCase());
  const passwordMatches = same(password, expectedPassword);
  return emailMatches && passwordMatches;
}
