import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Type definitions - adjust based on your actual schema
interface VehicleListing {
  id: number;
  dealer_id?: number;
  status: string;
  asking_price?: number;
  condition?: string;
  mileage?: number;
  created_at?: string;
  updated_at?: string;
  view_count?: number;
  lead_count?: number;
  favorite_count?: number;
  [key: string]: any;
}

interface UseRealtimeListingsOptions {
  dealerId?: number;
  status?: string[];
  enabled?: boolean;
}

export function useRealtimeListings(options: UseRealtimeListingsOptions = {}) {
  const { dealerId, status = ['available', 'pending'], enabled = true } = options;
  const [listings, setListings] = useState<VehicleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let channel: RealtimeChannel | null = null;

    async function setupRealtimeSubscription() {
      try {
        const supabase = getSupabaseClient();

        // Initial fetch
        let query = supabase
          .from('"02a. Dealership".vehicle_listings')
          .select(`
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
          `)
          .in('status', status)
          .order('created_at', { ascending: false });

        if (dealerId) {
          query = query.eq('dealer_id', dealerId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setListings(data || []);
        setLoading(false);

        // Setup real-time subscription
        channel = supabase
          .channel('vehicle_listings_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: '02a. Dealership',
              table: 'vehicle_listings',
              filter: dealerId ? `dealer_id=eq.${dealerId}` : undefined,
            },
            async (payload) => {
              console.log('Listing change:', payload);

              if (payload.eventType === 'INSERT') {
                // Fetch full listing with relations
                const { data: newListing } = await supabase
                  .from('"02a. Dealership".vehicle_listings')
                  .select(`
                    *,
                    dealer:dealers(*),
                    complete_configuration:complete_configurations(*),
                    images:listing_images(*)
                  `)
                  .eq('id', payload.new.id)
                  .single();

                if (newListing && status.includes(newListing.status)) {
                  setListings((prev) => [newListing, ...prev]);
                }
              } else if (payload.eventType === 'UPDATE') {
                setListings((prev) =>
                  prev.map((listing) =>
                    listing.id === payload.new.id
                      ? { ...listing, ...payload.new }
                      : listing
                  )
                );
              } else if (payload.eventType === 'DELETE') {
                setListings((prev) =>
                  prev.filter((listing) => listing.id !== payload.old.id)
                );
              }
            }
          )
          .subscribe();

      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    }

    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (channel) {
        const supabase = getSupabaseClient();
        supabase.removeChannel(channel);
      }
    };
  }, [dealerId, status.join(','), enabled]);

  return { listings, loading, error };
}

