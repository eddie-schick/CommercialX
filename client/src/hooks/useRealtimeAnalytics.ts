import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

interface ListingAnalytics {
  listingId: number;
  viewCount: number;
  leadCount: number;
  favoriteCount: number;
}

export function useRealtimeAnalytics(listingId: number) {
  const [analytics, setAnalytics] = useState<ListingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Initial fetch
    async function fetchAnalytics() {
      try {
        const { data, error: fetchError } = await supabase
          .from('"02a. Dealership".vehicle_listings')
          .select('id, view_count, lead_count, favorite_count')
          .eq('id', listingId)
          .single();

        if (fetchError) throw fetchError;

        if (data) {
          setAnalytics({
            listingId: data.id,
            viewCount: data.view_count || 0,
            leadCount: data.lead_count || 0,
            favoriteCount: data.favorite_count || 0,
          });
        }
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    }

    fetchAnalytics();

    // Subscribe to changes
    const channel = supabase
      .channel(`listing_analytics_${listingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: '02a. Dealership',
          table: 'vehicle_listings',
          filter: `id=eq.${listingId}`,
        },
        (payload) => {
          setAnalytics({
            listingId,
            viewCount: payload.new.view_count || 0,
            leadCount: payload.new.lead_count || 0,
            favoriteCount: payload.new.favorite_count || 0,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId]);

  return { analytics, loading, error };
}

