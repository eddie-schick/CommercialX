/**
 * Data Quality Scoring System
 * Calculates quality scores for vehicle and equipment catalog entries
 * based on completeness, accuracy, and consistency
 */

import type { Vehicle, VehicleConfig, Equipment, EquipmentConfig } from '../supabase-types';

export interface QualityScore {
  overall: number; // 0-1
  completeness: number; // Percentage of fields populated
  accuracy: number; // Based on data source
  consistency: number; // Cross-validation with other sources
  factors: {
    hasVINDecode: boolean;
    hasEPAData: boolean;
    hasDealerVerification: boolean;
    fieldPopulation: number;
    dataSourceReliability: number;
  };
}

/**
 * Calculate field population percentage for vehicle config
 */
function calculateFieldPopulation(config: VehicleConfig): number {
  const criticalFields = [
    'body_style', 'wheelbase_inches', 'gvwr', 'payload_capacity',
    'engine', 'transmission', 'drive_type', 'seating_capacity'
  ];
  
  const optionalFields = [
    'horsepower', 'torque_ftlbs', 'mpg_city', 'mpg_highway',
    'length_inches', 'width_inches', 'height_inches',
    'gawr_front_lbs', 'gawr_rear_lbs', 'towing_capacity_lbs'
  ];
  
  const criticalPopulated = criticalFields.filter(f => {
    const value = config[f as keyof VehicleConfig];
    return value !== null && value !== undefined && value !== '';
  }).length;
  
  const optionalPopulated = optionalFields.filter(f => {
    const value = config[f as keyof VehicleConfig];
    return value !== null && value !== undefined && value !== '';
  }).length;
  
  // Weight critical fields more heavily (70% critical, 30% optional)
  return (criticalPopulated / criticalFields.length) * 0.7 +
         (optionalPopulated / optionalFields.length) * 0.3;
}

/**
 * Get data source reliability score
 */
function getDataSourceReliability(dataSource?: string): number {
  const reliability: Record<string, number> = {
    'vin_decode_both': 1.0,
    'vin_decode_nhtsa': 0.8,
    'vin_decode_epa': 0.7,
    'oem_api': 0.9,
    'admin_curated': 0.95,
    'dealer_input': 0.6,
    'manual_entry': 0.4
  };
  return reliability[dataSource || 'manual_entry'] || 0.5;
}

/**
 * Check consistency between NHTSA and EPA data if both exist
 */
function checkNHTSAEPAConsistency(config: VehicleConfig): number {
  // If we have both NHTSA and EPA data, check for conflicts
  const metadata = config.enrichment_metadata;
  if (!metadata || !metadata.epaAvailable || !metadata.fieldsFromNHTSA?.length) {
    return 1.0; // No conflicts if single source
  }
  
  // Check for conflicting values in overlapping fields
  // For now, assume consistency if both sources are present
  // (More sophisticated checks could compare specific field values)
  return 0.9; // Slight penalty for potential conflicts
}

/**
 * Calculate quality score for vehicle configuration
 */
export function calculateVehicleQualityScore(
  vehicle: Vehicle,
  config: VehicleConfig
): QualityScore {
  const factors = {
    hasVINDecode: config.data_source?.includes('vin_decode') || false,
    hasEPAData: config.data_source?.includes('epa') || false,
    hasDealerVerification: !vehicle.needs_verification || false,
    fieldPopulation: calculateFieldPopulation(config),
    dataSourceReliability: getDataSourceReliability(config.data_source)
  };
  
  // Calculate component scores
  const completeness = factors.fieldPopulation;
  
  const accuracy = (
    (factors.hasVINDecode ? 0.4 : 0) +
    (factors.hasEPAData ? 0.3 : 0) +
    (factors.hasDealerVerification ? 0.3 : 0.15) + // Partial credit for unverified
    (factors.dataSourceReliability * 0.3)
  );
  
  // Consistency check (compare NHTSA vs EPA fields if both exist)
  const consistency = factors.hasEPAData && factors.hasVINDecode
    ? checkNHTSAEPAConsistency(config)
    : 1.0; // No conflicts if single source
  
  // Overall score: weighted average
  // Completeness: 30%, Accuracy: 50%, Consistency: 20%
  const overall = (completeness * 0.3 + accuracy * 0.5 + consistency * 0.2);
  
  return {
    overall: Math.min(1.0, Math.max(0.0, overall)), // Clamp to 0-1
    completeness,
    accuracy,
    consistency,
    factors
  };
}

/**
 * Calculate quality score for equipment configuration
 */
export function calculateEquipmentQualityScore(
  equipment: Equipment,
  config: EquipmentConfig
): QualityScore {
  const criticalFields = ['length_inches', 'width_inches', 'height_inches', 'weight_lbs'];
  const optionalFields = ['material', 'door_configuration', 'compartment_count'];
  
  const criticalPopulated = criticalFields.filter(f => {
    const value = config[f as keyof EquipmentConfig];
    return value !== null && value !== undefined;
  }).length;
  
  const optionalPopulated = optionalFields.filter(f => {
    const value = config[f as keyof EquipmentConfig];
    return value !== null && value !== undefined;
  }).length;
  
  const fieldPopulation = (criticalPopulated / criticalFields.length) * 0.7 +
                         (optionalPopulated / optionalFields.length) * 0.3;
  
  const factors = {
    hasVINDecode: false, // Equipment doesn't use VIN decode
    hasEPAData: false,
    hasDealerVerification: !equipment.needs_verification || false,
    fieldPopulation,
    dataSourceReliability: getDataSourceReliability(equipment.data_source)
  };
  
  const completeness = fieldPopulation;
  const accuracy = (
    (factors.hasDealerVerification ? 0.5 : 0.3) +
    (factors.dataSourceReliability * 0.5)
  );
  const consistency = 1.0; // Equipment doesn't have multiple sources
  
  const overall = (completeness * 0.4 + accuracy * 0.6);
  
  return {
    overall: Math.min(1.0, Math.max(0.0, overall)),
    completeness,
    accuracy,
    consistency,
    factors
  };
}

/**
 * Update confidence score on vehicle based on quality score
 */
export function updateVehicleConfidenceScore(
  vehicle: Vehicle,
  config: VehicleConfig
): number {
  const qualityScore = calculateVehicleQualityScore(vehicle, config);
  return qualityScore.overall;
}

/**
 * Update confidence score on equipment based on quality score
 */
export function updateEquipmentConfidenceScore(
  equipment: Equipment,
  config: EquipmentConfig
): number {
  const qualityScore = calculateEquipmentQualityScore(equipment, config);
  return qualityScore.overall;
}

