import type { Metadata } from "next";
import Link from "next/link";
import NewsletterSignupForm from "./NewsletterSignupForm";

export const metadata: Metadata = {
  title: "Elite Pocket PT Newsletter | Training, Nutrition and Coaching Advice",
  description:
    "Join Coach Mike Nicholson for practical, evidence-based guidance on training, nutrition, recovery, body composition and long-term health.",
};

const benefits = [
  {
    title: "Evidence-based",
    body: "Clear guidance grounded in sports science, nutrition research and proven coaching principles.",
  },
  {
    title: "Practical and direct",
    body: "Useful actions you can apply to your training, nutrition and recovery without unnecessary complexity.",
  },
  {
    title: "Built around real coaching experience",
    body: "Lessons shaped by more than 20 years of coaching athletes and everyday people.",
  },
];

export default function NewsletterPage() {
  return (
    <div className="min-h-screen bg-[#080A0D] text-white">
      <nav className="fixed left-0 top-0 z-50 w-full border-b border-white/70 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5">
          <Link href="/" className="text-base font-bold tracking-tight text-[#0B1220]">
            Elite Pocket PT
          </Link>

          <div className="hidden items-center gap-8 text-sm font-semibold text-[#374151] md:flex">
            <Link href="/#how-it-works" className="transition hover:text-[#1157D8]">
              How It Works
            </Link>
            <Link href="/#system" className="transition hover:text-[#1157D8]">
              System
            </Link>
            <Link href="/#pricing" className="transition hover:text-[#1157D8]">
              Pricing
            </Link>
            <Link href="/vip-webinars" className="transition hover:text-[#1157D8]">
              VIP Webinars
            </Link>
            <Link
              href="/newsletter"
              aria-current="page"
              className="text-[#1157D8]"
            >
              Newsletter
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <details className="relative md:hidden">
              <summary className="cursor-pointer list-none rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] shadow-sm">
                Menu
              </summary>
              <div className="absolute right-0 top-12 grid w-56 gap-1 rounded-2xl border border-[#E5E7EB] bg-white p-3 text-sm font-bold text-[#0B1220] shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
                <Link href="/#how-it-works" className="rounded-xl px-3 py-3 hover:bg-[#F5F7FB]">
                  How It Works
                </Link>
                <Link href="/#system" className="rounded-xl px-3 py-3 hover:bg-[#F5F7FB]">
                  System
                </Link>
                <Link href="/#pricing" className="rounded-xl px-3 py-3 hover:bg-[#F5F7FB]">
                  Pricing
                </Link>
                <Link href="/vip-webinars" className="rounded-xl px-3 py-3 hover:bg-[#F5F7FB]">
                  VIP Webinars
                </Link>
                <Link
                  href="/newsletter"
                  aria-current="page"
                  className="rounded-xl bg-[#EAF2FF] px-3 py-3 text-[#1157D8]"
                >
                  Newsletter
                </Link>
              </div>
            </details>
            <Link href="/login" className="text-sm font-semibold text-[#374151] transition hover:text-[#1157D8]">
              Login
            </Link>
            <Link
              href="/#get-started"
              className="hidden rounded-full bg-[#1157D8] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(17,87,216,0.24)] transition hover:bg-[#0A39A8] sm:inline-flex"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="overflow-hidden px-5 pb-16 pt-28 sm:pb-20 sm:pt-32">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.72fr)] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#6EA8FF]">
                ELITE POCKET PT NEWSLETTER
              </p>
              <h1 className="mt-5 max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.08]">
                Practical training and nutrition advice that actually helps.
              </h1>
              <p className="mt-6 max-w-3xl text-lg font-medium leading-8 text-white/68 sm:text-xl">
                Join Coach Mike for evidence-based guidance on training, nutrition, recovery, body composition and long-term health — delivered directly to your inbox.
              </p>
            </div>
            <NewsletterSignupForm />
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#0E1319] px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 md:grid-cols-3">
              {benefits.map((benefit) => (
                <article
                  key={benefit.title}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.2)] sm:p-7"
                >
                  <div className="mb-5 h-1 w-12 rounded-full bg-[#1157D8]" />
                  <h2 className="text-xl font-bold text-white">{benefit.title}</h2>
                  <p className="mt-3 text-base font-medium leading-7 text-white/62">
                    {benefit.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#6EA8FF]/25 bg-[linear-gradient(145deg,#111A28_0%,#0B111A_100%)] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#6EA8FF]">
              Written by Coach Mike Nicholson
            </p>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              M.Sc Sports Nutrition, PGCE, BA (Hons) Sports Performance
            </h2>
            <p className="mt-4 text-lg font-semibold text-white/72">
              Performance Dietitian | Strength &amp; Conditioning Coach
            </p>
            <p className="mt-3 text-base font-medium text-white/56">
              Creator of the Elite Pocket PT Coaching System
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#0E1319] px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-semibold text-white/62">
          <Link href="/privacy" className="transition hover:text-[#6EA8FF]">
            Privacy Policy
          </Link>
          <Link href="/terms" className="transition hover:text-[#6EA8FF]">
            Terms
          </Link>
          <Link href="/delete-account" className="transition hover:text-[#6EA8FF]">
            Delete Account
          </Link>
          <Link href="/support" className="transition hover:text-[#6EA8FF]">
            Support
          </Link>
        </div>
      </footer>
    </div>
  );
}
