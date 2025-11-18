import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';
import type { SearchFilters } from './useAdvancedListingSearch';

interface Location {
  latitude: number;
  longitude: number;
}

export function useGeographicSearch() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const searchNearby = useCallback(
    async (location: Location, radiusMiles: number, filters?: SearchFilters) => {
      setLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseClient();

        // Use PostGIS functions via RPC
        // Note: This requires the RPC function to be created in Supabase
        const { data, error: rpcError } = await supabase.rpc('search_listings_by_proximity', {
          user_lat: location.latitude,
          user_lng: location.longitude,
          radius_miles: radiusMiles,
          filters: filters || {},
        });

        if (rpcError) throw handleSupabaseError(rpcError);
        setResults(data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Geographic search failed'));
        console.error('Geographic search failed:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { results, loading, error, searchNearby };
}

