import nodemailer from "nodemailer";
import type { EmailMessage, EmailResult } from "./resend";

/** Send an email through an SMTP server using nodemailer. */
export async function sendSmtp(msg: EmailMessage): Promise<EmailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;
  if (!host || !user || !pass) {
    return { ok: false, provider: "smtp", error: "SMTP 未配置（SMTP_HOST/USER/PASS）" };
  }
  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transport.sendMail({
      from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text ?? msg.html,
    });
    return { ok: true, provider: "smtp" };
  } catch (e) {
    return { ok: false, provider: "smtp", error: String(e) };
  }
}
