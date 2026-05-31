import Link from "next/link";

export default function CheckoutCancelledPage() {
  return (
    <main className="min-h-screen bg-[#05070D] px-5 py-8 text-white sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl flex-col">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur">
          <Link href="/" className="text-base font-bold tracking-tight text-white transition hover:text-[#6EA8FF]">
            Elite Pocket PT
          </Link>
          <Link href="/#pricing" className="text-sm font-bold text-[#6EA8FF] transition hover:text-white">
            Pricing
          </Link>
        </header>

        <section className="flex flex-1 items-center py-10">
          <div className="w-full rounded-[2rem] border border-white/10 border-t-[#1157D8]/70 bg-[#0E1319] p-6 shadow-[0_32px_100px_rgba(0,0,0,0.48)] ring-1 ring-[#1157D8]/15 sm:p-10 lg:p-12">
            <p className="inline-flex rounded-full border border-[#1157D8]/30 bg-[#1157D8]/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#6EA8FF]">
              Checkout not completed
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Checkout cancelled
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-[#D7E4FF]">
              No payment was completed. If you created an account before checkout, you can restart checkout from the pricing section.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#pricing"
                className="inline-flex h-14 items-center justify-center rounded-full bg-[#1157D8] px-7 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,87,216,0.32)] transition hover:bg-[#0A39A8]"
              >
                Return to pricing
              </Link>
              <Link
                href="/"
                className="inline-flex h-14 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-7 text-base font-bold text-white/86 transition hover:bg-white/10 hover:text-white"
              >
                Back to website
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
