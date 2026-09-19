import { createClient } from "@supabase/supabase-js";

import { readFreeWebinarRegistrationSession } from "../../../lib/freeWebinarRegistrationSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PERFORMANCE_NUTRITION_WEBINAR_SLUG = "an-introduction-to-performance-nutrition";

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const session = readFreeWebinarRegistrationSession(request);

  if (session?.slug !== PERFORMANCE_NUTRITION_WEBINAR_SLUG) {
    return noStoreJson({ error: "Your webinar registration could not be verified." }, 401);
  }

  const supabaseUrl = process.env.SB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SB_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Free webinar content service is not configured.");
    return noStoreJson({ error: "Webinar content is temporarily unavailable. Please refresh and try again." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const webinarQuery = supabase
    .from("vip_webinars")
    .select("id,slug,access_tier,is_published")
    .eq("slug", PERFORMANCE_NUTRITION_WEBINAR_SLUG);
  const { data: webinar, error: webinarError } =
    process.env.NODE_ENV === "development"
      ? await webinarQuery.single()
      : await webinarQuery.eq("is_published", true).single();

  if (
    webinarError ||
    !webinar ||
    webinar.slug !== PERFORMANCE_NUTRITION_WEBINAR_SLUG ||
    webinar.access_tier?.toLowerCase() !== "free"
  ) {
    console.error("Free webinar content access was denied.", webinarError?.message);
    return noStoreJson({ error: "Webinar content is unavailable." }, 404);
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("vip_webinar_sections")
    .select("*")
    .eq("webinar_id", webinar.id);

  if (sectionsError) {
    console.error("Free webinar section load failed.", sectionsError.message);
    return noStoreJson({ error: "Webinar content is temporarily unavailable. Please refresh and try again." }, 502);
  }

  const sectionIds = (sections || [])
    .map((section) => (typeof section.id === "string" ? section.id : ""))
    .filter(Boolean);

  const [contentResult, quizResult] = await Promise.all([
    sectionIds.length > 0
      ? supabase.from("vip_webinar_section_content").select("*").in("section_id", sectionIds)
      : Promise.resolve({ data: [], error: null }),
    sectionIds.length > 0
      ? supabase.from("vip_webinar_quiz_questions").select("*").in("section_id", sectionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (contentResult.error || quizResult.error) {
    console.error(
      "Free webinar detail load failed.",
      contentResult.error?.message || quizResult.error?.message,
    );
    return noStoreJson({ error: "Webinar content is temporarily unavailable. Please refresh and try again." }, 502);
  }

  return noStoreJson({
    sections: sections || [],
    contentBlocks: contentResult.data || [],
    quizQuestions: quizResult.data || [],
  });
}
