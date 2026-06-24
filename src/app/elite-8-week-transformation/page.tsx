import Link from "next/link";
import Image from "next/image";

const includedItems = [
  {
    title: "8 weeks of Elite Pocket PT app access",
    body: "App access starts on the Sunday before the programme begins and stops automatically after 8 weeks.",
  },
  {
    title: "App-based training",
    body: "Structured training delivered through the Elite Pocket PT app for the full programme.",
  },
  {
    title: "Nutrition support",
    body: "Nutrition support inside the app alongside your training, progress tracking, and accountability.",
  },
  {
    title: "Progress tracking",
    body: "Weekly body weight is expected through the app Progress section.",
  },
  {
    title: "Accountability",
    body: "A clear 8-week structure built around consistent app-based training, nutrition, and progress tracking.",
  },
  {
    title: "Private WhatsApp cohort group",
    body: "Clients are manually added to the private WhatsApp cohort group 5 days before onboarding.",
  },
  {
    title: "Educational webinar access",
    body: "Access to the educational webinar section on elitepocketpt.com while app access is valid.",
  },
  {
    title: "Mobility support",
    body: "The Elite Pocket PT app includes a mobility generator to support your training week.",
  },
];

const keyDates = [
  {
    label: "WhatsApp group",
    value: "Added 5 days before onboarding",
  },
  {
    label: "Onboarding call",
    value: "Sunday 12 July 2026",
  },
  {
    label: "Next transformation starts",
    value: "Monday 13 July 2026, pending team readiness",
  },
  {
    label: "Programme ends",
    value: "Sunday 6 September 2026",
  },
  {
    label: "App access",
    value: "Starts the Sunday before the programme and stops automatically after 8 weeks",
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
                    Monday 13 July 2026
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#checkout-placeholder"
                  className="inline-flex justify-center rounded-full bg-[#1157D8] px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,87,216,0.28)] transition hover:bg-[#0A39A8]"
                >
                  Join the programme
                </a>
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
              What is included
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
              The 8-week structure
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {includedItems.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
              >
                <h3 className="text-lg font-bold leading-7 text-[#0B1220]">{item.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#4B5563]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
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

      <section id="checkout-placeholder" className="scroll-mt-24 bg-white px-5 py-20">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#E5E7EB] border-t-[#1157D8]/60 bg-[#FAFBFE] p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.09)] sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
            Join the programme
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
            Checkout coming soon
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-8 text-[#4B5563]">
            Online checkout for the Elite 8-week Transformation is being prepared.
            This placeholder does not process payment.
          </p>
          <button
            type="button"
            disabled
            className="mt-8 inline-flex cursor-not-allowed rounded-full bg-[#1157D8]/70 px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,87,216,0.18)]"
          >
            Checkout coming soon
          </button>
        </div>
      </section>
    </main>
  );
}
