import { createClient as supabaseCreateClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createSupabaseClient(url: string, anonKey: string) {
  if (!url) throw new Error("Supabase URL is required");
  if (!anonKey) throw new Error("Supabase anon key is required");

  return supabaseCreateClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createServiceClient(url: string, serviceRoleKey: string) {
  if (!url) throw new Error("Supabase URL is required");
  if (!serviceRoleKey) throw new Error("Supabase service role key is required");

  return supabaseCreateClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
