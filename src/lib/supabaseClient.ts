import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserSupabaseClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient() {
  if (browserSupabaseClient) {
    return browserSupabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  }

  if (!supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.");
  }

  browserSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  return browserSupabaseClient;
}
