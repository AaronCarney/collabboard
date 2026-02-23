import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type SupabaseClientInstance = ReturnType<typeof createClient<Database>>;

// Next.js only inlines NEXT_PUBLIC_* env vars when accessed as literal
// property names (e.g. process.env.NEXT_PUBLIC_FOO). Dynamic access via
// process.env[variable] is NOT replaced in the client bundle and returns
// undefined, crashing client components. Use direct literal access here.
function requireEnvLiteral(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

const supabaseUrl = requireEnvLiteral(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL"
);
const supabaseAnonKey = requireEnvLiteral(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
);

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
