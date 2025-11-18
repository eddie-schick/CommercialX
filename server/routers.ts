import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { userRouter } from "./routers/user";
import { profileRouter } from "./routers/profile";
import * as db from "./db";
import type {
  VehicleListing,
  ListingImage,
  Vehicle,
  VehicleConfig,
  EquipmentConfig,
  CompleteConfiguration,
} from "./lib/supabase-types";

export const appRouter = router({
  system: systemRouter,
  user: userRouter,
  profile: profileRouter,
  
  admin: router({
    vehicleDataStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized: Admin access required");
        }

        const { getSupabaseClient } = await import("./_core/supabase");
        const { querySchemaTable } = await import("./lib/supabase-db");
        const supabase = getSupabaseClient();

        // Get all vehicle configs with data source info
        const configs = await querySchemaTable<{
          id?: number;
          data_source?: string;
          enrichment_metadata?: any;
          created_at: Date;
        }>(
          "03. Vehicle Data",
          "vehicle_config",
          {}
        );

        // Calculate statistics
        const nhtsaCount = configs?.filter(c => 
          c.data_source?.includes('nhtsa')
        ).length || 0;
        
        const epaCount = configs?.filter(c => 
          c.enrichment_metadata?.epaAvailable === true
        ).length || 0;
        
        const bothCount = configs?.filter(c => 
          c.data_source === 'vin_decode_both'
        ).length || 0;
        
        const manualCount = configs?.filter(c => 
          c.data_source === 'dealer_manual_entry' || !c.data_source
        ).length || 0;

        // Get confidence breakdown
        const highConfidence = configs?.filter(c => 
          c.enrichment_metadata?.nhtsaConfidence === 'high'
        ).length || 0;
        
        const mediumConfidence = configs?.filter(c => 
          c.enrichment_metadata?.nhtsaConfidence === 'medium'
        ).length || 0;
        
        const lowConfidence = configs?.filter(c => 
          c.enrichment_metadata?.nhtsaConfidence === 'low'
        ).length || 0;

        // Get recent decodes (last 10)
        const recentDecodes = configs
          ?.filter(c => c.enrichment_metadata)
          .sort((a, b) => {
            const aTime = new Date(a.enrichment_metadata?.decodedAt || a.created_at).getTime();
            const bTime = new Date(b.enrichment_metadata?.decodedAt || b.created_at).getTime();
            return bTime - aTime;
          })
          .slice(0, 10)
          .map(c => ({
            id: c.id || 0,
            vin: c.enrichment_metadata?.decodedVIN || '',
            year: c.enrichment_metadata?.year,
            make: c.enrichment_metadata?.make || '',
            model: c.enrichment_metadata?.model || '',
            dataSources: c.enrichment_metadata?.dataSources || [],
            confidence: c.enrichment_metadata?.nhtsaConfidence || 'medium',
            decodedAt: c.enrichment_metadata?.decodedAt || c.created_at?.toISOString() || '',
          })) || [];

        // Calculate cache hit rate (placeholder - would need to track this separately)
        const cacheHitRate = 0; // TODO: Implement cache hit tracking
        
        // Calculate average decode time (placeholder)
        const avgDecodeTime = 0; // TODO: Implement decode time tracking

        return {
          nhtsaCount,
          epaCount,
          bothCount,
          manualCount,
          highConfidence,
          mediumConfidence,
          lowConfidence,
          cacheHitRate,
          avgDecodeTime,
          recentDecodes,
        };
      }),
  }),
  
  nhtsa: router({
    getMakes: publicProcedure
      .input(
        z.object({
          vehicleType: z.enum(['car', 'truck', 'motorcycle', 'bus', 'trailer']).optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const { getCommercialVehicleMakes, getNHTSAMakesCached } = await import('./lib/services/nhtsa-makes');
        
        try {
          // For commercial vehicles, prefer truck makes
          const makes = input?.vehicleType === 'truck' || !input?.vehicleType
            ? await getCommercialVehicleMakes()
            : await getNHTSAMakesCached(input.vehicleType);
          
          return { makes, source: 'nhtsa' };
        } catch (error: any) {
          console.error('Failed to fetch NHTSA makes:', error);
          // Return fallback makes
          return {
            makes: [
              'Ford', 'Freightliner', 'Isuzu', 'Hino', 'Mack', 'Peterbilt',
              'Kenworth', 'Volvo', 'International', 'Mercedes-Benz', 'Ram',
              'Chevrolet', 'GMC', 'Nissan', 'Toyota', 'Dodge'
            ],
            source: 'fallback',
          };
        }
      }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    setupOrganization: publicProcedure
      .input(
        z.object({
          userId: z.string().uuid(), // Supabase Auth user ID (UUID)
          email: z.string().email(),
          name: z.string().min(1),
          organizationName: z.string().min(1),
          // Enhanced fields (all optional)
          businessType: z.enum(['franchise_dealer', 'independent_dealer', 'fleet_remarketer', 'broker', 'leasing_company', 'rental_company', 'other']).optional(),
          city: z.string().optional(),
          stateProvince: z.string().optional(),
          zipPostalCode: z.string().optional(),
          primaryPhone: z.string().optional(),
          websiteUrl: z
            .preprocess(
              (val) => {
                // Convert empty/null/undefined to undefined
                if (!val || val === '' || val === null || val === undefined) {
                  return undefined;
                }
                
                // If it's a string, try to normalize it
                if (typeof val === 'string') {
                  const trimmed = val.trim();
                  if (trimmed === '') return undefined;
                  
                  // If it doesn't start with http:// or https://, add https://
                  let normalized = trimmed;
                  if (!normalized.match(/^https?:\/\//i)) {
                    normalized = `https://${normalized}`;
                  }
                  
                  // Try to validate it - if invalid, return undefined to skip it
                  try {
                    new URL(normalized);
                    return normalized;
                  } catch {
                    // Invalid URL - skip it by returning undefined
                    return undefined;
                  }
                }
                
                return val;
              },
              z.union([
                z.string().url(),
                z.undefined(),
              ]).optional()
            ),
          makesCarried: z.array(z.string()).optional(),
          specializations: z.array(z.string()).optional(),
          dealerLicenseNumber: z.string().optional(),
          dealerLicenseState: z.string().optional(),
          taxId: z.string().optional(),
          hasServiceDepartment: z.boolean().optional(),
          hasPartsDepartment: z.boolean().optional(),
          canInstallUpfits: z.boolean().optional(),
          businessHours: z.record(z.any()).optional(),
          salesTerritoryStates: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { getSupabaseClient } = await import("./_core/supabase");
        const supabase = getSupabaseClient();

        // Call atomic RPC function to create organization, dealer, and link
        // The wrapper function handles checking for existing organizations
        // Using public schema wrapper function that Supabase RPC client can call
        try {
          const { data, error } = await supabase.rpc('create_dealer_organization', {
            p_user_id: input.userId,
            p_email: input.email,
            p_user_name: input.name,
            p_org_name: input.organizationName,
            // Enhanced parameters
            p_business_type: input.businessType || 'independent_dealer',
            p_city: input.city || null,
            p_state_province: input.stateProvince || null,
            p_zip_postal_code: input.zipPostalCode || null,
            p_primary_phone: input.primaryPhone || null,
            p_website_url: input.websiteUrl || null,
            p_makes_carried: input.makesCarried || null,
            p_specializations: input.specializations || null,
            p_dealer_license_number: input.dealerLicenseNumber || null,
            p_dealer_license_state: input.dealerLicenseState || null,
            p_tax_id: input.taxId || null,
            p_has_service_department: input.hasServiceDepartment || false,
            p_has_parts_department: input.hasPartsDepartment || false,
            p_can_install_upfits: input.canInstallUpfits || false,
            p_business_hours: input.businessHours || null,
            p_sales_territory_states: input.salesTerritoryStates || null,
          });

          if (error) {
            console.error('Failed to create dealer organization:', error);
            // Provide more helpful error message
            if (error.message?.includes('function') && error.message?.includes('does not exist')) {
              throw new Error(
                'Organization setup failed: Database function not found. Please ensure the migration ' +
                '20241115000004_add_public_schema_wrappers.sql has been run in your Supabase database.'
              );
            }
            throw new Error(`Organization setup failed: ${error.message}`);
          }

          if (!data) {
            throw new Error('No data returned from organization creation');
          }

          // Handle both array and direct jsonb return
          const resultData = Array.isArray(data) ? data[0] : data;
          
          if (!resultData) {
            throw new Error('No data returned from organization creation');
          }

          const result = resultData as {
            organization_id: number;
            dealer_id: number;
            organization_user_id: number;
          };

          const isExisting = result.dealer_id === 0; // Our wrapper returns 0 for dealer_id if org exists but no dealer

          console.log('✅ Organization processed successfully:', {
            organizationId: result.organization_id,
            dealerId: result.dealer_id || null,
            organizationUserId: result.organization_user_id,
            isExisting,
          });

          return {
            success: true,
            organizationId: result.organization_id,
            dealerId: result.dealer_id || null,
            organizationUserId: result.organization_user_id,
            message: isExisting 
              ? "Organization already exists" 
              : "Organization and dealer created successfully",
          };
        } catch (error) {
          console.error('Organization setup error:', error);
          throw error;
        }
      }),

    /**
     * Check if user has an organization
     */
    hasOrganization: publicProcedure
      .query(async ({ ctx }) => {
        const { getSupabaseClient } = await import("./_core/supabase");
        const supabase = getSupabaseClient();

        // Get current user from session
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return false;
        }

        const { data, error } = await supabase.rpc('user_has_organization');

        if (error) {
          console.error('Error checking organization:', error);
          return false;
        }

        return data || false;
      }),
  }),

  // Newsletter management
  newsletter: router({
    subscribe: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.subscribeNewsletter(input);
        return { success: true };
      }),
    
    unsubscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        await db.unsubscribeNewsletter(input.email);
        return { success: true };
      }),
  }),

  // Vehicle browsing and search
  vehicles: router({
    list: publicProcedure
      .input(
        z.object({
          fuelType: z.array(z.string()).optional(),
          make: z.array(z.string()).optional(),
          bodyType: z.array(z.string()).optional(),
          minYear: z.number().optional(),
          maxYear: z.number().optional(),
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          status: z.string().optional(),
          limit: z.number().default(20),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        return await db.getVehicles(input);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const vehicle = await db.getVehicleById(input.id);
        if (vehicle) {
          // Increment view count
          await db.incrementVehicleViewCount(input.id);
        }
        return vehicle;
      }),

    getImages: publicProcedure
      .input(z.object({ vehicleId: z.number() }))
      .query(async ({ input }) => {
        return await db.getVehicleImages(input.vehicleId);
      }),

    getFeatured: publicProcedure
      .input(z.object({ limit: z.number().default(6) }))
      .query(async ({ input }) => {
        return await db.getFeaturedVehicles(input.limit);
      }),

    search: publicProcedure
      .input(
        z.object({
          query: z.string(),
          limit: z.number().default(20),
        })
      )
      .query(async ({ input }) => {
        return await db.searchVehicles(input.query, input.limit);
      }),

    stats: publicProcedure.query(async () => {
      return await db.getVehicleStats();
    }),

    byFuelType: publicProcedure.query(async () => {
      return await db.getVehiclesByFuelType();
    }),
  }),

  // Lead management
  leads: router({
    create: publicProcedure
      .input(
        z.object({
          vehicleId: z.number().optional(),
          companyId: z.number(),
          firstName: z.string(),
          lastName: z.string(),
          email: z.string().email(),
          phone: z.string().optional(),
          company: z.string().optional(),
          message: z.string().optional(),
          leadType: z.enum(["inquiry", "quote", "test_drive", "financing", "trade_in"]).default("inquiry"),
          leadSource: z.enum(["marketplace", "dealer_site", "private_catalog", "referral", "other"]).default("marketplace"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const leadData = {
          ...input,
          ipAddress: ctx.req.ip || null,
          userAgent: ctx.req.get("user-agent") || null,
          referrer: ctx.req.get("referer") || null,
        };
        await db.createLead(leadData);
        return { success: true };
      }),

    listByCompany: protectedProcedure
      .input(
        z.object({
          companyId: z.number(),
          limit: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getLeadsByCompany(input.companyId, input.limit);
      }),
  }),

  // Blog and content
  blog: router({
    list: publicProcedure
      .input(
        z.object({
          limit: z.number().default(10),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        return await db.getPublishedBlogPosts(input.limit, input.offset);
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return await db.getBlogPostBySlug(input.slug);
      }),
  }),

  // Experts
  experts: router({
    list: publicProcedure.query(async () => {
      return await db.getActiveExperts();
    }),
  }),

  // Company information
  companies: router({
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCompanyById(input.id);
      }),

    getLocations: publicProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCompanyLocations(input.companyId);
      }),
  }),

  // Saved vehicles (favorites)
  saved: router({
    save: protectedProcedure
      .input(
        z.object({
          vehicleId: z.number(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.saveVehicle(ctx.user.id, input.vehicleId, input.notes);
        return { success: true };
      }),

    unsave: protectedProcedure
      .input(z.object({ vehicleId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.unsaveVehicle(ctx.user.id, input.vehicleId);
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSavedVehicles(ctx.user.id);
    }),
  }),

  // Bodies & Equipment
  bodiesEquipment: router({
    list: publicProcedure
      .input(
        z.object({
          category: z.string().optional(),
          manufacturer: z.string().optional(),
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          stockStatus: z.string().optional(),
          limit: z.number().default(20),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        return await db.getBodyEquipment(input);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        await db.incrementBodyEquipmentViews(input.id);
        return await db.getBodyEquipmentById(input.id);
      }),

    getImages: publicProcedure
      .input(z.object({ bodyEquipmentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getBodyEquipmentImages(input.bodyEquipmentId);
      }),
  }),

  // Charging Infrastructure
  infrastructure: router({
    list: publicProcedure
      .input(
        z.object({
          category: z.string().optional(),
          manufacturer: z.string().optional(),
          minPower: z.number().optional(),
          maxPower: z.number().optional(),
          connectorType: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          stockStatus: z.string().optional(),
          limit: z.number().default(20),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        return await db.getChargingInfrastructure(input);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        await db.incrementChargingInfrastructureViews(input.id);
        return await db.getChargingInfrastructureById(input.id);
      }),

    getImages: publicProcedure
      .input(z.object({ chargingInfrastructureId: z.number() }))
      .query(async ({ input }) => {
        return await db.getChargingInfrastructureImages(input.chargingInfrastructureId);
      }),
  }),

  // File upload
  upload: router({
    image: protectedProcedure
      .input(
        z.object({
          filename: z.string(),
          contentType: z.string(),
          data: z.string(), // base64 encoded
        })
      )
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        
        // Extract base64 data (remove data:image/...;base64, prefix)
        const base64Data = input.data.split(",")[1] || input.data;
        const buffer = Buffer.from(base64Data, "base64");
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const ext = input.filename.split(".").pop() || "jpg";
        const key = `uploads/${timestamp}-${randomSuffix}.${ext}`;
        
        // Upload to S3
        const { url } = await storagePut(key, buffer, input.contentType);
        
        return { url, key };
      }),
  }),

  // Dealer dashboard
  dealer: router({
    // Bodies & Equipment management
    bodies: router({
      list: protectedProcedure
        .input(
          z.object({
            category: z.string().optional(),
            manufacturer: z.string().optional(),
            stockStatus: z.string().optional(),
            search: z.string().optional(),
            limit: z.number().default(50),
            offset: z.number().default(0),
          })
        )
        .query(async ({ ctx, input }) => {
          // Check if user is dealer or admin
          if (ctx.user.role !== "dealer" && ctx.user.role !== "admin") {
            throw new Error("Unauthorized");
          }
          
          // Get user's company ID
          const profile = await db.getUserById(ctx.user.id);
          if (!profile?.companyId) {
            throw new Error("No company associated with user");
          }
          
          return await db.getDealerBodiesEquipment(profile.companyId, input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
          if (ctx.user.role !== "dealer" && ctx.user.role !== "admin") {
            throw new Error("Unauthorized");
          }
          
          const bodyEquipment = await db.getBodyEquipmentById(input.id);
          const profile = await db.getUserById(ctx.user.id);
          
          if (!bodyEquipment || !profile?.companyId || bodyEquipment.companyId !== profile.companyId) {
            throw new Error("Unauthorized or body/equipment not found");
          }
          
          return bodyEquipment;
        }),

      create: protectedProcedure
        .input(
          z.object({
            name: z.string(),
            category: z.enum([
              "box_body",
              "flatbed",
              "dump_body",
              "refrigerated",
              "service_body",
              "stake_body",
              "van_body",
              "crane",
              "liftgate",
              "toolbox",
              "ladder_rack",
              "shelving",
              "partition",
              "other"
            ]),
            manufacturer: z.string().optional(),
            model: z.string().optional(),
            description: z.string().optional(),
            msrp: z.number().optional(),
            salePrice: z.number().optional(),
            installationCost: z.number().optional(),
            dimensions: z.string().optional(),
            weight: z.number().optional(),
            capacity: z.number().optional(),
            material: z.string().optional(),
            color: z.string().optional(),
            compatibleChassisTypes: z.string().optional(),
            compatibleMakes: z.string().optional(),
            wheelbaseMin: z.number().optional(),
            wheelbaseMax: z.number().optional(),
            gvwrMin: z.number().optional(),
            gvwrMax: z.number().optional(),
            leadTimeDays: z.number().optional(),
            stockStatus: z.enum(["in_stock", "backorder", "made_to_order", "discontinued"]).default("in_stock"),
            installationTime: z.string().optional(),
            installationRequirements: z.string().optional(),
            warrantyYears: z.number().optional(),
            warrantyDetails: z.string().optional(),
            configurationOptions: z.string().optional(),
            featuredImage: z.string().optional(),
            status: z.enum(["live", "draft", "archived"]).default("draft"),
          })
        )
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "dealer" && ctx.user.role !== "admin") {
            throw new Error("Unauthorized");
          }
          
          const profile = await db.getUserById(ctx.user.id);
          if (!profile?.companyId) {
            throw new Error("No company associated with user");
          }
          
          const bodyEquipmentId = await db.createBodyEquipment({
            ...input,
            companyId: profile.companyId,
            isPublished: input.status === "live",
          });
          
          return { id: bodyEquipmentId, success: true };
        }),

      update: protectedProcedure
        .input(
          z.object({
            id: z.number(),
            name: z.string().optional(),
            category: z.enum([
              "box_body",
              "flatbed",
              "dump_body",
              "refrigerated",
              "service_body",
              "stake_body",
              "van_body",
              "crane",
              "liftgate",
              "toolbox",
              "ladder_rack",
              "shelving",
              "partition",
              "other"
            ]).optional(),
            manufacturer: z.string().optional(),
            model: z.string().optional(),
            description: z.string().optional(),
            msrp: z.number().optional(),
            salePrice: z.number().optional(),
            installationCost: z.number().optional(),
            dimensions: z.string().optional(),
            weight: z.number().optional(),
            capacity: z.number().optional(),
            material: z.string().optional(),
            color: z.string().optional(),
            compatibleChassisTypes: z.string().optional(),
            compatibleMakes: z.string().optional(),
            wheelbaseMin: z.number().optional(),
            wheelbaseMax: z.number().optional(),
            gvwrMin: z.number().optional(),
            gvwrMax: z.number().optional(),
            leadTimeDays: z.number().optional(),
            stockStatus: z.enum(["in_stock", "backorder", "made_to_order", "discontinued"]).optional(),
            installationTime: z.string().optional(),
            installationRequirements: z.string().optional(),
            warrantyYears: z.number().optional(),
            warrantyDetails: z.string().optional(),
            configurationOptions: z.string().optional(),
            featuredImage: z.string().optional(),
            status: z.enum(["live", "draft", "archived"]).optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "dealer" && ctx.user.role !== "admin") {
            throw new Error("Unauthorized");
          }
          
          const { id, ...updateData } = input;
          
          // Verify body/equipment belongs to dealer's company
          const bodyEquipment = await db.getBodyEquipmentById(id);
          const profile = await db.getUserById(ctx.user.id);
          
          if (!bodyEquipment || !profile?.companyId || bodyEquipment.companyId !== profile.companyId) {
            throw new Error("Unauthorized or body/equipment not found");
          }
          
          await db.updateBodyEquipment(id, {
            ...updateData,
            isPublished: updateData.status === "live" ? true : bodyEquipment.isPublished,
          });
          
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "dealer" && ctx.user.role !== "admin") {
            throw new Error("Unauthorized");
          }
          
          // Verify body/equipment belongs to dealer's company
          const bodyEquipment = await db.getBodyEquipmentById(input.id);
          const profile = await db.getUserById(ctx.user.id);
          
          if (!bodyEquipment || !profile?.companyId || bodyEquipment.companyId !== profile.companyId) {
            throw new Error("Unauthorized or body/equipment not found");
          }
          
          await db.deleteBodyEquipment(input.id);
          return { success: true };
        }),
    }),

    // Charging Infrastructure management
    infrastructure: router({
      list: protectedProcedure
        .input(
          z.object({
            category: z.string().optional(),
            manufacturer: z.string().optional(),
            stockStatus: z.string().optional(),
            search: z.string().optional(),
            limit: z.number().default(50),
            offset: z.number().default(0),
          })
        )
        .query(async ({ ctx, input }) => {
          // Check if user is dealer or admin
          if (ctx.user.role !== "dealer" && ctx.user.role !== "admin") {
            throw new Error("Unauthorized");
          }
          
          // Get user's company ID
          const profile = await db.getUserById(ctx.user.id);
          if (!profile?.companyId) {
            throw new Error("No company associated with user");
          }
          
          return await db.getDealerInfrastructure(profile.companyId, input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
          if (ctx.user.role !== "dealer" && ctx.user.role !== "admin") {
            throw new Error("Unauthorized");
          }
          
          const infrastructure = await db.getChargingInfrastructureById(input.id);
          const profile = await db.getUserById(ctx.user.id);
          
          if (!infrastructure || !profile?.companyId || infrastructure.companyId !== profile.companyId) {
            throw new Error("Unauthorized or infrastructure not found");
          }
          
          return infrastructure;
        }),

      create: protectedProcedure
        .input(
          z.object({
            name: z.string(),
            category: z.enum(["level_1", "level_2", "dc_fast", "depot_charger", "portable", "accessories"]),
            manufacturer: z.string().optional(),
            model: z.string().optional(),
            description: z.string().optional(),
            msrp: z.number().optional(),
            salePrice: z.number().optional(),
            installationCost: z.number().optional(),
            inputVoltage: z.string().optional(),
            outputPower: z.number().optional(),
            outputCurrent: z.number().optional(),
            efficiency: z.number().optional(),
            connectorTypes: z.string().optional(),
            numberOfPorts: z.number().default(1),
            simultaneousCharging: z.boolean().default(false),
            cableLength: z.number().optional(),
            cableType: z.string().optional(),
            installationType: z.enum(["wall_mount", "pedestal", "overhead", "portable"]).optional(),
            installationRequirements: z.string().optional(),
            electricalRequirements: z.string().optional(),
            dimensions: z.string().optional(),
            networkConnected: z.boolean().default(false),
            paymentCapable: z.boolean().default(false),
            loadManagement: z.boolean().default(false),
            weatherRating: z.string().optional(),
            certifications: z.string().optional(),
            warrantyYears: z.number().optional(),
            warrantyDetails: z.string().optional(),
            leadTimeDays: z.number().optional(),
            stockStatus: z.enum(["in_stock", "backorder", "made_to_order", "discontinued"]).default("in_stock"),
            locationAddress: z.string().optional(),
            locationCity: z.string().optional(),
            locationState: z.string().optional(),
            locationZipCode: z.string().optional(),
            latitude: z.string().optional(),
            longitude: z.string().optional(),
            isPublicAccess: z.boolean().default(false),
            featuredImage: z.string().optional(),
            status: z.enum(["live", "draft", "archived"]).default("draft"),
          })
        )
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "dealer" && ctx.user.role !== "admin") {
            throw new Error("Unauthorized");
          }
          
          const profile = await db.getUserById(ctx.user.id);
          if (!profile?.companyId) {
            throw new Error("No company associated with user");
          }
          
          const infrastructureId = await db.createInfrastructure({
            ...input,
            companyId: profile.companyId,
            isPublished: input.status === "live",
          });
          
          return { id: infrastructureId, success: true };
        }),

      update: protectedProcedure
        .input(
          z.object({
            id: z.number(),
            name: z.string().optional(),
            category: z.enum(["level_1", "level_2", "dc_fast", "depot_charger", "portable", "accessories"]).optional(),
            manufacturer: z.string().optional(),
            model: z.string().optional(),
            description: z.string().optional(),
            msrp: z.number().optional(),
            salePrice: z.number().optional(),
            installationCost: z.number().optional(),
            inputVoltage: z.string().optional(),
            outputPower: z.number().optional(),
            outputCurrent: z.number().optional(),
            efficiency: z.number().optional(),
            connectorTypes: z.string().optional(),
            numberOfPorts: z.number().optional(),
            simultaneousCharging: z.boolean().optional(),
            cableLength: z.number().optional(),
            cableType: z.string().optional(),
            installationType: z.enum(["wall_mount", "pedestal", "overhead", "portable"]).optional(),
            installationRequirements: z.string().optional(),
            electricalRequirements: z.string().optional(),
            dimensions: z.string().optional(),
            networkConnected: z.boolean().optional(),
            paymentCapable: z.boolean().optional(),
            loadManagement: z.boolean().optional(),
            weatherRating: z.string().optional(),
            certifications: z.string().optional(),
            warrantyYears: z.number().optional(),
            warrantyDetails: z.string().optional(),
            leadTimeDays: z.number().optional(),
            stockStatus: z.enum(["in_stock", "backorder", "made_to_order", "discontinued"]).optional(),
            locationAddress: z.string().optional(),
            locationCity: z.string().optional(),
            locationState: z.string().optional(),
            locationZipCode: z.string().optional(),
            latitude: z.string().optional(),
            longitude: z.string().optional(),
            isPublicAccess: z.boolean().optional(),
            featuredImage: z.string().optional(),
            status: z.enum(["live", "draft", "archived"]).optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "dealer" && ctx.user.role !== "admin") {
            throw new Error("Unauthorized");
          }
          
          const { id, ...updateData } = input;
          
          // Verify infrastructure belongs to dealer's company
          const infrastructure = await db.getChargingInfrastructureById(id);
          const profile = await db.getUserById(ctx.user.id);
          
          if (!infrastructure || !profile?.companyId || infrastructure.companyId !== profile.companyId) {
            throw new Error("Unauthorized or infrastructure not found");
          }
          
          await db.updateInfrastructure(id, {
            ...updateData,
            isPublished: updateData.status === "live" ? true : infrastructure.isPublished,
          });
          
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user.role !== "dealer" && ctx.user.role !== "admin") {
            throw new Error("Unauthorized");
          }
          
          // Verify infrastructure belongs to dealer's company
          const infrastructure = await db.getChargingInfrastructureById(input.id);
          const profile = await db.getUserById(ctx.user.id);
          
          if (!infrastructure || !profile?.companyId || infrastructure.companyId !== profile.companyId) {
            throw new Error("Unauthorized or infrastructure not found");
          }
          
          await db.deleteInfrastructure(input.id);
          return { success: true };
        }),
    }),

    // Vehicle listings
    listings: router({
      /**
       * Get dealer's own listings
       */
      list: protectedProcedure
        .input(
          z.object({
            status: z.enum(["draft", "available", "pending", "sold", "archived"]).optional(),
            limit: z.number().default(50),
            offset: z.number().default(0),
          }).optional()
        )
        .query(async ({ ctx, input }) => {
          const { getSupabaseClient } = await import("./_core/supabase");
          const { querySchemaTable } = await import("./lib/supabase-db");
          const supabase = getSupabaseClient();

          // Get dealer ID from context
          let dealerId: number | null = null;
          
          if (ctx.supabaseUser) {
            // Get dealer ID from Supabase user
            const { data, error } = await supabase.rpc('get_user_dealer_id');
            if (!error && data) {
              dealerId = data;
            }
          } else if (ctx.user) {
            // Get dealer ID from OAuth user
            const profile = await db.getUserById(ctx.user.id);
            if (profile?.companyId) {
              const dealers = await querySchemaTable<{ id: number }>(
                "02a. Dealership",
                "dealers",
                {
                  where: { organization_id: profile.companyId },
                  limit: 1,
                }
              );
              if (dealers.length > 0) {
                dealerId = dealers[0].id;
              }
            }
          }

          if (!dealerId) {
            throw new Error("Dealer record not found");
          }

          // Query listings for this dealer
          const whereClause: Record<string, any> = { dealer_id: dealerId };
          if (input?.status) {
            whereClause.status = input.status;
          }

          const listings = await querySchemaTable<VehicleListing>(
            "02a. Dealership",
            "vehicle_listings",
            {
              where: whereClause,
              orderBy: { column: "created_at", ascending: false },
              limit: input?.limit || 50,
              offset: input?.offset || 0,
            }
          );

          // Enrich with vehicle and configuration data
          const enrichedListings = await Promise.all(
            listings.map(async (listing) => {
              // Get complete configuration
              const configs = await querySchemaTable<CompleteConfiguration>(
                "05. Completed Unit Configuration",
                "complete_configurations",
                {
                  where: { id: listing.complete_configuration_id },
                  limit: 1,
                }
              );

              if (configs.length === 0) {
                return { ...listing, vehicle: null, config: null };
              }

              const config = configs[0];

              // Get vehicle config
              const vehicleConfigs = await querySchemaTable<VehicleConfig>(
                "03. Vehicle Data",
                "vehicle_config",
                {
                  where: { id: config.vehicle_config_id },
                  limit: 1,
                }
              );

              if (vehicleConfigs.length === 0) {
                return { ...listing, vehicle: null, config };
              }

              const vehicleConfig = vehicleConfigs[0];

              // Get vehicle
              const vehicles = await querySchemaTable<Vehicle>(
                "03. Vehicle Data",
                "vehicle",
                {
                  where: { id: vehicleConfig.vehicle_id },
                  limit: 1,
                }
              );

              const vehicle = vehicles.length > 0 ? vehicles[0] : null;

              // Get images
              const images = await querySchemaTable<ListingImage>(
                "02a. Dealership",
                "listing_images",
                {
                  where: { listing_id: listing.id },
                  orderBy: { column: "sort_order", ascending: true },
                }
              );

              return {
                ...listing,
                vehicle,
                vehicleConfig,
                config,
                images: images.map(img => ({
                  id: img.id,
                  url: img.image_url,
                  sortOrder: img.sort_order,
                  isPrimary: img.is_primary,
                })),
              };
            })
          );

          return enrichedListings;
        }),

      /**
       * Get single listing by ID (dealer must own it)
       */
      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
          const { getSupabaseClient } = await import("./_core/supabase");
          const { querySchemaTable } = await import("./lib/supabase-db");
          const supabase = getSupabaseClient();

          // Get dealer ID from context
          let dealerId: number | null = null;
          
          if (ctx.supabaseUser) {
            const { data, error } = await supabase.rpc('get_user_dealer_id');
            if (!error && data) {
              dealerId = data;
            }
          } else if (ctx.user) {
            const profile = await db.getUserById(ctx.user.id);
            if (profile?.companyId) {
              const dealers = await querySchemaTable<{ id: number }>(
                "02a. Dealership",
                "dealers",
                {
                  where: { organization_id: profile.companyId },
                  limit: 1,
                }
              );
              if (dealers.length > 0) {
                dealerId = dealers[0].id;
              }
            }
          }

          if (!dealerId) {
            throw new Error("Dealer record not found");
          }

          // Get listing
          const listings = await querySchemaTable<VehicleListing>(
            "02a. Dealership",
            "vehicle_listings",
            {
              where: { id: input.id, dealer_id: dealerId },
              limit: 1,
            }
          );

          if (listings.length === 0) {
            throw new Error("Listing not found or unauthorized");
          }

          const listing = listings[0];

          // Get complete configuration
          const configs = await querySchemaTable<CompleteConfiguration>(
            "05. Completed Unit Configuration",
            "complete_configurations",
            {
              where: { id: listing.complete_configuration_id },
              limit: 1,
            }
          );

          if (configs.length === 0) {
            throw new Error("Configuration not found");
          }

          const config = configs[0];

          // Get vehicle config
          const vehicleConfigs = await querySchemaTable<VehicleConfig>(
            "03. Vehicle Data",
            "vehicle_config",
            {
              where: { id: config.vehicle_config_id },
              limit: 1,
            }
          );

          if (vehicleConfigs.length === 0) {
            throw new Error("Vehicle config not found");
          }

          const vehicleConfig = vehicleConfigs[0];

          // Get vehicle
          const vehicles = await querySchemaTable<Vehicle>(
            "03. Vehicle Data",
            "vehicle",
            {
              where: { id: vehicleConfig.vehicle_id },
              limit: 1,
            }
          );

          if (vehicles.length === 0) {
            throw new Error("Vehicle not found");
          }

          const vehicle = vehicles[0];

          // Get equipment config if exists
          let equipmentConfig = null;
          if (config.equipment_config_id) {
            const equipmentConfigs = await querySchemaTable<EquipmentConfig>(
              "04. Equipment Data",
              "equipment_config",
              {
                where: { id: config.equipment_config_id },
                limit: 1,
              }
            );
            equipmentConfig = equipmentConfigs.length > 0 ? equipmentConfigs[0] : null;
          }

          // Get images
          const images = await querySchemaTable<ListingImage>(
            "02a. Dealership",
            "listing_images",
            {
              where: { listing_id: listing.id },
              orderBy: { column: "sort_order", ascending: true },
            }
          );

          return {
            ...listing,
            vehicle,
            vehicleConfig,
            equipmentConfig,
            config,
            images: images.map(img => ({
              id: img.id,
              url: img.image_url,
              sortOrder: img.sort_order,
              isPrimary: img.is_primary,
            })),
          };
        }),

      create: protectedProcedure
        .input(
          z.object({
            listingType: z.enum(["stock_unit", "build_to_order"]),
            vin: z.string().length(17).regex(/^[A-HJ-NPR-Z0-9]{17}$/),
            year: z.number().int().min(2000).max(new Date().getFullYear() + 1),
            make: z.string().min(1),
            model: z.string().min(1),
            series: z.string().optional(),
            bodyStyle: z.string().optional(),
            fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid", "cng", "propane"]),
            wheelbase: z.number().positive().optional(),
            gvwr: z.number().positive().optional(),
            payload: z.number().positive().optional(),
            engineDescription: z.string().optional(),
            transmission: z.string().optional(),
            driveType: z.enum(["RWD", "AWD", "4WD", "FWD"]).optional(),
            hasEquipment: z.boolean(),
            equipmentManufacturer: z.string().optional(),
            equipmentProductLine: z.string().optional(),
            equipmentType: z.string().optional(),
            equipmentLength: z.number().positive().optional(),
            equipmentWeight: z.number().positive().optional(),
            askingPrice: z.number().positive(),
            specialPrice: z.number().positive().optional(),
            stockNumber: z.string().optional(),
            condition: z.enum(["new", "used", "certified_pre_owned", "demo"]),
            mileage: z.number().nonnegative().optional(),
            exteriorColor: z.string().optional(),
            interiorColor: z.string().optional(),
            description: z.string().optional(),
            locationCity: z.string().optional(),
            locationState: z.string().optional(),
            photos: z.array(z.string().url()).optional(),
          })
          .refine(
            (data) => {
              if (data.condition === "used" || data.condition === "certified_pre_owned") {
                return data.mileage !== undefined && data.mileage !== null;
              }
              return true;
            },
            { message: "Mileage is required for used vehicles", path: ["mileage"] }
          )
          .refine(
            (data) => {
              if (data.hasEquipment) {
                return data.equipmentManufacturer && data.equipmentManufacturer.length > 0;
              }
              return true;
            },
            { message: "Equipment manufacturer is required when equipment is installed", path: ["equipmentManufacturer"] }
          )
        )
        .mutation(async ({ ctx, input }) => {
          // Check if user is dealer or admin (support both OAuth and Supabase auth)
          const isDealer = ctx.user?.role === "dealer" || ctx.user?.role === "admin";
          const isSupabaseUser = !!ctx.supabaseUser;
          
          if (!isDealer && !isSupabaseUser) {
            throw new Error("Unauthorized: Dealer access required");
          }

          const { createListingFromDealerInput } = await import("./lib/database/smart-routing");
          const { getSupabaseClient } = await import("./_core/supabase");
          const { querySchemaTable } = await import("./lib/supabase-db");

          const supabase = getSupabaseClient();
          
          // Get dealer ID from context
          let dealerId: number | null = null;
          
          if (ctx.supabaseUser) {
            // Get dealer ID from Supabase user
            const { data, error } = await supabase.rpc('get_user_dealer_id');
            if (!error && data) {
              dealerId = data;
            }
          } else if (ctx.user) {
            // Get dealer ID from OAuth user
            const profile = await db.getUserById(ctx.user.id);
            if (profile?.companyId) {
              const dealers = await querySchemaTable<{ id: number }>(
                "02a. Dealership",
                "dealers",
                {
                  where: { organization_id: profile.companyId },
                  limit: 1,
                }
              );
              if (dealers.length > 0) {
                dealerId = dealers[0].id;
              }
            }
          }

          if (!dealerId) {
            throw new Error("Dealer record not found for this user");
          }

          // Check if VIN was decoded (get enriched data from cache)
          let enrichedData: any = null;
          if (input.vin) {
            const { apiCache, CACHE_KEYS } = await import("./lib/utils/api-cache");
            const cacheKey = CACHE_KEYS.nhtsa(input.vin);
            enrichedData = apiCache.get(cacheKey);
          }

          // Pass enriched data through the entire creation flow
          const result = await createListingFromDealerInput(supabase, dealerId, input, enrichedData);

          if (!result.success) {
            // Provide more user-friendly error messages
            const errorMessages = result.errors || [];
            let userMessage = "Failed to create listing";
            
            if (errorMessages.length > 0) {
              // Map technical errors to user-friendly messages
              const friendlyMessages = errorMessages.map(err => {
                if (err.includes("Dealer record not found")) {
                  return "Your dealer account is not set up. Please contact support.";
                }
                if (err.includes("organization")) {
                  return "Organization setup issue. Please contact support.";
                }
                if (err.includes("permission")) {
                  return "You don't have permission to create listings. Please contact your organization administrator.";
                }
                if (err.includes("VIN") || err.includes("vin")) {
                  return "There was an issue processing the VIN. Please verify the VIN is correct.";
                }
                if (err.includes("vehicle") || err.includes("Vehicle")) {
                  return "There was an issue creating the vehicle record. Please try again.";
                }
                if (err.includes("equipment") || err.includes("Equipment")) {
                  return "There was an issue processing the equipment information. Please check your equipment details.";
                }
                if (err.includes("compatibility") || err.includes("Compatibility")) {
                  return "The vehicle and equipment combination may not be compatible. Please review your specifications.";
                }
                return err;
              });
              
              userMessage = friendlyMessages.join(". ");
            }
            
            throw new Error(userMessage);
          }

          return result;
        }),

      /**
       * Update existing listing
       */
      update: protectedProcedure
        .input(
          z.object({
            id: z.number(),
            askingPrice: z.number().positive().optional(),
            specialPrice: z.number().positive().optional(),
            stockNumber: z.string().optional(),
            condition: z.enum(["new", "used", "certified_pre_owned", "demo"]).optional(),
            mileage: z.number().nonnegative().optional(),
            exteriorColor: z.string().optional(),
            interiorColor: z.string().optional(),
            description: z.string().optional(),
            locationCity: z.string().optional(),
            locationState: z.string().optional(),
            status: z.enum(["draft", "available", "pending", "sold", "archived"]).optional(),
            photos: z.array(z.string().url()).optional(),
          })
          .refine(
            (data) => {
              // Special price must be less than asking price if both are provided
              if (data.specialPrice && data.askingPrice) {
                return data.specialPrice < data.askingPrice;
              }
              return true;
            },
            {
              message: "Special price must be less than asking price",
              path: ["specialPrice"],
            }
          )
          // Note: Mileage validation for used vehicles is handled in the mutation
          // since we need to check the existing listing's condition
        )
        .mutation(async ({ ctx, input }) => {
          const { getSupabaseClient } = await import("./_core/supabase");
          const { querySchemaTable, updateSchemaTable, deleteSchemaTable } = await import("./lib/supabase-db");
          const supabase = getSupabaseClient();

          // Get dealer ID from context
          let dealerId: number | null = null;
          
          if (ctx.supabaseUser) {
            const { data, error } = await supabase.rpc('get_user_dealer_id');
            if (!error && data) {
              dealerId = data;
            }
          } else if (ctx.user) {
            const profile = await db.getUserById(ctx.user.id);
            if (profile?.companyId) {
              const dealers = await querySchemaTable<{ id: number }>(
                "02a. Dealership",
                "dealers",
                {
                  where: { organization_id: profile.companyId },
                  limit: 1,
                }
              );
              if (dealers.length > 0) {
                dealerId = dealers[0].id;
              }
            }
          }

          if (!dealerId) {
            throw new Error("Dealer record not found");
          }

          // Verify listing belongs to dealer
          const listings = await querySchemaTable<VehicleListing>(
            "02a. Dealership",
            "vehicle_listings",
            {
              where: { id: input.id, dealer_id: dealerId },
              limit: 1,
            }
          );

          if (listings.length === 0) {
            throw new Error("Listing not found or unauthorized");
          }

          const existingListing = listings[0];

          // Validate mileage if condition is being changed to used
          if (input.condition && 
              (input.condition === "used" || input.condition === "certified_pre_owned") &&
              input.mileage === undefined && 
              existingListing.condition !== "used") {
            throw new Error("Mileage is required when setting condition to used or certified pre-owned");
          }

          // Validate special price is less than asking price
          const askingPrice = input.askingPrice ?? existingListing.asking_price;
          if (input.specialPrice && askingPrice && input.specialPrice >= askingPrice) {
            throw new Error("Special price must be less than asking price");
          }

          // Prepare update data
          const updateData: Record<string, any> = {};
          if (input.askingPrice !== undefined) updateData.asking_price = input.askingPrice;
          if (input.specialPrice !== undefined) updateData.special_price = input.specialPrice;
          if (input.stockNumber !== undefined) updateData.stock_number = input.stockNumber;
          if (input.condition !== undefined) {
            updateData.condition = input.condition === "certified_pre_owned" ? "used" : input.condition;
          }
          if (input.mileage !== undefined) updateData.mileage = input.mileage;
          if (input.exteriorColor !== undefined) updateData.exterior_color = input.exteriorColor;
          if (input.interiorColor !== undefined) updateData.interior_color = input.interiorColor;
          if (input.description !== undefined) updateData.description = input.description;
          if (input.locationCity !== undefined) updateData.location_city = input.locationCity;
          if (input.locationState !== undefined) updateData.location_state = input.locationState;
          if (input.status !== undefined) updateData.status = input.status;

          // Update listing
          await updateSchemaTable(
            "02a. Dealership",
            "vehicle_listings",
            updateData,
            { id: input.id }
          );

          // Update images if provided
          if (input.photos !== undefined) {
            const { insertSchemaTable } = await import("./lib/supabase-db");
            
            // Delete existing images
            await deleteSchemaTable(
              "02a. Dealership",
              "listing_images",
              { listing_id: input.id }
            );

            // Insert new images
            for (let i = 0; i < input.photos.length; i++) {
              await insertSchemaTable(
                "02a. Dealership",
                "listing_images",
                {
                  listing_id: input.id,
                  image_url: input.photos[i],
                  sort_order: i,
                  is_primary: i === 0,
                }
              );
            }
          }

          return { success: true };
        }),

      /**
       * Delete (soft delete) listing
       */
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const { getSupabaseClient } = await import("./_core/supabase");
          const { querySchemaTable, updateSchemaTable } = await import("./lib/supabase-db");
          const supabase = getSupabaseClient();

          // Get dealer ID from context
          let dealerId: number | null = null;
          
          if (ctx.supabaseUser) {
            const { data, error } = await supabase.rpc('get_user_dealer_id');
            if (!error && data) {
              dealerId = data;
            }
          } else if (ctx.user) {
            const profile = await db.getUserById(ctx.user.id);
            if (profile?.companyId) {
              const dealers = await querySchemaTable<{ id: number }>(
                "02a. Dealership",
                "dealers",
                {
                  where: { organization_id: profile.companyId },
                  limit: 1,
                }
              );
              if (dealers.length > 0) {
                dealerId = dealers[0].id;
              }
            }
          }

          if (!dealerId) {
            throw new Error("Dealer record not found");
          }

          // Verify listing belongs to dealer
          const listings = await querySchemaTable<VehicleListing>(
            "02a. Dealership",
            "vehicle_listings",
            {
              where: { id: input.id, dealer_id: dealerId },
              limit: 1,
            }
          );

          if (listings.length === 0) {
            throw new Error("Listing not found or unauthorized");
          }

          // Soft delete by setting status to archived
          await updateSchemaTable(
            "02a. Dealership",
            "vehicle_listings",
            { status: "archived" },
            { id: input.id }
          );

          return { success: true };
        }),
    }),
  }),

  // VIN decoding
  vin: router({
    decode: publicProcedure
      .input(z.object({ vin: z.string().length(17).regex(/^[A-HJ-NPR-Z0-9]{17}$/) }))
      .mutation(async ({ input }) => {
        const { enrichVehicleData } = await import("./lib/services/vehicle-data-enrichment");
        const { apiCache, CACHE_KEYS } = await import("./lib/utils/api-cache");
        
        const { vin } = input;
        
        console.log(`[VIN Decode] Starting decode for VIN: ${vin}`);
        
        // Check cache first
        const cacheKey = CACHE_KEYS.nhtsa(vin);
        const cached = apiCache.get(cacheKey);
        if (cached) {
          console.log('✓ Using cached VIN data');
          return {
            success: true,
            data: cached,
            message: `Data loaded from cache (sources: ${cached.dataSources.join(', ')})`,
          };
        }
        
        try {
          // Get enriched data from both NHTSA + EPA
          console.log(`[VIN Decode] Fetching data from NHTSA/EPA for VIN: ${vin}`);
          const enrichedData = await enrichVehicleData(vin);
          
          // Validate that we got at least basic data
          if (!enrichedData || !enrichedData.year || !enrichedData.make || !enrichedData.model) {
            throw new Error('Incomplete data returned from VIN decoder. Missing required fields (year, make, model).');
          }
          
          console.log(`[VIN Decode] Successfully decoded VIN: ${vin} - ${enrichedData.year} ${enrichedData.make} ${enrichedData.model}`);
          
          // Cache the result (60 day TTL - VIN data doesn't change)
          apiCache.set(cacheKey, enrichedData, 60 * 24 * 60); // 60 days
          
          return {
            success: true,
            data: enrichedData,
            message: `Data loaded from: ${enrichedData.dataSources.join(', ')}`,
          };
          
        } catch (error: any) {
          console.error('[VIN Decode] Error:', error);
          console.error('[VIN Decode] Error stack:', error.stack);
          console.error('[VIN Decode] Error details:', {
            message: error.message,
            name: error.name,
            vin: vin,
          });
          
          // Provide more helpful error messages
          let errorMessage = 'Failed to decode VIN';
          if (error.message) {
            errorMessage = error.message;
          } else if (error.response) {
            errorMessage = `API error: ${error.response.status} ${error.response.statusText}`;
          } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            errorMessage = 'Unable to connect to VIN decoder service. Please check your internet connection.';
          }
          
          return {
            success: false,
            error: errorMessage,
            data: null,
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
