"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../../lib/supabaseClient";

type TransformationSignup = {
  id: string;
  full_name: string | null;
  email: string | null;
  referral_source: string | null;
  payment_status: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string | null;
  paid_at: string | null;
};

type TransformationsResponse =
  | {
      success: true;
      signups: TransformationSignup[];
    }
  | {
      success: false;
      error: string;
    };

function formatCount(value: number) {
  return value.toLocaleString();
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

function formatPaymentStatus(value: string | null) {
  if (value === "paid") {
    return "Paid";
  }

  if (value === "pending") {
    return "Pending";
  }

  return formatValue(value)
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function AdminTransformationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [signups, setSignups] = useState<TransformationSignup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTransformationSignups() {
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
        const response = await fetch("/api/admin/transformations", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const payload = (await response.json()) as TransformationsResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok || !payload.success) {
          setErrorMessage(payload.success ? "Could not load transformation signups." : payload.error);
          setSignups([]);
        } else {
          setSignups(payload.signups);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load transformation signups.",
          );
          setSignups([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTransformationSignups();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  const paidCount = signups.filter((signup) => signup.payment_status === "paid").length;
  const pendingCount = signups.filter((signup) => signup.payment_status === "pending").length;

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-5 py-12 text-[#111827]">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
              Elite Pocket PT
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
              Elite 8-week Transformation signups
            </h1>
            <p className="max-w-2xl text-base font-medium text-[#4B5563]">
              Review programme signup records and payment status.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex h-11 w-fit items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8]/40 hover:text-[#1157D8]"
          >
            Back to admin
          </Link>
        </div>

        {errorMessage && (
          <p className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
              Total signups
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220]">
              {isLoading ? "..." : formatCount(signups.length)}
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
              Paid
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220]">
              {isLoading ? "..." : formatCount(paidCount)}
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
              Pending
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220]">
              {isLoading ? "..." : formatCount(pendingCount)}
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[#E5E7EB] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[#E5E7EB] px-5 py-4">
            <h2 className="text-lg font-bold text-[#0B1220]">Signups</h2>
            <p className="mt-1 text-sm font-medium text-[#6B7280]">
              New records are created as pending until Stripe webhook support updates paid status.
            </p>
          </div>

          {isLoading ? (
            <p className="px-5 py-8 text-sm font-semibold text-[#4B5563]">
              Loading transformation signups...
            </p>
          ) : signups.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead className="bg-[#F8FAFC] text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                  <tr>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Paid</th>
                    <th className="px-5 py-4">How they heard about us</th>
                    <th className="px-5 py-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {signups.map((signup) => (
                    <tr key={signup.id} className="text-sm font-semibold text-[#374151]">
                      <td className="px-5 py-4 text-[#0B1220]">
                        {formatValue(signup.full_name)}
                      </td>
                      <td className="px-5 py-4">{formatValue(signup.email)}</td>
                      <td className="px-5 py-4">{formatPaymentStatus(signup.payment_status)}</td>
                      <td className="px-5 py-4">{formatValue(signup.referral_source)}</td>
                      <td className="px-5 py-4">{formatDateTime(signup.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10">
              <h2 className="text-xl font-bold text-[#0B1220]">
                No transformation signups yet.
              </h2>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
