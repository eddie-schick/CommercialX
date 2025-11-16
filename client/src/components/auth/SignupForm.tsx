import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { getSupabaseClient } from '@/lib/supabase';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const setupOrg = trpc.auth.setupOrganization.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare data
      const userName = name.trim() || email.split('@')[0];
      const orgName = organizationName.trim() || `${userName}'s Organization`;

      console.log('🚀 Starting signup process...');

      // STEP 1: Create Supabase Auth user
      const client = getSupabaseClient();
      const { data: authData, error: authError } = await client.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: userName,
            // Store org name for potential auto-creation via trigger
            organization_name: orgName,
            create_organization: true,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('User creation failed - no user returned');
      }

      console.log('✅ User created:', authData.user.id);

      // STEP 2: Setup dealer organization (atomic transaction)
      try {
        const orgResult = await setupOrg.mutateAsync({
          userId: authData.user.id,
          email: email.trim(),
          name: userName,
          organizationName: orgName,
        });

        console.log('✅ Organization setup complete:', orgResult);

        // Success!
        toast.success('Account created successfully! Please check your email to verify your account.');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          setLocation('/login');
        }, 2000);

      } catch (orgError: any) {
        console.error('❌ Organization setup failed:', orgError);
        
        // User was created but organization failed
        toast.warning(
          'Account created, but organization setup failed. ' +
          'Please contact support or try logging in and completing setup.'
        );
        
        // Still redirect to login after 5 seconds
        setTimeout(() => {
          setLocation('/login');
        }, 5000);
      }

    } catch (err: any) {
      console.error('❌ Signup error:', err);
      const errorMessage = err?.message || 'An error occurred during signup';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                disabled={isSubmitting || setupOrg.isPending}
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
                minLength={8}
                placeholder="••••••••"
                disabled={isSubmitting || setupOrg.isPending}
              />
              <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                disabled={isSubmitting || setupOrg.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                disabled={isSubmitting || setupOrg.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">Dealership Name</Label>
              <Input
                id="organizationName"
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="ABC Motors"
                disabled={isSubmitting || setupOrg.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Optional - your dealership or organization name
              </p>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || setupOrg.isPending}
              className="w-full"
            >
              {isSubmitting || setupOrg.isPending ? 'Creating account...' : 'Sign Up'}
            </Button>

            <div className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setLocation('/login')}
                className="text-primary hover:underline"
              >
                Sign in
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

