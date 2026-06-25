import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireNewsletterAdmin } from "../auth";
import { errorResponse, jsonResponse } from "../responses";

type NewsletterDraft = {
  id: string;
  target_audience: unknown;
};

type NewsletterAudienceRow = {
  email?: string | null;
  newsletter_name?: string | null;
  app_full_name?: string | null;
  audience_segment?: string | null;
  newsletter_sources?: unknown;
  has_app_account?: boolean | null;
  subscription_status?: string | null;
  subscription_tier?: string | null;
  onboarding_completed?: boolean | null;
};

type QueueAudience =
  | "all_newsletter_contacts"
  | "lead_only"
  | "active_members"
  | "unclear_app_users";

const canonicalAudiences: QueueAudience[] = [
  "all_newsletter_contacts",
  "lead_only",
  "active_members",
  "unclear_app_users",
];

function resolveAudience(value: unknown): QueueAudience | null {
  if (!Array.isArray(value) || value.length !== 1) {
    return null;
  }

  const [audience] = value;

  if (typeof audience !== "string") {
    return null;
  }

  return canonicalAudiences.includes(audience as QueueAudience) ? (audience as QueueAudience) : null;
}

async function loadRecipients(supabase: SupabaseClient, audience: QueueAudience) {
  const recipients: NewsletterAudienceRow[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    let query = supabase
      .from("newsletter_audience_v1")
      .select(
        "email,newsletter_name,app_full_name,audience_segment,newsletter_sources,has_app_account,subscription_status,subscription_tier,onboarding_completed",
      )
      .eq("newsletter_active", true)
      .neq("audience_segment", "admin")
      .not("email", "is", null)
      .order("email", { ascending: true })
      .range(from, from + pageSize - 1);

    if (audience === "lead_only") {
      query = query.eq("audience_segment", "lead_only");
    }

    if (audience === "active_members") {
      query = query.eq("audience_segment", "active_member");
    }

    if (audience === "unclear_app_users") {
      query = query.eq("audience_segment", "app_user_no_clear_membership");
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const page = (data || []) as NewsletterAudienceRow[];
    recipients.push(...page);

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return recipients.map((recipient) => ({
    email: recipient.email?.trim() || "",
    name: recipient.newsletter_name || recipient.app_full_name || "",
    newsletterName: recipient.newsletter_name || "",
    appFullName: recipient.app_full_name || "",
    audienceSegment: recipient.audience_segment || "",
    newsletterSources: recipient.newsletter_sources,
    hasAppAccount: recipient.has_app_account,
    subscriptionStatus: recipient.subscription_status,
    subscriptionTier: recipient.subscription_tier,
    onboardingCompleted: recipient.onboarding_completed,
  }));
}

export async function GET(request: Request) {
  const admin = await requireNewsletterAdmin(request, {
    routeName: "newsletter-recipient-preview",
    serviceConfigError: "Newsletter recipient preview service is not configured.",
  });

  if ("error" in admin) {
    return admin.error;
  }

  const draftId = new URL(request.url).searchParams.get("draftId")?.trim() || "";

  if (!draftId) {
    return errorResponse("draftId is required.", 400);
  }

  const adminSupabase = createClient(admin.supabaseUrl, admin.serviceRoleKey);
  const { data: draft, error: draftError } = await adminSupabase
    .from("marketing_email_draft")
    .select("id,target_audience")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    console.error("Newsletter recipient preview draft lookup error:", draftError);
    return errorResponse("Could not load newsletter draft audience.", 500);
  }

  if (!draft) {
    return errorResponse("Newsletter draft not found.", 404);
  }

  const newsletterDraft = draft as NewsletterDraft;
  const targetAudience = resolveAudience(newsletterDraft.target_audience);

  if (!targetAudience) {
    return errorResponse("Invalid campaign audience. Please edit and save the draft again.", 400);
  }

  try {
    const recipients = await loadRecipients(adminSupabase, targetAudience);
    const segmentBreakdown = recipients.reduce<Record<string, number>>((counts, recipient) => {
      const segment = recipient.audienceSegment || "unknown";
      counts[segment] = (counts[segment] || 0) + 1;
      return counts;
    }, {});

    return jsonResponse(
      {
        success: true,
        targetAudience,
        total: recipients.length,
        segmentBreakdown,
        recipients,
      },
      200,
    );
  } catch (error) {
    console.error("Newsletter recipient preview lookup error:", {
      draftId,
      targetAudience,
      error,
    });
    return errorResponse("Could not load recipient preview.", 500);
  }
}
