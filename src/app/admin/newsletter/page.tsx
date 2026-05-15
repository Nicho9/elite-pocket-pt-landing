"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../../lib/supabaseClient";

type NewsletterLead = {
  id: string;
  name: string | null;
  email: string | null;
  referral_source: string | null;
  created_at: string | null;
};

type NewsletterSummary = {
  totalLeads: number;
  draftCount: number;
  pendingEmailCount: number;
  sentEmailCount: number;
  latestLeads: NewsletterLead[];
};

type NewsletterSummaryResponse =
  | {
      success: true;
      summary: NewsletterSummary;
    }
  | {
      success: false;
      error: string;
    };

const kpiCards: Array<[string, keyof Omit<NewsletterSummary, "latestLeads">]> = [
  ["Total leads", "totalLeads"],
  ["Draft campaigns", "draftCount"],
  ["Pending emails", "pendingEmailCount"],
  ["Sent emails", "sentEmailCount"],
];

function formatCount(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "0";
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

function formatValue(value: string | null) {
  const trimmed = value?.trim();
  return trimmed || "Not set";
}

export default function AdminNewsletterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [summary, setSummary] = useState<NewsletterSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadNewsletterSummary() {
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
          setErrorMessage(payload.success ? "Could not load newsletter summary." : payload.error);
          setSummary(null);
        } else {
          setSummary(payload.summary);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load newsletter summary.");
          setSummary(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadNewsletterSummary();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-5 py-12 text-[#111827]">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
              Elite Pocket PT
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
              Newsletter
            </h1>
            <p className="max-w-2xl text-base font-medium text-[#4B5563]">
              Manage leads, campaigns, queued emails, and launch communications.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8]/40 hover:text-[#1157D8]"
            >
              Back to admin
            </Link>
            <Link
              href="/admin/newsletter/drafts"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8]/40 hover:text-[#1157D8]"
            >
              Drafts
            </Link>
            <Link
              href="/admin/newsletter/analytics"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8]/40 hover:text-[#1157D8]"
            >
              Analytics
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
              key={label}
              className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                {label}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220]">
                {isLoading ? "..." : formatCount(summary?.[key])}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[#E5E7EB] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[#E5E7EB] px-5 py-4">
            <h2 className="text-lg font-bold text-[#0B1220]">Latest leads</h2>
            <p className="mt-1 text-sm font-medium text-[#6B7280]">
              The newest signups from the landing page waitlist.
            </p>
          </div>

          {isLoading ? (
            <p className="px-5 py-8 text-sm font-semibold text-[#4B5563]">
              Loading newsletter summary...
            </p>
          ) : summary?.latestLeads.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-[#F8FAFC] text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                  <tr>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Source</th>
                    <th className="px-5 py-4">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {summary.latestLeads.map((lead) => (
                    <tr key={lead.id} className="text-sm font-semibold text-[#374151]">
                      <td className="px-5 py-4 text-[#0B1220]">{formatValue(lead.name)}</td>
                      <td className="px-5 py-4">{formatValue(lead.email)}</td>
                      <td className="px-5 py-4">{formatValue(lead.referral_source)}</td>
                      <td className="px-5 py-4">{formatDateTime(lead.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10">
              <h2 className="text-xl font-bold text-[#0B1220]">No leads yet</h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#4B5563]">
                Waitlist signups will appear here once visitors join the early access list.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
