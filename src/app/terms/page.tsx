import Link from "next/link";

const sections = [
  {
    title: "Subscription and access",
    body: [
      "Elite Pocket PT provides access to digital coaching features, including training, nutrition, mobility, progress tracking, community features, and coaching support depending on your plan.",
      "Your access may depend on your subscription status, selected plan, account standing, and availability of the service.",
    ],
  },
  {
    title: "Payments and external checkout",
    body: [
      "Payments and subscription management may be handled through Stripe or another external checkout or payment provider.",
      "By purchasing access, you agree to the payment terms shown at checkout and any applicable payment provider terms. Subscription cancellation, billing updates, and refunds may need to be handled through the relevant payment provider where applicable.",
    ],
  },
  {
    title: "Fitness and nutrition disclaimer",
    body: [
      "Elite Pocket PT provides fitness, nutrition, mobility, and coaching information for general education and performance support. It is not medical advice, diagnosis, or treatment.",
      "You are responsible for deciding whether exercises, nutrition guidance, or programmes are suitable for you. Consult a qualified medical, fitness, or nutrition professional before starting or changing your programme where needed, especially if you have injuries, medical conditions, pregnancy, medication use, or other health concerns.",
    ],
  },
  {
    title: "Account responsibility",
    body: [
      "You are responsible for keeping your account details accurate and secure, protecting your login credentials, and all activity that occurs under your account.",
      "You must not share access, impersonate another person, or use the service in a way that interferes with its operation or security.",
    ],
  },
  {
    title: "Acceptable use and community conduct",
    body: [
      "Elite Pocket PT has no tolerance for objectionable content, harassment, abuse, hate speech, spam, sexual content, illegal content, or abusive users.",
      "Users can report objectionable community content and block abusive users directly inside the app.",
      "We review objectionable content reports within 24 hours and may remove offending content, restrict features, suspend accounts, or remove users who violate these Terms or threaten the safety of the community.",
    ],
  },
  {
    title: "Content ownership and licence",
    body: [
      "Elite Pocket PT owns or licenses the app, website, coaching framework, programme structure, written content, design, branding, and related materials.",
      "You retain ownership of content you submit, such as logs, photos, messages, and community posts. By submitting content, you grant Elite Pocket PT a licence to use it as needed to operate, provide, secure, and improve the service.",
    ],
  },
  {
    title: "Limitation of liability",
    body: [
      "To the fullest extent permitted by law, Elite Pocket PT is not liable for indirect, incidental, special, consequential, or punitive damages, or for outcomes resulting from your use of training, nutrition, mobility, or coaching information.",
      "Nothing in these Terms limits rights that cannot be limited under applicable law.",
    ],
  },
  {
    title: "Contact",
    body: ["For questions about these Terms, email mike@elitepocketpt.com."],
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

export default function TermsPage() {
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
            Terms of Service
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
