"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const includedItems = [
  {
    title: "8 weeks of Elite Pocket PT app access",
    body: [
      "App access runs from Sunday 6 September 2026 to Sunday 1 November 2026.",
      "During this period, you get access to the Elite Pocket PT coaching system, including your training structure, nutrition tools, progress tracking, mobility support and educational webinar access.",
      "This is the central hub for the transformation. Instead of having training in one place, nutrition in another, progress photos somewhere else and advice scattered through messages, the app gives you one clear system to work from.",
      "The aim is to remove as much guesswork as possible. You should know what your current focus is, what sessions you need to complete, how your nutrition supports the goal, and what data needs to be tracked across the 8 weeks.",
      "This matters because most people do not fail from lack of effort. They fail because the plan is unclear, inconsistent, badly tracked, or changed too often. The app gives the programme its structure.",
    ],
  },
  {
    title: "Structured app-based training",
    body: [
      "Your training is delivered inside the Elite Pocket PT app so every session has a clear purpose.",
      "Your plan is built around your goal, ability level, available training days and equipment access. Sessions are structured with exercises, sets, reps, rest periods and progression so you are not left walking into the gym guessing what to do.",
      "This is not random daily workouts. The training is designed to create repeatable progress across the 8 weeks by giving you a clear structure to follow week after week.",
      "Depending on your goal, the programme can support fat loss, muscle gain, body recomposition, strength development or general fitness. The key is that your training has direction rather than being a mix of whatever feels hard on the day.",
      "You will know what you are training, why it is there, and how it fits into the wider 8-week plan.",
    ],
  },
  {
    title: "Nutrition support inside the app",
    body: [
      "Nutrition support is built into the transformation because training alone is not enough.",
      "Inside the Elite Pocket PT app, nutrition sits alongside your training so your food, targets, habits and progress can be managed together.",
      "You can work from nutrition targets, log meals, track consistency and use the app to make better decisions around what you are eating. The aim is not to put everyone on an extreme diet. The aim is to give you enough structure to support your goal properly.",
      "For fat loss, this means creating enough consistency to move body composition in the right direction without relying on guesswork. For muscle gain, it means making sure your intake supports training and recovery. For recomposition, it means balancing training quality, protein, calories, consistency and progress tracking.",
      "The nutrition support is there to help you understand what is actually driving progress, not just follow a short-term food plan you abandon after 8 weeks.",
    ],
  },
  {
    title: "Progress tracking that actually means something",
    body: [
      "Progress is tracked through the app so decisions are based on trends, not emotion.",
      "You will be expected to track weekly body weight and relevant progress markers throughout the 8 weeks. This helps build a clearer picture of what is actually happening.",
      "One scale reading does not tell the full story. One bad gym session does not mean the plan is failing. One flat morning in the mirror does not mean you are not progressing.",
      "The point of tracking is to collect enough information to see patterns. Are you training consistently? Is body weight moving in the expected direction? Are you getting stronger? Are you recovering? Are you following the nutrition targets closely enough?",
      "Better data leads to better decisions. Without tracking, most people either panic too early, change the plan too often, or miss the progress that is actually happening.",
    ],
  },
  {
    title: "Accountability across the full 8 weeks",
    body: [
      "The programme gives you structure and accountability from start to finish.",
      "You are not just buying access and being left alone. The transformation is built around a clear 8-week timeline, app-based structure, nutrition targets, progress tracking, education and cohort support.",
      "Accountability does not mean being shouted at every day. It means there is a system around you that makes it harder to drift. You know when the programme starts, what you are working towards, what needs to be tracked, and where to go for support.",
      "This matters because motivation is unreliable. Most people are motivated at the start, but the real work happens when life gets busy, training feels repetitive, weight fluctuates, or progress slows.",
      "The accountability structure is there to help you keep showing up long enough for the plan to work.",
    ],
  },
  {
    title: "Private WhatsApp cohort support",
    body: [
      "Clients are manually added to the private WhatsApp cohort group on Tuesday 1 September 2026.",
      "The WhatsApp group gives the transformation a proper group environment. It is there for programme updates, reminders, questions, support and accountability throughout the 8 weeks.",
      "This means you are not going through the programme completely isolated. You will be part of a cohort of people following the same 8-week structure, working through the same timeline and dealing with the same challenges around training, nutrition and consistency.",
      "The group helps create momentum. It gives you reminders, support, shared accountability and a place to stay connected to the programme.",
      "It is not designed to replace the app. The app delivers the structure. The WhatsApp group supports the process around it.",
    ],
  },
  {
    title: "Educational webinar access",
    body: [
      "You get access to the educational webinar section on elitepocketpt.com while your app access is valid.",
      "These webinars are a major part of the value of the transformation because they help you understand the process instead of blindly following instructions.",
      "The education is practical, evidence-based and designed to help you make better decisions around training, nutrition, recovery and lifestyle.",
      "Topics include post-workout nutrition, strength vs hypertrophy, insulin resistance, sleep hygiene, recovery, supplements, steps, sunlight, sauna and plastic exposure.",
      "The goal is to help you understand what matters, what does not, where most people waste time, and how to make better choices beyond the 8 weeks.",
      "This is important because long-term change does not come from simply being told what to do. It comes from understanding why you are doing it.",
    ],
  },
  {
    title: "Mobility and recovery support",
    body: [
      "The Elite Pocket PT app includes a mobility generator to support your training week.",
      "Mobility and recovery are included because an 8-week transformation requires consistency, and consistency is much harder if your body feels beaten up, restricted or underprepared.",
      "The mobility support helps you build targeted work around your needs instead of leaving warm-ups, movement quality and recovery as an afterthought.",
      "This can support better preparation for training, better movement quality and better management of the physical demands of the programme.",
      "The goal is not to turn mobility into another complicated programme. The goal is to give you a practical tool that helps you keep training well across the full 8 weeks.",
    ],
  },
];

const keyDates = [
  {
    label: "Sign-ups open:",
    value: "Friday 28 August 2026",
  },
  {
    label: "WhatsApp group:",
    value: "added Tuesday 1 September 2026",
  },
  {
    label: "Onboarding call:",
    value: "Sunday 6 September 2026",
  },
  {
    label: "Next transformation starts:",
    value: "Monday 7 September 2026",
  },
  {
    label: "Programme ends:",
    value: "Sunday 1 November 2026",
  },
  {
    label: "App access:",
    value: "Sunday 6 September 2026 to Sunday 1 November 2026",
  },
];

const educationTopics = [
  "Strength vs hypertrophy",
  "Insulin resistance",
  "Sleep hygiene",
  "Recovery: what the science actually shows",
  "Supplements: what the science shows works and what is a waste of money",
  "Steps, sunlight, sauna, and plastic exposure as part of lifestyle change",
];

function ImageBlock({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`relative min-h-40 overflow-hidden rounded-[2rem] border border-[#6EA8FF]/25 bg-[linear-gradient(145deg,#101826_0%,#0B1220_58%,#061B45_100%)] shadow-[0_24px_70px_rgba(15,23,42,0.22)] ring-1 ring-white/10 ${className}`}
    >
      <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 34vw, 100vw" className="object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(11,18,32,0.32)_100%)]" />
    </div>
  );
}

export default function EliteEightWeekTransformationPage() {
  const [expandedIncludedItems, setExpandedIncludedItems] = useState<Set<string>>(
    () => new Set(),
  );

  function toggleIncludedItem(title: string) {
    setExpandedIncludedItems((currentItems) => {
      const nextItems = new Set(currentItems);

      if (nextItems.has(title)) {
        nextItems.delete(title);
      } else {
        nextItems.add(title);
      }

      return nextItems;
    });
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB] text-[#111827]">
      <section className="overflow-hidden bg-[#0B1220] px-5 py-6 text-white sm:py-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur">
            <Link href="/" className="text-base font-bold tracking-tight text-white transition hover:text-[#9BC4FF]">
              Elite Pocket PT
            </Link>
            <Link href="/" className="text-sm font-bold text-[#9BC4FF] transition hover:text-white">
              Back to Elite Pocket PT
            </Link>
          </header>

          <div className="grid gap-10 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.78fr)] lg:items-center lg:py-20">
            <div>
              <p className="inline-flex rounded-full border border-[#6EA8FF]/25 bg-[#1157D8]/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#9BC4FF]">
                ELITE POCKET PT PROGRAMME
              </p>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Elite 8-week Transformation
              </h1>
              <p className="mt-6 max-w-3xl text-lg font-medium leading-8 text-[#D7E4FF] sm:text-xl">
                An 8-week structured transformation built around app-based training,
                nutrition, progress tracking, education, and accountability.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9BC4FF]">
                    Price
                  </p>
                  <p className="mt-2 text-3xl font-bold text-white">£200 one-off payment</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9BC4FF]">
                    Next transformation starts
                  </p>
                  <p className="mt-2 text-2xl font-bold leading-tight text-white">
                    Monday 7 September 2026
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/elite-8-week-transformation/signup"
                  className="inline-flex justify-center rounded-full bg-[#1157D8] px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,87,216,0.28)] transition hover:bg-[#0A39A8]"
                >
                  Join the programme
                </Link>
                <Link
                  href="/"
                  className="inline-flex justify-center rounded-full border border-white/15 bg-white/10 px-8 py-4 text-base font-bold text-white transition hover:bg-white/15"
                >
                  Back to Elite Pocket PT
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <ImageBlock
                src="/elite-8-week-transformation/programme-hero.jpg"
                alt="Elite 8-week Transformation before and after progress image"
                className="min-h-[26rem]"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageBlock
                  src="/elite-8-week-transformation/app-screenshots.jpg"
                  alt="Elite Pocket PT app training nutrition and progress screens"
                />
                <ImageBlock
                  src="/elite-8-week-transformation/transformation-support.jpg"
                  alt="Elite 8-week Transformation education accountability and support system"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
              WHAT YOU GET INSIDE THE ELITE 8-WEEK TRANSFORMATION
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
              The Elite 8-week Transformation is built as a complete coaching structure, not a loose collection of workouts.
            </h2>
            <div className="mt-5 space-y-4 text-base font-medium leading-8 text-[#4B5563]">
              <p>
                For 8 weeks, you get access to the Elite Pocket PT app, structured
                app-based training, nutrition support, progress tracking,
                accountability, private WhatsApp cohort support, mobility tools and
                educational webinars.
              </p>
              <p>
                The goal is to give you one clear system to follow so you know what
                to train, how to support it with nutrition, what to track, when to
                adjust, and how to stay consistent for the full 8 weeks.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {includedItems.map((item) => {
              const isExpanded = expandedIncludedItems.has(item.title);
              const contentId = `included-item-${item.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")}`;

              return (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
                >
                  <h3 className="text-lg font-bold leading-7 text-[#0B1220]">{item.title}</h3>
                  <p className="mt-4 text-sm font-semibold leading-6 text-[#4B5563]">
                    {item.body[0]}
                  </p>

                  <div
                    id={contentId}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="mt-3 space-y-3 border-t border-[#E5E7EB] pt-3 text-sm font-semibold leading-6 text-[#4B5563]">
                        {item.body.slice(1).map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={contentId}
                    onClick={() => toggleIncludedItem(item.title)}
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-[#1157D8]/20 bg-[#1157D8]/5 px-4 text-sm font-bold text-[#1157D8] transition hover:border-[#1157D8]/35 hover:bg-[#1157D8]/10"
                  >
                    {isExpanded ? "Show less" : "Read more"}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="mx-auto mt-10 max-w-4xl text-center text-base font-bold leading-8 text-[#0B1220]">
            Everything in the transformation is designed to work together: training
            gives you the structure, nutrition supports the goal, progress tracking
            shows what is changing, education teaches you why it matters, mobility
            helps you keep moving well, and accountability helps you stay consistent
            for the full 8 weeks.
          </p>
        </div>
      </section>

      <section className="bg-white px-5 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
              Key dates
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
              Next transformation timeline
            </h2>
            <p className="mt-4 text-base font-medium leading-8 text-[#4B5563]">
              The Elite 8-week Transformation is designed as a repeatable flagship
              programme with a clear onboarding window, start date, and app access period.
            </p>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-[#F8FAFC] shadow-[0_22px_64px_rgba(15,23,42,0.1)]">
            {keyDates.map((item) => (
              <div
                key={item.label}
                className="grid gap-2 border-b border-[#E5E7EB] p-5 last:border-b-0 sm:grid-cols-[12rem_1fr]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                  {item.label}
                </p>
                <p className="text-base font-bold leading-7 text-[#0B1220]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0B1220] px-5 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#9BC4FF]">
              INCLUDED EDUCATION PLATFORM
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Interactive webinars are a major part of the transformation
            </h2>
            <p className="mt-5 text-base font-medium leading-8 text-[#D7E4FF] sm:text-lg">
              A major part of the 8 weeks is education: understanding why the plan
              works, how to make better decisions, and how to build habits beyond
              the 8 weeks.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.78fr)]">
            <div className="rounded-[2rem] border border-[#6EA8FF]/20 bg-[linear-gradient(145deg,#101826_0%,#1157D8_48%,#061B45_100%)] p-6 shadow-[0_30px_90px_rgba(17,87,216,0.28)] ring-1 ring-white/10 sm:p-8">
              <p className="inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/85">
                Included in the programme
              </p>
              <h3 className="mt-5 text-3xl font-bold tracking-tight text-white">
                Interactive webinar access
              </h3>
              <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-[#D7E4FF]">
                While app access is valid, clients can use the educational webinar
                section on elitepocketpt.com. Webinars are interactive, 30-45 minutes,
                and include quizzes, videos, infographics, and supporting education.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  "30–45 minute lessons",
                  "Interactive quizzes",
                  "Videos + infographics",
                  "Science-led education",
                  "Included while app access is valid",
                ].map((badge) => (
                  <div
                    key={badge}
                    className="rounded-[1.25rem] border border-white/15 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  >
                    <p className="text-sm font-bold text-white">{badge}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)] ring-1 ring-white/10 sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9BC4FF]">
                What the education gives you
              </p>
              <h3 className="mt-4 text-3xl font-bold tracking-tight text-white">
                Education that explains why the plan works
              </h3>
              <div className="mt-6 grid gap-4">
                {[
                  {
                    title: "Understand the why",
                    body: "Learn the principles behind the training, nutrition, recovery, and lifestyle work.",
                  },
                  {
                    title: "Make better decisions",
                    body: "Use clear education to support better choices across the programme.",
                  },
                  {
                    title: "Apply the lessons",
                    body: "Connect the webinar education to your app-based training, nutrition, and accountability.",
                  },
                  {
                    title: "Build habits beyond 8 weeks",
                    body: "Use the education to support long-term understanding beyond the programme window.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-[#0B1220]/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <p className="text-base font-bold text-white">{item.title}</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#D7E4FF]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm font-semibold leading-7 text-[#D7E4FF]">
                The education supports understanding, behaviour change,
                accountability, and better decision making across the programme.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {educationTopics.map((topic) => (
              <div
                key={topic}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                <p className="text-base font-bold leading-6 text-white">{topic}</p>
                <p className="mt-3 text-sm font-medium leading-6 text-[#D7E4FF]">
                  {topic === "Strength vs hypertrophy" &&
                    "Understand the difference between building strength, building muscle, and how training focus changes adaptation."}
                  {topic === "Insulin resistance" &&
                    "Learn how glucose, insulin, energy, and lifestyle behaviours connect."}
                  {topic === "Sleep hygiene" &&
                    "Understand why sleep timing, routine, and environment matter for recovery."}
                  {topic === "Recovery: what the science actually shows" &&
                    "Learn what the science actually shows about recovery instead of relying on myths."}
                  {topic ===
                    "Supplements: what the science shows works and what is a waste of money" &&
                    "Understand what is evidence-based and what is likely a waste of money."}
                  {topic ===
                    "Steps, sunlight, sauna, and plastic exposure as part of lifestyle change" &&
                    "Connect lifestyle foundations to wider behaviour change."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-[0_22px_64px_rgba(15,23,42,0.1)]">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
              Who it is for
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220]">
              Structure, accountability, and education
            </h2>
            <div className="mt-5 space-y-4 text-base font-medium leading-8 text-[#4B5563]">
              <p>
                The programme is suitable for people who want structure,
                accountability, training, nutrition, education, and lifestyle change.
              </p>
              <p>Beginners can join, and the minimum equipment needed is free weights.</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-[0_22px_64px_rgba(15,23,42,0.1)]">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
              Progress and accountability
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220]">
              Track the work each week
            </h2>
            <div className="mt-5 space-y-4 text-base font-medium leading-8 text-[#4B5563]">
              <p>
                Weekly body weight is expected through the app Progress section so
                progress can be tracked consistently across the 8 weeks.
              </p>
              <p>Progress pictures are encouraged, but they are optional.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#E5E7EB] border-t-[#1157D8]/60 bg-[#FAFBFE] p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.09)] sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
            Join the programme
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
            Join the Elite 8-week Transformation
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-8 text-[#4B5563]">
            Create your account and continue to secure checkout for the £200 one-off programme payment.
          </p>
          <Link
            href="/elite-8-week-transformation/signup"
            className="mt-8 inline-flex rounded-full bg-[#1157D8] px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,87,216,0.28)] transition hover:bg-[#0A39A8]"
          >
            Join the programme
          </Link>
        </div>
      </section>
    </main>
  );
}
