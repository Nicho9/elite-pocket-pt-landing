import { createClient } from "@supabase/supabase-js";

import {
  createFreeWebinarRegistrationSession,
  freeWebinarSessionCookieOptions,
  FREE_WEBINAR_SESSION_COOKIE,
} from "../../../lib/freeWebinarRegistrationSession";

const WEBINAR_SOURCE = "free_webinar_performance_nutrition";
const PERFORMANCE_NUTRITION_WEBINAR_SLUG = "an-introduction-to-performance-nutrition";

type WebinarRegistrationRequestBody = {
  name?: unknown;
  email?: unknown;
  newsletterConsent?: unknown;
  slug?: unknown;
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status });
}

function hasValidEmailStructure(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    let body: WebinarRegistrationRequestBody;

    try {
      const parsed: unknown = await request.json();

      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return jsonResponse({ success: false, error: "Please provide a valid request." }, 400);
      }

      body = parsed;
    } catch {
      return jsonResponse({ success: false, error: "Please provide a valid request." }, 400);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";

    if (!name) {
      return jsonResponse({ success: false, error: "Please enter your name." }, 400);
    }

    if (!email || !hasValidEmailStructure(email)) {
      return jsonResponse({ success: false, error: "Please enter a valid email address." }, 400);
    }

    if (body.newsletterConsent !== true) {
      return jsonResponse(
        {
          success: false,
          error: "Newsletter consent is required to register for this free webinar.",
        },
        400,
      );
    }

    if (slug !== PERFORMANCE_NUTRITION_WEBINAR_SLUG) {
      return jsonResponse({ success: false, error: "This webinar is not available for registration." }, 400);
    }

    const supabaseUrl = process.env.SB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SB_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Webinar registration service is not configured: missing Supabase URL or service-role key.");
      return jsonResponse(
        { success: false, error: "We could not register you for the webinar. Please try again." },
        500,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const webinarQuery = supabase.from("vip_webinars").select("access_tier").eq("slug", slug);
    const { data: webinar, error: webinarError } =
      process.env.NODE_ENV === "development"
        ? await webinarQuery.single()
        : await webinarQuery.eq("is_published", true).single();

    if (webinarError || !webinar || webinar.access_tier?.toLowerCase() !== "free") {
      return jsonResponse({ success: false, error: "This webinar is not available for registration." }, 404);
    }

    const freeWebinarSession = createFreeWebinarRegistrationSession({ email, name, slug });

    if (!freeWebinarSession) {
      console.error("Webinar registration session is not configured.");
      return jsonResponse(
        { success: false, error: "We could not register you for the webinar. Please try again." },
        500,
      );
    }

    function successResponse(alreadyRegistered: boolean) {
      const response = Response.json({ success: true, alreadyRegistered }, { status: 200 });
      response.headers.append(
        "Set-Cookie",
        `${FREE_WEBINAR_SESSION_COOKIE}=${freeWebinarSession}; Path=${freeWebinarSessionCookieOptions.path}; Max-Age=${freeWebinarSessionCookieOptions.maxAge}; HttpOnly; SameSite=Lax${freeWebinarSessionCookieOptions.secure ? "; Secure" : ""}`,
      );
      return response;
    }

    const { data: existingSignup, error: lookupError } = await supabase
      .from("email_list_signup")
      .select("id")
      .eq("email", email)
      .eq("source", WEBINAR_SOURCE)
      .maybeSingle();

    if (lookupError) {
      console.error("Webinar registration lookup error:", lookupError);
      return jsonResponse(
        { success: false, error: "We could not register you for the webinar. Please try again." },
        500,
      );
    }

    if (existingSignup) {
      const { error: updateError } = await supabase
        .from("email_list_signup")
        .update({
          name,
          is_active: true,
          updated_date: new Date().toISOString(),
        })
        .eq("id", existingSignup.id);

      if (updateError) {
        console.error("Webinar registration update error:", updateError);
        return jsonResponse(
          { success: false, error: "We could not register you for the webinar. Please try again." },
          500,
        );
      }

      return successResponse(true);
    }

    const { error: insertError } = await supabase.from("email_list_signup").insert({
      email,
      name,
      source: WEBINAR_SOURCE,
      is_active: true,
      created_by: "webinar_registration",
    });

    if (insertError) {
      console.error("Webinar registration insert error:", insertError);
      return jsonResponse(
        { success: false, error: "We could not register you for the webinar. Please try again." },
        500,
      );
    }

    return successResponse(false);
  } catch (error) {
    console.error("Webinar registration API error:", error);
    return jsonResponse(
      { success: false, error: "We could not register you for the webinar. Please try again." },
      500,
    );
  }
}
