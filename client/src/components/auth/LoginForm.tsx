import React, { useState } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string; retry?: boolean } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { signIn, loading } = useSupabaseAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    console.log('[LoginForm] Form submitted', { email: email ? 'provided' : 'missing', password: password ? 'provided' : 'missing' });
    
    // Validate inputs
    if (!email || !password) {
      const errorMsg = 'Email and password are required';
      console.error('[LoginForm] Validation failed:', errorMsg);
      setError({ message: errorMsg });
      return;
    }

    // Check if Supabase is configured
    try {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Supabase client is null');
      }
      console.log('[LoginForm] Supabase client is available');
      
      // Test connection before attempting sign-in
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured. Please check your environment variables.');
      }
      console.log('[LoginForm] Supabase URL configured:', supabaseUrl.substring(0, 30) + '...');
    } catch (supabaseError: any) {
      const errorMsg = supabaseError?.message || 'Supabase is not configured. Please check your environment variables.';
      console.error('[LoginForm] Supabase configuration error:', errorMsg);
      setError({ 
        message: errorMsg,
        code: 'CONFIG_ERROR',
        retry: false
      });
      return;
    }

    console.log('[LoginForm] Attempting to sign in...', { email });
    toast.loading('Signing in...', { id: 'signin' });
    
    try {
      // Call signIn directly - it now has its own timeout handling
      await signIn(email, password);
      console.log('[LoginForm] Sign in successful');
      toast.success('Signed in successfully!', { id: 'signin' });
      
      // Wait for session to be established and stored - give it more time
      console.log('[LoginForm] Waiting for session to be established...');
      let sessionEstablished = false;
      const maxWaitTime = 3000; // 3 seconds max
      const checkInterval = 100; // Check every 100ms
      const startTime = Date.now();
      
      while (!sessionEstablished && (Date.now() - startTime) < maxWaitTime) {
        const supabase = getSupabaseClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session && session.user) {
          console.log('[LoginForm] Session established:', session.user.id);
          sessionEstablished = true;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
      
      if (!sessionEstablished) {
        console.error('[LoginForm] Session verification failed - session not established after', maxWaitTime, 'ms');
        setError({ 
          message: 'Session could not be established. Please try again.',
          retry: true 
        });
        toast.error('Session could not be established. Please try again.', { id: 'signin' });
        return;
      }

      // Check email verification
      const client = getSupabaseClient();
      const { data: { user }, error: userError } = await client.auth.getUser();
      
      if (userError) {
        console.warn('[LoginForm] Warning getting user (non-fatal):', userError.message);
      }
      
      if (user && !user.email_confirmed_at) {
        // Email not verified - redirect to verification page
        console.log('[LoginForm] Email not verified, redirecting to verify...');
        toast.info('Please verify your email address', { id: 'signin' });
        window.location.href = '/verify-email';
        return;
      }
      
      // Note: Organization check will be handled by ProtectedRoute
      // If user is a dealer without organization, they'll be redirected there
      
      // Session is established - redirect to dashboard with full page reload
      // Use full page reload to ensure session is properly picked up
      console.log('[LoginForm] Session verified, redirecting to dealer dashboard');
      window.location.href = '/dealer';
    } catch (err: any) {
      console.error('[LoginForm] Login failed:', err);
      
      // Handle different error types
      const errorMessage = err?.message || 'Failed to sign in. Please check your credentials.';
      let errorCode = 'UNKNOWN';
      let canRetry = false;
      
      if (errorMessage === 'TIMEOUT' || errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        errorCode = 'TIMEOUT';
        canRetry = true;
      } else if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('Invalid credentials')) {
        errorCode = 'INVALID_CREDENTIALS';
      } else if (errorMessage.includes('Email not confirmed') || errorMessage.includes('email_confirmed_at')) {
        errorCode = 'EMAIL_NOT_VERIFIED';
      } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch')) {
        errorCode = 'NETWORK_ERROR';
        canRetry = true;
      }
      
      setError({ 
        message: errorCode === 'TIMEOUT' 
          ? 'Sign in request timed out. Please check your connection and try again.'
          : errorCode === 'INVALID_CREDENTIALS'
          ? 'Invalid email or password'
          : errorCode === 'EMAIL_NOT_VERIFIED'
          ? 'Please verify your email before signing in.'
          : errorCode === 'NETWORK_ERROR'
          ? 'Unable to connect. Please check your internet connection.'
          : errorMessage,
        code: errorCode,
        retry: canRetry
      });
      
      toast.error(
        errorCode === 'TIMEOUT' 
          ? 'Connection timeout. Please check your internet and try again.'
          : errorMessage,
        { id: 'signin' }
      );
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                Remember me
              </Label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sign in failed</AlertTitle>
                <AlertDescription>
                  {error.message}
                  {error.retry && (
                    <Button
                      variant="link"
                      onClick={handleRetry}
                      className="ml-2 h-auto p-0 text-sm"
                      disabled={loading}
                    >
                      Try Again
                    </Button>
                  )}
                  {error.code === 'EMAIL_NOT_VERIFIED' && (
                    <Button
                      variant="link"
                      onClick={() => window.location.href = '/verify-email'}
                      className="ml-2 h-auto p-0 text-sm"
                    >
                      Resend Verification Email
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => window.location.href = '/forgot-password'}
                className="text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

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

