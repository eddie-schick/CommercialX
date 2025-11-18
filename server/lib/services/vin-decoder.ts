/**
 * Enhanced NHTSA VPIC Decoder
 * Extracts all 150+ available data points from VPIC API
 * https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}?format=json
 */

import axios from 'axios';

const NHTSA_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';

// Helper to safely extract values from NHTSA DecodeVinValues response
// The DecodeVinValues endpoint returns a flattened object with direct properties
function findValue(result: any, variable: string): string | null {
  // Try exact match first
  if (result[variable] !== undefined && result[variable] !== null) {
    const value = result[variable];
    if (value === 'Not Applicable' || value === '' || value === null) return null;
    return String(value);
  }
  
  // Try camelCase version (Model Year -> ModelYear)
  const camelCase = variable.replace(/\s+/g, '').replace(/\([^)]*\)/g, '');
  if (result[camelCase] !== undefined && result[camelCase] !== null) {
    const value = result[camelCase];
    if (value === 'Not Applicable' || value === '' || value === null) return null;
    return String(value);
  }
  
  // Try with parentheses removed and spaces as underscores
  const withUnderscores = variable.replace(/\s+/g, '_').replace(/[()]/g, '');
  if (result[withUnderscores] !== undefined && result[withUnderscores] !== null) {
    const value = result[withUnderscores];
    if (value === 'Not Applicable' || value === '' || value === null) return null;
    return String(value);
  }
  
  return null;
}

function findValueInt(result: any, variable: string): number | null {
  const value = findValue(result, variable);
  if (!value || value === 'Not Applicable' || value === '') return null;
  const parsed = parseInt(value.replace(/[^\d]/g, ''), 10);
  return isNaN(parsed) ? null : parsed;
}

function findValueFloat(result: any, variable: string): number | null {
  const value = findValue(result, variable);
  if (!value || value === 'Not Applicable' || value === '') return null;
  const parsed = parseFloat(value.replace(/[^\d.]/g, ''));
  return isNaN(parsed) ? null : parsed;
}

export interface NHTSAVehicleData {
  // Basic Identity
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  series: string | null;
  
  // Vehicle Classification
  vehicleType: string | null;           // Truck, Multipurpose, Passenger Car
  bodyClass: string | null;             // Cutaway, Cab Chassis, Van
  bodyStyle: string | null;
  cabType: string | null;               // Regular, Extended, Crew
  doors: number | null;
  
  // Dimensions & Capacity
  wheelbase: number | null;             // inches
  wheelbaseType: string | null;        // Short, Standard, Extended
  trackWidth: number | null;           // inches
  bedLength: number | null;            // inches
  bedType: string | null;
  overallLength: number | null;        // inches
  overallWidth: number | null;         // inches
  overallHeight: number | null;        // inches
  curbWeight: number | null;           // lbs
  gvwr: number | null;                 // lbs
  gvwrRange: string | null;            // e.g., "6001 - 7000 lb"
  payloadCapacity: number | null;      // lbs
  
  // GAWR Fields (CRITICAL for commercial vehicles)
  gawrFront: number | null;            // Front Gross Axle Weight Rating (lbs)
  gawrRear: number | null;             // Rear Gross Axle Weight Rating (lbs)
  gawrRearDualOrSingle: string | null; // Dual vs Single rear axle
  
  // Towing
  towingCapacity: number | null;        // lbs
  trailerWeight: number | null;         // lbs
  tongueWeight: number | null;         // lbs
  
  // Fuel
  fuelTankCapacityGallons: number | null; // gallons
  
  // Seating
  seatingCapacity: number | null;
  seatingRows: number | null;
  
  // Engine & Powertrain
  engineModel: string | null;
  engineManufacturer: string | null;
  engineConfiguration: string | null;  // V-Shape, In-Line
  engineCylinders: number | null;
  displacementL: number | null;
  displacementCI: number | null;
  displacementCC: number | null;
  fuelTypePrimary: string | null;
  fuelTypeSecondary: string | null;    // For flex-fuel/hybrid
  electrificationLevel: string | null; // BEV, PHEV, HEV, etc.
  evDriveUnit: string | null;          // Single Motor, Dual Motor
  batteryType: string | null;
  batteryKWh: number | null;
  batteryVoltage: number | null;
  chargerLevel: string | null;
  chargingTimeL2Hours: number | null;
  chargingTimeDCFastMinutes: number | null;
  
  // Performance
  turbo: string | null;
  engineHP: number | null;
  engineKW: number | null;
  
  // Transmission & Drivetrain
  transmission: string | null;
  transmissionStyle: string | null;    // Automatic, Manual, CVT
  transmissionSpeeds: number | null;
  driveType: string | null;            // RWD, AWD, 4WD, FWD
  
  // Axle & Wheels
  axleConfiguration: string | null;
  axles: number | null;
  wheels: string | null;               // Dual Rear Wheels vs Single
  rearAxleType: string | null;
  frontBrakeType: string | null;
  rearBrakeType: string | null;
  wheelSizeFront: string | null;
  wheelSizeRear: string | null;
  
  // Safety Features
  abs: string | null;
  esc: string | null;                  // Electronic Stability Control
  tractionControl: string | null;
  airBagLocations: string[] | null;
  seatBelts: string | null;
  pretensioner: string | null;
  
  // Commercial Vehicle Specific
  busType: string | null;
  busFloorConfig: string | null;
  customMotorcycleType: string | null;
  motorcycleChassisType: string | null;
  trailerType: string | null;
  trailerBodyType: string | null;
  trailerLength: number | null;
  
  // Manufacturing
  manufacturer: string | null;
  manufacturerId: number | null;
  plantCity: string | null;
  plantState: string | null;
  plantCountry: string | null;
  plantCompanyName: string | null;
  
  // Other
  entertainmentSystem: string | null;
  steeringLocation: string | null;
  
  // Technology & Safety Features
  bluetoothCapable: string | null;
  navigation: string | null;
  backupCamera: string | null;
  tpms: string | null;                  // Tire Pressure Monitoring System
  
  // Metadata
  errorCode: string | null;
  errorText: string | null;
  suggestedVin: string | null;
}

/**
 * Decode a VIN using NHTSA VPIC API (DecodeVinValues endpoint for flattened response)
 */
export async function decodeVINFromNHTSA(vin: string): Promise<NHTSAVehicleData> {
  // Validate VIN format
  if (!vin || vin.length !== 17) {
    throw new Error('VIN must be exactly 17 characters');
  }

  // VIN validation regex (excludes I, O, Q)
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  if (!vinRegex.test(vin)) {
    throw new Error('Invalid VIN format. VINs cannot contain I, O, or Q');
  }

  try {
    // Use DecodeVinValues for flattened response (easier to parse)
    const url = `${NHTSA_BASE_URL}/DecodeVinValues/${vin}?format=json`;
    console.log(`[NHTSA] Fetching VIN data from: ${url}`);
    
    const response = await axios.get(url, { 
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log(`[NHTSA] Response status: ${response.status}`);
    console.log(`[NHTSA] Response data structure:`, {
      hasData: !!response.data,
      hasResults: !!response.data?.Results,
      resultsLength: response.data?.Results?.length || 0,
    });

    const results = response.data?.Results?.[0];
    
    if (!results) {
      console.error('[NHTSA] No results in response:', {
        data: response.data,
        results: response.data?.Results,
      });
      throw new Error('No data returned from VIN decoder. The VIN may be invalid or not found in the database.');
    }

    // Check for errors
    const errorCode = results.ErrorCode;
    const errorText = results.ErrorText;
    
    if (errorCode && errorCode !== '0' && errorCode !== '0 - VIN decoded clean. Check Digit (9th position) is correct') {
      console.warn('[NHTSA] Decode warning:', { errorCode, errorText });
      // Don't throw here - some warnings are non-fatal, but log them
      if (errorCode.startsWith('1') || errorCode.startsWith('2')) {
        // Error codes starting with 1 or 2 are usually fatal
        throw new Error(`NHTSA decode error: ${errorText || 'Invalid VIN or data not available'}`);
      }
    }

    // Debug: Log available keys to help troubleshoot
    if (process.env.NODE_ENV === 'development') {
      console.log('[NHTSA] API Response keys:', Object.keys(results).slice(0, 20).join(', '), '...');
      console.log('[NHTSA] Sample data:', {
        ModelYear: results.ModelYear,
        Make: results.Make,
        Model: results.Model,
        ErrorCode: results.ErrorCode,
      });
    }

    // Extract all fields - DecodeVinValues returns direct properties
    // The API returns properties in various formats, so we try multiple variations
    const getValue = (key: string, altKeys?: string[]): string | null => {
      // Try direct property access first (case-sensitive)
      if (results[key] !== undefined && results[key] !== null && 
          results[key] !== 'Not Applicable' && results[key] !== '') {
        return String(results[key]);
      }
      
      // Try case-insensitive search
      const lowerKey = key.toLowerCase();
      for (const prop in results) {
        if (prop.toLowerCase() === lowerKey && 
            results[prop] !== 'Not Applicable' && results[prop] !== '' && results[prop] !== null) {
          return String(results[prop]);
        }
      }
      
      // Try alternative keys
      if (altKeys) {
        for (const altKey of altKeys) {
          if (results[altKey] !== undefined && results[altKey] !== null &&
              results[altKey] !== 'Not Applicable' && results[altKey] !== '') {
            return String(results[altKey]);
          }
          // Also try case-insensitive for alt keys
          const lowerAltKey = altKey.toLowerCase();
          for (const prop in results) {
            if (prop.toLowerCase() === lowerAltKey && 
                results[prop] !== 'Not Applicable' && results[prop] !== '' && results[prop] !== null) {
              return String(results[prop]);
            }
          }
        }
      }
      return null;
    };

    const getInt = (key: string, altKeys?: string[]): number | null => {
      const value = getValue(key, altKeys);
      if (!value) return null;
      
      // Handle ranges (e.g., "26001 - 7000") - take the first value
      // Handle comma-separated values (e.g., "26001, 7000, 27223") - take the first value
      // Handle single values with units (e.g., "26001 lbs") - extract just the number
      let cleanValue = String(value).trim();
      
      // If it contains a range indicator (dash, hyphen, or "to"), take the first part
      if (cleanValue.includes('-') || cleanValue.includes('–') || cleanValue.toLowerCase().includes('to')) {
        const parts = cleanValue.split(/[-–]|to/i);
        cleanValue = parts[0].trim();
      }
      
      // If it contains commas, take the first value
      if (cleanValue.includes(',')) {
        const parts = cleanValue.split(',');
        cleanValue = parts[0].trim();
      }
      
      // Extract just the numeric part (allows for units like "lbs" or "kg")
      // Match the first sequence of digits
      const match = cleanValue.match(/^(\d+)/);
      if (!match) return null;
      
      const parsed = parseInt(match[1], 10);
      return isNaN(parsed) ? null : parsed;
    };

    const getFloat = (key: string, altKeys?: string[]): number | null => {
      const value = getValue(key, altKeys);
      if (!value) return null;
      const parsed = parseFloat(String(value).replace(/[^\d.]/g, ''));
      return isNaN(parsed) ? null : parsed;
    };

    const data: NHTSAVehicleData = {
      // Basic Identity
      year: getInt('ModelYear', ['Model_Year', 'Model Year']),
      make: getValue('Make') || null,
      model: getValue('Model') || null,
      trim: getValue('Trim') || null,
      series: getValue('Series') || null,
      
      // Vehicle Classification
      vehicleType: getValue('VehicleType', ['Vehicle_Type', 'Vehicle Type']) || null,
      bodyClass: getValue('BodyClass', ['Body_Class', 'Body Class']) || null,
      bodyStyle: getValue('BodyType', ['Body_Type', 'Body Type']) || null,
      cabType: getValue('CabType', ['Cab_Type', 'Cab Type']) || null,
      doors: getInt('Doors') || null,
      
      // Dimensions & Capacity
      wheelbase: getFloat('WheelBase', ['Wheelbase', 'Wheelbase_inches', 'Wheelbase (inches)']) || null,
      wheelbaseType: getValue('WheelBaseType', ['Wheelbase_Type', 'Wheelbase Type']) || null,
      trackWidth: getFloat('TrackWidth', ['Track_Width', 'Track Width (inches)']) || null,
      bedLength: getFloat('BedLength', ['Bed_Length', 'Bed Length (inches)']) || null,
      bedType: getValue('BedType', ['Bed_Type', 'Bed Type']) || null,
      overallLength: getFloat('OverallLength', ['Overall_Length', 'Overall Length (inches)']) || null,
      overallWidth: getFloat('OverallWidth', ['Overall_Width', 'Overall Width (inches)']) || null,
      overallHeight: getFloat('OverallHeight', ['Overall_Height', 'Overall Height (inches)']) || null,
      curbWeight: getInt('CurbWeight', ['Curb_Weight', 'Curb Weight (lbs)']) || null,
      gvwr: getInt('GVWR', ['Gross_Vehicle_Weight_Rating_GVWR', 'Gross Vehicle Weight Rating (GVWR)']) || null,
      gvwrRange: getValue('GVWRRange', ['GVWR_Range', 'GVWR Range']) || null,
      payloadCapacity: null, // Will be calculated
      
      // GAWR - CRITICAL for weight distribution and equipment compatibility
      gawrFront: getInt('GAWR_Front', ['GAWRFront', 'Gross_Axle_Weight_Rating_GAWR_Front', 'Gross Axle Weight Rating (GAWR) - Front']) || null,
      gawrRear: getInt('GAWR_Rear', ['GAWRRear', 'Gross_Axle_Weight_Rating_GAWR_Rear', 'Gross Axle Weight Rating (GAWR) - Rear']) || null,
      gawrRearDualOrSingle: getValue('GAWR_Rear_Dual_Single', ['GAWRRearDualOrSingle', 'GAWR Rear (lbs) Dual/Single']) || null,
      
      // Towing
      towingCapacity: getInt('TrailerTypeConnection', ['TowingCapacity', 'Towing Capacity', 'Maximum Towing Capacity (lbs)']) || null,
      trailerWeight: getInt('TrailerWeightRating', ['TrailerWeight', 'Trailer Weight Rating']) || null,
      tongueWeight: getInt('TongueWeight', ['Tongue_Weight', 'Maximum Tongue Weight (lbs)']) || null,
      
      // Fuel
      fuelTankCapacityGallons: getFloat('FuelTankCapacity', ['Fuel_Tank_Capacity_gallons', 'Fuel Tank Capacity (gallons)']) || null,
      
      // Seating
      seatingCapacity: getInt('SeatingCapacity', ['Seating_Capacity', 'Seating Capacity']) || null,
      seatingRows: getInt('SeatRows', ['Number_of_Seat_Rows', 'Number of Seat Rows']) || null,
      
      // Engine & Powertrain
      engineModel: getValue('EngineModel', ['Engine_Model', 'Engine Model']) || null,
      engineManufacturer: getValue('EngineManufacturer', ['Engine_Manufacturer', 'Engine Manufacturer']) || null,
      engineConfiguration: getValue('EngineConfiguration', ['Engine_Configuration', 'Engine Configuration']) || null,
      engineCylinders: getInt('EngineCylinders', ['Engine_Number_of_Cylinders', 'Engine Number of Cylinders']) || null,
      displacementL: getFloat('DisplacementL', ['Displacement_L', 'Displacement (L)']) || null,
      displacementCI: getFloat('DisplacementCI', ['Displacement_CI', 'Displacement (CI)']) || null,
      displacementCC: getFloat('DisplacementCC', ['Displacement_CC', 'Displacement (CC)']) || null,
      fuelTypePrimary: getValue('FuelTypePrimary', ['Fuel_Type_Primary', 'Fuel Type - Primary']) || null,
      fuelTypeSecondary: getValue('FuelTypeSecondary', ['Fuel_Type_Secondary', 'Fuel Type - Secondary']) || null,
      electrificationLevel: getValue('ElectrificationLevel', ['Electrification_Level', 'Electrification Level']) || null,
      evDriveUnit: getValue('EVDriveUnit', ['EV_Drive_Unit', 'EV Drive Unit']) || null,
      batteryType: getValue('BatteryType', ['Battery_Type', 'Battery Type']) || null,
      batteryKWh: getFloat('BatteryEnergy', ['Battery_Energy_kWh', 'Battery Energy (kWh)']) || null,
      batteryVoltage: getFloat('BatteryVoltage', ['Battery_Voltage_V', 'Battery Voltage (V)']) || null,
      chargerLevel: getValue('ChargerLevel', ['Charger_Level', 'Charger Level']) || null,
      chargingTimeL2Hours: getFloat('ChargingTimeLevel2', ['Charging_Time_hours_Level_2', 'Charging Time (hours) - Level 2']) || null,
      chargingTimeDCFastMinutes: getFloat('ChargingTimeDCFast', ['Charging_Time_minutes_DC_Fast', 'Charging Time (minutes) - DC Fast']) || null,
      
      // Performance
      turbo: getValue('Turbo') || null,
      engineHP: getInt('EngineHP', ['Engine_Brake_hp_From', 'Engine Brake (hp) From']) || null,
      engineKW: getInt('EngineKW', ['Engine_Power_kW', 'Engine Power (kW)']) || null,
      
      // Transmission & Drivetrain
      transmission: getValue('Transmission') || null,
      transmissionStyle: getValue('TransmissionStyle', ['Transmission_Style', 'Transmission Style']) || null,
      transmissionSpeeds: getInt('TransmissionSpeeds', ['Transmission_Speeds', 'Transmission Speeds']) || null,
      driveType: getValue('DriveType', ['Drive_Type', 'Drive Type']) || null,
      
      // Axle & Wheels
      axleConfiguration: getValue('AxleConfiguration', ['Axle_Configuration', 'Axle Configuration']) || null,
      axles: getInt('Axles', ['Number_of_Axles', 'Number of Axles']) || null,
      wheels: getValue('Wheels') || null,
      rearAxleType: getValue('RearAxleType', ['Rear_Axle_Type', 'Rear Axle Type']) || null,
      frontBrakeType: getValue('BrakeSystemType', ['Brake_System_Type', 'Brake System Type']) || null,
      rearBrakeType: getValue('BrakeSystemType', ['Brake_System_Type', 'Brake System Type']) || null,
      wheelSizeFront: getValue('WheelSizeFront', ['Wheel_Size_Front_inches', 'Wheel Size Front (inches)']) || null,
      wheelSizeRear: getValue('WheelSizeRear', ['Wheel_Size_Rear_inches', 'Wheel Size Rear (inches)']) || null,
      
      // Safety Features
      abs: getValue('ABS') || null,
      esc: getValue('ESC', ['Electronic_Stability_Control_ESC', 'Electronic Stability Control (ESC)']) || null,
      tractionControl: getValue('TractionControl', ['Traction_Control', 'Traction Control']) || null,
      airBagLocations: getValue('AirBagLocations', ['Air_Bag_Locations', 'Air Bag Locations'])?.split(',').map(s => s.trim()).filter(Boolean) || null,
      seatBelts: getValue('SeatBelts', ['Seat_Belts', 'Seat Belts']) || null,
      pretensioner: getValue('Pretensioner') || null,
      
      // Commercial Vehicle Specific
      busType: getValue('BusType', ['Bus_Type', 'Bus Type']) || null,
      busFloorConfig: getValue('BusFloorConfiguration', ['Bus_Floor_Configuration', 'Bus Floor Configuration']) || null,
      customMotorcycleType: getValue('CustomMotorcycleType', ['Custom_Motorcycle_Type', 'Custom Motorcycle Type']) || null,
      motorcycleChassisType: getValue('MotorcycleChassisType', ['Motorcycle_Chassis_Type', 'Motorcycle Chassis Type']) || null,
      trailerType: getValue('TrailerType', ['Trailer_Type', 'Trailer Type']) || null,
      trailerBodyType: getValue('TrailerBodyType', ['Trailer_Body_Type', 'Trailer Body Type']) || null,
      trailerLength: getFloat('TrailerLength', ['Trailer_Length_feet', 'Trailer Length (feet)']) || null,
      
      // Manufacturing
      manufacturer: getValue('ManufacturerName', ['Manufacturer_Name', 'Manufacturer Name']) || null,
      manufacturerId: getInt('ManufacturerId', ['Manufacturer_ID', 'Manufacturer ID']) || null,
      plantCity: getValue('PlantCity', ['Plant_City', 'Plant City']) || null,
      plantState: getValue('PlantState', ['Plant_State', 'Plant State']) || null,
      plantCountry: getValue('PlantCountry', ['Plant_Country', 'Plant Country']) || null,
      plantCompanyName: getValue('PlantCompanyName', ['Plant_Company_Name', 'Plant Company Name']) || null,
      
      // Other
      entertainmentSystem: getValue('EntertainmentSystem', ['Entertainment_System', 'Entertainment System']) || null,
      steeringLocation: getValue('SteeringLocation', ['Steering_Location', 'Steering Location']) || null,
      
      // Technology & Safety Features
      bluetoothCapable: getValue('Bluetooth', ['BluetoothCapability', 'Bluetooth Capability', 'Bluetooth Enabled']) || null,
      navigation: getValue('Navigation', ['NavigationSystem', 'Navigation System', 'GPS Navigation']) || null,
      backupCamera: getValue('BackupCamera', ['Backup_Camera', 'Backup Camera', 'Rear View Camera', 'Backup Camera System']) || null,
      tpms: getValue('TPMS', ['Tire_Pressure_Monitoring_System_TPMS', 'Tire Pressure Monitoring System (TPMS)', 'Tire Pressure Monitoring']) || null,
      
      // Metadata
      errorCode: results.ErrorCode || null,
      errorText: results.ErrorText || null,
      suggestedVin: results.SuggestedVIN || null,
    };

    // Calculate payload capacity
    if (data.gvwr && data.curbWeight) {
      data.payloadCapacity = data.gvwr - data.curbWeight;
    }

    console.log('[NHTSA] Successfully parsed VIN data:', {
      year: data.year,
      make: data.make,
      model: data.model,
      hasGVWR: !!data.gvwr,
      hasEngine: !!data.engineModel,
    });

    return data;
  } catch (error: any) {
    console.error('[NHTSA] VIN decode error:', error);
    console.error('[NHTSA] Error details:', {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      } : null,
    });
    
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      const errorData = error.response.data;
      
      if (status === 404) {
        throw new Error('VIN not found in NHTSA database. Please verify the VIN is correct.');
      } else if (status === 429) {
        throw new Error('Too many requests to NHTSA API. Please try again in a moment.');
      } else if (status >= 500) {
        throw new Error(`NHTSA service error (${status}). Please try again later.`);
      } else {
        throw new Error(`NHTSA API error: ${status} ${statusText}`);
      }
    }
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to NHTSA service. Please check your internet connection.');
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new Error('Request to NHTSA service timed out. Please try again.');
    }
    
    if (error instanceof Error) {
      throw new Error(`Failed to decode VIN from NHTSA: ${error.message}`);
    }
    
    throw new Error('Failed to decode VIN. Please try again or enter manually.');
  }
}

/**
 * Calculate derived fields and normalize data
 */
export function enrichNHTSAData(data: NHTSAVehicleData): NHTSAVehicleData {
  // Calculate payload capacity if not already set
  if (!data.payloadCapacity && data.gvwr && data.curbWeight) {
    data.payloadCapacity = data.gvwr - data.curbWeight;
  }
  
  // Normalize fuel type
  if (data.fuelTypePrimary) {
    const fuelMap: Record<string, string> = {
      'Gasoline': 'gasoline',
      'Diesel': 'diesel',
      'Electric': 'electric',
      'Compressed Natural Gas (CNG)': 'cng',
      'Liquefied Petroleum Gas (Propane or LPG)': 'propane',
      'Hydrogen': 'hydrogen',
      'E85': 'flex_fuel',
      'Hybrid': 'hybrid',
    };
    const normalized = fuelMap[data.fuelTypePrimary] || data.fuelTypePrimary.toLowerCase();
    data.fuelTypePrimary = normalized;
  }
  
  // Normalize drive type
  if (data.driveType) {
    const driveMap: Record<string, string> = {
      'Rear Wheel Drive': 'RWD',
      'Front Wheel Drive': 'FWD',
      'All Wheel Drive': 'AWD',
      '4-Wheel Drive': '4WD',
      '4WD': '4WD',
      'RWD': 'RWD',
      'FWD': 'FWD',
      'AWD': 'AWD',
    };
    data.driveType = driveMap[data.driveType] || data.driveType;
  }
  
  return data;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use decodeVINFromNHTSA instead
 */
export async function decodeVIN(vin: string): Promise<any> {
  const nhtsaData = await decodeVINFromNHTSA(vin);
  const enriched = enrichNHTSAData(nhtsaData);
  
  // Map to legacy format for backward compatibility
  return {
    vin,
    year: enriched.year || new Date().getFullYear(),
    make: enriched.make || '',
    model: enriched.model || '',
    series: enriched.series || enriched.trim || undefined,
    bodyStyle: enriched.bodyClass || enriched.bodyStyle || undefined,
    fuelType: (enriched.fuelTypePrimary as any) || 'gasoline',
    wheelbase: enriched.wheelbase || undefined,
    gvwr: enriched.gvwr || undefined,
    payload: enriched.payloadCapacity || undefined,
    engineDescription: enriched.engineModel || enriched.engineConfiguration || undefined,
    transmission: enriched.transmission || enriched.transmissionStyle || undefined,
    driveType: (enriched.driveType as any) || undefined,
    heightType: enriched.overallHeight ? 
      (enriched.overallHeight < 80 ? 'Low Roof' : 
       enriched.overallHeight < 90 ? 'Medium Roof' : 'High Roof') : undefined,
    axleDescription: enriched.axleConfiguration || undefined,
    rearWheels: enriched.wheels?.includes('Dual') ? 'DRW' : 
                 enriched.wheels?.includes('Single') ? 'SRW' : undefined,
    batteryVoltage: enriched.batteryVoltage || undefined,
    torqueFtLbs: undefined, // Not available from NHTSA
    horsepower: enriched.engineHP || undefined,
    mpgCity: undefined, // Not available from NHTSA - use EPA
    mpgHighway: undefined, // Not available from NHTSA - use EPA
    mpge: undefined, // Not available from NHTSA - use EPA
    lengthInches: enriched.overallLength || undefined,
    widthInches: enriched.overallWidth || undefined,
    heightInches: enriched.overallHeight || undefined,
    baseCurbWeightLbs: enriched.curbWeight || undefined,
    seatingCapacity: enriched.seatingCapacity || 2,
    dataSource: 'vin_decode' as const,
  };
}
