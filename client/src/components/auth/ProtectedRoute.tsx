import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'owner' | 'admin' | 'member' | 'viewer';
  requireDealer?: boolean;
  requireProfile?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireRole,
  requireDealer = false,
  requireProfile: requireProfileProp,
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  // Determine if profile is required
  const requireProfile = requireProfileProp !== undefined 
    ? requireProfileProp 
    : requireDealer; // If requireDealer is true, profile is required

  // Query organization directly - more reliable than checking profile data
  const { data: organizationData, isLoading: orgLoading, error: orgError } = trpc.user.getOrganization.useQuery(undefined, {
    enabled: requireProfile && !!user && !loading,
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Also query full profile data as a fallback
  const { data: fullProfileData, isLoading: profileDataLoading, error: profileError } = trpc.profile.get.useQuery(undefined, {
    enabled: requireProfile && !!user && !loading,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Debug logging (remove in production)
  React.useEffect(() => {
    if (requireProfile && !loading && user) {
      console.log('[ProtectedRoute] Organization check:', {
        hasUser: !!user,
        hasProfile: !!profile,
        profileOrgId: profile?.organization_id,
        organizationData: organizationData ? 'exists' : 'null',
        fullProfileOrg: fullProfileData?.organization ? 'exists' : 'null',
        orgLoading,
        profileDataLoading,
        orgError: orgError?.message,
        profileError: profileError?.message,
      });
    }
  }, [requireProfile, loading, user, profile, organizationData, fullProfileData, orgLoading, profileDataLoading, orgError, profileError]);

  // Show loading state while checking auth
  if (loading || (requireProfile && (orgLoading || profileDataLoading))) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-lg">Loading...</div>
          <p className="text-sm text-muted-foreground mt-2">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // Check authentication
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

  // Check profile requirement: user must have profile with organization
  // Check multiple sources for robustness:
  // 1. organizationData from getOrganization query (most reliable - directly queries organization_users table)
  // 2. profile.organization_id from useAuth hook
  // 3. fullProfileData.organization from profile.get query
  if (requireProfile) {
    // If queries are still loading, don't block yet (should be handled by loading state above, but double-check)
    if (orgLoading || profileDataLoading) {
      // This should not happen due to loading check above, but just in case
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      );
    }

    // Check for organization from multiple sources, prioritizing profile.organization_id
    // 1. profile.organization_id (from useAuth - most reliable, already loaded)
    // 2. organizationData (from getOrganization query)
    // 3. fullProfileData.organization (from profile.get query)
    const hasOrganizationId = profile?.organization_id != null && profile.organization_id > 0;
    const hasOrganizationFromQuery = organizationData != null;
    const hasOrganizationInFullProfile = fullProfileData?.organization != null;
    
    // If profile has organization_id, trust it and allow access immediately
    // Otherwise, check the other sources
    const hasOrganization = hasOrganizationId || hasOrganizationFromQuery || hasOrganizationInFullProfile;

    // Only block if we're certain there's no organization from any source
    // Prioritize profile.organization_id - if it exists, allow access even if queries fail
    if (!hasOrganization) {
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
                onClick={() => window.location.href = '/profile'}
                className="w-full"
              >
                Go to Profile Setup
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Check role requirement
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

  return <>{children}</>;
}
