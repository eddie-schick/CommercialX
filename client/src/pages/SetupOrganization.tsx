import React from 'react';
import { useLocation } from 'wouter';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getSupabaseClient } from '@/lib/supabase';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SetupOrganization() {
  const [, setLocation] = useLocation();
  const { user, profile, loading, refetch } = useCurrentUser();
  const [checkingSession, setCheckingSession] = React.useState(false);
  const [hasCheckedSession, setHasCheckedSession] = React.useState(false);

  // Function to check session directly and refresh user
  const checkSessionAndRefresh = React.useCallback(async () => {
    setCheckingSession(true);
    try {
      const client = getSupabaseClient();
      console.log('[SetupOrganization] Checking for session...');
      const { data: { session }, error } = await client.auth.getSession();
      
      if (error) {
        console.error('[SetupOrganization] Session check error:', error);
        setCheckingSession(false);
        return;
      }
      
      if (session && session.user) {
        console.log('[SetupOrganization] ✅ Found session with user:', session.user.id);
        // Force a refetch of the user
        try {
          await refetch();
          console.log('[SetupOrganization] Refetch completed');
          // Reload to ensure state is synced
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } catch (refetchErr) {
          console.error('[SetupOrganization] Refetch failed:', refetchErr);
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      } else {
        console.log('[SetupOrganization] ❌ No session found');
        setCheckingSession(false);
      }
    } catch (err) {
      console.error('[SetupOrganization] Error checking session:', err);
      setCheckingSession(false);
    }
  }, [refetch]);

  // Try to check session once on mount if we don't have a user
  React.useEffect(() => {
    if (!loading && !user && !checkingSession && !hasCheckedSession) {
      console.log('[SetupOrganization] No user found on mount, checking for session...');
      setHasCheckedSession(true);
      checkSessionAndRefresh();
    }
  }, [loading, user, checkingSession, hasCheckedSession, checkSessionAndRefresh]);

  // If user already has a profile, redirect to dashboard
  React.useEffect(() => {
    if (!loading && !checkingSession && user && profile) {
      console.log('[SetupOrganization] User already has organization, redirecting to dashboard');
      const timeout = setTimeout(() => {
        window.location.href = '/dealer';
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [loading, checkingSession, user, profile]);

  // Show loading while checking auth or session
  if (loading || checkingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-lg">Loading...</div>
          <p className="text-sm text-muted-foreground mt-2">
            {checkingSession ? 'Checking your session...' : 'Checking authentication...'}
          </p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Not Authenticated
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You must be logged in to setup an organization.
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={checkSessionAndRefresh}
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
              <Button onClick={() => window.location.href = '/login'} className="w-full">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is authenticated but doesn't have a profile, show the onboarding wizard
  // This is the expected state for new users setting up their organization
  return (
    <div className="min-h-screen bg-background">
      <OnboardingWizard />
    </div>
  );
}
