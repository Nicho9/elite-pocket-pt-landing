import { createClient } from "@supabase/supabase-js";

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

function requiredEnv() {
  const supabaseUrl = process.env.SB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SB_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return { supabaseUrl, supabaseAnonKey };
}

function isCanonicalAudience(value: string): value is ComposerAudience {
  return canonicalAudiences.includes(value as ComposerAudience);
}

async function requireAdmin(request: Request) {
  const { supabaseUrl, supabaseAnonKey } = requiredEnv();

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
    console.error("Newsletter draft admin profile lookup error:", profileError);
    return { error: errorResponse("Could not verify admin access.", 500) };
  }

  if (profile?.role !== "admin") {
    return { error: errorResponse("Admin access required.", 403) };
  }

  const serviceRoleKey =
    process.env.SB_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return { error: errorResponse("Newsletter draft service is not configured.", 500) };
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    userId: userData.user.id,
  };
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
      created_by: admin.userId,
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
