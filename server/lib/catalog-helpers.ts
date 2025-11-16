/**
 * Catalog Helper Functions
 * Implements find-or-create pattern for vehicles and equipment
 * Populates catalog schemas (03 & 04) from dealer inputs
 */

import {
  querySchemaTable,
  insertSchemaTable,
  updateSchemaTable,
} from "./supabase-db";
import type {
  Vehicle,
  VehicleConfig,
  Equipment,
  EquipmentConfig,
  CompleteConfiguration,
  ChassisEquipmentCompatibility,
} from "./supabase-types";

// ============ Vehicle Find-or-Create ============

export interface VehicleSpecs {
  year: number;
  make_name: string;
  model_name: string;
  series?: string;
  body_style?: string;
  cab_type?: string;
  wheelbase_inches?: number;
  gvwr?: number;
  payload_capacity?: number;
  engine?: string;
  transmission?: string;
  drive_type?: string;
  fuel_type?: string;
  mpg?: string;
  mpge?: string;
  // Additional fields
  height_type?: string;
  axle_description?: string;
  rear_wheels?: "SRW" | "DRW";
  battery_voltage?: number;
  torque_ftlbs?: number;
  horsepower?: number;
  mpg_city?: number;
  mpg_highway?: number;
  length_inches?: number;
  width_inches?: number;
  height_inches?: number;
  base_curb_weight_lbs?: number;
  seating_capacity?: number;
  data_source?: "dealer_input" | "admin_curated" | "vin_decode";
}

export interface FindOrCreateVehicleResult {
  vehicleId: number;
  vehicleConfigId: number;
  created: boolean;
  matchedExisting?: boolean;
}

/**
 * Find or create vehicle in Schema 03
 * Implements smart matching with duplicate detection
 */
export async function findOrCreateVehicle(
  specs: VehicleSpecs,
  dealerId: number
): Promise<FindOrCreateVehicleResult> {
  // Step 1: Search for existing vehicle by year, make, model
  const existingVehicles = await querySchemaTable<Vehicle>(
    "03. Vehicle Data",
    "vehicle",
    {
      where: {
        year: specs.year,
        make_name: specs.make_name,
        model_name: specs.model_name,
      },
      orderBy: { column: "created_at", ascending: false },
      limit: 10,
    }
  );

  // Step 2: Check each vehicle's configs for matching specs
  for (const vehicle of existingVehicles) {
    const configs = await querySchemaTable<VehicleConfig>(
      "03. Vehicle Data",
      "vehicle_config",
      {
        where: { vehicle_id: vehicle.id },
      }
    );

    // Match on key specs with tolerance
    for (const config of configs) {
      let isMatch = true;

      // Wheelbase matching: ±1 inch (tighter for commercial vehicles)
      if (specs.wheelbase_inches && config.wheelbase_inches) {
        const diff = Math.abs(config.wheelbase_inches - specs.wheelbase_inches);
        if (diff > 1) {
          isMatch = false;
          continue;
        }
      } else if (specs.wheelbase_inches || config.wheelbase_inches) {
        // If one has wheelbase and other doesn't, not a match
        continue;
      }

      // Body style and drive type must match exactly
      if (specs.body_style && config.body_style) {
        if (config.body_style !== specs.body_style) {
          isMatch = false;
          continue;
        }
      }

      if (specs.drive_type && config.drive_type) {
        if (config.drive_type !== specs.drive_type) {
          isMatch = false;
          continue;
        }
      }

      // GVWR: ±100 lbs (tighter for commercial vehicles)
      if (specs.gvwr && config.gvwr) {
        const diff = Math.abs(config.gvwr - specs.gvwr);
        if (diff > 100) {
          isMatch = false;
          continue;
        }
      }

      // Series matching (optional)
      if (specs.series && vehicle.series) {
        if (vehicle.series.toLowerCase() !== specs.series.toLowerCase()) {
          isMatch = false;
          continue;
        }
      }

      if (isMatch) {
        return {
          vehicleId: vehicle.id,
          vehicleConfigId: config.id,
          created: false,
          matchedExisting: true,
        };
      }
    }
  }

  // Step 3: No match found - create new vehicle + config
  const newVehicle = await insertSchemaTable<Vehicle>(
    "03. Vehicle Data",
    "vehicle",
    {
      year: specs.year,
      make_name: specs.make_name,
      model_name: specs.model_name,
      series: specs.series || null,
      data_source: "dealer_input",
      created_by_dealer_id: dealerId,
      needs_verification: true,
      confidence_score: 0.7,
    }
  );

  const newConfig = await insertSchemaTable<VehicleConfig>(
    "03. Vehicle Data",
    "vehicle_config",
    {
      vehicle_id: newVehicle.id,
      body_style: specs.body_style || null,
      cab_type: specs.cab_type || null,
      wheelbase_inches: specs.wheelbase_inches || null,
      gvwr: specs.gvwr || null,
      payload_capacity: specs.payload_capacity || null,
      engine: specs.engine || null,
      transmission: specs.transmission || null,
      drive_type: specs.drive_type || null,
      fuel_type: specs.fuel_type || null,
      mpg: specs.mpg || null,
      mpge: specs.mpge || null,
      // Additional fields
      height_type: specs.height_type || null,
      axle_description: specs.axle_description || null,
      rear_wheels: specs.rear_wheels || null,
      battery_voltage: specs.battery_voltage || null,
      torque_ftlbs: specs.torque_ftlbs || null,
      horsepower: specs.horsepower || null,
      mpg_city: specs.mpg_city || null,
      mpg_highway: specs.mpg_highway || null,
      length_inches: specs.length_inches || null,
      width_inches: specs.width_inches || null,
      height_inches: specs.height_inches || null,
      base_curb_weight_lbs: specs.base_curb_weight_lbs || null,
      seating_capacity: specs.seating_capacity || null,
      data_source: specs.data_source || "dealer_input",
    }
  );

  return {
    vehicleId: newVehicle.id,
    vehicleConfigId: newConfig.id,
    created: true,
    matchedExisting: false,
  };
}

// ============ Equipment Find-or-Create ============

export interface EquipmentSpecs {
  manufacturer: string;
  product_line?: string;
  equipment_type: string;
  length_inches?: number;
  height_inches?: number;
  width_inches?: number;
  weight_lbs?: number;
  material?: string;
  door_configuration?: string;
  compartment_count?: number;
  has_interior_lighting?: boolean;
  has_exterior_lighting?: boolean;
  compatible_gvwr_min?: number;
  compatible_gvwr_max?: number;
  compatible_chassis_classes?: string[];
  compatible_cab_types?: string[];
}

export interface FindOrCreateEquipmentResult {
  equipmentId: number;
  equipmentConfigId: number;
  created: boolean;
  matchedExisting?: boolean;
}

/**
 * Find or create equipment in Schema 04
 * Implements smart matching with duplicate detection
 */
export async function findOrCreateEquipment(
  specs: EquipmentSpecs,
  dealerId: number
): Promise<FindOrCreateEquipmentResult> {
  // Step 1: Search for existing equipment by manufacturer, product_line, type
  const whereClause: Record<string, any> = {
    manufacturer: specs.manufacturer,
    equipment_type: specs.equipment_type,
  };

  if (specs.product_line) {
    whereClause.product_line = specs.product_line;
  }

  const existingEquipment = await querySchemaTable<Equipment>(
    "04. Equipment Data",
    "equipment",
    {
      where: whereClause,
      orderBy: { column: "created_at", ascending: false },
      limit: 10,
    }
  );

  // Step 2: Check each equipment's configs for matching specs
  for (const equipment of existingEquipment) {
    const configs = await querySchemaTable<EquipmentConfig>(
      "04. Equipment Data",
      "equipment_config",
      {
        where: { equipment_id: equipment.id },
      }
    );

    // Match on key specs with tolerance
    for (const config of configs) {
      let isMatch = true;

      // Length matching: ±6 inches tolerance
      if (specs.length_inches && config.length_inches) {
        const diff = Math.abs(config.length_inches - specs.length_inches);
        if (diff > 6) {
          isMatch = false;
          continue;
        }
      } else if (specs.length_inches || config.length_inches) {
        continue;
      }

      // Product line must match if provided
      if (specs.product_line && equipment.product_line) {
        if (
          equipment.product_line.toLowerCase() !==
          specs.product_line.toLowerCase()
        ) {
          isMatch = false;
          continue;
        }
      }

      if (isMatch) {
        return {
          equipmentId: equipment.id,
          equipmentConfigId: config.id,
          created: false,
          matchedExisting: true,
        };
      }
    }
  }

  // Step 3: No match found - create new equipment + config
  const newEquipment = await insertSchemaTable<Equipment>(
    "04. Equipment Data",
    "equipment",
    {
      manufacturer: specs.manufacturer,
      product_line: specs.product_line || null,
      equipment_type: specs.equipment_type,
      data_source: "dealer_input",
      created_by_dealer_id: dealerId,
      needs_verification: true,
      confidence_score: 0.7,
    }
  );

  const newConfig = await insertSchemaTable<EquipmentConfig>(
    "04. Equipment Data",
    "equipment_config",
    {
      equipment_id: newEquipment.id,
      length_inches: specs.length_inches || null,
      height_inches: specs.height_inches || null,
      width_inches: specs.width_inches || null,
      weight_lbs: specs.weight_lbs || null,
      material: specs.material || null,
      door_configuration: specs.door_configuration || null,
      compartment_count: specs.compartment_count || null,
      has_interior_lighting: specs.has_interior_lighting || false,
      has_exterior_lighting: specs.has_exterior_lighting || false,
      compatible_gvwr_min: specs.compatible_gvwr_min || null,
      compatible_gvwr_max: specs.compatible_gvwr_max || null,
      compatible_chassis_classes: specs.compatible_chassis_classes || null,
      compatible_cab_types: specs.compatible_cab_types || null,
    }
  );

  return {
    equipmentId: newEquipment.id,
    equipmentConfigId: newConfig.id,
    created: true,
    matchedExisting: false,
  };
}

// ============ Compatibility Management ============

/**
 * Ensure compatibility record exists in Schema 05
 * Creates if it doesn't exist with calculated compliance data
 */
export async function ensureCompatibility(
  vehicleConfigId: number,
  equipmentConfigId: number
): Promise<ChassisEquipmentCompatibility> {
  // Check if compatibility already exists
  const existing = await querySchemaTable<ChassisEquipmentCompatibility>(
    "05. Completed Unit Configuration",
    "chassis_equipment_compatibility",
    {
      where: {
        vehicle_config_id: vehicleConfigId,
        equipment_config_id: equipmentConfigId,
      },
      limit: 1,
    }
  );

  if (existing.length > 0) {
    return existing[0];
  }

  // Fetch vehicle and equipment configs for calculations
  const vehicleConfigs = await querySchemaTable<VehicleConfig>(
    "03. Vehicle Data",
    "vehicle_config",
    {
      where: { id: vehicleConfigId },
      limit: 1,
    }
  );

  if (vehicleConfigs.length === 0) {
    throw new Error(`Vehicle config ${vehicleConfigId} not found`);
  }

  const vehicleConfig = vehicleConfigs[0];

  const equipmentConfigs = await querySchemaTable<EquipmentConfig>(
    "04. Equipment Data",
    "equipment_config",
    {
      where: { id: equipmentConfigId },
      limit: 1,
    }
  );

  if (equipmentConfigs.length === 0) {
    throw new Error(`Equipment config ${equipmentConfigId} not found`);
  }

  const equipmentConfig = equipmentConfigs[0];

  // Calculate compatibility
  const payloadRemaining = (vehicleConfig.payload_capacity || 0) - (equipmentConfig.weight_lbs || 0);
  const isGVWRCompliant = vehicleConfig.gvwr && equipmentConfig.weight_lbs
    ? (vehicleConfig.base_curb_weight_lbs || 0) + equipmentConfig.weight_lbs <= vehicleConfig.gvwr
    : true; // Default to true if we can't calculate

  const cabToAxleOK = true; // TODO: Check minimum_cab_to_axle_inches when available

  const compatibilityStatus = isGVWRCompliant && cabToAxleOK ? 'compatible' : 'needs_review';

  // Create new compatibility record with calculated data
  const compatibility = await insertSchemaTable<ChassisEquipmentCompatibility>(
    "05. Completed Unit Configuration",
    "chassis_equipment_compatibility",
    {
      vehicle_config_id: vehicleConfigId,
      equipment_config_id: equipmentConfigId,
      is_compatible: isGVWRCompliant && cabToAxleOK,
      compatibility_status: compatibilityStatus,
      payload_remaining_lbs: payloadRemaining,
      gvwr_compliant: isGVWRCompliant,
      gawr_compliant: true, // TODO: Calculate actual GAWR
      compatibility_notes: !isGVWRCompliant ? 'Exceeds GVWR - weight reduction needed' : null,
      is_verified: false,
    }
  );

  return compatibility;
}

// ============ Complete Configuration Creation ============

export interface CompleteConfigurationData {
  vehicleConfigId: number;
  equipmentConfigId: number;
  vin?: string;
  configurationType?: "stock_unit" | "custom_build" | "spec_unit";
  askingPrice?: number;
  dealerId: number;
}

/**
 * Create complete configuration in Schema 05
 * Calculates GVWR compliance before creating
 */
export async function createCompleteConfiguration(
  data: CompleteConfigurationData
): Promise<CompleteConfiguration> {
  // Get vehicle config for GVWR
  const vehicleConfigs = await querySchemaTable<VehicleConfig>(
    "03. Vehicle Data",
    "vehicle_config",
    {
      where: { id: data.vehicleConfigId },
      limit: 1,
    }
  );

  if (vehicleConfigs.length === 0) {
    throw new Error("Vehicle config not found");
  }

  const vehicleConfig = vehicleConfigs[0];

  // Get equipment config for weight
  const equipmentConfigs = await querySchemaTable<EquipmentConfig>(
    "04. Equipment Data",
    "equipment_config",
    {
      where: { id: data.equipmentConfigId },
      limit: 1,
    }
  );

  if (equipmentConfigs.length === 0) {
    throw new Error("Equipment config not found");
  }

  const equipmentConfig = equipmentConfigs[0];

  // Calculate total weight and GVWR compliance
  const vehicleCurbWeight = vehicleConfig.base_curb_weight_lbs || 0;
  const equipmentWeight = equipmentConfig.weight_lbs || 0;
  const totalWeight = vehicleCurbWeight + equipmentWeight;
  const gvwr = vehicleConfig.gvwr || 0;

  const isCompliant = gvwr > 0 && totalWeight <= gvwr;
  const payloadRemaining = gvwr > 0 ? gvwr - totalWeight : null;

  // Ensure compatibility exists
  await ensureCompatibility(data.vehicleConfigId, data.equipmentConfigId);

  // Create complete configuration
  const completeConfig = await insertSchemaTable<CompleteConfiguration>(
    "05. Completed Unit Configuration",
    "complete_configurations",
    {
      vehicle_config_id: data.vehicleConfigId,
      equipment_config_id: data.equipmentConfigId,
      vin: data.vin || null,
      configuration_type: data.configurationType || "stock_unit",
      total_weight: totalWeight,
      total_combined_weight_lbs: totalWeight,
      payload_capacity_remaining_lbs: payloadRemaining,
      gvwr_compliant: isCompliant,
      front_gawr_compliant: true, // TODO: Calculate actual GAWR
      rear_gawr_compliant: true,  // TODO: Calculate actual GAWR
      asking_price: data.askingPrice || null,
      created_by_dealer_id: data.dealerId,
    }
  );

  return completeConfig;
}

