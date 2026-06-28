import { Resend } from "resend";

import { requireNewsletterAdmin } from "../auth";
import { errorResponse, jsonResponse } from "../responses";
import {
  buildNewsletterEmailHtml,
  escapeHtml,
  formatNewsletterBodyHtmlForEmail,
} from "../../../../../lib/newsletterHtml";

type TestSendBody = {
  subject?: unknown;
  previewText?: unknown;
  campaignType?: unknown;
  targetAudience?: unknown;
  body?: unknown;
  testEmail?: unknown;
};

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildEmailHtml(payload: {
  body: string;
  previewText: string;
  campaignType: string;
  targetAudience: string;
}) {
  const safeBody = formatNewsletterBodyHtmlForEmail(payload.body);
  const escapedCampaignType = escapeHtml(payload.campaignType || "newsletter");
  const escapedTargetAudience = escapeHtml(payload.targetAudience || "all_newsletter_contacts");

  return buildNewsletterEmailHtml({
    title: "Newsletter Test Email",
    previewText: payload.previewText,
    bodyHtml: safeBody,
    noticeHtml:
      '<div style="margin:0 0 24px;padding:14px 16px;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-size:14px;line-height:1.5;font-weight:700;">This is a test newsletter email. No campaign has been queued.</div>',
    footerHtml: `<div style="margin-top:28px;padding-top:18px;border-top:1px solid #e5e7eb;font-size:13px;line-height:1.6;color:#6b7280;">
      Campaign type: ${escapedCampaignType}<br />
      Audience: ${escapedTargetAudience}
    </div>`,
  });
}

export async function POST(request: Request) {
  const admin = await requireNewsletterAdmin(request, {
    routeName: "newsletter-test-send",
    requireServiceRole: false,
  });

  if ("error" in admin) {
    return admin.error;
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
