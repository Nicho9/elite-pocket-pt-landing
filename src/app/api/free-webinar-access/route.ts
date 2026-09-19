import { createClient } from "@supabase/supabase-js";

import { readFreeWebinarRegistrationSession } from "../../../lib/freeWebinarRegistrationSession";

export const dynamic = "force-dynamic";

const PERFORMANCE_NUTRITION_WEBINAR_SLUG = "an-introduction-to-performance-nutrition";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") || "";
  const session = readFreeWebinarRegistrationSession(request);
  let valid = slug === PERFORMANCE_NUTRITION_WEBINAR_SLUG && session?.slug === slug;

  if (valid) {
    const supabaseUrl = process.env.SB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SB_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      valid = false;
    } else {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const webinarQuery = supabase.from("vip_webinars").select("access_tier").eq("slug", slug);
      const { data: webinar, error } =
        process.env.NODE_ENV === "development"
          ? await webinarQuery.single()
          : await webinarQuery.eq("is_published", true).single();

      valid = !error && webinar?.access_tier?.toLowerCase() === "free";
    }
  }

  return Response.json(
    { valid },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
