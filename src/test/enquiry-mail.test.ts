import { describe, expect, it } from "vitest";
import { describeEnquiryMedia, ENQUIRY_MEDIA_TOO_BIG } from "@/lib/enquiry-media";
import { buildEnquiryEmail, readSmtpConfig } from "@/server/mail-config";

describe("enquiry media", () => {
  it("accepts a photo or a video", () => {
    expect(describeEnquiryMedia({ name: "still.jpg", type: "image/jpeg", size: 1200 }).ok).toBe(true);
    expect(describeEnquiryMedia({ name: "clip.mov", type: "", size: 1200 })).toMatchObject({ ok: true, kind: "video" });
  });

  it("rejects an oversized or unknown file", () => {
    expect(describeEnquiryMedia({ name: "clip.mp4", type: "video/mp4", size: 16 * 1024 * 1024 })).toMatchObject({
      ok: false,
      error: ENQUIRY_MEDIA_TOO_BIG,
    });
    expect(describeEnquiryMedia({ name: "notes.pdf", type: "application/pdf", size: 1200 })).toMatchObject({ ok: true, kind: "document" });
    expect(describeEnquiryMedia({ name: "brief.docx", type: "", size: 1200 })).toMatchObject({ ok: true, kind: "document" });
    expect(describeEnquiryMedia({ name: "notes.exe", type: "application/octet-stream", size: 1200 }).ok).toBe(false);
    expect(describeEnquiryMedia({ name: "shell.html", type: "image/jpeg", size: 1200 }).ok).toBe(false);
    expect(describeEnquiryMedia({ name: "photo.html.jpg", type: "image/jpeg", size: 1200 }).ok).toBe(false);
  });
});

describe("enquiry mail", () => {
  it("is ready only when the sender, password, and receiver are set", () => {
    expect(readSmtpConfig({ SMTP_HOST: "smtp.gmail.com" }).configured).toBe(false);
    expect(
      readSmtpConfig({
        SMTP_EMAIL: "studio@example.com",
        SMTP_PASSWORD: "app-password",
        ENQUIRY_RECEIVER_EMAIL: "hello@example.com",
        SMTP_PORT: "465",
      }),
    ).toMatchObject({ configured: true, port: 465, to: "hello@example.com" });
  });

  it("keeps enquiry text out of the email markup", () => {
    const mail = buildEnquiryEmail({
      name: "Ada\nBcc: other@example.com",
      email: "ada@example.com",
      project_type: "Highlight film",
      budget: null,
      message: "<script>alert(1)</script>",
      attachmentNames: ["garden.png", "brief.pdf"],
    });
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).not.toContain("<script>");
    expect(mail.text).toContain("garden.png");
    expect(mail.text).toContain("brief.pdf");
  });
});
