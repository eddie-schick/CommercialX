/**
 * Compatibility Calculator
 * Calculates weight distribution, GVWR/GAWR compliance, and physical fit
 * for vehicle + equipment combinations
 */

import type { VehicleConfig, EquipmentConfig } from '../supabase-types';

export interface CompatibilityCalculation {
  // Weight distribution
  chassisBaseWeight: number;
  equipmentWeight: number;
  totalCombinedWeight: number;
  frontAxleWeight: number;
  rearAxleWeight: number;
  
  // Compliance checks
  gvwrCompliant: boolean;
  gawrFrontCompliant: boolean;
  gawrRearCompliant: boolean;
  payloadRemaining: number;
  
  // Physical fit
  cabToAxleCompatible: boolean;
  wheelbaseCompatible: boolean;
  
  // Status
  compatibilityStatus: 'compatible' | 'requires_modification' | 'not_compatible';
  compatibilityConfidence: 'verified' | 'calculated' | 'estimated';
  warnings: string[];
}

/**
 * Calculate front axle load distribution
 * Uses equipment weight distribution if available, otherwise defaults
 */
function calculateFrontAxleLoad(
  vehicleConfig: VehicleConfig,
  equipmentConfig: EquipmentConfig | null
): number {
  const vehicleCurbWeight = vehicleConfig.base_curb_weight_lbs || 0;
  
  // Default distribution: 40% front, 60% rear (typical for commercial vehicles)
  const defaultFrontDistribution = 0.4;
  
  if (!equipmentConfig || !equipmentConfig.weight_lbs) {
    return vehicleCurbWeight * defaultFrontDistribution;
  }
  
  // If equipment has specific weight distribution, use it
  // Otherwise use default distribution
  const equipmentWeight = equipmentConfig.weight_lbs;
  const frontDistribution = (equipmentConfig as any)?.front_axle_weight_distribution_percentage || defaultFrontDistribution;
  
  return (vehicleCurbWeight * defaultFrontDistribution) + (equipmentWeight * frontDistribution);
}

/**
 * Calculate rear axle load distribution
 */
function calculateRearAxleLoad(
  vehicleConfig: VehicleConfig,
  equipmentConfig: EquipmentConfig | null
): number {
  const vehicleCurbWeight = vehicleConfig.base_curb_weight_lbs || 0;
  
  const defaultRearDistribution = 0.6;
  
  if (!equipmentConfig || !equipmentConfig.weight_lbs) {
    return vehicleCurbWeight * defaultRearDistribution;
  }
  
  const equipmentWeight = equipmentConfig.weight_lbs;
  const rearDistribution = (equipmentConfig as any)?.rear_axle_weight_distribution_percentage || defaultRearDistribution;
  
  return (vehicleCurbWeight * defaultRearDistribution) + (equipmentWeight * rearDistribution);
}

/**
 * Check cab-to-axle compatibility
 * Equipment may require minimum cab-to-axle distance
 */
function checkCabToAxleFit(
  vehicleConfig: VehicleConfig,
  equipmentConfig: EquipmentConfig | null
): boolean {
  if (!equipmentConfig) {
    return true; // No equipment, always compatible
  }
  
  const minCabToAxle = (equipmentConfig as any)?.minimum_cab_to_axle_inches;
  if (!minCabToAxle) {
    return true; // No requirement specified
  }
  
  // Calculate cab-to-axle from wheelbase
  // Rough estimate: cab-to-axle ≈ wheelbase * 0.6 (varies by vehicle)
  const wheelbase = vehicleConfig.wheelbase_inches;
  if (!wheelbase) {
    return true; // Can't verify without wheelbase
  }
  
  const estimatedCabToAxle = wheelbase * 0.6;
  return estimatedCabToAxle >= minCabToAxle;
}

/**
 * Check wheelbase compatibility
 * Some equipment requires specific wheelbase ranges
 */
function checkWheelbaseFit(
  vehicleConfig: VehicleConfig,
  equipmentConfig: EquipmentConfig | null
): boolean {
  if (!equipmentConfig) {
    return true;
  }
  
  const minWheelbase = (equipmentConfig as any)?.minimum_wheelbase_inches;
  const maxWheelbase = (equipmentConfig as any)?.maximum_wheelbase_inches;
  
  if (!minWheelbase && !maxWheelbase) {
    return true; // No requirement
  }
  
  const wheelbase = vehicleConfig.wheelbase_inches;
  if (!wheelbase) {
    return true; // Can't verify
  }
  
  if (minWheelbase && wheelbase < minWheelbase) {
    return false;
  }
  
  if (maxWheelbase && wheelbase > maxWheelbase) {
    return false;
  }
  
  return true;
}

/**
 * Determine confidence level of compatibility calculation
 */
function determineConfidence(
  vehicleConfig: VehicleConfig,
  equipmentConfig: EquipmentConfig | null
): 'verified' | 'calculated' | 'estimated' {
  // If we have GAWR data and equipment weight distribution, it's calculated
  if (vehicleConfig.gawr_front_lbs && vehicleConfig.gawr_rear_lbs && equipmentConfig?.weight_lbs) {
    const hasDistribution = (equipmentConfig as any)?.front_axle_weight_distribution_percentage;
    return hasDistribution ? 'calculated' : 'estimated';
  }
  
  // If we have GVWR and weights, it's calculated
  if (vehicleConfig.gvwr && vehicleConfig.base_curb_weight_lbs && equipmentConfig?.weight_lbs) {
    return 'calculated';
  }
  
  // Otherwise it's estimated
  return 'estimated';
}

/**
 * Calculate comprehensive compatibility for vehicle + equipment combination
 */
export async function calculateCompatibility(
  vehicleConfig: VehicleConfig,
  equipmentConfig: EquipmentConfig | null
): Promise<CompatibilityCalculation> {
  const warnings: string[] = [];
  
  // 1. Calculate total weight
  const chassisBaseWeight = vehicleConfig.base_curb_weight_lbs || 0;
  const equipmentWeight = equipmentConfig?.weight_lbs || 0;
  const totalCombinedWeight = chassisBaseWeight + equipmentWeight;
  
  // 2. Calculate axle distribution
  const frontAxleWeight = calculateFrontAxleLoad(vehicleConfig, equipmentConfig);
  const rearAxleWeight = calculateRearAxleLoad(vehicleConfig, equipmentConfig);
  
  // 3. Check GVWR compliance
  const gvwr = vehicleConfig.gvwr;
  let gvwrCompliant = true;
  if (gvwr && gvwr > 0) {
    gvwrCompliant = totalCombinedWeight <= gvwr;
    if (!gvwrCompliant) {
      warnings.push(
        `Total weight (${totalCombinedWeight} lbs) exceeds GVWR (${gvwr} lbs) by ${totalCombinedWeight - gvwr} lbs`
      );
    }
  } else {
    warnings.push('GVWR not available - cannot verify compliance');
  }
  
  // 4. Check GAWR compliance (if data available)
  let gawrFrontCompliant = true;
  let gawrRearCompliant = true;
  
  if (vehicleConfig.gawr_front_lbs && vehicleConfig.gawr_rear_lbs) {
    gawrFrontCompliant = frontAxleWeight <= vehicleConfig.gawr_front_lbs;
    gawrRearCompliant = rearAxleWeight <= vehicleConfig.gawr_rear_lbs;
    
    if (!gawrFrontCompliant) {
      warnings.push(
        `Front axle weight (${frontAxleWeight} lbs) exceeds GAWR front (${vehicleConfig.gawr_front_lbs} lbs) by ${frontAxleWeight - vehicleConfig.gawr_front_lbs} lbs`
      );
    }
    
    if (!gawrRearCompliant) {
      warnings.push(
        `Rear axle weight (${rearAxleWeight} lbs) exceeds GAWR rear (${vehicleConfig.gawr_rear_lbs} lbs) by ${rearAxleWeight - vehicleConfig.gawr_rear_lbs} lbs`
      );
    }
  } else {
    if (equipmentWeight > 0) {
      warnings.push('GAWR data not available - cannot verify axle weight compliance');
    }
  }
  
  // 5. Calculate remaining payload
  const payloadRemaining = gvwr && gvwr > 0 
    ? Math.max(0, gvwr - totalCombinedWeight)
    : 0;
  
  // 6. Check physical compatibility
  const cabToAxleCompatible = checkCabToAxleFit(vehicleConfig, equipmentConfig);
  const wheelbaseCompatible = checkWheelbaseFit(vehicleConfig, equipmentConfig);
  
  if (!cabToAxleCompatible) {
    warnings.push('Cab-to-axle measurement may require frame extension');
  }
  
  if (!wheelbaseCompatible) {
    warnings.push('Wheelbase outside equipment compatibility range');
  }
  
  // 7. Determine overall status
  let compatibilityStatus: 'compatible' | 'requires_modification' | 'not_compatible';
  
  if (!gvwrCompliant) {
    compatibilityStatus = 'not_compatible';
  } else if (!gawrFrontCompliant || !gawrRearCompliant || !cabToAxleCompatible || !wheelbaseCompatible) {
    compatibilityStatus = 'requires_modification';
  } else {
    compatibilityStatus = 'compatible';
  }
  
  const compatibilityConfidence = determineConfidence(vehicleConfig, equipmentConfig);
  
  return {
    chassisBaseWeight,
    equipmentWeight,
    totalCombinedWeight,
    frontAxleWeight,
    rearAxleWeight,
    gvwrCompliant,
    gawrFrontCompliant,
    gawrRearCompliant,
    payloadRemaining,
    cabToAxleCompatible,
    wheelbaseCompatible,
    compatibilityStatus,
    compatibilityConfidence,
    warnings
  };
}

