import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';

export function useOptimisticFavorite(
  listingId: number,
  initialIsFavorited: boolean,
  initialCount: number
) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [favoriteCount, setFavoriteCount] = useState(initialCount);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const toggleFavorite = async () => {
    // Optimistic update
    const newIsFavorited = !isFavorited;
    const newCount = favoriteCount + (newIsFavorited ? 1 : -1);

    const previousIsFavorited = isFavorited;
    const previousCount = favoriteCount;

    setIsFavorited(newIsFavorited);
    setFavoriteCount(newCount);
    setIsPending(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('You must be signed in to favorite listings');
      }

      if (newIsFavorited) {
        // Add favorite
        const { error: insertError } = await supabase
          .from('user_favorites')
          .insert({
            listing_id: listingId,
            user_id: user.id,
          });

        if (insertError) throw handleSupabaseError(insertError);
      } else {
        // Remove favorite
        const { error: deleteError } = await supabase
          .from('user_favorites')
          .delete()
          .match({
            listing_id: listingId,
            user_id: user.id,
          });

        if (deleteError) throw handleSupabaseError(deleteError);
      }

      // Update listing favorite count
      const { error: rpcError } = await supabase.rpc('increment_favorite_count', {
        listing_id: listingId,
        increment: newIsFavorited ? 1 : -1,
      });

      if (rpcError) {
        console.warn('Failed to update favorite count:', rpcError);
        // Don't throw - the favorite was already added/removed
      }

      setIsPending(false);
    } catch (err) {
      // Rollback on error
      setIsFavorited(previousIsFavorited);
      setFavoriteCount(previousCount);
      setIsPending(false);
      setError(err instanceof Error ? err : new Error('Failed to toggle favorite'));
      console.error('Failed to toggle favorite:', err);
    }
  };

  return { isFavorited, favoriteCount, isPending, error, toggleFavorite };
}

