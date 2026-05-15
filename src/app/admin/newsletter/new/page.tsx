"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../../../lib/supabaseClient";

type CampaignType = "newsletter" | "launch" | "promotion" | "update";
type Audience =
  | "all_newsletter_contacts"
  | "lead_only"
  | "active_members"
  | "unclear_app_users";

type RecipientCounts = {
  allNewsletterContactsCount: number;
  leadOnlyCount: number;
  activeMembersCount: number;
  unclearAppUsersCount: number;
};

type NewsletterSummaryResponse =
  | {
      success: true;
      summary: RecipientCounts;
    }
  | {
      success: false;
      error: string;
    };

const campaignTypeOptions: CampaignType[] = ["newsletter", "launch", "promotion", "update"];
const audienceOptions: Array<[Audience, string]> = [
  ["all_newsletter_contacts", "All newsletter contacts"],
  ["lead_only", "Lead only"],
  ["active_members", "Active members"],
  ["unclear_app_users", "Unclear app users"],
];

const exampleBody = `Hi {{first_name}},

Elite Pocket PT is getting closer to launch, and I wanted to give you a practical update before early access opens.

This week we are focusing on the training system: structured workouts, progress tracking, mobility, nutrition, and Coach Mike feedback in one place.

More details are coming soon.

Coach Mike`;

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function getRecipientEstimate(counts: RecipientCounts | null, audience: Audience) {
  if (!counts) {
    return null;
  }

  if (audience === "lead_only") {
    return counts.leadOnlyCount;
  }

  if (audience === "active_members") {
    return counts.activeMembersCount;
  }

  if (audience === "unclear_app_users") {
    return counts.unclearAppUsersCount;
  }

  return counts.allNewsletterContactsCount;
}

function formatAudienceLabel(value: Audience) {
  return audienceOptions.find(([option]) => option === value)?.[1] || titleCase(value);
}

export default function NewNewsletterCampaignPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [campaignType, setCampaignType] = useState<CampaignType>("newsletter");
  const [audience, setAudience] = useState<Audience>("all_newsletter_contacts");
  const [body, setBody] = useState(exampleBody);
  const [testEmail, setTestEmail] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState("");
  const [testErrorMessage, setTestErrorMessage] = useState("");
  const [recipientCounts, setRecipientCounts] = useState<RecipientCounts | null>(null);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false);
  const [estimateErrorMessage, setEstimateErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function verifyAdminAccess() {
      setIsCheckingAccess(true);
      setErrorMessage("");

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        if (isMounted) {
          setErrorMessage(sessionError.message);
          setIsCheckingAccess(false);
        }
        return;
      }

      const session = sessionData.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("User")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        if (isMounted) {
          setErrorMessage(profileError.message);
          setIsCheckingAccess(false);
        }
        return;
      }

      if (profile?.role !== "admin") {
        router.replace("/account");
        return;
      }

      if (isMounted) {
        setIsCheckingAccess(false);
        setIsLoadingEstimate(true);
        setEstimateErrorMessage("");
      }

      try {
        const response = await fetch("/api/admin/newsletter/summary", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const payload = (await response.json()) as NewsletterSummaryResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok || !payload.success) {
          setRecipientCounts(null);
          setEstimateErrorMessage(payload.success ? "Could not load recipient estimate." : payload.error);
        } else {
          setRecipientCounts(payload.summary);
        }
      } catch (error) {
        if (isMounted) {
          setRecipientCounts(null);
          setEstimateErrorMessage(error instanceof Error ? error.message : "Could not load recipient estimate.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingEstimate(false);
        }
      }
    }

    verifyAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  const estimatedRecipients = getRecipientEstimate(recipientCounts, audience);

  async function handleSaveDraft() {
    setIsSavingDraft(true);
    setSaveSuccessMessage("");
    setSaveErrorMessage("");

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (sessionError || !accessToken) {
      setSaveErrorMessage(sessionError?.message || "You need to sign in again before saving this draft.");
      setIsSavingDraft(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/newsletter/drafts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          previewText,
          campaignType,
          targetAudience: audience,
          body,
        }),
      });
      const payload = (await response.json()) as { success: boolean; error?: string };

      if (!response.ok || !payload.success) {
        if (!payload.success && payload.error) {
          setSaveErrorMessage(payload.error);
        } else {
          setSaveErrorMessage("Could not save newsletter draft.");
        }
        return;
      }

      setSaveSuccessMessage("Draft saved. You can keep editing this campaign.");
    } catch (error) {
      setSaveErrorMessage(error instanceof Error ? error.message : "Could not save newsletter draft.");
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSendTest() {
    setIsSendingTest(true);
    setTestSuccessMessage("");
    setTestErrorMessage("");

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (sessionError || !accessToken) {
      setTestErrorMessage(sessionError?.message || "You need to sign in again before sending a test.");
      setIsSendingTest(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/newsletter/test-send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          previewText,
          campaignType,
          targetAudience: audience,
          body,
          testEmail,
        }),
      });
      const payload = (await response.json()) as { success: boolean; message?: string; error?: string };

      if (!response.ok || !payload.success) {
        setTestErrorMessage(payload.error || "Could not send test email.");
        return;
      }

      setTestSuccessMessage(payload.message || "Test email sent.");
    } catch (error) {
      setTestErrorMessage(error instanceof Error ? error.message : "Could not send test email.");
    } finally {
      setIsSendingTest(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-5 py-12 text-[#111827]">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
              Elite Pocket PT
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
              New Campaign
            </h1>
            <p className="max-w-2xl text-base font-medium text-[#4B5563]">
              Create and queue a newsletter campaign for Elite Pocket PT leads.
            </p>
          </div>

          <Link
            href="/admin/newsletter"
            className="inline-flex h-11 w-fit items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8]/40 hover:text-[#1157D8]"
          >
            Back to newsletter
          </Link>
        </div>

        {errorMessage && (
          <p className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </p>
        )}

        {saveSuccessMessage && (
          <p className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {saveSuccessMessage}
          </p>
        )}

        {saveErrorMessage && (
          <p className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {saveErrorMessage}
          </p>
        )}

        {testSuccessMessage && (
          <p className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {testSuccessMessage}
          </p>
        )}

        {testErrorMessage && (
          <p className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {testErrorMessage}
          </p>
        )}

        {isCheckingAccess ? (
          <p className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-6 text-sm font-semibold text-[#4B5563] shadow-sm">
            Checking admin access...
          </p>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <div className="grid gap-5">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                    Campaign subject
                  </span>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Elite Pocket PT early access opens soon"
                    className="h-12 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0B1220] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#1157D8] focus:bg-white"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                    Preview text
                  </span>
                  <input
                    value={previewText}
                    onChange={(event) => setPreviewText(event.target.value)}
                    placeholder="A quick launch update from Coach Mike."
                    className="h-12 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0B1220] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#1157D8] focus:bg-white"
                  />
                </label>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                      Campaign type
                    </span>
                    <select
                      value={campaignType}
                      onChange={(event) => setCampaignType(event.target.value as CampaignType)}
                      className="h-12 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0B1220] outline-none transition focus:border-[#1157D8] focus:bg-white"
                    >
                      {campaignTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {titleCase(option)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                      Audience
                    </span>
                    <select
                      value={audience}
                      onChange={(event) => setAudience(event.target.value as Audience)}
                      className="h-12 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0B1220] outline-none transition focus:border-[#1157D8] focus:bg-white"
                    >
                      {audienceOptions.map(([option, label]) => (
                        <option key={option} value={option}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                    Rich text email body
                  </span>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={14}
                    className="min-h-80 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 text-sm font-medium leading-6 text-[#0B1220] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#1157D8] focus:bg-white"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                    Test email
                  </span>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(event) => setTestEmail(event.target.value)}
                    placeholder="coach@example.com"
                    className="h-12 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0B1220] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#1157D8] focus:bg-white"
                  />
                </label>

                <div className="flex flex-col gap-3 border-t border-[#E5E7EB] pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="h-11 rounded-xl bg-[#1157D8] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(17,87,216,0.22)] transition hover:bg-[#0A39A8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingDraft ? "Saving..." : "Save draft"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={isSendingTest}
                    className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8]/40 hover:text-[#1157D8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSendingTest ? "Sending..." : "Send test"}
                  </button>
                  <button
                    type="button"
                    disabled
                    className="h-11 cursor-not-allowed rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#9CA3AF] shadow-sm"
                  >
                    Queue campaign - Coming soon
                  </button>
                </div>
              </div>
            </div>

            <aside className="h-fit rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                Campaign summary
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0B1220]">
                {subject.trim() || "Untitled campaign"}
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-[#4B5563]">
                {previewText.trim() || "Preview text will appear here before this campaign is queued."}
              </p>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Audience</p>
                  <p className="mt-1 text-sm font-bold text-[#0B1220]">{formatAudienceLabel(audience)}</p>
                </div>
                <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Type</p>
                  <p className="mt-1 text-sm font-bold text-[#0B1220]">{titleCase(campaignType)}</p>
                </div>
                <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                    Estimated recipients
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#0B1220]">
                    {isLoadingEstimate
                      ? "Loading..."
                      : estimateErrorMessage
                        ? "Unavailable"
                        : (estimatedRecipients ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
