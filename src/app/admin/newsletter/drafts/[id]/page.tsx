"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../../../../lib/supabaseClient";

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

type NewsletterDraft = {
  id: string;
  created_date: string | null;
  updated_date: string | null;
  subject: string | null;
  body: string | null;
  target_audience: string[] | null;
  campaign_type: string | null;
  status: string | null;
};

type DraftDetailResponse =
  | {
      success: true;
      draft: NewsletterDraft;
    }
  | {
      success: false;
      error: string;
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

type QueueCampaignResponse =
  | {
      success: true;
      queuedCount: number;
    }
  | {
      success: false;
      error: string;
    };

type CampaignAnalytics = {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
};

type CampaignAnalyticsResponse =
  | {
      success: true;
      analytics: CampaignAnalytics;
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
const analyticsCards: Array<[string, keyof CampaignAnalytics]> = [
  ["Total queued", "total"],
  ["Pending", "pending"],
  ["Processing", "processing"],
  ["Sent", "sent"],
  ["Failed", "failed"],
];

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function toCampaignType(value: string | null): CampaignType {
  return campaignTypeOptions.includes(value as CampaignType) ? (value as CampaignType) : "newsletter";
}

function isCanonicalTargetAudience(value: string[] | null): value is [Audience] {
  return (
    Array.isArray(value) &&
    value.length === 1 &&
    audienceOptions.some(([option]) => option === value[0])
  );
}

function toAudience(value: string[] | null): Audience {
  if (!isCanonicalTargetAudience(value)) {
    return "all_newsletter_contacts";
  }

  return value[0];
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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCount(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "0";
}

function getStatusBanner(value: string) {
  if (value === "queued") {
    return {
      className: "border-blue-100 bg-blue-50 text-blue-700",
      message: "This campaign is queued. Editing and queueing are locked, but test emails can still be sent.",
    };
  }

  if (value === "sent") {
    return {
      className: "border-emerald-100 bg-emerald-50 text-emerald-700",
      message: "This campaign has been sent. Editing and queueing are locked, but test emails can still be sent.",
    };
  }

  return null;
}

export default function NewsletterDraftDetailPage() {
  const params = useParams<{ id: string }>();
  const draftId = params.id;
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [campaignType, setCampaignType] = useState<CampaignType>("newsletter");
  const [audience, setAudience] = useState<Audience>("all_newsletter_contacts");
  const [body, setBody] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [status, setStatus] = useState("draft");
  const [createdDate, setCreatedDate] = useState<string | null>(null);
  const [updatedDate, setUpdatedDate] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState("");
  const [testErrorMessage, setTestErrorMessage] = useState("");
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueSuccessMessage, setQueueSuccessMessage] = useState("");
  const [queueErrorMessage, setQueueErrorMessage] = useState("");
  const [hasLegacyAudience, setHasLegacyAudience] = useState(false);
  const [recipientCounts, setRecipientCounts] = useState<RecipientCounts | null>(null);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false);
  const [estimateErrorMessage, setEstimateErrorMessage] = useState("");
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsErrorMessage, setAnalyticsErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDraft() {
      setIsLoading(true);
      setErrorMessage("");

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
          setIsLoading(false);
        }
        return;
      }

      if (profile?.role !== "admin") {
        router.replace("/account");
        return;
      }

      if (isMounted) {
        setIsLoadingEstimate(true);
        setEstimateErrorMessage("");
      }

      fetch("/api/admin/newsletter/summary", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
        .then(async (response) => {
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
        })
        .catch((error: unknown) => {
          if (isMounted) {
            setRecipientCounts(null);
            setEstimateErrorMessage(error instanceof Error ? error.message : "Could not load recipient estimate.");
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingEstimate(false);
          }
        });

      try {
        const response = await fetch(`/api/admin/newsletter/drafts?id=${encodeURIComponent(draftId)}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const payload = (await response.json()) as DraftDetailResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok || !payload.success) {
          setErrorMessage(payload.success ? "Could not load newsletter draft." : payload.error);
          return;
        }

        setSubject(payload.draft.subject || "");
        setCampaignType(toCampaignType(payload.draft.campaign_type));
        setAudience(toAudience(payload.draft.target_audience));
        setHasLegacyAudience(!isCanonicalTargetAudience(payload.draft.target_audience));
        setBody(payload.draft.body || "");
        setStatus(payload.draft.status || "draft");
        setCreatedDate(payload.draft.created_date);
        setUpdatedDate(payload.draft.updated_date);

        setIsLoadingAnalytics(true);
        setAnalyticsErrorMessage("");

        try {
          const analyticsResponse = await fetch(
            `/api/admin/newsletter/campaigns/${encodeURIComponent(draftId)}/analytics`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            },
          );
          const analyticsPayload = (await analyticsResponse.json()) as CampaignAnalyticsResponse;

          if (!isMounted) {
            return;
          }

          if (!analyticsResponse.ok || !analyticsPayload.success) {
            setAnalytics(null);
            setAnalyticsErrorMessage(
              analyticsPayload.success ? "Could not load campaign analytics." : analyticsPayload.error,
            );
          } else {
            setAnalytics(analyticsPayload.analytics);
          }
        } catch (analyticsError) {
          if (isMounted) {
            setAnalytics(null);
            setAnalyticsErrorMessage(
              analyticsError instanceof Error ? analyticsError.message : "Could not load campaign analytics.",
            );
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load newsletter draft.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsLoadingAnalytics(false);
        }
      }
    }

    loadDraft();

    return () => {
      isMounted = false;
    };
  }, [draftId, router, supabase]);

  const estimatedRecipients = getRecipientEstimate(recipientCounts, audience);
  const isLockedCampaign = status === "queued" || status === "sent";
  const statusBanner = getStatusBanner(status);
  const canQueueCampaign = status === "draft" && !queueSuccessMessage && !hasLegacyAudience;

  async function handleSaveChanges() {
    if (isLockedCampaign) {
      setSaveErrorMessage("Queued and sent campaigns cannot be edited.");
      return;
    }

    setIsSaving(true);
    setSaveSuccessMessage("");
    setSaveErrorMessage("");

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (sessionError || !accessToken) {
      setSaveErrorMessage(sessionError?.message || "You need to sign in again before saving this draft.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/newsletter/drafts/${encodeURIComponent(draftId)}`, {
        method: "PATCH",
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
      const payload = (await response.json()) as DraftDetailResponse;

      if (!response.ok || !payload.success) {
        setSaveErrorMessage(payload.success ? "Could not update newsletter draft." : payload.error);
        return;
      }

      setSubject(payload.draft.subject || "");
      setCampaignType(toCampaignType(payload.draft.campaign_type));
      setAudience(toAudience(payload.draft.target_audience));
      setHasLegacyAudience(false);
      setBody(payload.draft.body || "");
      setStatus(payload.draft.status || "draft");
      setCreatedDate(payload.draft.created_date);
      setUpdatedDate(payload.draft.updated_date);
      setSaveSuccessMessage("Draft changes saved.");
    } catch (error) {
      setSaveErrorMessage(error instanceof Error ? error.message : "Could not update newsletter draft.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleQueueCampaign() {
    const confirmed = window.confirm(
      "Queue this campaign for the selected audience? This will create pending email records for every matching lead.",
    );

    if (!confirmed) {
      return;
    }

    setIsQueueing(true);
    setQueueSuccessMessage("");
    setQueueErrorMessage("");

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (sessionError || !accessToken) {
      setQueueErrorMessage(sessionError?.message || "You need to sign in again before queueing this campaign.");
      setIsQueueing(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/newsletter/queue", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftId,
        }),
      });
      const payload = (await response.json()) as QueueCampaignResponse;

      if (!response.ok || !payload.success) {
        if (!payload.success) {
          setQueueErrorMessage(payload.error);
        } else {
          setQueueErrorMessage("Could not queue campaign.");
        }
        return;
      }

      setStatus("queued");
      setUpdatedDate(new Date().toISOString());
      setAnalytics((current) =>
        current
          ? { ...current, pending: payload.queuedCount, total: payload.queuedCount }
          : {
              pending: payload.queuedCount,
              processing: 0,
              sent: 0,
              failed: 0,
              total: payload.queuedCount,
            },
      );
      setQueueSuccessMessage(`Campaign queued for ${payload.queuedCount.toLocaleString()} recipients.`);
    } catch (error) {
      setQueueErrorMessage(error instanceof Error ? error.message : "Could not queue campaign.");
    } finally {
      setIsQueueing(false);
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
              Edit Draft
            </h1>
            <p className="max-w-2xl text-base font-medium text-[#4B5563]">
              Review and update this saved newsletter campaign before delivery tools are enabled.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/newsletter/drafts"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8]/40 hover:text-[#1157D8]"
            >
              Back to drafts
            </Link>
            <Link
              href="/admin/newsletter"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8]/40 hover:text-[#1157D8]"
            >
              Back to newsletter
            </Link>
          </div>
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

        {queueSuccessMessage && (
          <p className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {queueSuccessMessage}
          </p>
        )}

        {queueErrorMessage && (
          <p className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {queueErrorMessage}
          </p>
        )}

        {hasLegacyAudience && (
          <p className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            This draft used an old audience value. Save changes before queueing.
          </p>
        )}

        {statusBanner && (
          <p className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${statusBanner.className}`}>
            {statusBanner.message}
          </p>
        )}

        {isLoading ? (
          <p className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-6 text-sm font-semibold text-[#4B5563] shadow-sm">
            Loading newsletter draft...
          </p>
        ) : !errorMessage ? (
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
                    onClick={handleSaveChanges}
                    disabled={isSaving || isLockedCampaign}
                    className="h-11 rounded-xl bg-[#1157D8] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(17,87,216,0.22)] transition hover:bg-[#0A39A8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : isLockedCampaign ? "Changes locked" : "Save changes"}
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
                    onClick={handleQueueCampaign}
                    disabled={!canQueueCampaign || isQueueing}
                    className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8]/40 hover:text-[#1157D8] disabled:cursor-not-allowed disabled:text-[#9CA3AF] disabled:opacity-60"
                  >
                    {isQueueing
                      ? "Queueing..."
                      : status === "draft"
                        ? "Queue campaign"
                        : status === "sent"
                          ? "Campaign sent"
                          : "Campaign queued"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid h-fit gap-6">
              <aside className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
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
                  <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Status</p>
                    <p className="mt-1 text-sm font-bold text-[#0B1220]">{titleCase(status)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Created</p>
                    <p className="mt-1 text-sm font-bold text-[#0B1220]">{formatDateTime(createdDate)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">Updated</p>
                    <p className="mt-1 text-sm font-bold text-[#0B1220]">{formatDateTime(updatedDate)}</p>
                  </div>
                </div>
              </aside>

              <aside className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                  Delivery analytics
                </p>
                <h2 className="mt-3 text-xl font-bold tracking-tight text-[#0B1220]">
                  Campaign delivery
                </h2>

                {isLoadingAnalytics ? (
                  <p className="mt-5 rounded-2xl bg-[#F8FAFC] px-4 py-4 text-sm font-semibold text-[#4B5563]">
                    Loading analytics...
                  </p>
                ) : analyticsErrorMessage ? (
                  <p className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm font-semibold text-red-600">
                    {analyticsErrorMessage}
                  </p>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {analyticsCards.map(([label, key]) => (
                      <div key={key} className="rounded-2xl bg-[#F8FAFC] px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                          {label}
                        </p>
                        <p className="mt-1 text-xl font-bold text-[#0B1220]">
                          {formatCount(analytics?.[key])}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
