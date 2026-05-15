import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type QueueRequestBody = {
  draftId?: unknown;
};

type NewsletterDraft = {
  id: string;
  subject: string | null;
  body: string | null;
  target_audience: unknown;
  campaign_type: string | null;
  status: string | null;
};

type WaitlistRecipient = {
  name: string | null;
  email: string | null;
};

type NewsletterAudienceRow = {
  email?: string | null;
  name?: string | null;
  full_name?: string | null;
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

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status });
}

function errorResponse(error: string, status: number) {
  return jsonResponse({ success: false, error }, status);
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

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return "";
  }

  return token.trim();
}

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

async function requireAdmin(request: Request) {
  const supabaseUrl = process.env.SB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SB_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      error: errorResponse("Supabase authentication is not configured.", 500),
    };
  }

  const token = readBearerToken(request);

  if (!token) {
    return { error: errorResponse("Missing bearer token.", 401) };
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
    return { error: errorResponse("Invalid or expired session.", 401) };
  }

  const { data: profile, error: profileError } = await authSupabase
    .from("User")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Newsletter queue admin profile lookup error:", profileError);
    return { error: errorResponse("Could not verify admin access.", 500) };
  }

  if (profile?.role !== "admin") {
    return { error: errorResponse("Admin access required.", 403) };
  }

  const serviceRoleKey =
    process.env.SB_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return { error: errorResponse("Newsletter queue service is not configured.", 500) };
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    adminUserId: userData.user.id,
    adminEmail: userData.user.email || "",
  };
}

async function loadRecipients(supabase: SupabaseClient, audience: QueueAudience) {
  const recipients: WaitlistRecipient[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    let query = supabase
      .from("newsletter_audience_v1")
      .select("*")
      .eq("newsletter_active", true)
      .neq("audience_segment", "admin")
      .not("email", "is", null)
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
    recipients.push(
      ...page
        .map((recipient) => ({
          email: recipient.email?.trim() || null,
          name: recipient.name || recipient.full_name || null,
        }))
        .filter((recipient) => recipient.email),
    );

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return recipients;
}

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);

  if ("error" in admin) {
    return admin.error;
  }

  let payload: QueueRequestBody;

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
    .select("id,subject,body,target_audience,campaign_type,status")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    const safeMessage = readSafeErrorMessage(draftError);
    console.error("Newsletter queue draft lookup error:", {
      draftId,
      error: draftError,
    });
    return errorResponse(`Could not load newsletter draft: ${safeMessage}`, 500);
  }

  if (!draft) {
    return errorResponse("Newsletter draft not found.", 404);
  }

  const newsletterDraft = draft as NewsletterDraft;

  if (newsletterDraft.status !== "draft") {
    return errorResponse("Only draft campaigns can be queued.", 400);
  }

  const subject = newsletterDraft.subject?.trim() || "";
  const body = newsletterDraft.body?.trim() || "";

  if (!subject || !body) {
    return errorResponse("Draft subject and body are required before queueing.", 400);
  }

  const campaignType = newsletterDraft.campaign_type?.trim() || "newsletter";
  const targetAudience = resolveAudience(newsletterDraft.target_audience);

  if (!targetAudience) {
    console.error("Newsletter queue invalid target audience:", {
      draftId: newsletterDraft.id,
      targetAudience: newsletterDraft.target_audience,
    });
    return errorResponse("Invalid campaign audience. Please edit and save the draft again.", 400);
  }

  let recipients: WaitlistRecipient[];

  try {
    recipients = await loadRecipients(adminSupabase, targetAudience);
  } catch (error) {
    const safeMessage = readSafeErrorMessage(error);
    console.error("Newsletter queue recipient lookup error:", {
      draftId: newsletterDraft.id,
      targetAudience,
      error,
    });
    return errorResponse(`Could not load campaign recipients: ${safeMessage}`, 500);
  }

  if (recipients.length === 0) {
    return errorResponse("No recipients found for this campaign audience.", 400);
  }

  const emailLogRows = recipients.map((recipient) => ({
    created_by: admin.adminUserId,
    email_type: campaignType,
    recipient_email: recipient.email?.trim(),
    recipient_name: recipient.name,
    email_subject: subject,
    sent_by: admin.adminEmail,
    variables_used: {
      draftId: newsletterDraft.id,
      campaignType,
      targetAudience,
      previewText: "",
      body,
    },
    status: "pending",
  }));

  for (const rows of chunkRows(emailLogRows, 500)) {
    const { error } = await adminSupabase.from("email_log").insert(rows);

    if (error) {
      const safeMessage = readSafeErrorMessage(error);
      console.error("Newsletter queue email log insert error:", {
        draftId: newsletterDraft.id,
        targetAudience,
        attemptedRows: rows.length,
        error,
      });
      return errorResponse(`Could not queue campaign emails: ${safeMessage}`, 500);
    }
  }

  const now = new Date().toISOString();
  const { error: updateError } = await adminSupabase
    .from("marketing_email_draft")
    .update({
      status: "queued",
      scheduled_date: now,
      sent_count: recipients.length,
      updated_date: now,
    })
    .eq("id", newsletterDraft.id);

  if (updateError) {
    const safeMessage = readSafeErrorMessage(updateError);
    console.error("Newsletter queue draft update error:", {
      draftId: newsletterDraft.id,
      queuedCount: recipients.length,
      error: updateError,
    });
    return errorResponse(
      `Campaign emails were queued, but the draft status could not be updated: ${safeMessage}`,
      500,
    );
  }

  return jsonResponse({ success: true, queuedCount: recipients.length }, 200);
}
