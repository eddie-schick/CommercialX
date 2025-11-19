/**
 * Unified Auth Hook
 * Single source of truth for authentication state
 * Properly handles session persistence and profile loading
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { UserProfile, UserPermissions } from '@/types/user';

interface UseAuthReturn {
  user: User | null;
  profile: UserProfile | null;
  permissions: UserPermissions | null;
  dealerId: number | null;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [dealerId, setDealerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  const loadingProfileRef = useRef(false);
  const mountedRef = useRef(true);
  const profileRef = useRef<UserProfile | null>(null);
  
  // Keep profile ref in sync
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Load user profile from RPC
  const loadProfile = useCallback(async (authUser: User) => {
    if (loadingProfileRef.current) return; // Prevent concurrent loads
    loadingProfileRef.current = true;

    try {
      const client = getSupabaseClient();
      
      // Call RPC to get profile with timeout
      const profilePromise = client.rpc('get_current_user_profile');
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => {
          resolve({ 
            data: null, 
            error: new Error('Profile load timeout after 5 seconds') 
          });
        }, 5000)
      );
      
      let profileResult: { data: any; error: any };
      try {
        const result = await Promise.race([profilePromise, timeoutPromise]) as any;
        profileResult = { data: result.data, error: result.error };
      } catch (err: any) {
        profileResult = { data: null, error: err };
      }
      
      const { data: profileData, error: profileError } = profileResult;
      
      if (profileError) {
        // Expected for users without organization
        if (profileError.code === 'PGRST116' || 
            profileError.message?.includes('not found') ||
            profileError.message?.includes('timeout')) {
          if (mountedRef.current) {
            setProfile(null);
            setPermissions(null);
            setDealerId(null);
          }
          return;
        }
        throw profileError;
      }

      if (!profileData || profileData.error) {
        if (mountedRef.current) {
          setProfile(null);
          setPermissions(null);
          setDealerId(null);
        }
        return;
      }

      // Handle both array and object formats
      const profile = Array.isArray(profileData) ? profileData[0] : profileData;
      
      if (!profile || profile.error) {
        if (mountedRef.current) {
          setProfile(null);
          setPermissions(null);
          setDealerId(null);
        }
        return;
      }

      // Extract data - handle various response formats
      // Check for dealer ID in multiple possible locations
      let extractedDealerId = profile.dealer?.id || profile.dealer_id || null;
      
      // If profile indicates hasDealer but no ID found, try to get it from dealer object
      if (!extractedDealerId && (profile.hasDealer === true || profile.dealer)) {
        // Try to extract from nested dealer object
        if (profile.dealer && typeof profile.dealer === 'object') {
          extractedDealerId = profile.dealer.id || profile.dealer.dealer_id || null;
        }
      }
      
      // Extract organization_id from various possible locations in the response
      const extractedOrganizationId = 
        profile.organization_id || 
        profile.organization?.id || 
        profile.org_id || 
        null;
      
      // Log for debugging
      if (!extractedOrganizationId) {
        console.warn('[useAuth] No organization_id found in profile response:', {
          profileKeys: Object.keys(profile),
          organization: profile.organization,
          organization_id: profile.organization_id,
        });
      }
      
      const userProfile: UserProfile = {
        user_id: profile.user_id || authUser.id,
        organization_id: extractedOrganizationId,
        organization_name: profile.organization?.organization_name || profile.organization_name || '',
        organization_type: profile.organization?.organization_type?.type_code || 
                          profile.organization_type || 
                          'dealer',
        role: profile.role || 'member',
        status: profile.status || 'active',
        email_notifications: profile.email_notifications !== false,
        sms_notifications: profile.sms_notifications || false,
        is_verified: profile.organization?.is_verified || false,
      };

      const userPermissions: UserPermissions = {
        canCreateListings: ['owner', 'admin', 'member'].includes(userProfile.role),
        canManageOrganization: ['owner', 'admin'].includes(userProfile.role),
        canInviteUsers: ['owner', 'admin'].includes(userProfile.role),
        canManageUsers: ['owner', 'admin'].includes(userProfile.role),
        isAdmin: ['owner', 'admin'].includes(userProfile.role),
        isOwner: userProfile.role === 'owner',
      };

      if (mountedRef.current) {
        setProfile(userProfile);
        setPermissions(userPermissions);
        setDealerId(extractedDealerId);
      }
    } catch (err) {
      console.error('[useAuth] Error loading profile:', err);
      if (mountedRef.current) {
        setProfile(null);
        setPermissions(null);
        setDealerId(null);
      }
    } finally {
      loadingProfileRef.current = false;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;

    const initialize = async () => {
      console.log('[useAuth] Starting initialization...');
      try {
        const client = getSupabaseClient();
        
        // Get initial session (this reads from localStorage automatically)
        // Remove timeout - getSession() should be fast when reading from localStorage
        console.log('[useAuth] Checking for existing session...');
        const { data: { session }, error: sessionError } = await client.auth.getSession();
        
        if (sessionError) {
          console.warn('[useAuth] Session check error:', sessionError.message);
          // Don't treat session errors as fatal - might just be no session
        }

        if (session?.user && mounted) {
          console.log('[useAuth] Session found, user:', session.user.id);
          
          setUser(session.user);
          
          // Always load profile initially - we need it for ProtectedRoute checks
          // Only skip RELOADS during onboarding, not the initial load
          console.log('[useAuth] Loading profile initially...');
          const profileLoadPromise = loadProfile(session.user);
          
          // Set loading to false after a short delay to allow profile to start loading
          // But don't wait forever - complete initialization even if profile is slow
          const initTimeout = setTimeout(() => {
            if (mounted) {
              setLoading(false);
              setInitialized(true);
            }
          }, 2000); // Give profile 2 seconds to load
          
          profileLoadPromise
            .then(() => {
              clearTimeout(initTimeout);
              if (mounted) {
                setLoading(false);
                setInitialized(true);
                console.log('[useAuth] Initial profile load completed');
              }
            })
            .catch(err => {
              clearTimeout(initTimeout);
              console.error('[useAuth] Initial profile load error:', err);
              if (mounted) {
                setLoading(false);
                setInitialized(true);
              }
            });
        } else if (mounted) {
          console.log('[useAuth] No session found');
          setUser(null);
          setProfile(null);
          setPermissions(null);
          setDealerId(null);
          setLoading(false);
          setInitialized(true);
          console.log('[useAuth] Initialization complete (no user)');
        }
      } catch (err) {
        console.error('[useAuth] Initialization error:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Auth initialization failed'));
          setLoading(false);
          setInitialized(true);
          console.log('[useAuth] Initialization complete (with error)');
        }
      }
    };

    initialize();

    // Subscribe to auth state changes
    const client = getSupabaseClient();
    const { data: { subscription } } = client.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Check if we're in onboarding mode - skip all profile reloads during onboarding
        // This prevents form resets and page reloads during vehicle onboarding
        const isOnboarding = typeof window !== 'undefined' && 
          (window.location.search.includes('onboarding=true') ||
           (window.location.pathname.includes('/listings/new') && window.location.search.includes('onboarding=true')));

        // Only log important events to reduce console noise
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          console.log('[useAuth] Auth state changed:', event, isOnboarding ? '(onboarding mode - skipping profile reload)' : '');
        }

        // Handle INITIAL_SESSION event - this fires when Supabase restores session from localStorage
        if (event === 'INITIAL_SESSION' && session?.user) {
          console.log('[useAuth] Initial session restored, user:', session.user.id);
          setUser(session.user);
          setError(null);
          // Load profile if we don't have one yet
          if (!profileRef.current && !isOnboarding) {
            console.log('[useAuth] Loading profile from initial session');
            await loadProfile(session.user);
          }
        } else if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setError(null);
          // During onboarding, don't reload profile - it might cause form resets
          // But if we don't have a profile yet, we need to load it once for ProtectedRoute checks
          // Use a ref to check current profile state (avoids stale closure)
          const currentProfile = profileRef.current;
          if (!isOnboarding) {
            await loadProfile(session.user);
          } else if (!currentProfile) {
            // Only load if we don't have profile yet - this is the initial load during onboarding
            console.log('[useAuth] Loading profile for first time during onboarding');
            await loadProfile(session.user);
          } else {
            console.log('[useAuth] Skipping profile reload during onboarding (profile already loaded)');
          }
        } else if (event === 'SIGNED_OUT') {
          // Always clear state on sign out, even during onboarding
          setUser(null);
          setProfile(null);
          setPermissions(null);
          setDealerId(null);
          setError(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Update user but don't reload profile (it hasn't changed)
          // This is especially important during onboarding to prevent resets
          setUser(session.user);
        }
        // Ignore all other events (USER_UPDATED, etc.)
      }
    );

    return () => {
      mounted = false;
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    try {
      const client = getSupabaseClient();
      await client.auth.signOut();
      // State will be cleared by auth state change handler
    } catch (err) {
      console.error('[useAuth] Sign out error:', err);
      throw err;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user);
  }, [user, loadProfile]);

  return {
    user,
    profile,
    permissions,
    dealerId,
    loading: loading || !initialized,
    error,
    signOut,
    refreshProfile,
  };
}

