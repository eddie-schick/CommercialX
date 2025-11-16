/**
 * NHTSA Makes API
 * Fetches vehicle makes from NHTSA VPIC API
 * https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json
 */

const NHTSA_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';

export interface NHTSAMake {
  Make_ID: number;
  Make_Name: string;
}

export interface NHTSAMakesResponse {
  Count: number;
  Message: string;
  SearchCriteria: string | null;
  Results: NHTSAMake[];
}

/**
 * Get all makes from NHTSA
 * Optionally filter by vehicle type (car, truck, motorcycle, etc.)
 */
export async function getNHTSAMakes(vehicleType?: string): Promise<string[]> {
  try {
    let url = `${NHTSA_BASE_URL}/GetAllMakes?format=json`;
    
    // If vehicle type specified, get makes for that type
    if (vehicleType) {
      url = `${NHTSA_BASE_URL}/GetMakesForVehicleType/${encodeURIComponent(vehicleType)}?format=json`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`NHTSA API error: ${response.status} ${response.statusText}`);
    }

    const data: NHTSAMakesResponse = await response.json();

    if (data.Results && data.Results.length > 0) {
      // Return sorted list of make names
      return data.Results
        .map(make => make.Make_Name)
        .filter((name): name is string => !!name)
        .sort((a, b) => a.localeCompare(b));
    }

    return [];
  } catch (error: any) {
    console.error('NHTSA makes fetch error:', error);
    // Return common commercial vehicle makes as fallback
    return [
      'Ford', 'Freightliner', 'Isuzu', 'Hino', 'Mack', 'Peterbilt', 
      'Kenworth', 'Volvo', 'International', 'Mercedes-Benz', 'Ram', 
      'Chevrolet', 'GMC', 'Nissan', 'Toyota', 'Dodge', 'Mercedes-Benz'
    ];
  }
}

/**
 * Get makes for commercial vehicles (trucks)
 * This is more relevant for CommercialX
 */
export async function getCommercialVehicleMakes(): Promise<string[]> {
  // Try truck first, then fallback to all makes
  const truckMakes = await getNHTSAMakes('truck');
  if (truckMakes.length > 0) {
    return truckMakes;
  }
  
  // Fallback to all makes
  return getNHTSAMakes();
}

/**
 * Get makes with caching
 * In production, you'd want to cache this for 24 hours since makes don't change often
 */
let makesCache: { makes: string[]; timestamp: number } | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function getNHTSAMakesCached(vehicleType?: string): Promise<string[]> {
  const now = Date.now();
  
  // Check cache
  if (makesCache && (now - makesCache.timestamp) < CACHE_DURATION) {
    return makesCache.makes;
  }

  // Fetch fresh data
  const makes = vehicleType === 'truck' 
    ? await getCommercialVehicleMakes()
    : await getNHTSAMakes(vehicleType);

  // Update cache
  makesCache = {
    makes,
    timestamp: now,
  };

  return makes;
}

