import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { userRouter } from "./routers/user";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  user: userRouter,
  
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
                if (val === '' || val === null || val === undefined) return undefined;
                return val;
              },
              z.string().url().optional()
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

          if (!data || data.length === 0) {
            throw new Error('No data returned from organization creation');
          }

          const result = data[0] as {
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

  // User profile management
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserById(ctx.user.id);
    }),
    
    update: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          phone: z.string().optional(),
          companyName: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional(),
          bio: z.string().optional(),
          avatar: z.string().optional(),
          emailNotifications: z.boolean().optional(),
          marketingEmails: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
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
          if (ctx.user.role !== "dealer" && ctx.user.role !== "admin") {
            throw new Error("Unauthorized");
          }

          const { createListingFromDealerInput } = await import("./lib/database/smart-routing");
          const { getSupabaseClient } = await import("./_core/supabase");
          const { querySchemaTable } = await import("./lib/supabase-db");

          const supabase = getSupabaseClient();
          
          // Get user's organization_id from Supabase auth
          // For now, we'll need to get dealer_id from organization
          // This assumes the user has an organization_id in their profile
          const profile = await db.getUserById(ctx.user.id);
          if (!profile?.companyId) {
            throw new Error("No company associated with user");
          }

          // Get dealer_id from organization_id
          // Assuming companyId maps to organization_id
          const dealers = await querySchemaTable<{ id: number }>(
            "02a. Dealership",
            "dealers",
            {
              where: {
                organization_id: profile.companyId,
              },
              limit: 1,
            }
          );

          if (dealers.length === 0) {
            throw new Error("Dealer record not found for this organization");
          }

          const dealerId = dealers[0].id;

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
            throw new Error(result.errors?.join(", ") || "Failed to create listing");
          }

          return result;
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
          const enrichedData = await enrichVehicleData(vin);
          
          // Cache the result (60 day TTL - VIN data doesn't change)
          apiCache.set(cacheKey, enrichedData, 60 * 24 * 60); // 60 days
          
          return {
            success: true,
            data: enrichedData,
            message: `Data loaded from: ${enrichedData.dataSources.join(', ')}`,
          };
          
        } catch (error: any) {
          console.error('VIN enrichment error:', error);
          return {
            success: false,
            error: error.message || 'Failed to decode VIN',
            data: null,
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
