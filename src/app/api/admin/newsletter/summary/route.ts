import { createClient } from "@supabase/supabase-js";

import { requireNewsletterAdmin } from "../auth";
import { errorResponse, jsonResponse } from "../responses";

type LatestLead = {
  id: string;
  name: string | null;
  email: string | null;
  referral_source: string | null;
  created_at: string | null;
};

function readCount(count: number | null) {
  return typeof count === "number" ? count : 0;
}

function readSafeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "object" && error) {
    const details = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    if (typeof details.message === "string" && details.message.trim()) {
      return details.message.trim();
    }

    const fallbackDetails = [details.code, details.details, details.hint]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ");

    if (fallbackDetails) {
      return fallbackDetails;
    }
  }

  return "Unknown Supabase query error.";
}

export async function GET(request: Request) {
  const admin = await requireNewsletterAdmin(request, {
    routeName: "newsletter-summary",
    serviceConfigError: "Newsletter admin service is not configured.",
  });

  if ("error" in admin) {
    return admin.error;
  }

  const adminSupabase = createClient(admin.supabaseUrl, admin.serviceRoleKey);

  const [
    totalLeadsResult,
    allNewsletterContactsResult,
    leadOnlyResult,
    activeMembersResult,
    unclearAppUsersResult,
    adminCountResult,
    latestLeadsResult,
    draftCountResult,
    pendingEmailCountResult,
    sentEmailCountResult,
  ] = await Promise.all([
    adminSupabase.from("landing_waitlist").select("*", { count: "exact", head: true }),
    adminSupabase
      .from("newsletter_audience_v1")
      .select("*", { count: "exact", head: true })
      .eq("newsletter_active", true)
      .neq("audience_segment", "admin"),
    adminSupabase
      .from("newsletter_audience_v1")
      .select("*", { count: "exact", head: true })
      .eq("newsletter_active", true)
      .eq("audience_segment", "lead_only"),
    adminSupabase
      .from("newsletter_audience_v1")
      .select("*", { count: "exact", head: true })
      .eq("newsletter_active", true)
      .eq("audience_segment", "active_member"),
    adminSupabase
      .from("newsletter_audience_v1")
      .select("*", { count: "exact", head: true })
      .eq("newsletter_active", true)
      .eq("audience_segment", "app_user_no_clear_membership"),
    adminSupabase
      .from("newsletter_audience_v1")
      .select("*", { count: "exact", head: true })
      .eq("audience_segment", "admin"),
    adminSupabase
      .from("landing_waitlist")
      .select("id,name,email,referral_source,created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    adminSupabase
      .from("marketing_email_draft")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft"),
    adminSupabase
      .from("email_log")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    adminSupabase
      .from("email_log")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent"),
  ]);

  const queryChecks = [
    {
      label: "total leads count",
      failureMessage: "total leads count failed",
      error: totalLeadsResult.error,
    },
    {
      label: "all newsletter contacts count",
      failureMessage: "all newsletter contacts count failed",
      error: allNewsletterContactsResult.error,
    },
    {
      label: "lead only count",
      failureMessage: "lead only count failed",
      error: leadOnlyResult.error,
    },
    {
      label: "active members count",
      failureMessage: "active members count failed",
      error: activeMembersResult.error,
    },
    {
      label: "unclear app users count",
      failureMessage: "unclear app users count failed",
      error: unclearAppUsersResult.error,
    },
    {
      label: "admin count",
      failureMessage: "admin count failed",
      error: adminCountResult.error,
    },
    {
      label: "latest leads",
      failureMessage: "latest leads failed",
      error: latestLeadsResult.error,
    },
    {
      label: "draft count",
      failureMessage: "draft count failed",
      error: draftCountResult.error,
    },
    {
      label: "pending email count",
      failureMessage: "pending email count failed",
      error: pendingEmailCountResult.error,
    },
    {
      label: "sent email count",
      failureMessage: "sent email count failed",
      error: sentEmailCountResult.error,
    },
  ];

  const failedQuery = queryChecks.find((query) => query.error);

  if (failedQuery?.error) {
    console.error("Newsletter admin summary query error:", {
      query: failedQuery.label,
      message: readSafeErrorMessage(failedQuery.error),
    });
    return errorResponse(
      `Could not load newsletter summary: ${failedQuery.failureMessage}.`,
      500,
    );
  }

  const allNewsletterContactsCount = readCount(allNewsletterContactsResult.count);
  const leadOnlyCount = readCount(leadOnlyResult.count);
  const activeMembersCount = readCount(activeMembersResult.count);
  const unclearAppUsersCount = readCount(unclearAppUsersResult.count);

  return jsonResponse(
    {
      success: true,
      summary: {
        totalLeads: readCount(totalLeadsResult.count),
        allNewsletterContactsCount,
        leadOnlyCount,
        activeMembersCount,
        unclearAppUsersCount,
        adminCount: readCount(adminCountResult.count),
        allLeadsCount: allNewsletterContactsCount,
        instagramLeadsCount: leadOnlyCount,
        mikeReferralsCount: activeMembersCount,
        draftCount: readCount(draftCountResult.count),
        pendingEmailCount: readCount(pendingEmailCountResult.count),
        sentEmailCount: readCount(sentEmailCountResult.count),
        latestLeads: (latestLeadsResult.data || []) as LatestLead[],
      },
    },
    200,
  );
}
