import { createClient } from "@supabase/supabase-js";

const WEBINAR_SOURCE = "free_webinar_performance_nutrition";

type WebinarRegistrationRequestBody = {
  name?: unknown;
  email?: unknown;
  newsletterConsent?: unknown;
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

      return jsonResponse({ success: true, alreadyRegistered: true }, 200);
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

    return jsonResponse({ success: true, alreadyRegistered: false }, 200);
  } catch (error) {
    console.error("Webinar registration API error:", error);
    return jsonResponse(
      { success: false, error: "We could not register you for the webinar. Please try again." },
      500,
    );
  }
}
