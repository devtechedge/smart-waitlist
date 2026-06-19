import "server-only";
import { Resend } from "resend";

import { publicEnv } from "@/lib/public-env";

/**
 * Email service (Resend)
 * ----------------------
 * Sends transactional emails via Resend. Gracefully degrades — if
 * `RESEND_API_KEY` is not set, all send functions log + return success
 * without actually sending.
 *
 * To enable real email:
 *   1. Sign up at https://resend.com (free: 100 emails/day)
 *   2. Verify your sending domain
 *   3. Set RESEND_API_KEY and RESEND_FROM_EMAIL env vars
 */

let cachedClient: Resend | null = null;

function getEmailClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cachedClient = new Resend(apiKey);
  return cachedClient;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Smart Waitlist <noreply@resend.dev>";
}

// ============================================================================
// Referral notification
// ============================================================================

export type ReferralNotificationParams = {
  referrerEmail: string;
  referrerName: string | null;
  newUserName: string | null;
  referralCount: number;
};

export async function sendReferralNotification(
  params: ReferralNotificationParams,
): Promise<void> {
  const client = getEmailClient();
  if (!client) {
    console.log("[email] RESEND_API_KEY not set — skipping referral notification");
    return;
  }

  const { referrerEmail, referrerName, newUserName, referralCount } = params;
  const dashboardUrl = `${publicEnv.NEXT_PUBLIC_APP_URL}/dashboard`;

  const html = renderReferralEmail({
    referrerName: referrerName ?? "there",
    newUserName: newUserName ?? "Someone",
    referralCount,
    dashboardUrl,
  });

  const { error } = await client.emails.send({
    from: getFromEmail(),
    to: referrerEmail,
    subject: `${newUserName ?? "Someone"} just joined with your link! 🎉`,
    html,
  });

  if (error) console.error("[email] Resend API error:", error);
}

function renderReferralEmail(opts: {
  referrerName: string;
  newUserName: string;
  referralCount: number;
  dashboardUrl: string;
}): string {
  const { referrerName, newUserName, referralCount, dashboardUrl } = opts;
  const plural = referralCount === 1 ? "person has" : "people have";

  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#0a0a0a;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600;">Smart Waitlist</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#0a0a0a;font-size:24px;">🎉 You're moving up!</h2>
          <p style="margin:0 0 16px;color:#3f3f46;font-size:16px;line-height:1.6;">Hi ${escapeHtml(referrerName)},</p>
          <p style="margin:0 0 16px;color:#3f3f46;font-size:16px;line-height:1.6;">
            <strong>${escapeHtml(newUserName)}</strong> just joined the waitlist using your referral link.
            You now have <strong>${referralCount}</strong> ${plural} joined — and you've moved up the queue!
          </p>
          <p style="margin:0 0 24px;color:#3f3f46;font-size:16px;line-height:1.6;">Keep sharing your link to climb higher.</p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;">View your position</a>
          </td></tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
  `.trim();
}

// ============================================================================
// Invite email (admin → user)
// ============================================================================

export type InviteEmailParams = {
  to: string;
};

export async function sendInviteEmail(params: InviteEmailParams): Promise<void> {
  const client = getEmailClient();
  if (!client) {
    console.log("[email] RESEND_API_KEY not set — skipping invite email");
    return;
  }

  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL;

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#0a0a0a;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:20px;">Smart Waitlist</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#0a0a0a;font-size:24px;">🎊 You're in!</h2>
          <p style="margin:0 0 16px;color:#3f3f46;font-size:16px;line-height:1.6;">
            Great news — you've been invited to claim your spot! Head to your dashboard to get started.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${escapeHtml(appUrl)}/dashboard" style="display:inline-block;background:#0a0a0a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;">Claim your spot</a>
          </td></tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
  `.trim();

  const { error } = await client.emails.send({
    from: getFromEmail(),
    to: params.to,
    subject: "You're in! Claim your spot on the waitlist 🎊",
    html,
  });

  if (error) console.error("[email] invite send error:", error);
}

// ============================================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
