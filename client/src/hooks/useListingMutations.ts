import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';
import { analytics } from '@/lib/analytics';

interface UpdateListingParams {
  id: number;
  updates: Record<string, any>;
}

interface CreateListingParams {
  listing: Record<string, any>;
}

export function useUpdateListing() {
  const queryClient = useQueryClient();

  return useMutation(
    async ({ id, updates }: UpdateListingParams) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('"02a. Dealership".vehicle_listings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw handleSupabaseError(error);
      return data;
    },
    {
      onSuccess: (data) => {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['listing', data.id] });
        queryClient.invalidateQueries({ queryKey: ['dealer-listings', data.dealer_id] });
        queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] });
        queryClient.invalidateQueries({ queryKey: ['listings'] });

        // Optimistically update cache
        queryClient.setQueryData(['listing', data.id], data);

        // Track analytics
        analytics.listingUpdated(data.id);
      },
    }
  );
}

export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation(
    async ({ listing }: CreateListingParams) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('"02a. Dealership".vehicle_listings')
        .insert(listing)
        .select()
        .single();

      if (error) throw handleSupabaseError(error);
      return data;
    },
    {
      onSuccess: (data) => {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['dealer-listings', data.dealer_id] });
        queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] });
        queryClient.invalidateQueries({ queryKey: ['listings'] });

        // Track analytics
        analytics.listingCreated(data.id);
      },
    }
  );
}

export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation(
    async (id: number) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('"02a. Dealership".vehicle_listings')
        .delete()
        .eq('id', id);

      if (error) throw handleSupabaseError(error);
      return id;
    },
    {
      onSuccess: (id) => {
        // Remove from cache
        queryClient.removeQueries({ queryKey: ['listing', id] });
        
        // Invalidate list queries
        queryClient.invalidateQueries({ queryKey: ['dealer-listings'] });
        queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] });
        queryClient.invalidateQueries({ queryKey: ['listings'] });
      },
    }
  );
}

