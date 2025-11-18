import { createClient } from "@supabase/supabase-js";

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Debug: Log environment variable status (without exposing keys)
console.log('[supabase.ts] Environment check:', {
  hasUrl: !!supabaseUrl,
  urlLength: supabaseUrl.length,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey.length,
  urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'missing',
});

// Validate and create Supabase client
let supabase: ReturnType<typeof createClient> | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ Supabase client configuration missing!\n" +
    "Please set the following environment variables in your .env file:\n" +
    "  - VITE_SUPABASE_URL\n" +
    "  - VITE_SUPABASE_ANON_KEY\n\n" +
    "You can find these values in your Supabase project settings: https://app.supabase.com/project/_/settings/api\n\n" +
    "⚠️ IMPORTANT: After updating .env, you MUST restart your development server!"
  );
  // Don't create a client - it will fail validation anyway
  // Components using supabase should handle the null case
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    console.log('[supabase.ts] ✅ Supabase client created successfully');
  } catch (error) {
    console.error("[supabase.ts] ❌ Failed to create Supabase client:", error);
  }
}

// Export a getter function that throws a helpful error if client is not initialized
export function getSupabaseClient() {
  if (!supabase) {
    const hasUrl = !!import.meta.env.VITE_SUPABASE_URL;
    const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    let errorMessage = "Supabase client is not initialized.";
    if (!hasUrl && !hasKey) {
      errorMessage += " Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.";
    } else if (!hasUrl) {
      errorMessage += " VITE_SUPABASE_URL is missing from your .env file.";
    } else if (!hasKey) {
      errorMessage += " VITE_SUPABASE_ANON_KEY is missing from your .env file.";
    } else {
      errorMessage += " Failed to create Supabase client. Please check your configuration.";
    }
    
    console.error('[supabase.ts]', errorMessage);
    throw new Error(errorMessage);
  }
  return supabase;
}

// Test Supabase connection (useful for diagnostics)
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient();
    // Try to get the current session (lightweight operation)
    const { error } = await client.auth.getSession();
    if (error && error.message !== 'Session not found') {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

// Export the client directly (may be null if not configured)
export { supabase };

