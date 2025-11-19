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
import { calculateCompatibility } from "../compatibility/calculator";

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
    // First verify we can get the current user (to ensure auth context is working)
    // Note: getUser() without arguments should work if client was created with Authorization header
    // But we'll try it and if it fails, that's a sign the auth context isn't set up correctly
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[canUserCreateListings] Cannot get authenticated user:', {
        error: userError,
        message: userError?.message,
        code: userError?.code,
      });
      // This is a critical failure - if we can't get the user, auth.uid() in SQL will also fail
      return false;
    }
    console.log('[canUserCreateListings] Authenticated user ID:', user.id);
    
    // Try the RPC function first
    let data: boolean | null = null;
    let rpcError: any = null;
    
    try {
      const result = await supabase.rpc('"01. Organization".user_can_create_listings');
      data = result.data;
      rpcError = result.error;
    } catch (rpcException) {
      console.error('[canUserCreateListings] RPC exception (not an error object):', rpcException);
      rpcError = rpcException;
    }
    
    if (rpcError) {
      console.error('[canUserCreateListings] RPC error:', {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        error: rpcError,
      });
      
      // Always try fallback if RPC fails (for any reason)
      console.log('[canUserCreateListings] RPC failed, using fallback check with get_current_user_profile');
      try {
        const { data: profileData, error: profileError } = await supabase.rpc('get_current_user_profile');
        
        if (profileError) {
          console.error('[canUserCreateListings] Fallback profile check also failed:', profileError);
          return false;
        }
        
        if (profileData) {
          const profile = Array.isArray(profileData) ? profileData[0] : profileData;
          console.log('[canUserCreateListings] Profile data:', {
            hasOrganization: profile?.hasOrganization,
            organization_id: profile?.organization_id,
            hasDealer: profile?.hasDealer,
            role: profile?.role,
          });
          
          // Check if user has organization, dealer, and appropriate role
          const hasOrg = profile?.hasOrganization && profile?.organization_id;
          const hasDealer = profile?.hasDealer;
          const role = profile?.role;
          const canCreate = hasOrg && hasDealer && role && role !== 'viewer';
          console.log('[canUserCreateListings] Fallback check result:', canCreate, { hasOrg, hasDealer, role });
          return canCreate || false;
        }
      } catch (fallbackError) {
        console.error('[canUserCreateListings] Fallback check exception:', fallbackError);
        return false;
      }
      
      return false;
    }
    
    console.log('[canUserCreateListings] Permission check result:', data);
    
    // If permission check failed, try to get diagnostic info for better error messages
    if (!data) {
      try {
        const { data: diagnosticData, error: diagError } = await supabase.rpc('"01. Organization".diagnose_listing_permission');
        if (diagError) {
          console.error('[canUserCreateListings] Diagnostic function error:', diagError);
        } else if (diagnosticData) {
          const diagnostic = Array.isArray(diagnosticData) ? diagnosticData[0] : diagnosticData;
          if (diagnostic?.failure_reasons && diagnostic.failure_reasons.length > 0) {
            console.log('[canUserCreateListings] Permission denied. Reasons:', diagnostic.failure_reasons);
          } else {
            console.log('[canUserCreateListings] Diagnostic data:', diagnostic);
          }
        }
      } catch (diagError) {
        // Ignore diagnostic errors, just log them
        console.warn('[canUserCreateListings] Could not get diagnostic info:', diagError);
      }
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
  // Map legacy field names to new field names
  const upfitterName = (formData as any).equipmentUpfitterName || (formData as any).equipmentManufacturer;
  if (!formData.hasEquipment || !upfitterName) {
    return null;
  }
  const productLine = (formData as any).equipmentProductLine;
  const modelName = (formData as any).equipmentModelName;
  const equipmentType = (formData as any).equipmentType || "other";
  const primaryMaterial = (formData as any).equipmentPrimaryMaterial || (formData as any).equipmentMaterial;

  // 2. Search for existing equipment by upfitter_name + product_line
  const existingEquipment = await querySchemaTable<Equipment>(
    "04. Equipment Data",
    "equipment",
    {
      where: {
        upfitter_name: upfitterName,
        product_line: productLine || null,
      },
      limit: 1,
    }
  );

  let equipmentId: number;

  if (existingEquipment.length > 0) {
    equipmentId = existingEquipment[0].id;
  } else {
    // Create new equipment with all available fields
    const newEquipment = await insertSchemaTable<Equipment>(
      "04. Equipment Data",
      "equipment",
      {
        upfitter_name: upfitterName,
        product_line: productLine || "Unknown",
        model_name: modelName || "Unknown",
        equipment_type: equipmentType,
        equipment_subtype: (formData as any).equipmentSubtype || null,
        primary_material: primaryMaterial || "steel",
        body_category: (formData as any).equipmentBodyCategory || null,
        application_type: (formData as any).equipmentApplicationType || null,
        starting_msrp: (formData as any).equipmentStartingMsrp || null,
        marketing_description: (formData as any).equipmentMarketingDescription || null,
        status: "active",
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

  // 5. Create new equipment_config with all available fields from 04. Equipment Data schema
  const newConfig = await insertSchemaTable<EquipmentConfig>(
    "04. Equipment Data",
    "equipment_config",
    {
      equipment_id: equipmentId,
      config_name: (formData as any).equipmentConfigName || `${upfitterName} ${productLine || modelName || "Config"}`,
      config_code: (formData as any).equipmentConfigCode || null,
      model_number: (formData as any).equipmentModelNumber || null,
      length_inches: (formData as any).equipmentLength || null,
      width_inches: (formData as any).equipmentWidth || null,
      height_inches: (formData as any).equipmentHeight || null,
      interior_length_inches: (formData as any).equipmentInteriorLength || null,
      interior_width_inches: (formData as any).equipmentInteriorWidth || null,
      interior_height_inches: (formData as any).equipmentInteriorHeight || null,
      usable_volume_cubic_feet: (formData as any).equipmentUsableVolumeCubicFeet || null,
      equipment_weight_lbs: (formData as any).equipmentWeight || null,
      maximum_payload_lbs: (formData as any).equipmentMaximumPayload || null,
      minimum_cab_to_axle_inches: (formData as any).equipmentMinimumCabToAxle || null,
      maximum_cab_to_axle_inches: (formData as any).equipmentMaximumCabToAxle || null,
      recommended_cab_to_axle_inches: (formData as any).equipmentRecommendedCabToAxle || null,
      mounting_type: (formData as any).equipmentMountingType || null,
      requires_subframe: (formData as any).equipmentRequiresSubframe || false,
      compatible_gvwr_min: (formData as any).equipmentCompatibleGvwrMin || null,
      compatible_gvwr_max: (formData as any).equipmentCompatibleGvwrMax || null,
      material: (formData as any).equipmentMaterial || primaryMaterial || "steel",
      gauge_thickness: (formData as any).equipmentGaugeThickness || null,
      coating_finish: (formData as any).equipmentCoatingFinish || null,
      corrosion_protection: (formData as any).equipmentCorrosionProtection || null,
      tool_compartment_volume_cubic_feet: (formData as any).equipmentToolCompartmentVolume || null,
      door_style: (formData as any).equipmentDoorStyle || null,
      locking_mechanism: (formData as any).equipmentLockingMechanism || null,
      door_configuration: (formData as any).equipmentDoorConfiguration || (formData as any).doorConfiguration || null,
      compartment_count: (formData as any).equipmentCompartmentCount || (formData as any).compartmentCount || null,
      drawer_count: (formData as any).equipmentDrawerCount || null,
      shelf_count: (formData as any).equipmentShelfCount || null,
      has_interior_lighting: (formData as any).equipmentHasInteriorLighting ?? (formData as any).hasInteriorLighting ?? false,
      has_exterior_lighting: (formData as any).equipmentHasExteriorLighting ?? (formData as any).hasExteriorLighting ?? false,
      has_power_outlets: (formData as any).equipmentHasPowerOutlets || false,
      electrical_system_voltage: (formData as any).equipmentElectricalSystemVoltage || null,
      has_crane_provisions: (formData as any).equipmentHasCraneProvisions || false,
      crane_mounting_location: (formData as any).equipmentCraneMountingLocation || null,
      max_crane_capacity_lbs: (formData as any).equipmentMaxCraneCapacity || null,
      has_ladder_rack_provisions: (formData as any).equipmentHasLadderRackProvisions || false,
      ladder_rack_type: (formData as any).equipmentLadderRackType || null,
      has_stake_pockets: (formData as any).equipmentHasStakePockets || false,
      has_tie_downs: (formData as any).equipmentHasTieDowns || false,
      tie_down_count: (formData as any).equipmentTieDownCount || null,
      front_axle_weight_distribution_lbs: (formData as any).equipmentFrontAxleWeightDistribution || null,
      rear_axle_weight_distribution_lbs: (formData as any).equipmentRearAxleWeightDistribution || null,
      center_of_gravity_from_rear_axle_inches: (formData as any).equipmentCenterOfGravityFromRearAxle || null,
      base_msrp: (formData as any).equipmentBaseMsrp || null,
      dealer_cost: (formData as any).equipmentDealerCost || null,
      installation_labor_hours: (formData as any).equipmentInstallationLaborHours || null,
      estimated_installation_cost: (formData as any).equipmentEstimatedInstallationCost || null,
      lead_time_days: (formData as any).equipmentLeadTimeDays || 30,
      minimum_order_quantity: (formData as any).equipmentMinimumOrderQuantity || 1,
      meets_fmvss: (formData as any).equipmentMeetsFmvss ?? true,
      fmvss_compliance_notes: (formData as any).equipmentFmvssComplianceNotes || null,
      dot_approved: (formData as any).equipmentDotApproved ?? true,
      notes: (formData as any).equipmentNotes || null,
      is_active: true,
      is_in_stock: false,
    }
  );

  return newConfig.id;
}

/**
 * Calculate GVWR and GAWR compliance for vehicle + equipment combination
 * Uses the comprehensive compatibility calculator
 */
async function calculateCompliance(
  vehicleConfig: VehicleConfig,
  equipmentConfig: EquipmentConfig | null
) {
  const compatibility = await calculateCompatibility(vehicleConfig, equipmentConfig);
  
  return {
    total_combined_weight_lbs: compatibility.totalCombinedWeight,
    payload_capacity_remaining_lbs: compatibility.payloadRemaining,
    gvwr_compliant: compatibility.gvwrCompliant,
    front_gawr_compliant: compatibility.gawrFrontCompliant,
    rear_gawr_compliant: compatibility.gawrRearCompliant,
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

  // Calculate comprehensive compatibility
  const compatibility = await calculateCompatibility(vehicleConfig, equipmentConfig);

  const compatibilityStatus = compatibility.compatibilityStatus === 'compatible'
    ? 'compatible'
    : compatibility.compatibilityStatus === 'not_compatible'
    ? 'incompatible'
    : 'needs_review';

  // Create compatibility record with comprehensive calculation results
  const compat = await insertSchemaTable(
    "05. Completed Unit Configuration",
    "chassis_equipment_compatibility",
    {
      vehicle_config_id: vehicleConfigId,
      equipment_config_id: equipmentConfigId,
      is_compatible: compatibility.compatibilityStatus === 'compatible',
      compatibility_status: compatibilityStatus,
      payload_remaining_lbs: compatibility.payloadRemaining,
      gvwr_compliant: compatibility.gvwrCompliant,
      gawr_compliant: compatibility.gawrFrontCompliant && compatibility.gawrRearCompliant,
      compatibility_notes: compatibility.warnings.length > 0 
        ? compatibility.warnings.join('; ')
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

  // Calculate GVWR and GAWR compliance using comprehensive calculator
  const compliance = await calculateCompliance(
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
    console.log('[createListingFromDealerInput] Checking user permissions...');
    const canCreate = await canUserCreateListings(supabase);
    console.log('[createListingFromDealerInput] Permission check result:', canCreate);
    
    if (!canCreate) {
      // Try to get diagnostic info for better error message
      let errorMessage = 'User does not have permission to create listings';
      let diagnosticDetails: any = null;
      
      try {
        console.log('[createListingFromDealerInput] Calling diagnostic function...');
        const { data: diagnosticData, error: diagError } = await supabase.rpc('"01. Organization".diagnose_listing_permission');
        
        // Handle case where function doesn't exist (PGRST202) or other RPC errors
        if (diagError) {
          console.error('[createListingFromDealerInput] Diagnostic function error:', {
            code: diagError.code,
            message: diagError.message,
            details: diagError.details,
            hint: diagError.hint,
          });
          // If function doesn't exist, that's okay - just use default message
          if (diagError.code === 'PGRST202' || diagError.message?.includes('Could not find the function')) {
            console.log('[createListingFromDealerInput] Diagnostic function not found, using default message');
          }
        } else if (diagnosticData) {
          try {
            const diagnostic = Array.isArray(diagnosticData) ? diagnosticData[0] : diagnosticData;
            diagnosticDetails = diagnostic;
            console.log('[createListingFromDealerInput] Diagnostic data received:', JSON.stringify(diagnostic, null, 2));
            
            if (diagnostic && typeof diagnostic === 'object') {
              // Build detailed error message with all diagnostic info
              const parts: string[] = [];
              
              if (diagnostic.failure_reasons && Array.isArray(diagnostic.failure_reasons) && diagnostic.failure_reasons.length > 0) {
                parts.push(...diagnostic.failure_reasons);
              } else {
                // If no failure reasons but permission denied, show what we know
                parts.push('Permission check failed');
                if (diagnostic.has_organization_user === false) {
                  parts.push('No organization_users record found');
                }
                if (diagnostic.has_organization === false) {
                  parts.push('No organization record found');
                }
                if (diagnostic.has_dealer === false) {
                  parts.push('No dealer record found');
                }
                if (diagnostic.organization_type_can_list === false) {
                  parts.push('Organization type does not allow listing vehicles');
                }
                if (diagnostic.organization_user_role === 'viewer') {
                  parts.push('User role is "viewer" (cannot create listings)');
                }
                if (diagnostic.organization_user_status !== 'active') {
                  parts.push(`Organization user status is "${diagnostic.organization_user_status}" (must be "active")`);
                }
                if (diagnostic.organization_status !== 'active') {
                  parts.push(`Organization status is "${diagnostic.organization_status}" (must be "active")`);
                }
              }
              
              if (parts.length > 0) {
                errorMessage = `Permission denied: ${parts.join('; ')}`;
                console.log('[createListingFromDealerInput] Using diagnostic error message:', errorMessage);
              } else {
                console.warn('[createListingFromDealerInput] Diagnostic data present but no failure reasons identified:', diagnostic);
              }
            } else {
              console.warn('[createListingFromDealerInput] Diagnostic data is not an object:', diagnostic);
            }
          } catch (parseError) {
            console.error('[createListingFromDealerInput] Error parsing diagnostic data:', parseError);
          }
        } else {
          console.warn('[createListingFromDealerInput] No diagnostic data returned (null or undefined)');
        }
      } catch (diagError) {
        // If diagnostic fails completely, use default message - don't crash
        console.error('[createListingFromDealerInput] Exception getting diagnostic info:', diagError instanceof Error ? diagError.message : String(diagError), diagError);
      }
      
      console.error('[createListingFromDealerInput] Throwing permission error:', errorMessage);
      throw new Error(errorMessage);
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

