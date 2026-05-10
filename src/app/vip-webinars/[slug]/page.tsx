"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../../lib/supabaseClient";

type DatabaseRecord = Record<string, unknown>;

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

function isVip(profile: UserProfile | null) {
  return (
    profile?.role === "admin" ||
    (profile?.subscription_tier === "vip" &&
      (profile.subscription_status === "active" || profile.subscription_status === "trial"))
  );
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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const slug = params.slug;

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

      const { data: webinarData, error: webinarError } = await supabase
        .from("vip_webinars")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (!isMounted) {
        return;
      }

      if (webinarError || !webinarData) {
        setErrorMessage(webinarError?.message || "VIP webinar not found.");
        setIsLoading(false);
        return;
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
  }, [router, slug, supabase]);

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
    setActiveQuizSectionId(sectionId);
  }

  async function completeQuiz() {
    if (!activeQuizSectionId) {
      return;
    }

    const nextCompletedIds = completedSectionIds.includes(activeQuizSectionId)
      ? completedSectionIds
      : [...completedSectionIds, activeQuizSectionId];

    setCompletedSectionIds(nextCompletedIds);
    setActiveQuizSectionId(null);
    setAnswers({});
    await persistProgress(nextCompletedIds);

    if (nextCompletedIds.length >= sections.length && sections.length > 0) {
      setShowSuccess(true);
      window.setTimeout(() => {
        router.push("/vip-webinars");
      }, 1800);
    }
  }

  const canSubmitQuiz =
    activeQuizQuestions.length === 0 ||
    activeQuizQuestions.every((question) => answers[recordId(question)]?.trim());

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-5 py-12 text-[#111827]">
      <section className="mx-auto w-full max-w-5xl">
        <Link href="/vip-webinars" className="text-sm font-bold text-[#1157D8] transition hover:text-[#0A39A8]">
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
            <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-[0_22px_64px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">VIP Webinar</p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#0B1220] sm:text-5xl">
                {readString(webinar, ["title", "name"]) || "VIP Webinar"}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-[#4B5563]">
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
              <div className="mt-6 grid gap-6">
                {sections.map((section, sectionIndex) => {
                  const sectionId = sectionRecordId(section);
                  const sectionBlocks = contentBlocks.filter((block) => readString(block, ["section_id"]) === sectionId);
                  const isComplete = completedSectionIds.includes(sectionId);
                  const canOpenSection =
                    sectionIndex === 0 || completedSectionIds.includes(sectionRecordId(sections[sectionIndex - 1]));

                  return (
                    <article
                      key={sectionId}
                      className={`rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_54px_rgba(15,23,42,0.07)] ${
                        canOpenSection ? "" : "opacity-55"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                            Section {sectionIndex + 1}
                          </p>
                          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0B1220]">
                            {readString(section, ["title", "name"]) || `Section ${sectionIndex + 1}`}
                          </h2>
                          {readString(section, ["description", "summary"]) && (
                            <p className="mt-3 text-base font-medium leading-7 text-[#4B5563]">
                              {readString(section, ["description", "summary"])}
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-[#EAF2FF] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                          {isComplete ? "Complete" : canOpenSection ? "Open" : "Locked"}
                        </span>
                      </div>

                      <div className="mt-6 grid gap-4">
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

                            if ((contentType === "image" || contentType === "infographic") && mediaUrl) {
                              return (
                                <div
                                  key={blockId}
                                  className="overflow-hidden rounded-[1.75rem] border border-[#E5E7EB] bg-white shadow-[0_18px_54px_rgba(15,23,42,0.08)]"
                                >
                                  {blockTitle && (
                                    <h3 className="px-5 pt-5 text-lg font-bold text-[#0B1220]">{blockTitle}</h3>
                                  )}
                                  <div className="relative mt-5 aspect-[16/9] w-full overflow-hidden bg-[#E8EEF7]">
                                    <Image
                                      src={mediaUrl}
                                      alt={blockTitle || "VIP webinar media"}
                                      fill
                                      unoptimized
                                      sizes="(min-width: 1024px) 896px, calc(100vw - 64px)"
                                      className="object-cover"
                                    />
                                  </div>
                                  {blockBody && (
                                    <p className="px-5 py-5 text-base font-medium leading-7 text-[#4B5563]">
                                      {blockBody}
                                    </p>
                                  )}
                                </div>
                              );
                            }

                            if (contentType === "video" && mediaUrl) {
                              return (
                                <div
                                  key={blockId}
                                  className="overflow-hidden rounded-[1.75rem] border border-[#E5E7EB] bg-white shadow-[0_18px_54px_rgba(15,23,42,0.08)]"
                                >
                                  {blockTitle && (
                                    <h3 className="px-5 pt-5 text-lg font-bold text-[#0B1220]">{blockTitle}</h3>
                                  )}
                                  <div className="mt-5 aspect-[16/9] w-full overflow-hidden bg-[#0B1220]">
                                    <video
                                      src={mediaUrl}
                                      controls
                                      className="h-full w-full object-cover"
                                    >
                                      <track kind="captions" />
                                    </video>
                                  </div>
                                  {blockBody && (
                                    <p className="px-5 py-5 text-base font-medium leading-7 text-[#4B5563]">
                                      {blockBody}
                                    </p>
                                  )}
                                </div>
                              );
                            }

                            if (contentType === "dropdown") {
                              return (
                                <details
                                  key={blockId}
                                  className="group rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-5"
                                >
                                  <summary className="cursor-pointer list-none text-lg font-bold text-[#0B1220] marker:hidden">
                                    <span className="flex items-center justify-between gap-4">
                                      <span>{blockTitle || "More detail"}</span>
                                      <span className="text-sm font-bold text-[#1157D8] group-open:hidden">Open</span>
                                      <span className="hidden text-sm font-bold text-[#1157D8] group-open:inline">
                                        Close
                                      </span>
                                    </span>
                                  </summary>
                                  {blockBody && (
                                    <p className="mt-4 whitespace-pre-line text-base font-medium leading-7 text-[#4B5563]">
                                      {blockBody}
                                    </p>
                                  )}
                                </details>
                              );
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
                        className="mt-6 h-12 rounded-2xl bg-[#1157D8] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(17,87,216,0.22)] transition hover:bg-[#0A39A8] disabled:cursor-not-allowed disabled:bg-[#9CA3AF] disabled:shadow-none"
                      >
                        Take quiz
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </section>

      {activeQuizSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/45 px-5">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">Quiz</p>
            <h2 className="mt-3 text-2xl font-bold text-[#0B1220]">
              {readString(activeQuizSection, ["title", "name"]) || "Section quiz"}
            </h2>

            {activeQuizQuestions.length === 0 ? (
              <p className="mt-5 rounded-2xl bg-[#F8FAFC] px-4 py-5 text-sm font-semibold text-[#4B5563]">
                This section does not have quiz questions yet. You can mark it complete.
              </p>
            ) : (
              <div className="mt-5 grid gap-5">
                {activeQuizQuestions.map((question, questionIndex) => {
                  const questionId = recordId(question);
                  const options = readArray(question, ["options", "choices", "answers"]);

                  return (
                    <div key={questionId} className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                      <p className="text-sm font-bold text-[#0B1220]">
                        {questionIndex + 1}. {readString(question, ["question_text", "question", "prompt", "title"])}
                      </p>

                      {options.length > 0 ? (
                        <div className="mt-4 grid gap-2">
                          {options.map((option) => (
                            <label key={option} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#374151]">
                              <input
                                type="radio"
                                name={questionId}
                                value={option}
                                checked={answers[questionId] === option}
                                onChange={(event) =>
                                  setAnswers((current) => ({
                                    ...current,
                                    [questionId]: event.target.value,
                                  }))
                                }
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          value={answers[questionId] || ""}
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              [questionId]: event.target.value,
                            }))
                          }
                          className="mt-4 min-h-28 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium text-[#111827] outline-none transition focus:border-[#1157D8] focus:ring-4 focus:ring-[#1157D8]/10"
                          placeholder="Your answer"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setActiveQuizSectionId(null)}
                className="h-12 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#374151] transition hover:border-[#1157D8] hover:text-[#1157D8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={completeQuiz}
                disabled={!canSubmitQuiz}
                className="h-12 rounded-2xl bg-[#1157D8] px-5 text-sm font-bold text-white transition hover:bg-[#0A39A8] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
              >
                Complete section
              </button>
            </div>
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
