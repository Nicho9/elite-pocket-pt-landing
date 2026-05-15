import { createClient } from "@supabase/supabase-js";

import { errorResponse } from "./responses";

type RequireAdminOptions = {
  routeName: string;
  serviceConfigError?: string;
  requireServiceRole?: boolean;
};

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return "";
  }

  return token.trim();
}

function readSupabaseErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" && message.trim() ? message.trim() : "Unknown Supabase error";
  }

  return "Unknown Supabase error";
}

function logAuthFailure(routeName: string, error: unknown) {
  console.error("Newsletter admin auth failure:", {
    routeName,
    supabaseError: readSupabaseErrorMessage(error),
  });
}

export async function requireNewsletterAdmin(
  request: Request,
  { routeName, serviceConfigError, requireServiceRole = true }: RequireAdminOptions,
) {
  const supabaseUrl = process.env.SB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SB_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      error: errorResponse("Supabase authentication is not configured.", 500),
    };
  }

  const token = readBearerToken(request);

  if (!token) {
    return { error: errorResponse("Missing bearer token.", 401) };
  }

  const authSupabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userError } = await authSupabase.auth.getUser(token);

  if (userError || !userData.user) {
    logAuthFailure(routeName, userError || new Error("No user returned from getUser."));
    return { error: errorResponse("Invalid or expired session.", 401) };
  }

  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: profile, error: profileError } = await userSupabase
    .from("User")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    logAuthFailure(routeName, profileError);
    return { error: errorResponse("Could not verify admin access.", 500) };
  }

  if (profile?.role !== "admin") {
    return { error: errorResponse("Admin access required.", 403) };
  }

  const serviceRoleKey =
    process.env.SB_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (requireServiceRole && !serviceRoleKey) {
    return { error: errorResponse(serviceConfigError || "Newsletter admin service is not configured.", 500) };
  }

  return {
    supabaseUrl,
    serviceRoleKey: serviceRoleKey || "",
    adminUserId: userData.user.id,
    adminEmail: userData.user.email || "",
  };
}
