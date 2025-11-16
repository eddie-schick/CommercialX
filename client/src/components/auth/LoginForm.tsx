import React, { useState } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase';
import { trpc } from '@/lib/trpc';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading, error } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  const hasOrganization = trpc.auth.hasOrganization.useQuery(undefined, {
    enabled: false, // Only run when manually called
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[LoginForm] Form submitted', { email: email ? 'provided' : 'missing', password: password ? 'provided' : 'missing' });
    
    // Validate inputs
    if (!email || !password) {
      const errorMsg = 'Email and password are required';
      console.error('[LoginForm] Validation failed:', errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Check if Supabase is configured
    try {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Supabase client is null');
      }
      console.log('[LoginForm] Supabase client is available');
    } catch (supabaseError: any) {
      const errorMsg = supabaseError?.message || 'Supabase is not configured. Please check your environment variables.';
      console.error('[LoginForm] Supabase configuration error:', errorMsg);
      toast.error(errorMsg);
      return;
    }

    console.log('[LoginForm] Attempting to sign in...', { email });
    toast.loading('Signing in...', { id: 'signin' });
    
    try {
      await signIn(email, password);
      console.log('[LoginForm] Sign in successful, checking verification and organization...');
      toast.success('Signed in successfully!', { id: 'signin' });
      
      // Check email verification first
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && !user.email_confirmed_at) {
        // Email not verified - redirect to verification page
        console.log('[LoginForm] Email not verified, redirecting to verify...');
        setTimeout(() => {
          setLocation('/verify-email');
        }, 1000);
        return;
      }
      
      // Check if user has organization
      try {
        const orgCheck = await hasOrganization.refetch();
        console.log('[LoginForm] Organization check result:', orgCheck.data);
        
        if (orgCheck.data === false) {
          // User exists but no organization - needs setup
          console.log('[LoginForm] User has no organization, redirecting to setup...');
          setTimeout(() => {
            setLocation('/setup-organization');
          }, 1000);
        } else {
          // Normal flow - go to dashboard
          console.log('[LoginForm] User has organization, redirecting to dashboard...');
          setTimeout(() => {
            setLocation('/dealer');
          }, 500);
        }
      } catch (orgCheckError) {
        console.error('[LoginForm] Error checking organization:', orgCheckError);
        // Default to dashboard if check fails
        setTimeout(() => {
          setLocation('/dealer');
        }, 500);
      }
    } catch (err: any) {
      // Error is handled by useSupabaseAuth hook, but log it here too
      console.error('[LoginForm] Login failed:', err);
      const errorMessage = err?.message || 'Failed to sign in. Please check your credentials.';
      toast.error(errorMessage, { id: 'signin' });
      // The error state from the hook should display the error message
    }
  };


  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={handleSubmit} 
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error.message}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setLocation('/signup')}
                className="text-primary hover:underline"
              >
                Sign up
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

