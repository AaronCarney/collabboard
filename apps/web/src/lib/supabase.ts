import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createClerkSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => {
      const token = await getToken();
      // eslint-disable-next-line no-console
      console.log(
        "[Supabase] accessToken callback:",
        token ? token.substring(0, 20) + "… (" + String(token.length) + " chars)" : "null"
      );
      return token ?? null;
    },
  });
}
