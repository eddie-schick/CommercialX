import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';

export interface SearchFilters {
  makes?: string[];
  years?: [number, number];
  priceRange?: [number, number];
  mileageRange?: [number, number];
  gvwrClasses?: string[];
  equipmentTypes?: string[];
  locations?: { city: string; state: string; radiusMiles: number }[];
  conditions?: string[];
  features?: string[];
  sortBy?: 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc' | 'created_desc';
}

interface SearchResults {
  listings: any[];
  totalCount: number;
  facets: {
    makes: { value: string; count: number }[];
    years: { value: number; count: number }[];
    conditions: { value: string; count: number }[];
  };
}

export function useAdvancedListingSearch() {
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async (filters: SearchFilters, page = 1, pageSize = 20) => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Build complex query
      let query = supabase
        .from('"02a. Dealership".vehicle_listings')
        .select(
          `
          *,
          dealer:dealers(*),
          complete_configuration:complete_configurations(
            *,
            vehicle_config:vehicle_config(
              *,
              vehicle:vehicle(*)
            ),
            equipment_config:equipment_config(
              *,
              equipment:equipment(*)
            )
          ),
          images:listing_images(*)
        `,
          { count: 'exact' }
        )
        .eq('status', 'available');

      // Apply filters
      if (filters.makes?.length) {
        // Note: This requires proper join or RPC function
        // For now, we'll filter after fetch or use RPC
        query = query.in('complete_configuration.vehicle_config.vehicle.make_name', filters.makes);
      }

      if (filters.years) {
        const [minYear, maxYear] = filters.years;
        query = query
          .gte('complete_configuration.vehicle_config.vehicle.year', minYear)
          .lte('complete_configuration.vehicle_config.vehicle.year', maxYear);
      }

      if (filters.priceRange) {
        const [minPrice, maxPrice] = filters.priceRange;
        query = query.gte('asking_price', minPrice).lte('asking_price', maxPrice);
      }

      if (filters.mileageRange) {
        const [minMileage, maxMileage] = filters.mileageRange;
        query = query.gte('mileage', minMileage).lte('mileage', maxMileage);
      }

      if (filters.conditions?.length) {
        query = query.in('condition', filters.conditions);
      }

      // Sorting
      switch (filters.sortBy) {
        case 'price_asc':
          query = query.order('asking_price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('asking_price', { ascending: false });
          break;
        case 'year_desc':
          query = query.order('complete_configuration.vehicle_config.vehicle.year', { ascending: false });
          break;
        case 'mileage_asc':
          query = query.order('mileage', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: queryError, count } = await query;

      if (queryError) throw handleSupabaseError(queryError);

      // Fetch facets in parallel (if RPC functions exist)
      // For now, we'll calculate from results
      const makesMap = new Map<string, number>();
      const yearsMap = new Map<number, number>();
      const conditionsMap = new Map<string, number>();

      (data || []).forEach((listing: any) => {
        const make = listing.complete_configuration?.vehicle_config?.vehicle?.make_name;
        if (make) {
          makesMap.set(make, (makesMap.get(make) || 0) + 1);
        }

        const year = listing.complete_configuration?.vehicle_config?.vehicle?.year;
        if (year) {
          yearsMap.set(year, (yearsMap.get(year) || 0) + 1);
        }

        if (listing.condition) {
          conditionsMap.set(listing.condition, (conditionsMap.get(listing.condition) || 0) + 1);
        }
      });

      setResults({
        listings: data || [],
        totalCount: count || 0,
        facets: {
          makes: Array.from(makesMap.entries()).map(([value, count]) => ({ value, count })),
          years: Array.from(yearsMap.entries()).map(([value, count]) => ({ value, count })),
          conditions: Array.from(conditionsMap.entries()).map(([value, count]) => ({ value, count })),
        },
      });
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Search failed'));
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

