/**
 * Vehicle Data Enrichment
 * Merges NHTSA + EPA data with intelligent conflict resolution
 */

import { decodeVINFromNHTSA, enrichNHTSAData, NHTSAVehicleData } from './vin-decoder';
import { getEPADataForVehicle, EPAVehicleData, normalizeEPAFuelType } from './epa-fuel-economy';

export interface EnrichedVehicleData {
  // Source tracking
  dataSources: string[];              // ['nhtsa', 'epa', 'manual']
  nhtsaConfidence: 'high' | 'medium' | 'low';
  epaAvailable: boolean;
  
  // Combined data (all fields from both APIs)
  // Vehicle Identity
  year: number;
  make: string;
  model: string;
  trim?: string;
  series?: string;
  
  // Classification
  vehicleType?: string;
  bodyClass?: string;
  bodyStyle?: string;
  cabType?: string;
  doors?: number;
  
  // Dimensions
  wheelbase?: number;
  wheelbaseType?: string;
  bedLength?: number;
  bedType?: string;
  overallLength?: number;
  overallWidth?: number;
  overallHeight?: number;
  
  // Weight & Capacity
  curbWeight?: number;
  gvwr?: number;
  gvwrRange?: string;
  payloadCapacity?: number;
  seatingCapacity?: number;
  seatingRows?: number;
  
  // GAWR (CRITICAL for commercial vehicles)
  gawrFront?: number;
  gawrRear?: number;
  
  // Towing
  towingCapacity?: number;
  
  // Fuel
  fuelTankCapacity?: number;
  
  // Technology & Safety
  backupCamera?: boolean;
  bluetoothCapable?: boolean;
  tpms?: boolean;
  
  // Engine & Powertrain
  engineModel?: string;
  engineDescription?: string;
  engineConfiguration?: string;
  engineCylinders?: number;
  displacementL?: number;
  displacementCI?: number;
  displacementCC?: number;
  fuelTypePrimary: string;
  fuelTypeSecondary?: string;
  electrificationLevel?: string;
  
  // Electric Vehicle
  evDriveUnit?: string;
  batteryType?: string;
  batteryKWh?: number;
  batteryVoltage?: number;
  chargerLevel?: string;
  chargingTimeL2Hours?: number;
  chargingTimeDCFastMinutes?: number;
  electricRange?: number;
  
  // Performance
  turbo?: string;
  horsepower?: number;
  torqueFtLbs?: number;
  
  // Fuel Economy
  mpgCity?: number;
  mpgHighway?: number;
  mpgCombined?: number;
  mpge?: number;
  annualFuelCost?: number;
  co2Emissions?: number;
  
  // Transmission & Drivetrain
  transmission?: string;
  transmissionStyle?: string;
  transmissionSpeeds?: number;
  driveType?: string;
  
  // Axle & Wheels
  axleDescription?: string;
  axles?: number;
  rearWheels?: string;              // SRW vs DRW
  wheels?: string;
  
  // Safety
  abs?: string;
  esc?: string;
  tractionControl?: string;
  airBagLocations?: string[];
  
  // Manufacturing
  manufacturer?: string;
  plantCity?: string;
  plantState?: string;
  plantCountry?: string;
  
  // EPA specific
  epaId?: number;
}

/**
 * Main enrichment function
 * Combines NHTSA + EPA data with conflict resolution
 */
export async function enrichVehicleData(
  vin: string
): Promise<EnrichedVehicleData> {
  const dataSources: string[] = [];
  
  // Step 1: Get NHTSA data (required)
  let nhtsaData: NHTSAVehicleData;
  try {
    console.log(`[Enrichment] Decoding VIN from NHTSA: ${vin}`);
    nhtsaData = await decodeVINFromNHTSA(vin);
    console.log(`[Enrichment] NHTSA decode successful, enriching data...`);
    nhtsaData = enrichNHTSAData(nhtsaData);
    dataSources.push('nhtsa');
    console.log(`[Enrichment] NHTSA data enriched:`, {
      year: nhtsaData.year,
      make: nhtsaData.make,
      model: nhtsaData.model,
    });
  } catch (error: any) {
    console.error(`[Enrichment] NHTSA decode failed:`, error);
    throw new Error(`NHTSA VIN decode failed: ${error.message || 'Unknown error'}`);
  }
  
  // Validate required fields
  if (!nhtsaData.year || !nhtsaData.make || !nhtsaData.model) {
    console.error(`[Enrichment] Missing required fields:`, {
      year: nhtsaData.year,
      make: nhtsaData.make,
      model: nhtsaData.model,
    });
    throw new Error('NHTSA data missing required fields (year, make, model)');
  }
  
  // Step 2: Get EPA data (optional)
  let epaData: EPAVehicleData | null = null;
  try {
    epaData = await getEPADataForVehicle(
      nhtsaData.year!,
      nhtsaData.make!,
      nhtsaData.model!
    );
    if (epaData) {
      dataSources.push('epa');
    }
  } catch (error: any) {
    console.warn('EPA data fetch failed (non-critical):', error);
  }
  
  // Step 3: Merge data with intelligent conflict resolution
  const enriched: EnrichedVehicleData = {
    // Metadata
    dataSources,
    nhtsaConfidence: determineNHTSAConfidence(nhtsaData),
    epaAvailable: epaData !== null,
    
    // Vehicle Identity (NHTSA is authoritative)
    year: nhtsaData.year!,
    make: nhtsaData.make!,
    model: nhtsaData.model!,
    trim: nhtsaData.trim || undefined,
    series: nhtsaData.series || undefined,
    
    // Classification (NHTSA only)
    vehicleType: nhtsaData.vehicleType || undefined,
    bodyClass: nhtsaData.bodyClass || undefined,
    bodyStyle: nhtsaData.bodyStyle || undefined,
    cabType: nhtsaData.cabType || undefined,
    doors: nhtsaData.doors || undefined,
    
    // Dimensions (NHTSA only)
    wheelbase: nhtsaData.wheelbase || undefined,
    wheelbaseType: nhtsaData.wheelbaseType || undefined,
    bedLength: nhtsaData.bedLength || undefined,
    bedType: nhtsaData.bedType || undefined,
    overallLength: nhtsaData.overallLength || undefined,
    overallWidth: nhtsaData.overallWidth || undefined,
    overallHeight: nhtsaData.overallHeight || undefined,
    
    // Weight & Capacity (NHTSA only)
    curbWeight: nhtsaData.curbWeight || undefined,
    gvwr: nhtsaData.gvwr || undefined,
    gvwrRange: nhtsaData.gvwrRange || undefined,
    payloadCapacity: nhtsaData.payloadCapacity || undefined,
    seatingCapacity: nhtsaData.seatingCapacity || undefined,
    seatingRows: nhtsaData.seatingRows || undefined,
    
    // GAWR - CRITICAL for equipment compatibility
    gawrFront: nhtsaData.gawrFront || undefined,
    gawrRear: nhtsaData.gawrRear || undefined,
    
    // Towing
    towingCapacity: nhtsaData.towingCapacity || undefined,
    
    // Fuel
    fuelTankCapacity: nhtsaData.fuelTankCapacityGallons || undefined,
    
    // Technology & Safety (convert strings to booleans)
    backupCamera: nhtsaData.backupCamera === 'Yes' || nhtsaData.backupCamera === 'Standard' || undefined,
    bluetoothCapable: nhtsaData.bluetoothCapable === 'Yes' || nhtsaData.bluetoothCapable === 'Standard' || undefined,
    tpms: nhtsaData.tpms === 'Yes' || nhtsaData.tpms === 'Direct' || nhtsaData.tpms === 'Standard' || undefined,
    
    // Engine - Prefer EPA for description, NHTSA for specs
    engineModel: nhtsaData.engineModel || undefined,
    engineDescription: epaData?.engineDescription || nhtsaData.engineModel || undefined,
    engineConfiguration: nhtsaData.engineConfiguration || undefined,
    engineCylinders: epaData?.cylinders || nhtsaData.engineCylinders || undefined,
    displacementL: epaData?.displacementL || nhtsaData.displacementL || undefined,
    displacementCI: nhtsaData.displacementCI || undefined,
    displacementCC: nhtsaData.displacementCC || undefined,
    
    // Fuel Type - Prefer EPA (more detailed)
    fuelTypePrimary: epaData?.fuelType 
      ? normalizeEPAFuelType(epaData.fuelType)
      : nhtsaData.fuelTypePrimary || 'gasoline',
    fuelTypeSecondary: nhtsaData.fuelTypeSecondary || undefined,
    electrificationLevel: nhtsaData.electrificationLevel || undefined,
    
    // Electric Vehicle - Prefer EPA for battery/range, NHTSA for charging
    evDriveUnit: nhtsaData.evDriveUnit || undefined,
    batteryType: nhtsaData.batteryType || undefined,
    batteryKWh: epaData?.batteryCapacityKWh || nhtsaData.batteryKWh || undefined,
    batteryVoltage: nhtsaData.batteryVoltage || undefined,
    chargerLevel: nhtsaData.chargerLevel || undefined,
    chargingTimeL2Hours: epaData?.chargeTime240V || nhtsaData.chargingTimeL2Hours || undefined,
    chargingTimeDCFastMinutes: nhtsaData.chargingTimeDCFastMinutes || undefined,
    electricRange: epaData?.electricRange || undefined,
    
    // Performance (NHTSA only)
    turbo: nhtsaData.turbo || undefined,
    horsepower: nhtsaData.engineHP || undefined,
    torqueFtLbs: undefined, // Not provided by either API - TODO: add if available
    
    // Fuel Economy (EPA authoritative)
    mpgCity: epaData?.mpgCity || undefined,
    mpgHighway: epaData?.mpgHighway || undefined,
    mpgCombined: epaData?.mpgCombined || undefined,
    mpge: epaData?.mpge || undefined,
    annualFuelCost: epaData?.annualFuelCostEstimate || undefined,
    co2Emissions: epaData?.co2Emissions || undefined,
    
    // Transmission - Prefer EPA description, NHTSA for style
    transmission: epaData?.transmissionDescription || nhtsaData.transmission || undefined,
    transmissionStyle: nhtsaData.transmissionStyle || undefined,
    transmissionSpeeds: nhtsaData.transmissionSpeeds || undefined,
    
    // Drive Type - Both provide, prefer EPA
    driveType: normalizeEPADriveType(epaData?.driveType) || nhtsaData.driveType || undefined,
    
    // Axle & Wheels (NHTSA only)
    axleDescription: nhtsaData.axleConfiguration || undefined,
    axles: nhtsaData.axles || undefined,
    rearWheels: nhtsaData.wheels?.includes('Dual') ? 'DRW' : 
                nhtsaData.wheels?.includes('Single') ? 'SRW' : undefined,
    wheels: nhtsaData.wheels || undefined,
    
    // Safety (NHTSA only)
    abs: nhtsaData.abs || undefined,
    esc: nhtsaData.esc || undefined,
    tractionControl: nhtsaData.tractionControl || undefined,
    airBagLocations: nhtsaData.airBagLocations || undefined,
    
    // Manufacturing (NHTSA only)
    manufacturer: nhtsaData.manufacturer || undefined,
    plantCity: nhtsaData.plantCity || undefined,
    plantState: nhtsaData.plantState || undefined,
    plantCountry: nhtsaData.plantCountry || undefined,
    
    // EPA ID for reference
    epaId: epaData?.epaId || undefined,
  };
  
  return enriched;
}

/**
 * Determine confidence level in NHTSA data
 */
function determineNHTSAConfidence(data: NHTSAVehicleData): 'high' | 'medium' | 'low' {
  const criticalFields = [
    data.year,
    data.make,
    data.model,
    data.bodyClass,
    data.gvwr,
    data.engineModel,
    data.transmission,
  ];
  
  const filledCount = criticalFields.filter(f => f !== null && f !== undefined).length;
  const percentage = filledCount / criticalFields.length;
  
  if (percentage >= 0.8) return 'high';
  if (percentage >= 0.5) return 'medium';
  return 'low';
}

/**
 * Normalize EPA drive type to our schema
 */
function normalizeEPADriveType(epaDrive: string | null | undefined): string | undefined {
  if (!epaDrive) return undefined;
  
  const driveMap: Record<string, string> = {
    'Rear-Wheel Drive': 'RWD',
    'Front-Wheel Drive': 'FWD',
    'All-Wheel Drive': 'AWD',
    'Four-Wheel Drive': '4WD',
    '4-Wheel Drive': '4WD',
    '4-Wheel or All-Wheel Drive': 'AWD',
    'Part-time 4-Wheel Drive': '4WD',
  };
  
  return driveMap[epaDrive] || epaDrive;
}

