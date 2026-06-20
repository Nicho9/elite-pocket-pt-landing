"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabaseClient";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  created_date: string | null;
  updated_date: string | null;
  last_sign_in_at: string | null;
  onboarding_completed: boolean | null;
  onboarding_current_step: string | null;
  subscription_status: string | null;
  subscription_tier: string | null;
  subscription_end_date: string | null;
  subscription_ends_at: string | null;
  gender: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  goal: string | null;
  activity_level: string | null;
  workout_goals: string[] | string | null;
  training_days_per_week: number | null;
  apple_environment: string | null;
  apple_product_id: string | null;
  apple_subscription_expires_at: string | null;
  google_subscription_expires_at: string | null;
  payment_provider: string | null;
  latest_subscription_status: string | null;
  latest_subscription_period_end: string | null;
  latest_subscription_apple_environment: string | null;
  latest_subscription_apple_product_id: string | null;
  latest_subscription_google_environment: string | null;
  latest_subscription_google_product_id: string | null;
  has_app_access: boolean | null;
  days_since_signup: number | null;
  signup_funnel_status: string | null;
  workout_profile_count: number | null;
  meal_plan_count: number | null;
  nutrition_log_count: number | null;
  workout_log_count: number | null;
  mobility_flow_count: number | null;
  has_workout_profile: boolean | null;
  has_meal_plan: boolean | null;
  has_nutrition_logs: boolean | null;
  has_workout_logs: boolean | null;
  has_mobility_flow: boolean | null;
  last_activity_at: string | null;
  days_since_login: number | null;
  days_since_last_activity: number | null;
  lifecycle_status: string | null;
  engagement_status: string | null;
  activation_status: string | null;
};

type DashboardKpis = {
  total_users: number | null;
  new_users_today: number | null;
  new_users_7_days: number | null;
  new_users_30_days: number | null;
  onboarding_completed_today: number | null;
  onboarding_completed_7_days: number | null;
  onboarding_completed_30_days: number | null;
  completed_onboarding_not_subscribed: number | null;
  paid_active_users: number | null;
  ios_production_subscribers: number | null;
  apple_subscribers: number | null;
  stripe_subscribers: number | null;
  google_subscribers: number | null;
  active_subscriptions: number | null;
  active_trials: number | null;
  users_active_today: number | null;
  users_active_this_week: number | null;
  inactive_7_plus: number | null;
  inactive_14_plus: number | null;
  inactive_30_plus: number | null;
  onboarding_incomplete: number | null;
  activated_users: number | null;
  missing_workout_profile: number | null;
  missing_meal_plan: number | null;
  nutrition_adopters: number | null;
  mobility_adopters: number | null;
  workout_adopters: number | null;
};

type LifecycleFilter = "all" | "active" | "trial_active" | "trial_expired" | "inactive";
type EngagementFilter =
  | "all"
  | "active_today"
  | "active_this_week"
  | "inactive_7_plus"
  | "inactive_14_plus"
  | "inactive_30_plus"
  | "never_logged_in";
type ActivationFilter =
  | "all"
  | "activated"
  | "onboarding_incomplete"
  | "missing_workout_profile"
  | "missing_meal_plan"
  | "no_feature_usage";
type FeatureFilter = "all" | "nutrition_adopters" | "mobility_adopters" | "workout_adopters";
type SelectedKpiFilter = keyof DashboardKpis | null;

const kpiCards: Array<[string, keyof DashboardKpis]> = [
  ["Total users", "total_users"],
  ["New users today", "new_users_today"],
  ["New users 7 days", "new_users_7_days"],
  ["New users 30 days", "new_users_30_days"],
  ["Onboarded today", "onboarding_completed_today"],
  ["Onboarded 7 days", "onboarding_completed_7_days"],
  ["Paywall drop-offs", "completed_onboarding_not_subscribed"],
  ["Paid active users", "paid_active_users"],
  ["iOS production", "ios_production_subscribers"],
  ["Apple subscribers", "apple_subscribers"],
  ["Stripe subscribers", "stripe_subscribers"],
  ["Google subscribers", "google_subscribers"],
  ["Active trials", "active_trials"],
  ["Active subscriptions", "active_subscriptions"],
  ["Users active today", "users_active_today"],
  ["Users active this week", "users_active_this_week"],
  ["Inactive 7+ days", "inactive_7_plus"],
  ["Inactive 14+ days", "inactive_14_plus"],
  ["Inactive 30+ days", "inactive_30_plus"],
  ["Onboarding incomplete", "onboarding_incomplete"],
  ["Activated users", "activated_users"],
  ["Missing workout profile", "missing_workout_profile"],
  ["Missing meal plan", "missing_meal_plan"],
  ["Nutrition adopters", "nutrition_adopters"],
  ["Mobility adopters", "mobility_adopters"],
  ["Workout adopters", "workout_adopters"],
];

const lifecycleFilterLabels: Record<LifecycleFilter, string> = {
  all: "All lifecycles",
  active: "Active subscriptions",
  trial_active: "Active trials",
  trial_expired: "Trial expired",
  inactive: "Inactive",
};

const engagementFilterLabels: Record<EngagementFilter, string> = {
  all: "All engagement",
  active_today: "Active today",
  active_this_week: "Active this week",
  inactive_7_plus: "Inactive 7+ days",
  inactive_14_plus: "Inactive 14+ days",
  inactive_30_plus: "Inactive 30+ days",
  never_logged_in: "Never logged in",
};

const activationFilterLabels: Record<ActivationFilter, string> = {
  all: "All activation",
  activated: "Activated users",
  onboarding_incomplete: "Onboarding incomplete",
  missing_workout_profile: "Missing workout profile",
  missing_meal_plan: "Missing meal plan",
  no_feature_usage: "No feature usage",
};

const featureFilterLabels: Record<FeatureFilter, string> = {
  all: "All feature usage",
  nutrition_adopters: "Nutrition adopters",
  mobility_adopters: "Mobility adopters",
  workout_adopters: "Workout adopters",
};

const kpiFilterLabels: Record<keyof DashboardKpis, string> = {
  total_users: "All users",
  new_users_today: "New users today",
  new_users_7_days: "New users 7 days",
  new_users_30_days: "New users 30 days",
  onboarding_completed_today: "Onboarded today",
  onboarding_completed_7_days: "Onboarded 7 days",
  onboarding_completed_30_days: "Onboarded 30 days",
  completed_onboarding_not_subscribed: "Paywall drop-offs",
  paid_active_users: "Paid active users",
  ios_production_subscribers: "iOS production",
  apple_subscribers: "Apple subscribers",
  stripe_subscribers: "Stripe subscribers",
  google_subscribers: "Google subscribers",
  active_subscriptions: "Active subscriptions",
  active_trials: "Active trials",
  users_active_today: "Users active today",
  users_active_this_week: "Users active this week",
  inactive_7_plus: "Inactive 7+ days",
  inactive_14_plus: "Inactive 14+ days",
  inactive_30_plus: "Inactive 30+ days",
  onboarding_incomplete: "Onboarding incomplete",
  activated_users: "Activated users",
  missing_workout_profile: "Missing workout profile",
  missing_meal_plan: "Missing meal plan",
  nutrition_adopters: "Nutrition adopters",
  mobility_adopters: "Mobility adopters",
  workout_adopters: "Workout adopters",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCount(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "0";
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  return "Unknown";
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getRenewalOrExpiryDate(user: UserRow) {
  return (
    user.latest_subscription_period_end ||
    user.subscription_ends_at ||
    user.apple_subscription_expires_at ||
    user.google_subscription_expires_at
  );
}

function isWithinDays(value: string | null | undefined, days: number) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const elapsed = Date.now() - date.getTime();
  const windowMs = days * 24 * 60 * 60 * 1000;

  return elapsed >= 0 && elapsed <= windowMs;
}

function matchesSignupWindow(user: UserRow, days: number) {
  if (typeof user.days_since_signup === "number") {
    return user.days_since_signup >= 0 && user.days_since_signup < days;
  }

  return isWithinDays(user.created_date, days);
}

function getPaymentProvider(user: UserRow) {
  if (user.payment_provider) {
    return user.payment_provider;
  }

  if (
    user.apple_product_id ||
    user.latest_subscription_apple_product_id ||
    user.apple_subscription_expires_at
  ) {
    return "apple";
  }

  if (user.latest_subscription_google_product_id || user.google_subscription_expires_at) {
    return "google";
  }

  return null;
}

function hasActivePaidSubscription(user: UserRow) {
  const status = (user.latest_subscription_status || user.subscription_status || "").toLowerCase();

  return user.has_app_access === true || status === "active";
}

function hasAppleSubscription(user: UserRow) {
  return (
    getPaymentProvider(user)?.toLowerCase() === "apple" ||
    Boolean(user.apple_product_id || user.latest_subscription_apple_product_id)
  );
}

function hasGoogleSubscription(user: UserRow) {
  return (
    getPaymentProvider(user)?.toLowerCase() === "google" ||
    Boolean(user.latest_subscription_google_product_id)
  );
}

function hasStripeSubscription(user: UserRow) {
  return getPaymentProvider(user)?.toLowerCase() === "stripe";
}

function getStatusTone(value: string | null | undefined) {
  const status = value?.toLowerCase() || "";

  if (["active", "activated", "active_today", "active_this_week"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status.includes("trial") || status.includes("incomplete")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    status.includes("inactive") ||
    status.includes("missing") ||
    status.includes("expired") ||
    status.includes("never") ||
    status.includes("no_feature")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

function StatusPill({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusTone(
        value,
      )}`}
    >
      {formatStatusLabel(value)}
    </span>
  );
}

function BooleanPill({ value }: { value: boolean | null | undefined }) {
  const tone =
    value === true
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === false
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>
      {formatBoolean(value)}
    </span>
  );
}

function hasNoFeatureUsage(user: UserRow) {
  return (
    user.nutrition_log_count === 0 &&
    user.workout_log_count === 0 &&
    user.mobility_flow_count === 0
  );
}

function matchesSelectedKpiFilter(user: UserRow, selectedKpiFilter: SelectedKpiFilter) {
  if (!selectedKpiFilter || selectedKpiFilter === "total_users") {
    return true;
  }

  if (selectedKpiFilter === "active_trials") {
    return user.lifecycle_status === "trial_active";
  }

  if (selectedKpiFilter === "active_subscriptions") {
    return user.lifecycle_status === "active";
  }

  if (selectedKpiFilter === "new_users_today") {
    return matchesSignupWindow(user, 1);
  }

  if (selectedKpiFilter === "new_users_7_days") {
    return matchesSignupWindow(user, 7);
  }

  if (selectedKpiFilter === "new_users_30_days") {
    return matchesSignupWindow(user, 30);
  }

  if (selectedKpiFilter === "onboarding_completed_today") {
    return user.onboarding_completed === true && isWithinDays(user.updated_date, 1);
  }

  if (selectedKpiFilter === "onboarding_completed_7_days") {
    return user.onboarding_completed === true && isWithinDays(user.updated_date, 7);
  }

  if (selectedKpiFilter === "onboarding_completed_30_days") {
    return user.onboarding_completed === true && isWithinDays(user.updated_date, 30);
  }

  if (selectedKpiFilter === "completed_onboarding_not_subscribed") {
    return user.onboarding_completed === true && user.has_app_access !== true;
  }

  if (selectedKpiFilter === "paid_active_users") {
    return hasActivePaidSubscription(user);
  }

  if (selectedKpiFilter === "ios_production_subscribers") {
    return (
      hasAppleSubscription(user) &&
      (user.latest_subscription_apple_environment?.toLowerCase() === "production" ||
        user.apple_environment?.toLowerCase() === "production")
    );
  }

  if (selectedKpiFilter === "apple_subscribers") {
    return hasAppleSubscription(user);
  }

  if (selectedKpiFilter === "stripe_subscribers") {
    return hasStripeSubscription(user);
  }

  if (selectedKpiFilter === "google_subscribers") {
    return hasGoogleSubscription(user);
  }

  if (selectedKpiFilter === "users_active_today") {
    return user.engagement_status === "active_today";
  }

  if (selectedKpiFilter === "users_active_this_week") {
    return (
      user.engagement_status === "active_today" ||
      user.engagement_status === "active_this_week"
    );
  }

  if (selectedKpiFilter === "inactive_7_plus") {
    return (
      user.engagement_status === "inactive_7_plus" ||
      user.engagement_status === "inactive_14_plus" ||
      user.engagement_status === "inactive_30_plus"
    );
  }

  if (selectedKpiFilter === "inactive_14_plus") {
    return (
      user.engagement_status === "inactive_14_plus" ||
      user.engagement_status === "inactive_30_plus"
    );
  }

  if (selectedKpiFilter === "inactive_30_plus") {
    return user.engagement_status === "inactive_30_plus";
  }

  if (selectedKpiFilter === "onboarding_incomplete") {
    return user.onboarding_completed === false;
  }

  if (selectedKpiFilter === "activated_users") {
    return user.activation_status === "activated";
  }

  if (selectedKpiFilter === "missing_workout_profile") {
    return user.has_workout_profile === false;
  }

  if (selectedKpiFilter === "missing_meal_plan") {
    return user.has_meal_plan === false;
  }

  if (selectedKpiFilter === "nutrition_adopters") {
    return user.has_nutrition_logs === true;
  }

  if (selectedKpiFilter === "mobility_adopters") {
    return user.has_mobility_flow === true;
  }

  return user.has_workout_logs === true;
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [dashboardKpis, setDashboardKpis] = useState<DashboardKpis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingKpis, setIsLoadingKpis] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("all");
  const [engagementFilter, setEngagementFilter] = useState<EngagementFilter>("all");
  const [activationFilter, setActivationFilter] = useState<ActivationFilter>("all");
  const [featureFilter, setFeatureFilter] = useState<FeatureFilter>("all");
  const [selectedKpiFilter, setSelectedKpiFilter] = useState<SelectedKpiFilter>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAdminDashboard() {
      setIsLoading(true);
      setIsLoadingKpis(true);
      setErrorMessage("");

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        if (isMounted) {
          setErrorMessage(sessionError.message);
          setIsLoading(false);
          setIsLoadingKpis(false);
        }
        return;
      }

      const session = sessionData.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("User")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        if (isMounted) {
          setErrorMessage(profileError.message);
          setIsLoading(false);
          setIsLoadingKpis(false);
        }
        return;
      }

      if (profile?.role !== "admin") {
        router.replace("/account");
        return;
      }

      const { data: kpisData, error: kpisError } = await supabase
        .from("admin_dashboard_kpis")
        .select("*")
        .single();

      if (!isMounted) {
        return;
      }

      if (kpisError) {
        setErrorMessage(kpisError.message);
      } else {
        setDashboardKpis(kpisData);
      }

      setIsLoadingKpis(false);

      const { data, error } = await supabase
        .from("admin_user_activity_overview")
        .select("*")
        .order("last_activity_at", { ascending: false, nullsFirst: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
      } else {
        setUsers(data || []);
      }

      setIsLoading(false);
    }

    loadAdminDashboard();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  const filteredUsers = users.filter((user) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [user.full_name, user.email].some((value) =>
        (value || "").toLowerCase().includes(normalizedSearch),
      );

    if (selectedKpiFilter) {
      return matchesSearch && matchesSelectedKpiFilter(user, selectedKpiFilter);
    }

    const matchesLifecycle =
      lifecycleFilter === "all" || user.lifecycle_status === lifecycleFilter;
    const matchesEngagement =
      engagementFilter === "all" || user.engagement_status === engagementFilter;
    const matchesActivation =
      activationFilter === "all" ||
      user.activation_status === activationFilter ||
      (activationFilter === "onboarding_incomplete" && user.onboarding_completed === false) ||
      (activationFilter === "missing_workout_profile" && user.has_workout_profile === false) ||
      (activationFilter === "missing_meal_plan" && user.has_meal_plan === false) ||
      (activationFilter === "no_feature_usage" && hasNoFeatureUsage(user));
    const matchesFeature =
      featureFilter === "all" ||
      (featureFilter === "nutrition_adopters" && user.has_nutrition_logs === true) ||
      (featureFilter === "mobility_adopters" && user.has_mobility_flow === true) ||
      (featureFilter === "workout_adopters" && user.has_workout_logs === true);

    return (
      matchesSearch &&
      matchesLifecycle &&
      matchesEngagement &&
      matchesActivation &&
      matchesFeature
    );
  });

  const activeFilterLabels = [
    searchTerm.trim() ? `Search: ${searchTerm.trim()}` : null,
    selectedKpiFilter ? kpiFilterLabels[selectedKpiFilter] : null,
    !selectedKpiFilter && lifecycleFilter !== "all" ? lifecycleFilterLabels[lifecycleFilter] : null,
    !selectedKpiFilter && engagementFilter !== "all"
      ? engagementFilterLabels[engagementFilter]
      : null,
    !selectedKpiFilter && activationFilter !== "all"
      ? activationFilterLabels[activationFilter]
      : null,
    !selectedKpiFilter && featureFilter !== "all" ? featureFilterLabels[featureFilter] : null,
  ].filter((label): label is string => Boolean(label));
  const hasActiveFilters = activeFilterLabels.length > 0;

  function clearFilters() {
    setSearchTerm("");
    setLifecycleFilter("all");
    setEngagementFilter("all");
    setActivationFilter("all");
    setFeatureFilter("all");
    setSelectedKpiFilter(null);
  }

  function applyKpiFilter(key: keyof DashboardKpis) {
    clearFilters();
    setSelectedKpiFilter(key === "total_users" ? null : key);
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-5 py-12 text-[#111827]">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
              Elite Pocket PT
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
              Admin Dashboard
            </h1>
            <p className="max-w-2xl text-base font-medium text-[#4B5563]">
              Review user lifecycle, activation progress and recent activity.
            </p>
          </div>

          <Link
            href="/admin/newsletter"
            className="inline-flex h-11 w-fit items-center justify-center rounded-xl bg-[#1157D8] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(17,87,216,0.22)] transition hover:bg-[#0A39A8]"
          >
            Newsletter
          </Link>
        </div>

        {errorMessage && (
          <p className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map(([label, key]) => (
            <button
              type="button"
              key={label}
              onClick={() => applyKpiFilter(key)}
              aria-label={`Filter users by ${label}`}
              className="cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white p-5 text-left shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-[#1157D8]/35 hover:shadow-[0_22px_54px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-2 focus:ring-[#1157D8]/30"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                {label}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220]">
                {isLoadingKpis ? "..." : formatCount(dashboardKpis?.[key])}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-[#E5E7EB] bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
          <div className="mb-4 flex flex-col gap-3 border-b border-[#E5E7EB] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[#4B5563]">
              Showing:{" "}
              <span className="font-bold text-[#0B1220]">
                {hasActiveFilters ? activeFilterLabels.join(", ") : "All users"}
              </span>
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#1157D8] transition hover:border-[#1157D8]/40 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:text-[#9CA3AF]"
              disabled={!hasActiveFilters}
            >
              Clear filters
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
              Search
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Name or email"
                className="h-11 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 text-sm font-semibold normal-case tracking-normal text-[#0B1220] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#1157D8] focus:bg-white"
              />
            </label>

            <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
              Lifecycle
              <select
                value={lifecycleFilter}
                onChange={(event) => {
                  setSelectedKpiFilter(null);
                  setLifecycleFilter(event.target.value as LifecycleFilter);
                }}
                className="h-11 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 text-sm font-semibold normal-case tracking-normal text-[#0B1220] outline-none transition focus:border-[#1157D8] focus:bg-white"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="trial_active">Trial active</option>
                <option value="trial_expired">Trial expired</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
              Engagement
              <select
                value={engagementFilter}
                onChange={(event) => {
                  setSelectedKpiFilter(null);
                  setEngagementFilter(event.target.value as EngagementFilter);
                }}
                className="h-11 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 text-sm font-semibold normal-case tracking-normal text-[#0B1220] outline-none transition focus:border-[#1157D8] focus:bg-white"
              >
                <option value="all">All</option>
                <option value="active_today">Active today</option>
                <option value="active_this_week">Active this week</option>
                <option value="inactive_7_plus">Inactive 7+ days</option>
                <option value="inactive_14_plus">Inactive 14+ days</option>
                <option value="inactive_30_plus">Inactive 30+ days</option>
                <option value="never_logged_in">Never logged in</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
              Activation
              <select
                value={activationFilter}
                onChange={(event) => {
                  setSelectedKpiFilter(null);
                  setActivationFilter(event.target.value as ActivationFilter);
                }}
                className="h-11 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 text-sm font-semibold normal-case tracking-normal text-[#0B1220] outline-none transition focus:border-[#1157D8] focus:bg-white"
              >
                <option value="all">All</option>
                <option value="activated">Activated</option>
                <option value="onboarding_incomplete">Onboarding incomplete</option>
                <option value="missing_workout_profile">Missing workout profile</option>
                <option value="missing_meal_plan">Missing meal plan</option>
                <option value="no_feature_usage">No feature usage</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
              Feature
              <select
                value={featureFilter}
                onChange={(event) => {
                  setSelectedKpiFilter(null);
                  setFeatureFilter(event.target.value as FeatureFilter);
                }}
                className="h-11 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 text-sm font-semibold normal-case tracking-normal text-[#0B1220] outline-none transition focus:border-[#1157D8] focus:bg-white"
              >
                <option value="all">All</option>
                <option value="nutrition_adopters">Nutrition adopters</option>
                <option value="mobility_adopters">Mobility adopters</option>
                <option value="workout_adopters">Workout adopters</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-[0_22px_64px_rgba(15,23,42,0.1)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#E5E7EB] px-5 py-4">
            <h2 className="text-lg font-bold text-[#0B1220]">Users</h2>
            <p className="text-sm font-semibold text-[#6B7280]">
              {formatCount(filteredUsers.length)} of {formatCount(users.length)}
            </p>
          </div>

          {isLoading ? (
            <p className="px-5 py-8 text-sm font-semibold text-[#4B5563]">
              Loading users...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[2400px] border-collapse text-left text-sm">
                <thead className="bg-[#F8FAFC] text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                  <tr>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Lifecycle</th>
                    <th className="px-5 py-4">Engagement</th>
                    <th className="px-5 py-4">Activation</th>
                    <th className="px-5 py-4">Funnel</th>
                    <th className="px-5 py-4">Provider</th>
                    <th className="px-5 py-4">Access</th>
                    <th className="px-5 py-4">Created</th>
                    <th className="px-5 py-4">Days since signup</th>
                    <th className="px-5 py-4">Goal</th>
                    <th className="px-5 py-4">Training days</th>
                    <th className="px-5 py-4">Renewal / expiry</th>
                    <th className="px-5 py-4">Last login</th>
                    <th className="px-5 py-4">Last activity</th>
                    <th className="px-5 py-4">Days inactive</th>
                    <th className="px-5 py-4">Workout profile</th>
                    <th className="px-5 py-4">Meal plan</th>
                    <th className="px-5 py-4">Nutrition logs</th>
                    <th className="px-5 py-4">Workout logs</th>
                    <th className="px-5 py-4">Mobility flows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => router.push(`/admin/user/${user.id}`)}
                      className="cursor-pointer align-top transition hover:bg-[#F8FAFC]"
                    >
                      <td className="px-5 py-4 font-semibold text-[#0B1220]">
                        {user.full_name || "Not set"}
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">{user.email || "Not set"}</td>
                      <td className="px-5 py-4">
                        <StatusPill value={user.lifecycle_status} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill value={user.engagement_status} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill value={user.activation_status} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill value={user.signup_funnel_status} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill value={getPaymentProvider(user)} />
                      </td>
                      <td className="px-5 py-4">
                        <BooleanPill value={user.has_app_access} />
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {formatDateTime(user.created_date)}
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {user.days_since_signup === null
                          ? "Unknown"
                          : formatCount(user.days_since_signup)}
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {user.goal ? formatStatusLabel(user.goal) : "Unknown"}
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {user.training_days_per_week === null
                          ? "Unknown"
                          : formatCount(user.training_days_per_week)}
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {formatDateTime(getRenewalOrExpiryDate(user))}
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {formatDateTime(user.last_sign_in_at)}
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {formatDateTime(user.last_activity_at)}
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {user.days_since_last_activity === null
                          ? "Unknown"
                          : formatCount(user.days_since_last_activity)}
                      </td>
                      <td className="px-5 py-4">
                        <BooleanPill value={user.has_workout_profile} />
                      </td>
                      <td className="px-5 py-4">
                        <BooleanPill value={user.has_meal_plan} />
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {formatCount(user.nutrition_log_count)}
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {formatCount(user.workout_log_count)}
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {formatCount(user.mobility_flow_count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <p className="px-5 py-8 text-sm font-semibold text-[#4B5563]">
                  No users found.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
