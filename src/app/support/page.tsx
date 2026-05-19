import Link from "next/link";

const sections = [
  {
    title: "Contact support",
    body: ["For Elite Pocket PT support, email mike@elitepocketpt.com."],
  },
  {
    title: "What we can help with",
    body: [
      "Support topics include account access, subscription and billing questions, app issues, training and nutrition questions, account deletion requests, and privacy requests.",
    ],
  },
  {
    title: "What to include",
    body: [
      "When contacting support, include the email address used for your account, the device and app version if relevant, a clear description of the issue, screenshots where helpful, and any recent steps you took before the issue happened.",
      "For billing or subscription questions, include the payment provider or checkout method used if you know it. Do not send full card details.",
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

export default function SupportPage() {
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
            Help
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#0B1220]">
            Support
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
