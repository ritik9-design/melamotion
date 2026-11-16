import { getRequest, getRequestIP } from "@tanstack/react-start/server";

export function clientAddress() {
  const request = getRequest();
  const direct = (getRequestIP() || "").trim();
  const forwarded = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "").trim();
  const local =
    !direct ||
    direct === "127.0.0.1" ||
    direct === "::1" ||
    direct.startsWith("10.") ||
    direct.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(direct) ||
    direct === "localhost";
  const raw = local && forwarded ? forwarded : direct || forwarded || "local";
  return raw.replace(/[^\w.:-]/g, "").slice(0, 80) || "local";
}
