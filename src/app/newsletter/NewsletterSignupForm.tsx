"use client";

import { FormEvent, useState } from "react";

type NewsletterStatus = "idle" | "loading" | "success" | "error";

export default function NewsletterSignupForm() {
  const [newsletterName, setNewsletterName] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<NewsletterStatus>("idle");
  const [newsletterMessage, setNewsletterMessage] = useState("");

  async function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = newsletterName.trim();
    const trimmedEmail = newsletterEmail.trim().toLowerCase();

    setNewsletterStatus("idle");
    setNewsletterMessage("");

    if (!trimmedName) {
      setNewsletterStatus("error");
      setNewsletterMessage("Full name is required.");
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setNewsletterStatus("error");
      setNewsletterMessage("A valid email is required.");
      return;
    }

    setNewsletterStatus("loading");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          referralSource: "landing_newsletter_signup",
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        code?: string;
        error?: string;
      };

      if (response.ok && payload.success) {
        setNewsletterStatus("success");
        setNewsletterMessage("You’re on the newsletter list.");
        setNewsletterName("");
        setNewsletterEmail("");
        return;
      }

      if (payload.code === "duplicate_email") {
        setNewsletterStatus("success");
        setNewsletterMessage("You’re already on the newsletter list.");
        return;
      }

      setNewsletterStatus("error");
      setNewsletterMessage(payload.error || "Could not join the newsletter.");
    } catch {
      setNewsletterStatus("error");
      setNewsletterMessage("Could not join the newsletter.");
    }
  }

  return (
    <form
      onSubmit={handleNewsletterSubmit}
      className="relative grid gap-4 overflow-hidden rounded-[2rem] border border-[#6EA8FF]/45 bg-[#101824] p-6 shadow-[0_28px_90px_rgba(17,87,216,0.24)] ring-1 ring-[#1157D8]/25 sm:p-8"
    >
      <div className="absolute inset-x-8 top-0 h-1 rounded-b-full bg-[linear-gradient(90deg,transparent,#1D6AE5,#6EA8FF,#1D6AE5,transparent)]" />
      <div className="pb-1">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Sign up to the free newsletter
        </h2>
        <p className="mt-3 text-sm font-medium leading-6 text-white/68 sm:text-base">
          Enter your details below and I’ll send each new edition directly to your inbox.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <label className="grid gap-2 text-sm font-bold text-white/88">
          Full name
          <input
            value={newsletterName}
            onChange={(event) => setNewsletterName(event.target.value)}
            disabled={newsletterStatus === "loading"}
            autoComplete="name"
            placeholder="Your name"
            className="h-14 rounded-2xl border border-white/14 bg-[#151B23] px-5 text-base font-medium text-white outline-none transition placeholder:text-white/38 focus:border-[#6EA8FF] focus:ring-4 focus:ring-[#1157D8]/25 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-white/88">
          Email
          <input
            type="email"
            value={newsletterEmail}
            onChange={(event) => setNewsletterEmail(event.target.value)}
            disabled={newsletterStatus === "loading"}
            autoComplete="email"
            placeholder="you@example.com"
            className="h-14 rounded-2xl border border-white/14 bg-[#151B23] px-5 text-base font-medium text-white outline-none transition placeholder:text-white/38 focus:border-[#6EA8FF] focus:ring-4 focus:ring-[#1157D8]/25 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={newsletterStatus === "loading"}
        className="min-h-14 cursor-pointer rounded-full border border-[#8DBBFF]/50 bg-[linear-gradient(180deg,#1D6AE5_0%,#1157D8_100%)] px-7 py-4 text-base font-extrabold text-white shadow-[0_16px_42px_rgba(17,87,216,0.38)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DBBFF]/70 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {newsletterStatus === "loading" ? "Joining..." : "Sign up to the newsletter"}
      </button>
      <p className="text-sm font-semibold leading-6 text-white/60">
        No spam. Just useful coaching, app updates, and offers.
      </p>
      {newsletterMessage && (
        <p
          aria-live="polite"
          className={`rounded-xl px-4 py-3 text-sm font-semibold ${
            newsletterStatus === "error"
              ? "border border-red-400/25 bg-red-500/10 text-red-100"
              : "border border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {newsletterMessage}
        </p>
      )}
    </form>
  );
}
