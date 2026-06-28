import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

import { requireNewsletterAdmin } from "../auth";
import { errorResponse, jsonResponse } from "../responses";
import {
  escapeHtml,
  newsletterTrackedLinks,
  normalizeNewsletterBodyHtml,
} from "../../../../../lib/newsletterHtml";

const batchSize = 10;
const siteUrl = "https://www.elitepocketpt.com";

type SendPendingBody = {
  draftId?: unknown;
};

type EmailLogRow = {
  id: string;
  recipient_email: string | null;
  recipient_name: string | null;
  email_subject: string | null;
  email_type: string | null;
  tracking_token: string | null;
  variables_used: unknown;
};

type NewsletterDraft = {
  id: string;
  status: string | null;
};

function readString(value: unknown, key: string) {
  if (!value || typeof value !== "object" || !(key in value)) {
    return "";
  }

  const nextValue = (value as Record<string, unknown>)[key];
  return typeof nextValue === "string" ? nextValue.trim() : "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceTrackedLink(html: string, exactUrl: string, trackedUrl: string) {
  const escapedExactUrl = escapeHtml(exactUrl);
  const trackedAnchor = `<a href="${trackedUrl}" target="_blank" rel="noopener noreferrer" style="color:#1157d8;font-weight:700;">${escapedExactUrl}</a>`;
  const urlPattern = new RegExp(
    `${escapeRegExp(exactUrl)}|${escapeRegExp(escapedExactUrl)}`,
    "g",
  );

  const htmlWithTrackedHrefs = html
    .replaceAll(`href="${exactUrl}"`, `href="${trackedUrl}"`)
    .replaceAll(`href="${escapedExactUrl}"`, `href="${trackedUrl}"`);

  return htmlWithTrackedHrefs
    .split(/(<a\b[\s\S]*?<\/a>)/gi)
    .map((part) => (part.toLowerCase().startsWith("<a") ? part : part.replace(urlPattern, trackedAnchor)))
    .join("");
}

function addTrackedLinks(html: string, trackingToken: string) {
  if (!trackingToken) {
    return html;
  }

  const trackedAppStoreUrl = `${siteUrl}/api/newsletter/click/${trackingToken}?link=app_store`;
  const trackedGooglePlayUrl = `${siteUrl}/api/newsletter/click/${trackingToken}?link=google_play`;
  const trackedAppleFounder20Url = `${siteUrl}/api/newsletter/click/${trackingToken}?link=apple_founder20`;

  return replaceTrackedLink(
    replaceTrackedLink(
      replaceTrackedLink(html, newsletterTrackedLinks.appStoreUrl, trackedAppStoreUrl),
      newsletterTrackedLinks.googlePlayUrl,
      trackedGooglePlayUrl,
    ),
    newsletterTrackedLinks.appleFounder20Url,
    trackedAppleFounder20Url,
  );
}

function readSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" && message.trim() ? message.trim() : "Unknown error";
  }

  return "Unknown error";
}

function buildEmailHtml(payload: {
  body: string;
  previewText: string;
  campaignType: string;
  trackingToken: string;
}) {
  const previewText = payload.previewText.trim();
  const escapedPreview = escapeHtml(previewText);
  const trackingToken = payload.trackingToken.trim();
  const safeBody = addTrackedLinks(normalizeNewsletterBodyHtml(payload.body), trackingToken);
  const escapedCampaignType = escapeHtml(payload.campaignType || "newsletter");
  const trackingPixelHtml = trackingToken
    ? `<img src="${siteUrl}/api/newsletter/open/${trackingToken}.png" width="1" height="1" alt="" style="display:none;height:1px;width:1px;border:0;" />`
    : "";

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
                <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:800;">Elite Pocket PT Newsletter</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                ${
                  previewText
                    ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#4b5563;">${escapedPreview}</p>`
                    : ""
                }
                <div style="font-size:16px;line-height:1.7;color:#111827;">
                  ${safeBody}
                </div>
                ${trackingPixelHtml}
                <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#6b7280;">
                  Campaign type: ${escapedCampaignType}
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

async function requireAdmin(request: Request) {
  return requireNewsletterAdmin(request, {
    routeName: "newsletter-send-pending",
    serviceConfigError: "Newsletter sender service is not configured.",
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);

  if ("error" in admin) {
    return admin.error;
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    return errorResponse("Newsletter email service is not configured.", 500);
  }

  let payload: SendPendingBody;

  try {
    payload = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const draftId = typeof payload.draftId === "string" ? payload.draftId.trim() : "";

  if (!draftId) {
    return errorResponse("draftId is required.", 400);
  }

  const adminSupabase = createClient(admin.supabaseUrl, admin.serviceRoleKey);
  const { data: draft, error: draftError } = await adminSupabase
    .from("marketing_email_draft")
    .select("id,status")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    console.error("Newsletter send draft lookup error:", draftError);
    return errorResponse("Could not load newsletter campaign.", 500);
  }

  if (!draft) {
    return errorResponse("Newsletter campaign not found.", 404);
  }

  const campaign = draft as NewsletterDraft;

  if (campaign.status !== "queued") {
    return errorResponse("Only queued campaigns can send pending emails.", 400);
  }

  const { data: pendingRows, error: pendingError } = await adminSupabase
    .from("email_log")
    .select("id,recipient_email,recipient_name,email_subject,email_type,tracking_token,variables_used")
    .eq("status", "pending")
    .eq("variables_used->>draftId", draftId)
    .order("created_date", { ascending: true })
    .limit(batchSize);

  if (pendingError) {
    console.error("Newsletter pending email lookup error:", pendingError);
    return errorResponse("Could not load pending emails.", 500);
  }

  const rows = (pendingRows || []) as EmailLogRow[];
  const resend = new Resend(resendApiKey);
  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const recipientEmail = row.recipient_email?.trim() || "";
    const subject = row.email_subject?.trim() || "";
    const trackingToken = row.tracking_token?.trim() || "";
    const body = readString(row.variables_used, "body");
    const previewText = readString(row.variables_used, "previewText");
    const campaignType = readString(row.variables_used, "campaignType") || row.email_type || "newsletter";
    const variables =
      row.variables_used && typeof row.variables_used === "object"
        ? { ...(row.variables_used as Record<string, unknown>) }
        : {};

    const { data: claimedRow, error: processingError } = await adminSupabase
      .from("email_log")
      .update({
        status: "processing",
        variables_used: {
          ...variables,
          processingStartedAt: new Date().toISOString(),
          processingBy: admin.adminEmail,
        },
      })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (processingError || !claimedRow) {
      failed += 1;
      if (processingError) {
        console.error("Newsletter processing status update error:", {
          emailLogId: row.id,
          error: processingError,
        });
      }
      continue;
    }

    processed += 1;

    if (!recipientEmail || !subject || !body || !trackingToken) {
      failed += 1;
      await adminSupabase
        .from("email_log")
        .update({
          status: "failed",
          variables_used: {
            ...variables,
            failedAt: new Date().toISOString(),
            failureReason: "Missing recipient, subject, body, or tracking token.",
          },
        })
        .eq("id", row.id);
      continue;
    }

    const { error: sendError } = await resend.emails.send({
      from: "Elite Pocket PT <hello@elitepocketpt.com>",
      to: recipientEmail,
      subject,
      html: buildEmailHtml({
        body,
        previewText,
        campaignType,
        trackingToken,
      }),
    });

    if (sendError) {
      failed += 1;
      const safeMessage = readSafeErrorMessage(sendError);
      console.error("Newsletter campaign email error:", {
        emailLogId: row.id,
        recipientEmail,
        error: sendError,
      });
      await adminSupabase
        .from("email_log")
        .update({
          status: "failed",
          variables_used: {
            ...variables,
            failedAt: new Date().toISOString(),
            failureReason: safeMessage,
          },
        })
        .eq("id", row.id);
      continue;
    }

    sent += 1;
    await adminSupabase
      .from("email_log")
      .update({
        status: "sent",
        variables_used: {
          ...variables,
          sentAt: new Date().toISOString(),
        },
      })
      .eq("id", row.id);
  }

  const [pendingCountResult, processingCountResult, failedCountResult] = await Promise.all([
    adminSupabase
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("variables_used->>draftId", draftId),
    adminSupabase
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing")
      .eq("variables_used->>draftId", draftId),
    adminSupabase
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .eq("variables_used->>draftId", draftId),
  ]);

  const remainingPending = pendingCountResult.count || 0;
  const remainingProcessing = processingCountResult.count || 0;
  const remainingFailed = failedCountResult.count || 0;
  const campaignCompleted =
    remainingPending === 0 && remainingProcessing === 0 && remainingFailed === 0;
  const message =
    remainingPending === 0 && remainingProcessing === 0 && remainingFailed > 0
      ? "Pending and processing emails are complete, but failed emails remain."
      : "";

  if (campaignCompleted) {
    const now = new Date().toISOString();
    const { error: updateDraftError } = await adminSupabase
      .from("marketing_email_draft")
      .update({
        status: "sent",
        sent_date: now,
        updated_date: now,
      })
      .eq("id", draftId);

    if (updateDraftError) {
      console.error("Newsletter sent campaign update error:", updateDraftError);
    }
  }

  return jsonResponse(
    {
      success: true,
      processed,
      sent,
      failed,
      remainingPending,
      remainingProcessing,
      remainingFailed,
      campaignCompleted,
      message,
    },
    200,
  );
}
