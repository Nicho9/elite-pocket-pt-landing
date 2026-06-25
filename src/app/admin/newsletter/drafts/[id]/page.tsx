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

type SendPendingResponse =
  | {
      success: true;
      processed: number;
      sent: number;
      failed: number;
      remainingPending: number;
      remainingProcessing: number;
      remainingFailed: number;
      campaignCompleted: boolean;
      message?: string;
    }
  | {
      success: false;
      error: string;
    };

type RecipientPreviewRow = {
  email: string;
  name: string;
  newsletterName: string;
  appFullName: string;
  audienceSegment: string;
  newsletterSources: unknown;
  hasAppAccount: boolean | null;
  subscriptionStatus: string | null;
  subscriptionTier: string | null;
  onboardingCompleted: boolean | null;
};

type RecipientPreviewResponse =
  | {
      success: true;
      targetAudience: Audience;
      total: number;
      segmentBreakdown: Record<string, number>;
      recipients: RecipientPreviewRow[];
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
  opened: number;
  clicked: number;
  appStoreClicks: number;
  googlePlayClicks: number;
  total: number;
};

type RecipientEngagementRow = {
  emailLogId: string;
  email: string;
  name: string;
  status: string;
  opened: boolean;
  openedAt: string | null;
  openCount: number;
  clicked: boolean;
  lastClickedAt: string | null;
  clickCount: number;
  appStoreClicks: number;
  googlePlayClicks: number;
};

type CampaignAnalyticsResponse =
  | {
      success: true;
      analytics: CampaignAnalytics;
      recipientAnalytics: RecipientEngagementRow[];
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
  ["Opened", "opened"],
  ["Clicked", "clicked"],
  ["App Store clicks", "appStoreClicks"],
  ["Google Play clicks", "googlePlayClicks"],
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

function formatBoolean(value: boolean | null | undefined) {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  return "Unknown";
}

function formatNewsletterSources(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").join(", ") || "Not set";
  }

  if (typeof value === "string") {
    return value || "Not set";
  }

  return "Not set";
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
  const [isSendingPending, setIsSendingPending] = useState(false);
  const [sendPendingSuccessMessage, setSendPendingSuccessMessage] = useState("");
  const [sendPendingErrorMessage, setSendPendingErrorMessage] = useState("");
  const [hasLegacyAudience, setHasLegacyAudience] = useState(false);
  const [recipientCounts, setRecipientCounts] = useState<RecipientCounts | null>(null);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false);
  const [estimateErrorMessage, setEstimateErrorMessage] = useState("");
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [recipientAnalytics, setRecipientAnalytics] = useState<RecipientEngagementRow[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsErrorMessage, setAnalyticsErrorMessage] = useState("");
  const [engagementSearchTerm, setEngagementSearchTerm] = useState("");
  const [recipientPreview, setRecipientPreview] = useState<RecipientPreviewRow[]>([]);
  const [recipientSegmentBreakdown, setRecipientSegmentBreakdown] = useState<Record<string, number>>({});
  const [isLoadingRecipientPreview, setIsLoadingRecipientPreview] = useState(false);
  const [recipientPreviewErrorMessage, setRecipientPreviewErrorMessage] = useState("");
  const [recipientSearchTerm, setRecipientSearchTerm] = useState("");

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

      async function loadRecipientPreview(accessToken: string) {
        setIsLoadingRecipientPreview(true);
        setRecipientPreviewErrorMessage("");

        try {
          const previewResponse = await fetch(
            `/api/admin/newsletter/recipient-preview?draftId=${encodeURIComponent(draftId)}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );
          const previewPayload = (await previewResponse.json()) as RecipientPreviewResponse;

          if (!isMounted) {
            return;
          }

          if (!previewResponse.ok || !previewPayload.success) {
            setRecipientPreview([]);
            setRecipientSegmentBreakdown({});
            setRecipientPreviewErrorMessage(
              previewPayload.success ? "Could not load recipient preview." : previewPayload.error,
            );
          } else {
            setRecipientPreview(previewPayload.recipients);
            setRecipientSegmentBreakdown(previewPayload.segmentBreakdown);
          }
        } catch (previewError) {
          if (isMounted) {
            setRecipientPreview([]);
            setRecipientSegmentBreakdown({});
            setRecipientPreviewErrorMessage(
              previewError instanceof Error ? previewError.message : "Could not load recipient preview.",
            );
          }
        } finally {
          if (isMounted) {
            setIsLoadingRecipientPreview(false);
          }
        }
      }

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
        void loadRecipientPreview(session.access_token);

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
            setRecipientAnalytics(analyticsPayload.recipientAnalytics);
          }
        } catch (analyticsError) {
          if (isMounted) {
            setAnalytics(null);
            setRecipientAnalytics([]);
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
  const canQueueCampaign =
    status === "draft" &&
    !queueSuccessMessage &&
    !hasLegacyAudience &&
    !isLoadingRecipientPreview &&
    !recipientPreviewErrorMessage &&
    recipientPreview.length > 0;
  const canSendPendingCampaign =
    status === "queued" && !isSendingPending && (analytics?.pending || 0) > 0;
  const normalizedRecipientSearch = recipientSearchTerm.trim().toLowerCase();
  const filteredRecipientPreview = recipientPreview.filter((recipient) => {
    if (!normalizedRecipientSearch) {
      return true;
    }

    return [
      recipient.email,
      recipient.name,
      recipient.newsletterName,
      recipient.appFullName,
      recipient.audienceSegment,
      recipient.subscriptionStatus,
      recipient.subscriptionTier,
    ].some((value) => (value || "").toLowerCase().includes(normalizedRecipientSearch));
  });
  const normalizedEngagementSearch = engagementSearchTerm.trim().toLowerCase();
  const filteredRecipientAnalytics = recipientAnalytics.filter((recipient) => {
    if (!normalizedEngagementSearch) {
      return true;
    }

    return [recipient.email, recipient.name, recipient.status].some((value) =>
      (value || "").toLowerCase().includes(normalizedEngagementSearch),
    );
  });

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
      setIsLoadingRecipientPreview(true);
      setRecipientPreviewErrorMessage("");

      try {
        const previewResponse = await fetch(
          `/api/admin/newsletter/recipient-preview?draftId=${encodeURIComponent(draftId)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        const previewPayload = (await previewResponse.json()) as RecipientPreviewResponse;

        if (!previewResponse.ok || !previewPayload.success) {
          setRecipientPreview([]);
          setRecipientSegmentBreakdown({});
          setRecipientPreviewErrorMessage(
            previewPayload.success ? "Could not load recipient preview." : previewPayload.error,
          );
        } else {
          setRecipientPreview(previewPayload.recipients);
          setRecipientSegmentBreakdown(previewPayload.segmentBreakdown);
        }
      } catch (previewError) {
        setRecipientPreview([]);
        setRecipientSegmentBreakdown({});
        setRecipientPreviewErrorMessage(
          previewError instanceof Error ? previewError.message : "Could not load recipient preview.",
        );
      } finally {
        setIsLoadingRecipientPreview(false);
      }

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
              opened: 0,
              clicked: 0,
              appStoreClicks: 0,
              googlePlayClicks: 0,
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

  async function handleSendPendingBatch() {
    const confirmed = window.confirm(
      "Send the next batch of up to 10 pending emails for this queued campaign?",
    );

    if (!confirmed) {
      return;
    }

    setIsSendingPending(true);
    setSendPendingSuccessMessage("");
    setSendPendingErrorMessage("");

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (sessionError || !accessToken) {
      setSendPendingErrorMessage(
        sessionError?.message || "You need to sign in again before sending this campaign.",
      );
      setIsSendingPending(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/newsletter/send-pending", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftId,
        }),
      });
      const payload = (await response.json()) as SendPendingResponse;

      if (!response.ok || !payload.success) {
        setSendPendingErrorMessage(
          payload.success ? "Could not send pending emails." : payload.error,
        );
        return;
      }

      setAnalytics((current) => {
        const total =
          current?.total ||
          payload.remainingPending + payload.remainingProcessing + payload.remainingFailed + payload.sent;
        const previousSent = current?.sent || 0;

        return {
          total,
          pending: payload.remainingPending,
          processing: payload.remainingProcessing,
          sent: previousSent + payload.sent,
            failed: payload.remainingFailed,
            opened: current?.opened || 0,
            clicked: current?.clicked || 0,
            appStoreClicks: current?.appStoreClicks || 0,
            googlePlayClicks: current?.googlePlayClicks || 0,
        };
      });

      if (payload.campaignCompleted) {
        setStatus("sent");
        setUpdatedDate(new Date().toISOString());
      }

      setSendPendingSuccessMessage(
        `Batch processed ${payload.processed.toLocaleString()} emails: ${payload.sent.toLocaleString()} sent, ${payload.failed.toLocaleString()} failed.${payload.message ? ` ${payload.message}` : ""}`,
      );
    } catch (error) {
      setSendPendingErrorMessage(
        error instanceof Error ? error.message : "Could not send pending emails.",
      );
    } finally {
      setIsSendingPending(false);
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

        {sendPendingSuccessMessage && (
          <p className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {sendPendingSuccessMessage}
          </p>
        )}

        {sendPendingErrorMessage && (
          <p className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {sendPendingErrorMessage}
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

                <section className="rounded-[1.5rem] border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                  <div className="flex flex-col gap-4 border-b border-[#E5E7EB] pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                        Recipient preview
                      </p>
                      <h2 className="mt-2 text-xl font-bold tracking-tight text-[#0B1220]">
                        Review before queueing
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#4B5563]">
                        Queueing and sending should only happen after reviewing this recipient list.
                        This preview does not queue or send emails.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                        Total recipients
                      </p>
                      <p className="mt-1 text-2xl font-bold text-[#0B1220]">
                        {isLoadingRecipientPreview ? "..." : formatCount(recipientPreview.length)}
                      </p>
                    </div>
                  </div>

                  {recipientPreviewErrorMessage ? (
                    <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                      {recipientPreviewErrorMessage}
                    </p>
                  ) : (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {Object.entries(recipientSegmentBreakdown).map(([segment, count]) => (
                          <div key={segment} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                              {titleCase(segment)}
                            </p>
                            <p className="mt-1 text-xl font-bold text-[#0B1220]">
                              {formatCount(count)}
                            </p>
                          </div>
                        ))}
                      </div>

                      <label className="mt-4 grid gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                          Search recipients
                        </span>
                        <input
                          value={recipientSearchTerm}
                          onChange={(event) => setRecipientSearchTerm(event.target.value)}
                          placeholder="Search by email, name, segment, or subscription"
                          className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#0B1220] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#1157D8]"
                        />
                      </label>

                      <div className="mt-4 max-h-96 overflow-auto rounded-2xl border border-[#E5E7EB] bg-white">
                        {isLoadingRecipientPreview ? (
                          <p className="px-4 py-6 text-sm font-semibold text-[#4B5563]">
                            Loading recipient preview...
                          </p>
                        ) : filteredRecipientPreview.length === 0 ? (
                          <p className="px-4 py-6 text-sm font-semibold text-[#4B5563]">
                            No recipients found.
                          </p>
                        ) : (
                          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                            <thead className="sticky top-0 bg-white text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280] shadow-sm">
                              <tr>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Segment</th>
                                <th className="px-4 py-3">Sources</th>
                                <th className="px-4 py-3">App account</th>
                                <th className="px-4 py-3">Subscription</th>
                                <th className="px-4 py-3">Onboarded</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB]">
                              {filteredRecipientPreview.map((recipient) => (
                                <tr key={recipient.email}>
                                  <td className="px-4 py-3 font-semibold text-[#0B1220]">
                                    {recipient.email}
                                  </td>
                                  <td className="px-4 py-3 text-[#4B5563]">
                                    {recipient.name || "Not set"}
                                  </td>
                                  <td className="px-4 py-3 text-[#4B5563]">
                                    {titleCase(recipient.audienceSegment || "unknown")}
                                  </td>
                                  <td className="px-4 py-3 text-[#4B5563]">
                                    {formatNewsletterSources(recipient.newsletterSources)}
                                  </td>
                                  <td className="px-4 py-3 text-[#4B5563]">
                                    {formatBoolean(recipient.hasAppAccount)}
                                  </td>
                                  <td className="px-4 py-3 text-[#4B5563]">
                                    {recipient.subscriptionStatus || "Not set"}
                                    {recipient.subscriptionTier ? ` / ${recipient.subscriptionTier}` : ""}
                                  </td>
                                  <td className="px-4 py-3 text-[#4B5563]">
                                    {formatBoolean(recipient.onboardingCompleted)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </>
                  )}
                </section>

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
                    <button
                      type="button"
                      onClick={handleSendPendingBatch}
                      disabled={!canSendPendingCampaign}
                      className="mt-2 h-11 rounded-xl bg-[#1157D8] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(17,87,216,0.22)] transition hover:bg-[#0A39A8] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSendingPending ? "Sending batch..." : "Send next 10 pending"}
                    </button>
                    <p className="text-xs font-semibold leading-5 text-[#6B7280]">
                      Sending is manual and batch-based. Queueing a campaign does not send emails automatically.
                    </p>
                  </div>
                )}
              </aside>
            </div>

            {recipientAnalytics.length > 0 && (
              <section className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] lg:col-span-2">
                <div className="flex flex-col gap-4 border-b border-[#E5E7EB] pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                      Recipient engagement
                    </p>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-[#0B1220]">
                      Opens and clicks by recipient
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#4B5563]">
                      This table shows engagement after queued campaign emails begin sending.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                      Email logs
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[#0B1220]">
                      {formatCount(recipientAnalytics.length)}
                    </p>
                  </div>
                </div>

                <label className="mt-4 grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                    Search engagement
                  </span>
                  <input
                    value={engagementSearchTerm}
                    onChange={(event) => setEngagementSearchTerm(event.target.value)}
                    placeholder="Search by email, name, or delivery status"
                    className="h-11 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0B1220] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#1157D8] focus:bg-white"
                  />
                </label>

                <div className="mt-4 max-h-[32rem] overflow-auto rounded-2xl border border-[#E5E7EB]">
                  {filteredRecipientAnalytics.length === 0 ? (
                    <p className="px-4 py-6 text-sm font-semibold text-[#4B5563]">
                      No engagement rows found.
                    </p>
                  ) : (
                    <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                      <thead className="sticky top-0 bg-white text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280] shadow-sm">
                        <tr>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Delivery status</th>
                          <th className="px-4 py-3">Opened</th>
                          <th className="px-4 py-3">Opened at</th>
                          <th className="px-4 py-3">Open count</th>
                          <th className="px-4 py-3">Clicked</th>
                          <th className="px-4 py-3">Click count</th>
                          <th className="px-4 py-3">App Store clicks</th>
                          <th className="px-4 py-3">Google Play clicks</th>
                          <th className="px-4 py-3">Last clicked</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {filteredRecipientAnalytics.map((recipient) => (
                          <tr key={recipient.emailLogId}>
                            <td className="px-4 py-3 font-semibold text-[#0B1220]">
                              {recipient.email || "Not set"}
                            </td>
                            <td className="px-4 py-3 text-[#4B5563]">
                              {recipient.name || "Not set"}
                            </td>
                            <td className="px-4 py-3 text-[#4B5563]">
                              {titleCase(recipient.status || "unknown")}
                            </td>
                            <td className="px-4 py-3 text-[#4B5563]">
                              {formatBoolean(recipient.opened)}
                            </td>
                            <td className="px-4 py-3 text-[#4B5563]">
                              {formatDateTime(recipient.openedAt)}
                            </td>
                            <td className="px-4 py-3 text-[#4B5563]">
                              {formatCount(recipient.openCount)}
                            </td>
                            <td className="px-4 py-3 text-[#4B5563]">
                              {formatBoolean(recipient.clicked)}
                            </td>
                            <td className="px-4 py-3 text-[#4B5563]">
                              {formatCount(recipient.clickCount)}
                            </td>
                            <td className="px-4 py-3 text-[#4B5563]">
                              {formatCount(recipient.appStoreClicks)}
                            </td>
                            <td className="px-4 py-3 text-[#4B5563]">
                              {formatCount(recipient.googlePlayClicks)}
                            </td>
                            <td className="px-4 py-3 text-[#4B5563]">
                              {formatDateTime(recipient.lastClickedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
