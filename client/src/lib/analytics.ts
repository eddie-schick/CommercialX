import { getSupabaseClient } from './supabase';

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = sessionStorage.getItem('session_id') || crypto.randomUUID();
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

export async function trackEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  try {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Try to insert into analytics_events table
    // Note: This table may need to be created in Supabase
    const { error } = await supabase.from('analytics_events').insert({
      event_name: eventName,
      user_id: user?.id || null,
      properties: properties || {},
      created_at: new Date().toISOString(),
      session_id: getSessionId(),
      page_url: typeof window !== 'undefined' ? window.location.href : null,
      referrer: typeof window !== 'undefined' ? document.referrer : null,
    });

    if (error) {
      console.warn('Failed to track event:', error);
      // Don't throw - analytics failures shouldn't break the app
    }
  } catch (error) {
    console.error('Failed to track event:', error);
    // Don't throw - analytics failures shouldn't break the app
  }
}

// Convenience functions for common events
export const analytics = {
  listingViewed: (listingId: number) => trackEvent('listing_viewed', { listingId }),
  searchPerformed: (filters: Record<string, any>) => trackEvent('search_performed', { filters }),
  leadSubmitted: (listingId: number, dealerId?: number) =>
    trackEvent('lead_submitted', { listingId, dealerId }),
  favoriteToggled: (listingId: number, isFavorited: boolean) =>
    trackEvent('favorite_toggled', { listingId, isFavorited }),
  listingCreated: (listingId: number) => trackEvent('listing_created', { listingId }),
  listingUpdated: (listingId: number) => trackEvent('listing_updated', { listingId }),
  imageUploaded: (listingId: number, imageCount: number) =>
    trackEvent('image_uploaded', { listingId, imageCount }),
};

