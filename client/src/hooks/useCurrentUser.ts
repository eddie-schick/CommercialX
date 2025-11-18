import React, { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
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
  const [initialized, setInitialized] = useState(false);
  
  // Use ref to track profile in auth state change handler
  const profileRef = React.useRef<UserProfile | null>(null);
  const userRef = React.useRef<User | null>(null);
  
  // Keep refs in sync with state
  React.useEffect(() => {
    profileRef.current = profile;
    userRef.current = user;
  }, [profile, user]);

  const loadUserProfile = useCallback(async (authUser: User | null) => {
    try {
      setError(null);

      // If no user, clear everything
      if (!authUser) {
        setUser(null);
        setProfile(null);
        setPermissions(null);
        setDealerId(null);
        setLoading(false);
        return;
      }

      setUser(authUser);

      // Try to load profile - this may fail if user doesn't have an organization yet
      try {
        console.log('[useCurrentUser] Loading profile for user:', authUser.id);
        const client = getSupabaseClient();
        
        // Call RPC function to get user profile with timeout
        const profilePromise = client.rpc('get_current_user_profile');
        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => 
          setTimeout(() => {
            resolve({ 
              data: null, 
              error: new Error('Profile load timeout after 3 seconds') 
            });
          }, 3000) // 3 second timeout (reduced from 5)
        );
        
        const profileResult = await Promise.race([
          profilePromise.then(result => ({ data: result.data, error: result.error })).catch(err => ({
            data: null,
            error: err
          })),
          timeoutPromise
        ]) as { data: any; error: any };

        const { data: profileData, error: profileError } = profileResult;
        
        // Log the error for debugging
        if (profileError) {
          console.log('[useCurrentUser] Profile RPC result:', {
            error: profileError.message || profileError,
            code: profileError.code,
            details: profileError.details
          });
        }

        if (profileError) {
          // Suppress console errors for expected cases (new users without organization)
          // Only log if it's not a "not found" or "no rows" type error
          const isExpectedError = 
            profileError.message?.toLowerCase().includes('not found') ||
            profileError.message?.toLowerCase().includes('no rows') ||
            profileError.code === 'PGRST116' || // No rows returned
            profileError.code === 'PGRST301'; // Permission denied (expected for new users)
          
          if (!isExpectedError) {
            console.warn('[useCurrentUser] Profile load error:', profileError.message);
          }
          // This is expected for users who haven't set up their organization yet
          setProfile(null);
          setPermissions(null);
          setDealerId(null);
          setLoading(false);
          return;
        }

        // RPC function now returns JSONB (single object), not an array
        // Handle both array (old) and object (new) formats for compatibility
        let userProfile: UserProfile | null = null;
        
        if (profileData) {
          if (Array.isArray(profileData) && profileData.length > 0) {
            // Old format: array
            userProfile = profileData[0] as UserProfile;
          } else if (typeof profileData === 'object' && !Array.isArray(profileData)) {
            // New format: JSONB object from organization schema
            if (!profileData.error) {
              // Map the JSONB structure to UserProfile format
              userProfile = {
                id: profileData.id,
                organization_id: profileData.organization_id,
                user_id: profileData.user_id,
                role: profileData.role,
                permissions: profileData.permissions,
                organization_name: profileData.organization?.organization_name || null,
                organization_type: profileData.organization?.organization_type?.display_name || null,
                dealer_id: profileData.dealer?.id || null,
                is_verified: profileData.organization?.is_verified || false,
              } as UserProfile;
            }
          }
        }
        
        if (userProfile) {
          console.log('[useCurrentUser] Profile loaded from organization schema:', userProfile);
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

          // Get dealer_id from profile (already loaded from organization schema)
          if (userProfile.dealer_id) {
            setDealerId(userProfile.dealer_id);
            console.log('[useCurrentUser] Dealer ID from organization schema:', userProfile.dealer_id);
          } else {
            // Fallback: Try to get dealer_id via RPC if not in profile
            try {
              const dealerPromise = client.rpc('get_user_dealer_id');
              const dealerTimeout = new Promise<{ data: null; error: Error }>((resolve) =>
                setTimeout(() => resolve({ data: null, error: new Error('Dealer ID timeout') }), 3000)
              );
              
              const dealerResult = await Promise.race([
                dealerPromise.then(result => ({ data: result.data, error: result.error })),
                dealerTimeout
              ]) as { data: any; error: any };

              if (!dealerResult.error && dealerResult.data) {
                setDealerId(dealerResult.data);
                console.log('[useCurrentUser] Dealer ID loaded via RPC:', dealerResult.data);
              } else {
                console.log('[useCurrentUser] No dealer ID found (this is normal for non-dealer orgs)');
                setDealerId(null);
              }
            } catch (err) {
              console.warn('[useCurrentUser] Error loading dealer ID:', err);
              setDealerId(null);
            }
          }
        } else {
          // User doesn't have a profile yet (e.g., during organization setup)
          setProfile(null);
          setPermissions(null);
          setDealerId(null);
        }

        setLoading(false);
      } catch (err) {
        console.error('[useCurrentUser] Error loading profile:', err);
        // Don't treat profile load errors as fatal - user might not have org yet
        setProfile(null);
        setPermissions(null);
        setDealerId(null);
        setLoading(false);
      }
    } catch (err) {
      console.error('[useCurrentUser] Error in loadUserProfile:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
    }
  }, []);

  // Initial load and auth state subscription
  useEffect(() => {
    // Check if Supabase client can be initialized
    try {
      getSupabaseClient(); // This will throw if not configured
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'));
      setLoading(false);
      setInitialized(true);
      return;
    }

    let mounted = true;

    // Initial auth check with timeout
    const initializeAuth = async () => {
      try {
        const client = getSupabaseClient();
        
        // Give Supabase a moment to initialize session from storage
        // This is important after page reloads or redirects, especially after login
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // First check session (faster and more reliable than getUser)
        // Try multiple times with small delays to catch session initialization
        // This is critical after login redirects where session might not be immediately available
        let session = null;
        let attempts = 0;
        const maxAttempts = 8; // Increased from 5 to be more patient
        
        while (!session && attempts < maxAttempts) {
          const sessionPromise = client.auth.getSession();
          const sessionTimeout = new Promise<{ data: { session: null }; error: Error }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null }, error: new Error('Session check timeout') }), 2000)
          );
          
          const sessionResult = await Promise.race([sessionPromise, sessionTimeout]) as { data: { session: any }; error: any };
          const { data: sessionData, error: sessionError } = sessionResult;
          
          if (sessionData?.session?.user) {
            session = sessionData.session;
            console.log('[useCurrentUser] Session found on attempt', attempts + 1);
            break;
          }
          
          // If no session yet, wait a bit and try again (session might still be initializing)
          // Increase delay with each attempt to give more time
          if (attempts < maxAttempts - 1) {
            const delay = 200 + (attempts * 100); // 200ms, 300ms, 400ms, etc.
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          attempts++;
        }
        
        const sessionError = session ? null : new Error('No session found after multiple attempts');

        let authUser = null;
        
        // If we have a session, use the user from it (faster)
        if (session?.user) {
          authUser = session.user;
          console.log('[useCurrentUser] Found user from session:', authUser.id, 'after', attempts, 'attempt(s)');
        } else {
          // Fallback to getUser if no session (might be a timing issue)
          console.log('[useCurrentUser] No session found after', attempts, 'attempts, trying getUser...');
          const authPromise = client.auth.getUser();
          const authTimeout = new Promise<{ data: { user: null }; error: Error }>((resolve) =>
            setTimeout(() => resolve({ data: { user: null }, error: new Error('Auth check timeout') }), 3000)
          );
          
          const authResult = await Promise.race([authPromise, authTimeout]) as { data: { user: any }; error: any };
          const { data: { user }, error: authError } = authResult;
          
          if (authError && authError.message !== 'Auth check timeout') {
            console.warn('[useCurrentUser] Auth error:', authError.message);
          }
          
          authUser = user || null;
          if (authUser) {
            console.log('[useCurrentUser] Found user from getUser:', authUser.id);
          }
        }

        if (!authUser) {
          // No user found - this is normal for logged-out users
          if (mounted) {
            setUser(null);
            setProfile(null);
            setPermissions(null);
            setDealerId(null);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        if (mounted) {
          // Set a maximum timeout for the entire initialization
          const initTimeout = setTimeout(() => {
            if (mounted) {
              console.warn('[useCurrentUser] Initialization timeout - forcing completion');
              setLoading(false);
              setInitialized(true);
            }
          }, 10000); // 10 second max for entire init

          try {
            await loadUserProfile(authUser);
            clearTimeout(initTimeout);
            if (mounted) {
              setInitialized(true);
            }
          } catch (profileErr) {
            clearTimeout(initTimeout);
            console.error('[useCurrentUser] Profile load failed:', profileErr);
            if (mounted) {
              setLoading(false);
              setInitialized(true);
            }
          }
        }
      } catch (err) {
        console.error('[useCurrentUser] Initialization error:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const client = getSupabaseClient();
    const { data: { subscription } } = client.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useCurrentUser] Auth state changed:', event, session?.user?.id);
        
        if (!mounted) return;

        // Check if we're in onboarding mode (on vehicle creation page with onboarding param)
        // Also check for any listing creation/edit pages to prevent interruptions during form workflows
        const isOnboarding = typeof window !== 'undefined' && (
          (window.location.pathname.includes('/listings/new') && 
           window.location.search.includes('onboarding=true')) ||
          // Also prevent reloads during any active form workflow
          (window.location.pathname.includes('/listings/new') || 
           window.location.pathname.includes('/listings/edit'))
        );

        if (event === 'SIGNED_IN') {
          // Use the session from the event if available (more reliable)
          let authUser = session?.user;
          
          // If no user from session, try to get it
          if (!authUser) {
            console.log('[useCurrentUser] No user in session, trying getUser...');
            const authClient = getSupabaseClient();
            const { data: { user } } = await authClient.auth.getUser();
            authUser = user;
          }
          
          // If still no user, try getSession as a last resort
          if (!authUser) {
            console.log('[useCurrentUser] No user from getUser, trying getSession...');
            const authClient = getSupabaseClient();
            // Try multiple times with delays to catch session initialization
            for (let i = 0; i < 5; i++) {
              const { data: { session: sessionData } } = await authClient.auth.getSession();
              if (sessionData?.user) {
                authUser = sessionData.user;
                console.log('[useCurrentUser] Found user from getSession on attempt', i + 1);
                break;
              }
              if (i < 4) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
          }
          
          if (authUser && mounted) {
            console.log('[useCurrentUser] Loading profile for user from SIGNED_IN event:', authUser.id);
            await loadUserProfile(authUser);
          } else if (mounted) {
            console.warn('[useCurrentUser] SIGNED_IN event but could not get user');
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // During onboarding or form workflows, skip token refresh reloads to prevent interruptions
          // Only reload if we don't have a profile yet (initial load scenario)
          if (isOnboarding && profileRef.current) {
            console.log('[useCurrentUser] Skipping TOKEN_REFRESHED reload during onboarding/form workflow');
            return;
          }
          
          // Only reload profile if we don't have one yet, or if user changed
          const currentUserId = userRef.current?.id;
          const sessionUserId = session?.user?.id;
          
          // If we already have a profile and the user hasn't changed, skip reload
          // This prevents unnecessary reloads during normal operations (like VIN decode)
          if (profileRef.current && currentUserId === sessionUserId) {
            console.log('[useCurrentUser] Skipping TOKEN_REFRESHED reload - profile already loaded and user unchanged');
            return;
          }
          
          if (!profileRef.current || (currentUserId && sessionUserId && currentUserId !== sessionUserId)) {
            console.log('[useCurrentUser] Reloading profile after TOKEN_REFRESHED');
            const authUser = session?.user;
            if (authUser && mounted) {
              await loadUserProfile(authUser);
            }
          } else {
            console.log('[useCurrentUser] Skipping TOKEN_REFRESHED reload - profile already loaded');
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setUser(null);
            setProfile(null);
            setPermissions(null);
            setDealerId(null);
            setLoading(false);
            // Clear refs
            profileRef.current = null;
            userRef.current = null;
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const client = getSupabaseClient();
      
      // Check session first (faster and more reliable)
      const { data: { session } } = await client.auth.getSession();
      let authUser = session?.user;
      
      // Fallback to getUser if no session
      if (!authUser) {
        const { data: { user } } = await client.auth.getUser();
        authUser = user;
      }
      
      if (authUser) {
        await loadUserProfile(authUser);
      } else {
        // No user found
        setUser(null);
        setProfile(null);
        setPermissions(null);
        setDealerId(null);
        setLoading(false);
      }
    } catch (err) {
      console.error('[useCurrentUser] Refetch error:', err);
      setError(err instanceof Error ? err : new Error('Refetch failed'));
      setLoading(false);
    }
  }, [loadUserProfile]);

  return {
    user,
    profile,
    permissions,
    dealerId,
    loading: loading || !initialized,
    error,
    refetch,
  };
}
