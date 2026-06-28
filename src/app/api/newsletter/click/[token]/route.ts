import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

const fallbackUrl = "https://www.elitepocketpt.com";
const linkDestinations: Record<string, string> = {
  app_store: "https://apps.apple.com/ae/app/elite-pocket-pt/id6761879840",
  google_play: "https://play.google.com/store/apps/details?id=com.elitepocketpt.app",
  apple_founder20: "https://apps.apple.com/redeem?ctx=offercodes&id=6761879840&code=FOUNDER20",
};

type EmailLogTrackingRow = {
  id: string;
  tracking_token: string;
  click_count: number | null;
  variables_used: unknown;
};

function getServiceClient() {
  const supabaseUrl = process.env.SB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SB_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function readDraftId(value: unknown) {
  if (!value || typeof value !== "object" || !("draftId" in value)) {
    return null;
  }

  const draftId = (value as { draftId?: unknown }).draftId;
  return typeof draftId === "string" && draftId.trim() ? draftId.trim() : null;
}

function readIpHash(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "";

  if (!ip) {
    return "";
  }

  return createHash("sha256").update(ip).digest("hex");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const linkKey = new URL(request.url).searchParams.get("link")?.trim() || "";
  const destinationUrl = linkDestinations[linkKey] || fallbackUrl;

  if (!linkDestinations[linkKey]) {
    return Response.redirect(destinationUrl, 302);
  }

  const supabase = getServiceClient();

  if (!supabase) {
    return Response.redirect(destinationUrl, 302);
  }

  const { token } = await params;
  const trackingToken = token?.trim();

  if (!trackingToken) {
    return Response.redirect(fallbackUrl, 302);
  }

  try {
    const { data } = await supabase
      .from("email_log")
      .select("id,tracking_token,click_count,variables_used")
      .eq("tracking_token", trackingToken)
      .maybeSingle();

    if (!data) {
      return Response.redirect(fallbackUrl, 302);
    }

    const emailLog = data as EmailLogTrackingRow;
    const now = new Date().toISOString();

    await supabase.from("email_click_event").insert({
      email_log_id: emailLog.id,
      draft_id: readDraftId(emailLog.variables_used),
      tracking_token: emailLog.tracking_token,
      link_key: linkKey,
      destination_url: destinationUrl,
      user_agent: request.headers.get("user-agent") || "",
      ip_hash: readIpHash(request),
    });

    await supabase
      .from("email_log")
      .update({
        last_clicked_at: now,
        click_count: (emailLog.click_count || 0) + 1,
      })
      .eq("id", emailLog.id);
  } catch (error) {
    console.error("Newsletter click tracking error:", error);
  }

  return Response.redirect(destinationUrl, 302);
}
