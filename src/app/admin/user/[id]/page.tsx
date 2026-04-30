"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "../../../../lib/supabaseClient";

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  subscription_status: string | null;
  subscription_tier: string | null;
  onboarding_completed: boolean | null;
  created_date: string | null;
  target_calories: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fats_g: number | null;
  training_days_per_week: number | null;
  timezone: string | null;
};

type WorkoutSession = {
  session_date: string | null;
  duration_minutes: number | null;
  avg_rpe: number | null;
  avg_heart_rate: number | null;
  status: string | null;
  photos: unknown;
};

type NutritionLog = {
  date: string | null;
  calories: number | string | null;
  protein_g: number | string | null;
  carbs_g: number | string | null;
  fats_g: number | string | null;
};

type NutritionDay = {
  date: string;
  meals: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
};

type NutritionMeal = {
  meal_type: string | null;
  food_name: string | null;
  portion: string | null;
  calories: number | string | null;
  protein_g: number | string | null;
  carbs_g: number | string | null;
  fats_g: number | string | null;
  photo_url: string | null;
};

type CommunityPost = {
  created_date: string | null;
  content_type: string | null;
  caption: string | null;
  like_count: number | string | null;
  comment_count: number | string | null;
  primary_media_url: string | null;
};

type ProgressPhoto = {
  date: string | null;
  photo_url: string | null;
};

type StrengthMetric = {
  exercise_name: string | null;
  max_weight: number | string | null;
  updated_at: string | null;
};

const tabs = ["Overview", "Nutrition", "Workouts", "Community", "Progress"] as const;

type ActiveTab = (typeof tabs)[number];

function formatValue(value: string | number | boolean | null | undefined) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : "Not set";
  }

  return value || "Not set";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLastTenDaysRange() {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 9);

  return {
    startDate: getDateOnly(startDate),
    endDate: getDateOnly(today),
  };
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

function aggregateNutritionByDay(logs: NutritionLog[]) {
  const days = new Map<string, NutritionDay>();

  logs.forEach((log) => {
    if (!log.date) {
      return;
    }

    const date = getDateOnly(new Date(log.date));
    const existingDay =
      days.get(date) ||
      ({
        date,
        meals: 0,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fats_g: 0,
      } satisfies NutritionDay);

    existingDay.meals += 1;
    existingDay.calories += toNumber(log.calories);
    existingDay.protein_g += toNumber(log.protein_g);
    existingDay.carbs_g += toNumber(log.carbs_g);
    existingDay.fats_g += toNumber(log.fats_g);

    days.set(date, existingDay);
  });

  return Array.from(days.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function formatTargetComparison(actual: number, target: number | null | undefined, suffix: string) {
  if (typeof target !== "number" || !Number.isFinite(target)) {
    return "Target not set";
  }

  const difference = Math.round(actual - target);
  const direction = difference >= 0 ? "+" : "";

  return `${direction}${difference.toLocaleString()} ${suffix} vs target`;
}

function getNutritionTargetStatus(
  day: NutritionDay,
  profile: UserProfile | null,
): { label: string; borderClassName: string; badgeClassName: string } {
  const calorieTarget = profile?.target_calories;
  const proteinTarget = profile?.target_protein_g;

  if (
    typeof calorieTarget !== "number" ||
    !Number.isFinite(calorieTarget) ||
    calorieTarget <= 0 ||
    typeof proteinTarget !== "number" ||
    !Number.isFinite(proteinTarget) ||
    proteinTarget <= 0
  ) {
    return {
      label: "Needs targets",
      borderClassName: "border-red-500",
      badgeClassName: "border-red-500 bg-red-50 text-red-700",
    };
  }

  const calorieVariance = Math.abs(day.calories - calorieTarget) / calorieTarget;
  const proteinVariance = Math.abs(day.protein_g - proteinTarget) / proteinTarget;
  const largestVariance = Math.max(calorieVariance, proteinVariance);

  if (largestVariance <= 0.1) {
    return {
      label: "On target",
      borderClassName: "border-green-500",
      badgeClassName: "border-green-500 bg-green-50 text-green-700",
    };
  }

  if (largestVariance <= 0.2) {
    return {
      label: "Close",
      borderClassName: "border-amber-500",
      badgeClassName: "border-amber-500 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Off target",
    borderClassName: "border-red-500",
    badgeClassName: "border-red-500 bg-red-50 text-red-700",
  };
}

function getNutritionReasonTags(day: NutritionDay, profile: UserProfile | null) {
  const tags: string[] = [];
  const calorieTarget = profile?.target_calories;
  const proteinTarget = profile?.target_protein_g;
  const carbsTarget = profile?.target_carbs_g;

  if (typeof calorieTarget === "number" && Number.isFinite(calorieTarget) && calorieTarget > 0) {
    if (day.calories < calorieTarget * 0.8) {
      tags.push("Low Calories");
    }

    if (day.calories > calorieTarget * 1.2) {
      tags.push("High Calories");
    }
  }

  if (typeof proteinTarget === "number" && Number.isFinite(proteinTarget) && proteinTarget > 0) {
    if (day.protein_g < proteinTarget * 0.9) {
      tags.push("Low Protein");
    }
  }

  if (typeof carbsTarget === "number" && Number.isFinite(carbsTarget) && carbsTarget > 0) {
    if (day.carbs_g < carbsTarget * 0.8) {
      tags.push("Low Carbs");
    }
  }

  return tags;
}

function groupProgressPhotosByDate(photos: ProgressPhoto[]) {
  const groupedPhotos = new Map<string, ProgressPhoto[]>();

  photos.forEach((photo) => {
    const date = photo.date ? getDateOnly(new Date(photo.date)) : "undated";
    const existingPhotos = groupedPhotos.get(date) || [];

    existingPhotos.push(photo);
    groupedPhotos.set(date, existingPhotos);
  });

  return Array.from(groupedPhotos.entries()).sort(([dateA], [dateB]) =>
    dateB.localeCompare(dateA),
  );
}

function getProgressSummary(photos: ProgressPhoto[]) {
  const validDates = photos
    .map((photo) => (photo.date ? new Date(photo.date) : null))
    .filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()))
    .sort((dateA, dateB) => dateA.getTime() - dateB.getTime());

  const firstDate = validDates[0] || null;
  const latestDate = validDates[validDates.length - 1] || null;
  const millisecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
  const weeksBetween =
    firstDate && latestDate
      ? Math.ceil((latestDate.getTime() - firstDate.getTime()) / millisecondsPerWeek)
      : 0;
  const averageWeeks = Math.max(weeksBetween, 1);
  const consistencyLabel =
    photos.length / averageWeeks >= 1 ? "Increasing consistency" : "Low consistency";

  return {
    totalEntries: photos.length,
    firstDate: firstDate ? getDateOnly(firstDate) : null,
    latestDate: latestDate ? getDateOnly(latestDate) : null,
    weeksBetween,
    consistencyLabel,
  };
}

function getPhotoUrl(photo: unknown): string | null {
  if (typeof photo === "string") {
    return photo;
  }

  if (!photo || typeof photo !== "object") {
    return null;
  }

  const photoRecord = photo as Record<string, unknown>;
  const possibleUrl =
    photoRecord.url ||
    photoRecord.publicUrl ||
    photoRecord.public_url ||
    photoRecord.signedUrl ||
    photoRecord.signed_url ||
    photoRecord.thumbnailUrl ||
    photoRecord.thumbnail_url;

  return typeof possibleUrl === "string" ? possibleUrl : null;
}

function getFirstPhotoUrl(photos: unknown): string | null {
  if (!photos) {
    return null;
  }

  if (typeof photos === "string") {
    const trimmedPhotos = photos.trim();

    if (!trimmedPhotos) {
      return null;
    }

    if (trimmedPhotos.startsWith("[") || trimmedPhotos.startsWith("{")) {
      try {
        return getFirstPhotoUrl(JSON.parse(trimmedPhotos));
      } catch {
        return trimmedPhotos;
      }
    }

    return trimmedPhotos;
  }

  if (Array.isArray(photos)) {
    for (const photo of photos) {
      const photoUrl = getPhotoUrl(photo);

      if (photoUrl) {
        return photoUrl;
      }
    }

    return null;
  }

  return getPhotoUrl(photos);
}

function StatusPill({ label, value }: { label: string; value: string | boolean | null }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-[#0B1220]">{formatValue(value)}</p>
    </div>
  );
}

function DetailCard({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  suffix?: string;
}) {
  const formattedValue = formatValue(value);

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
        {label}
      </p>
      <p className="mt-3 text-lg font-bold text-[#0B1220]">
        {formattedValue}
        {formattedValue !== "Not set" ? suffix : ""}
      </p>
    </div>
  );
}

export default function AdminUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nutritionDays, setNutritionDays] = useState<NutritionDay[]>([]);
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);
  const [nutritionErrorMessage, setNutritionErrorMessage] = useState("");
  const [expandedNutritionDay, setExpandedNutritionDay] = useState<string | null>(null);
  const [nutritionMealsByDay, setNutritionMealsByDay] = useState<Record<string, NutritionMeal[]>>(
    {},
  );
  const [loadingNutritionMealsDay, setLoadingNutritionMealsDay] = useState<string | null>(null);
  const [nutritionMealsErrorByDay, setNutritionMealsErrorByDay] = useState<
    Record<string, string>
  >({});
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);
  const [workoutErrorMessage, setWorkoutErrorMessage] = useState("");
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [communityErrorMessage, setCommunityErrorMessage] = useState("");
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [progressErrorMessage, setProgressErrorMessage] = useState("");
  const [strengthMetrics, setStrengthMetrics] = useState<StrengthMetric[]>([]);
  const [strengthMetricsErrorMessage, setStrengthMetricsErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("Overview");

  useEffect(() => {
    let isMounted = true;

    async function loadUserProfile() {
      setIsLoading(true);
      setErrorMessage("");

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        if (isMounted) {
          setErrorMessage(sessionError.message);
          setIsLoading(false);
        }
        return;
      }

      const session = sessionData.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: currentUserProfile, error: currentUserProfileError } = await supabase
        .from("User")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (currentUserProfileError) {
        if (isMounted) {
          setErrorMessage(currentUserProfileError.message);
          setIsLoading(false);
        }
        return;
      }

      if (currentUserProfile?.role !== "admin") {
        router.replace("/account");
        return;
      }

      const { data, error } = await supabase
        .from("User")
        .select(
          "id,full_name,email,role,subscription_status,subscription_tier,onboarding_completed,created_date,target_calories,target_protein_g,target_carbs_g,target_fats_g,training_days_per_week,timezone",
        )
        .eq("id", params.id)
        .single();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
      } else {
        setProfile(data);
        setIsLoading(false);

        if (data.email) {
          setIsLoadingNutrition(true);
          setNutritionErrorMessage("");
          setIsLoadingWorkouts(true);
          setWorkoutErrorMessage("");
          setIsLoadingCommunity(true);
          setCommunityErrorMessage("");
          setIsLoadingProgress(true);
          setProgressErrorMessage("");
          setStrengthMetricsErrorMessage("");

          const { startDate, endDate } = getLastTenDaysRange();
          const { data: nutritionData, error: nutritionError } = await supabase
            .schema("public")
            .from("nutrition_log")
            .select("date,calories,protein_g,carbs_g,fats_g")
            .eq("user_email", data.email)
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: false });

          if (!isMounted) {
            return;
          }

          if (nutritionError) {
            setNutritionErrorMessage(nutritionError.message);
            setNutritionDays([]);
          } else {
            setNutritionDays(aggregateNutritionByDay(nutritionData || []));
          }

          setExpandedNutritionDay(null);
          setNutritionMealsByDay({});
          setNutritionMealsErrorByDay({});

          setIsLoadingNutrition(false);

          const { data: workoutData, error: workoutError } = await supabase
            .schema("public")
            .from("workout_generator_session_log")
            .select("session_date,duration_minutes,avg_rpe,avg_heart_rate,status,photos")
            .eq("user_email", data.email)
            .gte("session_date", startDate)
            .lte("session_date", endDate)
            .order("session_date", { ascending: false });

          if (!isMounted) {
            return;
          }

          if (workoutError) {
            setWorkoutErrorMessage(workoutError.message);
            setWorkoutSessions([]);
          } else {
            setWorkoutSessions(workoutData || []);
          }

          setIsLoadingWorkouts(false);

          const { data: communityData, error: communityError } = await supabase
            .schema("public")
            .from("community_feed")
            .select("created_date,content_type,caption,like_count,comment_count,primary_media_url")
            .eq("user_email", data.email)
            .gte("created_date", startDate)
            .lte("created_date", endDate)
            .order("created_date", { ascending: false });

          if (!isMounted) {
            return;
          }

          if (communityError) {
            setCommunityErrorMessage(communityError.message);
            setCommunityPosts([]);
          } else {
            setCommunityPosts(communityData || []);
          }

          setIsLoadingCommunity(false);

          const { data: progressData, error: progressError } = await supabase
            .schema("public")
            .from("progress_photo")
            .select("date,photo_url")
            .eq("user_email", data.email)
            .order("date", { ascending: false });

          if (!isMounted) {
            return;
          }

          if (progressError) {
            setProgressErrorMessage(progressError.message);
            setProgressPhotos([]);
          } else {
            setProgressPhotos(progressData || []);
          }

          const { data: strengthData, error: strengthError } = await supabase
            .schema("public")
            .from("user_strength_metrics")
            .select("exercise_name,max_weight,updated_at")
            .eq("user_email", data.email)
            .order("max_weight", { ascending: false })
            .limit(3);

          if (!isMounted) {
            return;
          }

          if (strengthError) {
            setStrengthMetricsErrorMessage(strengthError.message);
            setStrengthMetrics([]);
          } else {
            setStrengthMetrics(strengthData || []);
          }

          setIsLoadingProgress(false);
        } else {
          setNutritionDays([]);
          setNutritionErrorMessage("");
          setExpandedNutritionDay(null);
          setNutritionMealsByDay({});
          setNutritionMealsErrorByDay({});
          setWorkoutSessions([]);
          setWorkoutErrorMessage("");
          setCommunityPosts([]);
          setCommunityErrorMessage("");
          setProgressPhotos([]);
          setProgressErrorMessage("");
          setStrengthMetrics([]);
          setStrengthMetricsErrorMessage("");
        }
      }
    }

    loadUserProfile();

    return () => {
      isMounted = false;
    };
  }, [params.id, router, supabase]);

  async function handleNutritionDayClick(date: string) {
    const nextExpandedDay = expandedNutritionDay === date ? null : date;
    setExpandedNutritionDay(nextExpandedDay);

    if (!nextExpandedDay || nutritionMealsByDay[date] || !profile?.email) {
      return;
    }

    setLoadingNutritionMealsDay(date);
    setNutritionMealsErrorByDay((currentErrors) => ({
      ...currentErrors,
      [date]: "",
    }));

    const { data, error } = await supabase
      .schema("public")
      .from("nutrition_log")
      .select("meal_type,food_name,portion,calories,protein_g,carbs_g,fats_g,photo_url")
      .eq("user_email", profile.email)
      .eq("date", date);

    if (error) {
      setNutritionMealsErrorByDay((currentErrors) => ({
        ...currentErrors,
        [date]: error.message,
      }));
      setNutritionMealsByDay((currentMeals) => ({
        ...currentMeals,
        [date]: [],
      }));
    } else {
      setNutritionMealsByDay((currentMeals) => ({
        ...currentMeals,
        [date]: data || [],
      }));
    }

    setLoadingNutritionMealsDay(null);
  }

  const identityRows = [
    ["Full name", formatValue(profile?.full_name)],
    ["Email", formatValue(profile?.email)],
    ["Role", formatValue(profile?.role)],
    ["User ID", formatValue(profile?.id)],
    ["Created", formatDate(profile?.created_date || null)],
    ["Timezone", formatValue(profile?.timezone)],
  ];
  const progressSummary = getProgressSummary(progressPhotos);

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-5 py-12 text-[#111827]">
      <section className="mx-auto w-full max-w-6xl">
        <Link
          href="/admin"
          className="inline-flex h-11 items-center rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#374151] transition hover:border-[#1157D8] hover:text-[#1157D8]"
        >
          Back to admin
        </Link>

        <div className="mt-6 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-[0_22px_64px_rgba(15,23,42,0.1)]">
          <div className="border-b border-[#E5E7EB] bg-[#F8FAFC] px-6 py-6 sm:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
              Admin Coaching Profile
            </p>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
                  {isLoading ? "Loading user..." : formatValue(profile?.full_name)}
                </h1>
                <p className="mt-3 text-base font-medium text-[#4B5563]">
                  {formatValue(profile?.email)}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
                <StatusPill label="Subscription" value={profile?.subscription_status || null} />
                <StatusPill label="Tier" value={profile?.subscription_tier || null} />
                <StatusPill
                  label="Onboarding"
                  value={profile?.onboarding_completed ?? null}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    activeTab === tab
                      ? "bg-[#1157D8] text-white shadow-[0_10px_24px_rgba(17,87,216,0.22)]"
                      : "border border-[#E5E7EB] bg-white text-[#374151] hover:border-[#1157D8] hover:text-[#1157D8]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <p className="mx-6 mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 sm:mx-8">
              {errorMessage}
            </p>
          )}

          {isLoading ? (
            <p className="px-6 py-8 text-sm font-semibold text-[#4B5563] sm:px-8">
              Loading coaching profile...
            </p>
          ) : (
            <div className="space-y-8 px-6 py-8 sm:px-8">
              {activeTab === "Overview" && (
                <>
                  <section>
                    <h2 className="text-lg font-bold text-[#0B1220]">User identity</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {identityRows.map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-5"
                        >
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                            {label}
                          </p>
                          <p className="mt-3 break-words text-base font-semibold text-[#0B1220]">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h2 className="text-lg font-bold text-[#0B1220]">Macro targets</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <DetailCard label="Calories" value={profile?.target_calories} suffix=" kcal" />
                      <DetailCard label="Protein" value={profile?.target_protein_g} suffix=" g" />
                      <DetailCard label="Carbs" value={profile?.target_carbs_g} suffix=" g" />
                      <DetailCard label="Fats" value={profile?.target_fats_g} suffix=" g" />
                    </div>
                  </section>

                  <section>
                    <h2 className="text-lg font-bold text-[#0B1220]">Training targets</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <DetailCard
                        label="Training days per week"
                        value={profile?.training_days_per_week}
                      />
                      <DetailCard label="Timezone" value={profile?.timezone} />
                    </div>
                  </section>
                </>
              )}

              {activeTab === "Nutrition" && (
                <section className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                  <h2 className="text-lg font-bold text-[#0B1220]">Nutrition</h2>

                  {isLoadingNutrition && (
                    <p className="mt-3 text-sm font-semibold text-[#4B5563]">
                      Loading nutrition logs...
                    </p>
                  )}

                  {nutritionErrorMessage && (
                    <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                      {nutritionErrorMessage}
                    </p>
                  )}

                  {!isLoadingNutrition && !nutritionErrorMessage && nutritionDays.length === 0 && (
                    <p className="mt-3 text-sm font-semibold text-[#4B5563]">
                      No nutrition logs found in the last 10 days.
                    </p>
                  )}

                  {!isLoadingNutrition && !nutritionErrorMessage && nutritionDays.length > 0 && (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {nutritionDays.map((day) => {
                        const metrics = [
                          {
                            label: "Calories",
                            value: Math.round(day.calories),
                            target: profile?.target_calories,
                            suffix: "kcal",
                          },
                          {
                            label: "Protein",
                            value: Math.round(day.protein_g),
                            target: profile?.target_protein_g,
                            suffix: "g",
                          },
                          {
                            label: "Carbs",
                            value: Math.round(day.carbs_g),
                            target: profile?.target_carbs_g,
                            suffix: "g",
                          },
                          {
                            label: "Fats",
                            value: Math.round(day.fats_g),
                            target: profile?.target_fats_g,
                            suffix: "g",
                          },
                        ];
                        const isExpanded = expandedNutritionDay === day.date;
                        const meals = nutritionMealsByDay[day.date] || [];
                        const mealsError = nutritionMealsErrorByDay[day.date];
                        const isLoadingMeals = loadingNutritionMealsDay === day.date;
                        const targetStatus = getNutritionTargetStatus(day, profile);
                        const reasonTags = getNutritionReasonTags(day, profile);

                        return (
                          <article
                            key={day.date}
                            className={`rounded-2xl border bg-white p-5 transition hover:border-[#1157D8] ${targetStatus.borderClassName}`}
                          >
                            <button
                              type="button"
                              onClick={() => handleNutritionDayClick(day.date)}
                              className="w-full text-left"
                              aria-expanded={isExpanded}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                                    Nutrition day
                                  </p>
                                  <h3 className="mt-1 text-lg font-bold text-[#0B1220]">
                                    {formatDate(day.date)}
                                  </h3>
                                </div>
                                <span className="rounded-full bg-[#EAF1FF] px-3 py-1 text-xs font-bold text-[#1157D8]">
                                  {day.meals} {day.meals === 1 ? "meal" : "meals"}
                                </span>
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-bold ${targetStatus.badgeClassName}`}
                                >
                                  {targetStatus.label}
                                </span>
                              </div>

                              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                {metrics.map((metric) => (
                                  <div
                                    key={metric.label}
                                    className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4"
                                  >
                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">
                                      {metric.label}
                                    </p>
                                    <p className="mt-2 text-lg font-bold text-[#0B1220]">
                                      {metric.value.toLocaleString()} {metric.suffix}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-[#4B5563]">
                                      {formatTargetComparison(
                                        metric.value,
                                        metric.target,
                                        metric.suffix,
                                      )}
                                    </p>
                                  </div>
                                ))}
                              </div>

                              {reasonTags.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {reasonTags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-bold text-[#4B5563]"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </button>

                            {isExpanded && (
                              <div className="mt-5 border-t border-[#E5E7EB] pt-5">
                                <h4 className="text-sm font-bold text-[#0B1220]">
                                  Individual meals
                                </h4>

                                {isLoadingMeals && (
                                  <p className="mt-3 text-sm font-semibold text-[#4B5563]">
                                    Loading meals...
                                  </p>
                                )}

                                {mealsError && (
                                  <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                                    {mealsError}
                                  </p>
                                )}

                                {!isLoadingMeals && !mealsError && meals.length === 0 && (
                                  <p className="mt-3 text-sm font-semibold text-[#4B5563]">
                                    No individual meals found for this day.
                                  </p>
                                )}

                                {!isLoadingMeals && !mealsError && meals.length > 0 && (
                                  <div className="mt-4 space-y-3">
                                    {meals.map((meal, mealIndex) => (
                                      <div
                                        key={`${meal.food_name || "meal"}-${mealIndex}`}
                                        className="flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 sm:flex-row"
                                      >
                                        {meal.photo_url && (
                                          <div
                                            aria-label="Meal photo"
                                            className="h-32 w-full shrink-0 rounded-2xl bg-[#E5E7EB] bg-cover bg-center sm:h-24 sm:w-24"
                                            role="img"
                                            style={{ backgroundImage: `url(${meal.photo_url})` }}
                                          />
                                        )}

                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                                                {formatValue(meal.meal_type)}
                                              </p>
                                              <h5 className="mt-1 text-base font-bold text-[#0B1220]">
                                                {formatValue(meal.food_name)}
                                              </h5>
                                              <p className="mt-1 text-sm font-semibold text-[#4B5563]">
                                                {formatValue(meal.portion)}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                            <div>
                                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">
                                                Calories
                                              </p>
                                              <p className="mt-1 text-sm font-bold text-[#0B1220]">
                                                {Math.round(toNumber(meal.calories)).toLocaleString()} kcal
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">
                                                Protein
                                              </p>
                                              <p className="mt-1 text-sm font-bold text-[#0B1220]">
                                                {Math.round(toNumber(meal.protein_g)).toLocaleString()} g
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">
                                                Carbs
                                              </p>
                                              <p className="mt-1 text-sm font-bold text-[#0B1220]">
                                                {Math.round(toNumber(meal.carbs_g)).toLocaleString()} g
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">
                                                Fats
                                              </p>
                                              <p className="mt-1 text-sm font-bold text-[#0B1220]">
                                                {Math.round(toNumber(meal.fats_g)).toLocaleString()} g
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {activeTab === "Workouts" && (
                <section className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                  <h2 className="text-lg font-bold text-[#0B1220]">Workouts</h2>

                  {isLoadingWorkouts && (
                    <p className="mt-3 text-sm font-semibold text-[#4B5563]">
                      Loading workout sessions...
                    </p>
                  )}

                  {workoutErrorMessage && (
                    <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                      {workoutErrorMessage}
                    </p>
                  )}

                  {!isLoadingWorkouts && !workoutErrorMessage && workoutSessions.length === 0 && (
                    <p className="mt-3 text-sm font-semibold text-[#4B5563]">
                      No workout sessions found in the last 10 days.
                    </p>
                  )}

                  {!isLoadingWorkouts && !workoutErrorMessage && workoutSessions.length > 0 && (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {workoutSessions.map((session, index) => {
                        const photoUrl = getFirstPhotoUrl(session.photos);

                        return (
                          <article
                            key={`${session.session_date || "session"}-${index}`}
                            className="flex gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4"
                          >
                            {photoUrl && (
                              <div
                                aria-label="Workout session photo"
                                className="h-24 w-24 shrink-0 rounded-2xl bg-[#E5E7EB] bg-cover bg-center"
                                role="img"
                                style={{ backgroundImage: `url(${photoUrl})` }}
                              />
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                                    Session date
                                  </p>
                                  <h3 className="mt-1 text-lg font-bold text-[#0B1220]">
                                    {formatDate(session.session_date)}
                                  </h3>
                                </div>
                                <span className="rounded-full bg-[#EAF1FF] px-3 py-1 text-xs font-bold text-[#1157D8]">
                                  {formatValue(session.status)}
                                </span>
                              </div>

                              <div className="mt-4 grid grid-cols-3 gap-3">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">
                                    Duration
                                  </p>
                                  <p className="mt-1 text-sm font-bold text-[#0B1220]">
                                    {formatValue(session.duration_minutes)}
                                    {session.duration_minutes ? " min" : ""}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">
                                    RPE
                                  </p>
                                  <p className="mt-1 text-sm font-bold text-[#0B1220]">
                                    {formatValue(session.avg_rpe)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">
                                    HR
                                  </p>
                                  <p className="mt-1 text-sm font-bold text-[#0B1220]">
                                    {formatValue(session.avg_heart_rate)}
                                    {session.avg_heart_rate ? " bpm" : ""}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {activeTab === "Community" && (
                <section className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                  <h2 className="text-lg font-bold text-[#0B1220]">Community</h2>

                  {isLoadingCommunity && (
                    <p className="mt-3 text-sm font-semibold text-[#4B5563]">
                      Loading community posts...
                    </p>
                  )}

                  {communityErrorMessage && (
                    <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                      {communityErrorMessage}
                    </p>
                  )}

                  {!isLoadingCommunity && !communityErrorMessage && communityPosts.length === 0 && (
                    <p className="mt-3 text-sm font-semibold text-[#4B5563]">
                      No community posts found in the last 10 days.
                    </p>
                  )}

                  {!isLoadingCommunity && !communityErrorMessage && communityPosts.length > 0 && (
                    <div className="mt-5 space-y-4">
                      {communityPosts.map((post, index) => (
                        <article
                          key={`${post.created_date || "post"}-${index}`}
                          className="flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:flex-row"
                        >
                          {post.primary_media_url && (
                            <div
                              aria-label="Community post media"
                              className="h-40 w-full shrink-0 rounded-2xl bg-[#E5E7EB] bg-cover bg-center sm:h-28 sm:w-28"
                              role="img"
                              style={{ backgroundImage: `url(${post.primary_media_url})` }}
                            />
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                                  {formatValue(post.content_type)}
                                </p>
                                <h3 className="mt-1 text-lg font-bold text-[#0B1220]">
                                  {formatDate(post.created_date)}
                                </h3>
                              </div>
                              <span className="rounded-full bg-[#EAF1FF] px-3 py-1 text-xs font-bold text-[#1157D8]">
                                {toNumber(post.like_count).toLocaleString()} likes ·{" "}
                                {toNumber(post.comment_count).toLocaleString()} comments
                              </span>
                            </div>

                            <p className="mt-4 whitespace-pre-line text-sm font-semibold leading-6 text-[#374151]">
                              {post.caption || "No caption provided."}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === "Progress" && (
                <section className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                  <h2 className="text-lg font-bold text-[#0B1220]">Progress</h2>

                  {isLoadingProgress && (
                    <p className="mt-3 text-sm font-semibold text-[#4B5563]">
                      Loading progress photos...
                    </p>
                  )}

                  {progressErrorMessage && (
                    <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                      {progressErrorMessage}
                    </p>
                  )}

                  {!isLoadingProgress && !progressErrorMessage && (
                    <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                            Strength Progress
                          </p>
                          <h3 className="mt-2 text-lg font-bold text-[#0B1220]">
                            Top 3 lifts
                          </h3>
                        </div>
                      </div>

                      {strengthMetricsErrorMessage && (
                        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                          {strengthMetricsErrorMessage}
                        </p>
                      )}

                      {!strengthMetricsErrorMessage && strengthMetrics.length === 0 && (
                        <p className="mt-4 text-sm font-semibold text-[#4B5563]">
                          No strength metrics found.
                        </p>
                      )}

                      {!strengthMetricsErrorMessage && strengthMetrics.length > 0 && (
                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          {strengthMetrics.map((metric, index) => (
                            <div
                              key={`${metric.exercise_name || "lift"}-${index}`}
                              className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4"
                            >
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                                Lift {index + 1}
                              </p>
                              <h4 className="mt-2 text-base font-bold text-[#0B1220]">
                                {formatValue(metric.exercise_name)}
                              </h4>
                              <p className="mt-3 text-2xl font-bold text-[#0B1220]">
                                {formatValue(toNumber(metric.max_weight))} kg
                              </p>
                              <p className="mt-2 text-xs font-semibold text-[#4B5563]">
                                Latest: {formatDate(metric.updated_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!isLoadingProgress && !progressErrorMessage && progressPhotos.length === 0 && (
                    <p className="mt-3 text-sm font-semibold text-[#4B5563]">
                      No progress photos found.
                    </p>
                  )}

                  {!isLoadingProgress && !progressErrorMessage && progressPhotos.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                            Progress summary
                          </p>
                          <p className="mt-2 text-lg font-bold text-[#0B1220]">
                            {progressSummary.consistencyLabel}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            progressSummary.consistencyLabel === "Increasing consistency"
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {progressSummary.consistencyLabel}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <DetailCard label="Total entries" value={progressSummary.totalEntries} />
                        <DetailCard label="First date" value={formatDate(progressSummary.firstDate)} />
                        <DetailCard label="Latest date" value={formatDate(progressSummary.latestDate)} />
                        <DetailCard label="Weeks between" value={progressSummary.weeksBetween} />
                      </div>
                    </div>
                  )}

                  {!isLoadingProgress && !progressErrorMessage && progressPhotos.length > 0 && (
                    <div className="mt-5 space-y-6">
                      {groupProgressPhotosByDate(progressPhotos).map(([date, photos]) => (
                        <div key={date} className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-[#1157D8]" />
                            <h3 className="text-base font-bold text-[#0B1220]">
                              {date === "undated" ? "Undated" : formatDate(date)}
                            </h3>
                          </div>

                          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {photos.map((photo, index) => (
                              <article
                                key={`${photo.date || "photo"}-${index}`}
                                className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
                              >
                                {photo.photo_url ? (
                                  <div
                                    aria-label="Progress photo"
                                    className="aspect-[4/5] bg-[#E5E7EB] bg-cover bg-center"
                                    role="img"
                                    style={{ backgroundImage: `url(${photo.photo_url})` }}
                                  />
                                ) : (
                                  <div className="flex aspect-[4/5] items-center justify-center bg-[#E5E7EB] px-4 text-center text-sm font-semibold text-[#4B5563]">
                                    No image available
                                  </div>
                                )}

                                <div className="border-t border-[#E5E7EB] px-4 py-3">
                                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                                    Progress photo
                                  </p>
                                  <p className="mt-1 text-sm font-bold text-[#0B1220]">
                                    {formatDate(photo.date)}
                                  </p>
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
