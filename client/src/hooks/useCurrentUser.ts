import { useEffect, useState } from 'react';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import type { UserProfile, UserPermissions } from '@/types/user';
import type { User } from '@supabase/supabase-js';

interface UseCurrentUserReturn {
  user: User | null;
  profile: UserProfile | null;
  permissions: UserPermissions | null;
  dealerId: number | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useCurrentUser(): UseCurrentUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [dealerId, setDealerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const client = getSupabaseClient();
      // Get current auth user
      const { data: { user: authUser }, error: authError } = await client.auth.getUser();

      if (authError) throw authError;
      
      if (!authUser) {
        setUser(null);
        setProfile(null);
        setPermissions(null);
        setDealerId(null);
        setLoading(false);
        return;
      }

      setUser(authUser);

      // Get user profile with organization (using public schema wrapper)
      // Make this non-blocking - if it fails or times out, continue without profile
      let profileData: any = null;
      let profileError: any = null;
      
      try {
        // Use a shorter timeout (3 seconds) and make it non-blocking
        const profilePromise = client.rpc('get_current_user_profile');
        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => 
          setTimeout(() => resolve({ 
            data: null, 
            error: new Error('Profile load timeout') 
          }), 3000) // 3 second timeout
        );
        
        const profileResult = await Promise.race([
          profilePromise,
          timeoutPromise
        ]) as { data: any; error: any };
        
        profileData = profileResult.data;
        profileError = profileResult.error;
      } catch (error) {
        console.warn('Profile load failed:', error);
        profileError = error;
      }

      // If profile error or timeout, continue without profile
      // This is expected for users setting up their organization
      if (profileError || !profileData) {
        console.warn('Could not load user profile (user may not have organization yet):', profileError?.message || 'No profile data');
        setProfile(null);
        setPermissions(null);
        setDealerId(null);
        setLoading(false);
        return;
      }

      if (profileData && profileData.length > 0) {
        const userProfile = profileData[0] as UserProfile;
        setProfile(userProfile);

        // Calculate permissions based on role
        const userPermissions: UserPermissions = {
          canCreateListings: ['owner', 'admin', 'member'].includes(userProfile.role),
          canManageOrganization: ['owner', 'admin'].includes(userProfile.role),
          canInviteUsers: ['owner', 'admin'].includes(userProfile.role),
          canManageUsers: ['owner', 'admin'].includes(userProfile.role),
          isAdmin: ['owner', 'admin'].includes(userProfile.role),
          isOwner: userProfile.role === 'owner',
        };
        setPermissions(userPermissions);

        // If user is part of a dealer organization, get dealer_id (using public schema wrapper)
        if (userProfile.organization_type === 'dealer') {
          const { data: dealerIdData, error: dealerError } = await client
            .rpc('get_user_dealer_id');

          if (!dealerError && dealerIdData) {
            setDealerId(dealerIdData);
          }
        }
      } else {
        // User doesn't have a profile yet (e.g., during organization setup)
        // This is fine - set profile to null and continue
        setProfile(null);
        setPermissions(null);
        setDealerId(null);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setError(new Error('Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'));
      setLoading(false);
      return;
    }

    loadUserProfile();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await loadUserProfile();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setPermissions(null);
          setDealerId(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    permissions,
    dealerId,
    loading,
    error,
    refetch: loadUserProfile,
  };
}

