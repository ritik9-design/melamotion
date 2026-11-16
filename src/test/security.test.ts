import { describe, expect, it } from "vitest";
import { fileMatchesDeclaredType } from "@/lib/file-signatures";
import { clearRateLimit, isRateLimited, recordFailure, resetRateLimits, takeRateLimit } from "@/lib/rate-limit";
import { securityHeaders } from "@/lib/security-headers";

describe("upload signatures", () => {
  it("accepts a real jpeg and rejects html dressed up as one", () => {
    expect(fileMatchesDeclaredType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg")).toBe(true);
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect(fileMatchesDeclaredType(html, "image/jpeg")).toBe(false);
    expect(fileMatchesDeclaredType(html, "text/plain")).toBe(false);
    expect(fileMatchesDeclaredType(new TextEncoder().encode("Hello from the studio"), "text/plain")).toBe(true);
  });
});

describe("rate limits", () => {
  it("locks a key after the allowed failures and clears it again", () => {
    resetRateLimits();
    const key = "login:test";
    for (let attempt = 0; attempt < 3; attempt += 1) recordFailure(key, 1000, 1_000);
    expect(isRateLimited(key, 3, 1000, 1_500)).toBe(true);
    clearRateLimit(key);
    expect(isRateLimited(key, 3, 1000, 1_500)).toBe(false);
  });

  it("stops accepting work once the window is full", () => {
    resetRateLimits();
    expect(takeRateLimit("enquiry:test", 2, 1000, 5_000).ok).toBe(true);
    expect(takeRateLimit("enquiry:test", 2, 1000, 5_100).ok).toBe(true);
    expect(takeRateLimit("enquiry:test", 2, 1000, 5_200).ok).toBe(false);
  });
});

describe("security headers", () => {
  it("blocks framing and sniffing, and keeps the studio out of caches", () => {
    const home = securityHeaders({ pathname: "/", production: true });
    expect(home["X-Content-Type-Options"]).toBe("nosniff");
    expect(home["X-Frame-Options"]).toBe("DENY");
    expect(home["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(home["Strict-Transport-Security"]).toContain("max-age=31536000");
    const studio = securityHeaders({ pathname: "/admin", production: false });
    expect(studio["Cache-Control"]).toBe("private, no-store");
    expect(studio["X-Robots-Tag"]).toBe("noindex, nofollow");
    expect(studio["Strict-Transport-Security"]).toBeUndefined();
  });
});
