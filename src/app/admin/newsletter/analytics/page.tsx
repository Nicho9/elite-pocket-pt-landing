"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../../../lib/supabaseClient";

type NewsletterDraft = {
  id: string;
  created_date: string | null;
  updated_date: string | null;
  subject: string | null;
  target_audience: string[] | null;
  campaign_type: string | null;
  status: string | null;
  sent_count?: number | null;
  scheduled_date?: string | null;
};

type DraftsResponse =
  | {
      success: true;
      drafts: NewsletterDraft[];
    }
  | {
      success: false;
      error: string;
    };

type CampaignAnalytics = {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  opened: number;
  clicked: number;
  appStoreClicks: number;
  googlePlayClicks: number;
  appleFounder20Clicks: number;
};

type RecipientAnalyticsRow = {
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
  appleFounder20Clicks: number;
};

type CampaignAnalyticsResponse =
  | {
      success: true;
      analytics: CampaignAnalytics;
      recipientAnalytics: RecipientAnalyticsRow[];
    }
  | {
      success: false;
      error: string;
    };

const kpiCards = [
  ["Total campaigns", "total"],
  ["Draft campaigns", "draft"],
  ["Queued campaigns", "queued"],
  ["Sent campaigns", "sent"],
] as const;

type RecapModalState = {
  draftId: string;
  subject: string;
  type: "opened" | "clicked";
} | null;

function titleCase(value: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "Not set";
  }

  return trimmed
    .split("_")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function formatAudienceLabel(value: string | null) {
  if (value === "all_newsletter_contacts") {
    return "All newsletter contacts";
  }

  if (value === "lead_only") {
    return "Lead only";
  }

  if (value === "active_members") {
    return "Active members";
  }

  if (value === "unclear_app_users") {
    return "Unclear app users";
  }

  return titleCase(value);
}

function formatAudience(value: string[] | null) {
  if (!Array.isArray(value) || value.length === 0) {
    return "Not set";
  }

  return value.map(formatAudienceLabel).join(", ");
}

function formatCount(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "0";
}

function formatDateTime(value: string | null | undefined) {
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

function getStatusStyles(value: string | null) {
  if (value === "queued") {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }

  if (value === "sent") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (value === "failed") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-white text-[#1157D8]";
}

function buildKpis(drafts: NewsletterDraft[]) {
  return {
    total: drafts.length,
    draft: drafts.filter((draft) => draft.status === "draft").length,
    queued: drafts.filter((draft) => draft.status === "queued").length,
    sent: drafts.filter((draft) => draft.status === "sent").length,
  };
}

export default function NewsletterAnalyticsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [drafts, setDrafts] = useState<NewsletterDraft[]>([]);
  const [campaignAnalyticsById, setCampaignAnalyticsById] = useState<Record<string, CampaignAnalytics>>({});
  const [recipientAnalyticsById, setRecipientAnalyticsById] = useState<Record<string, RecipientAnalyticsRow[]>>({});
  const [campaignAnalyticsLoadingById, setCampaignAnalyticsLoadingById] = useState<Record<string, boolean>>({});
  const [campaignAnalyticsErrorById, setCampaignAnalyticsErrorById] = useState<Record<string, string>>({});
  const [recapModal, setRecapModal] = useState<RecapModalState>(null);
  const [recapSearchTerm, setRecapSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCampaigns() {
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

      try {
        const response = await fetch("/api/admin/newsletter/drafts", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const payload = (await response.json()) as DraftsResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok || !payload.success) {
          setErrorMessage(payload.success ? "Could not load newsletter campaigns." : payload.error);
          setDrafts([]);
          setCampaignAnalyticsById({});
          setRecipientAnalyticsById({});
          setCampaignAnalyticsLoadingById({});
          setCampaignAnalyticsErrorById({});
        } else {
          setDrafts(payload.drafts);
          setCampaignAnalyticsById({});
          setRecipientAnalyticsById({});
          setCampaignAnalyticsErrorById({});
          setCampaignAnalyticsLoadingById(
            Object.fromEntries(payload.drafts.map((draft) => [draft.id, true])),
          );
          setIsLoading(false);

          const analyticsResults = await Promise.all(
            payload.drafts.map(async (draft) => {
              try {
                const analyticsResponse = await fetch(
                  `/api/admin/newsletter/campaigns/${encodeURIComponent(draft.id)}/analytics`,
                  {
                    headers: {
                      Authorization: `Bearer ${session.access_token}`,
                    },
                  },
                );
                const analyticsPayload = (await analyticsResponse.json()) as CampaignAnalyticsResponse;

                if (!analyticsResponse.ok || !analyticsPayload.success) {
                  return {
                    draftId: draft.id,
                    analytics: null,
                    error: analyticsPayload.success
                      ? "Could not load campaign recap."
                      : analyticsPayload.error,
                  };
                }

                return {
                  draftId: draft.id,
                  analytics: analyticsPayload.analytics,
                  recipientAnalytics: analyticsPayload.recipientAnalytics,
                  error: "",
                };
              } catch (analyticsError) {
                return {
                  draftId: draft.id,
                  analytics: null,
                  recipientAnalytics: [],
                  error:
                    analyticsError instanceof Error
                      ? analyticsError.message
                      : "Could not load campaign recap.",
                };
              }
            }),
          );

          if (!isMounted) {
            return;
          }

          setCampaignAnalyticsById(
            Object.fromEntries(
              analyticsResults
                .filter((result) => result.analytics)
                .map((result) => [result.draftId, result.analytics as CampaignAnalytics]),
            ),
          );
          setRecipientAnalyticsById(
            Object.fromEntries(
              analyticsResults.map((result) => [result.draftId, result.recipientAnalytics || []]),
            ),
          );
          setCampaignAnalyticsErrorById(
            Object.fromEntries(
              analyticsResults
                .filter((result) => result.error)
                .map((result) => [result.draftId, result.error]),
            ),
          );
          setCampaignAnalyticsLoadingById(
            Object.fromEntries(payload.drafts.map((draft) => [draft.id, false])),
          );
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load newsletter campaigns.");
          setDrafts([]);
          setCampaignAnalyticsById({});
          setRecipientAnalyticsById({});
          setCampaignAnalyticsLoadingById({});
          setCampaignAnalyticsErrorById({});
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCampaigns();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  const kpis = buildKpis(drafts);
  const modalRows = recapModal
    ? (recipientAnalyticsById[recapModal.draftId] || []).filter((recipient) =>
        recapModal.type === "opened" ? recipient.opened : recipient.clicked,
      )
    : [];
  const normalizedRecapSearch = recapSearchTerm.trim().toLowerCase();
  const filteredModalRows = modalRows.filter((recipient) => {
    if (!normalizedRecapSearch) {
      return true;
    }

    return [recipient.email, recipient.name].some((value) =>
      (value || "").toLowerCase().includes(normalizedRecapSearch),
    );
  });

  function openRecapModal(draft: NewsletterDraft, type: "opened" | "clicked") {
    setRecapModal({
      draftId: draft.id,
      subject: draft.subject?.trim() || "Untitled campaign",
      type,
    });
    setRecapSearchTerm("");
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
              Newsletter Analytics
            </h1>
            <p className="max-w-2xl text-base font-medium text-[#4B5563]">
              Review campaign status, audience, and delivery totals.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/newsletter"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8]/40 hover:text-[#1157D8]"
            >
              Back to newsletter
            </Link>
            <Link
              href="/admin/newsletter/new"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1157D8] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(17,87,216,0.22)] transition hover:bg-[#0A39A8]"
            >
              New campaign
            </Link>
          </div>
        </div>

        {errorMessage && (
          <p className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map(([label, key]) => (
            <div
              key={key}
              className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                {label}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220]">
                {isLoading ? "..." : formatCount(kpis[key])}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[#E5E7EB] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[#E5E7EB] px-5 py-4">
            <h2 className="text-lg font-bold text-[#0B1220]">Campaigns</h2>
            <p className="mt-1 text-sm font-medium text-[#6B7280]">
              Saved, queued, and sent newsletter campaigns.
            </p>
          </div>

          {isLoading ? (
            <p className="px-5 py-8 text-sm font-semibold text-[#4B5563]">
              Loading campaign analytics...
            </p>
          ) : drafts.length === 0 ? (
            <div className="px-5 py-10">
              <h2 className="text-xl font-bold text-[#0B1220]">No campaigns yet</h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#4B5563]">
                Campaign analytics will appear once drafts are created.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-4">
              {drafts.map((draft) => {
                const analytics = campaignAnalyticsById[draft.id];
                const isLoadingRecap = campaignAnalyticsLoadingById[draft.id];
                const recapError = campaignAnalyticsErrorById[draft.id];
                const recapItems: Array<[string, number, "opened" | "clicked" | null]> = analytics
                  ? [
                      ["Sent", analytics.sent, null],
                      ["Delivered", analytics.sent, null],
                      ["Opened", analytics.opened, "opened"],
                      [
                        "Clicks",
                        analytics.appStoreClicks +
                          analytics.googlePlayClicks +
                          analytics.appleFounder20Clicks,
                        "clicked",
                      ],
                    ]
                  : [];

                return (
                <article key={draft.id} className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                    <div>
                      <span
                        className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${getStatusStyles(draft.status)}`}
                      >
                        {titleCase(draft.status)}
                      </span>
                      <h2 className="mt-2 text-xl font-bold tracking-tight text-[#0B1220]">
                        {draft.subject?.trim() || "Untitled campaign"}
                      </h2>
                      <div className="mt-4 grid gap-3 text-sm font-semibold text-[#4B5563] md:grid-cols-2 xl:grid-cols-5">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#94A3B8]">
                            Audience
                          </p>
                          <p className="mt-1 text-[#0B1220]">{formatAudience(draft.target_audience)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#94A3B8]">
                            Sent count
                          </p>
                          <p className="mt-1 text-[#0B1220]">{formatCount(draft.sent_count)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#94A3B8]">
                            Scheduled date
                          </p>
                          <p className="mt-1 text-[#0B1220]">{formatDateTime(draft.scheduled_date)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#94A3B8]">
                            Updated date
                          </p>
                          <p className="mt-1 text-[#0B1220]">{formatDateTime(draft.updated_date)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#94A3B8]">
                            Status
                          </p>
                          <p className="mt-1 text-[#0B1220]">{titleCase(draft.status)}</p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1157D8]">
                              Live recap
                            </p>
                            <p className="mt-1 text-xs font-semibold leading-5 text-[#94A3B8]">
                              Delivered uses sent count until Resend delivery webhooks are connected.
                            </p>
                          </div>
                        </div>

                        {isLoadingRecap ? (
                          <p className="mt-4 text-sm font-semibold text-[#4B5563]">
                            Loading recap...
                          </p>
                        ) : recapError ? (
                          <p className="mt-4 text-sm font-semibold text-red-600">
                            Recap unavailable.
                          </p>
                        ) : analytics ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {recapItems.map(([label, value, modalType]) =>
                              modalType ? (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => openRecapModal(draft, modalType)}
                                  className="rounded-xl bg-[#F8FAFC] px-4 py-3 text-left transition hover:bg-[#EEF5FF] focus:outline-none focus:ring-2 focus:ring-[#1157D8]/25"
                                >
                                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1157D8]">
                                    {label}
                                  </p>
                                  <p className="mt-1 text-xl font-bold text-[#0B1220]">
                                    {formatCount(value)}
                                  </p>
                                </button>
                              ) : (
                                <div key={label} className="rounded-xl bg-[#F8FAFC] px-4 py-3">
                                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#94A3B8]">
                                    {label}
                                  </p>
                                  <p className="mt-1 text-xl font-bold text-[#0B1220]">
                                    {formatCount(value)}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <p className="mt-4 text-sm font-semibold text-[#4B5563]">
                            Recap unavailable.
                          </p>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/admin/newsletter/drafts/${draft.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[#1157D8] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(17,87,216,0.20)] transition hover:bg-[#0A39A8]"
                    >
                      Open campaign
                    </Link>
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {recapModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#05070D]/70 px-5 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recap-modal-title"
        >
          <button
            type="button"
            aria-label="Close recipient recap"
            onClick={() => setRecapModal(null)}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
            <div className="flex flex-col gap-4 border-b border-[#E5E7EB] bg-[#F8FAFC] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                  Live recap
                </p>
                <h2 id="recap-modal-title" className="mt-2 text-2xl font-bold tracking-tight text-[#0B1220]">
                  {recapModal.type === "opened" ? "Opened recipients" : "Clicked recipients"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-[#4B5563]">
                  {recapModal.subject}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecapModal(null)}
                className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8]/40 hover:text-[#1157D8]"
              >
                Close
              </button>
            </div>

            <div className="p-5">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                  Search recipients
                </span>
                <input
                  value={recapSearchTerm}
                  onChange={(event) => setRecapSearchTerm(event.target.value)}
                  placeholder="Search by email or name"
                  className="h-11 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0B1220] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#1157D8] focus:bg-white"
                />
              </label>

              <div className="mt-4 max-h-[55vh] overflow-auto rounded-2xl border border-[#E5E7EB]">
                {filteredModalRows.length === 0 ? (
                  <p className="px-4 py-8 text-sm font-semibold text-[#4B5563]">
                    No recipients found yet.
                  </p>
                ) : recapModal.type === "opened" ? (
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-white text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280] shadow-sm">
                      <tr>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Open count</th>
                        <th className="px-4 py-3">Opened at</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {filteredModalRows.map((recipient) => (
                        <tr key={recipient.emailLogId}>
                          <td className="px-4 py-3 font-semibold text-[#0B1220]">
                            {recipient.email || "Not set"}
                          </td>
                          <td className="px-4 py-3 text-[#4B5563]">
                            {recipient.name || "Not set"}
                          </td>
                          <td className="px-4 py-3 text-[#4B5563]">
                            {formatCount(recipient.openCount)}
                          </td>
                          <td className="px-4 py-3 text-[#4B5563]">
                            {formatDateTime(recipient.openedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-white text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280] shadow-sm">
                      <tr>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Click count</th>
                        <th className="px-4 py-3">App Store clicks</th>
                        <th className="px-4 py-3">Google Play clicks</th>
                        <th className="px-4 py-3">FOUNDER20 clicks</th>
                        <th className="px-4 py-3">Last clicked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {filteredModalRows.map((recipient) => (
                        <tr key={recipient.emailLogId}>
                          <td className="px-4 py-3 font-semibold text-[#0B1220]">
                            {recipient.email || "Not set"}
                          </td>
                          <td className="px-4 py-3 text-[#4B5563]">
                            {recipient.name || "Not set"}
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
                            {formatCount(recipient.appleFounder20Clicks)}
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
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
