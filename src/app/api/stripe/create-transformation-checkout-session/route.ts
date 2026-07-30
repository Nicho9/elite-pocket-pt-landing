import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const transformationPriceId = "price_1TyUgzLuPG1NFWds7GW0d8iU";
const referralSources = [
  "Mike Nicholson",
  "Elite Pocket PT",
  "Instagram",
  "Facebook",
  "Craig Broomhead",
] as const;

type TransformationCheckoutRequestBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  referralSource?: unknown;
};

type TransformationCheckoutEnv = {
  stripeSecretKey: string;
  siteUrl: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  websiteSignupSecret: string;
};

type WebsiteSignupResponse = {
  ok?: unknown;
  user_id?: unknown;
  email?: unknown;
  full_name?: unknown;
  stripe_customer_id?: unknown;
  error?: unknown;
  message?: unknown;
  code?: unknown;
  details?: unknown;
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status });
}

function getRequiredEnv(): TransformationCheckoutEnv | null {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const supabaseUrl = process.env.SB_URL;
  const supabaseServiceRoleKey = process.env.SB_SERVICE_ROLE_KEY;
  const websiteSignupSecret = process.env.WEBSITE_SIGNUP_SECRET;

  if (
    !stripeSecretKey ||
    !siteUrl ||
    !supabaseUrl ||
    !supabaseServiceRoleKey ||
    !websiteSignupSecret
  ) {
    return null;
  }

  return {
    stripeSecretKey,
    siteUrl: siteUrl.replace(/\/+$/, ""),
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    supabaseServiceRoleKey,
    websiteSignupSecret,
  };
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isValidReferralSource(value: string): value is (typeof referralSources)[number] {
  return referralSources.includes(value as (typeof referralSources)[number]);
}

function getSupabaseError(payload: WebsiteSignupResponse | null) {
  const error = getString(payload?.error).trim();
  const message = getString(payload?.message).trim();

  return error || message || "Could not create account.";
}

function getSupabaseErrorDetails(payload: WebsiteSignupResponse | null) {
  if (!payload) {
    return undefined;
  }

  const details: Record<string, unknown> = {};

  if (typeof payload.code === "string" && payload.code) {
    details.code = payload.code;
  }

  if (typeof payload.details === "string" && payload.details) {
    details.details = payload.details;
  }

  return Object.keys(details).length > 0 ? details : undefined;
}

async function readSupabaseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return (await response.json()) as WebsiteSignupResponse;
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text ? ({ error: text } satisfies WebsiteSignupResponse) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const env = getRequiredEnv();

  if (!env) {
    console.error("Transformation checkout service is not configured", {
      missingEnv: {
        STRIPE_SECRET_KEY: !process.env.STRIPE_SECRET_KEY,
        NEXT_PUBLIC_SITE_URL: !process.env.NEXT_PUBLIC_SITE_URL,
        SB_URL: !process.env.SB_URL,
        SB_SERVICE_ROLE_KEY: !process.env.SB_SERVICE_ROLE_KEY,
        WEBSITE_SIGNUP_SECRET: !process.env.WEBSITE_SIGNUP_SECRET,
      },
    });

    return jsonResponse(
      { success: false, error: "Transformation checkout service is not configured." },
      500,
    );
  }

  let body: TransformationCheckoutRequestBody;

  try {
    body = (await request.json()) as TransformationCheckoutRequestBody;
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body." }, 400);
  }

  const name = getString(body.name).trim();
  const email = getString(body.email).trim().toLowerCase();
  const password = getString(body.password);
  const referralSource = getString(body.referralSource).trim();

  if (!name) {
    return jsonResponse({ success: false, error: "Name is required." }, 400);
  }

  if (!email) {
    return jsonResponse({ success: false, error: "Email is required." }, 400);
  }

  if (!referralSource) {
    return jsonResponse(
      { success: false, error: "Please tell us how you heard about the programme." },
      400,
    );
  }

  if (!isValidReferralSource(referralSource)) {
    return jsonResponse(
      { success: false, error: "Please select a valid referral source." },
      400,
    );
  }

  if (!password || password.length < 8) {
    return jsonResponse(
      { success: false, error: "Password must be at least 8 characters." },
      400,
    );
  }

  try {
    const signupResponse = await fetch(
      `${env.supabaseUrl}/functions/v1/create-user-from-website`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-website-signup-secret": env.websiteSignupSecret,
        },
        body: JSON.stringify({
          email,
          password,
          full_name: name,
        }),
      },
    );

    const signupPayload = await readSupabaseResponse(signupResponse);

    if (!signupResponse.ok) {
      const details = getSupabaseErrorDetails(signupPayload);

      return jsonResponse(
        {
          success: false,
          error: getSupabaseError(signupPayload),
          ...(details ? { details } : {}),
        },
        signupResponse.status,
      );
    }

    const adminSupabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
    const userId = getString(signupPayload?.user_id);

    if (!userId) {
      return jsonResponse(
        { success: false, error: "Account creation returned an invalid response." },
        502,
      );
    }

    const { data: transformationSignup, error: transformationSignupError } =
      await adminSupabase
        .from("transformation_signups")
        .insert({
          user_id: userId,
          full_name: name,
          email,
          referral_source: referralSource,
          payment_status: "pending",
        })
        .select("id")
        .single();

    if (transformationSignupError || !transformationSignup?.id) {
      console.error("Transformation signup insert failed", {
        message: transformationSignupError?.message,
        code: transformationSignupError?.code,
      });

      return jsonResponse(
        { success: false, error: "Could not save transformation signup." },
        500,
      );
    }

    const metadata: Stripe.MetadataParam = {
      product: "elite_8_week_transformation",
      programme: "Elite 8-week Transformation",
      name,
      email,
      user_id: userId,
      transformation_signup_id: transformationSignup.id,
      referral_source: referralSource,
    };
    const stripe = new Stripe(env.stripeSecretKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: transformationPriceId, quantity: 1 }],
      customer_email: email,
      client_reference_id: userId,
      metadata,
      payment_intent_data: {
        metadata,
      },
      success_url: `${env.siteUrl}/checkout/success?programme=elite-8-week-transformation`,
      cancel_url: `${env.siteUrl}/elite-8-week-transformation/signup?cancelled=true`,
    });

    if (!session.url) {
      return jsonResponse(
        { success: false, error: "Could not create checkout session." },
        502,
      );
    }

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : null;
    const { error: updateSignupError } = await adminSupabase
      .from("transformation_signups")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq("id", transformationSignup.id);

    if (updateSignupError) {
      console.error("Transformation signup checkout session update failed", {
        transformation_signup_id: transformationSignup.id,
        message: updateSignupError.message,
        code: updateSignupError.code,
      });
    }

    return jsonResponse({ success: true, url: session.url }, 200);
  } catch (error) {
    const checkoutError = error instanceof Error ? error : null;

    console.error("Transformation checkout failed", {
      name: checkoutError?.name,
      message: checkoutError?.message,
      stack: checkoutError?.stack,
    });

    return jsonResponse(
      { success: false, error: "Could not create checkout session." },
      500,
    );
  }
}
