import { getSupabaseClient } from './supabase';
import { handleSupabaseError } from './errorHandler';

export interface VINDecodeResult {
  success: boolean;
  data?: {
    year: number;
    make: string;
    model: string;
    series?: string;
    bodyStyle?: string;
    gvwr?: number;
    payload?: number;
    engine?: string;
    transmission?: string;
    driveType?: string;
    fuelType?: string;
    mpgCity?: number;
    mpgHighway?: number;
    enrichmentMetadata: {
      nhtsaConfidence: 'high' | 'medium' | 'low';
      epaAvailable: boolean;
      decodedAt: string;
      dataSources: string[];
    };
  };
  error?: string;
}

export async function decodeVIN(vin: string): Promise<VINDecodeResult> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('decode-vin', {
      body: { vin },
    });

    if (error) throw handleSupabaseError(error);
    return data as VINDecodeResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to decode VIN',
    };
  }
}

