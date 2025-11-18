import { z } from 'zod';
import { router, publicProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { querySchemaTable, updateSchemaTable, insertSchemaTable } from '../lib/supabase-db';
import { ENV } from '../_core/env';

/**
 * Profile Router
 * Handles complete user profile management including:
 * - Personal information (from auth.users)
 * - Organization information (from organizations table)
 * - Dealership information (from dealers table, conditional)
 */

// Validation schemas
// Business hours schema with transform to handle string values and malformed data
// Helper function to normalize business hours
const normalizeBusinessHoursData = (val: any): Record<string, { open: string; close: string; closed: boolean }> | undefined => {
  // If undefined or null, return undefined
  if (val === undefined || val === null) {
    return undefined;
  }
  
  // Try to parse if it's a string (JSON string)
  let parsedVal = val;
  if (typeof val === 'string') {
    try {
      parsedVal = JSON.parse(val);
    } catch {
      // If parsing fails, treat as invalid and return default structure
      parsedVal = {};
    }
  }
  
  // If it's an object (or was parsed from string), normalize it
  if (typeof parsedVal === 'object' && !Array.isArray(parsedVal) && parsedVal !== null) {
    const normalized: Record<string, { open: string; close: string; closed: boolean }> = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    
    for (const day of days) {
      const dayData = (parsedVal as any)[day];
      
      // Explicitly check for string values first (this is the error case)
      if (typeof dayData === 'string') {
        // String value - convert to default object
        normalized[day] = {
          open: '09:00',
          close: '17:00',
          closed: false,
        };
      }
      // Check if dayData is a valid object with required properties
      else if (dayData && typeof dayData === 'object' && !Array.isArray(dayData) && dayData !== null && 'open' in dayData && 'close' in dayData) {
        // Valid object - normalize and validate time format
        const openTime = String(dayData.open || '09:00');
        const closeTime = String(dayData.close || '17:00');
        
        normalized[day] = {
          open: timeRegex.test(openTime) ? openTime : '09:00',
          close: timeRegex.test(closeTime) ? closeTime : '17:00',
          closed: Boolean(dayData.closed ?? false),
        };
      } else {
        // Invalid, missing, null, or malformed - set default object
        normalized[day] = {
          open: '09:00',
          close: '17:00',
          closed: false,
        };
      }
    }
    
    return normalized;
  }
  
  // If we can't process it, return undefined
  return undefined;
};

// Use preprocess to normalize BEFORE any validation occurs
// This is critical - preprocessing runs before Zod validates the structure
const businessHoursSchema = z.preprocess(
  (val) => {
    console.log('[businessHoursSchema] Preprocessing value:', {
      type: typeof val,
      isArray: Array.isArray(val),
      isNull: val === null,
      isUndefined: val === undefined,
      valuePreview: val && typeof val === 'object' ? Object.keys(val).slice(0, 3) : 'not an object',
    });
    
    // If undefined or null, return undefined (will be handled by .optional())
    if (val === undefined || val === null) {
      return undefined;
    }
    
    // Always normalize - this handles both correct and malformed inputs
    const normalized = normalizeBusinessHoursData(val);
    
    console.log('[businessHoursSchema] After normalization:', {
      hasResult: !!normalized,
      keys: normalized ? Object.keys(normalized) : [],
      mondayType: normalized?.monday ? typeof normalized.monday : 'no monday',
      mondayValue: normalized?.monday,
    });
    
    // Always return a normalized object (never undefined from normalization)
    // If normalization fails, return default structure with all days
    if (!normalized) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const defaultHours: Record<string, { open: string; close: string; closed: boolean }> = {};
      days.forEach(day => {
        defaultHours[day] = { open: '09:00', close: '17:00', closed: false };
      });
      return defaultHours;
    }
    return normalized;
  },
  z.record(
    z.string(),
    z.object({
      open: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      close: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      closed: z.boolean(),
    })
  ).optional()
);

const updatePersonalSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional(),
  bio: z.string().max(1000).optional(),
  emailNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

const updateOrganizationSchema = z.object({
  organizationId: z.number(),
  organization_type_id: z.number().optional(),
  organization_name: z.string().min(1).max(255).optional(),
  legal_entity_name: z.string().max(255).optional(),
  display_name: z.string().max(255).optional(),
  primary_email: z.string().email().max(255).optional(),
  primary_phone: z.string().max(50).optional(),
  primary_phone_ext: z.string().max(20).optional(),
  address_line1: z.string().max(255).optional(),
  address_line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state_province: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(2).optional(),
  website_url: z.string().url().max(500).optional().or(z.literal('')),
  logo_url: z.string().url().max(500).optional().or(z.literal('')),
  tax_id: z.string().max(50).optional(),
  business_hours: businessHoursSchema,
  sales_territory_states: z.array(z.string().length(2).toUpperCase()).optional(),
  status: z.enum(['active', 'suspended', 'inactive', 'pending_verification', 'rejected']).optional(),
  subscription_tier: z.enum(['free', 'basic', 'premium', 'enterprise']).optional(),
});

const updateDealerSchema = z.object({
  organizationId: z.number(),
  business_type: z.enum(['franchise_dealer', 'independent_dealer', 'fleet_remarketer', 'broker', 'leasing_company', 'rental_company', 'other']).optional(),
  dealer_license_number: z.string().max(100).optional(),
  dealer_license_state: z.string().length(2).toUpperCase().optional(),
  dealer_license_expires_at: z.string().optional(),
  tax_id: z.string().max(50).optional(),
  duns_number: z.string().max(20).optional(),
  specializations: z.array(z.string().max(100)).optional(),
  makes_carried: z.array(z.string().max(50)).optional(),
  average_inventory_count: z.number().int().positive().nullish(),
  lot_capacity: z.number().int().positive().nullish(),
  can_special_order: z.boolean().optional(),
  accepts_trade_ins: z.boolean().optional(),
  has_service_department: z.boolean().optional(),
  has_parts_department: z.boolean().optional(),
  has_body_shop: z.boolean().optional(),
  can_install_upfits: z.boolean().optional(),
  typical_delivery_days: z.number().int().positive().nullish(),
  sales_territory_states: z.array(z.string().length(2).toUpperCase()).optional(),
  delivery_available: z.boolean().optional(),
  delivery_radius_miles: z.number().int().positive().nullish(),
  delivery_fee: z.number().nonnegative().nullish(),
  current_promotions: z.string().max(2000).optional(),
  accepts_fleet_inquiries: z.boolean().optional(),
  minimum_fleet_size: z.number().int().positive().nullish(),
  fleet_discount_percentage: z.number().min(0).max(100).nullish(),
  certifications: z.array(z.string().max(200)).optional(),
  awards: z.array(z.string().max(200)).optional(),
  auto_respond_inquiries: z.boolean().optional(),
  inquiry_email_notification: z.boolean().optional(),
  weekly_performance_report: z.boolean().optional(),
  allow_price_negotiations: z.boolean().optional(),
});

/**
 * Get complete user profile with all related data
 */
export const profileRouter = router({
  get: publicProcedure
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

        // Get auth user
        const { data: { user: authUser }, error: authError } = await userSupabase.auth.getUser();
        
        if (authError || !authUser) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          });
        }

        // Get user profile with organization - ALL data comes from organization schema via RPC
        // The RPC function returns JSONB with complete organization and dealer data
        const { data: profileData, error: profileError } = await userSupabase.rpc('get_current_user_profile');
        
        if (profileError) {
          console.log('[Profile.get] RPC error:', profileError.message);
          console.log('[Profile.get] Auth user ID:', authUser.id);
          
          // Check if organization exists directly in database (diagnostic)
          const { querySchemaTable } = await import('../lib/supabase-db');
          try {
            // Check if user has organization_users record
            const orgUsers = await querySchemaTable<{ organization_id: number }>(
              '01. Organization',
              'organization_users',
              {
                where: { user_id: authUser.id },
                limit: 1,
              }
            );
            
            if (orgUsers.length > 0) {
              console.log('[Profile.get] Found organization_users record but RPC failed:', {
                organization_id: orgUsers[0].organization_id,
                rpc_error: profileError.message,
              });
            }
          } catch (diagError) {
            console.error('[Profile.get] Diagnostic query failed:', diagError);
          }
          
          // User might not have an organization yet - return basic profile
          return {
            personal: {
              id: authUser.id,
              email: authUser.email || '',
              name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
              phone: authUser.user_metadata?.phone || '',
              bio: authUser.user_metadata?.bio || '',
              emailNotifications: authUser.user_metadata?.emailNotifications !== false,
              marketingEmails: authUser.user_metadata?.marketingEmails || false,
              createdAt: authUser.created_at,
              lastSignInAt: authUser.last_sign_in_at,
            },
            organization: null,
            dealer: null,
            account: {
              role: null,
              memberSince: null,
            },
          };
        }

        // RPC function now returns JSONB (single object, not array)
        const profile = profileData as any;
        
        if (!profile || profile.error) {
          console.log('[Profile.get] No profile returned from RPC or error:', profile?.error);
          // No organization profile yet
          return {
            personal: {
              id: authUser.id,
              email: authUser.email || '',
              name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
              phone: authUser.user_metadata?.phone || '',
              bio: authUser.user_metadata?.bio || '',
              emailNotifications: authUser.user_metadata?.emailNotifications !== false,
              marketingEmails: authUser.user_metadata?.marketingEmails || false,
              createdAt: authUser.created_at,
              lastSignInAt: authUser.last_sign_in_at,
            },
            organization: null,
            dealer: null,
            account: {
              role: null,
              memberSince: null,
            },
          };
        }

        console.log('[Profile.get] RPC returned profile from organization schema:', {
          hasProfile: !!profile,
          organization_id: profile.organization_id,
          role: profile.role,
          hasOrganization: !!profile.organization,
          organizationData: profile.organization ? {
            id: profile.organization.id,
            name: profile.organization.organization_name,
            email: profile.organization.primary_email,
          } : null,
          hasDealer: !!profile.dealer,
        });

        // All data is already in the profile object from the organization schema
        // No need for additional queries - everything comes from the RPC function
        let organization = profile.organization || null;
        const dealer = profile.dealer || null;
        let organizationType = organization?.organization_type || null;
        
        // If organization_user exists but organization is null, try to fetch it directly
        if (profile.organization_id && !organization) {
          console.warn('[Profile.get] organization_user exists (id: %s, org_id: %s) but organization not returned by RPC. Attempting direct query.', 
            profile.id, profile.organization_id);
          
          try {
            const { querySchemaTable } = await import('../lib/supabase-db');
            const orgs = await querySchemaTable<any>(
              '01. Organization',
              'organizations',
              {
                where: { id: profile.organization_id },
                limit: 1,
              }
            );
            
            if (orgs.length > 0) {
              organization = orgs[0];
              console.log('[Profile.get] Successfully fetched organization directly:', {
                id: organization.id,
                name: organization.organization_name,
                email: organization.primary_email,
              });
              
              // Also fetch organization type if needed
              if (organization.organization_type_id) {
                const types = await querySchemaTable<any>(
                  '01. Organization',
                  'organization_types',
                  {
                    where: { id: organization.organization_type_id },
                    limit: 1,
                  }
                );
                if (types.length > 0) {
                  organizationType = types[0];
                }
              }
            } else {
              console.error('[Profile.get] Organization ID %s not found in database. This may indicate:', 
                profile.organization_id,
                '- Organization was deleted',
                '- RLS policy is blocking access',
                '- Organization ID mismatch'
              );
            }
          } catch (directQueryError) {
            console.error('[Profile.get] Failed to query organization directly:', directQueryError);
            // If DATABASE_URL is not set, querySchemaTable will fail silently
            // Try using Supabase client as last resort
            try {
              const { data: orgData, error: orgError } = await userSupabase
                .from('organizations')
                .select('*')
                .eq('id', profile.organization_id)
                .single();
              
              if (!orgError && orgData) {
                organization = orgData;
                console.log('[Profile.get] Successfully fetched organization via Supabase client:', organization.organization_name);
              } else {
                console.error('[Profile.get] Supabase client query also failed:', orgError);
              }
            } catch (supabaseErr) {
              console.error('[Profile.get] Supabase client fallback also failed:', supabaseErr);
            }
          }
        }

        return {
          personal: {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
            phone: authUser.user_metadata?.phone || '',
            bio: authUser.user_metadata?.bio || '',
            emailNotifications: authUser.user_metadata?.emailNotifications !== false,
            marketingEmails: authUser.user_metadata?.marketingEmails || false,
            createdAt: authUser.created_at,
            lastSignInAt: authUser.last_sign_in_at,
          },
          // Organization data comes directly from organization schema via RPC
          organization: organization ? {
            ...organization,
            organizationType,
          } : null,
          // Dealer data comes directly from dealership schema via RPC
          dealer,
          account: {
            role: profile.role,
            memberSince: profile.joined_at || profile.created_at,
          },
        };
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

  updatePersonal: publicProcedure
    .input(updatePersonalSchema)
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

        // Build update data
        const updateData: Record<string, any> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.phone !== undefined) updateData.phone = input.phone;
        if (input.bio !== undefined) updateData.bio = input.bio;
        if (input.emailNotifications !== undefined) updateData.emailNotifications = input.emailNotifications;
        if (input.marketingEmails !== undefined) updateData.marketingEmails = input.marketingEmails;

        // Use Admin API if service role key is available (doesn't require session)
        // Otherwise, use REST API directly with the access token
        let updateError: any = null;
        
        if (ENV.supabaseServiceRoleKey) {
          // Use Admin API - doesn't require a session
          const adminSupabase = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });
          
          const { error: adminUpdateError } = await adminSupabase.auth.admin.updateUserById(
            user.id,
            { user_metadata: updateData }
          );
          
          updateError = adminUpdateError;
        } else {
          // Fallback: Use REST API directly with the access token
          // This works without requiring a stored session
          try {
            const response = await fetch(`${ENV.supabaseUrl}/auth/v1/user`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'apikey': ENV.supabaseAnonKey,
              },
              body: JSON.stringify({
                user_metadata: updateData,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (restError: any) {
            updateError = restError;
          }
        }

        if (updateError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to update profile: ${updateError.message}`,
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

  updateOrganization: publicProcedure
    .input(updateOrganizationSchema)
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
        const { data: profileData, error: profileRpcError } = await userSupabase.rpc('get_current_user_profile');
        
        if (profileRpcError) {
          console.error('[updateOrganization] RPC error:', profileRpcError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to verify user permissions: ${profileRpcError.message}`,
          });
        }
        
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        
        if (!profile || profile.error) {
          // Check if organization exists directly in the database
          const { querySchemaTable } = await import('../lib/supabase-db');
          try {
            const orgs = await querySchemaTable<{ id: number }>(
              '01. Organization',
              'organizations',
              {
                where: { id: input.organizationId },
                limit: 1,
              }
            );
            
            if (orgs.length === 0) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Organization not found in database',
              });
            }
            
            // Organization exists but user doesn't have organization_users record
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have permission to update this organization. Your account is not linked to an organization. Please contact support.',
            });
          } catch (err) {
            if (err instanceof TRPCError) {
              throw err;
            }
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have permission to update this organization',
            });
          }
        }
        
        if (profile.organization_id !== input.organizationId) {
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

        // Build update data
        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (input.organization_type_id !== undefined) updateData.organization_type_id = input.organization_type_id;
        if (input.organization_name !== undefined) updateData.organization_name = input.organization_name;
        if (input.legal_entity_name !== undefined) updateData.legal_entity_name = input.legal_entity_name || null;
        if (input.display_name !== undefined) updateData.display_name = input.display_name || null;
        if (input.primary_email !== undefined) updateData.primary_email = input.primary_email;
        if (input.primary_phone !== undefined) updateData.primary_phone = input.primary_phone || null;
        if (input.primary_phone_ext !== undefined) updateData.primary_phone_ext = input.primary_phone_ext || null;
        if (input.address_line1 !== undefined) updateData.address_line1 = input.address_line1 || null;
        if (input.address_line2 !== undefined) updateData.address_line2 = input.address_line2 || null;
        if (input.city !== undefined) updateData.city = input.city || null;
        if (input.state_province !== undefined) updateData.state_province = input.state_province || null;
        if (input.postal_code !== undefined) updateData.postal_code = input.postal_code || null;
        if (input.country !== undefined) {
          // Country should be max 2 characters (ISO code)
          updateData.country = input.country ? input.country.substring(0, 2).toUpperCase() : null;
        }
        if (input.website_url !== undefined) updateData.website_url = input.website_url || null;
        if (input.logo_url !== undefined) updateData.logo_url = input.logo_url || null;
        if (input.tax_id !== undefined) updateData.tax_id = input.tax_id || null;
        if (input.business_hours !== undefined) {
          // Ensure business_hours is properly formatted as JSONB
          updateData.business_hours = input.business_hours ? JSON.parse(JSON.stringify(input.business_hours)) : null;
        }
        if (input.sales_territory_states !== undefined) {
          // Ensure sales_territory_states is properly formatted as JSONB array
          updateData.sales_territory_states = input.sales_territory_states && input.sales_territory_states.length > 0 
            ? input.sales_territory_states 
            : null;
        }
        if (input.status !== undefined) updateData.status = input.status;
        if (input.subscription_tier !== undefined) updateData.subscription_tier = input.subscription_tier;

        console.log('[updateOrganization] Updating organization:', {
          organizationId: input.organizationId,
          fieldsToUpdate: Object.keys(updateData),
          updateDataCount: Object.keys(updateData).length,
        });

        // Check if DATABASE_URL is available
        const hasDatabaseUrl = !!ENV.databaseUrl;
        
        let result: any;
        
        // Try using postgres client if DATABASE_URL is available
        if (hasDatabaseUrl) {
          try {
            const { updateSchemaTable } = await import('../lib/supabase-db');
            result = await updateSchemaTable(
              '01. Organization',
              'organizations',
              updateData,
              { id: input.organizationId }
            );
            console.log('[updateOrganization] Update successful via postgres client');
          } catch (postgresError: any) {
            console.error('[updateOrganization] Postgres client update failed:', postgresError);
            // Fall through to RPC fallback
          }
        }
        
        // Use RPC function if postgres client failed or is not available
        if (!result) {
          try {
            console.log('[updateOrganization] Using RPC function (DATABASE_URL available:', hasDatabaseUrl, ')');
            const { data: rpcResult, error: rpcError } = await userSupabase.rpc('update_organization', {
              p_organization_id: input.organizationId,
              p_update_data: updateData,
            });
            
            if (rpcError) {
              console.error('[updateOrganization] RPC error details:', {
                message: rpcError.message,
                details: rpcError.details,
                hint: rpcError.hint,
                code: rpcError.code,
              });
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to update organization via RPC: ${rpcError.message}. 
                
Please check:
- That the update_organization RPC function exists in the database
- Server logs for detailed error messages
- That you have run the migration: 20250117_create_update_organization_function.sql`,
              });
            }
            
            result = rpcResult;
            console.log('[updateOrganization] Update successful via RPC function');
          } catch (rpcError: any) {
            console.error('[updateOrganization] RPC function failed:', rpcError);
            
            // If it's already a TRPCError, re-throw it
            if (rpcError instanceof TRPCError) {
              throw rpcError;
            }
            
            // Otherwise, create a new error
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Failed to update organization: ${rpcError?.message || 'Unknown error'}. 
              
Possible causes:
1. RPC function 'update_organization' does not exist - run migration: 20250117_create_update_organization_function.sql
2. Database connection failed
3. Invalid data format

Please check:
- Server logs for detailed error messages
- That all migrations have been run
- That the update_organization RPC function exists in the database`,
            });
          }
        }

        console.log('[updateOrganization] Update successful:', {
          organizationId: input.organizationId,
          updatedFields: Object.keys(updateData),
          result: result,
        });

        return { success: true, organization: result };
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

  updateDealer: publicProcedure
    .input(updateDealerSchema)
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

        // Check if DATABASE_URL is available
        const hasDatabaseUrl = !!ENV.databaseUrl;
        
        // Check if dealer record exists
        let existingDealer: { id: number } | null = null;
        if (hasDatabaseUrl) {
          try {
            const { querySchemaTable } = await import('../lib/supabase-db');
            const dealers = await querySchemaTable<{ id: number }>(
              '02a. Dealership',
              'dealers',
              {
                where: { organization_id: input.organizationId },
                limit: 1,
              }
            );
            if (dealers.length > 0) {
              existingDealer = dealers[0];
            }
          } catch (error) {
            console.error('[updateDealer] Failed to query dealers via postgres:', error);
          }
        } else {
          // Use RPC function to find dealer
          try {
            const { data: dealerData, error: rpcError } = await userSupabase.rpc('get_dealer_by_organization_id', {
              p_organization_id: input.organizationId,
            });
            if (!rpcError && dealerData && !dealerData.error) {
              existingDealer = { id: dealerData.id };
            }
          } catch (error) {
            console.error('[updateDealer] Failed to query dealer via RPC:', error);
          }
        }

        // Build dealer data
        const dealerData: Record<string, any> = {
          organization_id: input.organizationId,
          updated_at: new Date().toISOString(),
        };

        // Add all optional fields - handle null values properly
        Object.entries(input).forEach(([key, value]) => {
          if (key !== 'organizationId' && value !== undefined) {
            // For nullish number fields, explicitly set null if value is null
            dealerData[key] = value;
          }
        });

        let dealerId: number | undefined;

        if (existingDealer) {
          // Update existing dealer
          if (hasDatabaseUrl) {
            try {
              const { updateSchemaTable } = await import('../lib/supabase-db');
              await updateSchemaTable(
                '02a. Dealership',
                'dealers',
                dealerData,
                { id: existingDealer.id }
              );
              dealerId = existingDealer.id;
              console.log('[updateDealer] Update successful via postgres client');
            } catch (error) {
              console.error('[updateDealer] Postgres update failed, trying RPC:', error);
              // Fall through to RPC
            }
          }
          
          // Use RPC if postgres failed or not available
          if (!hasDatabaseUrl || dealerId === undefined) {
            try {
              const { data: rpcResult, error: rpcError } = await userSupabase.rpc('update_dealer', {
                p_dealer_id: existingDealer.id,
                p_update_data: dealerData,
              });
              
              if (rpcError || (rpcResult && rpcResult.error)) {
                throw new TRPCError({
                  code: 'INTERNAL_SERVER_ERROR',
                  message: `Failed to update dealer via RPC: ${rpcError?.message || rpcResult?.error || 'Unknown error'}. Please check that the update_dealer RPC function exists.`,
                });
              }
              
              dealerId = rpcResult.id;
              console.log('[updateDealer] Update successful via RPC function');
            } catch (rpcError: any) {
              if (rpcError instanceof TRPCError) {
                throw rpcError;
              }
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to update dealer: ${rpcError?.message || 'Unknown error'}. Please run migration: 20250117_create_update_dealer_function.sql`,
              });
            }
          }
        } else {
          // Create new dealer record
          dealerData.created_at = new Date().toISOString();
          if (hasDatabaseUrl) {
            try {
              const { insertSchemaTable } = await import('../lib/supabase-db');
              const newDealer = await insertSchemaTable<{ id: number }>(
                '02a. Dealership',
                'dealers',
                dealerData
              );
              dealerId = newDealer.id;
              console.log('[updateDealer] Create successful via postgres client');
            } catch (error) {
              console.error('[updateDealer] Postgres insert failed, trying RPC:', error);
              // Fall through to RPC
            }
          }
          
          // Use RPC if postgres failed or not available
          if (!hasDatabaseUrl || dealerId === undefined) {
            try {
              const { data: rpcResult, error: rpcError } = await userSupabase.rpc('insert_dealer', {
                p_dealer_data: dealerData,
              });
              
              if (rpcError || (rpcResult && rpcResult.error)) {
                throw new TRPCError({
                  code: 'INTERNAL_SERVER_ERROR',
                  message: `Failed to create dealer via RPC: ${rpcError?.message || rpcResult?.error || 'Unknown error'}. Please check that the insert_dealer RPC function exists.`,
                });
              }
              
              dealerId = rpcResult.id;
              console.log('[updateDealer] Create successful via RPC function');
            } catch (rpcError: any) {
              if (rpcError instanceof TRPCError) {
                throw rpcError;
              }
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to create dealer: ${rpcError?.message || 'Unknown error'}. Please run migration: 20250117_create_update_dealer_function.sql`,
              });
            }
          }
        }

        if (dealerId === undefined) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create or update dealer record',
          });
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
        console.error('[getOrganizationTypes] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch organization types',
        });
      }
    }),

  createOrganization: publicProcedure
    .input(z.object({
      organization_type_id: z.number(),
      organization_name: z.string().min(1),
      legal_entity_name: z.string().optional(),
      display_name: z.string().optional(),
      primary_email: z.string().email(),
      primary_phone: z.string().optional(),
      primary_phone_ext: z.string().optional(),
      address_line1: z.string().optional(),
      address_line2: z.string().optional(),
      city: z.string().optional(),
      state_province: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
      website_url: z.string().url().optional().or(z.literal('')),
      logo_url: z.string().url().optional().or(z.literal('')),
      tax_id: z.string().optional(),
      business_hours: businessHoursSchema,
      sales_territory_states: z.array(z.string().length(2).toUpperCase()).optional(),
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

        // Check if user already has an organization (from organization schema)
        const { data: profileData } = await userSupabase.rpc('get_current_user_profile');
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        
        if (profile && !profile.error && profile.organization_id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User already has an organization. Use updateOrganization instead.',
          });
        }

        // Generate slug from organization name
        const slug = input.organization_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 100);

        // Create organization
        const { insertSchemaTable } = await import('../lib/supabase-db');
        
        const orgData: Record<string, any> = {
          organization_type_id: input.organization_type_id,
          organization_name: input.organization_name,
          slug: slug,
          primary_email: input.primary_email,
          country: input.country || 'US',
          status: input.status || 'active',
          subscription_tier: input.subscription_tier || 'free',
          is_verified: false,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (input.legal_entity_name) orgData.legal_entity_name = input.legal_entity_name;
        if (input.display_name) orgData.display_name = input.display_name;
        if (input.primary_phone) orgData.primary_phone = input.primary_phone;
        if (input.primary_phone_ext) orgData.primary_phone_ext = input.primary_phone_ext;
        if (input.address_line1) orgData.address_line1 = input.address_line1;
        if (input.address_line2) orgData.address_line2 = input.address_line2;
        if (input.city) orgData.city = input.city;
        if (input.state_province) orgData.state_province = input.state_province;
        if (input.postal_code) orgData.postal_code = input.postal_code;
        if (input.website_url) orgData.website_url = input.website_url || null;
        if (input.logo_url) orgData.logo_url = input.logo_url || null;
        if (input.tax_id) orgData.tax_id = input.tax_id;
        if (input.business_hours) orgData.business_hours = input.business_hours;
        if (input.sales_territory_states) orgData.sales_territory_states = input.sales_territory_states;

        const newOrg = await insertSchemaTable<{ id: number }>(
          '01. Organization',
          'organizations',
          orgData
        );

        // Create organization_user record linking user to organization
        await insertSchemaTable(
          '01. Organization',
          'organization_users',
          {
            organization_id: newOrg.id,
            user_id: user.id,
            role: 'owner',
            status: 'active',
            email_notifications: true,
            sms_notifications: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            joined_at: new Date().toISOString(),
          }
        );

        return { success: true, organizationId: newOrg.id };
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

  // Diagnostic endpoint to check user-organization link
  diagnose: publicProcedure
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

        const { data: { user: authUser }, error: authError } = await userSupabase.auth.getUser();
        
        if (authError || !authUser) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          });
        }

        // Check if user exists in auth.users
        const authUserExists = !!authUser;

        // Check if user has organization_user record (from organization schema)
        const { data: profileData, error: profileError } = await userSupabase.rpc('get_current_user_profile');
        // Handle both array (old) and object (new JSONB) formats
        const hasProfile = !profileError && profileData && !profileData.error;
        const profile = hasProfile ? (Array.isArray(profileData) ? profileData[0] : profileData) : null;

        // Check if organization exists
        // First check if RPC returned organization data directly
        let organizationExists = false;
        let organizationId = null;
        let organizationName = null;
        
        if (profile?.organization) {
          // RPC function returned organization data directly
          organizationExists = true;
          organizationId = profile.organization.id;
          organizationName = profile.organization.organization_name;
        } else if (profile?.organization_id) {
          // RPC didn't return organization, but we have organization_id - query directly
          organizationId = profile.organization_id;
          try {
            const { querySchemaTable } = await import('../lib/supabase-db');
            const orgs = await querySchemaTable<any>(
              '01. Organization',
              'organizations',
              {
                where: { id: profile.organization_id },
                limit: 1,
              }
            );
            organizationExists = orgs.length > 0;
            if (orgs.length > 0) {
              organizationName = orgs[0].organization_name;
            }
          } catch (err) {
            console.error('[Diagnose] Error checking organization:', err);
            // Also try using Supabase client directly as fallback
            try {
              const { data: orgData, error: orgError } = await userSupabase
                .from('organizations')
                .select('id, organization_name')
                .eq('id', profile.organization_id)
                .single();
              
              if (!orgError && orgData) {
                organizationExists = true;
                organizationName = orgData.organization_name;
              }
            } catch (supabaseErr) {
              console.error('[Diagnose] Supabase client query also failed:', supabaseErr);
            }
          }
        }

        // Check if dealer exists
        let dealerExists = false;
        if (organizationId) {
          try {
            const dealers = await querySchemaTable<any>(
              '02a. Dealership',
              'dealers',
              {
                where: { organization_id: organizationId },
                limit: 1,
              }
            );
            dealerExists = dealers.length > 0;
          } catch (err) {
            console.error('[Diagnose] Error checking dealer:', err);
          }
        }

        return {
          authUser: {
            id: authUser.id,
            email: authUser.email,
            exists: authUserExists,
          },
          organizationUser: {
            exists: hasProfile,
            id: profile?.id || null,
            organization_id: profile?.organization_id || null,
            role: profile?.role || null,
            user_id: profile?.user_id || null,
          },
          organization: {
            exists: organizationExists,
            id: organizationId,
            name: organizationName,
          },
          dealer: {
            exists: dealerExists,
          },
          issues: [
            !authUserExists && 'User does not exist in auth.users',
            !hasProfile && 'User has no organization_users record',
            hasProfile && !profile?.organization_id && 'User has organization_users record but no organization_id',
            profile?.organization_id && !organizationExists && 'Organization ID exists but organization not found',
            organizationId && !dealerExists && 'Organization exists but no dealer record found (may be normal)',
          ].filter(Boolean) as string[],
        };
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

