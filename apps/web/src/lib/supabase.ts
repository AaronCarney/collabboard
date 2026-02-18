import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createClerkSupabaseClient(getToken: () => Promise<string | null>) {
  const getAccessToken = async () => {
    const token = await getToken();
    return token ?? "";
  };

  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: getAccessToken,
    realtime: {
      accessToken: getAccessToken,
    },
  });
}
