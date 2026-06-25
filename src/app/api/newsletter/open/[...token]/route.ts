import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

const transparentPixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

type EmailLogTrackingRow = {
  id: string;
  tracking_token: string;
  opened_at: string | null;
  open_count: number | null;
  variables_used: unknown;
};

function pixelResponse() {
  return new Response(transparentPixel, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

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

function readTrackingToken(segments: string[] | undefined) {
  const [tokenSegment] = segments || [];
  return tokenSegment?.replace(/\.png$/i, "").trim() || "";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token?: string[] }> },
) {
  const supabase = getServiceClient();

  if (!supabase) {
    return pixelResponse();
  }

  const { token } = await params;
  const trackingToken = readTrackingToken(token);

  if (!trackingToken) {
    return pixelResponse();
  }

  try {
    const { data } = await supabase
      .from("email_log")
      .select("id,tracking_token,opened_at,open_count,variables_used")
      .eq("tracking_token", trackingToken)
      .maybeSingle();

    if (!data) {
      return pixelResponse();
    }

    const emailLog = data as EmailLogTrackingRow;
    const now = new Date().toISOString();

    await supabase.from("email_open_event").insert({
      email_log_id: emailLog.id,
      draft_id: readDraftId(emailLog.variables_used),
      tracking_token: emailLog.tracking_token,
      user_agent: request.headers.get("user-agent") || "",
      ip_hash: readIpHash(request),
    });

    await supabase
      .from("email_log")
      .update({
        opened_at: emailLog.opened_at || now,
        open_count: (emailLog.open_count || 0) + 1,
      })
      .eq("id", emailLog.id);
  } catch (error) {
    console.error("Newsletter open tracking error:", error);
  }

  return pixelResponse();
}
