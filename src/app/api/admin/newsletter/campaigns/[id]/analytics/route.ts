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
  id: string;
  recipient_email: string | null;
  recipient_name: string | null;
  status: string | null;
  opened_at: string | null;
  open_count: number | null;
  last_clicked_at: string | null;
  click_count: number | null;
};

type EmailClickEvent = {
  email_log_id: string | null;
  link_key: string | null;
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
    .select("id,recipient_email,recipient_name,status,opened_at,open_count,last_clicked_at,click_count")
    .eq("variables_used->>draftId", draftId);

  if (emailLogError) {
    console.error("Newsletter campaign analytics email log query error:", emailLogError);
    return errorResponse("Could not load campaign email analytics.", 500);
  }

  const { data: clickEvents, error: clickEventError } = await adminSupabase
    .from("email_click_event")
    .select("email_log_id,link_key")
    .eq("draft_id", draftId);

  if (clickEventError) {
    console.error("Newsletter campaign analytics click event query error:", clickEventError);
    return errorResponse("Could not load campaign click analytics.", 500);
  }

  const analytics = {
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    opened: 0,
    clicked: 0,
    appStoreClicks: 0,
    googlePlayClicks: 0,
    appleFounder20Clicks: 0,
    total: 0,
  };
  const recipientClickCounts = new Map<
    string,
    {
      appStoreClicks: number;
      googlePlayClicks: number;
      appleFounder20Clicks: number;
    }
  >();

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

    if ((row.open_count || 0) > 0) {
      analytics.opened += 1;
    }

    if ((row.click_count || 0) > 0) {
      analytics.clicked += 1;
    }
  }

  for (const row of (clickEvents || []) as EmailClickEvent[]) {
    if (row.email_log_id) {
      const counts = recipientClickCounts.get(row.email_log_id) || {
        appStoreClicks: 0,
        googlePlayClicks: 0,
        appleFounder20Clicks: 0,
      };

      if (row.link_key === "app_store") {
        counts.appStoreClicks += 1;
      }

      if (row.link_key === "google_play") {
        counts.googlePlayClicks += 1;
      }

      if (row.link_key === "apple_founder20") {
        counts.appleFounder20Clicks += 1;
      }

      recipientClickCounts.set(row.email_log_id, counts);
    }

    if (row.link_key === "app_store") {
      analytics.appStoreClicks += 1;
    }

    if (row.link_key === "google_play") {
      analytics.googlePlayClicks += 1;
    }

    if (row.link_key === "apple_founder20") {
      analytics.appleFounder20Clicks += 1;
    }
  }

  const campaign = draft as CampaignDraft;
  const recipientAnalytics = ((emailLogs || []) as EmailLogStatus[]).map((row) => {
    const clickCounts = recipientClickCounts.get(row.id) || {
      appStoreClicks: 0,
      googlePlayClicks: 0,
      appleFounder20Clicks: 0,
    };
    const openCount = row.open_count || 0;
    const clickCount = row.click_count || 0;

    return {
      emailLogId: row.id,
      email: row.recipient_email || "",
      name: row.recipient_name || "",
      status: row.status || "",
      opened: openCount > 0,
      openedAt: row.opened_at,
      openCount,
      clicked: clickCount > 0,
      lastClickedAt: row.last_clicked_at,
      clickCount,
      appStoreClicks: clickCounts.appStoreClicks,
      googlePlayClicks: clickCounts.googlePlayClicks,
      appleFounder20Clicks: clickCounts.appleFounder20Clicks,
    };
  });

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
      recipientAnalytics,
    },
    200,
  );
}
