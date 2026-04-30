"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setResetMessage("");

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const userId = data.session?.user.id;

      if (!userId) {
        setErrorMessage("Unable to read the signed-in user session.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("User")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError) {
        setErrorMessage(profileError.message);
        return;
      }

      router.push(profile?.role === "admin" ? "/admin" : "/account");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword() {
    setErrorMessage("");
    setResetMessage("");

    if (!email.trim()) {
      setErrorMessage("Enter your email address to reset your password.");
      return;
    }

    setIsResettingPassword(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: "https://www.elitepocketpt.com/reset-password",
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setResetMessage("Password reset link sent. Check your email.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send reset email.");
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-5 py-12 text-[#111827]">
      <section className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-[0_22px_64px_rgba(15,23,42,0.1)]">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
            Elite Pocket PT
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#0B1220]">
            Log in
          </h1>
          <p className="mt-3 text-sm font-medium text-[#4B5563]">
            Access your training system.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-[#374151]">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-14 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-base outline-none transition focus:border-[#1157D8] focus:ring-4 focus:ring-[#1157D8]/10"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[#374151]">Password</span>
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-14 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-base outline-none transition focus:border-[#1157D8] focus:ring-4 focus:ring-[#1157D8]/10"
              placeholder="Your password"
            />
          </label>

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isResettingPassword}
            className="text-sm font-semibold text-[#1157D8] transition hover:text-[#0A39A8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isResettingPassword ? "Sending reset link..." : "Forgot password?"}
          </button>

          {errorMessage && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {errorMessage}
            </p>
          )}

          {resetMessage && (
            <p className="rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#1157D8]">
              {resetMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="h-14 w-full rounded-2xl bg-[#1157D8] px-6 text-base font-bold text-white transition hover:bg-[#0A39A8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Signing in..." : "Log in"}
          </button>
        </form>
      </section>
    </main>
  );
}
