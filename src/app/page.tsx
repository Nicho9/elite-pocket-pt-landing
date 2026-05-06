"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const launchDate = new Date("2026-06-01T10:00:00+04:00").getTime();

const referralOptions = [
  "Mike Nicholson",
  "Elite Pocket PT Instagram",
  "Friend",
  "The Lifting Zone",
  "Other",
];

const deviceScreens = [
  {
    name: "Workout",
    src: "/hero/workout-page.png",
    width: 766,
    height: 1582,
    className:
      "left-0 top-16 z-10 w-[35%] rotate-[-10deg] scale-90 opacity-95 sm:top-20 lg:top-28 lg:w-[36%]",
  },
  {
    name: "Dashboard",
    src: "/hero/dashboard.png",
    width: 788,
    height: 1590,
    className:
      "left-1/2 top-0 z-30 w-[41%] -translate-x-1/2 scale-110 lg:w-[43%] lg:scale-[1.14]",
  },
  {
    name: "Nutrition",
    src: "/hero/nutrition-page.png",
    width: 764,
    height: 1574,
    className:
      "right-0 top-16 z-20 w-[35%] rotate-[10deg] scale-90 opacity-95 sm:top-20 lg:top-28 lg:w-[36%]",
  },
];

const coachMikeImages = [
  "/hero/coach-mike-profile.png",
  "/hero/coach-mike-competitor.png",
  "/hero/coach-mike-athlete.png",
];

function getTimeLeft() {
  const difference = Math.max(launchDate - Date.now(), 0);

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export default function Home() {
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof getTimeLeft> | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeCoachImage, setActiveCoachImage] = useState(0);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      setTimeLeft(getTimeLeft());
    }, 0);

    const timer = window.setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveCoachImage((current) => (current + 1) % coachMikeImages.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          referralSource,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus("success");
        setName("");
        setEmail("");
        setReferralSource("");
        return;
      }

      if (response.status === 409 || result.code === "duplicate_email") {
        setStatus("duplicate");
        return;
      }

      setErrorMessage(typeof result.error === "string" ? result.error : "");
      setStatus("error");
    } catch (error) {
      console.error("Waitlist submission error:", error);
      setStatus("error");
    }
  }

  const countdown = [
    ["Days", timeLeft?.days],
    ["Hours", timeLeft?.hours],
    ["Minutes", timeLeft?.minutes],
    ["Seconds", timeLeft?.seconds],
  ];

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
            <a href="#system" className="transition hover:text-[#1157D8]">
              System
            </a>
            <a href="#pricing" className="transition hover:text-[#1157D8]">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] shadow-sm lg:hidden"
            >
              Menu
            </button>
            <Link href="/login" className="text-sm font-semibold text-[#374151] transition hover:text-[#1157D8]">
              Login
            </Link>
            <a
              href="#early-access"
              className="rounded-full bg-[#1157D8] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(17,87,216,0.24)] transition hover:bg-[#0A39A8]"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      <main className="min-h-screen bg-[#F5F7FB] text-[#111827]">
      <section className="relative flex min-h-[75vh] flex-col items-start justify-center overflow-hidden px-5 pb-8 pt-24">
        <div className="absolute inset-0 bg-[url('/hero/gym-background.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/58 to-white/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/35" />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-start gap-8 lg:grid-cols-[minmax(0,0.98fr)_minmax(460px,1.02fr)] lg:gap-x-8 lg:gap-y-12">
          <div className="flex w-full flex-col items-start text-center lg:items-start lg:text-left">
            <p className="mb-5 rounded-full border border-[#1157D8]/20 bg-white/70 px-4 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-[#1157D8] shadow-sm backdrop-blur">
              Elite Pocket PT
            </p>

            <h1 className="max-w-[720px] text-4xl font-bold leading-[1.05] tracking-tight text-[#0B1220] sm:text-5xl lg:text-6xl">
              <span className="block">A Complete Training System</span>
              <span className="block">Built on Performance Science.</span>
            </h1>

            <p className="mt-6 text-lg font-medium text-[#374151] sm:text-2xl">
              Workouts. Nutrition. Mobility. Coaching. Community.
            </p>
            <p className="mt-3 max-w-2xl rounded-full border border-white/70 bg-white/55 px-4 py-2 text-base font-semibold italic text-[#1F2937] shadow-sm backdrop-blur sm:text-lg">
              Built on 20 years of elite coaching and a Master’s degree in Sports Nutrition — not generic AI programming.
            </p>

            <div className="mt-6 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {countdown.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-[0_18px_60px_rgba(17,87,216,0.14)] backdrop-blur"
                >
                  <div className="text-4xl font-bold text-[#1157D8] sm:text-5xl">
                    {String(value).padStart(2, "0")}
                  </div>
                  <div className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[#6B7280]">
                    {label}
                  </div>
                </div>
              ))}
            </div>

          </div>

          <div className="relative mx-auto mt-4 h-[360px] w-full max-w-[560px] sm:h-[480px] lg:mt-6 lg:h-[700px] lg:max-w-none">
            {deviceScreens.map((screen) => (
              <div
                key={screen.name}
                className={`absolute aspect-[390/844] overflow-hidden rounded-[2rem] border-4 border-black shadow-[0_0_0_2px_#000,0_24px_55px_rgba(15,23,42,0.22)] ${screen.className}`}
              >
                <Image
                  src={screen.src}
                  alt={`${screen.name} app screen`}
                  fill
                  sizes="(min-width: 1024px) 24vw, 38vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>

        </div>
        <div id="early-access" className="relative z-10 mx-auto mt-6 flex w-full max-w-6xl scroll-mt-24 flex-col items-start gap-4 px-4 lg:-mt-32">
          <div className="flex w-full max-w-5xl flex-col items-start gap-4">
            <div className="inline-flex rounded-full bg-[#1157D8] px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,87,216,0.32)]">
              Get Early Access — 50% Off
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 grid w-full max-w-6xl grid-cols-1 items-start gap-3 rounded-[2.5rem] border border-white/90 bg-white/95 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.13)] backdrop-blur lg:grid-cols-[1fr_1fr_1.2fr_auto]"
            >
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                className="h-16 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-base outline-none transition focus:border-[#1157D8] focus:ring-4 focus:ring-[#1157D8]/10"
              />

              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="h-16 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-base outline-none transition focus:border-[#1157D8] focus:ring-4 focus:ring-[#1157D8]/10"
              />

              <select
                required
                value={referralSource}
                onChange={(event) => setReferralSource(event.target.value)}
                className="h-16 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-base text-[#374151] outline-none transition focus:border-[#1157D8] focus:ring-4 focus:ring-[#1157D8]/10"
              >
                <option value="">Where did you hear about us?</option>
                {referralOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={status === "loading"}
                className="h-16 w-full rounded-2xl bg-[#1157D8] px-10 text-base font-bold text-white transition hover:bg-[#0A39A8] disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto"
              >
                {status === "loading" ? "Submitting..." : "Register"}
              </button>
            </form>

            <div className="flex justify-center">
              <p className="inline-flex items-start gap-2 rounded-full bg-white/75 px-4 py-2 text-sm font-medium text-[#4B5563] shadow-sm backdrop-blur">
                <span className="flex size-5 items-start justify-center rounded-full bg-[#1157D8] text-xs font-bold text-white">
                  ✓
                </span>
                Limited early access spots available.
              </p>
            </div>

            {status === "success" && (
              <p className="mx-auto mt-4 w-fit rounded-full bg-white/80 px-5 py-3 text-sm font-semibold text-[#1157D8] shadow-sm">
                You’re in — we’ll email your 50% early access offer before launch.
              </p>
            )}

            {status === "duplicate" && (
              <p className="mx-auto mt-4 w-fit rounded-full bg-white/80 px-5 py-3 text-sm font-semibold text-[#1157D8] shadow-sm">
                You’re already registered — we’ll be in touch before launch.
              </p>
            )}

            {status === "error" && (
              <p className="mx-auto mt-4 w-fit rounded-full bg-white/80 px-5 py-3 text-sm font-semibold text-red-600 shadow-sm">
                Something went wrong. Please try again. {errorMessage}
              </p>
            )}
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
              A simple system you follow every day
            </p>
          </div>

          <div className="relative mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="absolute left-[10%] right-[10%] top-12 hidden h-px bg-gradient-to-r from-transparent via-[#1157D8]/25 to-transparent lg:block" />
            {[
              {
                title: "Create your account",
                body: "Sign up securely via Stripe. Full access from day one — cancel anytime.",
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
              Built by Coach Mike Nicholson (M.Sc Sports Nutrition, PGCE, BA Hons)
            </p>
          </div>

          <div className="mt-14 space-y-12">
            {[
              {
                title: "Training",
                headline: "Structured training built for progression",
                bullets: [
                  "Programme generator based on your level, schedule and goals",
                  "Built across Base, Build and Perform phases",
                  "Strength assessment to tailor all working weights",
                ],
                images: [
                  "/hero/workout-page.png",
                  "/hero/workout-log.png",
                  "/hero/strength-assessment.png",
                ],
                reverse: false,
              },
              {
                title: "Nutrition",
                headline: "Practical nutrition that fits your lifestyle",
                bullets: [
                  "Personalised meal plans based on goals and preferences",
                  "Flexible logging: photo, voice, database or meal plan",
                  "Built around training demands and real-world habits",
                ],
                images: [
                  "/hero/nutrition-page.png",
                  "/hero/my-meal-plan.png",
                  "/hero/food-log-image.png",
                ],
                reverse: true,
              },
              {
                title: "Coaching",
                headline: "Ongoing coaching, not just a plan",
                bullets: [
                  "Feedback on every workout and meal",
                  "Daily guidance based on training and nutrition",
                  "Adjustments to keep you progressing",
                ],
                images: [
                  "/hero/workout-feedback.png",
                  "/hero/food-feedback.png",
                  "/hero/nutrition-generate-plan.png",
                ],
                reverse: false,
              },
              {
                title: "Performance",
                headline: "Everything that drives results",
                bullets: [
                  "Daily mobility flows tailored to your needs",
                  "Progress tracking: strength, body comp and performance",
                  "Community, leaderboards and gamification",
                ],
                images: [
                  "/hero/mobility-page.png",
                  "/hero/mobility-flow-player.png",
                  "/hero/community-page.png.PNG",
                ],
                reverse: true,
              },
            ].map((pillar) => (
              <div
                key={pillar.title}
                className="grid w-full max-w-full items-center gap-8 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-[#F8FAFC] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] lg:grid-cols-2 lg:p-8"
              >
                <div className={`min-w-0 ${pillar.reverse ? "lg:order-2" : ""}`}>
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
                  <div className="flex max-w-full gap-4 overflow-x-auto rounded-[1.75rem] border border-white/80 bg-white/80 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] lg:overflow-hidden">
                    {pillar.images.map((src, index) => (
                      <div
                        key={`${pillar.title}-${src}-${index}`}
                        className="relative aspect-[390/844] w-[68vw] max-w-[260px] shrink-0 overflow-hidden rounded-[1.5rem] border-2 border-black bg-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] sm:w-44 lg:w-44 lg:max-w-none"
                      >
                        <Image
                          src={src}
                          alt={`${pillar.title} app screen ${index + 1}`}
                          fill
                          sizes="(min-width: 1024px) 11rem, 9rem"
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
            Built on 20+ years of elite coaching experience — not assembled by an algorithm.
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
              The Elite Pocket PT system is built from real coaching experience — not generic programming.
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
              href="#early-access"
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
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {[
              {
                title: "Full App Access",
                price: "$49",
                smallText: "Also available in GBP and AED at checkout",
                includes: [
                  "Training",
                  "Nutrition",
                  "Coaching feedback",
                  "Mobility flows",
                  "Progress tracking",
                  "Community",
                ],
                buttonText: "Start your training",
                note: "Cancel anytime. Manage your account online.",
              },
              {
                title: "VIP Coaching",
                price: "$199",
                smallText:
                  "Includes full app access plus full coaching support directly from Coach Mike",
                includes: [
                  "Everything in Full App Access",
                  "Full coaching support directly from Coach Mike",
                  "2 x 30-minute one-to-one video calls per month",
                  "24/7 WhatsApp support",
                  "1 community coaching call per month",
                ],
                buttonText: "Apply for VIP coaching",
                note: "Limited availability for high-touch coaching clients.",
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
                    {plan.price}{" "}
                    <span className="text-2xl font-semibold text-[#4B5563]">
                      / month
                    </span>
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
                  <a
                    href="#early-access"
                    className="inline-flex w-full justify-center rounded-full bg-[#1157D8] px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,87,216,0.28)] transition hover:bg-[#0A39A8]"
                  >
                    {plan.buttonText}
                  </a>
                  <p className="mt-4 text-sm font-medium text-[#6B7280]">
                    {plan.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </main>
    </>
  );
}
