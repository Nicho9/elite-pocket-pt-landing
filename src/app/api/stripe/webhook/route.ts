import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const transformationCheckoutUrl =
  "https://buy.stripe.com/eVq4gA0BH4R5aZz81pdZ60X";

type WebhookEnv = {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status });
}

function getRequiredEnv(): WebhookEnv | null {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SB_URL;
  const supabaseServiceRoleKey = process.env.SB_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return {
    stripeSecretKey,
    stripeWebhookSecret,
    supabaseUrl,
    supabaseServiceRoleKey,
  };
}

function getTransformationSignupId(session: Stripe.Checkout.Session) {
  if (session.metadata?.product === "elite_8_week_transformation") {
    return session.metadata.transformation_signup_id || "";
  }

  return "";
}

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === "string" ? session.payment_intent : null;
}

export async function POST(request: Request) {
  const env = getRequiredEnv();

  if (!env) {
    return jsonResponse({ success: false, error: "Stripe webhook is not configured." }, 500);
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonResponse({ success: false, error: "Missing Stripe signature." }, 400);
  }

  const rawBody = await request.text();
  const stripe = new Stripe(env.stripeSecretKey);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
  } catch {
    return jsonResponse({ success: false, error: "Invalid Stripe signature." }, 400);
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.expired") {
    return jsonResponse({ success: true }, 200);
  }

  const session = event.data.object as Stripe.Checkout.Session;
  let transformationSignupId = getTransformationSignupId(session);

  if (!transformationSignupId && session.client_reference_id) {
    const paymentLinkId =
      typeof session.payment_link === "string" ? session.payment_link : session.payment_link?.id;

    if (!paymentLinkId) {
      return jsonResponse({ success: true }, 200);
    }

    try {
      const paymentLink = await stripe.paymentLinks.retrieve(paymentLinkId);

      if (paymentLink.url !== transformationCheckoutUrl) {
        return jsonResponse({ success: true }, 200);
      }
    } catch (error) {
      const stripeError = error instanceof Error ? error : null;

      console.error("Transformation Payment Link verification failed", {
        payment_link_id: paymentLinkId,
        message: stripeError?.message,
      });

      return jsonResponse({ success: false, error: "Could not verify Payment Link." }, 500);
    }

    transformationSignupId = session.client_reference_id;
  }

  if (!transformationSignupId) {
    return jsonResponse({ success: true }, 200);
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
  const { data: transformationSignup, error: lookupError } = await supabase
    .from("transformation_signups")
    .select(
      "id, user_id, email, referral_source, payment_status, stripe_checkout_session_id, stripe_payment_intent_id",
    )
    .eq("id", transformationSignupId)
    .maybeSingle();

  if (lookupError) {
    console.error("Transformation signup webhook lookup failed", {
      eventType: event.type,
      transformation_signup_id: transformationSignupId,
      message: lookupError.message,
      code: lookupError.code,
    });

    return jsonResponse({ success: false, error: "Could not resolve transformation signup." }, 500);
  }

  if (!transformationSignup) {
    return jsonResponse({ success: true }, 200);
  }

  if (
    transformationSignup.payment_status === "paid" &&
    (event.type === "checkout.session.expired" ||
      transformationSignup.stripe_checkout_session_id === session.id)
  ) {
    return jsonResponse({ success: true }, 200);
  }

  const now = new Date().toISOString();
  const updatePayload =
    event.type === "checkout.session.completed"
      ? {
          payment_status: "paid",
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: getPaymentIntentId(session),
          paid_at: now,
          updated_at: now,
        }
      : {
          payment_status: "cancelled",
          updated_at: now,
        };

  const { error } = await supabase
    .from("transformation_signups")
    .update(updatePayload)
    .eq("id", transformationSignupId);

  if (error) {
    console.error("Transformation signup webhook update failed", {
      eventType: event.type,
      transformation_signup_id: transformationSignupId,
      message: error.message,
      code: error.code,
    });

    return jsonResponse({ success: false, error: "Could not update transformation signup." }, 500);
  }

  console.log("Transformation signup webhook processed", {
    eventType: event.type,
    transformation_signup_id: transformationSignupId,
    user_id: transformationSignup.user_id,
  });

  return jsonResponse({ success: true }, 200);
}
