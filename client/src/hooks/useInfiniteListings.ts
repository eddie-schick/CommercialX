import { useInfiniteQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';
import type { SearchFilters } from './useAdvancedListingSearch';

const PAGE_SIZE = 20;

export function useInfiniteListings(filters: SearchFilters = {}) {
  return useInfiniteQuery(
    ['listings', filters],
    async ({ pageParam = 0 }) => {
      const supabase = getSupabaseClient();
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('"02a. Dealership".vehicle_listings')
        .select('*', { count: 'exact' })
        .eq('status', 'available')
        .range(from, to)
        .order('created_at', { ascending: false });

      // Apply basic filters
      if (filters.priceRange) {
        const [minPrice, maxPrice] = filters.priceRange;
        query = query.gte('asking_price', minPrice).lte('asking_price', maxPrice);
      }

      if (filters.conditions?.length) {
        query = query.in('condition', filters.conditions);
      }

      const { data, error, count } = await query;

      if (error) throw handleSupabaseError(error);

      return {
        listings: data || [],
        nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : undefined,
        totalCount: count || 0,
      };
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextPage,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
}

