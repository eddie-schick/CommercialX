import { useState } from 'react';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import type { SignupData } from '@/types/user';

interface UseSupabaseAuthReturn {
  signUp: (data: SignupData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signUp = async (data: SignupData) => {
    try {
      setLoading(true);
      setError(null);

      const client = getSupabaseClient();
      const { error: signUpError } = await client.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            organization_id: data.organizationId,
            role: data.role || 'member',
            invited_by: data.invitedBy,
          },
        },
      });

      if (signUpError) throw signUpError;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Signup failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      setLoading(true);
      setError(null);

      console.log('[useSupabaseAuth] Attempting sign in...');
      
      // Validate Supabase client configuration first
      const client = getSupabaseClient();
      console.log('[useSupabaseAuth] Supabase client obtained');
      
      // Check if we can reach Supabase by testing the URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured. Please check your environment variables.');
      }

      // Test network connectivity first - try to reach the auth endpoint
      console.log('[useSupabaseAuth] Testing network connectivity to Supabase auth endpoint...');
      try {
        const authTestUrl = `${supabaseUrl}/auth/v1/health`;
        const healthCheckController = new AbortController();
        const healthCheckTimeout = setTimeout(() => {
          console.warn('[useSupabaseAuth] Health check timeout after 5s');
          healthCheckController.abort();
        }, 5000);
        
        const healthResponse = await fetch(authTestUrl, {
          method: 'GET',
          signal: healthCheckController.signal,
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          },
        }).finally(() => clearTimeout(healthCheckTimeout));
        
        console.log('[useSupabaseAuth] Network connectivity test result:', {
          status: healthResponse.status,
          statusText: healthResponse.statusText,
          ok: healthResponse.ok,
        });
      } catch (healthErr: any) {
        console.error('[useSupabaseAuth] Health check failed:', {
          message: healthErr.message,
          name: healthErr.name,
          cause: healthErr.cause,
        });
        // If health check fails completely, it's likely a network issue
        if (healthErr.name === 'AbortError' || healthErr.message?.includes('timeout')) {
          throw new Error('Cannot reach authentication server. Please check your internet connection and firewall settings.');
        }
        // Continue anyway - the health check might fail but auth might still work
      }
      
      // Use auth state change as fallback if promise hangs
      let authStateResolved = false;
      let authStateResolver: ((value: { data: any; error: any }) => void) | null = null;
      let authStateRejecter: ((error: Error) => void) | null = null;
      
      // Set up auth state listener as fallback
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session && !authStateResolved && authStateResolver) {
          console.log('[useSupabaseAuth] Auth state change detected SIGNED_IN, resolving promise');
          authStateResolved = true;
          authStateResolver({ data: { user: session.user, session }, error: null });
        }
      });

      // Create a timeout wrapper
      const signInWithTimeout = new Promise<{ data: any; error: any }>((resolve, reject) => {
        authStateResolver = resolve;
        authStateRejecter = reject;
        
        const startTime = Date.now();
        console.log('[useSupabaseAuth] Starting signInWithPassword at', new Date().toISOString());
        
        // Set timeout
        timeoutId = setTimeout(async () => {
          const elapsed = Date.now() - startTime;
          console.warn('[useSupabaseAuth] Timeout after', elapsed, 'ms - checking if sign-in actually succeeded...');
          
          // Before rejecting, check if we actually have a session (fallback)
          try {
            const { data: { session: currentSession }, error: sessionError } = await client.auth.getSession();
            if (currentSession && currentSession.user) {
              console.log('[useSupabaseAuth] Found session after timeout - sign-in actually succeeded!');
              authStateResolved = true;
              resolve({ data: { user: currentSession.user, session: currentSession }, error: null });
              return;
            }
          } catch (checkErr) {
            console.error('[useSupabaseAuth] Error checking session after timeout:', checkErr);
          }
          
          // No session found, reject
          console.error('[useSupabaseAuth] No session found after timeout - sign in failed');
          authStateResolved = true;
          reject(new Error('Sign in request timed out. Please check your connection and try again.'));
        }, 25000); // 25 second timeout

        // Start the sign-in
        client.auth.signInWithPassword({
          email,
          password,
        })
        .then((result) => {
          if (authStateResolved) {
            console.log('[useSupabaseAuth] Promise resolved but already handled by auth state change');
            return;
          }
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          const elapsed = Date.now() - startTime;
          console.log('[useSupabaseAuth] signInWithPassword completed in', elapsed, 'ms');
          authStateResolved = true;
          resolve(result);
        })
        .catch((err: any) => {
          if (authStateResolved) {
            console.log('[useSupabaseAuth] Promise rejected but already handled by auth state change');
            return;
          }
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          const elapsed = Date.now() - startTime;
          console.error('[useSupabaseAuth] signInWithPassword failed after', elapsed, 'ms:', err);
          
          // Check if it's a network error
          if (err?.message?.includes('fetch') || err?.message?.includes('network') || err?.code === 'ECONNREFUSED') {
            authStateResolved = true;
            reject(new Error('Unable to connect to authentication server. Please check your internet connection and try again.'));
            return;
          }
          // Check for abort signal
          if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
            authStateResolved = true;
            reject(new Error('Sign in request was cancelled. Please try again.'));
            return;
          }
          authStateResolved = true;
          reject(err);
        });
      });

      const { data, error: signInError } = await signInWithTimeout.finally(() => {
        // Clean up auth state listener
        subscription.unsubscribe();
      });

      console.log('[useSupabaseAuth] Sign in response:', { 
        hasData: !!data, 
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: signInError 
      });

      if (signInError) {
        console.error('[useSupabaseAuth] Sign in error:', signInError);
        
        // Provide more helpful error messages
        let errorMessage = signInError.message || 'Sign in failed';
        if (signInError.message?.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (signInError.message?.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before signing in.';
        } else if (signInError.message?.includes('fetch') || signInError.message?.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        const error = new Error(errorMessage);
        (error as any).code = signInError.code;
        throw error;
      }

      // Verify we got a session
      if (!data?.session) {
        console.error('[useSupabaseAuth] No session returned from sign in');
        throw new Error('Sign in succeeded but no session was created. Please try again.');
      }

      console.log('[useSupabaseAuth] Sign in successful, session created');
    } catch (err) {
      // Clear timeout if still set
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      console.error('[useSupabaseAuth] Sign in exception:', err);
      
      // Provide better error messages
      let errorMessage = 'Sign in failed';
      if (err instanceof Error) {
        errorMessage = err.message;
        // Check for common issues
        if (errorMessage.includes('Supabase client is not initialized')) {
          errorMessage = 'Authentication service is not configured. Please contact support.';
        } else if (errorMessage.includes('timed out')) {
          errorMessage = 'Sign in request timed out. This could be due to:\n- Slow internet connection\n- Authentication server is unreachable\n- Firewall or network restrictions\n\nPlease check your connection and try again.';
        }
      }
      
      const error = err instanceof Error ? new Error(errorMessage) : new Error('Sign in failed');
      if (err instanceof Error && (err as any).code) {
        (error as any).code = (err as any).code;
      }
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const client = getSupabaseClient();
      const { error: signOutError } = await client.auth.signOut();

      if (signOutError) throw signOutError;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign out failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      const client = getSupabaseClient();
      const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Password reset failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    signUp,
    signIn,
    signOut,
    resetPassword,
    loading,
    error,
  };
}

