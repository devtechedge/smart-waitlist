import "server-only";
import { getActiveWebhooksForEvent } from "@/lib/queries/v5-features";

/**
 * Webhook Integration (Slack/Discord)
 * -----------------------------------
 * Sends notifications to configured Slack/Discord webhooks when events
 * happen (new signup, milestone unlocked, tier upgrade).
 *
 * Gracefully no-ops if no webhooks are configured for the event.
 *
 * To set up:
 *   1. Slack: Create an incoming webhook at https://api.slack.com/messaging/webhooks
 *   2. Discord: Server Settings → Integrations → Webhooks → New Webhook
 *   3. Insert a row into `webhook_configs` table:
 *      INSERT INTO webhook_configs (name, url, platform, events)
 *      VALUES ('Team Slack', 'https://hooks.slack.com/...', 'slack', ARRAY['signup','milestone','upgrade']);
 */

type WebhookEvent = "signup" | "milestone" | "upgrade" | "ban";

type WebhookPayload = {
  event: WebhookEvent;
  title: string;
  message: string;
  color?: string;  // hex color for the message embed (Discord) or sidebar (Slack)
};

/**
 * Fire webhooks for a given event. Fire-and-forget (no await) — webhook
 * failures should never block the main flow.
 */
export function fireWebhooks(event: WebhookEvent, payload: Omit<WebhookPayload, "event">): void {
  void (async () => {
    try {
      const webhooks = await getActiveWebhooksForEvent(event);
      if (webhooks.length === 0) return;

      await Promise.all(
        webhooks.map((webhook) => sendToWebhook(webhook, { ...payload, event })),
      );
    } catch (err) {
      console.error("[webhooks] fireWebhooks failed", err);
    }
  })();
}

async function sendToWebhook(
  webhook: { url: string; platform: string; name: string },
  payload: WebhookPayload,
): Promise<void> {
  const body = webhook.platform === "discord"
    ? formatDiscordMessage(payload)
    : formatSlackMessage(payload);

  const res = await fetch(webhook.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`[webhooks] ${webhook.platform} webhook failed:`, res.status, await res.text());
  }
}

function formatSlackMessage(payload: WebhookPayload) {
  return {
    text: payload.title,
    attachments: [
      {
        color: payload.color ?? "#6366f1",
        text: payload.message,
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

function formatDiscordMessage(payload: WebhookPayload) {
  return {
    embeds: [
      {
        title: payload.title,
        description: payload.message,
        color: parseInt((payload.color ?? "#6366f1").replace("#", ""), 16),
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
