import { createClient } from "@supabase/supabase-js";

import { requireNewsletterAdmin } from "../newsletter/auth";
import { errorResponse, jsonResponse } from "../newsletter/responses";

function readSafeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "object" && error) {
    const details = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    if (typeof details.message === "string" && details.message.trim()) {
      return details.message.trim();
    }

    const fallbackDetails = [details.code, details.details, details.hint]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ");

    if (fallbackDetails) {
      return fallbackDetails;
    }
  }

  return "Unknown Supabase query error.";
}

export async function GET(request: Request) {
  const admin = await requireNewsletterAdmin(request, {
    routeName: "transformations",
    serviceConfigError: "Transformation admin service is not configured.",
  });

  if ("error" in admin) {
    return admin.error;
  }

  const adminSupabase = createClient(admin.supabaseUrl, admin.serviceRoleKey);
  const { data, error } = await adminSupabase
    .from("transformation_signups")
    .select(
      [
        "id",
        "full_name",
        "email",
        "referral_source",
        "payment_status",
        "stripe_checkout_session_id",
        "stripe_payment_intent_id",
        "created_at",
        "paid_at",
      ].join(","),
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Transformation admin signups query error:", {
      message: readSafeErrorMessage(error),
    });

    return errorResponse("Could not load transformation signups.", 500);
  }

  return jsonResponse({ success: true, signups: data || [] }, 200);
}
