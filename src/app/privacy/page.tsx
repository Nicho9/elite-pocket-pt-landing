import Link from "next/link";

const sections = [
  {
    title: "What Elite Pocket PT is",
    body: [
      "Elite Pocket PT is a digital coaching system for training, nutrition, mobility, progress tracking, community support, and coaching feedback.",
      "This Privacy Policy explains how we collect, use, retain, and protect information when you use our website, mobile app, and related services.",
    ],
  },
  {
    title: "Information we collect",
    body: [
      "We may collect account details such as your name, email address, login information, and subscription status.",
      "We may collect profile and onboarding answers, including goals, training history, schedule, preferences, injuries or limitations you choose to provide, nutrition preferences, and coaching setup information.",
      "We may collect training data, workout logs, nutrition logs, meal information, progress measurements, progress photos if uploaded, mobility activity, community content, support messages, payment or subscription status, device and technical data, analytics events, and push notification tokens.",
    ],
  },
  {
    title: "How we use data",
    body: [
      "We use your information to provide app access, personalised training, nutrition, mobility and coaching features, progress tracking, account support, security, notifications, and product analytics or improvement.",
      "We may also use data to troubleshoot issues, prevent misuse, maintain reliable service, and communicate important account or service updates.",
    ],
  },
  {
    title: "Third-party services",
    body: [
      "We use trusted service providers where needed to operate Elite Pocket PT. These may include Supabase for database, authentication and storage services; Firebase for app-related services such as notifications or diagnostics; Stripe or external checkout providers for payment and subscription handling; Vercel for website hosting; and analytics providers where applicable.",
      "Payment providers process payment information under their own terms and privacy policies. Elite Pocket PT does not store full card details.",
    ],
  },
  {
    title: "Data retention",
    body: [
      "We keep personal data for as long as needed to provide the service, maintain records, comply with legal obligations, resolve disputes, improve security, and support legitimate business operations.",
      "If you request account deletion, we will delete or anonymise eligible account data where possible, subject to legal, security, payment, and operational retention requirements.",
    ],
  },
  {
    title: "Your rights and contact",
    body: [
      "You may contact us to request access, correction, deletion, or other privacy support relating to your personal information.",
      "For privacy questions or requests, email mike@elitepocketpt.com.",
    ],
  },
];

function renderParagraph(paragraph: string) {
  const email = "mike@elitepocketpt.com";

  if (!paragraph.includes(email)) {
    return paragraph;
  }

  const [before, after] = paragraph.split(email);

  return (
    <>
      {before}
      <a
        href={`mailto:${email}`}
        className="font-bold text-[#1157D8] underline decoration-[#1157D8]/30 underline-offset-4 transition hover:text-[#0A39A8]"
      >
        {email}
      </a>
      {after}
    </>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FB] px-5 py-6 text-[#111827] sm:py-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-white bg-white/80 px-5 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur">
          <Link href="/" className="text-base font-bold tracking-tight text-[#0B1220] transition hover:text-[#1157D8]">
            Elite Pocket PT
          </Link>
          <Link href="/" className="text-sm font-bold text-[#1157D8] transition hover:text-[#0A39A8]">
            Back to home
          </Link>
        </header>

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#E5E7EB] border-t-[#1157D8]/60 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.09)]">
          <div className="border-b border-[#E5E7EB] bg-[#FAFBFE] p-6 sm:p-10">
          <p className="inline-flex rounded-full border border-[#1157D8]/20 bg-[#1157D8]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#1157D8]">
            Legal
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#0B1220]">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm font-semibold text-[#6B7280]">
            Last updated: May 18, 2026
          </p>
          </div>

          <div className="space-y-8 p-6 sm:p-10">
            {sections.map((section) => (
              <section key={section.title} className="border-l-2 border-[#1157D8]/20 pl-5">
                <h2 className="text-xl font-bold text-[#0B1220]">{section.title}</h2>
                <div className="mt-3 space-y-3 text-base font-medium leading-7 text-[#4B5563]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{renderParagraph(paragraph)}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
