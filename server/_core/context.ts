import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../db";
import { sdk } from "./sdk";
import { getSupabaseClient } from "./supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  supabaseUser: { id: string; email?: string } | null; // Supabase auth user
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let supabaseUser: { id: string; email?: string } | null = null;

  // Try Supabase auth first (from Authorization header)
  const authHeader = opts.req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const supabase = getSupabaseClient();
      const { data: { user: sbUser }, error: sbError } = await supabase.auth.getUser(token);
      
      if (!sbError && sbUser) {
        supabaseUser = {
          id: sbUser.id,
          email: sbUser.email,
        };
        // For Supabase auth, we can proceed with supabaseUser
        // The protectedProcedure will check for either user or supabaseUser
      } else if (sbError) {
        // Only log non-expected errors (invalid token is expected for public routes)
        // Don't log "invalid token" errors as they're normal for unauthenticated requests
        if (!sbError.message?.includes('JWT') && !sbError.message?.includes('token')) {
          console.warn('[Context] Supabase auth check error (non-fatal):', sbError.message);
        }
      }
    } catch (error: any) {
      // Suppress expected errors (invalid tokens, network issues during auth check)
      const isExpectedError = 
        error?.message?.includes('JWT') ||
        error?.message?.includes('token') ||
        error?.message?.includes('expired');
      
      if (!isExpectedError) {
        console.warn('[Context] Supabase auth check failed (non-fatal):', error?.message || error);
      }
    }
  }

  // Try OAuth-based auth (from cookies) as fallback
  if (!supabaseUser) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    supabaseUser,
  };
}
