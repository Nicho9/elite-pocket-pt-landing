import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-[#05070D] px-5 py-8 text-white sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur">
          <Link href="/" className="text-base font-bold tracking-tight text-white transition hover:text-[#6EA8FF]">
            Elite Pocket PT
          </Link>
          <Link href="/login" className="text-sm font-bold text-[#6EA8FF] transition hover:text-white">
            Login
          </Link>
        </header>

        <section className="flex flex-1 items-center py-10">
          <div className="w-full overflow-hidden rounded-[2rem] border border-white/10 border-t-[#1157D8]/70 bg-[#0E1319] shadow-[0_32px_100px_rgba(0,0,0,0.48)] ring-1 ring-[#1157D8]/15">
            <div className="grid gap-0 lg:grid-cols-[1fr_0.82fr]">
              <div className="p-6 sm:p-10 lg:p-12">
                <p className="inline-flex rounded-full border border-[#1157D8]/30 bg-[#1157D8]/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#6EA8FF]">
                  Checkout confirmed
                </p>
                <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Payment complete
                </h1>
                <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-[#D7E4FF]">
                  Your Elite Pocket PT account has been created and your subscription is being activated.
                </p>
                <p className="mt-5 max-w-2xl rounded-2xl border border-[#1157D8]/25 bg-[#1157D8]/10 px-5 py-4 text-sm font-semibold leading-6 text-white/78">
                  If access does not appear immediately, wait a minute and log in again while Stripe confirms the subscription.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex h-14 items-center justify-center rounded-full bg-[#1157D8] px-7 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,87,216,0.32)] transition hover:bg-[#0A39A8]"
                  >
                    Log in to your account
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex h-14 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-7 text-base font-bold text-white/86 transition hover:bg-white/10 hover:text-white"
                  >
                    Back to website
                  </Link>
                </div>
              </div>

              <aside className="border-t border-white/10 bg-[#080A0D] p-6 sm:p-10 lg:border-l lg:border-t-0">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6EA8FF]">
                  Next step
                </p>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
                  Download the app
                </h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/65">
                  Install Elite Pocket PT, then log in with the account details you created before checkout.
                </p>

                <div className="mt-7 grid gap-3">
                  <a
                    href="#"
                    className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white px-5 text-base font-bold text-[#0B1220] shadow-[0_14px_34px_rgba(255,255,255,0.08)] transition hover:bg-[#EAF1FF]"
                  >
                    Download on the App Store
                  </a>
                  <a
                    href="#"
                    className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white px-5 text-base font-bold text-[#0B1220] shadow-[0_14px_34px_rgba(255,255,255,0.08)] transition hover:bg-[#EAF1FF]"
                  >
                    Get it on Google Play
                  </a>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
