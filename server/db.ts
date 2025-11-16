/**
 * Database Layer - Supabase Integration
 * Replaces Drizzle ORM with Supabase queries
 * Maps to Supabase schemas: 01. Organization, 02a. Dealership, 03. Vehicle Data, etc.
 */

import {
  querySchemaTable,
  insertSchemaTable,
  updateSchemaTable,
  deleteSchemaTable,
  querySupabaseTable,
  insertSupabaseTable,
  updateSupabaseTable,
} from "./lib/supabase-db";
import type {
  Organization,
  OrganizationUser,
  VehicleListing,
  ListingImage,
  Vehicle,
  VehicleConfig,
  Equipment,
  EquipmentConfig,
  CompleteConfiguration,
} from "./lib/supabase-types";
import { getSupabaseClient } from "./_core/supabase";
import { ENV } from "./_core/env";

// ============ User Management ============
// Users are managed via Supabase Auth + organization_users table

export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: string;
  lastSignedIn: Date | null;
  companyId?: number;
}

export interface InsertUser {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: string;
  lastSignedIn?: Date;
}

/**
 * Upsert user - creates/updates user in Supabase Auth
 * Also creates/updates organization_user record
 */
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  try {
    const supabase = getSupabaseClient();

    // Check if user exists in Supabase Auth
    // Note: This assumes users are created via Supabase Auth
    // We'll store additional metadata in organization_users

    // For now, we'll create a minimal user record
    // In production, you'd sync with Supabase Auth users table
    const updateData: Record<string, any> = {
      last_signed_in: user.lastSignedIn || new Date(),
    };

    if (user.name !== undefined) updateData.name = user.name;
    if (user.email !== undefined) updateData.email = user.email;
    if (user.loginMethod !== undefined) updateData.login_method = user.loginMethod;
    if (user.role !== undefined) updateData.role = user.role;

    // Try to update organization_user if it exists
    const existingOrgUsers = await querySchemaTable<OrganizationUser>(
      "01. Organization",
      "organization_users",
      {
        where: { user_id: user.openId },
        limit: 1,
      }
    );

    if (existingOrgUsers.length > 0) {
      await updateSchemaTable(
        "01. Organization",
        "organization_users",
        updateData,
        { user_id: user.openId }
      );
    } else {
      // Create new organization_user record
      // Note: This requires an organization_id - you may need to handle this differently
      // For now, we'll skip creating if no org exists
      console.warn(`[DB] Cannot create organization_user for ${user.openId} - no organization_id provided`);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

/**
 * Get user by Supabase Auth user ID (openId)
 */
export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  try {
    // Check if database is available
    if (!ENV.databaseUrl) {
      console.warn("[Database] DATABASE_URL not configured");
      return undefined;
    }

    const orgUsers = await querySchemaTable<OrganizationUser>(
      "01. Organization",
      "organization_users",
      {
        where: { user_id: openId },
        limit: 1,
      }
    );

    if (orgUsers.length === 0) {
      return undefined;
    }

    const orgUser = orgUsers[0];

    // Get organization to get companyId
    const orgs = await querySchemaTable<Organization>(
      "01. Organization",
      "organizations",
      {
        where: { id: orgUser.organization_id },
        limit: 1,
      }
    );

    // Map to User type
    return {
      id: orgUser.id,
      openId: orgUser.user_id,
      name: null, // Would need to get from Supabase Auth
      email: null, // Would need to get from Supabase Auth
      loginMethod: null,
      role: orgUser.role,
      lastSignedIn: orgUser.updated_at,
      companyId: orgs.length > 0 ? orgs[0].id : undefined,
    };
  } catch (error) {
    // Log error but don't crash - return undefined to allow app to continue
    console.error("[Database] Failed to get user by openId:", error);
    return undefined;
  }
}

/**
 * Get user by ID (organization_user id)
 */
export async function getUserById(id: number): Promise<User | undefined> {
  try {
    const orgUsers = await querySchemaTable<OrganizationUser>(
      "01. Organization",
      "organization_users",
      {
        where: { id },
        limit: 1,
      }
    );

    if (orgUsers.length === 0) {
      return undefined;
    }

    const orgUser = orgUsers[0];
    const orgs = await querySchemaTable<Organization>(
      "01. Organization",
      "organizations",
      {
        where: { id: orgUser.organization_id },
        limit: 1,
      }
    );

    return {
      id: orgUser.id,
      openId: orgUser.user_id,
      name: null,
      email: null,
      loginMethod: null,
      role: orgUser.role,
      lastSignedIn: orgUser.updated_at,
      companyId: orgs.length > 0 ? orgs[0].id : undefined,
    };
  } catch (error) {
    console.error("[Database] Failed to get user by id:", error);
    return undefined;
  }
}

export async function updateUserProfile(userId: number, data: Partial<InsertUser>): Promise<void> {
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.loginMethod !== undefined) updateData.login_method = data.loginMethod;
  if (data.role !== undefined) updateData.role = data.role;

  await updateSchemaTable(
    "01. Organization",
    "organization_users",
    { ...updateData, updated_at: new Date() },
    { id: userId }
  );
}

// ============ Newsletter Management ============
// Note: Newsletter subscriptions may need to be in a different table
// For now, keeping placeholder functions

export interface InsertNewsletterSubscription {
  email: string;
  firstName?: string;
  lastName?: string;
}

export async function subscribeNewsletter(data: InsertNewsletterSubscription): Promise<void> {
  // TODO: Implement newsletter subscription in appropriate table
  console.warn("[DB] Newsletter subscription not yet implemented in Supabase schema");
}

export async function unsubscribeNewsletter(email: string): Promise<void> {
  // TODO: Implement newsletter unsubscription
  console.warn("[DB] Newsletter unsubscription not yet implemented in Supabase schema");
}

// ============ Vehicle Management (Schema 03: Vehicle Data) ============

export async function getVehicles(filters?: {
  fuelType?: string[];
  make?: string[];
  bodyType?: string[];
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    // Query vehicle listings from Schema 02a which reference complete_configurations
    // Then join to get vehicle data from Schema 03
    const whereClause: Record<string, any> = {};

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    const listings = await querySchemaTable<VehicleListing>(
      "02a. Dealership",
      "vehicle_listings",
      {
        where: whereClause,
        orderBy: { column: "created_at", ascending: false },
        limit: filters?.limit || 20,
        offset: filters?.offset || 0,
      }
    );

    // For each listing, get the complete_configuration and then vehicle data
    const results = [];
    for (const listing of listings) {
      const configs = await querySchemaTable<CompleteConfiguration>(
        "05. Completed Unit Configuration",
        "complete_configurations",
        {
          where: { id: listing.complete_configuration_id },
          limit: 1,
        }
      );

      if (configs.length > 0) {
        const config = configs[0];
        const vehicleConfigs = await querySchemaTable<VehicleConfig>(
          "03. Vehicle Data",
          "vehicle_config",
          {
            where: { id: config.vehicle_config_id },
            limit: 1,
          }
        );

        if (vehicleConfigs.length > 0) {
          const vehicleConfig = vehicleConfigs[0];
          const vehicles = await querySchemaTable<Vehicle>(
            "03. Vehicle Data",
            "vehicle",
            {
              where: { id: vehicleConfig.vehicle_id },
              limit: 1,
            }
          );

          if (vehicles.length > 0) {
            const vehicle = vehicles[0];
            // Apply filters
            if (filters?.fuelType && !filters.fuelType.includes(vehicleConfig.fuel_type || "")) {
              continue;
            }
            if (filters?.make && !filters.make.includes(vehicle.make_name)) {
              continue;
            }
            if (filters?.minYear && vehicle.year < filters.minYear) {
              continue;
            }
            if (filters?.maxYear && vehicle.year > filters.maxYear) {
              continue;
            }
            if (filters?.minPrice && listing.asking_price < filters.minPrice) {
              continue;
            }
            if (filters?.maxPrice && listing.asking_price > filters.maxPrice) {
              continue;
            }

            // Map to expected format
            results.push({
              id: listing.id,
              year: vehicle.year,
              make: vehicle.make_name,
              model: vehicle.model_name,
              fuelType: vehicleConfig.fuel_type,
              bodyType: vehicleConfig.body_style,
              salePrice: listing.asking_price,
              status: listing.status,
              viewCount: listing.view_count,
              createdAt: listing.created_at,
              // ... other fields
            });
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error("[Database] Failed to get vehicles:", error);
    return [];
  }
}

export async function getVehicleById(id: number) {
  // This should get a vehicle listing, not a catalog vehicle
  // For catalog vehicles, use Schema 03 directly
  try {
    const listings = await querySchemaTable<VehicleListing>(
      "02a. Dealership",
      "vehicle_listings",
      {
        where: { id },
        limit: 1,
      }
    );

    if (listings.length === 0) {
      return undefined;
    }

    // Get full vehicle data through complete_configuration
    const listing = listings[0];
    const configs = await querySchemaTable<CompleteConfiguration>(
      "05. Completed Unit Configuration",
      "complete_configurations",
      {
        where: { id: listing.complete_configuration_id },
        limit: 1,
      }
    );

    if (configs.length === 0) {
      return undefined;
    }

    const config = configs[0];
    const vehicleConfigs = await querySchemaTable<VehicleConfig>(
      "03. Vehicle Data",
      "vehicle_config",
      {
        where: { id: config.vehicle_config_id },
        limit: 1,
      }
    );

    if (vehicleConfigs.length === 0) {
      return undefined;
    }

    const vehicleConfig = vehicleConfigs[0];
    const vehicles = await querySchemaTable<Vehicle>(
      "03. Vehicle Data",
      "vehicle",
      {
        where: { id: vehicleConfig.vehicle_id },
        limit: 1,
      }
    );

    if (vehicles.length === 0) {
      return undefined;
    }

    const vehicle = vehicles[0];

    // Map to expected format
    return {
      id: listing.id,
      vin: config.vin,
      year: vehicle.year,
      make: vehicle.make_name,
      model: vehicle.model_name,
      fuelType: vehicleConfig.fuel_type,
      bodyType: vehicleConfig.body_style,
      gvwr: vehicleConfig.gvwr,
      salePrice: listing.asking_price,
      condition: listing.condition,
      status: listing.status,
      description: listing.description,
      viewCount: listing.view_count,
      createdAt: listing.created_at,
      // ... map other fields
    };
  } catch (error) {
    console.error("[Database] Failed to get vehicle by id:", error);
    return undefined;
  }
}

export async function getVehicleImages(vehicleId: number) {
  try {
    const images = await querySchemaTable<ListingImage>(
      "02a. Dealership",
      "listing_images",
      {
        where: { listing_id: vehicleId },
        orderBy: { column: "sort_order", ascending: true },
      }
    );

    return images.map((img) => ({
      id: img.id,
      vehicleId: img.listing_id,
      url: img.image_url,
      sortOrder: img.sort_order,
      isPrimary: img.is_primary,
    }));
  } catch (error) {
    console.error("[Database] Failed to get vehicle images:", error);
    return [];
  }
}

export async function incrementVehicleViewCount(vehicleId: number): Promise<void> {
  try {
    const listings = await querySchemaTable<VehicleListing>(
      "02a. Dealership",
      "vehicle_listings",
      {
        where: { id: vehicleId },
        limit: 1,
      }
    );

    if (listings.length > 0) {
      const listing = listings[0];
      await updateSchemaTable(
        "02a. Dealership",
        "vehicle_listings",
        { view_count: listing.view_count + 1 },
        { id: vehicleId }
      );
    }
  } catch (error) {
    console.error("[Database] Failed to increment view count:", error);
  }
}

export async function getFeaturedVehicles(limit: number = 6) {
  // TODO: Add featured flag to vehicle_listings or use a separate table
  // For now, return recent listings
  return getVehicles({ limit, status: "available" });
}

// ============ Lead Management ============
// TODO: Implement leads in appropriate Supabase schema
export interface InsertLead {
  vehicleId?: number;
  companyId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  leadType?: string;
  leadSource?: string;
}

export async function createLead(data: InsertLead): Promise<void> {
  // TODO: Implement lead creation in Supabase schema
  console.warn("[DB] Lead creation not yet implemented in Supabase schema");
}

export async function getLeadsByCompany(companyId: number, limit?: number) {
  // TODO: Implement lead retrieval
  return [];
}

// ============ Blog Management ============
// TODO: Implement blog posts in Supabase schema
export async function getPublishedBlogPosts(limit?: number, offset?: number) {
  return [];
}

export async function getBlogPostBySlug(slug: string) {
  return undefined;
}

// ============ Expert Management ============
// TODO: Implement experts in Supabase schema
export async function getActiveExperts() {
  return [];
}

// ============ Company/Organization Management ============

export async function getCompanyById(id: number) {
  try {
    const orgs = await querySchemaTable<Organization>(
      "01. Organization",
      "organizations",
      {
        where: { id },
        limit: 1,
      }
    );

    if (orgs.length === 0) {
      return undefined;
    }

    const org = orgs[0];
    return {
      id: org.id,
      name: org.name,
      // Map other fields as needed
    };
  } catch (error) {
    console.error("[Database] Failed to get company by id:", error);
    return undefined;
  }
}

export async function getCompanyLocations(companyId: number) {
  // TODO: Implement locations in Supabase schema
  return [];
}

// ============ Saved Vehicles ============
// TODO: Implement saved vehicles in Supabase schema
export async function saveVehicle(userId: number, vehicleId: number, notes?: string): Promise<void> {
  console.warn("[DB] Save vehicle not yet implemented in Supabase schema");
}

export async function unsaveVehicle(userId: number, vehicleId: number): Promise<void> {
  console.warn("[DB] Unsave vehicle not yet implemented in Supabase schema");
}

export async function getSavedVehicles(userId: number) {
  return [];
}

// ============ Search Helpers ============

export async function searchVehicles(searchTerm: string, limit: number = 20) {
  // TODO: Implement full-text search across vehicle listings
  return [];
}

// ============ Stats and Analytics ============

export async function getVehicleStats() {
  // TODO: Implement stats aggregation
  return null;
}

export async function getVehiclesByFuelType() {
  // TODO: Implement fuel type aggregation
  return [];
}

// ============ Bodies & Equipment Management ============
// These map to Schema 04: Equipment Data

export async function getBodyEquipment(filters: {
  category?: string;
  manufacturer?: string;
  minPrice?: number;
  maxPrice?: number;
  stockStatus?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const whereClause: Record<string, any> = {};
    if (filters.manufacturer) {
      whereClause.manufacturer = filters.manufacturer;
    }

    const equipment = await querySchemaTable<Equipment>(
      "04. Equipment Data",
      "equipment",
      {
        where: whereClause,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
      }
    );

    return equipment.map((eq) => ({
      id: eq.id,
      manufacturer: eq.manufacturer,
      category: eq.equipment_type,
      // Map other fields
    }));
  } catch (error) {
    console.error("[Database] Failed to get body equipment:", error);
    return [];
  }
}

export async function getBodyEquipmentById(id: number) {
  try {
    const equipment = await querySchemaTable<Equipment>(
      "04. Equipment Data",
      "equipment",
      {
        where: { id },
        limit: 1,
      }
    );

    return equipment.length > 0 ? equipment[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get body equipment by id:", error);
    return null;
  }
}

export async function getBodyEquipmentImages(bodyEquipmentId: number) {
  // TODO: Implement equipment images
  return [];
}

export async function incrementBodyEquipmentViews(id: number): Promise<void> {
  // TODO: Add view_count to equipment table
  console.warn("[DB] Increment body equipment views not yet implemented");
}

export async function incrementBodyEquipmentInquiries(id: number): Promise<void> {
  // TODO: Add inquiry_count to equipment table
  console.warn("[DB] Increment body equipment inquiries not yet implemented");
}

// ============ Charging Infrastructure Management ============
// TODO: Map to appropriate Supabase schema

export async function getChargingInfrastructure(filters: {
  category?: string;
  manufacturer?: string;
  minPower?: number;
  maxPower?: number;
  connectorType?: string;
  city?: string;
  state?: string;
  stockStatus?: string;
  limit?: number;
  offset?: number;
}) {
  // TODO: Implement charging infrastructure queries
  return [];
}

export async function getChargingInfrastructureById(id: number) {
  return null;
}

export async function getChargingInfrastructureImages(chargingInfrastructureId: number) {
  return [];
}

export async function incrementChargingInfrastructureViews(id: number): Promise<void> {
  console.warn("[DB] Increment charging infrastructure views not yet implemented");
}

export async function incrementChargingInfrastructureInquiries(id: number): Promise<void> {
  console.warn("[DB] Increment charging infrastructure inquiries not yet implemented");
}


// ============ Dealer Bodies/Equipment Management ============

export interface InsertBodyEquipment {
  companyId: number;
  name: string;
  category: string;
  manufacturer?: string;
  // ... other fields
}

export async function getDealerBodiesEquipment(companyId: number, filters?: {
  category?: string;
  manufacturer?: string;
  stockStatus?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  // Query equipment created by this dealer
  const whereClause: Record<string, any> = { created_by_dealer_id: companyId };

  if (filters?.manufacturer) {
    whereClause.manufacturer = filters.manufacturer;
  }

  return await querySchemaTable<Equipment>(
    "04. Equipment Data",
    "equipment",
    {
      where: whereClause,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    }
  );
}

export async function createBodyEquipment(data: InsertBodyEquipment): Promise<number> {
  // Use catalog helpers
  throw new Error("Use catalog-helpers.ts findOrCreateEquipment instead");
}

export async function updateBodyEquipment(id: number, data: Partial<InsertBodyEquipment>): Promise<void> {
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer;

  await updateSchemaTable(
    "04. Equipment Data",
    "equipment",
    { ...updateData, updated_at: new Date() },
    { id }
  );
}

export async function deleteBodyEquipment(id: number): Promise<void> {
  // Delete equipment configs first
  const configs = await querySchemaTable<EquipmentConfig>(
    "04. Equipment Data",
    "equipment_config",
    {
      where: { equipment_id: id },
    }
  );

  for (const config of configs) {
    await deleteSchemaTable(
      "04. Equipment Data",
      "equipment_config",
      { id: config.id }
    );
  }

  // Delete equipment
  await deleteSchemaTable(
    "04. Equipment Data",
    "equipment",
    { id }
  );
}

// ============ Dealer Charging Infrastructure Management ============

export interface InsertChargingInfrastructure {
  companyId: number;
  name: string;
  category: string;
  // ... other fields
}

export async function getDealerInfrastructure(companyId: number, filters?: {
  category?: string;
  manufacturer?: string;
  stockStatus?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  // TODO: Map to appropriate Supabase schema
  return [];
}

export async function createInfrastructure(data: InsertChargingInfrastructure): Promise<number> {
  // TODO: Implement
  throw new Error("Charging infrastructure creation not yet implemented");
}

export async function updateInfrastructure(id: number, data: Partial<InsertChargingInfrastructure>): Promise<void> {
  // TODO: Implement
  throw new Error("Charging infrastructure update not yet implemented");
}

export async function deleteInfrastructure(id: number): Promise<void> {
  // TODO: Implement
  throw new Error("Charging infrastructure deletion not yet implemented");
}
