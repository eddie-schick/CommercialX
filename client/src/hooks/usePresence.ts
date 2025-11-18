import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useCurrentUser } from './useCurrentUser';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  userId: string;
  userName: string;
  viewingListing: number | null;
  lastSeen: string;
}

export function usePresence(listingId?: number) {
  const { user, profile } = useCurrentUser();
  const [presence, setPresence] = useState<PresenceState[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    const supabase = getSupabaseClient();
    const presenceChannel = supabase.channel('presence_listings', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = Object.values(state).flat() as PresenceState[];
        setPresence(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId: user.id,
            userName: profile?.name || user.email || 'Unknown',
            viewingListing: listingId || null,
            lastSeen: new Date().toISOString(),
          });
        }
      });

    setChannel(presenceChannel);

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
    };
  }, [user, profile, listingId]);

  return { presence };
}

