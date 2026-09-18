"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "../../../lib/supabaseClient";
import type { PerformanceNutritionAssessmentResult } from "../../../lib/performanceNutritionAssessment";

type DatabaseRecord = Record<string, unknown>;

const PERFORMANCE_NUTRITION_WEBINAR_SLUG = "an-introduction-to-performance-nutrition";
const automaticallyEmailedAssessmentKeys = new Set<string>();

type PdfEmailStatus = "idle" | "sending" | "sent" | "failed";

type AssessmentFormInputs = {
  sex: string;
  age: string;
  heightCm: string;
  weightKg: string;
  goal: string;
  dailyActivity: string;
  sessionsPerWeek: string;
  sessionDuration: string;
  intensity: string;
  multipleSessions: string;
  dietType: string;
  sweatProfile: string;
  trainingEnvironment: string;
};

const initialAssessmentInputs: AssessmentFormInputs = {
  sex: "",
  age: "",
  heightCm: "",
  weightKg: "",
  goal: "",
  dailyActivity: "",
  sessionsPerWeek: "",
  sessionDuration: "",
  intensity: "",
  multipleSessions: "",
  dietType: "",
  sweatProfile: "",
  trainingEnvironment: "",
};

type UserProfile = {
  role: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
};

function readString(record: DatabaseRecord | null | undefined, keys: string[]) {
  if (!record) {
    return "";
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function readArray(record: DatabaseRecord | null | undefined, keys: string[]) {
  if (!record) {
    return [];
  }

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }
  }

  return [];
}

function recordId(record: DatabaseRecord) {
  return readString(record, ["id", "section_id", "block_id", "question_id", "slug", "title"]);
}

function webinarRecordId(record: DatabaseRecord) {
  return readString(record, ["id", "webinar_id", "slug", "title"]);
}

function sectionRecordId(record: DatabaseRecord) {
  return readString(record, ["section_id", "id", "slug", "title"]);
}

function sortByPosition(records: DatabaseRecord[]) {
  return [...records].sort((left, right) => {
    const leftPosition = Number(readString(left, ["position", "sort_order", "order_index", "section_order"]));
    const rightPosition = Number(readString(right, ["position", "sort_order", "order_index", "section_order"]));

    if (Number.isFinite(leftPosition) && Number.isFinite(rightPosition)) {
      return leftPosition - rightPosition;
    }

    return readString(left, ["created_at"]).localeCompare(readString(right, ["created_at"]));
  });
}

function contentText(block: DatabaseRecord) {
  return readString(block, ["content", "body", "text", "description"]);
}

function contentTitle(block: DatabaseRecord) {
  return readString(block, ["title", "heading"]);
}

function titlesMatch(left: string, right: string) {
  return left.trim().replace(/s+/g, " ").toLocaleLowerCase() === right.trim().replace(/s+/g, " ").toLocaleLowerCase();
}

function assessmentResultKey(result: PerformanceNutritionAssessmentResult) {
  const serialized = JSON.stringify(result);
  let hash = 2166136261;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function dropdownItems(block: DatabaseRecord) {
  const value = block.dropdown_items;

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is DatabaseRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => ({
      id: readString(item, ["id", "slug", "title", "heading"]) || String(index),
      title: readString(item, ["title", "heading", "label"]),
      body: readString(item, ["content", "body", "text", "description"]),
    }))
    .filter((item) => item.title || item.body);
}

type StructuredTextBlock =
  | { type: "paragraph"; text: string; isLeadIn: boolean; isShortStatement: boolean }
  | { type: "list"; items: string[] };

function parseStructuredText(body: string): StructuredTextBlock[] {
  const blocks: Array<{ type: "paragraph"; text: string } | { type: "list"; items: string[] }> = [];
  const paragraphGroups = body
    .replaceAll("\r\n", "\n")
    .split(/\n\s*\n/)
    .map((group) => group.trim())
    .filter(Boolean);

  for (const group of paragraphGroups) {
    const lines = group
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    let lineIndex = 0;

    while (lineIndex < lines.length) {
      if (/^(?:•|-)\s+/.test(lines[lineIndex])) {
        const items: string[] = [];

        while (lineIndex < lines.length && /^(?:•|-)\s+/.test(lines[lineIndex])) {
          items.push(lines[lineIndex].replace(/^(?:•|-)\s+/, ""));
          lineIndex += 1;
        }

        blocks.push({ type: "list", items });
        continue;
      }

      const paragraphLines: string[] = [];

      while (lineIndex < lines.length && !/^(?:•|-)\s+/.test(lines[lineIndex])) {
        paragraphLines.push(lines[lineIndex]);
        lineIndex += 1;
      }

      blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
    }
  }

  return blocks.map((block, index) => {
    if (block.type === "list") {
      return block;
    }

    const nextBlock = blocks[index + 1];
    const wordCount = block.text.split(/\s+/).length;

    return {
      ...block,
      isLeadIn: nextBlock?.type === "list",
      isShortStatement: wordCount <= 16 && block.text.length <= 110 && !block.text.endsWith(":"),
    };
  });
}

function renderInlineText(text: string) {
  const leadTerm = text.match(/^(.{1,48}:)(\s+.+)$/);

  if (!leadTerm) {
    return text;
  }

  return (
    <>
      <span className="font-semibold text-[#0B1220]">{leadTerm[1]}</span>
      {leadTerm[2]}
    </>
  );
}

function renderListItemText(item: string) {
  const emDashIndex = item.indexOf("—");

  if (emDashIndex > 0) {
    const leadingText = item.slice(0, emDashIndex).trim();
    const remainingText = item.slice(emDashIndex + 1).trim();

    if (leadingText && remainingText) {
      return (
        <>
          <span className="font-semibold text-[#101B35]">{leadingText}</span>
          <span> — {remainingText}</span>
        </>
      );
    }
  }

  return renderInlineText(item);
}

function StructuredTextBody({
  body,
  className = "",
}: {
  body: string;
  className?: string;
}) {
  const blocks = parseStructuredText(body);

  if (blocks.length === 0) return null;

  return (
    <div className={`max-w-3xl space-y-4 sm:space-y-5 ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === "list") {
          return (
            <ul
              className="space-y-3 py-1 text-[1rem] leading-7 text-[#3F4B5D] sm:text-[1.0625rem] sm:leading-8"
              key={`list-${index}`}
            >
              {block.items.map((item, itemIndex) => (
                <li className="flex gap-3" key={`${item}-${itemIndex}`}>
                  <span
                    aria-hidden="true"
                    className="mt-2.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full bg-[#E4EEFF]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#155EDB]" />
                  </span>
                  <span>{renderListItemText(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            className={
              block.isLeadIn
                ? "pt-1 text-[1.0625rem] font-semibold leading-7 text-[#111C35] sm:text-lg sm:leading-8"
                : block.isShortStatement
                  ? "border-l-2 border-[#1A62D7] pl-4 text-[1.0625rem] font-semibold leading-7 text-[#182744] sm:text-lg sm:leading-8"
                  : "text-[1rem] leading-7 text-[#3F4B5D] sm:text-[1.0625rem] sm:leading-8"
            }
            key={`paragraph-${index}`}
          >
            {renderInlineText(block.text)}
          </p>
        );
      })}
    </div>
  );
}

function WebinarTextContent({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[1.5rem] border border-[#E1E7F0] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.055)] sm:p-9">
      {title ? (
        <header className="mb-6 max-w-3xl sm:mb-7">
          <span aria-hidden="true" className="mb-3 block h-1 w-11 rounded-full bg-[#155EDB]" />
          <h3 className="text-xl font-bold tracking-[-0.025em] text-[#101B35] sm:text-2xl">{title}</h3>
        </header>
      ) : null}
      <StructuredTextBody body={body} />
    </article>
  );
}

function WebinarAccordion({ id, title, body }: { id: string; title: string; body: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = `webinar-accordion-${id}`;

  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-[#DEE6F1] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[#F7FAFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#155EDB] sm:px-6 sm:py-5"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span aria-hidden="true" className="h-8 w-1 shrink-0 rounded-full bg-[#155EDB]" />
        <span className="flex-1 text-base font-bold tracking-[-0.015em] text-[#101B35] sm:text-lg">
          {title || "More detail"}
        </span>
        <svg
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-[#155EDB] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
      {isOpen ? (
        <div className="border-t border-[#E4EAF3] bg-[#F8FAFE] px-5 py-5 sm:px-6 sm:py-6" id={contentId}>
          <StructuredTextBody body={body} />
        </div>
      ) : null}
    </section>
  );
}

function isVip(profile: UserProfile | null) {
  return (
    profile?.role === "admin" ||
    (profile?.subscription_tier === "vip" &&
      (profile.subscription_status === "active" || profile.subscription_status === "trial"))
  );
}

function carbohydrateInterpretation(carbohydrateGPerKg: number) {
  if (carbohydrateGPerKg < 3) {
    return "Low carbohydrate availability relative to many sporting demands";
  }
  if (carbohydrateGPerKg < 5) {
    return "Moderate carbohydrate intake";
  }
  if (carbohydrateGPerKg < 7) {
    return "High carbohydrate intake suited to substantial training demand";
  }
  return "Very high carbohydrate intake typically associated with high-volume endurance or multiple-session demands";
}

function calculatePerformanceNutritionAssessment(
  inputs: AssessmentFormInputs,
): PerformanceNutritionAssessmentResult {
  const age = Number(inputs.age);
  const heightCm = Number(inputs.heightCm);
  const weightKg = Number(inputs.weightKg);
  const sessionsPerWeek = Number(inputs.sessionsPerWeek);
  const activityScores: Record<string, number> = {
    seated: 0,
    light: 1,
    active: 2,
    "very-active": 3,
  };
  const durationScores: Record<string, number> = {
    "under-45": 0,
    "45-75": 1,
    "75-120": 2,
    "over-120": 3,
  };
  const intensityScores: Record<string, number> = {
    low: 0,
    moderate: 1,
    high: 2,
    "very-high": 3,
  };
  const sessionsScore = sessionsPerWeek <= 2 ? 0 : sessionsPerWeek <= 4 ? 1 : sessionsPerWeek <= 6 ? 2 : 3;
  const activityScore = activityScores[inputs.dailyActivity];
  const durationScore = durationScores[inputs.sessionDuration];
  const intensityScore = intensityScores[inputs.intensity];
  const totalActivityScore = activityScore + sessionsScore + durationScore + intensityScore;
  const activityBand =
    totalActivityScore <= 2
      ? { name: "Low", multiplier: 1.35 }
      : totalActivityScore <= 4
        ? { name: "Light", multiplier: 1.45 }
        : totalActivityScore <= 7
          ? { name: "Moderate", multiplier: 1.55 }
          : totalActivityScore <= 9
            ? { name: "High", multiplier: 1.7 }
            : { name: "Very high", multiplier: 1.85 };
  const rmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (inputs.sex === "male" ? 5 : -161);
  const estimatedTdee = rmr * activityBand.multiplier;
  const goalSettings: Record<string, { adjustment: number; label: string; proteinFactor: number }> = {
    maintain: { adjustment: 0, label: "0% (performance / maintain)", proteinFactor: 1.8 },
    "fat-loss": { adjustment: -0.15, label: "-15% (fat loss)", proteinFactor: 2.2 },
    "muscle-gain": { adjustment: 0.08, label: "+8% (muscle gain)", proteinFactor: 2 },
  };
  const goal = goalSettings[inputs.goal];
  const suggestedCalories = Math.round((estimatedTdee * (1 + goal.adjustment)) / 10) * 10;
  const proteinG = Math.round(weightKg * goal.proteinFactor);
  const fatG = Math.round(weightKg * 0.8);
  const remainingCalories = suggestedCalories - proteinG * 4 - fatG * 9;
  const carbohydrateWarning = remainingCalories < 0;
  const carbohydrateG = carbohydrateWarning ? 0 : Math.round(remainingCalories / 4);
  const carbohydrateGPerKg = Number((carbohydrateG / weightKg).toFixed(1));
  const rapidRecovery =
    inputs.multipleSessions === "frequently" ||
    (inputs.multipleSessions === "sometimes" && (inputs.intensity === "high" || inputs.intensity === "very-high"));
  const postWorkoutCarbohydrateMinGPerKg = rapidRecovery ? 1 : 0.5;
  const postWorkoutCarbohydrateMaxGPerKg = rapidRecovery ? 1.2 : 1;
  let hydrationGuidance =
    inputs.sweatProfile === "heavy"
      ? "A more deliberate fluid and sodium strategy is likely warranted. Consider measuring sweat rate."
      : inputs.sweatProfile === "very-heavy"
        ? "Sweat-rate and sodium-loss assessment would materially improve the precision of your hydration plan."
        : "Rehydrate according to thirst, measured losses and the time available before the next session.";

  if (inputs.trainingEnvironment === "hot-humid") {
    hydrationGuidance += " Heat and humidity can substantially increase fluid and sodium losses.";
  }

  return {
    inputs: {
      sex: inputs.sex,
      age,
      heightCm,
      weightKg,
      goal: inputs.goal,
      dailyActivity: inputs.dailyActivity,
      sessionsPerWeek,
      sessionDuration: inputs.sessionDuration,
      intensity: inputs.intensity,
      multipleSessions: inputs.multipleSessions,
      dietType: inputs.dietType,
      sweatProfile: inputs.sweatProfile,
      trainingEnvironment: inputs.trainingEnvironment,
    },
    calories: {
      rmr: Math.round(rmr),
      activityScore: totalActivityScore,
      activityBand: activityBand.name,
      multiplier: activityBand.multiplier,
      estimatedTdee: Math.round(estimatedTdee),
      goalAdjustment: goal.adjustment,
      goalAdjustmentLabel: goal.label,
      suggestedCalories,
    },
    macros: {
      proteinG,
      proteinGPerKg: goal.proteinFactor,
      carbohydrateG,
      carbohydrateGPerKg,
      carbohydrateInterpretation: carbohydrateInterpretation(carbohydrateGPerKg),
      carbohydrateWarning,
      fatG,
      fatGPerKg: 0.8,
      proteinPerMealMinG: Math.round(weightKg * 0.3),
      proteinPerMealMaxG: Math.round(weightKg * 0.4),
    },
    aminoAcids: {
      dailyLeucineMinG: 10,
      dailyLeucineMaxG: 12,
      leucinePerMealMinG: 2.5,
      leucinePerMealMaxG: 3,
      postWorkoutLeucineG: 3,
      estimatedBcaaMinG: 15,
      estimatedBcaaMaxG: 20,
    },
    referenceTargets: {
      fibreG: Math.round((suggestedCalories / 1000) * 14),
      calciumMg: age >= 71 ? 1200 : 1000,
      ironMg: inputs.sex === "male" || age >= 51 ? 8 : 18,
      vitaminDMcg: age >= 71 ? 20 : 15,
      vitaminDIu: age >= 71 ? 800 : 600,
      magnesiumMg: inputs.sex === "male" ? (age <= 30 ? 400 : 420) : age <= 30 ? 310 : 320,
      potassiumMg: inputs.sex === "male" ? 3400 : 2600,
      plantBasedIronNote: inputs.dietType === "vegetarian" || inputs.dietType === "vegan",
      veganB12Note: inputs.dietType === "vegan",
    },
    postWorkout: {
      proteinG: Math.round(weightKg * 0.3),
      leucineG: 3,
      carbohydrateLabel: rapidRecovery
        ? "Rapid recovery target"
        : "Post-workout carbohydrate",
      carbohydrateMinGPerKg: postWorkoutCarbohydrateMinGPerKg,
      carbohydrateMaxGPerKg: postWorkoutCarbohydrateMaxGPerKg,
      carbohydrateMinG: Math.round(weightKg * postWorkoutCarbohydrateMinGPerKg),
      carbohydrateMaxG: Math.round(weightKg * postWorkoutCarbohydrateMaxGPerKg),
      hydrationGuidance,
    },
  };
}

export default function VipWebinarDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [webinar, setWebinar] = useState<DatabaseRecord | null>(null);
  const [sections, setSections] = useState<DatabaseRecord[]>([]);
  const [contentBlocks, setContentBlocks] = useState<DatabaseRecord[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<DatabaseRecord[]>([]);
  const [completedSectionIds, setCompletedSectionIds] = useState<string[]>([]);
  const [activeQuizSectionId, setActiveQuizSectionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [incorrectQuestionIds, setIncorrectQuestionIds] = useState<string[]>([]);
  const [quizResultMessage, setQuizResultMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPerformanceNutritionAssessment, setShowPerformanceNutritionAssessment] = useState(false);
  const [assessmentInputs, setAssessmentInputs] = useState<AssessmentFormInputs>(initialAssessmentInputs);
  const [assessmentResult, setAssessmentResult] = useState<PerformanceNutritionAssessmentResult | null>(null);
  const [assessmentError, setAssessmentError] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfEmailStatus, setPdfEmailStatus] = useState<PdfEmailStatus>("idle");
  const [pdfEmailAddress, setPdfEmailAddress] = useState("");
  const autoEmailAttemptKeyRef = useRef<string | null>(null);

  const slug = params.slug;
  const isDevelopmentPreview =
    process.env.NODE_ENV === "development" && slug === PERFORMANCE_NUTRITION_WEBINAR_SLUG;

  useEffect(() => {
    let isMounted = true;

    async function loadWebinar() {
      setIsLoading(true);
      setErrorMessage("");
      setAccessDenied(false);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        if (isMounted) {
          setErrorMessage(sessionError.message);
          setIsLoading(false);
        }
        return;
      }

      const session = sessionData.session;

      if (!session) {
        const redirectPath = `/vip-webinars/${encodeURIComponent(slug)}`;
        router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }

      const webinarQuery = supabase.from("vip_webinars").select("*").eq("slug", slug);
      const { data: webinarData, error: webinarError } = isDevelopmentPreview
        ? await webinarQuery.single()
        : await webinarQuery.eq("is_published", true).single();

      if (!isMounted) {
        return;
      }

      if (webinarError || !webinarData) {
        setErrorMessage(webinarError?.message || "VIP webinar not found.");
        setIsLoading(false);
        return;
      }

      const accessTier = readString(webinarData, ["access_tier"]).toLowerCase();

      if (accessTier !== "free") {
        const { data: profileData, error: profileError } = await supabase
          .from("User")
          .select("role,subscription_tier,subscription_status")
          .eq("id", session.user.id)
          .single();

        if (!isMounted) {
          return;
        }

        if (profileError) {
          setErrorMessage(profileError.message);
          setIsLoading(false);
          return;
        }

        if (!isVip(profileData)) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }
      }

      const webinarId = webinarRecordId(webinarData);

      const sectionResult = await supabase
        .from("vip_webinar_sections")
        .select("*")
        .eq("webinar_id", webinarId);

      if (!isMounted) {
        return;
      }

      if (sectionResult.error) {
        setErrorMessage(sectionResult.error.message);
        setIsLoading(false);
        return;
      }

      const loadedSections = sortByPosition(Array.isArray(sectionResult.data) ? sectionResult.data : []);
      const sectionIds = loadedSections.map(sectionRecordId).filter(Boolean);

      const [blockResult, quizResult, progressResult] = await Promise.all([
        sectionIds.length > 0
          ? supabase.from("vip_webinar_section_content").select("*").in("section_id", sectionIds)
          : Promise.resolve({ data: [], error: null }),
        sectionIds.length > 0
          ? supabase.from("vip_webinar_quiz_questions").select("*").in("section_id", sectionIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("vip_webinar_user_progress")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("webinar_id", webinarId)
          .maybeSingle(),
      ]);

      if (!isMounted) {
        return;
      }

      if (blockResult.error) {
        setErrorMessage(blockResult.error.message);
        setIsLoading(false);
        return;
      }

      if (quizResult.error) {
        setErrorMessage(quizResult.error.message);
        setIsLoading(false);
        return;
      }

      if (progressResult.error) {
        setErrorMessage(progressResult.error.message);
        setIsLoading(false);
        return;
      }

      setWebinar(webinarData);
      setSections(loadedSections);
      setContentBlocks(sortByPosition(Array.isArray(blockResult.data) ? blockResult.data : []));
      setQuizQuestions(sortByPosition(Array.isArray(quizResult.data) ? quizResult.data : []));
      setCompletedSectionIds(
        readArray(progressResult.data, ["completed_section_ids", "completed_sections", "section_ids"]),
      );
      setIsLoading(false);
    }

    loadWebinar();

    return () => {
      isMounted = false;
    };
  }, [isDevelopmentPreview, router, slug, supabase]);

  const activeQuizSection = sections.find((section) => sectionRecordId(section) === activeQuizSectionId) || null;
  const activeQuizQuestions = activeQuizSectionId
    ? quizQuestions.filter((question) => readString(question, ["section_id"]) === activeQuizSectionId)
    : [];
  const webinarId = webinar ? webinarRecordId(webinar) : "";

  async function persistProgress(nextCompletedIds: string[]) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId || !webinarId) {
      return;
    }

    const { error } = await supabase.from("vip_webinar_user_progress").upsert({
      user_id: userId,
      webinar_id: webinarId,
      completed_section_ids: nextCompletedIds,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn("VIP webinar progress save failed:", error.message);
    }
  }

  function openQuiz(sectionId: string) {
    const sectionQuestions = quizQuestions.filter((question) => readString(question, ["section_id"]) === sectionId);
    const nextAnswers = Object.fromEntries(sectionQuestions.map((question) => [recordId(question), ""]));
    setAnswers(nextAnswers);
    setIncorrectQuestionIds([]);
    setQuizResultMessage("");
    setActiveQuizSectionId(sectionId);
  }

  function closeQuiz() {
    setActiveQuizSectionId(null);
    setAnswers({});
    setIncorrectQuestionIds([]);
    setQuizResultMessage("");
  }

  function updateAnswer(questionId: string, answer: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: answer,
    }));
    setIncorrectQuestionIds((current) => current.filter((id) => id !== questionId));
    setQuizResultMessage("");
  }

  async function completeQuiz() {
    if (!activeQuizSectionId) {
      return;
    }

    const incorrectIds = activeQuizQuestions.flatMap((question) => {
      const options = readArray(question, ["options", "choices", "answers"]);
      const correctAnswer = readString(question, ["correct_answer"]);
      const selectedAnswer = answers[recordId(question)]?.trim() || "";

      if (options.length === 0 || !correctAnswer || selectedAnswer === correctAnswer.trim()) {
        return [];
      }

      return [recordId(question)];
    });

    if (incorrectIds.length > 0) {
      setIncorrectQuestionIds(incorrectIds);
      setQuizResultMessage("Not quite — review the highlighted answers and try again.");
      return;
    }

    const nextCompletedIds = completedSectionIds.includes(activeQuizSectionId)
      ? completedSectionIds
      : [...completedSectionIds, activeQuizSectionId];

    setCompletedSectionIds(nextCompletedIds);
    closeQuiz();
    await persistProgress(nextCompletedIds);

    if (nextCompletedIds.length >= sections.length && sections.length > 0) {
      if (slug === PERFORMANCE_NUTRITION_WEBINAR_SLUG) {
        setAssessmentResult(null);
        setAssessmentError("");
        setPdfError("");
        setShowPerformanceNutritionAssessment(true);
      } else {
        setShowSuccess(true);
        window.setTimeout(() => {
          router.push("/vip-webinars");
        }, 1800);
      }
    }
  }

  function updateAssessmentInput(field: keyof AssessmentFormInputs, value: string) {
    setAssessmentInputs((current) => ({ ...current, [field]: value }));
  }

  function submitAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const age = Number(assessmentInputs.age);
    const heightCm = Number(assessmentInputs.heightCm);
    const weightKg = Number(assessmentInputs.weightKg);
    const sessionsPerWeek = Number(assessmentInputs.sessionsPerWeek);
    const selections = [
      assessmentInputs.sex,
      assessmentInputs.goal,
      assessmentInputs.dailyActivity,
      assessmentInputs.sessionDuration,
      assessmentInputs.intensity,
      assessmentInputs.multipleSessions,
      assessmentInputs.dietType,
      assessmentInputs.sweatProfile,
      assessmentInputs.trainingEnvironment,
    ];

    if (
      selections.some((value) => !value) ||
      !Number.isFinite(age) ||
      age < 18 ||
      age > 80 ||
      !Number.isFinite(heightCm) ||
      heightCm < 130 ||
      heightCm > 220 ||
      !Number.isFinite(weightKg) ||
      weightKg < 35 ||
      weightKg > 250 ||
      !Number.isInteger(sessionsPerWeek) ||
      sessionsPerWeek < 0 ||
      sessionsPerWeek > 14
    ) {
      setAssessmentError("Please complete every field using the stated ranges.");
      return;
    }

    setAssessmentError("");
    setPdfError("");
    setPdfEmailStatus("idle");
    setPdfEmailAddress("");
    setAssessmentResult(calculatePerformanceNutritionAssessment(assessmentInputs));
  }

  async function downloadAssessmentPdf() {
    if (!assessmentResult || isGeneratingPdf) {
      return;
    }

    setIsGeneratingPdf(true);
    setPdfError("");

    try {
      const { downloadPerformanceNutritionPdf } = await import("../../../lib/performanceNutritionPdf");
      downloadPerformanceNutritionPdf(assessmentResult);
    } catch (error) {
      console.error("Performance nutrition PDF generation failed:", error);
      setPdfError("We couldn't create your PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const sendAssessmentPdfEmail = useCallback(
    async (result: PerformanceNutritionAssessmentResult) => {
      setPdfEmailStatus("sending");
      setPdfEmailAddress("");

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
          throw new Error("Missing authenticated session.");
        }

        const response = await fetch("/api/performance-nutrition-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + accessToken,
          },
          body: JSON.stringify({ assessmentResult: result }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { success?: unknown; email?: unknown }
          | null;

        if (!response.ok || payload?.success !== true || typeof payload.email !== "string") {
          throw new Error("PDF email request failed.");
        }

        setPdfEmailAddress(payload.email);
        setPdfEmailStatus("sent");
      } catch (error) {
        console.error(
          "Performance nutrition PDF email request failed:",
          error instanceof Error ? error.message : "Unknown error",
        );
        setPdfEmailStatus("failed");
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!assessmentResult || slug !== PERFORMANCE_NUTRITION_WEBINAR_SLUG) {
      return;
    }

    const resultKey = assessmentResultKey(assessmentResult);

    if (
      autoEmailAttemptKeyRef.current === resultKey ||
      automaticallyEmailedAssessmentKeys.has(resultKey)
    ) {
      return;
    }

    autoEmailAttemptKeyRef.current = resultKey;
    automaticallyEmailedAssessmentKeys.add(resultKey);
    void sendAssessmentPdfEmail(assessmentResult);
  }, [assessmentResult, sendAssessmentPdfEmail, slug]);

  const canSubmitQuiz =
    activeQuizQuestions.length === 0 ||
    activeQuizQuestions.every((question) => answers[recordId(question)]?.trim());

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-4 py-8 text-[#111827] sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-5xl">
        <Link href="/vip-webinars" className="text-sm font-bold text-[#1157D8] transition hover:text-[#0A39A8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1157D8]">
          Back to VIP Webinars
        </Link>

        {isLoading ? (
          <p className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-6 text-sm font-semibold text-[#4B5563] shadow-sm">
            Loading webinar...
          </p>
        ) : accessDenied ? (
          <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-[0_22px_64px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">VIP access required</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#0B1220]">
              This webinar is for VIP members
            </h1>
            <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-[#4B5563]">
              Upgrade to a VIP membership or contact support if you believe your account should have access.
            </p>
          </div>
        ) : errorMessage ? (
          <p className="mt-8 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </p>
        ) : webinar ? (
          <>
            <div className="mt-8 rounded-[2rem] border border-[#E1E7F0] bg-white p-6 shadow-[0_22px_64px_rgba(15,23,42,0.08)] sm:p-10">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">VIP Webinar</p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#0B1220] sm:text-5xl">
                {readString(webinar, ["title", "name"]) || "VIP Webinar"}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-[#4B5563] sm:text-[1.0625rem] sm:leading-8">
                {readString(webinar, ["description", "summary", "intro"]) ||
                  "Work through each section, complete the quiz, and unlock the full education session."}
              </p>
            </div>

            {sections.length === 0 ? (
              <div className="mt-6 rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-[#0B1220]">No sections available</h2>
                <p className="mt-3 text-base font-medium leading-7 text-[#4B5563]">
                  This webinar has been published, but the section content is not available yet.
                </p>
              </div>
            ) : (
              <div className="mt-7 grid gap-7 sm:mt-9 sm:gap-9">
                {sections.map((section, sectionIndex) => {
                  const sectionId = sectionRecordId(section);
                  const sectionTitle = readString(section, ["title", "name"]);
                  const sectionBlocks = contentBlocks.filter((block) => readString(block, ["section_id"]) === sectionId);
                  const isComplete = completedSectionIds.includes(sectionId);
                  const canOpenSection =
                    sectionIndex === 0 || completedSectionIds.includes(sectionRecordId(sections[sectionIndex - 1]));

                  return (
                    <article
                      key={sectionId}
                      className={`relative overflow-hidden rounded-[1.75rem] border p-5 shadow-[0_18px_54px_rgba(15,23,42,0.07)] sm:p-8 ${
                        isComplete
                          ? "border-[#CFE8DA] bg-[#FCFFFD]"
                          : canOpenSection
                            ? "border-[#D8E4F5] bg-white"
                            : "border-[#E1E7F0] bg-[#F8FAFC]"
                      }`}
                    >
                      <div
                        aria-hidden={!canOpenSection}
                        className={canOpenSection ? "" : "pointer-events-none select-none opacity-50"}
                        inert={!canOpenSection || undefined}
                      >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                            Section {sectionIndex + 1} of {sections.length}
                          </p>
                          <span aria-hidden="true" className="mt-3 block h-1 w-11 rounded-full bg-[#155EDB]" />
                          <h2 className="mt-4 text-2xl font-bold tracking-[-0.03em] text-[#101B35] sm:text-3xl">
                            {sectionTitle || `Section ${sectionIndex + 1}`}
                          </h2>
                          {readString(section, ["description", "summary"]) && (
                            <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-[#4B5563] sm:text-[1.0625rem] sm:leading-8">
                              {readString(section, ["description", "summary"])}
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-[#EAF2FF] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                          {isComplete ? "Complete" : canOpenSection ? "Open" : "Locked"}
                        </span>
                      </div>

                      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#E8EDF5]" aria-hidden="true">
                        <div
                          className={`h-full rounded-full ${
                            isComplete ? "bg-[#2E9C64]" : canOpenSection ? "bg-[#155EDB]" : "bg-transparent"
                          }`}
                          style={{ width: isComplete ? "100%" : canOpenSection ? "44%" : "0%" }}
                        />
                      </div>

                      <div className="mt-7 grid gap-5">
                        {sectionBlocks.length === 0 ? (
                          <p className="rounded-2xl bg-[#F8FAFC] px-4 py-5 text-sm font-semibold text-[#4B5563]">
                            Content for this section is coming soon.
                          </p>
                        ) : (
                          sectionBlocks.map((block) => {
                            const blockId = recordId(block);
                            const blockTitle = contentTitle(block);
                            const blockBody = contentText(block);
                            const contentType = readString(block, ["content_type", "type"]).toLowerCase();
                            const mediaUrl = readString(block, ["media_url", "video_url", "embed_url"]);
                            const nestedDropdownItems = dropdownItems(block);
                            const showMediaTitle =
                              Boolean(blockTitle) && (contentType !== "image" || !titlesMatch(blockTitle, sectionTitle));

                            if ((contentType === "image" || contentType === "infographic") && mediaUrl) {
                              return (
                                <div
                                  key={blockId}
                                  className="rounded-[1.5rem] border border-[#E1E7F0] bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.055)] sm:p-5"
                                >
                                  {showMediaTitle && (
                                    <h3 className="text-base font-bold tracking-[-0.015em] text-[#101B35] sm:text-lg">{blockTitle}</h3>
                                  )}
                                  <div
                                    className={`relative aspect-[16/9] w-full overflow-hidden rounded-[1.25rem] bg-[#F2F5FA] ${
                                      showMediaTitle ? "mt-4" : ""
                                    }`}
                                  >
                                    <Image
                                      src={mediaUrl}
                                      alt={blockTitle || "VIP webinar media"}
                                      fill
                                      unoptimized
                                      sizes="(min-width: 1024px) 896px, calc(100vw - 64px)"
                                      className={contentType === "infographic" ? "object-contain" : "object-cover"}
                                    />
                                  </div>
                                </div>
                              );
                            }

                            if (contentType === "image" || contentType === "infographic") {
                              return (
                                <div
                                  key={blockId}
                                  className="rounded-[1.5rem] border border-[#E1E7F0] bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.055)] sm:p-5"
                                >
                                  <div className="flex aspect-[16/9] w-full items-center justify-center rounded-[1.25rem] bg-[#070B14] px-5 text-center">
                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">
                                        {contentType} placeholder
                                      </p>
                                      {showMediaTitle && <h3 className="mt-2 text-lg font-bold text-white">{blockTitle}</h3>}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            if (contentType === "video" && mediaUrl) {
                              return (
                                <div
                                  key={blockId}
                                  className="rounded-[1.5rem] border border-[#E1E7F0] bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.055)] sm:p-5"
                                >
                                  {blockTitle && (
                                    <h3 className="text-base font-bold tracking-[-0.015em] text-[#101B35] sm:text-lg">{blockTitle}</h3>
                                  )}
                                  <div className="mt-4 aspect-[16/9] w-full overflow-hidden rounded-[1.25rem] bg-[#0B1220]">
                                    <video
                                      src={mediaUrl}
                                      controls
                                      className="h-full w-full object-cover"
                                    >
                                      <track kind="captions" />
                                    </video>
                                  </div>
                                  {blockBody && (
                                    <div className="pt-5">
                                      <StructuredTextBody body={blockBody} />
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            if (contentType === "video") {
                              return (
                                <div
                                  key={blockId}
                                  className="rounded-[1.5rem] border border-[#E1E7F0] bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.055)] sm:p-5"
                                >
                                  <div className="flex aspect-[16/9] w-full items-center justify-center rounded-[1.25rem] bg-[#070B14] px-5 text-center">
                                    <div>
                                      <svg aria-hidden="true" className="mx-auto h-7 w-7 text-[#8EA4C8]" fill="none" viewBox="0 0 24 24">
                                        <rect height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" width="18" x="3" y="5" />
                                        <path d="m10 9 5 3-5 3V9Z" fill="currentColor" />
                                      </svg>
                                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">
                                        VIDEO PLACEHOLDER
                                      </p>
                                      {blockTitle && <h3 className="mt-2 text-lg font-bold text-white">{blockTitle}</h3>}
                                      <p className="mt-2 text-sm font-medium text-[#B5C1D4]">Video coming soon</p>
                                    </div>
                                  </div>
                                  {blockBody && (
                                    <div className="pt-5">
                                      <StructuredTextBody body={blockBody} />
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            if (contentType === "dropdown") {
                              if (nestedDropdownItems.length > 0) {
                                return (
                                  <div className="grid gap-4" key={blockId}>
                                    {nestedDropdownItems.map((item, itemIndex) => (
                                      <WebinarAccordion
                                        body={item.body}
                                        id={`${blockId}-${item.id}-${itemIndex}`}
                                        key={`${item.id}-${itemIndex}`}
                                        title={item.title}
                                      />
                                    ))}
                                  </div>
                                );
                              }

                              return (
                                <WebinarAccordion
                                  body={blockBody}
                                  key={blockId}
                                  id={blockId}
                                  title={blockTitle}
                                />
                              );
                            }

                            if (contentType === "text") {
                              return <WebinarTextContent key={blockId} title={blockTitle} body={blockBody} />;
                            }

                            return (
                              <div key={blockId} className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                                {blockTitle && <h3 className="text-lg font-bold text-[#0B1220]">{blockTitle}</h3>}
                                {blockBody && (
                                  <p className="mt-3 whitespace-pre-line text-base font-medium leading-7 text-[#4B5563]">
                                    {blockBody}
                                  </p>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => openQuiz(sectionId)}
                        disabled={!canOpenSection}
                        className="mt-7 h-12 rounded-xl bg-[#1157D8] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(17,87,216,0.22)] transition hover:bg-[#0A39A8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1157D8] disabled:cursor-not-allowed disabled:bg-[#9CA3AF] disabled:shadow-none"
                      >
                        Take quiz
                      </button>
                      </div>
                      {!canOpenSection ? (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 p-5 backdrop-blur-[1px]">
                          <div className="max-w-sm rounded-2xl border border-[#D7E3F4] bg-white/95 p-5 text-center shadow-[0_14px_36px_rgba(15,23,42,0.1)] sm:p-6">
                            <span aria-hidden="true" className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF2FF] text-[#155EDB]">
                              <svg fill="none" viewBox="0 0 24 24" className="h-5 w-5">
                                <rect height="10" rx="2" stroke="currentColor" strokeWidth="1.8" width="14" x="5" y="10" />
                                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                              </svg>
                            </span>
                            <p className="mt-3 text-base font-bold text-[#101B35]">Locked until quiz is passed</p>
                            <p className="mt-2 text-sm font-medium leading-6 text-[#526174]">
                              Complete and pass the previous section knowledge check to unlock this section.
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </section>

      {activeQuizSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/55 px-4 py-5 backdrop-blur-[2px] sm:px-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-[#D9E4F4] bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">Knowledge check</p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.025em] text-[#101B35] sm:text-3xl">
              {readString(activeQuizSection, ["title", "name"]) || "Section quiz"}
            </h2>

            {activeQuizQuestions.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-[#E1E7F0] bg-[#F8FAFC] px-4 py-5 text-sm font-semibold text-[#4B5563]">
                This section does not have quiz questions yet. You can mark it complete.
              </p>
            ) : (
              <div className="mt-6 grid gap-5">
                {activeQuizQuestions.map((question, questionIndex) => {
                  const questionId = recordId(question);
                  const options = readArray(question, ["options", "choices", "answers"]);
                  const hasIncorrectAnswer = incorrectQuestionIds.includes(questionId);

                  return (
                    <div
                      key={questionId}
                      className={`rounded-[1.25rem] border p-5 ${
                        hasIncorrectAnswer ? "border-[#F1B6B3] bg-[#FFF7F6]" : "border-[#DDE6F2] bg-[#FAFCFF]"
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#155EDB]">
                        Question {questionIndex + 1} of {activeQuizQuestions.length}
                      </p>
                      <p className="mt-2 text-base font-bold leading-7 text-[#101B35] sm:text-lg">
                        {readString(question, ["question_text", "question", "prompt", "title"])}
                      </p>

                      {options.length > 0 ? (
                        <div className="mt-5 grid gap-3">
                          {options.map((option) => {
                            const selectedAnswerIsIncorrect = hasIncorrectAnswer && answers[questionId] === option;

                            return (
                              <label
                                key={option}
                                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#155EDB] ${
                                  selectedAnswerIsIncorrect
                                    ? "border-[#DC7772] bg-[#FFF0EF] text-[#9F2F2A]"
                                    : answers[questionId] === option
                                      ? "border-[#78A8F5] bg-[#EEF5FF] text-[#102248]"
                                      : "border-[#DDE5F0] bg-white text-[#374151] hover:border-[#9EBCEB] hover:bg-[#F8FBFF]"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={questionId}
                                  value={option}
                                  checked={answers[questionId] === option}
                                  onChange={(event) => updateAnswer(questionId, event.target.value)}
                                />
                                {option}
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <textarea
                          value={answers[questionId] || ""}
                          onChange={(event) => updateAnswer(questionId, event.target.value)}
                          className="mt-5 min-h-28 w-full rounded-xl border border-[#DDE5F0] bg-white px-4 py-3 text-sm font-medium text-[#111827] outline-none transition focus:border-[#1157D8] focus:ring-4 focus:ring-[#1157D8]/10"
                          placeholder="Your answer"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {quizResultMessage && (
              <p aria-live="polite" className="mt-6 rounded-xl border border-[#F0B8B4] bg-[#FFF4F3] px-4 py-3 text-sm font-semibold leading-6 text-[#9F2F2A]">
                {quizResultMessage}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeQuiz}
                className="h-12 rounded-xl border border-[#D8E1EE] bg-white px-5 text-sm font-bold text-[#27364D] transition hover:border-[#1157D8] hover:text-[#1157D8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1157D8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={completeQuiz}
                disabled={!canSubmitQuiz}
                className="h-12 rounded-xl bg-[#1157D8] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(17,87,216,0.2)] transition hover:bg-[#0A39A8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1157D8] disabled:cursor-not-allowed disabled:bg-[#9CA3AF] disabled:shadow-none"
              >
                Check answers
              </button>
            </div>
          </div>
        </div>
      )}

      {showPerformanceNutritionAssessment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0B1220]/45 px-5 py-6 sm:py-10">
          <div className="mx-auto w-full max-w-4xl rounded-[2rem] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
            {!assessmentResult ? (
              <form onSubmit={submitAssessment} className="overflow-hidden">
                <div className="bg-[linear-gradient(135deg,#FFFFFF_0%,#EEF4FF_72%,#F7FAFC_100%)] p-6 sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1157D8]">Performance Nutrition</p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
                    Build Your Performance Nutrition Starting Point
                  </h2>
                  <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-[#4B5563]">
                    Answer a few questions and receive evidence-based starting targets for calories, macros, protein
                    quality and post-workout nutrition.
                  </p>
                  <p className="mt-4 rounded-2xl border border-[#D8E1F0] bg-white/80 px-4 py-3 text-sm font-semibold leading-6 text-[#475569]">
                    This is a starting point, not an individual clinical or performance nutrition prescription.
                  </p>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="text-sm font-bold text-[#0B1220]">
                      Sex
                      <select
                        required
                        value={assessmentInputs.sex}
                        onChange={(event) => updateAssessmentInput("sex", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base font-medium text-[#0B1220] outline-none focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </label>
                    <label className="text-sm font-bold text-[#0B1220]">
                      Age
                      <input
                        required
                        min="18"
                        max="80"
                        step="1"
                        type="number"
                        value={assessmentInputs.age}
                        onChange={(event) => updateAssessmentInput("age", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base font-medium text-[#0B1220] outline-none focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                      />
                    </label>
                    <label className="text-sm font-bold text-[#0B1220]">
                      Height (cm)
                      <input
                        required
                        min="130"
                        max="220"
                        step="0.1"
                        type="number"
                        value={assessmentInputs.heightCm}
                        onChange={(event) => updateAssessmentInput("heightCm", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base font-medium text-[#0B1220] outline-none focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                      />
                    </label>
                    <label className="text-sm font-bold text-[#0B1220]">
                      Body weight (kg)
                      <input
                        required
                        min="35"
                        max="250"
                        step="0.1"
                        type="number"
                        value={assessmentInputs.weightKg}
                        onChange={(event) => updateAssessmentInput("weightKg", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base font-medium text-[#0B1220] outline-none focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                      />
                    </label>
                    <label className="text-sm font-bold text-[#0B1220]">
                      Primary goal
                      <select
                        required
                        value={assessmentInputs.goal}
                        onChange={(event) => updateAssessmentInput("goal", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base font-medium text-[#0B1220] outline-none focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                      >
                        <option value="">Select</option>
                        <option value="maintain">Performance / maintain</option>
                        <option value="fat-loss">Fat loss</option>
                        <option value="muscle-gain">Muscle gain</option>
                      </select>
                    </label>
                    <label className="text-sm font-bold text-[#0B1220]">
                      Daily activity / job
                      <select
                        required
                        value={assessmentInputs.dailyActivity}
                        onChange={(event) => updateAssessmentInput("dailyActivity", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base font-medium text-[#0B1220] outline-none focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                      >
                        <option value="">Select</option>
                        <option value="seated">Mostly seated</option>
                        <option value="light">Lightly active</option>
                        <option value="active">Active / on feet</option>
                        <option value="very-active">Very active / physical job</option>
                      </select>
                    </label>
                    <label className="text-sm font-bold text-[#0B1220]">
                      Training sessions per week
                      <input
                        required
                        min="0"
                        max="14"
                        step="1"
                        type="number"
                        value={assessmentInputs.sessionsPerWeek}
                        onChange={(event) => updateAssessmentInput("sessionsPerWeek", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base font-medium text-[#0B1220] outline-none focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                      />
                    </label>
                    <label className="text-sm font-bold text-[#0B1220]">
                      Average session duration
                      <select
                        required
                        value={assessmentInputs.sessionDuration}
                        onChange={(event) => updateAssessmentInput("sessionDuration", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base font-medium text-[#0B1220] outline-none focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                      >
                        <option value="">Select</option>
                        <option value="under-45">Under 45 minutes</option>
                        <option value="45-75">45–75 minutes</option>
                        <option value="75-120">75–120 minutes</option>
                        <option value="over-120">Over 120 minutes</option>
                      </select>
                    </label>
                    <label className="text-sm font-bold text-[#0B1220]">
                      Typical training intensity
                      <select
                        required
                        value={assessmentInputs.intensity}
                        onChange={(event) => updateAssessmentInput("intensity", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base font-medium text-[#0B1220] outline-none focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                      >
                        <option value="">Select</option>
                        <option value="low">Low</option>
                        <option value="moderate">Moderate</option>
                        <option value="high">High</option>
                        <option value="very-high">Very high</option>
                      </select>
                    </label>
                    <label className="text-sm font-bold text-[#0B1220]">
                      Multiple demanding sessions in one day?
                      <select
                        required
                        value={assessmentInputs.multipleSessions}
                        onChange={(event) => updateAssessmentInput("multipleSessions", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base font-medium text-[#0B1220] outline-none focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                      >
                        <option value="">Select</option>
                        <option value="no">No</option>
                        <option value="sometimes">Sometimes</option>
                        <option value="frequently">Frequently</option>
                      </select>
                    </label>
                    <label className="text-sm font-bold text-[#0B1220]">
                      Diet type
                      <select
                        required
                        value={assessmentInputs.dietType}
                        onChange={(event) => updateAssessmentInput("dietType", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base font-medium text-[#0B1220] outline-none focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                      >
                        <option value="">Select</option>
                        <option value="omnivore">Omnivore</option>
                        <option value="vegetarian">Vegetarian</option>
                        <option value="vegan">Vegan</option>
                      </select>
                    </label>
                    <label className="text-sm font-bold text-[#0B1220]">
                      Sweat profile
                      <select
                        required
                        value={assessmentInputs.sweatProfile}
                        onChange={(event) => updateAssessmentInput("sweatProfile", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base font-medium text-[#0B1220] outline-none focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                      >
                        <option value="">Select</option>
                        <option value="normal">Normal / unsure</option>
                        <option value="heavy">Heavy sweater</option>
                        <option value="very-heavy">Very heavy / salty sweater</option>
                      </select>
                    </label>
                    <label className="text-sm font-bold text-[#0B1220] sm:col-span-2">
                      Training environment
                      <select
                        required
                        value={assessmentInputs.trainingEnvironment}
                        onChange={(event) => updateAssessmentInput("trainingEnvironment", event.target.value)}
                        className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base font-medium text-[#0B1220] outline-none focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                      >
                        <option value="">Select</option>
                        <option value="cool-indoor">Mostly cool / indoor</option>
                        <option value="mixed">Mixed</option>
                        <option value="hot-humid">Frequently hot / humid</option>
                      </select>
                    </label>
                  </div>

                  {assessmentError && (
                    <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {assessmentError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="mt-6 h-12 w-full rounded-2xl bg-[#1157D8] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(17,87,216,0.22)] transition hover:bg-[#0A39A8]"
                  >
                    Build my starting point
                  </button>
                </div>
              </form>
            ) : (
              <div className="overflow-hidden">
                <div className="bg-[linear-gradient(135deg,#FFFFFF_0%,#EEF4FF_72%,#F7FAFC_100%)] p-6 sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1157D8]">Performance Nutrition</p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
                    Your Performance Nutrition Starting Point
                  </h2>
                  <p className="mt-4 text-base font-medium leading-7 text-[#4B5563]">
                    These values are evidence-based starting estimates generated from the information you entered.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfError("");
                      setPdfEmailStatus("idle");
                      setPdfEmailAddress("");
                      setAssessmentResult(null);
                    }}
                    className="mt-5 text-sm font-bold text-[#1157D8] transition hover:text-[#0A39A8]"
                  >
                    Update your answers
                  </button>
                </div>

                <div className="grid gap-5 p-6 sm:p-8">
                  <section className="rounded-2xl border border-[#D8E1F0] bg-[#F8FBFF] p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">Your Starting Energy Target</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="sm:col-span-2 lg:col-span-1">
                        <p className="text-3xl font-bold text-[#0B1220]">{assessmentResult.calories.suggestedCalories}</p>
                        <p className="text-sm font-semibold text-[#4B5563]">kcal/day</p>
                      </div>
                      <p className="text-sm font-medium leading-6 text-[#4B5563]">Estimated RMR<br /><strong className="text-[#0B1220]">{assessmentResult.calories.rmr} kcal</strong></p>
                      <p className="text-sm font-medium leading-6 text-[#4B5563]">Activity<br /><strong className="text-[#0B1220]">{assessmentResult.calories.activityBand} · {assessmentResult.calories.multiplier}</strong><br />Score {assessmentResult.calories.activityScore}/12</p>
                      <p className="text-sm font-medium leading-6 text-[#4B5563]">Estimated TDEE<br /><strong className="text-[#0B1220]">{assessmentResult.calories.estimatedTdee} kcal</strong></p>
                      <p className="text-sm font-medium leading-6 text-[#4B5563]">Goal adjustment<br /><strong className="text-[#0B1220]">{assessmentResult.calories.goalAdjustmentLabel}</strong></p>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">Your Daily Macros</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm font-medium text-[#4B5563]">Protein<br /><strong className="text-xl text-[#0B1220]">{assessmentResult.macros.proteinG} g</strong><br />{assessmentResult.macros.proteinGPerKg} g/kg</p>
                      <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm font-medium text-[#4B5563]">Carbohydrate<br /><strong className="text-xl text-[#0B1220]">{assessmentResult.macros.carbohydrateG} g</strong><br />{assessmentResult.macros.carbohydrateGPerKg} g/kg</p>
                      <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm font-medium text-[#4B5563]">Fat<br /><strong className="text-xl text-[#0B1220]">{assessmentResult.macros.fatG} g</strong><br />{assessmentResult.macros.fatGPerKg} g/kg</p>
                      <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm font-medium text-[#4B5563]">Protein per main feeding<br /><strong className="text-xl text-[#0B1220]">{assessmentResult.macros.proteinPerMealMinG}–{assessmentResult.macros.proteinPerMealMaxG} g</strong></p>
                    </div>
                    <p className="mt-4 text-sm font-medium leading-6 text-[#4B5563]">{assessmentResult.macros.carbohydrateInterpretation}. This is descriptive only and not a definitive individual target.</p>
                    {assessmentResult.macros.carbohydrateWarning && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">The calculated energy target is too low for the selected protein/fat framework and requires individual review.</p>}
                  </section>

                  <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">Protein Quality</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm font-medium text-[#4B5563]">
                      <p>Suggested daily leucine exposure<br /><strong className="text-xl text-[#0B1220]">{assessmentResult.aminoAcids.dailyLeucineMinG}–{assessmentResult.aminoAcids.dailyLeucineMaxG} g/day</strong></p>
                      <p>Leucine per main feeding<br /><strong className="text-xl text-[#0B1220]">{assessmentResult.aminoAcids.leucinePerMealMinG}–{assessmentResult.aminoAcids.leucinePerMealMaxG} g</strong></p>
                      <p>Post-workout leucine<br /><strong className="text-xl text-[#0B1220]">~{assessmentResult.aminoAcids.postWorkoutLeucineG} g</strong></p>
                      <p>Estimated BCAA exposure from a high-quality protein intake<br /><strong className="text-xl text-[#0B1220]">{assessmentResult.aminoAcids.estimatedBcaaMinG}–{assessmentResult.aminoAcids.estimatedBcaaMaxG} g/day</strong></p>
                    </div>
                    <p className="mt-4 text-sm font-medium leading-6 text-[#4B5563]">Adequate total high-quality protein remains the priority; isolated BCAA supplementation is usually lower priority when protein intake is already sufficient.</p>
                  </section>

                  <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">Selected Reference Nutrition Targets</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm font-medium text-[#4B5563]">
                      <p>Fibre <strong className="text-[#0B1220]">{assessmentResult.referenceTargets.fibreG} g/day</strong></p>
                      <p>Calcium <strong className="text-[#0B1220]">{assessmentResult.referenceTargets.calciumMg.toLocaleString()} mg/day</strong></p>
                      <p>Iron <strong className="text-[#0B1220]">{assessmentResult.referenceTargets.ironMg} mg/day</strong></p>
                      <p>Vitamin D <strong className="text-[#0B1220]">{assessmentResult.referenceTargets.vitaminDMcg} mcg / {assessmentResult.referenceTargets.vitaminDIu} IU/day</strong></p>
                      <p>Magnesium <strong className="text-[#0B1220]">{assessmentResult.referenceTargets.magnesiumMg} mg/day</strong></p>
                      <p>Potassium <strong className="text-[#0B1220]">{assessmentResult.referenceTargets.potassiumMg.toLocaleString()} mg/day</strong></p>
                    </div>
                    {assessmentResult.referenceTargets.plantBasedIronNote && <p className="mt-4 text-sm font-medium leading-6 text-[#4B5563]">Plant-based athletes may require additional attention to iron intake and bioavailability.</p>}
                    {assessmentResult.referenceTargets.veganB12Note && <p className="mt-2 text-sm font-medium leading-6 text-[#4B5563]">Vitamin B12 intake/status requires specific attention in vegan diets.</p>}
                  </section>

                  <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">Post-Workout Starting Point</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3 text-sm font-medium leading-6 text-[#4B5563]">
                      <p>Protein<br /><strong className="text-xl text-[#0B1220]">{assessmentResult.postWorkout.proteinG} g</strong></p>
                      <p>Leucine<br /><strong className="text-xl text-[#0B1220]">~{assessmentResult.postWorkout.leucineG} g</strong></p>
                      <p>{assessmentResult.postWorkout.carbohydrateLabel}<br /><strong className="text-xl text-[#0B1220]">{assessmentResult.postWorkout.carbohydrateMinG}–{assessmentResult.postWorkout.carbohydrateMaxG} g</strong><br />{assessmentResult.postWorkout.carbohydrateMinGPerKg.toFixed(1)}–{assessmentResult.postWorkout.carbohydrateMaxGPerKg.toFixed(1)} g/kg{assessmentResult.postWorkout.carbohydrateLabel === "Post-workout carbohydrate" && " as a practical starting meal range"}</p>
                    </div>
                    <p className="mt-4 text-sm font-medium leading-6 text-[#4B5563]">Total daily carbohydrate intake still matters. {assessmentResult.postWorkout.hydrationGuidance}</p>
                  </section>

                  <div className="rounded-2xl border border-[#D8E4F5] bg-[#F8FBFF] p-5">
                    {pdfError && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{pdfError}</p>}
                    {pdfEmailStatus === "sending" && (
                      <p aria-live="polite" className="mb-4 rounded-xl border border-[#D7E4F5] bg-white px-4 py-3 text-sm font-semibold text-[#35506F]">
                        Preparing and emailing your personalised PDF…
                      </p>
                    )}
                    {pdfEmailStatus === "sent" && (
                      <p aria-live="polite" className="mb-4 rounded-xl border border-[#BFE2CE] bg-[#F3FCF6] px-4 py-3 text-sm font-semibold text-[#17613C]">
                        Your personalised PDF has been emailed to {pdfEmailAddress}.
                      </p>
                    )}
                    {pdfEmailStatus === "failed" && (
                      <div className="mb-4 rounded-xl border border-[#F0C2BD] bg-[#FFF7F6] px-4 py-3">
                        <p aria-live="polite" className="text-sm font-semibold text-[#9F2F2A]">
                          We couldn’t email your PDF, but you can still download it below.
                        </p>
                        <button
                          type="button"
                          onClick={() => void sendAssessmentPdfEmail(assessmentResult)}
                          className="mt-3 text-sm font-bold text-[#1157D8] transition hover:text-[#0A39A8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1157D8]"
                        >
                          Retry Email
                        </button>
                      </div>
                    )}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={downloadAssessmentPdf}
                        disabled={isGeneratingPdf}
                        className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1157D8] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(17,87,216,0.22)] transition hover:bg-[#0A39A8] disabled:cursor-not-allowed disabled:bg-[#9CA3AF] disabled:shadow-none sm:w-auto"
                      >
                        {isGeneratingPdf ? "Preparing PDF..." : "Download My PDF"}
                      </button>
                      <a
                        href="https://www.elitepocketpt.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-12 w-full items-center justify-center rounded-xl border border-[#B9CCE8] bg-white px-5 text-sm font-bold text-[#174FAD] transition hover:border-[#155EDB] hover:bg-[#EEF5FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1157D8] sm:w-auto"
                      >
                        Learn More About Elite Pocket PT
                      </a>
                    </div>
                  </div>

                  <section className="rounded-2xl bg-[#0B1220] p-6 text-white">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9BC4FF]">Important Context</p>
                    <p className="mt-4 text-sm font-medium leading-7 text-[#D7E4FF]">These values are evidence-based starting estimates generated from the information you entered. Your actual requirements can change with training load, body composition, recovery, medical history, competition schedule, gastrointestinal tolerance and real-world response.</p>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/45 px-5">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">Complete</p>
            <h2 className="mt-4 text-3xl font-bold text-[#0B1220]">Webinar completed</h2>
            <p className="mt-3 text-base font-medium leading-7 text-[#4B5563]">
              Great work. Taking you back to the VIP webinar library.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
