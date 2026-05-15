import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type TestSendBody = {
  subject?: unknown;
  previewText?: unknown;
  campaignType?: unknown;
  targetAudience?: unknown;
  body?: unknown;
  testEmail?: unknown;
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status });
}

function errorResponse(error: string, status: number) {
  return jsonResponse({ success: false, error }, status);
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return "";
  }

  return token.trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildEmailHtml(payload: {
  body: string;
  previewText: string;
  campaignType: string;
  targetAudience: string;
}) {
  const previewText = payload.previewText.trim();
  const escapedPreview = escapeHtml(previewText);
  const escapedBody = escapeHtml(payload.body.trim()).replaceAll("\n", "<br />");
  const escapedCampaignType = escapeHtml(payload.campaignType || "newsletter");
  const escapedTargetAudience = escapeHtml(payload.targetAudience || "all_newsletter_contacts");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#0b1220;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapedPreview}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="background:#0b1220;padding:28px 32px;color:#ffffff;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#93c5fd;">Elite Pocket PT</p>
                <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:800;">Newsletter Test Email</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                ${
                  previewText
                    ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#4b5563;">${escapedPreview}</p>`
                    : ""
                }
                <div style="margin:0 0 24px;padding:14px 16px;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-size:13px;font-weight:700;">
                  This is a test newsletter email. No campaign has been queued.
                </div>
                <div style="font-size:16px;line-height:1.7;color:#111827;">
                  ${escapedBody}
                </div>
                <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#6b7280;">
                  Campaign type: ${escapedCampaignType}<br />
                  Audience: ${escapedTargetAudience}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.SB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SB_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return errorResponse("Supabase authentication is not configured.", 500);
  }

  const token = readBearerToken(request);

  if (!token) {
    return errorResponse("Missing bearer token.", 401);
  }

  const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: userData, error: userError } = await authSupabase.auth.getUser(token);

  if (userError || !userData.user) {
    return errorResponse("Invalid or expired session.", 401);
  }

  const { data: profile, error: profileError } = await authSupabase
    .from("User")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Newsletter test-send admin profile lookup error:", profileError);
    return errorResponse("Could not verify admin access.", 500);
  }

  if (profile?.role !== "admin") {
    return errorResponse("Admin access required.", 403);
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    return errorResponse("Newsletter test email service is not configured.", 500);
  }

  let payload: TestSendBody;

  try {
    payload = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const testEmail = typeof payload.testEmail === "string" ? payload.testEmail.trim() : "";
  const previewText = typeof payload.previewText === "string" ? payload.previewText.trim() : "";
  const campaignType =
    typeof payload.campaignType === "string" ? payload.campaignType.trim() : "";
  const targetAudience =
    typeof payload.targetAudience === "string" ? payload.targetAudience.trim() : "";

  if (!subject) {
    return errorResponse("Subject is required.", 400);
  }

  if (!body) {
    return errorResponse("Body is required.", 400);
  }

  if (!testEmail || !isEmailLike(testEmail)) {
    return errorResponse("A valid test email is required.", 400);
  }

  const resend = new Resend(resendApiKey);
  const { error } = await resend.emails.send({
    from: "Elite Pocket PT <hello@elitepocketpt.com>",
    to: testEmail,
    subject: `[TEST] ${subject}`,
    html: buildEmailHtml({
      body,
      previewText,
      campaignType,
      targetAudience,
    }),
  });

  if (error) {
    console.error("Newsletter test email error:", error);
    return errorResponse("Could not send test email.", 500);
  }

  return jsonResponse({ success: true, message: "Test email sent." }, 200);
}
