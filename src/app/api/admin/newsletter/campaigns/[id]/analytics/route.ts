import { createClient } from "@supabase/supabase-js";

import { requireNewsletterAdmin } from "../../../auth";
import { errorResponse, jsonResponse } from "../../../responses";

type CampaignDraft = {
  id: string;
  subject: string | null;
  status: string | null;
  target_audience: unknown;
  sent_count: number | null;
  scheduled_date: string | null;
  sent_date: string | null;
};

type EmailLogStatus = {
  status: string | null;
};

async function requireAdmin(request: Request) {
  return requireNewsletterAdmin(request, {
    routeName: "newsletter-campaign-analytics",
    serviceConfigError: "Newsletter analytics service is not configured.",
  });
}

function normalizeCount(value: number | null) {
  return typeof value === "number" ? value : 0;
}

function normalizeAudience(value: unknown) {
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === "string") {
    return value[0];
  }

  return "";
}

export async function GET(
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
    return errorResponse("Campaign id is required.", 400);
  }

  const adminSupabase = createClient(admin.supabaseUrl, admin.serviceRoleKey);
  const { data: draft, error: draftError } = await adminSupabase
    .from("marketing_email_draft")
    .select("id,subject,status,target_audience,sent_count,scheduled_date,sent_date")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    console.error("Newsletter campaign analytics draft lookup error:", draftError);
    return errorResponse("Could not load campaign analytics.", 500);
  }

  if (!draft) {
    return errorResponse("Newsletter campaign not found.", 404);
  }

  const { data: emailLogs, error: emailLogError } = await adminSupabase
    .from("email_log")
    .select("status")
    .eq("variables_used->>draftId", draftId);

  if (emailLogError) {
    console.error("Newsletter campaign analytics email log query error:", emailLogError);
    return errorResponse("Could not load campaign email analytics.", 500);
  }

  const analytics = {
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    total: 0,
  };

  for (const row of (emailLogs || []) as EmailLogStatus[]) {
    analytics.total += 1;

    if (row.status === "pending") {
      analytics.pending += 1;
    } else if (row.status === "processing") {
      analytics.processing += 1;
    } else if (row.status === "sent") {
      analytics.sent += 1;
    } else if (row.status === "failed") {
      analytics.failed += 1;
    }
  }

  const campaign = draft as CampaignDraft;

  return jsonResponse(
    {
      success: true,
      campaign: {
        id: campaign.id,
        subject: campaign.subject,
        status: campaign.status,
        targetAudience: normalizeAudience(campaign.target_audience),
        sentCount: normalizeCount(campaign.sent_count),
        scheduledDate: campaign.scheduled_date,
        sentDate: campaign.sent_date,
      },
      analytics,
    },
    200,
  );
}
