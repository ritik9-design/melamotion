export type SmtpConfig = {
  host: string;
  port: number;
  email: string;
  password: string;
  to: string;
  configured: boolean;
};

export function readSmtpConfig(env: Record<string, string | undefined>): SmtpConfig {
  const email = (env["SMTP_EMAIL"] ?? "").trim();
  const password = (env["SMTP_PASSWORD"] ?? "").trim();
  const to = (env["ENQUIRY_RECEIVER_EMAIL"] ?? "").trim();
  const host = (env["SMTP_HOST"] ?? "").trim() || "smtp.gmail.com";
  const rawPort = Number(env["SMTP_PORT"] ?? "");
  const port = Number.isInteger(rawPort) && rawPort > 0 && rawPort < 65536 ? rawPort : 587;
  return {
    host,
    port,
    email,
    password,
    to,
    configured: Boolean(email && password && to),
  };
}

export type EnquiryMailInput = {
  name: string;
  email: string;
  project_type: string;
  budget: string | null;
  message: string;
  attachmentNames: string[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function oneLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function buildEnquiryEmail(input: EnquiryMailInput) {
  const email = oneLine(input.email);
  const budget = input.budget?.trim() || "Not given";
  const names = input.attachmentNames.map((name) => name.trim()).filter(Boolean);
  const subject = `New film enquiry from ${oneLine(input.name).slice(0, 80) || "a client"}`;
  const text = [
    `Name: ${input.name}`,
    `Email: ${email}`,
    `Film: ${input.project_type}`,
    `Budget: ${budget}`,
    "",
    input.message,
    "",
    names.length ? `Attachments:\n${names.map((name) => `- ${name}`).join("\n")}` : "No files were attached.",
  ].join("\n");

  const html = `<div style="margin:0;padding:28px;background:#f4efe6;color:#2c261f;font-family:Georgia,'Times New Roman',serif;">
  <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8a7b68;">Mela Motion Films</p>
  <h1 style="margin:0;font-size:34px;font-weight:400;line-height:1;">A new enquiry.</h1>
  <div style="width:48px;height:1px;margin:18px 0 22px;background:#c6a36a;"></div>
  <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;"><strong>Name</strong><br>${escapeHtml(input.name)}</p>
  <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;"><strong>Email</strong><br><a href="mailto:${escapeHtml(email)}" style="color:#2c261f;">${escapeHtml(email)}</a></p>
  <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;"><strong>Film</strong><br>${escapeHtml(input.project_type)}</p>
  <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;"><strong>Budget</strong><br>${escapeHtml(budget)}</p>
  <p style="margin:18px 0 0;font-family:Arial,sans-serif;font-size:13px;line-height:1.7;">${escapeHtml(input.message).replaceAll("\n", "<br>")}</p>
  <p style="margin:18px 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#6f6456;">${names.length ? `Attached:<br>${names.map((name) => escapeHtml(name)).join("<br>")}` : "No files were attached."}</p>
</div>`;

  return { subject, text, html };
}
