"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const iosAppStoreHref = "https://apps.apple.com/ae/app/elite-pocket-pt/id6761879840";
const appleFreeTrialHref =
  "https://apps.apple.com/redeem?ctx=offercodes&id=6761879840&code=3DAYFREE";

type SystemPillarImageLayout = "standard" | "health" | "single";

type SystemPillar = {
  title: string;
  headline: string;
  bullets: string[];
  images: Array<{ src: string; alt: string }>;
  imageLayout: SystemPillarImageLayout;
  reverse: boolean;
};

const systemPillars: SystemPillar[] = [
  {
    title: "Training",
    headline: "Structured training built for progression",
    bullets: [
      "Programme generator based on your level, schedule and goals",
      "Built across Base, Build and Perform phases",
      "Completed sessions, weights, sets, reps and progression in one training history",
      "Strength assessment, training load and workout feedback to guide your next steps",
    ],
    images: [
      { src: "/hero/workout-pageV2.png", alt: "Elite Pocket PT workout programme screen" },
      { src: "/hero/workout-logV2.png", alt: "Elite Pocket PT workout logging screen" },
      { src: "/hero/strength-assessmentV2.png", alt: "Elite Pocket PT strength assessment screen" },
    ],
    imageLayout: "standard",
    reverse: false,
  },
  {
    title: "Nutrition",
    headline: "Practical nutrition that fits your lifestyle",
    bullets: [
      "Personalised nutrition targets and meal plans based on goals and preferences",
      "Flexible logging: photo, voice, database or meal plan",
      "Built around training demands and real-world habits",
    ],
    images: [
      { src: "/hero/nutrition-pageV2.png", alt: "Elite Pocket PT nutrition dashboard" },
      { src: "/hero/my-meal-planV2.png", alt: "Personalised Elite Pocket PT meal plan" },
      { src: "/hero/food-log-imageV2.png", alt: "Elite Pocket PT photo food logging screen" },
    ],
    imageLayout: "standard",
    reverse: true,
  },
  {
    title: "Elite Health",
    headline: "Understand more than today’s workout",
    bullets: [
      "Follow recovery, sleep and health trends alongside your performance",
      "Track Health Age and Elite Balance to understand the bigger picture",
      "See the health context behind your performance, including Elite Readiness",
    ],
    images: [
      { src: "/hero/health-dashboardV2.png", alt: "Elite Pocket PT Health dashboard" },
      { src: "/hero/elite-readiness-scoreV2.png", alt: "Elite Readiness Score" },
      { src: "/hero/elite-health-ageV2.png", alt: "Elite Health Age" },
      { src: "/hero/elite-sleep-scoreV2.png", alt: "Elite Sleep Score" },
      { src: "/hero/elite-balance-scoreV2.png", alt: "Elite Balance Score" },
    ],
    imageLayout: "health",
    reverse: false,
  },
  {
    title: "Your Diary",
    headline: "Your daily command centre",
    bullets: [
      "Everything you need today, in one place",
      "Training. Nutrition. Health. Recovery. Progress.",
      "Know what needs your attention without jumping between screens",
    ],
    images: [
      { src: "/hero/Home-PageV2.PNG", alt: "Daily Elite Pocket PT diary and home screen" },
    ],
    imageLayout: "single",
    reverse: true,
  },
  {
    title: "Performance",
    headline: "More than workouts — build a complete athlete",
    bullets: [
      "Core & Stability and mobility flows tailored to your needs",
      "Build strength, movement quality and physical resilience",
      "Stay engaged through progress tracking and the Elite community",
    ],
    images: [
      { src: "/hero/Core-and-stabilityV2.PNG", alt: "Elite Pocket PT Core and Stability screen" },
      { src: "/hero/mobility-flow-playerV2.png", alt: "Elite Pocket PT mobility flow player" },
      { src: "/hero/community-pageV2.PNG", alt: "Elite Pocket PT community screen" },
    ],
    imageLayout: "standard",
    reverse: false,
  },
];

const coachMikeImages = [
  "/hero/coach-mike-profile.png",
  "/hero/coach-mike-competitor.png",
  "/hero/coach-mike-athlete.png",
];

type CheckoutPlan = "full_app" | "vip";
type CheckoutStatus = "idle" | "loading" | "error";

export default function Home() {
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const [activeCoachImage, setActiveCoachImage] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<CheckoutPlan | null>(null);
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutPassword, setCheckoutPassword] = useState("");
  const [checkoutConfirmPassword, setCheckoutConfirmPassword] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>("idle");
  const [checkoutErrorMessage, setCheckoutErrorMessage] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveCoachImage((current) => (current + 1) % coachMikeImages.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

  function handleToggleHeroSound() {
    const video = heroVideoRef.current;
    if (!video) return;

    const nextSoundEnabled = !soundEnabled;
    video.muted = !nextSoundEnabled;
    setSoundEnabled(nextSoundEnabled);

    if (video.paused) {
      void video.play().catch(() => {
        video.muted = true;
        setSoundEnabled(false);
      });
    }
  }

  function openCheckout(plan: CheckoutPlan) {
    setSelectedCheckoutPlan(plan);
    setCheckoutStatus("idle");
    setCheckoutErrorMessage("");
  }

  function closeCheckout() {
    if (checkoutStatus === "loading") return;

    setSelectedCheckoutPlan(null);
    setCheckoutStatus("idle");
    setCheckoutErrorMessage("");
    setCheckoutPassword("");
    setCheckoutConfirmPassword("");
  }

  async function handleCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = checkoutName.trim();
    const trimmedEmail = checkoutEmail.trim().toLowerCase();

    setCheckoutStatus("idle");
    setCheckoutErrorMessage("");

    if (!trimmedName) {
      setCheckoutStatus("error");
      setCheckoutErrorMessage("Full name is required.");
      return;
    }

    if (!trimmedEmail) {
      setCheckoutStatus("error");
      setCheckoutErrorMessage("Email is required.");
      return;
    }

    if (checkoutPassword.length < 8) {
      setCheckoutStatus("error");
      setCheckoutErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (checkoutPassword !== checkoutConfirmPassword) {
      setCheckoutStatus("error");
      setCheckoutErrorMessage("Passwords do not match.");
      return;
    }

    if (!selectedCheckoutPlan) {
      setCheckoutStatus("error");
      setCheckoutErrorMessage("Please select a checkout plan to continue.");
      return;
    }

    setCheckoutStatus("loading");

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password: checkoutPassword,
          plan: selectedCheckoutPlan,
        }),
      });

      const result: unknown = await response.json();
      const checkoutUrl =
        typeof result === "object" &&
        result !== null &&
        "url" in result &&
        typeof result.url === "string"
          ? result.url
          : "";
      const apiError =
        typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string"
          ? result.error
          : "";

      if (response.ok && checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      setCheckoutStatus("error");
      setCheckoutErrorMessage(apiError || "Could not start checkout. Please try again.");
    } catch {
      setCheckoutStatus("error");
      setCheckoutErrorMessage("Could not start checkout. Please try again.");
    }
  }

  const checkoutPlanLabel =
    selectedCheckoutPlan === "vip" ? "VIP Coaching" : "Full App Access";
  const checkoutTitle =
    selectedCheckoutPlan === "vip"
      ? "Create your VIP Coaching account"
      : "Create your Elite Pocket PT account";

  return (
    <>
      <nav className="fixed left-0 top-0 z-50 w-full border-b border-white/70 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5">
          <Link href="/" className="text-base font-bold tracking-tight text-[#0B1220]">
            Elite Pocket PT
          </Link>

          <div className="hidden items-center gap-8 text-sm font-semibold text-[#374151] md:flex">
            <a href="#how-it-works" className="transition hover:text-[#1157D8]">
              How It Works
            </a>
            <a href="#integrated-system" className="transition hover:text-[#1157D8]">
              System
            </a>
            <a href="#pricing" className="transition hover:text-[#1157D8]">
              Pricing
            </a>
            <Link href="/vip-webinars" className="transition hover:text-[#1157D8]">
              VIP Webinars
            </Link>
            <Link href="/newsletter" className="transition hover:text-[#1157D8]">
              Newsletter
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] shadow-sm md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              Menu
            </button>
            <Link href="/login" className="text-sm font-semibold text-[#374151] transition hover:text-[#1157D8]">
              Login
            </Link>
            <a
              href="#get-started"
              className="rounded-full bg-[#1157D8] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(17,87,216,0.24)] transition hover:bg-[#0A39A8]"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-[60] md:hidden ${
          mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Close mobile navigation"
          onClick={() => setMobileMenuOpen(false)}
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          id="mobile-navigation"
          className={`absolute right-3 top-3 flex max-h-[calc(100vh-1.5rem)] w-[min(360px,calc(100vw-1.5rem))] flex-col rounded-[2rem] border border-white/80 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.24)] transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-[calc(100%+1rem)]"
          }`}
        >
          <div className="flex items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-bold tracking-tight text-[#0B1220]"
            >
              Elite Pocket PT
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8] hover:text-[#1157D8]"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-2 text-base font-bold text-[#0B1220]">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl px-4 py-4 transition hover:bg-[#F5F7FB] hover:text-[#1157D8]"
            >
              How It Works
            </a>
            <a
              href="#integrated-system"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl px-4 py-4 transition hover:bg-[#F5F7FB] hover:text-[#1157D8]"
            >
              System
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl px-4 py-4 transition hover:bg-[#F5F7FB] hover:text-[#1157D8]"
            >
              Pricing
            </a>
            <Link
              href="/vip-webinars"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl px-4 py-4 transition hover:bg-[#F5F7FB] hover:text-[#1157D8]"
            >
              VIP Webinars
            </Link>
            <Link
              href="/newsletter"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl px-4 py-4 transition hover:bg-[#F5F7FB] hover:text-[#1157D8]"
            >
              Newsletter
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl px-4 py-4 transition hover:bg-[#F5F7FB] hover:text-[#1157D8]"
            >
              Login
            </Link>
          </div>
        </aside>
      </div>

      <main className="min-h-screen bg-[#F5F7FB] text-[#111827]">
      <section className="bg-[#080A0D] px-5 pb-12 pt-24 text-white lg:pb-16">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid items-center gap-9 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:gap-12">
            <div className="max-w-xl lg:py-6">
              <Image
                src="/elite-pocket-pt-hero-overlay-cropped.png"
                alt="Elite Pocket PT"
                width={954}
                height={308}
                className="h-auto w-64 opacity-90 sm:w-72 lg:w-80"
              />
              <h1 className="mt-5 text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-[2.15rem] lg:text-[clamp(2rem,2.2vw,2.15rem)]">
                <span className="block">TRAIN. EAT. RECOVER. PROGRESS.</span>
                <span className="mt-1 block">ALL IN ONE SYSTEM.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base font-medium leading-7 text-white/72 sm:text-lg">
                Elite Pocket PT connects your training, nutrition, health and recovery so every part of your performance works together.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={appleFreeTrialHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#8DBBFF]/50 bg-[linear-gradient(180deg,#1D6AE5_0%,#1157D8_100%)] px-7 py-3.5 text-sm font-extrabold tracking-[0.06em] text-white shadow-[0_16px_42px_rgba(17,87,216,0.42),inset_0_1px_0_rgba(255,255,255,0.2)] transition duration-200 hover:-translate-y-1 hover:brightness-110 active:translate-y-0 sm:text-base"
                >
                  START YOUR FREE TRIAL
                </a>
                <a
                  href="#integrated-system"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-bold tracking-[0.06em] text-white transition hover:border-[#8DBBFF]/60 hover:bg-white/10 sm:text-base"
                >
                  EXPLORE THE SYSTEM
                </a>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[2rem] bg-[#111418] shadow-[0_32px_100px_rgba(0,0,0,0.46)] ring-1 ring-white/[0.06] lg:-mr-4">
              <video
                ref={heroVideoRef}
                poster="/hero/landing-hero-poster.jpg"
                autoPlay
                muted={!soundEnabled}
                loop
                playsInline
                className="aspect-[16/9] w-full object-cover"
              >
                <source
                  src="/hero/landing-hero-video-mobile.mp4"
                  media="(max-width: 767px)"
                  type="video/mp4"
                />
                <source src="/hero/landing-hero-video.mp4" type="video/mp4" />
              </video>
              <button
                type="button"
                onClick={handleToggleHeroSound}
                aria-label={soundEnabled ? "Mute hero video" : "Play hero video sound"}
                className="absolute bottom-5 right-5 z-20 flex size-11 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1157D8]/30 sm:size-12"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-5 sm:size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <path d="M12 19v3" />
                  <path d="M8 22h8" />
                  {!soundEnabled && <path d="M4 4l16 16" />}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="integrated-system" className="scroll-mt-24 bg-[linear-gradient(180deg,#F5F7FB_0%,#EEF5FF_52%,#F5F7FB_100%)] px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
              Complete performance system
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl lg:text-5xl">
              ONE SYSTEM.
              <br />
              EVERYTHING CONNECTED.
            </h2>
            <p className="mt-5 text-lg font-medium leading-8 text-[#4B5563]">
              Training, nutrition, health and recovery working together — so your plan reflects the whole picture, not one isolated metric.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-7xl gap-y-10 xl:grid-cols-4 xl:gap-x-5 xl:gap-y-0">
            {[
              {
                title: "Training",
                terms: ["Structured programmes", "Progressive training", "Training load", "RPE & session feedback"],
                trace: "left-[12%] top-0 w-16",
                image: "/ep-training-card.png",
                alt: "Elite Pocket PT training screen",
              },
              {
                title: "Nutrition",
                terms: ["Personalised targets", "Food logging", "Meal planning", "Fuel for performance"],
                trace: "right-[14%] top-0 w-12",
                image: "/ep-nutrition-card.png",
                alt: "Elite Pocket PT nutrition screen",
              },
              {
                title: "Health & Recovery",
                terms: ["Sleep", "HRV", "Daily activity", "Recovery trends"],
                trace: "bottom-0 left-[18%] w-14",
                image: "/ep-health-recovery-card.png",
                alt: "Elite Pocket PT health and recovery screen",
              },
              {
                title: "Performance",
                terms: ["Elite Readiness", "Health Age", "Elite Balance", "Mobility & progress"],
                trace: "bottom-0 right-[12%] w-12",
                image: "/ep-performance-card.png",
                alt: "Elite Pocket PT performance screen",
              },
            ].map((area, index, areas) => (
              <article
                key={area.title}
                className="relative h-[300px] overflow-visible rounded-[1.6rem] border border-[#4D8BEE]/35 bg-[linear-gradient(145deg,#111923_0%,#0B1220_100%)] px-6 py-7 shadow-[0_18px_42px_rgba(15,23,42,0.18),0_0_26px_rgba(17,87,216,0.24)] sm:h-[330px] sm:px-7 xl:h-[326px] xl:px-6"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute ${area.trace} h-px bg-[linear-gradient(90deg,transparent,#3B82F6,transparent)] opacity-75 shadow-[0_0_12px_rgba(59,130,246,0.65)]`}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-[18%] left-0 h-9 w-px bg-[linear-gradient(180deg,transparent,#60A5FA,transparent)] opacity-45 shadow-[0_0_10px_rgba(96,165,250,0.5)]"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-[28%] h-7 w-px bg-[linear-gradient(180deg,transparent,#3B82F6,transparent)] opacity-50 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                />

                {index < areas.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-[-2.5rem] left-1/2 h-4 w-5 -translate-x-1/2 xl:bottom-auto xl:left-auto xl:right-[-1.25rem] xl:top-1/2 xl:h-5 xl:w-5 xl:-translate-y-1/2 xl:translate-x-0"
                  >
                    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,#60A5FA_24%,#3B82F6_58%,transparent)] shadow-[0_0_10px_rgba(59,130,246,0.78)] xl:left-0 xl:top-1/2 xl:h-px xl:w-full xl:-translate-y-1/2 xl:translate-x-0 xl:bg-[linear-gradient(90deg,transparent,#60A5FA_24%,#3B82F6_58%,transparent)]" />
                    <span className="absolute left-1/2 top-[38%] h-1 w-1 -translate-x-1/2 rounded-full bg-[#BFDBFE] shadow-[0_0_8px_rgba(96,165,250,1)] xl:left-[38%] xl:top-1/2 xl:-translate-y-1/2 xl:translate-x-0" />
                  </span>
                )}

                <div className="relative grid h-full grid-cols-[1.2fr_0.8fr] items-center gap-2.5 sm:grid-cols-[1.08fr_0.92fr] sm:gap-4">
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold tracking-tight text-white">
                      {area.title}
                    </h3>
                    <ul className="mt-5 flex flex-col items-start gap-2.5 text-left text-sm font-semibold leading-5 text-white/70">
                      {area.terms.map((term) => (
                        <li key={term} className="flex items-center gap-2.5">
                          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6] shadow-[0_0_7px_rgba(59,130,246,0.9)]" />
                          <span>{term}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex h-full items-center justify-center">
                    <div className="relative h-[210px] w-[97px] overflow-hidden rounded-[1.25rem] border border-white/15 bg-[#070A0E] shadow-[0_14px_28px_rgba(0,0,0,0.35),0_0_18px_rgba(17,87,216,0.16)] sm:h-[248px] sm:w-[114px] xl:h-[248px] xl:w-[114px]">
                      <Image
                        src={area.image}
                        alt={area.alt}
                        fill
                        sizes="(min-width: 1280px) 114px, (min-width: 640px) 114px, 101px"
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#0B1220] px-5 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#9BC4FF]">Elite Readiness</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              YOUR DATA SHOULD CHANGE SOMETHING.
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg font-medium leading-8 text-[#D7E4FF]">
              Your wearable can tell you what happened. Elite Pocket PT combines that health and recovery data with what you&apos;ve actually been doing — your training, load, RPE and nutrition.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl justify-items-center gap-7 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {[
              {
                label: "Recover",
                copy: "Your recovery and recent load suggest pulling back today.",
                image: "/hero/elite-readiness-red.png",
                alt: "Elite Readiness red state",
                accent: "text-[#F87171]",
                surface: "border-[#EF4444]/45",
                glow: "shadow-[0_20px_52px_rgba(239,68,68,0.12)]",
              },
              {
                label: "Reduced",
                copy: "You can still train, but today’s plan should reflect your current readiness.",
                image: "/hero/elite-readiness-orange.png",
                alt: "Elite Readiness orange state",
                accent: "text-[#FB923C]",
                surface: "border-[#F97316]/45",
                glow: "shadow-[0_20px_52px_rgba(249,115,22,0.12)]",
              },
              {
                label: "Primed",
                copy: "Recovery and recent training context support pushing ahead today.",
                image: "/hero/elite-readiness-green-v2.png",
                alt: "Elite Readiness primed state",
                accent: "text-[#4ADE80]",
                surface: "border-[#22C55E]/45",
                glow: "shadow-[0_20px_52px_rgba(34,197,94,0.12)]",
              },
            ].map((state) => (
              <article
                key={state.label}
                className={`flex h-full w-full max-w-sm flex-col overflow-hidden rounded-[2rem] border bg-[#10151C] p-4 lg:max-w-[18rem] ${state.surface} ${state.glow}`}
              >
                <div className="overflow-hidden rounded-[1.5rem] bg-[#090D13]">
                  <Image
                    src={state.image}
                    alt={state.alt}
                    width={1080}
                    height={1350}
                    sizes="(min-width: 1024px) 16rem, (min-width: 640px) 42vw, 90vw"
                    className="h-auto w-full"
                  />
                </div>
                <div className="px-3 pb-3 pt-6 sm:px-4">
                  <p className={`text-sm font-bold uppercase tracking-[0.22em] ${state.accent}`}>
                    {state.label}
                  </p>
                  <p className="mt-3 text-base font-medium leading-7 text-white/74">
                    {state.copy}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-14 max-w-3xl text-center">
            <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              KNOW WHAT YOUR BODY IS READY FOR TODAY.
            </h3>
            <p className="mt-4 text-lg font-medium text-[#D7E4FF]">
              The point isn&apos;t another score. It&apos;s knowing what to do with it.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              {['TRAIN', 'RECOVER', 'FUEL', 'ADJUST'].map((outcome) => (
                <span
                  key={outcome}
                  className="rounded-full border border-[#6EA8FF]/30 bg-white/[0.06] px-4 py-2 text-xs font-bold tracking-[0.18em] text-[#D7E4FF]"
                >
                  {outcome}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#080A0D] px-4 py-2 sm:px-5">
        <div className="mx-auto flex w-full max-w-7xl justify-center">
          <a
            href={appleFreeTrialHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-14 w-full max-w-md cursor-pointer items-center justify-center rounded-full border border-[#8DBBFF]/50 bg-[linear-gradient(180deg,#1D6AE5_0%,#1157D8_100%)] px-10 py-4 text-center text-lg font-extrabold text-white shadow-[0_16px_42px_rgba(17,87,216,0.42),inset_0_1px_0_rgba(255,255,255,0.2)] transition duration-200 hover:-translate-y-1 hover:brightness-110 hover:shadow-[0_22px_54px_rgba(17,87,216,0.52),inset_0_1px_0_rgba(255,255,255,0.24)] active:translate-y-0 active:scale-[0.98] active:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DBBFF]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A0D] sm:w-72"
          >
            Get your FREE 3-day trial
          </a>
        </div>
      </section>

      <section className="bg-[#080A0D] px-5 pb-14 pt-4 text-white sm:pb-16">
        <div className="mx-auto w-full max-w-7xl">
          <div id="get-started" className="mx-auto grid w-full max-w-7xl scroll-mt-24 gap-4 lg:grid-cols-4">
            <a
              href={iosAppStoreHref}
              className="group relative flex min-h-[17rem] overflow-hidden rounded-[2rem] border border-[#6EA8FF]/20 bg-[linear-gradient(145deg,#171E28_0%,#0D1218_58%,#090B0F_100%)] p-6 text-left shadow-[0_28px_80px_rgba(0,0,0,0.34)] ring-1 ring-[#1157D8]/10 transition duration-300 hover:-translate-y-1.5 hover:border-[#6EA8FF]/45 hover:shadow-[0_34px_90px_rgba(17,87,216,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1157D8]/35"
            >
              <span className="absolute -right-16 -top-16 size-40 rounded-full bg-[#1157D8]/12 blur-3xl transition group-hover:bg-[#1157D8]/18" />
              <span className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,#6EA8FF,transparent)] opacity-70" />
              <span className="absolute right-5 top-5 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-lg font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition group-hover:border-[#6EA8FF]/40 group-hover:bg-[#1157D8]/20">
                iOS
              </span>
              <span className="relative flex h-full flex-col justify-between gap-5">
                <span>
                  <span className="inline-flex w-fit rounded-full border border-[#6EA8FF]/20 bg-[#1157D8]/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#9BC4FF]">
                    IOS APP
                  </span>
                  <span className="mt-5 block text-3xl font-bold leading-tight text-white">
                    Download on iOS
                  </span>
                  <span className="mt-3 block text-sm font-medium leading-6 text-white/62">
                    Get the app from the App Store, then create your account and subscription directly in the app with Apple Pay.
                  </span>
                </span>
                <span className="inline-flex w-fit rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#1157D8] transition group-hover:bg-[#EAF2FF]">
                  Download on App Store
                </span>
              </span>
            </a>

            <button
              type="button"
              onClick={() => openCheckout("full_app")}
              className="group relative flex min-h-[17rem] overflow-hidden rounded-[2rem] border border-[#6EA8FF]/25 bg-[linear-gradient(145deg,#1A6BFF_0%,#1157D8_42%,#092763_100%)] p-6 text-left shadow-[0_30px_90px_rgba(17,87,216,0.32)] ring-1 ring-white/15 transition duration-300 hover:-translate-y-1.5 hover:border-white/35 hover:shadow-[0_38px_100px_rgba(17,87,216,0.42)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6EA8FF]/35"
            >
              <span className="absolute -right-16 -top-16 size-40 rounded-full bg-white/15 blur-3xl transition group-hover:bg-white/20" />
              <span className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)] opacity-80" />
              <span className="absolute right-5 top-5 flex size-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-lg font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                PT
              </span>
              <span className="relative flex h-full flex-col justify-between gap-5">
                <span>
                  <span className="inline-flex w-fit rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/85">
                    WEB CHECKOUT
                  </span>
                  <span className="mt-5 block text-3xl font-bold leading-tight text-white">
                    Subscribe on the Web
                  </span>
                  <span className="mt-3 block text-sm font-medium leading-6 text-white/75">
                    Create your account and start your membership through the secure Stripe checkout.
                  </span>
                </span>
                <span className="inline-flex w-fit rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#1157D8] transition group-hover:bg-[#EAF2FF]">
                  Start web checkout
                </span>
              </span>
            </button>

            <a
              href="https://play.google.com/store/apps/details?id=com.elitepocketpt.app"
              className="group relative flex min-h-[17rem] overflow-hidden rounded-[2rem] border border-[#6EA8FF]/20 bg-[linear-gradient(145deg,#121820_0%,#0B0F14_62%,#080A0D_100%)] p-6 text-left shadow-[0_28px_80px_rgba(0,0,0,0.3)] ring-1 ring-[#1157D8]/10 transition duration-300 hover:-translate-y-1.5 hover:border-[#6EA8FF]/45 hover:shadow-[0_34px_90px_rgba(17,87,216,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1157D8]/35"
            >
              <span className="absolute -right-16 -top-16 size-40 rounded-full bg-[#1157D8]/12 blur-3xl transition group-hover:bg-[#1157D8]/18" />
              <span className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,#6EA8FF,transparent)] opacity-70" />
              <span className="absolute right-5 top-5 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-lg font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition group-hover:border-[#6EA8FF]/40 group-hover:bg-[#1157D8]/20">
                GP
              </span>
              <span className="relative flex h-full flex-col justify-between gap-5">
                <span>
                  <span className="inline-flex w-fit rounded-full border border-[#6EA8FF]/20 bg-[#1157D8]/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#9BC4FF]">
                    ANDROID APP
                  </span>
                  <span className="mt-5 block text-3xl font-bold leading-tight text-white">
                    Download on Google Play
                  </span>
                  <span className="mt-3 block text-sm font-medium leading-6 text-white/62">
                    Get the app from Google Play, then create your account and subscription directly in the app.
                  </span>
                </span>
                <span className="inline-flex w-fit rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#1157D8] transition group-hover:bg-[#EAF2FF]">
                  Download on Google Play
                </span>
              </span>
            </a>

            <Link
              href="/elite-8-week-transformation"
              className="group relative flex min-h-[17rem] overflow-hidden rounded-[2rem] border border-[#6EA8FF]/25 bg-[linear-gradient(145deg,#101826_0%,#1157D8_50%,#061B45_100%)] p-6 text-left shadow-[0_30px_90px_rgba(17,87,216,0.28)] ring-1 ring-white/12 transition duration-300 hover:-translate-y-1.5 hover:border-white/35 hover:shadow-[0_38px_100px_rgba(17,87,216,0.36)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6EA8FF]/35"
            >
              <span className="absolute -right-16 -top-16 size-40 rounded-full bg-white/12 blur-3xl transition group-hover:bg-white/18" />
              <span className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.82),transparent)] opacity-80" />
              <span className="absolute right-5 top-5 flex size-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-lg font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                8W
              </span>
              <span className="relative flex h-full flex-col justify-between gap-5">
                <span>
                  <span className="inline-flex w-fit rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/85">
                    £250 one-off
                  </span>
                  <span className="mt-5 block text-3xl font-bold leading-tight text-white">
                    Elite 8-week Transformation
                  </span>
                  <span className="mt-2 block text-sm font-bold uppercase tracking-[0.18em] text-[#D7E4FF]">
                    8 weeks
                  </span>
                  <span className="mt-4 block space-y-2 text-sm font-medium leading-6 text-white/75">
                    <span className="block">Elite Pocket PT app access</span>
                    <span className="block">Private WhatsApp cohort group</span>
                    <span className="block">Educational webinar access</span>
                    <span className="block">Training, nutrition, progress tracking, and accountability</span>
                    <span className="block">Next transformation starts Monday 7 September 2026</span>
                  </span>
                </span>
                <span className="inline-flex w-fit rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#1157D8] transition group-hover:bg-[#EAF2FF]">
                  View package details
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="scroll-mt-24 bg-[linear-gradient(180deg,#F5F7FB_0%,#EEF5FF_52%,#F5F7FB_100%)] px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg font-medium text-[#4B5563]">
              A simple way to set up, use and get the most from your complete performance system.
            </p>
          </div>

          <div className="relative mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="absolute left-[10%] right-[10%] top-12 hidden h-px bg-gradient-to-r from-transparent via-[#1157D8]/25 to-transparent lg:block" />
            {[
              {
                title: "Choose how to start",
                body: "Start through the iOS app with App Store payment, download on Google Play for Android, or create your account on the web through secure Stripe checkout. Full access from day one — cancel anytime.",
              },
              {
                title: "Complete your setup",
                body: "Tell us your goals, training history, schedule and food preferences. This is what drives every personalised decision in your system.",
              },
              {
                title: "Unlock your personalised system",
                body: "Your training programme, meal plan and mobility flows are generated from Coach Mike's coaching framework — built over 20+ years. No AI. No generic templates. Just a real system applied to you.",
              },
              {
                title: "Train and eat with full support",
                body: "Log your sessions and meals. The system — built entirely on Coach Mike's coaching methodology — reviews every entry and delivers feedback the way a real coach would. No chatbots. No AI responses. Real coaching logic, applied to your data, every single day.",
              },
              {
                title: "Track your progress",
                body: "Strength, body composition and performance — all tracked so you always know what's working and what to adjust next.",
              },
            ].map((step, index) => (
              <div
                key={step.title}
                className="relative min-h-44 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_20px_52px_rgba(15,23,42,0.12)] transition duration-300 lg:hover:-translate-y-1 lg:hover:shadow-[0_26px_70px_rgba(17,87,216,0.16)]"
              >
                <div className="mb-6 flex size-12 items-center justify-center rounded-full bg-[#1157D8]/10 text-sm font-bold text-[#1157D8] ring-1 ring-[#1157D8]/15">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#1157D8]">
                  Step
                </p>
                <h3 className="font-semibold text-[#0B1220]">{step.title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-[#4B5563]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="system" className="scroll-mt-24 overflow-hidden bg-white px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
              The Elite Pocket PT System
            </h2>
            <p className="mt-4 text-lg font-medium text-[#4B5563]">
              You&apos;ve seen how the system works together. Now explore what&apos;s inside it.
            </p>
          </div>

          <div className="mt-14 space-y-12">
            {systemPillars.map((pillar) => (
              <div
                key={pillar.title}
                className={`grid w-full max-w-full items-center gap-8 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-[#F8FAFC] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] lg:p-8 ${
                  pillar.imageLayout === "health"
                    ? "lg:grid-cols-1"
                    : "lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]"
                }`}
              >
                <div
                  className={`min-w-0 ${
                    pillar.imageLayout === "health" ? "max-w-4xl" : ""
                  } ${pillar.reverse ? "lg:order-2" : ""}`}
                >
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
                    {pillar.title}
                  </p>
                  <h3 className="mt-4 text-xl font-bold tracking-tight text-[#0B1220] sm:text-3xl">
                    {pillar.headline}
                  </h3>
                  <ul className="mt-6 space-y-3 text-base font-medium text-[#4B5563]">
                    {pillar.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#1157D8] text-xs font-bold text-white">
                          ✓
                        </span>
                        <span className="min-w-0">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={`min-w-0 max-w-full ${pillar.reverse ? "lg:order-1" : ""}`}>
                  <div
                    className={`max-w-full gap-4 rounded-[1.75rem] border border-white/80 bg-white/80 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] ${
                      pillar.imageLayout === "health"
                        ? "flex overflow-x-auto lg:grid lg:grid-cols-5 lg:justify-items-center lg:overflow-visible"
                        : pillar.imageLayout === "single"
                          ? "flex justify-center overflow-hidden"
                          : "flex overflow-x-auto lg:grid lg:grid-cols-3 lg:overflow-visible"
                    }`}
                  >
                    {pillar.images.map((image, index) => (
                      <div
                        key={`${pillar.title}-${image.src}-${index}`}
                        className={`relative aspect-[110/239] shrink-0 overflow-hidden rounded-[1.5rem] border-2 border-black bg-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] ${
                          pillar.imageLayout === "health"
                            ? "w-[64vw] max-w-[230px] sm:w-48 lg:w-full lg:max-w-[210px]"
                            : pillar.imageLayout === "single"
                              ? "w-[72vw] max-w-[310px] sm:w-[300px] lg:w-[290px]"
                              : "w-[68vw] max-w-[260px] sm:w-44 lg:w-full lg:max-w-none"
                        }`}
                      >
                        <Image
                          src={image.src}
                          alt={image.alt}
                          fill
                          sizes={
                            pillar.imageLayout === "health"
                              ? "(min-width: 1024px) 13rem, (min-width: 640px) 12rem, 64vw"
                              : pillar.imageLayout === "single"
                                ? "(min-width: 1024px) 18rem, (min-width: 640px) 18.75rem, 72vw"
                                : "(min-width: 1024px) 11rem, (min-width: 640px) 11rem, 68vw"
                          }
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0B1220] px-5 py-14 text-center sm:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            This isn&apos;t ChatGPT writing your workouts and meal plans.
          </p>
          <p className="mx-auto mt-5 max-w-4xl text-lg font-normal leading-8 text-[#D7E4FF] sm:text-xl">
            Built on 20+ years of elite coaching experience and a Master’s degree — not assembled by an algorithm.
          </p>
        </div>
      </section>

      <section className="bg-white px-5 py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
              Meet Coach Mike
            </h2>
            <p className="mt-4 max-w-3xl text-lg font-medium text-[#4B5563]">
              A complete performance system built from real coaching methodology and practical experience.
            </p>
            <div className="mt-8 space-y-5 text-base font-medium text-[#4B5563]">
              <div>
                <p className="text-xl font-bold text-[#0B1220]">Mike Nicholson</p>
                <p className="mt-1">
                  M.Sc Sports Nutrition · PGCE · BA Hons Sports Performance
                </p>
              </div>
              <p className="max-w-3xl leading-8">
                20+ years of coaching experience working with Olympic athletes, Premier League footballers, UFC fighters, CrossFit Games athletes and everyday people who want a structured system that delivers real results.
              </p>
              <p className="max-w-3xl leading-8">
                Elite Pocket PT is built on a simple principle: combine science and research with over 20 years of real coaching experience to bridge the gap between the lab and real life.
                <br />
                <br />
                Training, nutrition and recovery are all integrated into one system — giving you everything you need to succeed so you can train and eat with confidence, feel supported through the process, and trust that what you’re doing works.
                <br />
                <br />
                No generic AI programming. Just a structured system that drives results through consistency, clarity and real coaching principles.
              </p>
            </div>
            <a
              href="#get-started"
              className="mt-8 inline-flex rounded-full bg-[#1157D8] px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,87,216,0.28)] transition hover:bg-[#0A39A8]"
            >
              Start your training
            </a>
          </div>

          <div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-[#F8FAFC] shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
              <Image
                src={coachMikeImages[activeCoachImage]}
                alt={`Coach Mike Nicholson ${activeCoachImage + 1}`}
                fill
                sizes="(min-width: 1024px) 32vw, 90vw"
                className="object-cover"
              />
            </div>
            <div className="mt-4 flex justify-center gap-2">
              {coachMikeImages.map((src, index) => (
                <span
                  key={src}
                  className={`size-2 rounded-full ${index === activeCoachImage ? "bg-[#1157D8]" : "bg-[#CBD5E1]"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="bg-white px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
              Client Results
            </h2>
            <p className="mt-4 text-lg font-medium text-[#4B5563]">
              Real feedback from people using the Elite Pocket PT system.
            </p>
          </div>

          <div className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-4 scroll-smooth sm:px-4 lg:px-8">
            {[
              {
                quote: "I used to train loads but never really saw much change, which was frustrating. This just made everything make sense. Within a couple of months I started leaning out and actually feeling strong, not just tired all the time. I finally feel confident in what I’m doing when I walk into the gym.",
                label: "Lucy",
                tag: "Confidence",
                image: "/hero/testimonial-lucy.png",
              },
              {
                quote: "I’ve tried a few programmes before and always fell off them. This is the first one I’ve actually stuck to. It’s just really clear and easy to follow, and it works. I’ve made more progress in the last few months than I have in years.",
                label: "Sam",
                tag: "Consistency",
                image: "/hero/testimonial-sam.png",
              },
              {
                quote: "You can tell there’s a lot of thought behind it. It’s not just random workouts thrown together. Everything links — training, nutrition, recovery. I’m stronger, fitter, and recovering way better between sessions.",
                label: "Hovanes",
                tag: "Performance",
                image: "/hero/testimonial-hovanes.png",
              },
              {
                quote: "My issue was always consistency. I’d start strong then lose momentum. This just took all the thinking out of it for me. I just log in, do the work, and I’m progressing every week. Simple as that.",
                label: "Anthony",
                tag: "Progress",
                image: "/hero/testimonial-anthony.png",
              },
              {
                quote: "I like that it actually fits into my life. I don’t feel like I have to be perfect all the time. I’ve got structure, I know what I’m doing, and I’ve seen real changes without it taking over everything.",
                label: "Samar",
                tag: "Lifestyle",
                image: "/hero/testimonial-samar.png",
              },
              {
                quote: "I’ve always trained on and off, but never really had a plan so progress was hit and miss. This just made it simple. I know exactly what I’m doing each session and why. I’ve leaned out, got stronger, and I’m actually consistent now, which is the biggest thing for me.",
                label: "John",
                tag: "Structure",
                image: "/hero/testimonial-john.png",
              },
            ].map((testimonial) => (
              <div
                key={testimonial.tag}
                className="min-h-[520px] w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:w-[420px] lg:w-[390px]"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.label}
                    fill
                    sizes="(min-width: 1024px) 390px, 85vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[#0B1220]">
                      {testimonial.label}
                    </p>
                    <span className="inline-flex rounded-full bg-[#1157D8]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                      {testimonial.tag}
                    </span>
                  </div>
                  <p className="mt-4 text-lg tracking-[0.18em] text-[#1157D8]">★★★★★</p>
                  <p className="mt-4 text-sm font-semibold leading-7 text-[#0B1220]">
                    “{testimonial.quote}”
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 bg-[#F5F7FB] px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
            Pricing
          </h2>
          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            {[
              {
                title: "Full App Access",
                price: "$39",
                smallText:
                  "Complete access to the integrated Elite Pocket PT performance system: training, nutrition, health, recovery, mobility, progress, coaching feedback and community in one place.",
                includes: [
                  "Training",
                  "Nutrition",
                  "Coaching feedback",
                  "Mobility flows",
                  "Progress tracking",
                  "Community",
                ],
                buttonText: "Start your training",
                href: "#get-started",
                note: "Cancel anytime. Manage your account online.",
                showMonthlySuffix: true,
                checkoutPlan: "full_app" as const,
              },
              {
                title: "VIP Coaching",
                price: "$199",
                smallText:
                  "Full app access plus high-touch coaching directly from Coach Mike, including personalised feedback, video calls, WhatsApp support, unlimited webinar access, and deeper accountability.",
                includes: [
                  "Everything in Full App Access",
                  "Full coaching support directly from Coach Mike",
                  "2 x 30-minute one-to-one video calls per month",
                  "24/7 WhatsApp support",
                  "Unlimited webinar access",
                ],
                buttonText: "Apply for VIP coaching",
                href: "#get-started",
                note: "Limited availability for high-touch coaching clients.",
                showMonthlySuffix: true,
                checkoutPlan: "vip" as const,
              },
              {
                title: "Corporate Packages",
                price: "Custom pricing",
                smallText:
                  "Built for companies, gyms, and sports teams that want to improve performance, health, accountability, and team culture through structured training and nutrition support.",
                includes: [
                  "Corporate performance programmes",
                  "Company leaderboards",
                  "Corporate performance challenges",
                  "Structured training support",
                  "Nutrition support",
                  "Webinar access",
                  "Direct coaching support",
                ],
                buttonText: "Corporate enquiry",
                href: "mailto:mike@elitepocketpt.com",
                note: "Built around your organisation, team size, and performance goals.",
                showMonthlySuffix: false,
              },
            ].map((plan) => (
              <div
                key={plan.title}
                className="flex h-full flex-col rounded-[2.5rem] border border-[#E5E7EB] bg-white p-8 shadow-[0_22px_64px_rgba(15,23,42,0.1)]"
              >
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
                    {plan.title}
                  </p>
                  <p className="mt-4 text-5xl font-bold tracking-tight text-[#0B1220]">
                    {plan.price}
                    {plan.showMonthlySuffix !== false && (
                      <>
                        {" "}
                        <span className="text-2xl font-semibold text-[#4B5563]">
                          / month
                        </span>
                      </>
                    )}
                  </p>
                  <p className="mt-3 text-sm font-medium leading-6 text-[#6B7280]">
                    {plan.smallText}
                  </p>
                </div>

                <div className="mt-8 flex-1">
                  <h3 className="text-xl font-bold tracking-tight text-[#0B1220]">
                    Includes
                  </h3>
                  <div className="mt-5 grid grid-cols-1 gap-3">
                    {plan.includes.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 text-sm font-semibold text-[#374151]"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#1157D8] text-xs font-bold text-white">
                          ✓
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  {plan.checkoutPlan ? (
                    <button
                      type="button"
                      onClick={() => openCheckout(plan.checkoutPlan)}
                      className="inline-flex w-full justify-center rounded-full bg-[#1157D8] px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,87,216,0.28)] transition hover:bg-[#0A39A8]"
                    >
                      {plan.buttonText}
                    </button>
                  ) : (
                    <a
                      href={plan.href || "#get-started"}
                      className="inline-flex w-full justify-center rounded-full bg-[#1157D8] px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,87,216,0.28)] transition hover:bg-[#0A39A8]"
                    >
                      {plan.buttonText}
                    </a>
                  )}
                  <p className="mt-4 text-sm font-medium text-[#6B7280]">
                    {plan.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E5E7EB] bg-[#F5F7FB] px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-semibold text-[#4B5563]">
          <Link href="/privacy" className="transition hover:text-[#1157D8]">
            Privacy Policy
          </Link>
          <Link href="/terms" className="transition hover:text-[#1157D8]">
            Terms
          </Link>
          <Link href="/delete-account" className="transition hover:text-[#1157D8]">
            Delete Account
          </Link>
          <Link href="/support" className="transition hover:text-[#1157D8]">
            Support
          </Link>
        </div>
      </footer>
      </main>

      {selectedCheckoutPlan && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#05070D]/78 px-5 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-title"
        >
          <button
            type="button"
            aria-label="Close checkout signup"
            onClick={closeCheckout}
            disabled={checkoutStatus === "loading"}
            className="absolute inset-0 cursor-default disabled:cursor-wait"
          />

          <div className="relative max-h-[calc(100vh-4rem)] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#0E1319] p-5 text-white shadow-[0_32px_100px_rgba(0,0,0,0.5)] ring-1 ring-[#1157D8]/20 sm:p-7">
            <div className="flex items-start justify-between gap-5 border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#6EA8FF]">
                  {checkoutPlanLabel}
                </p>
                <h2
                  id="checkout-title"
                  className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl"
                >
                  {checkoutTitle}
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-white/68 sm:text-base">
                  Set up your account, then continue to secure Stripe checkout.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCheckout}
                disabled={checkoutStatus === "loading"}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/78 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-white/84">
                Full name
                <input
                  required
                  value={checkoutName}
                  onChange={(event) => setCheckoutName(event.target.value)}
                  autoComplete="name"
                  className="h-14 rounded-2xl border border-white/10 bg-[#151B23] px-5 text-base font-medium text-white outline-none transition placeholder:text-white/38 focus:border-[#1157D8] focus:bg-[#18202A] focus:ring-4 focus:ring-[#1157D8]/18"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-white/84">
                Email
                <input
                  required
                  type="email"
                  value={checkoutEmail}
                  onChange={(event) => setCheckoutEmail(event.target.value)}
                  autoComplete="email"
                  className="h-14 rounded-2xl border border-white/10 bg-[#151B23] px-5 text-base font-medium text-white outline-none transition placeholder:text-white/38 focus:border-[#1157D8] focus:bg-[#18202A] focus:ring-4 focus:ring-[#1157D8]/18"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-white/84">
                Password
                <input
                  required
                  type="password"
                  value={checkoutPassword}
                  onChange={(event) => setCheckoutPassword(event.target.value)}
                  autoComplete="new-password"
                  className="h-14 rounded-2xl border border-white/10 bg-[#151B23] px-5 text-base font-medium text-white outline-none transition placeholder:text-white/38 focus:border-[#1157D8] focus:bg-[#18202A] focus:ring-4 focus:ring-[#1157D8]/18"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-white/84">
                Confirm password
                <input
                  required
                  type="password"
                  value={checkoutConfirmPassword}
                  onChange={(event) => setCheckoutConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className="h-14 rounded-2xl border border-white/10 bg-[#151B23] px-5 text-base font-medium text-white outline-none transition placeholder:text-white/38 focus:border-[#1157D8] focus:bg-[#18202A] focus:ring-4 focus:ring-[#1157D8]/18"
                />
              </label>

              {checkoutStatus === "error" && (
                <p className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
                  {checkoutErrorMessage}
                </p>
              )}

              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  type="submit"
                  disabled={checkoutStatus === "loading"}
                  className="h-14 rounded-full bg-[#1157D8] px-7 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,87,216,0.3)] transition hover:bg-[#0A39A8] disabled:cursor-wait disabled:opacity-70"
                >
                  {checkoutStatus === "loading"
                    ? "Opening checkout..."
                    : "Continue to secure checkout"}
                </button>

                <button
                  type="button"
                  onClick={closeCheckout}
                  disabled={checkoutStatus === "loading"}
                  className="h-14 rounded-full border border-white/10 bg-white/5 px-7 text-base font-bold text-white/82 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
