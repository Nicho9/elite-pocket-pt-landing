import { createClient } from "@supabase/supabase-js";

import { requireNewsletterAdmin } from "../../auth";
import { errorResponse, jsonResponse } from "../../responses";

type DraftUpdateBody = {
  subject?: unknown;
  previewText?: unknown;
  campaignType?: unknown;
  campaign_type?: unknown;
  targetAudience?: unknown;
  target_audience?: unknown;
  body?: unknown;
};

type ComposerAudience =
  | "all_newsletter_contacts"
  | "lead_only"
  | "active_members"
  | "unclear_app_users";
const canonicalAudiences: ComposerAudience[] = [
  "all_newsletter_contacts",
  "lead_only",
  "active_members",
  "unclear_app_users",
];

function isCanonicalAudience(value: string): value is ComposerAudience {
  return canonicalAudiences.includes(value as ComposerAudience);
}

async function requireAdmin(request: Request) {
  return requireNewsletterAdmin(request, {
    routeName: "newsletter-draft-detail",
    serviceConfigError: "Newsletter draft service is not configured.",
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);

  if ("error" in admin) {
    return admin.error;
  }

  const { id } = await params;
  const draftId = id?.trim();

  if (!draftId) {
    return errorResponse("Newsletter draft id is required.", 400);
  }

  let payload: DraftUpdateBody;

  try {
    payload = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const rawCampaignType = payload.campaignType ?? payload.campaign_type;
  const rawTargetAudience = payload.targetAudience ?? payload.target_audience;
  const campaignType =
    typeof rawCampaignType === "string" ? rawCampaignType.trim() : "";
  const targetAudience =
    typeof rawTargetAudience === "string" ? rawTargetAudience.trim() : "";

  if (!subject || !body || !campaignType || !targetAudience) {
    return errorResponse("Subject, body, campaignType and targetAudience are required.", 400);
  }

  if (!isCanonicalAudience(targetAudience)) {
    return errorResponse(
      "targetAudience must be all_newsletter_contacts, lead_only, active_members, or unclear_app_users.",
      400,
    );
  }

  const adminSupabase = createClient(admin.supabaseUrl, admin.serviceRoleKey);
  const { data, error } = await adminSupabase
    .from("marketing_email_draft")
    .update({
      subject,
      body,
      campaign_type: campaignType,
      target_audience: [targetAudience],
      updated_date: new Date().toISOString(),
    })
    .eq("id", draftId)
    .select("id,created_date,updated_date,created_by,subject,body,target_audience,campaign_type,status,sent_count")
    .maybeSingle();

  if (error) {
    console.error("Newsletter draft update error:", error);
    return errorResponse("Could not update newsletter draft.", 500);
  }

  if (!data) {
    return errorResponse("Newsletter draft not found.", 404);
  }

  return jsonResponse({ success: true, draft: data }, 200);
}
