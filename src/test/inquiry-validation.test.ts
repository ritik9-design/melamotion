import { describe, expect, it } from "vitest";
import { inquirySchema } from "@/lib/inquiry-validation";

describe("enquiry details", () => {
  const requiredFields = {
    name: "Studio editor",
    email: "editor@example.com",
    project_type: "Highlight film",
    message: "We are looking for a wedding edit.",
  };

  it("accepts an enquiry without an optional budget", () => {
    expect(inquirySchema.safeParse(requiredFields).success).toBe(true);
  });

  it("requires a name, email, project type, and message", () => {
    for (const field of ["name", "email", "project_type", "message"] as const) {
      const incomplete = { ...requiredFields, [field]: " " };
      expect(inquirySchema.safeParse(incomplete).success).toBe(false);
    }
  });
});