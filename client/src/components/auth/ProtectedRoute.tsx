import React from 'react';
import { useLocation } from 'wouter';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'owner' | 'admin' | 'member' | 'viewer';
  requireDealer?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireRole,
  requireDealer = false 
}: ProtectedRouteProps) {
  const { user, profile, dealerId, loading } = useCurrentUser();
  const [, setLocation] = useLocation();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    // Use setTimeout to avoid state update during render
    React.useEffect(() => {
      setLocation('/login');
    }, []);
    return null;
  }

  // Check if profile exists
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              No Organization Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No organization profile found. Please contact support to complete your account setup.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role requirement
  if (requireRole) {
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

  // Check dealer requirement
  if (requireDealer && !dealerId) {
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

  return <>{children}</>;
}

