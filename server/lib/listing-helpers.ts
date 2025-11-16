/**
 * Listing Helper Functions
 * Creates dealer listings from dealer input using the full workflow:
 * 1. Find or create vehicle (Schema 03)
 * 2. Find or create equipment (Schema 04)
 * 3. Ensure compatibility (Schema 05)
 * 4. Create complete configuration (Schema 05)
 * 5. Create dealer listing (Schema 02a)
 */

import {
  findOrCreateVehicle,
  findOrCreateEquipment,
  createCompleteConfiguration,
  type VehicleSpecs,
  type EquipmentSpecs,
} from "./catalog-helpers";
import {
  insertSchemaTable,
  querySchemaTable,
} from "./supabase-db";
import type {
  VehicleListing,
  Dealer,
  CompleteConfiguration,
} from "./supabase-types";

export interface DealerListingInput {
  // Vehicle information
  vin?: string;
  year: number;
  make: string;
  model: string;
  series?: string;
  bodyStyle?: string;
  cabType?: string;
  wheelbaseInches?: number;
  gvwr?: number;
  payloadCapacity?: number;
  engine?: string;
  transmission?: string;
  driveType?: string;
  fuelType?: string;
  mpg?: string;
  mpge?: string;

  // Equipment information
  equipmentManufacturer: string;
  productLine?: string;
  equipmentType: string;
  lengthInches?: number;
  heightInches?: number;
  widthInches?: number;
  weightLbs?: number;
  material?: string;
  doorConfiguration?: string;
  compartmentCount?: number;

  // Pricing and listing details
  askingPrice: number;
  condition: "new" | "used";
  mileage?: number;
  stockNumber?: string;
  locationCity?: string;
  locationState?: string;
  description?: string;
  status?: "draft" | "available" | "pending" | "sold" | "archived";
}

export interface CreateListingResult {
  listingId: number;
  vehicleConfigId: number;
  equipmentConfigId: number;
  completeConfigurationId: number;
  vehicleCreated: boolean;
  equipmentCreated: boolean;
}

/**
 * Create a complete dealer listing from dealer input
 * Implements the full workflow to populate both catalog and marketplace
 */
export async function createListingFromDealerInput(
  input: DealerListingInput,
  dealerId: number
): Promise<CreateListingResult> {
  // Step 1: Find or create vehicle in Schema 03
  const vehicleSpecs: VehicleSpecs = {
    year: input.year,
    make_name: input.make,
    model_name: input.model,
    series: input.series,
    body_style: input.bodyStyle,
    cab_type: input.cabType,
    wheelbase_inches: input.wheelbaseInches,
    gvwr: input.gvwr,
    payload_capacity: input.payloadCapacity,
    engine: input.engine,
    transmission: input.transmission,
    drive_type: input.driveType,
    fuel_type: input.fuelType,
    mpg: input.mpg,
    mpge: input.mpge,
  };

  const vehicleResult = await findOrCreateVehicle(vehicleSpecs, dealerId);

  // Step 2: Find or create equipment in Schema 04
  const equipmentSpecs: EquipmentSpecs = {
    manufacturer: input.equipmentManufacturer,
    product_line: input.productLine,
    equipment_type: input.equipmentType,
    length_inches: input.lengthInches,
    height_inches: input.heightInches,
    width_inches: input.widthInches,
    weight_lbs: input.weightLbs,
    material: input.material,
    door_configuration: input.doorConfiguration,
    compartment_count: input.compartmentCount,
  };

  const equipmentResult = await findOrCreateEquipment(equipmentSpecs, dealerId);

  // Step 3: Create complete configuration in Schema 05
  // (This also ensures compatibility)
  const completeConfig = await createCompleteConfiguration({
    vehicleConfigId: vehicleResult.vehicleConfigId,
    equipmentConfigId: equipmentResult.equipmentConfigId,
    vin: input.vin,
    configurationType: "stock_unit",
    askingPrice: input.askingPrice,
    dealerId: dealerId,
  });

  // Step 4: Create dealer listing in Schema 02a
  const listing = await insertSchemaTable<VehicleListing>(
    "02a. Dealership",
    "vehicle_listings",
    {
      dealer_id: dealerId,
      complete_configuration_id: completeConfig.id,
      asking_price: input.askingPrice,
      condition: input.condition,
      mileage: input.mileage || null,
      stock_number: input.stockNumber || null,
      location_city: input.locationCity || null,
      location_state: input.locationState || null,
      description: input.description || null,
      status: input.status || "draft",
      view_count: 0,
    }
  );

  return {
    listingId: listing.id,
    vehicleConfigId: vehicleResult.vehicleConfigId,
    equipmentConfigId: equipmentResult.equipmentConfigId,
    completeConfigurationId: completeConfig.id,
    vehicleCreated: vehicleResult.created,
    equipmentCreated: equipmentResult.created,
  };
}

/**
 * Get dealer ID from organization ID
 */
export async function getDealerIdFromOrganizationId(
  organizationId: number
): Promise<number | null> {
  const dealers = await querySchemaTable<Dealer>(
    "02a. Dealership",
    "dealers",
    {
      where: { organization_id: organizationId },
      limit: 1,
    }
  );

  return dealers.length > 0 ? dealers[0].id : null;
}

