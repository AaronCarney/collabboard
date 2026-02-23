import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type SupabaseClientInstance = ReturnType<typeof createClient<Database>>;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// Authenticated client for REST/RLS operations (board & object CRUD)
export function createClerkSupabaseClient(
  getToken: () => Promise<string | null>
): SupabaseClientInstance {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => {
      const token = await getToken();
      return token ?? null;
    },
  });
}

// Anon client for Realtime broadcast/presence (no user auth needed).
// Supabase Realtime WebSocket cannot authenticate Clerk RS256 JWTs,
// but broadcast and presence are ephemeral pub/sub that only need the anon key.
export function createRealtimeClient(): SupabaseClientInstance {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}
