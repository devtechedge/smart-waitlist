import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

import { getPublicProfile } from "@/lib/queries/public";
import { formatPosition } from "@/lib/format";

/**
 * GET /api/og?code=REFCODE
 * ------------------------
 * Generates a dynamic Open Graph image for a user's profile.
 * Used by Twitter/Facebook/LinkedIn when someone shares their `/u/CODE` link.
 *
 * The image is 1200x630 (standard OG size) and shows:
 *   - The user's name
 *   - Their position (#1st, #2nd, etc.)
 *   - Their referral count
 *   - Their tier badge
 *   - Smart Waitlist branding
 *
 * Uses @vercel/og (Satori under the hood) to render React/JSX → PNG at the
 * edge. Runs on Vercel's Edge Runtime for global low-latency generation.
 */

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }

  const profile = await getPublicProfile(code);

  if (!profile) {
    return new Response("Profile not found", { status: 404 });
  }

  const tierColors: Record<string, { bg: string; text: string }> = {
    free: { bg: "#71717a", text: "#fff" },
    pro: { bg: "#3b82f6", text: "#fff" },
    founder: { bg: "#f59e0b", text: "#fff" },
  };
  const tierColor = tierColors[profile.tier] ?? tierColors.free;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 700,
              color: "#0a0a0a",
            }}
          >
            W
          </div>
          <span style={{ color: "#fff", fontSize: "20px", fontWeight: 600 }}>
            Smart Waitlist
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}>
          {/* Position badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 20px",
                borderRadius: "999px",
                background: tierColor.bg,
                color: tierColor.text,
                fontSize: "18px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {profile.tier}
            </div>
            <span style={{ color: "#a1a1aa", fontSize: "20px" }}>
              Position #{formatPosition(profile.position)}
            </span>
          </div>

          {/* Name */}
          <div
            style={{
              color: "#fff",
              fontSize: "64px",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "16px",
            }}
          >
            {profile.displayName}
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: "40px", marginTop: "20px" }}>
            <div>
              <div style={{ color: "#a1a1aa", fontSize: "18px" }}>Referrals</div>
              <div style={{ color: "#fff", fontSize: "48px", fontWeight: 700 }}>
                {profile.referralCount}
              </div>
            </div>
            <div>
              <div style={{ color: "#a1a1aa", fontSize: "18px" }}>Total on waitlist</div>
              <div style={{ color: "#fff", fontSize: "48px", fontWeight: 700 }}>
                {profile.totalUsers.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #27272a",
            paddingTop: "24px",
          }}
        >
          <span style={{ color: "#71717a", fontSize: "18px" }}>
            Join the waitlist — skip the line with their link
          </span>
          <span style={{ color: "#fff", fontSize: "18px", fontWeight: 600 }}>
            /u/{profile.referralCode}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
