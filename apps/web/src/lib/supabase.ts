import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Authenticated client for REST/RLS operations (board & object CRUD)
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createClerkSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => {
      const token = await getToken();
      return token ?? null;
    },
  });
}

// Anon client for Realtime broadcast/presence (no user auth needed).
// Supabase Realtime WebSocket cannot authenticate Clerk RS256 JWTs,
// but broadcast and presence are ephemeral pub/sub that only need the anon key.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createRealtimeClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}
