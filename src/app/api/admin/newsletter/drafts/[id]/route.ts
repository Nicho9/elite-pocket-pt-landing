import { createClient } from "@supabase/supabase-js";

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

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status });
}

function errorResponse(error: string, status: number) {
  return jsonResponse({ success: false, error }, status);
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
  };
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
