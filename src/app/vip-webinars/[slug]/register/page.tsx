"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../../../lib/supabaseClient";

type WebinarRecord = Record<string, unknown>;

type RegistrationResponse = {
  success?: unknown;
  error?: unknown;
};

function readString(record: WebinarRecord | null, keys: string[]) {
  if (!record) {
    return "";
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export default function FreeWebinarRegistrationPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [webinar, setWebinar] = useState<WebinarRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const slug = params.slug;

  useEffect(() => {
    let isMounted = true;

    async function loadWebinar() {
      setIsLoading(true);
      setIsUnavailable(false);

      const { data, error } = await supabase
        .from("vip_webinars")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (!isMounted) {
        return;
      }

      if (error || !data || readString(data, ["access_tier"]).toLowerCase() !== "free") {
        setIsUnavailable(true);
        setIsLoading(false);
        return;
      }

      setWebinar(data);
      setIsLoading(false);
    }

    loadWebinar();

    return () => {
      isMounted = false;
    };
  }, [slug, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmitError("");

    if (!newsletterConsent) {
      setSubmitError("Newsletter consent is required to register for this free webinar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/webinar-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, newsletterConsent }),
      });
      let result: RegistrationResponse = {};

      try {
        result = (await response.json()) as RegistrationResponse;
      } catch {
        // Use the generic error below when the response is not JSON.
      }

      if (!response.ok || result.success !== true) {
        setSubmitError(
          typeof result.error === "string" ? result.error : "We could not register you. Please try again.",
        );
        setIsSubmitting(false);
        return;
      }

      router.push(`/vip-webinars/${encodeURIComponent(slug)}`);
    } catch {
      setSubmitError("We could not register you. Please try again.");
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#F5F7FB] px-5 py-10 text-[#111827] sm:py-14">
        <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-[#E5E7EB] bg-white p-8 text-center shadow-[0_22px_64px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold text-[#4B5563]">Loading webinar registration...</p>
        </div>
      </main>
    );
  }

  if (isUnavailable || !webinar) {
    return (
      <main className="min-h-screen bg-[#F5F7FB] px-5 py-10 text-[#111827] sm:py-14">
        <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-[#E5E7EB] bg-white p-8 text-center shadow-[0_22px_64px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1157D8]">Webinar registration</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220]">Registration is not available</h1>
          <p className="mt-4 text-base font-medium leading-7 text-[#4B5563]">
            This webinar is not currently available for free registration.
          </p>
          <Link
            href="/vip-webinars"
            className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl bg-[#1157D8] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(17,87,216,0.22)] transition hover:bg-[#0A39A8]"
          >
            Back to webinars
          </Link>
        </div>
      </main>
    );
  }

  const title = readString(webinar, ["title", "name"]) || "Free webinar";
  const description = readString(webinar, ["description", "summary", "intro"]);

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-5 py-10 text-[#111827] sm:py-14">
      <div className="mx-auto w-full max-w-xl">
        <Link href="/vip-webinars" className="text-sm font-bold text-[#1157D8] transition hover:text-[#0A39A8]">
          ← Back to webinars
        </Link>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-[0_22px_64px_rgba(15,23,42,0.10)]">
          <div className="bg-[linear-gradient(135deg,#FFFFFF_0%,#EEF4FF_70%,#F7FAFC_100%)] p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1157D8]">Free webinar</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">Get free access</h1>
            <h2 className="mt-4 text-xl font-bold text-[#0B1220]">{title}</h2>
            <p className="mt-4 text-base font-medium leading-7 text-[#4B5563]">
              Register for free access to this webinar and receive Elite Pocket PT education and updates by email.
            </p>
            {description && <p className="mt-3 text-sm font-medium leading-6 text-[#64748B]">{description}</p>}
            <p className="mt-4 text-sm font-bold text-[#14532D]">No payment is required.</p>
          </div>

          <form onSubmit={handleSubmit} className="border-t border-[#E5E7EB] p-6 sm:p-8">
            <div className="grid gap-5">
              <div>
                <label htmlFor="webinar-registration-name" className="text-sm font-bold text-[#0B1220]">
                  Name
                </label>
                <input
                  id="webinar-registration-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base text-[#0B1220] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                />
              </div>

              <div>
                <label htmlFor="webinar-registration-email" className="text-sm font-bold text-[#0B1220]">
                  Email address
                </label>
                <input
                  id="webinar-registration-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border border-[#D8E1F0] bg-white px-4 text-base text-[#0B1220] outline-none transition placeholder:text-[#94A3B8] focus:border-[#1157D8] focus:ring-2 focus:ring-[#1157D8]/20"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#F8FAFC] p-4 text-sm font-medium leading-6 text-[#4B5563]">
                <input
                  type="checkbox"
                  required
                  checked={newsletterConsent}
                  onChange={(event) => setNewsletterConsent(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-[#94A3B8] text-[#1157D8] focus:ring-[#1157D8]"
                />
                <span>I agree to receive Elite Pocket PT education, webinar updates and emails.</span>
              </label>
            </div>

            {submitError && (
              <p aria-live="polite" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 h-12 w-full rounded-2xl bg-[#1157D8] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(17,87,216,0.22)] transition hover:bg-[#0A39A8] disabled:cursor-not-allowed disabled:bg-[#9CA3AF] disabled:shadow-none"
            >
              {isSubmitting ? "Registering..." : "Get free access"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
