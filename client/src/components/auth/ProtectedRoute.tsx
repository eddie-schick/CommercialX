import React from 'react';
import { useLocation } from 'wouter';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getSupabaseClient } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'owner' | 'admin' | 'member' | 'viewer';
  requireDealer?: boolean;
  requireProfile?: boolean; // Whether profile is required (default: true for requireDealer, false otherwise)
}

export function ProtectedRoute({ 
  children, 
  requireRole,
  requireDealer = false,
  requireProfile: requireProfileProp,
}: ProtectedRouteProps) {
  const { user, profile, dealerId, loading, refetch } = useCurrentUser();
  const [, setLocation] = useLocation();
  const [hasTriedRefetch, setHasTriedRefetch] = React.useState(false);
  const [refetching, setRefetching] = React.useState(false);
  const [checkingSession, setCheckingSession] = React.useState(false);

  // Check if we're in onboarding mode (vehicle onboarding workflow)
  // During onboarding, completely bypass all profile/dealer checks
  const isOnboarding = typeof window !== 'undefined' && 
    window.location.search.includes('onboarding=true');

  // Determine if profile is required
  // During onboarding, don't require profile - user just created organization
  const requireProfile = isOnboarding 
    ? false 
    : (requireProfileProp !== undefined 
        ? requireProfileProp 
        : requireDealer); // If requireDealer is true, profile is required

  // Function to check session directly and refresh user
  // MUST be defined before any conditional returns (Rules of Hooks)
  const checkSessionAndRefresh = React.useCallback(async () => {
    setCheckingSession(true);
    try {
      const client = getSupabaseClient();
      console.log('[ProtectedRoute] Checking for session...');
      
      // Try multiple times with small delays to catch session initialization
      let session = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!session && attempts < maxAttempts) {
        const sessionPromise = client.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: new Error('Session check timeout') }), 2000)
        );
        
        const sessionResult = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: any }; error: any };
        const { data: sessionData, error } = sessionResult;
        
        if (sessionData?.session?.user) {
          session = sessionData.session;
          break;
        }
        
        if (error && error.message !== 'Session check timeout') {
          console.warn('[ProtectedRoute] Session check error (attempt', attempts + 1, '):', error.message);
        }
        
        // Wait a bit before retrying
        if (attempts < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        attempts++;
      }
      
      if (session && session.user) {
        console.log('[ProtectedRoute] ✅ Found session with user:', session.user.id);
        console.log('[ProtectedRoute] Session details:', {
          user_id: session.user.id,
          email: session.user.email,
          expires_at: session.expires_at,
        });
        
        // Instead of reloading, try to refetch the user profile
        // This is faster and less disruptive than a full page reload
        console.log('[ProtectedRoute] Session found, refetching user profile...');
        
        // Keep checkingSession true until refetch completes
        // Give useCurrentUser a moment to pick up the session, then refetch
        setTimeout(async () => {
          try {
            setRefetching(true);
            await refetch();
            setRefetching(false);
            setCheckingSession(false);
          } catch (refetchErr) {
            console.warn('[ProtectedRoute] Refetch after session found failed, reloading page...');
            setRefetching(false);
            setCheckingSession(false);
            window.location.reload();
          }
        }, 100);
        return;
      } else {
        console.log('[ProtectedRoute] ❌ No session found after', attempts, 'attempt(s)');
        setCheckingSession(false);
      }
    } catch (err) {
      console.error('[ProtectedRoute] Error checking session:', err);
      setCheckingSession(false);
    }
  }, [refetch]);

  // Try to refetch profile once if we don't have one but user is authenticated
  React.useEffect(() => {
    if (loading || !user || profile || hasTriedRefetch || refetching) return;

    // Check if we're in onboarding mode - skip refetch during onboarding
    const isOnboarding = typeof window !== 'undefined' &&
      (window.location.pathname.includes('/listings/new') ||
       window.location.pathname.includes('/listings/edit'));
    
    if (isOnboarding) {
      console.log('[ProtectedRoute] Skipping profile refetch during onboarding/form workflow');
      return;
    }

    // Only refetch if profile is actually required
    if (requireProfile) {
      // Add a small delay to ensure session is fully established after login
      const refetchTimer = setTimeout(() => {
        setHasTriedRefetch(true);
        setRefetching(true);
        
        refetch()
          .then(() => {
            setRefetching(false);
          })
          .catch((err) => {
            // Suppress errors for expected cases (new users without organization)
            const isExpectedError = 
              err?.message?.toLowerCase().includes('not found') ||
              err?.message?.toLowerCase().includes('no rows') ||
              err?.code === 'PGRST116' ||
              err?.code === 'PGRST301';
            
            if (!isExpectedError) {
              console.warn('[ProtectedRoute] Refetch failed (non-fatal):', err?.message || err);
            }
            setRefetching(false);
          });
      }, 500); // Small delay to let session propagate

      return () => clearTimeout(refetchTimer);
    }
  }, [loading, user, profile, hasTriedRefetch, refetching, refetch, requireProfile]);

  // Try to check session multiple times if we don't have a user
  // This is important after login redirects where session might not be immediately available
  const [hasCheckedSession, setHasCheckedSession] = React.useState(false);
  const [sessionCheckAttempts, setSessionCheckAttempts] = React.useState(0);
  const maxSessionCheckAttempts = 5; // Try up to 5 times
  
  React.useEffect(() => {
    if (!loading && !user && !checkingSession && sessionCheckAttempts < maxSessionCheckAttempts) {
      console.log(`[ProtectedRoute] No user found, checking for session (attempt ${sessionCheckAttempts + 1}/${maxSessionCheckAttempts})...`);
      setHasCheckedSession(true);
      // Increase delay with each attempt to give session more time to initialize
      const delay = 300 + (sessionCheckAttempts * 200); // 300ms, 500ms, 700ms, 900ms, 1100ms
      const timer = setTimeout(() => {
        setSessionCheckAttempts(prev => prev + 1);
        checkSessionAndRefresh();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [loading, user, checkingSession, sessionCheckAttempts, checkSessionAndRefresh, maxSessionCheckAttempts]);
  
  // Add a safety timeout - if checkingSession is true for too long, stop it
  React.useEffect(() => {
    if (checkingSession) {
      const safetyTimeout = setTimeout(() => {
        console.warn('[ProtectedRoute] Session check taking too long, stopping...');
        setCheckingSession(false);
      }, 5000); // 5 second max
      return () => clearTimeout(safetyTimeout);
    }
  }, [checkingSession]);

  // Show loading state while checking auth, refetching, or checking session
  // Also show loading if we're still trying to find a session (give it more time after login)
  const isStillChecking = loading || refetching || checkingSession || (sessionCheckAttempts > 0 && sessionCheckAttempts < maxSessionCheckAttempts && !user);
  
  if (isStillChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-lg">Loading...</div>
          <p className="text-sm text-muted-foreground mt-2">
            {checkingSession 
              ? 'Checking your session...' 
              : refetching 
              ? 'Refreshing your profile...' 
              : sessionCheckAttempts > 0
              ? 'Verifying authentication...'
              : 'Checking authentication...'}
          </p>
        </div>
      </div>
    );
  }

  // During onboarding, completely bypass ALL checks - user just created organization
  // This prevents any auth/profile reloads from blocking the vehicle onboarding workflow
  // Allow access even if user is temporarily null (during auth state changes)
  if (isOnboarding) {
    // Only require user to be authenticated, but don't require profile/dealer checks
    // If no user at all, still show auth required
    if (!user && !loading) {
      // Still need to be authenticated, but skip profile/dealer checks
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Authentication Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                You must be signed in to access this page.
              </p>
              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    // If we have a user (or still loading), bypass all profile/dealer checks
    return <>{children}</>;
  }

  // Check authentication first
  if (!user) {

    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You must be signed in to access this page.
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => {
                  // Reset attempt counter to allow manual retry
                  setSessionCheckAttempts(0);
                  setHasCheckedSession(false);
                  checkSessionAndRefresh();
                }}
                disabled={checkingSession}
                variant="outline"
                className="w-full"
              >
                {checkingSession ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking Session...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Session
                  </>
                )}
              </Button>
              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check profile requirement (only if required, and not during onboarding/form workflows)
  // During onboarding, we allow access even without profile since it might still be loading
  // Also skip if we're still loading (profile might be loading)
  if (requireProfile && !profile && !isOnboarding && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Organization Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You need to complete organization setup to access this page.
            </p>
            <Button 
              onClick={() => window.location.href = '/setup-organization'}
              className="w-full"
            >
              Go to Organization Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role requirement (only if we have a profile)
  if (requireRole && profile) {
    const roleHierarchy = { owner: 4, admin: 3, member: 2, viewer: 1 };
    if (roleHierarchy[profile.role] < roleHierarchy[requireRole]) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Insufficient Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This page requires {requireRole} role. Your current role is {profile.role}.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Check dealer requirement (only if we have a profile, and not during onboarding)
  // During onboarding, completely skip dealer check - backend will handle it
  // Also skip if we're still loading (profile might be loading)
  if (requireDealer && !isOnboarding && !loading) {
    // Only check if we have a profile - if we don't, the profile check above will handle it
    if (profile && !dealerId) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Dealer Access Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This feature is only available to dealer organizations. Your organization type is {profile.organization_type}.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
}
