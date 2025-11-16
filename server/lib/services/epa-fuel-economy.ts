/**
 * EPA Fuel Economy API Integration
 * Provides MPG, emissions, and detailed powertrain data
 * https://www.fueleconomy.gov/ws/rest/
 */

import axios from 'axios';

const EPA_BASE_URL = 'https://www.fueleconomy.gov/ws/rest';

export interface EPAVehicleData {
  // Fuel Economy
  mpgCity: number | null;
  mpgHighway: number | null;
  mpgCombined: number | null;
  mpge: number | null;                  // Miles per gallon equivalent (EVs/PHEVs)
  
  // Electric Vehicle Specific
  electricRange: number | null;          // miles
  batteryCapacityKWh: number | null;
  chargeTime240V: number | null;        // hours
  chargeTime240VDCFast: number | null;  // hours
  
  // Costs & Emissions
  annualFuelCostEstimate: number | null;
  co2Emissions: number | null;          // grams/mile
  co2EmissionsCity: number | null;
  co2EmissionsHighway: number | null;
  
  // Detailed Engine Info
  fuelType: string | null;
  fuelType1: string | null;
  fuelType2: string | null;
  engineDescription: string | null;
  transmissionDescription: string | null;
  driveType: string | null;
  cylinders: number | null;
  displacementL: number | null;
  
  // EPA IDs for reference
  epaId: number | null;
  atvType: string | null;
}

interface EPAMenuOption {
  text: string;
  value: string;
}

/**
 * Search for EPA vehicle ID by year, make, model
 * Returns array of possible matches
 */
export async function findEPAVehicleId(
  year: number,
  make: string,
  model: string
): Promise<number | null> {
  try {
    // Step 1: Get menu options for this year/make/model
    const optionsResponse = await axios.get<{ menuItem: EPAMenuOption[] }>(
      `${EPA_BASE_URL}/vehicle/menu/options`,
      {
        params: { year, make, model },
        timeout: 10000,
      }
    );
    
    if (!optionsResponse.data?.menuItem || optionsResponse.data.menuItem.length === 0) {
      console.log('No EPA data found for', year, make, model);
      return null;
    }
    
    // Return the first match (most common configuration)
    const firstOption = optionsResponse.data.menuItem[0];
    const epaId = parseInt(firstOption.value);
    
    if (isNaN(epaId)) {
      return null;
    }
    
    return epaId;
    
  } catch (error: any) {
    console.error('EPA vehicle ID lookup error:', error);
    return null;
  }
}

/**
 * Get detailed vehicle data from EPA by vehicle ID
 */
export async function getEPAVehicleData(epaId: number): Promise<EPAVehicleData | null> {
  try {
    const response = await axios.get(
      `${EPA_BASE_URL}/vehicle/${epaId}`,
      { timeout: 10000 }
    );
    
    const data = response.data;
    
    return {
      // Fuel Economy
      mpgCity: data.city08 || null,
      mpgHighway: data.highway08 || null,
      mpgCombined: data.comb08 || null,
      mpge: data.cityE || data.city08 || null, // cityE for EVs
      
      // Electric Vehicle Specific
      electricRange: data.rangeElectric || data.range || null,
      batteryCapacityKWh: data.batteryA || null,
      chargeTime240V: data.chargeTime240 || null,
      chargeTime240VDCFast: null, // Not provided by EPA API
      
      // Costs & Emissions
      annualFuelCostEstimate: data.fuelCostA08 || data.fuelCost08 || null,
      co2Emissions: data.co2 || null,
      co2EmissionsCity: data.co2TailpipeGpm || null,
      co2EmissionsHighway: null, // Not separately provided
      
      // Detailed Engine Info
      fuelType: data.fuelType || data.fuelType1 || null,
      fuelType1: data.fuelType1 || null,
      fuelType2: data.fuelType2 || null,
      engineDescription: data.evMotor || data.eng_dscr || null,
      transmissionDescription: data.trany || null,
      driveType: data.drive || null,
      cylinders: data.cylinders || null,
      displacementL: data.displ || null,
      
      // EPA IDs
      epaId: data.id || epaId,
      atvType: data.atvType || null,
    };
    
  } catch (error: any) {
    console.error('EPA vehicle data fetch error:', error);
    return null;
  }
}

/**
 * Main function: Get EPA data for a vehicle
 * Combines ID lookup + data fetch
 */
export async function getEPADataForVehicle(
  year: number,
  make: string,
  model: string
): Promise<EPAVehicleData | null> {
  try {
    // Find EPA ID
    const epaId = await findEPAVehicleId(year, make, model);
    if (!epaId) {
      return null;
    }
    
    // Fetch detailed data
    return await getEPAVehicleData(epaId);
    
  } catch (error: any) {
    console.error('EPA data retrieval error:', error);
    return null;
  }
}

/**
 * Normalize EPA fuel type to our schema
 */
export function normalizeEPAFuelType(epaFuelType: string | null): string {
  if (!epaFuelType) return 'gasoline';
  
  const fuelMap: Record<string, string> = {
    'Regular Gasoline': 'gasoline',
    'Premium Gasoline': 'gasoline',
    'Diesel': 'diesel',
    'Electricity': 'electric',
    'Compressed Natural Gas': 'cng',
    'E85': 'flex_fuel',
    'Hybrid': 'hybrid',
  };
  
  return fuelMap[epaFuelType] || epaFuelType.toLowerCase();
}

