import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createClerkSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        const clerkToken = await getToken();
        const headers = new Headers(options.headers);
        if (clerkToken) {
          headers.set("Authorization", `Bearer ${clerkToken}`);
        }
        return fetch(url, { ...options, headers });
      },
    },
  });
}

// Fallback client without auth (for cases where Clerk isn't available yet)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
