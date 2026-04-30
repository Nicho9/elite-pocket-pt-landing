"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabaseClient";

type UserProfile = {
  full_name: string | null;
  email: string | null;
  subscription_status: string | null;
  onboarding_completed: boolean | null;
  subscription_tier: string | null;
};

function formatValue(value: string | boolean | null | undefined) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return value || "Not set";
}

export default function AccountPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
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

      const { data, error } = await supabase
        .from("User")
        .select("full_name,email,subscription_status,onboarding_completed,subscription_tier")
        .eq("id", session.user.id)
        .single();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
      } else {
        setProfile(data);
      }

      setIsLoading(false);
    }

    loadAccount();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  async function handleSignOut() {
    setIsSigningOut(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      setIsSigningOut(false);
      return;
    }

    router.push("/login");
  }

  const accountRows = [
    ["Full name", formatValue(profile?.full_name)],
    ["Email", formatValue(profile?.email)],
    ["Subscription status", formatValue(profile?.subscription_status)],
    ["Onboarding completed", formatValue(profile?.onboarding_completed)],
    ["Subscription tier", formatValue(profile?.subscription_tier)],
    ["Programme status", "Programme setup pending"],
  ];

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-5 py-12 text-[#111827]">
      <section className="mx-auto w-full max-w-5xl">
        <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-[0_22px_64px_rgba(15,23,42,0.1)] sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
                Elite Pocket PT
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
                Account
              </h1>
              <p className="mt-3 max-w-2xl text-base font-medium text-[#4B5563]">
                Manage your access, programme status and billing details.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="h-12 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#374151] transition hover:border-[#1157D8] hover:text-[#1157D8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>

          {errorMessage && (
            <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {errorMessage}
            </p>
          )}

          {isLoading ? (
            <p className="mt-8 rounded-2xl bg-[#F8FAFC] px-4 py-5 text-sm font-semibold text-[#4B5563]">
              Loading account...
            </p>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {accountRows.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-5"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                    {label}
                  </p>
                  <p className="mt-3 text-base font-semibold text-[#0B1220]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="h-14 rounded-2xl bg-[#1157D8] px-6 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,87,216,0.24)] transition hover:bg-[#0A39A8]"
            >
              Manage billing
            </button>
            <p className="flex items-center text-sm font-medium text-[#6B7280]">
              Billing management will be connected before launch.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
