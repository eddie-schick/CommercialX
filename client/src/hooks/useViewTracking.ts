import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

export function useViewTracking(listingId: number) {
  const viewTracked = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (viewTracked.current) return;

    const trackView = async () => {
      if (viewTracked.current) return;

      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Increment view count
        const { error: rpcError } = await supabase.rpc('increment_view_count', {
          listing_id: listingId,
        });

        if (rpcError) {
          console.warn('Failed to increment view count:', rpcError);
        }

        // Track view event (if table exists)
        if (user) {
          const { error: insertError } = await supabase.from('listing_views').insert({
            listing_id: listingId,
            user_id: user.id,
            viewed_at: new Date().toISOString(),
            referrer: document.referrer || null,
            user_agent: navigator.userAgent || null,
          });

          if (insertError) {
            console.warn('Failed to track view event:', insertError);
          }
        }

        viewTracked.current = true;
      } catch (error) {
        console.error('Failed to track view:', error);
      }
    };

    // Track after 3 seconds of page view
    timerRef.current = setTimeout(trackView, 3000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [listingId]);
}

