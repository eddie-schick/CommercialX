import React from 'react';
import { useLocation } from 'wouter';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Loader2 } from 'lucide-react';

export default function SetupOrganization() {
  const [, setLocation] = useLocation();
  const { user, profile, loading } = useCurrentUser();

  // Redirect to profile page - all onboarding is now handled there
  React.useEffect(() => {
    if (!loading) {
      if (user) {
        // Redirect to profile page where user can set up organization and dealer
        setLocation('/profile');
      } else {
        // Not logged in, redirect to login
        setLocation('/login');
      }
    }
  }, [loading, user, setLocation]);

  // If user already has a profile, redirect to dashboard
  React.useEffect(() => {
    if (!loading && user && profile && profile.organization_id) {
      setLocation('/dealer');
    }
  }, [loading, user, profile, setLocation]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="text-lg">Redirecting...</div>
      </div>
    </div>
  );
}
