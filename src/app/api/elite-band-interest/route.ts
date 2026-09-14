import { createClient } from "@supabase/supabase-js";

type InterestRequestBody = {
  name?: unknown;
  email?: unknown;
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status });
}

function hasValidEmailStructure(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isDuplicateEmailError(error: { code?: string } | null) {
  return error?.code === "23505";
}

export async function POST(request: Request) {
  try {
    let body: InterestRequestBody;

    try {
      const parsed: unknown = await request.json();
      body = typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return jsonResponse({ success: false, error: "Please provide a valid request." }, 400);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!name || !email || !hasValidEmailStructure(email)) {
      return jsonResponse(
        { success: false, error: "Please enter your name and a valid email address." },
        400,
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Elite Band interest service is not configured.");
      return jsonResponse(
        { success: false, error: "We could not register your interest. Please try again." },
        500,
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { error: insertError } = await supabase.from("landing_waitlist").insert({
      name,
      email,
      referral_source: "elite_band_interest",
    });

    if (isDuplicateEmailError(insertError)) {
      return jsonResponse({ success: true, alreadyRegistered: true }, 200);
    }

    if (insertError) {
      console.error("Elite Band interest insert error:", insertError);
      return jsonResponse(
        { success: false, error: "We could not register your interest. Please try again." },
        500,
      );
    }

    return jsonResponse({ success: true, alreadyRegistered: false }, 200);
  } catch (error) {
    console.error("Elite Band interest API error:", error);
    return jsonResponse(
      { success: false, error: "We could not register your interest. Please try again." },
      500,
    );
  }
}
