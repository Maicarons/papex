export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  ok: boolean;
  provider: string;
  error?: string;
}

const RESEND_API = "https://api.resend.com/emails";

/** Send an email through the Resend REST API (no SDK dependency). */
export async function sendResend(msg: EmailMessage): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  if (!key) return { ok: false, provider: "resend", error: "RESEND_API_KEY 未配置" };
  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text ?? msg.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, provider: "resend", error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true, provider: "resend" };
  } catch (e) {
    return { ok: false, provider: "resend", error: String(e) };
  }
}
