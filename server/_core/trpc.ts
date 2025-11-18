import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Check for either OAuth user or Supabase user
  if (!ctx.user && !ctx.supabaseUser) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      supabaseUser: ctx.supabaseUser,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // Check if user is admin (either OAuth or Supabase)
    let isAdmin = false;

    if (ctx.user && ctx.user.role === 'admin') {
      isAdmin = true;
    } else if (ctx.supabaseUser) {
      // Check organization_users table for admin role
      const { getSupabaseClient } = await import("./supabase");
      const supabase = getSupabaseClient();
      
      try {
        const { data, error } = await supabase
          .from('"01. Organization".organization_users')
          .select('role')
          .eq('user_id', ctx.supabaseUser.id)
          .eq('status', 'active')
          .single();

        if (!error && data && (data.role === 'admin' || data.role === 'owner')) {
          isAdmin = true;
        }
      } catch (error) {
        // If check fails, user is not admin
        console.warn('[AdminProcedure] Failed to check Supabase user role:', error);
      }
    }

    if (!isAdmin) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        supabaseUser: ctx.supabaseUser,
      },
    });
  }),
);
