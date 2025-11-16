import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

let _supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_supabaseClient) {
    if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
      throw new Error(
        "Supabase configuration missing: SUPABASE_URL and SUPABASE_ANON_KEY must be set"
      );
    }

    _supabaseClient = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
      auth: {
        persistSession: false, // Server-side, no session persistence needed
      },
    });
  }

  return _supabaseClient;
}

