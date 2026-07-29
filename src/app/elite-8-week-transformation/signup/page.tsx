"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type CheckoutStatus = "idle" | "loading" | "error";

export default function EliteEightWeekTransformationSignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    setCheckoutStatus("idle");
    setErrorMessage("");

    if (!trimmedName) {
      setCheckoutStatus("error");
      setErrorMessage("Full name is required.");
      return;
    }

    if (!trimmedEmail) {
      setCheckoutStatus("error");
      setErrorMessage("Email is required.");
      return;
    }

    if (password.length < 8) {
      setCheckoutStatus("error");
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setCheckoutStatus("error");
      setErrorMessage("Confirm password must match password.");
      return;
    }

    setCheckoutStatus("loading");

    try {
      const response = await fetch("/api/stripe/create-transformation-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password,
        }),
      });
      const result = (await response.json()) as { success?: boolean; url?: string; error?: string };

      if (response.ok && result.success && result.url) {
        window.location.href = result.url;
        return;
      }

      setCheckoutStatus("error");
      setErrorMessage(result.error || "Could not start checkout. Please try again.");
    } catch {
      setCheckoutStatus("error");
      setErrorMessage("Could not start checkout. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB] text-[#111827]">
      <section className="overflow-hidden bg-[#0B1220] px-5 py-6 text-white sm:py-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur">
            <Link href="/" className="text-base font-bold tracking-tight text-white transition hover:text-[#9BC4FF]">
              Elite Pocket PT
            </Link>
            <Link href="/elite-8-week-transformation" className="text-sm font-bold text-[#9BC4FF] transition hover:text-white">
              Back to programme
            </Link>
          </header>

          <div className="grid gap-8 py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.72fr)] lg:items-start lg:py-20">
            <div>
              <p className="inline-flex rounded-full border border-[#6EA8FF]/25 bg-[#1157D8]/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#9BC4FF]">
                ELITE POCKET PT PROGRAMME
              </p>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Join the Elite 8-week Transformation
              </h1>
              <p className="mt-6 max-w-3xl text-lg font-medium leading-8 text-[#D7E4FF] sm:text-xl">
                Create your account, then continue to secure checkout for the one-off programme payment.
              </p>

              <div className="mt-8 rounded-[2rem] border border-[#6EA8FF]/20 bg-white/[0.06] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)] ring-1 ring-white/10 sm:p-8">
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#9BC4FF]">
                  Programme summary
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
                  Elite 8-week Transformation
                </h2>
                <div className="mt-6 grid gap-3 text-sm font-semibold leading-6 text-[#D7E4FF]">
                  <p>£200 one-off payment</p>
                  <p>8 weeks</p>
                  <p>Next transformation starts Monday 7 September 2026</p>
                  <p>Onboarding call Sunday 6 September 2026</p>
                  <p>
                    Includes app access, training, nutrition, progress tracking,
                    accountability, private WhatsApp cohort group, and educational webinar access.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6 text-[#111827] shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-8">
              <h2 className="text-2xl font-bold tracking-tight text-[#0B1220]">
                Secure signup
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#4B5563]">
                Enter your details to create your account before checkout.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                    Full name
                  </span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={checkoutStatus === "loading"}
                    placeholder="Your name"
                    className="h-12 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0B1220] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#1157D8] focus:bg-white disabled:cursor-wait disabled:opacity-70"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={checkoutStatus === "loading"}
                    placeholder="you@example.com"
                    className="h-12 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0B1220] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#1157D8] focus:bg-white disabled:cursor-wait disabled:opacity-70"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                    Password
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={checkoutStatus === "loading"}
                    placeholder="Minimum 8 characters"
                    className="h-12 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0B1220] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#1157D8] focus:bg-white disabled:cursor-wait disabled:opacity-70"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                    Confirm password
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={checkoutStatus === "loading"}
                    placeholder="Repeat your password"
                    className="h-12 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#0B1220] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#1157D8] focus:bg-white disabled:cursor-wait disabled:opacity-70"
                  />
                </label>

                {errorMessage && (
                  <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={checkoutStatus === "loading"}
                  className="h-12 rounded-xl bg-[#1157D8] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(17,87,216,0.22)] transition hover:bg-[#0A39A8] disabled:cursor-wait disabled:opacity-70"
                >
                  {checkoutStatus === "loading" ? "Starting checkout..." : "Continue to secure checkout"}
                </button>
              </form>

              <Link
                href="/elite-8-week-transformation"
                className="mt-4 inline-flex w-full justify-center rounded-xl border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8]/40 hover:text-[#1157D8]"
              >
                Back to programme details
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
