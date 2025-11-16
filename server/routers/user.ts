import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';

/**
 * User Router for Supabase Auth
 * Note: These endpoints work with Supabase Auth, which is separate from the OAuth-based auth
 * The Supabase client needs to be initialized with the user's session token from the request
 */
export const userRouter = router({
  // Get current user profile (Supabase Auth)
  getProfile: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const { getSupabaseClient } = await import('../_core/supabase');
        const supabase = getSupabaseClient();
        
        // Get auth token from request headers
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'No authorization token provided',
          });
        }

        const token = authHeader.substring(7);
        
        // Set the session for this request
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          });
        }

        // Create a Supabase client with the user's session
        const { createClient } = await import('@supabase/supabase-js');
        const { ENV } = await import('../_core/env');
        
        const userSupabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        // Get user profile with organization (using public schema wrapper)
        const { data: profileData, error: profileError } = await userSupabase
          .rpc('get_current_user_profile');

        if (profileError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to load user profile: ${profileError.message}`,
          });
        }

        return profileData?.[0] || null;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),

  // Get current user's dealer ID
  getDealerId: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'No authorization token provided',
          });
        }

        const token = authHeader.substring(7);
        const { createClient } = await import('@supabase/supabase-js');
        const { ENV } = await import('../_core/env');
        
        const userSupabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        const { data, error } = await userSupabase.rpc('get_user_dealer_id');
        
        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to get dealer ID: ${error.message}`,
          });
        }
        
        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),

  // Get current user's organization ID
  getOrganizationId: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'No authorization token provided',
          });
        }

        const token = authHeader.substring(7);
        const { createClient } = await import('@supabase/supabase-js');
        const { ENV } = await import('../_core/env');
        
        const userSupabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        const { data, error } = await userSupabase.rpc('"01. Organization".get_user_organization_id');
        
        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to get organization ID: ${error.message}`,
          });
        }
        
        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),

  // Check if user can create listings
  canCreateListings: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return false;
        }

        const token = authHeader.substring(7);
        const { createClient } = await import('@supabase/supabase-js');
        const { ENV } = await import('../_core/env');
        
        const userSupabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        const { data, error } = await userSupabase.rpc('"01. Organization".user_can_create_listings');
        
        if (error) {
          console.error('Failed to check permissions:', error);
          return false;
        }
        
        return data || false;
      } catch (error) {
        console.error('Error checking listing permissions:', error);
        return false;
      }
    }),

  // Update notification preferences
  updatePreferences: publicProcedure
    .input(z.object({
      emailNotifications: z.boolean().optional(),
      smsNotifications: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'No authorization token provided',
          });
        }

        const token = authHeader.substring(7);
        const { createClient } = await import('@supabase/supabase-js');
        const { ENV } = await import('../_core/env');
        
        const userSupabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        const { data: { user }, error: authError } = await userSupabase.auth.getUser();
        
        if (authError || !user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          });
        }
        
        const { error } = await userSupabase
          .from('"01. Organization".organization_users')
          .update({
            email_notifications: input.emailNotifications,
            sms_notifications: input.smsNotifications,
          })
          .eq('user_id', user.id);
        
        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to update preferences: ${error.message}`,
          });
        }
        
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),
});

