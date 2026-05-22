import Stripe from "stripe";

export const runtime = "nodejs";

type CheckoutPlan = "full_app" | "vip";

type CheckoutRequestBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  plan?: unknown;
};

type CheckoutEnv = {
  stripeSecretKey: string;
  stripeFullAppPriceId: string;
  stripeVipPriceId: string;
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

function getRequiredEnv(): CheckoutEnv | null {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeFullAppPriceId = process.env.STRIPE_FULL_APP_PRICE_ID;
  const stripeVipPriceId = process.env.STRIPE_VIP_PRICE_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const supabaseUrl = process.env.SB_URL;
  const websiteSignupSecret = process.env.WEBSITE_SIGNUP_SECRET;

  if (
    !stripeSecretKey ||
    !stripeFullAppPriceId ||
    !stripeVipPriceId ||
    !siteUrl ||
    !supabaseUrl ||
    !websiteSignupSecret
  ) {
    return null;
  }

  return {
    stripeSecretKey,
    stripeFullAppPriceId,
    stripeVipPriceId,
    siteUrl: siteUrl.replace(/\/+$/, ""),
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    websiteSignupSecret,
  };
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isCheckoutPlan(value: unknown): value is CheckoutPlan {
  return value === "full_app" || value === "vip";
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
      { success: false, error: "Checkout service is not configured." },
      500,
    );
  }

  let body: CheckoutRequestBody;

  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body." }, 400);
  }

  const name = getString(body.name).trim();
  const email = getString(body.email).trim().toLowerCase();
  const password = getString(body.password);
  const plan = body.plan;

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

  if (!isCheckoutPlan(plan)) {
    return jsonResponse({ success: false, error: "Plan must be full_app or vip." }, 400);
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

    const stripe = new Stripe(env.stripeSecretKey);
    const priceId = plan === "vip" ? env.stripeVipPriceId : env.stripeFullAppPriceId;
    const metadata: Stripe.MetadataParam = {
      user_id: userId,
      plan,
    };

    if (plan === "vip") {
      metadata.tier = "vip";
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      client_reference_id: userId,
      metadata,
      subscription_data: {
        metadata,
      },
      success_url: `${env.siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/checkout/cancelled`,
      allow_promotion_codes: true,
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
