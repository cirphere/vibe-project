import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Browser-side Supabase client (singleton). */
export function createClient() {
  if (client) return client;
  const { url, anonKey } = getSupabaseConfig();
  client = createBrowserClient(url, anonKey);
  return client;
}
