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
    try {
      setLoading(true);
      setError(null);

      console.log('[useSupabaseAuth] Attempting sign in...');
      
      const client = getSupabaseClient();
      console.log('[useSupabaseAuth] Supabase client obtained');
      
      const { data, error: signInError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[useSupabaseAuth] Sign in response:', { data, error: signInError });

      if (signInError) {
        console.error('[useSupabaseAuth] Sign in error:', signInError);
        throw signInError;
      }

      console.log('[useSupabaseAuth] Sign in successful');
    } catch (err) {
      console.error('[useSupabaseAuth] Sign in exception:', err);
      const error = err instanceof Error ? err : new Error('Sign in failed');
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

