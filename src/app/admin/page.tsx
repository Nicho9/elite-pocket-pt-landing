"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../lib/supabaseClient";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  created_date: string | null;
  subscription_status: string | null;
  onboarding_completed: boolean | null;
  subscription_tier: string | null;
};

function formatValue(value: string | boolean | null | undefined) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
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

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAdminDashboard() {
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

      const { data: profile, error: profileError } = await supabase
        .from("User")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        if (isMounted) {
          setErrorMessage(profileError.message);
          setIsLoading(false);
        }
        return;
      }

      if (profile?.role !== "admin") {
        router.replace("/account");
        return;
      }

      const { data, error } = await supabase
        .from("User")
        .select("id,full_name,email,role,created_date,subscription_status,onboarding_completed,subscription_tier")
        .order("created_date", { ascending: false });

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

  const activeSubscriptions = users.filter((user) => user.subscription_status === "active").length;
  const inactiveUsers = users.filter((user) => user.subscription_status !== "active").length;
  const activeUsersPercentage =
    users.length > 0 ? Math.round((activeSubscriptions / users.length) * 100) : 0;
  const completedOnboarding = users.filter((user) => user.onboarding_completed).length;

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-5 py-12 text-[#111827]">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1157D8]">
            Elite Pocket PT
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0B1220] sm:text-4xl">
            Admin Dashboard
          </h1>
          <p className="max-w-2xl text-base font-medium text-[#4B5563]">
            Review users, subscription status and onboarding progress.
          </p>
        </div>

        {errorMessage && (
          <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Total users (all time)", users.length],
            ["Active subscriptions", activeSubscriptions],
            ["Inactive users", inactiveUsers],
            ["Active users %", `${activeUsersPercentage}%`],
            ["Completed onboarding", completedOnboarding],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1157D8]">
                {label}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-[#0B1220]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-[0_22px_64px_rgba(15,23,42,0.1)]">
          <div className="border-b border-[#E5E7EB] px-5 py-4">
            <h2 className="text-lg font-bold text-[#0B1220]">Users</h2>
          </div>

          {isLoading ? (
            <p className="px-5 py-8 text-sm font-semibold text-[#4B5563]">
              Loading users...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead className="bg-[#F8FAFC] text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                  <tr>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Created</th>
                    <th className="px-5 py-4">Subscription</th>
                    <th className="px-5 py-4">Onboarding</th>
                    <th className="px-5 py-4">Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => router.push(`/admin/user/${user.id}`)}
                      className="cursor-pointer align-top transition hover:bg-[#F8FAFC]"
                    >
                      <td className="px-5 py-4 font-semibold text-[#0B1220]">
                        {formatValue(user.full_name)}
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">{formatValue(user.email)}</td>
                      <td className="px-5 py-4 text-[#4B5563]">{formatValue(user.role)}</td>
                      <td className="px-5 py-4 text-[#4B5563]">{formatDate(user.created_date)}</td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {formatValue(user.subscription_status)}
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {formatValue(user.onboarding_completed)}
                      </td>
                      <td className="px-5 py-4 text-[#4B5563]">
                        {formatValue(user.subscription_tier)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
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
