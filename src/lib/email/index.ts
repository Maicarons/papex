import { sendResend, type EmailMessage, type EmailResult } from "./resend";
import { sendSmtp } from "./smtp";

export type { EmailMessage, EmailResult } from "./resend";

/**
 * Provider-agnostic email sender. Selects the backend from EMAIL_PROVIDER:
 *   - "resend" -> Resend REST API
 *   - "smtp"   -> SMTP (nodemailer)
 *   - (unset)  -> no-op (returns ok:false so callers can skip silently)
 *
 * Email delivery never throws — failures are reported via the result so the
 * caller (e.g. the subscription notifier) can fall back to in-app announcements.
 */
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const provider = (process.env.EMAIL_PROVIDER ?? "none").toLowerCase();
  if (provider === "resend") return sendResend(msg);
  if (provider === "smtp") return sendSmtp(msg);
  return { ok: false, provider: "none", error: "EMAIL_PROVIDER 未配置，跳过邮件发送" };
}

/** Build a plaintext + HTML notification body for a newly published paper. */
export function buildNewPaperEmail(opts: {
  title: string;
  paperId: string;
  appName: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const url = `${opts.appUrl.replace(/\/$/, "")}/papers/${encodeURIComponent(opts.paperId)}`;
  const subject = `${opts.appName} 新论文发布：${opts.title}`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
  <h2 style="margin-bottom:8px">${escapeHtml(opts.title)}</h2>
  <p style="color:#555">您订阅的主题或作者发布了一篇新论文。</p>
  <p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none">查看论文</a></p>
  <p style="color:#999;font-size:12px">您收到此邮件是因为在 ${opts.appName} 订阅了相关主题。可在「我的提醒」中管理订阅。</p>
</div>`;
  const text = `新论文发布：${opts.title}\n查看：${url}\n\n您收到此邮件是因为在 ${opts.appName} 订阅了相关主题。`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
