"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabaseClient";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRecoverySession() {
      setErrorMessage("");
      setIsSessionReady(false);

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const code = searchParams.get("code");

      if (tokenHash) {
        if (type !== "recovery") {
          setErrorMessage("Invalid password reset link. Please request a new reset email.");
          return;
        }

        const { error } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
          return;
        }
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (!data.session) {
        setErrorMessage("Password reset session not found. Please request a new reset email and use the latest link.");
        return;
      }

      setIsSessionReady(true);
    }

    loadRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [searchParams, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setSuccessMessage("Your password has been updated.");
    setPassword("");
    setConfirmPassword("");
    setIsLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-5 py-12 text-[#111827]">
      <section className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-[0_22px_64px_rgba(15,23,42,0.1)]">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
            Elite Pocket PT
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#0B1220]">
            Reset password
          </h1>
          <p className="mt-3 text-sm font-medium text-[#4B5563]">
            Choose a new password for your account.
          </p>
        </div>

        {errorMessage && (
          <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </p>
        )}

        {successMessage ? (
          <div className="mt-6 rounded-2xl bg-[#F8FAFC] p-4 text-center">
            <p className="text-sm font-semibold text-[#0B1220]">{successMessage}</p>
            <Link
              href="/login"
              className="mt-4 inline-flex h-12 items-center justify-center rounded-2xl bg-[#1157D8] px-6 text-sm font-bold text-white transition hover:bg-[#0A39A8]"
            >
              Go to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">New password</span>
              <input
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 h-14 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-base outline-none transition focus:border-[#1157D8] focus:ring-4 focus:ring-[#1157D8]/10"
                placeholder="New password"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">Confirm password</span>
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 h-14 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-base outline-none transition focus:border-[#1157D8] focus:ring-4 focus:ring-[#1157D8]/10"
                placeholder="Confirm password"
              />
            </label>

            <button
              type="submit"
              disabled={isLoading || !isSessionReady}
              className="h-14 w-full rounded-2xl bg-[#1157D8] px-6 text-base font-bold text-white transition hover:bg-[#0A39A8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-5 py-12 text-[#111827]">
          <section className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-[0_22px_64px_rgba(15,23,42,0.1)]">
            <p className="text-sm font-semibold text-[#4B5563]">Loading reset form...</p>
          </section>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
