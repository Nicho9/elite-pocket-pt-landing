import { createClient } from "@supabase/supabase-js";

type LatestLead = {
  id: string;
  name: string | null;
  email: string | null;
  referral_source: string | null;
  created_at: string | null;
};

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

function readCount(count: number | null) {
  return typeof count === "number" ? count : 0;
}

export async function GET(request: Request) {
  const supabaseUrl = process.env.SB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SB_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return errorResponse("Supabase authentication is not configured.", 500);
  }

  const token = readBearerToken(request);

  if (!token) {
    return errorResponse("Missing bearer token.", 401);
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
    return errorResponse("Invalid or expired session.", 401);
  }

  const { data: profile, error: profileError } = await authSupabase
    .from("User")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Newsletter admin profile lookup error:", profileError);
    return errorResponse("Could not verify admin access.", 500);
  }

  if (profile?.role !== "admin") {
    return errorResponse("Admin access required.", 403);
  }

  const serviceRoleKey =
    process.env.SB_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return errorResponse("Newsletter admin service is not configured.", 500);
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

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

  const queryError =
    totalLeadsResult.error ||
    allNewsletterContactsResult.error ||
    leadOnlyResult.error ||
    activeMembersResult.error ||
    unclearAppUsersResult.error ||
    adminCountResult.error ||
    latestLeadsResult.error ||
    draftCountResult.error ||
    pendingEmailCountResult.error ||
    sentEmailCountResult.error;

  if (queryError) {
    console.error("Newsletter admin summary query error:", queryError);
    return errorResponse("Could not load newsletter summary.", 500);
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
