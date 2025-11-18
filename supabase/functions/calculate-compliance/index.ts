import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ComplianceRequest {
  vehicleConfigId: number;
  equipmentConfigId?: number;
  selectedVehicleOptions?: number[];
  selectedEquipmentOptions?: number[];
}

interface ComplianceResult {
  gvwrCompliant: boolean;
  gawrFrontCompliant: boolean;
  gawrRearCompliant: boolean;
  totalCombinedWeight: number;
  frontAxleWeight: number;
  rearAxleWeight: number;
  payloadRemaining: number;
  warnings: string[];
  recommendations: string[];
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

    const request: ComplianceRequest = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch vehicle config
    const { data: vehicleConfig, error: vehicleError } = await supabase
      .from('"03. Vehicle Data".vehicle_config')
      .select('*, vehicle:vehicle(*)')
      .eq('id', request.vehicleConfigId)
      .single();

    if (vehicleError || !vehicleConfig) {
      return new Response(
        JSON.stringify({ error: 'Vehicle config not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Fetch equipment config if provided
    let equipmentConfig = null;
    if (request.equipmentConfigId) {
      const { data, error } = await supabase
        .from('"04. Equipment Data".equipment_config')
        .select('*, equipment:equipment(*)')
        .eq('id', request.equipmentConfigId)
        .single();

      if (!error) {
        equipmentConfig = data;
      }
    }

    // Calculate weights (simplified - adjust based on your actual schema)
    const vehicleWeight = vehicleConfig.vehicle?.curb_weight || 0;
    const equipmentWeight = equipmentConfig?.equipment?.weight || 0;
    const totalCombinedWeight = vehicleWeight + equipmentWeight;

    const gvwr = vehicleConfig.vehicle?.gvwr || 0;
    const gawrFront = vehicleConfig.vehicle?.gawr_front || 0;
    const gawrRear = vehicleConfig.vehicle?.gawr_rear || 0;

    // Simplified weight distribution (adjust based on your calculations)
    const frontAxleWeight = totalCombinedWeight * 0.4;
    const rearAxleWeight = totalCombinedWeight * 0.6;

    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check compliance
    const gvwrCompliant = totalCombinedWeight <= gvwr;
    const gawrFrontCompliant = frontAxleWeight <= gawrFront;
    const gawrRearCompliant = rearAxleWeight <= gawrRear;

    if (!gvwrCompliant) {
      warnings.push(`Total weight (${totalCombinedWeight} lbs) exceeds GVWR (${gvwr} lbs)`);
      recommendations.push('Consider reducing payload or selecting a vehicle with higher GVWR');
    }

    if (!gawrFrontCompliant) {
      warnings.push(`Front axle weight (${frontAxleWeight} lbs) exceeds GAWR (${gawrFront} lbs)`);
    }

    if (!gawrRearCompliant) {
      warnings.push(`Rear axle weight (${rearAxleWeight} lbs) exceeds GAWR (${gawrRear} lbs)`);
    }

    const payloadRemaining = gvwr - totalCombinedWeight;

    if (payloadRemaining < 0) {
      recommendations.push('Payload capacity exceeded');
    } else if (payloadRemaining < 500) {
      recommendations.push('Low payload capacity remaining');
    }

    const result: ComplianceResult = {
      gvwrCompliant,
      gawrFrontCompliant,
      gawrRearCompliant,
      totalCombinedWeight,
      frontAxleWeight,
      rearAxleWeight,
      payloadRemaining,
      warnings,
      recommendations,
    };

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Compliance calculation error:', error);
    return new Response(
      JSON.stringify({
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

