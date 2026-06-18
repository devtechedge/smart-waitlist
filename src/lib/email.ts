import "server-only";
import { Resend } from "resend";

import { publicEnv } from "@/lib/public-env";

/**
 * Email service (Resend)
 * ----------------------
 * Sends transactional emails via Resend. Gracefully degrades — if
 * `RESEND_API_KEY` is not set, all send functions log + return success
 * without actually sending. This lets the app run in preview/demo mode
 * without an email provider.
 *
 * To enable real email:
 *   1. Sign up at https://resend.com (free tier: 100 emails/day)
 *   2. Verify your sending domain (e.g. mail.yourdomain.com)
 *   3. Set these env vars:
 *        RESEND_API_KEY="re_xxxxxxxx"
 *        RESEND_FROM_EMAIL="Smart Waitlist <noreply@mail.yourdomain.com>"
 *
 * Reference: https://resend.com/docs/send-with-nextjs
 */

let cachedClient: Resend | null = null;

function getEmailClient(): Resend | null {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  cachedClient = new Resend(apiKey);
  return cachedClient;
}

/** The "from" address for all outgoing emails. */
function getFromEmail(): string {
  return (
    process.env.RESEND_FROM_EMAIL ??
    "Smart Waitlist <noreply@resend.dev>"
  );
}

/** Input for the referral notification email. */
export type ReferralNotificationParams = {
  referrerEmail: string;
  referrerName: string | null;
  newUserName: string | null;
  referralCount: number;
};

/**
 * Send a "someone used your referral link!" email to the referrer.
 * Gracefully no-ops if RESEND_API_KEY is not set.
 */
export async function sendReferralNotification(
  params: ReferralNotificationParams,
): Promise<void> {
  const client = getEmailClient();
  if (!client) {
    console.log(
      "[email] RESEND_API_KEY not set — skipping referral notification to",
      params.referrerEmail,
    );
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
    subject: `${newUserName ?? "Someone"} just joined the waitlist with your link! 🎉`,
    html,
  });

  if (error) {
    console.error("[email] Resend API error:", error);
  }
}

/** Render the referral notification email HTML. */
function renderReferralEmail(opts: {
  referrerName: string;
  newUserName: string;
  referralCount: number;
  dashboardUrl: string;
}): string {
  const { referrerName, newUserName, referralCount, dashboardUrl } = opts;

  const plural = referralCount === 1 ? "person has" : "people have";

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Someone joined with your link!</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <tr>
              <td style="background:#0a0a0a;padding:32px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Smart Waitlist</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;color:#0a0a0a;font-size:24px;font-weight:700;">
                  🎉 You're moving up!
                </h2>
                <p style="margin:0 0 16px;color:#3f3f46;font-size:16px;line-height:1.6;">
                  Hi ${escapeHtml(referrerName)},
                </p>
                <p style="margin:0 0 16px;color:#3f3f46;font-size:16px;line-height:1.6;">
                  <strong>${escapeHtml(newUserName)}</strong> just joined the waitlist using your referral link.
                  You now have <strong>${referralCount}</strong> ${plural} joined — and you've moved up the queue!
                </p>
                <p style="margin:0 0 24px;color:#3f3f46;font-size:16px;line-height:1.6;">
                  Keep sharing your link to climb higher and unlock early access perks.
                </p>
                <!-- CTA button -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;">
                        View your position
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;color:#a1a1aa;font-size:14px;line-height:1.5;">
                  You're receiving this because someone signed up with your referral link.
                  <a href="${escapeHtml(dashboardUrl)}" style="color:#a1a1aa;">Manage notifications</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

/** Minimal HTML escaper to prevent injection in email content. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
