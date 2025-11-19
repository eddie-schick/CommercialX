import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { ENV } from '../_core/env';

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
        
        const userSupabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        // Get user profile with organization (using public schema wrapper)
        // RPC function returns JSONB from organization schema
        const { data: profileData, error: profileError } = await userSupabase
          .rpc('get_current_user_profile');

        if (profileError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to load user profile: ${profileError.message}`,
          });
        }

        // RPC now returns JSONB (object), not array
        if (Array.isArray(profileData)) {
          return profileData[0] || null; // Old format
        }
        return profileData && !profileData.error ? profileData : null; // New format
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
        
        const userSupabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        // Try the dedicated RPC function first
        const { data, error } = await userSupabase.rpc('"01. Organization".user_can_create_listings');
        
        if (error) {
          // Fallback: Use get_current_user_profile if the function doesn't exist yet
          if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
            console.log('[canCreateListings] Function not found, using fallback check');
            const { data: profileData } = await userSupabase.rpc('get_current_user_profile');
            
            if (profileData) {
              const profile = profileData as any;
              // Check if user has organization, dealer, and appropriate role
              const hasOrg = profile.hasOrganization && profile.organization_id;
              const hasDealer = profile.hasDealer;
              const role = profile.role;
              const canCreate = hasOrg && hasDealer && role && role !== 'viewer';
              return canCreate || false;
            }
          } else {
            console.error('Failed to check permissions:', error);
          }
          return false;
        }
        
        return data || false;
      } catch (error) {
        console.error('Error checking listing permissions:', error);
        return false;
      }
    }),

  // Diagnostic endpoint to check why user cannot create listings
  diagnoseListingPermission: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return {
            error: 'No authorization token provided',
            diagnostic: null,
          };
        }

        const token = authHeader.substring(7);
        const { createClient } = await import('@supabase/supabase-js');
        
        const userSupabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        // Try the diagnostic function
        const { data, error } = await userSupabase.rpc('"01. Organization".diagnose_listing_permission');
        
        if (error) {
          console.error('Failed to diagnose listing permissions:', error);
          return {
            error: error.message || 'Failed to diagnose permissions',
            diagnostic: null,
          };
        }
        
        return {
          error: null,
          diagnostic: Array.isArray(data) ? data[0] : data,
        };
      } catch (error) {
        console.error('Error diagnosing listing permissions:', error);
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          diagnostic: null,
        };
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

  // Get current user's organization details
  getOrganization: publicProcedure
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
        
        const userSupabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        // Get user profile to get organization_id (from organization schema)
        const { data: profileData, error: profileError } = await userSupabase.rpc('get_current_user_profile');
        
        if (profileError) {
          return null;
        }

        // Handle both array (old) and object (new JSONB) formats
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        
        if (!profile || profile.error || !profile.organization_id) {
          return null; // User doesn't have an organization
        }

        // Get full organization details
        const { querySchemaTable } = await import('../lib/supabase-db');
        const orgs = await querySchemaTable<any>(
          '01. Organization',
          'organizations',
          {
            where: { id: profile.organization_id },
            limit: 1,
          }
        );

        if (orgs.length === 0) {
          return null;
        }

        return orgs[0];
      } catch (error) {
        console.error('Error fetching organization:', error);
        return null;
      }
    }),

  // Get current user's dealer details
  getDealer: publicProcedure
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
        
        const userSupabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        // Get user profile to get organization_id
        const { data: profileData, error: profileError } = await userSupabase.rpc('get_current_user_profile');
        
        if (profileError) {
          console.error('[getDealer] Profile RPC error:', profileError);
          return null;
        }

        // Handle both array (old) and object (new JSONB) formats
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        
        if (!profile || profile.error || !profile.organization_id) {
          return null; // User doesn't have an organization
        }

        // Try to get dealer ID from profile first
        let dealerId: number | null = null;
        if (profile.dealer?.id) {
          dealerId = profile.dealer.id;
        } else {
          // Fallback: Try RPC function
          const { data: dealerIdData, error: dealerIdError } = await userSupabase.rpc('get_user_dealer_id');
          
          if (!dealerIdError && dealerIdData) {
            dealerId = dealerIdData;
          } else {
            // Last resort: Query directly by organization_id
            const { querySchemaTable } = await import('../lib/supabase-db');
            const dealers = await querySchemaTable<{ id: number }>(
              '02a. Dealership',
              'dealers',
              {
                where: { organization_id: profile.organization_id },
                limit: 1,
              }
            );
            
            if (dealers.length > 0) {
              dealerId = dealers[0].id;
            }
          }
        }
        
        if (!dealerId) {
          return null; // No dealer record found
        }

        // Get full dealer details
        const { querySchemaTable } = await import('../lib/supabase-db');
        const dealers = await querySchemaTable<any>(
          '02a. Dealership',
          'dealers',
          {
            where: { id: dealerId },
            limit: 1,
          }
        );

        if (dealers.length === 0) {
          return null;
        }

        return dealers[0];
      } catch (error) {
        console.error('[getDealer] Error fetching dealer:', error);
        return null;
      }
    }),

  // Diagnostic endpoint to check auth status
  checkAuthStatus: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return {
            authenticated: false,
            hasOrganization: false,
            hasDealer: false,
            organizationId: null,
            dealerId: null,
            error: 'No authorization token provided',
          };
        }

        const token = authHeader.substring(7);
        const { createClient } = await import('@supabase/supabase-js');
        
        const userSupabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        const { data: { user }, error: authError } = await userSupabase.auth.getUser();
        
        if (authError || !user) {
          return {
            authenticated: false,
            hasOrganization: false,
            hasDealer: false,
            organizationId: null,
            dealerId: null,
            error: authError?.message || 'Not authenticated',
          };
        }

        // Get profile
        const { data: profileData, error: profileError } = await userSupabase.rpc('get_current_user_profile');
        
        if (profileError || !profileData) {
          return {
            authenticated: true,
            hasOrganization: false,
            hasDealer: false,
            organizationId: null,
            dealerId: null,
            error: profileError?.message || 'No profile found',
          };
        }

        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        const organizationId = profile?.organization_id || null;
        
        // Try to get dealer ID
        let dealerId: number | null = null;
        if (profile?.dealer?.id) {
          dealerId = profile.dealer.id;
        } else if (organizationId) {
          // Query directly
          const { querySchemaTable } = await import('../lib/supabase-db');
          const dealers = await querySchemaTable<{ id: number }>(
            '02a. Dealership',
            'dealers',
            {
              where: { organization_id: organizationId },
              limit: 1,
            }
          );
          
          if (dealers.length > 0) {
            dealerId = dealers[0].id;
          }
        }

        return {
          authenticated: true,
          hasOrganization: !!organizationId,
          hasDealer: !!dealerId,
          organizationId,
          dealerId,
          error: null,
        };
      } catch (error) {
        return {
          authenticated: false,
          hasOrganization: false,
          hasDealer: false,
          organizationId: null,
          dealerId: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  // Get organization types
  getOrganizationTypes: publicProcedure
    .query(async () => {
      try {
        const { getSupabaseClient } = await import('../_core/supabase');
        const supabase = getSupabaseClient();
        const { querySchemaTable } = await import('../lib/supabase-db');
        
        let types: any[] = [];
        
        // Try RPC function first (works without DATABASE_URL)
        try {
          const { data, error } = await supabase.rpc('get_organization_types');
          
          if (!error && data) {
            types = data;
            console.log(`[getOrganizationTypes] Found ${types.length} organization types via RPC`);
            return types;
          }
          
          // If RPC fails, log but continue to fallback
          console.warn('[getOrganizationTypes] RPC failed, trying fallback:', error?.message);
        } catch (rpcError) {
          console.warn('[getOrganizationTypes] RPC not available, trying fallback');
        }
        
        // Fallback: Use postgres client if DATABASE_URL is configured
        if (ENV.databaseUrl) {
          types = await querySchemaTable<{
            id: number;
            type_code: string;
            display_name: string;
            description?: string;
            can_list_vehicles: boolean;
            is_active: boolean;
            display_order?: number;
          }>(
            '01. Organization',
            'organization_types',
            {
              where: { is_active: true },
              orderBy: { column: 'display_order', ascending: true },
            }
          );
          
          if (types.length > 0) {
            console.log(`[getOrganizationTypes] Found ${types.length} organization types via postgres client`);
            return types;
          }
        }
        
        // If both methods fail or return no results
        if (types.length === 0) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'No organization types found. Please ensure the get_organization_types RPC function exists or DATABASE_URL is configured.',
          });
        }
        
        return types;
      } catch (error) {
        console.error('[getOrganizationTypes] Error fetching organization types:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch organization types',
        });
      }
    }),

  // Update organization
  updateOrganization: publicProcedure
    .input(z.object({
      organizationId: z.number(),
      organization_type_id: z.number().optional(),
      organization_name: z.string().optional(),
      legal_entity_name: z.string().optional(),
      display_name: z.string().optional(),
      primary_email: z.string().optional(),
      primary_phone: z.string().optional(),
      primary_phone_ext: z.string().optional(),
      address_line1: z.string().optional(),
      address_line2: z.string().optional(),
      city: z.string().optional(),
      state_province: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
      website_url: z.string().optional(),
      logo_url: z.string().optional(),
      tax_id: z.string().optional(),
      business_hours: z.record(z.any()).optional(),
      sales_territory_states: z.array(z.string()).optional(),
      status: z.enum(['active', 'suspended', 'inactive', 'pending_verification', 'rejected']).optional(),
      subscription_tier: z.enum(['free', 'basic', 'premium', 'enterprise']).optional(),
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

        // Verify user has permission to update organization (from organization schema)
        const { data: profileData } = await userSupabase.rpc('get_current_user_profile');
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        
        if (!profile || profile.error || profile.organization_id !== input.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this organization',
          });
        }

        if (profile.role !== 'owner' && profile.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only owners and admins can update organization',
          });
        }

        const { updateSchemaTable } = await import('../lib/supabase-db');
        
        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (input.organization_type_id !== undefined) updateData.organization_type_id = input.organization_type_id;
        if (input.organization_name !== undefined) updateData.organization_name = input.organization_name;
        if (input.legal_entity_name !== undefined) updateData.legal_entity_name = input.legal_entity_name;
        if (input.display_name !== undefined) updateData.display_name = input.display_name;
        if (input.primary_email !== undefined) updateData.primary_email = input.primary_email;
        if (input.primary_phone !== undefined) updateData.primary_phone = input.primary_phone;
        if (input.primary_phone_ext !== undefined) updateData.primary_phone_ext = input.primary_phone_ext;
        if (input.address_line1 !== undefined) updateData.address_line1 = input.address_line1;
        if (input.address_line2 !== undefined) updateData.address_line2 = input.address_line2;
        if (input.city !== undefined) updateData.city = input.city;
        if (input.state_province !== undefined) updateData.state_province = input.state_province;
        if (input.postal_code !== undefined) updateData.postal_code = input.postal_code;
        if (input.country !== undefined) updateData.country = input.country;
        if (input.website_url !== undefined) updateData.website_url = input.website_url;
        if (input.logo_url !== undefined) updateData.logo_url = input.logo_url;
        if (input.tax_id !== undefined) updateData.tax_id = input.tax_id;
        if (input.business_hours !== undefined) updateData.business_hours = input.business_hours;
        if (input.sales_territory_states !== undefined) updateData.sales_territory_states = input.sales_territory_states;
        if (input.status !== undefined) updateData.status = input.status;
        if (input.subscription_tier !== undefined) updateData.subscription_tier = input.subscription_tier;

        await updateSchemaTable(
          '01. Organization',
          'organizations',
          updateData,
          { id: input.organizationId }
        );

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

  // Create or update dealer record
  upsertDealer: publicProcedure
    .input(z.object({
      organizationId: z.number(),
      business_type: z.enum(['franchise_dealer', 'independent_dealer', 'fleet_remarketer', 'broker', 'leasing_company', 'rental_company', 'other']).optional(),
      dealer_license_number: z.string().optional(),
      dealer_license_state: z.string().optional(),
      dealer_license_expires_at: z.string().optional(),
      tax_id: z.string().optional(),
      duns_number: z.string().optional(),
      specializations: z.array(z.string()).optional(),
      makes_carried: z.array(z.string()).optional(),
      average_inventory_count: z.number().optional(),
      lot_capacity: z.number().optional(),
      can_special_order: z.boolean().optional(),
      accepts_trade_ins: z.boolean().optional(),
      has_service_department: z.boolean().optional(),
      has_parts_department: z.boolean().optional(),
      has_body_shop: z.boolean().optional(),
      can_install_upfits: z.boolean().optional(),
      typical_delivery_days: z.number().optional(),
      sales_territory_states: z.array(z.string()).optional(),
      delivery_available: z.boolean().optional(),
      delivery_radius_miles: z.number().optional(),
      delivery_fee: z.number().optional(),
      current_promotions: z.string().optional(),
      accepts_fleet_inquiries: z.boolean().optional(),
      minimum_fleet_size: z.number().optional(),
      fleet_discount_percentage: z.number().optional(),
      business_hours: z.record(z.any()).optional(),
      certifications: z.array(z.string()).optional(),
      awards: z.array(z.string()).optional(),
      auto_respond_inquiries: z.boolean().optional(),
      inquiry_email_notification: z.boolean().optional(),
      weekly_performance_report: z.boolean().optional(),
      allow_price_negotiations: z.boolean().optional(),
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

        // Verify user has permission (from organization schema)
        const { data: profileData } = await userSupabase.rpc('get_current_user_profile');
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        
        if (!profile || profile.error || profile.organization_id !== input.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this organization',
          });
        }

        if (profile.role !== 'owner' && profile.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only owners and admins can manage dealer records',
          });
        }

        const { querySchemaTable, insertSchemaTable, updateSchemaTable } = await import('../lib/supabase-db');
        
        // Check if dealer record exists
        const existingDealers = await querySchemaTable<{ id: number }>(
          '02a. Dealership',
          'dealers',
          {
            where: { organization_id: input.organizationId },
            limit: 1,
          }
        );

        const dealerData: Record<string, any> = {
          organization_id: input.organizationId,
          updated_at: new Date().toISOString(),
        };

        if (input.business_type !== undefined) dealerData.business_type = input.business_type;
        if (input.dealer_license_number !== undefined) dealerData.dealer_license_number = input.dealer_license_number;
        if (input.dealer_license_state !== undefined) dealerData.dealer_license_state = input.dealer_license_state;
        if (input.dealer_license_expires_at !== undefined) dealerData.dealer_license_expires_at = input.dealer_license_expires_at;
        if (input.tax_id !== undefined) dealerData.tax_id = input.tax_id;
        if (input.duns_number !== undefined) dealerData.duns_number = input.duns_number;
        if (input.specializations !== undefined) dealerData.specializations = input.specializations;
        if (input.makes_carried !== undefined) dealerData.makes_carried = input.makes_carried;
        if (input.average_inventory_count !== undefined) dealerData.average_inventory_count = input.average_inventory_count;
        if (input.lot_capacity !== undefined) dealerData.lot_capacity = input.lot_capacity;
        if (input.can_special_order !== undefined) dealerData.can_special_order = input.can_special_order;
        if (input.accepts_trade_ins !== undefined) dealerData.accepts_trade_ins = input.accepts_trade_ins;
        if (input.has_service_department !== undefined) dealerData.has_service_department = input.has_service_department;
        if (input.has_parts_department !== undefined) dealerData.has_parts_department = input.has_parts_department;
        if (input.has_body_shop !== undefined) dealerData.has_body_shop = input.has_body_shop;
        if (input.can_install_upfits !== undefined) dealerData.can_install_upfits = input.can_install_upfits;
        if (input.typical_delivery_days !== undefined) dealerData.typical_delivery_days = input.typical_delivery_days;
        if (input.sales_territory_states !== undefined) dealerData.sales_territory_states = input.sales_territory_states;
        if (input.delivery_available !== undefined) dealerData.delivery_available = input.delivery_available;
        if (input.delivery_radius_miles !== undefined) dealerData.delivery_radius_miles = input.delivery_radius_miles;
        if (input.delivery_fee !== undefined) dealerData.delivery_fee = input.delivery_fee;
        if (input.current_promotions !== undefined) dealerData.current_promotions = input.current_promotions;
        if (input.accepts_fleet_inquiries !== undefined) dealerData.accepts_fleet_inquiries = input.accepts_fleet_inquiries;
        if (input.minimum_fleet_size !== undefined) dealerData.minimum_fleet_size = input.minimum_fleet_size;
        if (input.fleet_discount_percentage !== undefined) dealerData.fleet_discount_percentage = input.fleet_discount_percentage;
        if (input.business_hours !== undefined) dealerData.business_hours = input.business_hours;
        if (input.certifications !== undefined) dealerData.certifications = input.certifications;
        if (input.awards !== undefined) dealerData.awards = input.awards;
        if (input.auto_respond_inquiries !== undefined) dealerData.auto_respond_inquiries = input.auto_respond_inquiries;
        if (input.inquiry_email_notification !== undefined) dealerData.inquiry_email_notification = input.inquiry_email_notification;
        if (input.weekly_performance_report !== undefined) dealerData.weekly_performance_report = input.weekly_performance_report;
        if (input.allow_price_negotiations !== undefined) dealerData.allow_price_negotiations = input.allow_price_negotiations;

        let dealerId: number;

        if (existingDealers.length > 0) {
          // Update existing dealer
          await updateSchemaTable(
            '02a. Dealership',
            'dealers',
            dealerData,
            { id: existingDealers[0].id }
          );
          dealerId = existingDealers[0].id;
        } else {
          // Create new dealer record
          dealerData.created_at = new Date().toISOString();
          const newDealer = await insertSchemaTable<{ id: number }>(
            '02a. Dealership',
            'dealers',
            dealerData
          );
          dealerId = newDealer.id;
        }

        return { success: true, dealerId };
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

