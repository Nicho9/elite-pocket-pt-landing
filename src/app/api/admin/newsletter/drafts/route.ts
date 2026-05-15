import { createClient } from "@supabase/supabase-js";

import { requireNewsletterAdmin } from "../auth";
import { errorResponse, jsonResponse } from "../responses";

type DraftRequestBody = {
  subject?: unknown;
  previewText?: unknown;
  campaignType?: unknown;
  targetAudience?: unknown;
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

function isCanonicalAudience(value: string): value is ComposerAudience {
  return canonicalAudiences.includes(value as ComposerAudience);
}

async function requireAdmin(request: Request) {
  return requireNewsletterAdmin(request, {
    routeName: "newsletter-drafts",
    serviceConfigError: "Newsletter draft service is not configured.",
  });
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);

  if ("error" in admin) {
    return admin.error;
  }

  const draftId = new URL(request.url).searchParams.get("id")?.trim() || "";
  const adminSupabase = createClient(admin.supabaseUrl, admin.serviceRoleKey);

  if (draftId) {
    const { data, error } = await adminSupabase
      .from("marketing_email_draft")
      .select("id,created_date,updated_date,created_by,subject,body,target_audience,campaign_type,status,sent_count,scheduled_date")
      .eq("id", draftId)
      .maybeSingle();

    if (error) {
      console.error("Newsletter draft detail error:", error);
      return errorResponse("Could not load newsletter draft.", 500);
    }

    if (!data) {
      return errorResponse("Newsletter draft not found.", 404);
    }

    return jsonResponse({ success: true, draft: data }, 200);
  }

  const { data, error } = await adminSupabase
    .from("marketing_email_draft")
    .select("id,created_date,updated_date,created_by,subject,body,target_audience,campaign_type,status,sent_count,scheduled_date")
    .order("created_date", { ascending: false });

  if (error) {
    console.error("Newsletter draft list error:", error);
    return errorResponse("Could not load newsletter drafts.", 500);
  }

  return jsonResponse({ success: true, drafts: data || [] }, 200);
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);

  if ("error" in admin) {
    return admin.error;
  }

  let payload: DraftRequestBody;

  try {
    payload = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const campaignType =
    typeof payload.campaignType === "string" ? payload.campaignType.trim() : "";
  const targetAudience =
    typeof payload.targetAudience === "string" ? payload.targetAudience.trim() : "";

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
    .insert({
      created_by: admin.adminUserId,
      subject,
      body,
      campaign_type: campaignType,
      target_audience: [targetAudience],
      status: "draft",
      sent_count: 0,
    })
    .select("id,created_date,updated_date,created_by,subject,body,target_audience,campaign_type,status,sent_count,scheduled_date")
    .single();

  if (error) {
    const safeMessage = readSafeErrorMessage(error);
    console.error("Newsletter draft create error:", {
      campaignType,
      targetAudience,
      error,
    });
    return errorResponse(`Could not save newsletter draft: ${safeMessage}`, 500);
  }

  return jsonResponse({ success: true, draft: data }, 201);
}
