import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NHTSA_API = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';
const EPA_API = 'https://www.fueleconomy.gov/ws/rest/vehicle';

interface VINDecodeResult {
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
    // Additional fields
    enrichmentMetadata: {
      nhtsaConfidence: 'high' | 'medium' | 'low';
      epaAvailable: boolean;
      decodedAt: string;
      dataSources: string[];
    };
  };
  error?: string;
}

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    const { vin } = await req.json();

    if (!vin || vin.length !== 17) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid VIN' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Decode from NHTSA
    const nhtsaResponse = await fetch(`${NHTSA_API}/${vin}?format=json`);
    const nhtsaData = await nhtsaResponse.json();

    const result = nhtsaData.Results?.[0];

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: 'No data found for VIN' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Try to get EPA data
    let epaData = null;
    try {
      const epaResponse = await fetch(
        `${EPA_API}/${result.ModelYear}/${result.Make}/${result.Model}`
      );
      if (epaResponse.ok) {
        epaData = await epaResponse.json();
      }
    } catch (e) {
      console.log('EPA data not available');
    }

    const decodeResult: VINDecodeResult = {
      success: true,
      data: {
        year: parseInt(result.ModelYear) || 0,
        make: result.Make || '',
        model: result.Model || '',
        series: result.Series || undefined,
        bodyStyle: result.BodyClass || undefined,
        gvwr: result.GVWR ? parseInt(result.GVWR) : undefined,
        engine: result.EngineModel || undefined,
        transmission: result.TransmissionStyle || undefined,
        driveType: result.DriveType || undefined,
        fuelType: result.FuelTypePrimary || undefined,
        mpgCity: epaData?.city08 ? parseFloat(epaData.city08) : undefined,
        mpgHighway: epaData?.highway08 ? parseFloat(epaData.highway08) : undefined,
        enrichmentMetadata: {
          nhtsaConfidence: result.ErrorCode === '0' ? 'high' : 'low',
          epaAvailable: !!epaData,
          decodedAt: new Date().toISOString(),
          dataSources: ['nhtsa', epaData ? 'epa' : null].filter(Boolean) as string[],
        },
      },
    };

    return new Response(JSON.stringify(decodeResult), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('VIN decode error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

