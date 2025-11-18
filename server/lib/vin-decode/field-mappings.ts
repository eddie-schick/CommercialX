/**
 * VIN Decode Field Mappings
 * Maps NHTSA and EPA API response fields to database columns
 * 
 * This module provides comprehensive field mapping between external VIN decode APIs
 * and the CommercialX database schema.
 */

export interface NHTSADecodeResponse {
  ModelYear?: string;
  Make?: string;
  Model?: string;
  Series?: string;
  BodyClass?: string;
  DriveType?: string;
  TransmissionStyle?: string;
  EngineModel?: string;
  FuelTypePrimary?: string;
  WheelBaseType?: string;
  OverallLength?: string;
  OverallWidth?: string;
  OverallHeight?: string;
  GVWR?: string;
  GVWR_to?: string;
  CurbWeightLB?: string;
  GAWR_Front?: string;
  GAWR_Rear?: string;
  EngineCylinders?: string;
  DisplacementL?: string;
  EngineHP?: string;
  EngineKW?: string;
  BatteryKWh?: string;
  BatteryV?: string;
  EVDriveUnit?: string;
  AxleConfiguration?: string;
  RearAxle?: string;
  Seats?: string;
  BluetoothCapable?: string;
  BackupCamera?: string;
  TPMS?: string;
  VIN?: string;
  [key: string]: any;
}

export interface EPADecodeResponse {
  city08?: number;
  highway08?: number;
  comb08?: number;
  cityE?: number;
  combinedCD?: number;
  fuelType?: string;
  cylinders?: number;
  displ?: number;
  trany?: string;
  drive?: string;
  VClass?: string;
  [key: string]: any;
}

/**
 * Mapping from NHTSA API fields to database columns
 * Fields marked as null are stored in other columns (e.g., engine_description)
 */
export const NHTSA_TO_VEHICLE_CONFIG_MAPPING: Record<string, string | null> = {
  // Basic identification (goes to vehicle table, not config)
  'ModelYear': null, // Handled separately - goes to vehicle.year
  'Make': null, // Handled separately - goes to vehicle.make_name
  'Model': null, // Handled separately - goes to vehicle.model_name
  'Series': null, // Handled separately - goes to vehicle.series_name
  
  // Configuration fields (go to vehicle_config)
  'BodyClass': 'body_style',
  'DriveType': 'drive_type',
  'TransmissionStyle': 'transmission',
  'EngineModel': null, // Stored in engine_description
  'FuelTypePrimary': 'fuel_type',
  
  // Dimensions (inches) - may need conversion
  'WheelBaseType': 'wheelbase_inches',
  'OverallLength': 'length_inches',
  'OverallWidth': 'width_inches',
  'OverallHeight': 'height_inches',
  
  // Weight (lbs)
  'GVWR': 'gvwr',
  'GVWR_to': 'gvwr', // Sometimes NHTSA returns range, use first value
  'CurbWeightLB': 'base_curb_weight_lbs',
  'GAWR_Front': 'gawr_front_lbs',
  'GAWR_Rear': 'gawr_rear_lbs',
  
  // Powertrain
  'EngineCylinders': null, // Store in engine_description
  'DisplacementL': null, // Store in engine_description
  'EngineHP': 'horsepower',
  'EngineKW': null, // Convert to HP if HP not available
  
  // Electric vehicle
  'BatteryKWh': 'battery_kwh',
  'BatteryV': 'battery_voltage',
  'EVDriveUnit': null, // Store in notes or engine_description
  
  // Axle configuration
  'AxleConfiguration': 'axle_description',
  'RearAxle': 'rear_wheels', // Convert to 'SRW'/'DRW'
  
  // Seating
  'Seats': 'seating_capacity',
  
  // Features
  'BluetoothCapable': 'bluetooth_capable',
  'BackupCamera': 'backup_camera',
  'TPMS': 'tpms',
};

/**
 * Mapping from EPA API fields to database columns
 */
export const EPA_TO_VEHICLE_CONFIG_MAPPING: Record<string, string | null> = {
  'city08': 'mpg_city',
  'highway08': 'mpg_highway',
  'comb08': null, // Calculate average if needed
  'cityE': 'mpge', // Electric MPGe
  'combinedCD': 'range_miles', // Electric range
  'fuelType': 'fuel_type', // Validate against NHTSA
  'cylinders': null, // Add to engine_description
  'displ': null, // Add to engine_description
  'trany': 'transmission', // Validate against NHTSA
  'drive': 'drive_type', // Validate against NHTSA
  'VClass': null, // Vehicle table field (vehicle_type)
};

/**
 * Convert NHTSA value to appropriate database type
 */
export function convertNHTSAValue(field: string, value: string | undefined): any {
  if (!value || value === 'Not Applicable' || value === '') {
    return null;
  }

  // Boolean fields
  if (['BluetoothCapable', 'BackupCamera', 'TPMS'].includes(field)) {
    return value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
  }

  // Integer fields
  if (['ModelYear', 'WheelBaseType', 'OverallLength', 'OverallWidth', 'OverallHeight', 
       'GVWR', 'GVWR_to', 'CurbWeightLB', 'GAWR_Front', 'GAWR_Rear', 
       'EngineHP', 'EngineCylinders', 'Seats', 'BatteryV'].includes(field)) {
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  }

  // Decimal fields
  if (['DisplacementL', 'EngineKW', 'BatteryKWh'].includes(field)) {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  // Special handling for RearAxle (convert to SRW/DRW)
  if (field === 'RearAxle') {
    const lower = value.toLowerCase();
    if (lower.includes('single') || lower.includes('srw')) return 'SRW';
    if (lower.includes('dual') || lower.includes('drw') || lower.includes('double')) return 'DRW';
    return value; // Return as-is if can't determine
  }

  // String fields - return as-is
  return value.trim();
}

/**
 * Convert EPA value to appropriate database type
 */
export function convertEPAValue(field: string, value: any): any {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Numeric fields
  if (['city08', 'highway08', 'comb08', 'cityE', 'combinedCD', 'cylinders', 'displ'].includes(field)) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? null : num;
  }

  // String fields
  return String(value).trim();
}

/**
 * Determine NHTSA confidence level based on data completeness
 */
export function determineNHTSAConfidence(nhtsaData: NHTSADecodeResponse): 'high' | 'medium' | 'low' {
  const criticalFields = ['ModelYear', 'Make', 'Model', 'GVWR'];
  const importantFields = ['BodyClass', 'DriveType', 'EngineModel', 'FuelTypePrimary'];
  
  const criticalPresent = criticalFields.filter(f => nhtsaData[f] && nhtsaData[f] !== 'Not Applicable').length;
  const importantPresent = importantFields.filter(f => nhtsaData[f] && nhtsaData[f] !== 'Not Applicable').length;
  
  if (criticalPresent === criticalFields.length && importantPresent >= importantFields.length * 0.75) {
    return 'high';
  } else if (criticalPresent >= criticalFields.length * 0.75 && importantPresent >= importantFields.length * 0.5) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Merge NHTSA and EPA data into database-ready format
 */
export function mergeVINDecodeData(
  nhtsaData: NHTSADecodeResponse,
  epaData: EPADecodeResponse | null
): {
  vehicleData: Partial<{
    year: number;
    make_name: string;
    model_name: string;
    series_name: string | null;
  }>;
  vehicleConfigData: Partial<{
    body_style: string;
    wheelbase_inches: number;
    gvwr: number;
    payload_capacity: number;
    engine: string;
    transmission: string;
    drive_type: string;
    fuel_type: string;
    height_type: string;
    axle_description: string;
    rear_wheels: 'SRW' | 'DRW';
    battery_voltage: number;
    torque_ftlbs: number;
    horsepower: number;
    mpg_city: number;
    mpg_highway: number;
    mpge: number;
    length_inches: number;
    width_inches: number;
    height_inches: number;
    base_curb_weight_lbs: number;
    seating_capacity: number;
    gawr_front_lbs: number;
    gawr_rear_lbs: number;
    towing_capacity_lbs: number;
    fuel_tank_capacity_gallons: number;
    bluetooth_capable: boolean;
    backup_camera: boolean;
    tpms: boolean;
    data_source: string;
    enrichment_metadata: any;
  }>;
  enrichmentMetadata: any;
} {
  const vehicleData: any = {};
  const vehicleConfigData: any = {};
  const fieldsFromNHTSA: string[] = [];
  const fieldsFromEPA: string[] = [];
  
  // Extract vehicle-level data (year, make, model, series)
  if (nhtsaData.ModelYear) {
    const year = parseInt(nhtsaData.ModelYear, 10);
    if (!isNaN(year)) {
      vehicleData.year = year;
      fieldsFromNHTSA.push('year');
    }
  }
  
  if (nhtsaData.Make) {
    vehicleData.make_name = nhtsaData.Make.trim();
    fieldsFromNHTSA.push('make_name');
  }
  
  if (nhtsaData.Model) {
    vehicleData.model_name = nhtsaData.Model.trim();
    fieldsFromNHTSA.push('model_name');
  }
  
  if (nhtsaData.Series) {
    vehicleData.series_name = nhtsaData.Series.trim();
    fieldsFromNHTSA.push('series_name');
  }
  
  // Map NHTSA data to vehicle_config
  for (const [nhtsaField, dbField] of Object.entries(NHTSA_TO_VEHICLE_CONFIG_MAPPING)) {
    if (dbField && nhtsaData[nhtsaField]) {
      const convertedValue = convertNHTSAValue(nhtsaField, nhtsaData[nhtsaField]);
      if (convertedValue !== null) {
        vehicleConfigData[dbField] = convertedValue;
        fieldsFromNHTSA.push(dbField);
      }
    }
  }
  
  // Build engine description from multiple NHTSA fields
  const engineParts: string[] = [];
  if (nhtsaData.EngineModel) engineParts.push(nhtsaData.EngineModel);
  if (nhtsaData.EngineCylinders) engineParts.push(`${nhtsaData.EngineCylinders} cyl`);
  if (nhtsaData.DisplacementL) engineParts.push(`${nhtsaData.DisplacementL}L`);
  if (engineParts.length > 0 && !vehicleConfigData.engine) {
    vehicleConfigData.engine = engineParts.join(' ');
    fieldsFromNHTSA.push('engine');
  }
  
  // Map EPA data (if available)
  if (epaData) {
    for (const [epaField, dbField] of Object.entries(EPA_TO_VEHICLE_CONFIG_MAPPING)) {
      if (dbField && epaData[epaField as keyof EPADecodeResponse] !== undefined) {
        const convertedValue = convertEPAValue(epaField, epaData[epaField as keyof EPADecodeResponse]);
        if (convertedValue !== null) {
          // Don't overwrite NHTSA data unless EPA is more specific
          if (!vehicleConfigData[dbField] || epaField === 'city08' || epaField === 'highway08') {
            vehicleConfigData[dbField] = convertedValue;
            fieldsFromEPA.push(dbField);
          }
        }
      }
    }
  }
  
  // Determine data source
  let dataSource: string;
  if (fieldsFromNHTSA.length > 0 && fieldsFromEPA.length > 0) {
    dataSource = 'vin_decode_both';
  } else if (fieldsFromEPA.length > 0) {
    dataSource = 'vin_decode_epa';
  } else if (fieldsFromNHTSA.length > 0) {
    dataSource = 'vin_decode_nhtsa';
  } else {
    dataSource = 'manual_entry';
  }
  
  vehicleConfigData.data_source = dataSource;
  
  // Build enrichment metadata
  const enrichmentMetadata = {
    nhtsaConfidence: determineNHTSAConfidence(nhtsaData),
    epaAvailable: epaData !== null,
    decodedAt: new Date().toISOString(),
    dataSources: dataSource.split('_').slice(2), // ['nhtsa', 'epa'] or ['nhtsa']
    fieldsFromNHTSA,
    fieldsFromEPA,
    fieldsManual: [], // Track which fields user manually entered
    decodedVIN: nhtsaData.VIN || null,
    year: vehicleData.year || null,
    make: vehicleData.make_name || null,
    model: vehicleData.model_name || null,
  };
  
  vehicleConfigData.enrichment_metadata = enrichmentMetadata;
  
  return {
    vehicleData,
    vehicleConfigData,
    enrichmentMetadata
  };
}

