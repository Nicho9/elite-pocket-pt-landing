"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../lib/supabaseClient";

type WebinarRecord = Record<string, unknown>;

function readString(record: WebinarRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function readNumber(record: WebinarRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function formatReleaseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Coming soon";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCountdown(value: string, now: number) {
  const releaseAt = new Date(value).getTime();
  const difference = Math.max(releaseAt - now, 0);
  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((difference / (1000 * 60)) % 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function webinarIsLocked(webinar: WebinarRecord, now: number) {
  const releaseAt = readString(webinar, ["scheduled_release_at", "release_at"]);
  if (!releaseAt) {
    return false;
  }

  const releaseTime = new Date(releaseAt).getTime();
  return Number.isFinite(releaseTime) && releaseTime > now;
}

export default function VipWebinarsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [webinars, setWebinars] = useState<WebinarRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadWebinars() {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("vip_webinars")
        .select("*")
        .eq("is_published", true);

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setWebinars([]);
      } else {
        setWebinars(Array.isArray(data) ? data : []);
      }

      setIsLoading(false);
    }

    loadWebinars();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const sortedWebinars = [...webinars].sort((left, right) => {
    const leftDate = readString(left, ["scheduled_release_at", "release_at", "created_at"]);
    const rightDate = readString(right, ["scheduled_release_at", "release_at", "created_at"]);
    return new Date(leftDate).getTime() - new Date(rightDate).getTime();
  });

  return (
    <main className="min-h-screen bg-[#F5F7FB] text-[#111827]">
      <section className="relative overflow-hidden px-5 py-10 sm:py-12">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#FFFFFF_0%,#EEF4FF_42%,#F7FAFC_100%)]" />
        <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_18%_10%,rgba(17,87,216,0.15),transparent_34%),radial-gradient(circle_at_82%_0%,rgba(20,83,45,0.12),transparent_30%)]" />

        <div className="relative mx-auto w-full max-w-7xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="text-base font-bold tracking-tight text-[#0B1220]">
              Elite Pocket PT
            </Link>

            <Link
              href="/login"
              className="w-fit rounded-full border border-[#D8E1F0] bg-white/90 px-5 py-3 text-sm font-bold text-[#374151] shadow-sm transition hover:border-[#1157D8] hover:text-[#1157D8]"
            >
              Login
            </Link>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,0.96fr)_minmax(340px,0.54fr)] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
                VIP Webinars
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-[#0B1220] sm:text-5xl lg:text-6xl">
                Interactive education sessions for serious progress.
              </h1>
              <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-[#374151]">
                View upcoming and released VIP webinars covering training, nutrition, mobility, and coaching strategy.
                VIP members can access live and released sessions, then complete section quizzes to reinforce what they
                have learned.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#1157D8]">
                Member library
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                  <p className="text-2xl font-bold text-[#0B1220]">{sortedWebinars.length}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#64748B]">Sessions</p>
                </div>
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                  <p className="text-2xl font-bold text-[#0B1220]">
                    {sortedWebinars.filter((webinar) => webinarIsLocked(webinar, now)).length}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#64748B]">Upcoming</p>
                </div>
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                  <p className="text-2xl font-bold text-[#0B1220]">
                    {sortedWebinars.filter((webinar) => !webinarIsLocked(webinar, now)).length}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#64748B]">Released</p>
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <p className="mt-8 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {errorMessage}
            </p>
          )}

          {isLoading ? (
            <p className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-6 text-sm font-semibold text-[#4B5563] shadow-sm">
              Loading VIP webinars...
            </p>
          ) : sortedWebinars.length === 0 ? (
            <div className="mt-8 rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-[0_22px_64px_rgba(15,23,42,0.08)]">
              <h2 className="text-2xl font-bold text-[#0B1220]">No webinars published yet</h2>
              <p className="mt-3 text-base font-medium leading-7 text-[#4B5563]">
                Published VIP webinars will appear here as soon as they are available.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {sortedWebinars.map((webinar) => {
              const id = readString(webinar, ["id", "webinar_id"]) || readString(webinar, ["slug", "title"]);
              const slug = readString(webinar, ["slug"]);
              const title = readString(webinar, ["title", "name"]) || "VIP Webinar";
              const description = readString(webinar, ["description", "summary", "intro"]) || "VIP education session.";
              const thumbnailUrl = readString(webinar, ["thumbnail_url"]);
              const releaseAt = readString(webinar, ["scheduled_release_at", "release_at"]);
              const durationMinutes = readNumber(webinar, ["duration_minutes", "duration"]);
              const locked = webinarIsLocked(webinar, now);
              const statusText = locked ? "Locked" : "Live";
              const releaseText = releaseAt
                ? locked
                  ? `Unlocks in ${formatCountdown(releaseAt, now)}`
                  : `Released ${formatReleaseDate(releaseAt)}`
                : locked
                  ? "Unlocking soon"
                  : "Available now";
              const cardClassName = `group block h-full overflow-hidden rounded-[1.75rem] border border-[#E4EAF4] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] ring-1 ring-white/80 transition ${
                locked
                  ? "cursor-not-allowed"
                  : "hover:-translate-y-1 hover:border-[#1157D8]/45 hover:shadow-[0_28px_80px_rgba(17,87,216,0.18)]"
              }`;

              const content = (
                <>
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#E8EEF7]">
                    {thumbnailUrl ? (
                      <div
                        className={`h-full w-full bg-cover bg-center transition duration-500 ${
                          locked ? "opacity-90 brightness-95 saturate-90" : "opacity-100 group-hover:scale-105"
                        }`}
                        style={{ backgroundImage: `url("${thumbnailUrl}")` }}
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(17,87,216,0.18),transparent_34%),linear-gradient(135deg,#F8FBFF_0%,#DDE8FA_50%,#EEF6FF_100%)] ${
                          locked ? "opacity-85 saturate-75" : ""
                        }`}
                      >
                        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#1157D8]/15 bg-white/70 shadow-[0_18px_60px_rgba(17,87,216,0.16)]">
                          <span className="text-lg font-bold text-[#1157D8]">VIP</span>
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#020617]/28 to-transparent" />
                    <div className="absolute left-4 top-4 flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] shadow-sm backdrop-blur ${
                          locked ? "bg-white/85 text-[#334155]" : "bg-[#DBFCE7]/95 text-[#14532D]"
                        }`}
                      >
                        {statusText}
                      </span>
                      {durationMinutes !== null && (
                        <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-[#334155] shadow-sm backdrop-blur">
                          {durationMinutes} min
                        </span>
                      )}
                    </div>

                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/8 px-5 text-center">
                        <div className="rounded-2xl border border-white/80 bg-white/88 px-5 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur">
                          <div className="mx-auto inline-flex h-10 items-center justify-center rounded-full border border-[#CBD5E1] bg-white px-4">
                            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#334155]">
                              Locked
                            </span>
                          </div>
                          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#64748B]">
                            Unlocks in
                          </p>
                          <p className="mt-1 text-xl font-bold text-[#0B1220]">
                            {releaseAt ? formatCountdown(releaseAt, now) : "Soon"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h2 className="text-2xl font-bold tracking-tight text-[#0B1220]">{title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-[#475569]">{description}</p>
                    <div className="mt-5 flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">
                      <p>{releaseText}</p>
                      {!locked && <p className="text-[#1157D8]">Watch</p>}
                    </div>
                  </div>
                </>
              );

              if (locked || !slug) {
                return (
                  <div key={id} className={cardClassName} aria-disabled="true">
                    {content}
                  </div>
                );
              }

              return (
                <Link key={id} href={`/vip-webinars/${slug}`} className={cardClassName}>
                  {content}
                </Link>
              );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
