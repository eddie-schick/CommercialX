/**
 * Smart Data Routing Functions
 * Automatically routes dealer input to correct schemas:
 * - Schema 03: Vehicle Data (vehicle catalog)
 * - Schema 04: Equipment Data (equipment catalog)
 * - Schema 05: Completed Unit Configuration
 * - Schema 02a: Dealership (dealer listings)
 */

import {
  querySchemaTable,
  insertSchemaTable,
  updateSchemaTable,
} from "../supabase-db";
import type {
  Vehicle,
  VehicleConfig,
  Equipment,
  EquipmentConfig,
  CompleteConfiguration,
  VehicleListing,
} from "../supabase-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EnrichedVehicleData } from "../services/vehicle-data-enrichment";

/**
 * Get current authenticated user's dealer ID
 */
async function getCurrentDealerId(supabase: SupabaseClient): Promise<number | null> {
  try {
    // Use public schema wrapper function that Supabase RPC client can call
    const { data, error } = await supabase.rpc('get_user_dealer_id');
    
    if (error) {
      console.error('Failed to get dealer ID:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Error in getCurrentDealerId:', err);
    return null;
  }
}

/**
 * Get current user's organization ID
 */
async function getCurrentOrganizationId(supabase: SupabaseClient): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc('"01. Organization".get_user_organization_id');
    
    if (error) {
      console.error('Failed to get organization ID:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Error in getCurrentOrganizationId:', err);
    return null;
  }
}

/**
 * Verify user has required permission level
 */
async function verifyUserPermission(
  supabase: SupabaseClient,
  organizationId: number,
  requiredRole: 'owner' | 'admin' | 'member' | 'viewer' = 'member'
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user');
      return false;
    }

    // Query organization_users table
    const { data, error } = await supabase
      .from('"01. Organization".organization_users')
      .select('role, status')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      console.error('User not found in organization:', error);
      return false;
    }

    // Check role hierarchy
    const roleHierarchy: Record<string, number> = { 
      owner: 4, 
      admin: 3, 
      member: 2, 
      viewer: 1 
    };
    
    return roleHierarchy[data.role] >= roleHierarchy[requiredRole];
  } catch (err) {
    console.error('Error verifying user permission:', err);
    return false;
  }
}

/**
 * Check if user can create listings
 */
async function canUserCreateListings(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('"01. Organization".user_can_create_listings');
    
    if (error) {
      console.error('Failed to check listing permissions:', error);
      return false;
    }
    
    return data || false;
  } catch (err) {
    console.error('Error in canUserCreateListings:', err);
    return false;
  }
}

export interface ListingFormData {
  // Listing Type
  listingType: "stock_unit" | "build_to_order";

  // Vehicle Data
  vin: string;
  year: number;
  make: string;
  model: string;
  series?: string;
  bodyStyle?: string;
  fuelType: "gasoline" | "diesel" | "electric" | "hybrid" | "cng" | "propane";
  wheelbase?: number;
  gvwr?: number;
  payload?: number;
  engineDescription?: string;
  transmission?: string;
  driveType?: "RWD" | "AWD" | "4WD" | "FWD";
  // Additional vehicle fields from VIN decode
  heightType?: string;
  axleDescription?: string;
  rearWheels?: "SRW" | "DRW";
  batteryVoltage?: number;
  torqueFtLbs?: number;
  horsepower?: number;
  mpgCity?: number;
  mpgHighway?: number;
  mpge?: number;
  lengthInches?: number;
  widthInches?: number;
  heightInches?: number;
  baseCurbWeightLbs?: number;
  seatingCapacity?: number;
  dataSource?: "vin_decode" | "dealer_input";

  // Equipment Data (conditional)
  hasEquipment: boolean;
  equipmentManufacturer?: string;
  equipmentProductLine?: string;
  equipmentType?: string;
  equipmentLength?: number;
  equipmentWidth?: number;
  equipmentHeight?: number;
  equipmentWeight?: number;
  equipmentMaterial?: string;
  doorConfiguration?: string;
  compartmentCount?: number;
  hasInteriorLighting?: boolean;
  hasExteriorLighting?: boolean;

  // Dealer Listing Data
  askingPrice: number;
  specialPrice?: number;
  stockNumber?: string;
  condition: "new" | "used" | "certified_pre_owned" | "demo";
  mileage?: number;
  exteriorColor?: string;
  interiorColor?: string;
  description?: string;
  locationCity?: string;
  locationState?: string;
  photos?: string[];
  // Additional listing fields
  priceType?: "negotiable" | "fixed" | "call_for_price";
  paintCondition?: "excellent" | "good" | "fair" | "poor";
  interiorCondition?: "excellent" | "good" | "fair" | "poor";
  listingTitle?: string;
  keyHighlights?: string | string[];
  marketingHeadline?: string;
  isFeatured?: boolean;
  isHotDeal?: boolean;
  isClearance?: boolean;
  warrantyType?: string;
  warrantyExpiresAt?: Date;
  previousOwners?: number;
  accidentHistory?: string;
}

export interface ListingCreationResult {
  success: boolean;
  listingId?: number;
  vehicleConfigId?: number;
  equipmentConfigId?: number | null;
  completeConfigurationId?: number;
  errors?: string[];
  createdEntries?: {
    vehicle?: boolean;
    vehicleConfig?: boolean;
    equipment?: boolean;
    equipmentConfig?: boolean;
    completeConfiguration?: boolean;
    listing?: boolean;
  };
}

/**
 * Helper function to track which fields came from which source
 */
function getFieldsFromSource(enrichedData: EnrichedVehicleData, source: 'nhtsa' | 'epa'): string[] {
  const fields: string[] = [];
  
  if (source === 'nhtsa') {
    // Fields that came from NHTSA
    if (enrichedData.wheelbase !== undefined && enrichedData.wheelbase !== null) fields.push('wheelbase');
    if (enrichedData.bodyStyle) fields.push('bodyStyle');
    if (enrichedData.bodyClass) fields.push('bodyClass');
    if (enrichedData.gvwr !== undefined && enrichedData.gvwr !== null) fields.push('gvwr');
    if (enrichedData.curbWeight !== undefined && enrichedData.curbWeight !== null) fields.push('curbWeight');
    if (enrichedData.payloadCapacity !== undefined && enrichedData.payloadCapacity !== null) fields.push('payloadCapacity');
    if (enrichedData.gawrFront !== undefined && enrichedData.gawrFront !== null) fields.push('gawrFront');
    if (enrichedData.gawrRear !== undefined && enrichedData.gawrRear !== null) fields.push('gawrRear');
    if (enrichedData.towingCapacity !== undefined && enrichedData.towingCapacity !== null) fields.push('towingCapacity');
    if (enrichedData.fuelTankCapacity !== undefined && enrichedData.fuelTankCapacity !== null) fields.push('fuelTankCapacity');
    if (enrichedData.engineModel) fields.push('engineModel');
    if (enrichedData.transmission) fields.push('transmission');
    if (enrichedData.driveType) fields.push('driveType');
    if (enrichedData.overallLength !== undefined && enrichedData.overallLength !== null) fields.push('overallLength');
    if (enrichedData.overallWidth !== undefined && enrichedData.overallWidth !== null) fields.push('overallWidth');
    if (enrichedData.overallHeight !== undefined && enrichedData.overallHeight !== null) fields.push('overallHeight');
    if (enrichedData.seatingCapacity !== undefined && enrichedData.seatingCapacity !== null) fields.push('seatingCapacity');
    if (enrichedData.horsepower !== undefined && enrichedData.horsepower !== null) fields.push('horsepower');
    if (enrichedData.axleDescription) fields.push('axleDescription');
    if (enrichedData.rearWheels) fields.push('rearWheels');
    if (enrichedData.batteryVoltage !== undefined && enrichedData.batteryVoltage !== null) fields.push('batteryVoltage');
    if (enrichedData.batteryKWh !== undefined && enrichedData.batteryKWh !== null) fields.push('batteryKWh');
    if (enrichedData.electricRange !== undefined && enrichedData.electricRange !== null) fields.push('electricRange');
    if (enrichedData.backupCamera !== undefined) fields.push('backupCamera');
    if (enrichedData.bluetoothCapable !== undefined) fields.push('bluetoothCapable');
    if (enrichedData.tpms !== undefined) fields.push('tpms');
  } else if (source === 'epa') {
    // Fields that came from EPA
    if (enrichedData.mpgCity !== undefined && enrichedData.mpgCity !== null) fields.push('mpgCity');
    if (enrichedData.mpgHighway !== undefined && enrichedData.mpgHighway !== null) fields.push('mpgHighway');
    if (enrichedData.mpgCombined !== undefined && enrichedData.mpgCombined !== null) fields.push('mpgCombined');
    if (enrichedData.mpge !== undefined && enrichedData.mpge !== null) fields.push('mpge');
    if (enrichedData.co2Emissions !== undefined && enrichedData.co2Emissions !== null) fields.push('co2Emissions');
    if (enrichedData.annualFuelCost !== undefined && enrichedData.annualFuelCost !== null) fields.push('annualFuelCost');
    if (enrichedData.engineDescription) fields.push('engineDescription');
    if (enrichedData.batteryCapacityKWh !== undefined && enrichedData.batteryCapacityKWh !== null) fields.push('batteryCapacityKWh');
    if (enrichedData.electricRange !== undefined && enrichedData.electricRange !== null) fields.push('electricRange');
  }
  
  return fields;
}

/**
 * Find existing or create new vehicle in Schema 03
 * Returns vehicle_config_id
 */
export async function findOrCreateVehicle(
  supabase: SupabaseClient,
  dealerId: number,
  formData: ListingFormData,
  enrichedData?: EnrichedVehicleData
): Promise<number> {
  // 1. Search for existing vehicle by year + make + model
  const existingVehicles = await querySchemaTable<Vehicle>(
    "03. Vehicle Data",
    "vehicle",
    {
      where: {
        year: formData.year,
        make_name: formData.make,
        model_name: formData.model,
      },
      limit: 1,
    }
  );

  let vehicleId: number;

  if (existingVehicles.length > 0) {
    vehicleId = existingVehicles[0].id;
  } else {
    // Create new vehicle
    const newVehicle = await insertSchemaTable<Vehicle>(
      "03. Vehicle Data",
      "vehicle",
      {
        year: formData.year,
        make_name: formData.make,
        model_name: formData.model,
        series: formData.series || null,
        data_source: "dealer_input",
        created_by_dealer_id: dealerId,
        needs_verification: true,
        confidence_score: 0.8,
      }
    );
    vehicleId = newVehicle.id;
  }

  // 2. Search for matching vehicle_config
  const existingConfigs = await querySchemaTable<VehicleConfig>(
    "03. Vehicle Data",
    "vehicle_config",
    {
      where: {
        vehicle_id: vehicleId,
      },
    }
  );

  // 3. Check for matching config using fuzzy matching (tighter tolerances for commercial vehicles)
  const matchingConfig = existingConfigs.find((config) => {
    // Wheelbase: ±1 inch (commercial vehicles have precise wheelbase specs)
    const wheelbaseMatch = formData.wheelbase
      ? !config.wheelbase_inches ||
        Math.abs(config.wheelbase_inches - formData.wheelbase) < 1
      : true;
    
    // Body style and drive type must match exactly
    const bodyStyleMatch = !formData.bodyStyle || config.body_style === formData.bodyStyle;
    const driveTypeMatch = !formData.driveType || config.drive_type === formData.driveType;
    
    // GVWR: ±100 lbs (GVWR is exact for commercial vehicles)
    const gvwrMatch = formData.gvwr
      ? !config.gvwr || Math.abs(config.gvwr - formData.gvwr) < 100
      : true;

    return wheelbaseMatch && bodyStyleMatch && driveTypeMatch && gvwrMatch;
  });

  if (matchingConfig) {
    return matchingConfig.id;
  }

  // 4. Create new vehicle_config with all available fields
  // Determine data source
  let dataSource: VehicleConfig['data_source'] = 'dealer_manual_entry';
  let enrichmentMetadata: VehicleConfig['enrichment_metadata'] = null;

  if (enrichedData) {
    // Determine data source based on available sources
    if (enrichedData.dataSources.includes('nhtsa') && enrichedData.dataSources.includes('epa')) {
      dataSource = 'vin_decode_both';
    } else if (enrichedData.dataSources.includes('epa')) {
      dataSource = 'vin_decode_epa';
    } else if (enrichedData.dataSources.includes('nhtsa')) {
      dataSource = 'vin_decode_nhtsa';
    }

    // Build enrichment metadata
    enrichmentMetadata = {
      nhtsaConfidence: enrichedData.nhtsaConfidence,
      epaAvailable: enrichedData.epaAvailable,
      decodedAt: new Date().toISOString(),
      dataSources: enrichedData.dataSources,
      fieldsFromNHTSA: getFieldsFromSource(enrichedData, 'nhtsa'),
      fieldsFromEPA: getFieldsFromSource(enrichedData, 'epa'),
      decodedVIN: formData.vin,
      year: enrichedData.year,
      make: enrichedData.make,
      model: enrichedData.model,
    };
  }

  const newConfig = await insertSchemaTable<VehicleConfig>(
    "03. Vehicle Data",
    "vehicle_config",
    {
      vehicle_id: vehicleId,
      body_style: formData.bodyStyle || enrichedData?.bodyStyle || enrichedData?.bodyClass || null,
      wheelbase_inches: formData.wheelbase || enrichedData?.wheelbase || null,
      gvwr: formData.gvwr || enrichedData?.gvwr || null,
      payload_capacity: formData.payload || enrichedData?.payloadCapacity || null,
      engine: formData.engineDescription || enrichedData?.engineDescription || enrichedData?.engineModel || null,
      transmission: formData.transmission || enrichedData?.transmission || null,
      drive_type: formData.driveType || enrichedData?.driveType || null,
      fuel_type: formData.fuelType || enrichedData?.fuelTypePrimary || null,
      // Additional fields from VIN decode or form
      height_type: (formData as any).heightType || null,
      axle_description: (formData as any).axleDescription || enrichedData?.axleDescription || null,
      rear_wheels: (formData as any).rearWheels || enrichedData?.rearWheels || null,
      battery_voltage: (formData as any).batteryVoltage || enrichedData?.batteryVoltage || null,
      torque_ftlbs: (formData as any).torqueFtLbs || enrichedData?.torqueFtLbs || null,
      horsepower: (formData as any).horsepower || enrichedData?.horsepower || null,
      mpg_city: (formData as any).mpgCity || enrichedData?.mpgCity || null,
      mpg_highway: (formData as any).mpgHighway || enrichedData?.mpgHighway || null,
      mpge: (formData as any).mpge || enrichedData?.mpge || null,
      length_inches: (formData as any).lengthInches || enrichedData?.overallLength || null,
      width_inches: (formData as any).widthInches || enrichedData?.overallWidth || null,
      height_inches: (formData as any).heightInches || enrichedData?.overallHeight || null,
      base_curb_weight_lbs: (formData as any).baseCurbWeightLbs || enrichedData?.curbWeight || null,
      seating_capacity: (formData as any).seatingCapacity || enrichedData?.seatingCapacity || null,
      
      // GAWR (CRITICAL for commercial vehicles)
      gawr_front_lbs: enrichedData?.gawrFront || null,
      gawr_rear_lbs: enrichedData?.gawrRear || null,
      
      // Towing
      towing_capacity_lbs: enrichedData?.towingCapacity || null,
      
      // Fuel
      fuel_tank_capacity_gallons: enrichedData?.fuelTankCapacity || null,
      
      // Technology & Safety
      bluetooth_capable: enrichedData?.bluetoothCapable || null,
      backup_camera: enrichedData?.backupCamera || null,
      tpms: enrichedData?.tpms || null,
      
      data_source: dataSource,
      enrichment_metadata: enrichmentMetadata,
    }
  );

  return newConfig.id;
}

/**
 * Find existing or create new equipment in Schema 04
 * Returns equipment_config_id or null if no equipment
 */
export async function findOrCreateEquipment(
  supabase: SupabaseClient,
  dealerId: number,
  formData: ListingFormData
): Promise<number | null> {
  // 1. If no equipment, return null
  if (!formData.hasEquipment || !formData.equipmentManufacturer) {
    return null;
  }

  // 2. Search for existing equipment by manufacturer + product_line
  const existingEquipment = await querySchemaTable<Equipment>(
    "04. Equipment Data",
    "equipment",
    {
      where: {
        manufacturer: formData.equipmentManufacturer,
        product_line: formData.equipmentProductLine || null,
      },
      limit: 1,
    }
  );

  let equipmentId: number;

  if (existingEquipment.length > 0) {
    equipmentId = existingEquipment[0].id;
  } else {
    // Create new equipment
    const newEquipment = await insertSchemaTable<Equipment>(
      "04. Equipment Data",
      "equipment",
      {
        manufacturer: formData.equipmentManufacturer,
        product_line: formData.equipmentProductLine || null,
        equipment_type: formData.equipmentType || "other",
        data_source: "dealer_input",
        created_by_dealer_id: dealerId,
        needs_verification: true,
        confidence_score: 0.8,
      }
    );
    equipmentId = newEquipment.id;
  }

  // 3. Search for matching equipment_config
  const existingConfigs = await querySchemaTable<EquipmentConfig>(
    "04. Equipment Data",
    "equipment_config",
    {
      where: {
        equipment_id: equipmentId,
      },
    }
  );

  // 4. Check for matching config using fuzzy matching
  const matchingConfig = existingConfigs.find((config) => {
    const lengthMatch = formData.equipmentLength
      ? !config.length_inches ||
        Math.abs(config.length_inches - formData.equipmentLength) < 6
      : true;
    const weightMatch = formData.equipmentWeight
      ? !config.weight_lbs ||
        Math.abs(config.weight_lbs - formData.equipmentWeight) < 100
      : true;
    // Match on width and height if provided
    const widthMatch = (formData as any).equipmentWidth
      ? !config.width_inches ||
        Math.abs(config.width_inches - (formData as any).equipmentWidth) < 6
      : true;
    const heightMatch = (formData as any).equipmentHeight
      ? !config.height_inches ||
        Math.abs(config.height_inches - (formData as any).equipmentHeight) < 6
      : true;

    return lengthMatch && weightMatch && widthMatch && heightMatch;
  });

  if (matchingConfig) {
    return matchingConfig.id;
  }

  // 5. Create new equipment_config with all available fields
  const newConfig = await insertSchemaTable<EquipmentConfig>(
    "04. Equipment Data",
    "equipment_config",
    {
      equipment_id: equipmentId,
      length_inches: formData.equipmentLength || null,
      width_inches: (formData as any).equipmentWidth || null,
      height_inches: (formData as any).equipmentHeight || null,
      weight_lbs: formData.equipmentWeight || null,
      material: (formData as any).equipmentMaterial || null,
      door_configuration: (formData as any).doorConfiguration || null,
      compartment_count: (formData as any).compartmentCount || null,
      has_interior_lighting: (formData as any).hasInteriorLighting || false,
      has_exterior_lighting: (formData as any).hasExteriorLighting || false,
    }
  );

  return newConfig.id;
}

/**
 * Calculate GVWR and GAWR compliance for vehicle + equipment combination
 * Now uses actual GAWR values when available
 */
function calculateCompliance(
  vehicleConfig: VehicleConfig,
  equipmentConfig: EquipmentConfig | null
) {
  const vehicleGVWR = vehicleConfig.gvwr;
  const vehiclePayload = vehicleConfig.payload_capacity;
  const vehicleCurbWeight = vehicleConfig.base_curb_weight_lbs;
  const equipmentWeight = equipmentConfig?.weight_lbs || null;
  
  const gawrFront = vehicleConfig.gawr_front_lbs;
  const gawrRear = vehicleConfig.gawr_rear_lbs;

  if (!vehicleGVWR || vehicleGVWR <= 0) {
    return {
      total_combined_weight_lbs: null,
      payload_capacity_remaining_lbs: null,
      gvwr_compliant: false,
      front_gawr_compliant: true, // Default to true if we can't calculate
      rear_gawr_compliant: true,
    };
  }

  // Calculate vehicle curb weight if not provided
  const curbWeight = vehicleCurbWeight || 
    (vehiclePayload && vehicleGVWR ? vehicleGVWR - vehiclePayload : null);
  
  const equipmentWeightValue = equipmentWeight || 0;
  const totalWeight = (curbWeight || 0) + equipmentWeightValue;
  
  const payloadRemaining = vehicleGVWR - totalWeight;
  const isGVWRCompliant = totalWeight <= vehicleGVWR;

  // GAWR Compliance (if we have the data)
  let frontGawrCompliant = true;
  let rearGawrCompliant = true;
  
  if (gawrFront && gawrRear && equipmentWeightValue > 0) {
    // Use equipment weight distribution if available
    // Default distribution: 40% front, 60% rear (typical for commercial vehicles)
    const frontWeightDistribution = (equipmentConfig as any)?.front_axle_weight_distribution_lbs || 
      (totalWeight * 0.4);
    const rearWeightDistribution = (equipmentConfig as any)?.rear_axle_weight_distribution_lbs || 
      (totalWeight * 0.6);
    
    // Calculate actual axle loads (curb weight distribution + equipment distribution)
    // For simplicity, assume curb weight is evenly distributed, then add equipment distribution
    const frontAxleLoad = (curbWeight || 0) * 0.4 + frontWeightDistribution;
    const rearAxleLoad = (curbWeight || 0) * 0.6 + rearWeightDistribution;
    
    frontGawrCompliant = frontAxleLoad <= gawrFront;
    rearGawrCompliant = rearAxleLoad <= gawrRear;
  }

  return {
    total_combined_weight_lbs: totalWeight,
    payload_capacity_remaining_lbs: payloadRemaining >= 0 ? payloadRemaining : 0,
    gvwr_compliant: isGVWRCompliant,
    front_gawr_compliant: frontGawrCompliant,
    rear_gawr_compliant: rearGawrCompliant,
  };
}

/**
 * Ensure compatibility record exists in Schema 05
 * Creates compatibility record with calculated compliance data
 */
export async function ensureCompatibility(
  supabase: SupabaseClient,
  vehicleConfigId: number,
  equipmentConfigId: number | null
): Promise<number | null> {
  if (!equipmentConfigId) {
    return null; // No equipment, no compatibility check needed
  }

  // Check if compatibility record exists
  const existing = await querySchemaTable(
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
    console.log('✓ Compatibility record already exists');
    return existing[0].id;
  }

  // Fetch vehicle and equipment data for calculations
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

  // Calculate compliance using new function with GAWR support
  const compliance = calculateCompliance(vehicleConfig, equipmentConfig);
  
  // Check wheelbase compatibility if equipment has requirements
  const cabToAxleOK = true; // TODO: Check minimum_cab_to_axle_inches when available

  const compatibilityStatus = compliance.gvwr_compliant && 
                                compliance.front_gawr_compliant && 
                                compliance.rear_gawr_compliant && 
                                cabToAxleOK 
                                ? 'compatible' 
                                : 'needs_review';

  // Create compatibility record
  const compat = await insertSchemaTable(
    "05. Completed Unit Configuration",
    "chassis_equipment_compatibility",
    {
      vehicle_config_id: vehicleConfigId,
      equipment_config_id: equipmentConfigId,
      is_compatible: compliance.gvwr_compliant && 
                     compliance.front_gawr_compliant && 
                     compliance.rear_gawr_compliant && 
                     cabToAxleOK,
      compatibility_status: compatibilityStatus,
      payload_remaining_lbs: compliance.payload_capacity_remaining_lbs,
      gvwr_compliant: compliance.gvwr_compliant,
      gawr_compliant: compliance.front_gawr_compliant && compliance.rear_gawr_compliant,
      compatibility_notes: !compliance.gvwr_compliant 
        ? 'Exceeds GVWR - weight reduction needed'
        : !compliance.front_gawr_compliant || !compliance.rear_gawr_compliant
        ? 'Exceeds GAWR limits - weight distribution adjustment needed'
        : null,
      is_verified: false, // Dealer input, needs verification
    }
  );

  console.log('✓ Created new compatibility record:', compat.id);
  return compat.id;
}

/**
 * Create complete configuration in Schema 05
 */
export async function createCompleteConfiguration(
  supabase: SupabaseClient,
  dealerId: number,
  vehicleConfigId: number,
  equipmentConfigId: number | null,
  formData: ListingFormData,
  organizationId?: number
): Promise<number> {
  // Determine configuration_type based on listingType
  let configurationType: "stock_unit" | "custom_build" | "spec_unit";
  if (formData.listingType === "stock_unit") {
    configurationType = "stock_unit";
  } else if (formData.listingType === "build_to_order") {
    configurationType = "custom_build";
  } else {
    // Fallback to spec_unit for any unexpected values
    configurationType = "spec_unit";
  }

  // Fetch vehicle and equipment configs for compliance calculation
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

  let equipmentConfig: EquipmentConfig | null = null;
  if (equipmentConfigId) {
    const equipmentConfigs = await querySchemaTable<EquipmentConfig>(
      "04. Equipment Data",
      "equipment_config",
      {
        where: { id: equipmentConfigId },
        limit: 1,
      }
    );
    equipmentConfig = equipmentConfigs.length > 0 ? equipmentConfigs[0] : null;
  }

  // Calculate GVWR and GAWR compliance (now uses actual GAWR values)
  const compliance = calculateCompliance(
    vehicleConfig,
    equipmentConfig
  );

  // Get dealer info for owner fields
  let ownerId: number | undefined;
  let ownerName: string | undefined;
  if (organizationId) {
    const dealers = await querySchemaTable(
      "02a. Dealership",
      "dealers",
      {
        where: { organization_id: organizationId },
        limit: 1,
      }
    );
    if (dealers.length > 0) {
      ownerId = organizationId;
      ownerName = dealers[0].dealer_name;
    }
  }

  const completeConfig = await insertSchemaTable<CompleteConfiguration>(
    "05. Completed Unit Configuration",
    "complete_configurations",
    {
      vehicle_config_id: vehicleConfigId,
      equipment_config_id: equipmentConfigId,
      vin: formData.vin || null,
      configuration_type: configurationType,
      ...compliance, // Spread calculated compliance values
      asking_price: formData.askingPrice || null,
      owner_type: ownerId ? 'dealer' : null,
      owner_id: ownerId,
      owner_name: ownerName,
      created_by_dealer_id: dealerId,
    }
  );

  return completeConfig.id;
}

/**
 * Create dealer listing in Schema 02a
 */
export async function createDealerListing(
  supabase: SupabaseClient,
  dealerId: number,
  completeConfigId: number,
  formData: ListingFormData
): Promise<number> {
  // Determine listing status based on condition
  let listingStatus: "draft" | "available" | "pending" | "sold" | "archived" = "draft";
  if (formData.condition === "new" || formData.condition === "demo") {
    listingStatus = "available";
  }

  // Parse key highlights if provided as string (from textarea)
  const keyHighlights = (formData as any).keyHighlights
    ? (typeof (formData as any).keyHighlights === 'string'
        ? (formData as any).keyHighlights.split('\n').filter((line: string) => line.trim())
        : (formData as any).keyHighlights)
    : null;

  const listing = await insertSchemaTable<VehicleListing>(
    "02a. Dealership",
    "vehicle_listings",
    {
      dealer_id: dealerId,
      complete_configuration_id: completeConfigId,
      asking_price: formData.askingPrice,
      condition: formData.condition === "certified_pre_owned" ? "used" : formData.condition,
      mileage: formData.mileage || null,
      stock_number: formData.stockNumber || null,
      location_city: formData.locationCity || null,
      location_state: formData.locationState || null,
      description: formData.description || null,
      status: listingStatus,
      view_count: 0,
      // Additional listing fields
      price_type: (formData as any).priceType || "negotiable",
      paint_condition: (formData as any).paintCondition || null,
      interior_condition: (formData as any).interiorCondition || null,
      listing_title: (formData as any).listingTitle || null,
      key_highlights: keyHighlights,
      marketing_headline: (formData as any).marketingHeadline || null,
      is_featured: (formData as any).isFeatured || false,
      is_hot_deal: (formData as any).isHotDeal || false,
      is_clearance: (formData as any).isClearance || false,
      warranty_type: (formData as any).warrantyType || null,
      warranty_expires_at: (formData as any).warrantyExpiresAt || null,
      previous_owners: (formData as any).previousOwners || null,
      accident_history: (formData as any).accidentHistory || null,
    }
  );

  // Handle photos if provided
  if (formData.photos && formData.photos.length > 0) {
    // Insert listing images
    for (let i = 0; i < formData.photos.length; i++) {
      await insertSchemaTable(
        "02a. Dealership",
        "listing_images",
        {
          listing_id: listing.id,
          image_url: formData.photos[i],
          sort_order: i,
          is_primary: i === 0,
        }
      );
    }
  }

  return listing.id;
}

/**
 * Master orchestration function
 * Creates listing from dealer input, routing to all necessary schemas
 * Now includes authorization checks
 */
export async function createListingFromDealerInput(
  supabase: SupabaseClient,
  dealerId: number | null, // Can be null, will be fetched from auth if not provided
  formData: ListingFormData,
  enrichedData?: EnrichedVehicleData
): Promise<ListingCreationResult> {
  const errors: string[] = [];
  const createdEntries = {
    vehicle: false,
    vehicleConfig: false,
    equipment: false,
    equipmentConfig: false,
    completeConfiguration: false,
    listing: false,
  };

  try {
    // STEP 0: Verify Authorization
    console.log('🔐 Verifying user authorization...');
    
    // Check if user can create listings
    const canCreate = await canUserCreateListings(supabase);
    if (!canCreate) {
      throw new Error('User does not have permission to create listings');
    }

    // Get dealer ID for current user (if not provided)
    let actualDealerId = dealerId;
    if (!actualDealerId) {
      actualDealerId = await getCurrentDealerId(supabase);
      if (!actualDealerId) {
        throw new Error('User is not associated with a dealer organization');
      }
    }

    console.log(`✅ User authorized as dealer ${actualDealerId}`);

    // Get organization ID for ownership tracking
    const organizationId = await getCurrentOrganizationId(supabase);
    if (!organizationId) {
      throw new Error('User organization not found');
    }

    // Verify user has at least 'member' role in organization
    const hasPermission = await verifyUserPermission(supabase, organizationId, 'member');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to create listings');
    }

    // Step 1: Find or create vehicle (pass enriched data if available)
    const vehicleConfigId = await findOrCreateVehicle(supabase, actualDealerId, formData, enrichedData);
    createdEntries.vehicleConfig = true;

    // Step 2: Find or create equipment (if applicable)
    const equipmentConfigId = await findOrCreateEquipment(supabase, actualDealerId, formData);
    if (equipmentConfigId) {
      createdEntries.equipmentConfig = true;
    }

    // Step 3: Ensure compatibility
    await ensureCompatibility(supabase, vehicleConfigId, equipmentConfigId);

    // Step 4: Verify organization ID (already fetched above)
    // Double-check dealer belongs to the organization
    const dealers = await querySchemaTable(
      "02a. Dealership",
      "dealers",
      {
        where: { id: actualDealerId },
        limit: 1,
      }
    );
    const verifiedOrganizationId = dealers.length > 0 ? dealers[0].organization_id : organizationId;
    
    if (verifiedOrganizationId !== organizationId) {
      throw new Error('Dealer organization mismatch');
    }

    // Step 5: Create complete configuration
    const completeConfigId = await createCompleteConfiguration(
      supabase,
      actualDealerId,
      vehicleConfigId,
      equipmentConfigId,
      formData,
      organizationId
    );
    createdEntries.completeConfiguration = true;

    // Step 6: Create dealer listing
    const listingId = await createDealerListing(
      supabase,
      actualDealerId,
      completeConfigId,
      formData
    );
    createdEntries.listing = true;

    return {
      success: true,
      listingId,
      vehicleConfigId,
      equipmentConfigId,
      completeConfigurationId: completeConfigId,
      createdEntries,
    };
  } catch (error) {
    console.error("[Smart Routing] Error creating listing:", error);
    errors.push(error instanceof Error ? error.message : "Unknown error occurred");

    return {
      success: false,
      errors,
      createdEntries,
    };
  }
}

