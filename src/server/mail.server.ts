import nodemailer from "nodemailer";
import { buildEnquiryEmail, readSmtpConfig, type EnquiryMailInput } from "@/server/mail-config";
import { loadLocalEnv } from "@/server/auth.server";

export type EnquiryAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

const missingMail = "Your enquiry is saved, but the email was not sent. Add SMTP_EMAIL, SMTP_PASSWORD, and ENQUIRY_RECEIVER_EMAIL in the .env file, then try again.";
const rejectedMail = "Your enquiry is saved, but Google rejected the password. Put a Google app password in SMTP_PASSWORD. The normal account password will not send mail.";
const failedMail = "Your enquiry is saved, but the email was not sent. Check the SMTP host, email, and password in the .env file, then try again.";

export async function sendEnquiryMail(input: EnquiryMailInput & { attachments: EnquiryAttachment[] }) {
  loadLocalEnv();
  const config = readSmtpConfig(process.env);
  if (!config.configured) {
    console.error("Enquiry email skipped. Set SMTP_EMAIL, SMTP_PASSWORD, and ENQUIRY_RECEIVER_EMAIL.");
    return { ok: false as const, error: missingMail };
  }

  const message = buildEnquiryEmail(input);
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port === 587,
    auth: { user: config.email, pass: config.password },
  });

  try {
    await transport.sendMail({
      from: `"Mela Motion Films" <${config.email}>`,
      to: config.to,
      replyTo: input.email.replace(/[\r\n]/g, ""),
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: input.attachments.map((file) => ({
        filename: file.filename,
        content: file.content,
        contentType: file.contentType,
      })),
    });
    return { ok: true as const };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown mail error";
    console.error("Enquiry email failed:", detail);
    const rejected = /535|534|credentials|username and password|authentication unsuccessful/i.test(detail);
    return { ok: false as const, error: rejected ? rejectedMail : failedMail };
  }
}
