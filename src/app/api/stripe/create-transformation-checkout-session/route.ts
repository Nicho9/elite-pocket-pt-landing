import Stripe from "stripe";

export const runtime = "nodejs";

const transformationPriceId = "price_1TyUgzLuPG1NFWds7GW0d8iU";

type TransformationCheckoutRequestBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

type TransformationCheckoutEnv = {
  stripeSecretKey: string;
  siteUrl: string;
  supabaseUrl: string;
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
  const websiteSignupSecret = process.env.WEBSITE_SIGNUP_SECRET;

  if (!stripeSecretKey || !siteUrl || !supabaseUrl || !websiteSignupSecret) {
    return null;
  }

  return {
    stripeSecretKey,
    siteUrl: siteUrl.replace(/\/+$/, ""),
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    websiteSignupSecret,
  };
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
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

  if (!name) {
    return jsonResponse({ success: false, error: "Name is required." }, 400);
  }

  if (!email) {
    return jsonResponse({ success: false, error: "Email is required." }, 400);
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

    const userId = getString(signupPayload?.user_id);

    if (!userId) {
      return jsonResponse(
        { success: false, error: "Account creation returned an invalid response." },
        502,
      );
    }

    const metadata: Stripe.MetadataParam = {
      product: "elite_8_week_transformation",
      programme: "Elite 8-week Transformation",
      name,
      email,
      user_id: userId,
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

    return jsonResponse({ success: true, url: session.url }, 200);
  } catch {
    return jsonResponse(
      { success: false, error: "Could not create checkout session." },
      500,
    );
  }
}
