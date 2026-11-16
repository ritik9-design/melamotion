import { describe, expect, it } from "vitest";
import { credentialsMatch } from "@/lib/credentials";

describe("studio credentials", () => {
  it("accepts the env email and password", () => {
    expect(credentialsMatch(" Studio@Example.com ", "secret-pass", "studio@example.com", "secret-pass")).toBe(true);
  });

  it("rejects a wrong password and an empty env password", () => {
    expect(credentialsMatch("studio@example.com", "nope", "studio@example.com", "secret-pass")).toBe(false);
    expect(credentialsMatch("studio@example.com", "secret-pass", "studio@example.com", "")).toBe(false);
  });
});
