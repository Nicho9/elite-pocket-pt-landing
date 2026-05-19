import Link from "next/link";

const sections = [
  {
    title: "How to request deletion",
    body: [
      'To request account deletion, email mike@elitepocketpt.com with the subject "Delete my Elite Pocket PT account".',
      "Include the email address used for your Elite Pocket PT account so we can locate and verify the account.",
    ],
  },
  {
    title: "What will be deleted or anonymised",
    body: [
      "Where possible, we will delete or anonymise your account profile, training records, nutrition records, progress records, progress photos if uploaded, support records linked only to your account, community content where technically possible, and push notification tokens.",
      "Some content may be difficult to fully remove if it has already been included in backups, logs, or shared community context, but we will take reasonable steps to remove or anonymise eligible account data.",
    ],
  },
  {
    title: "What may be retained",
    body: [
      "We may retain certain information where legally or operationally necessary, including transaction records, payment and subscription records, security logs, fraud prevention records, support history required for dispute handling, and legal or compliance records.",
      "Subscription cancellation may need to be handled through the relevant payment provider if applicable.",
    ],
  },
  {
    title: "Processing window",
    body: [
      "We aim to process verified deletion requests within 30 days, unless a longer period is required for legal, security, payment, or operational reasons.",
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
        href="mailto:mike@elitepocketpt.com?subject=Delete%20my%20Elite%20Pocket%20PT%20account"
        className="font-bold text-[#1157D8] underline decoration-[#1157D8]/30 underline-offset-4 transition hover:text-[#0A39A8]"
      >
        {email}
      </a>
      {after}
    </>
  );
}

export default function DeleteAccountPage() {
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
            Account Support
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#0B1220]">
            Delete Account
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
