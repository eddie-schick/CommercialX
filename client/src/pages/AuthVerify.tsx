import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getSupabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthVerify() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const supabase = getSupabaseClient();
        
        // Supabase automatically handles the token from URL hash when detectSessionInUrl is true
        // We just need to check if the session was established
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthVerify] Session error:', sessionError);
          setStatus('error');
          setErrorMessage(
            sessionError.message.includes('expired') 
              ? 'This verification link has expired. Please request a new one.'
              : sessionError.message || 'Failed to verify email. Please try again.'
          );
          return;
        }

        if (!session?.user) {
          // No session yet, wait a bit for Supabase to process the URL hash
          setTimeout(async () => {
            const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession();
            
            if (retryError || !retrySession?.user) {
              setStatus('error');
              setErrorMessage('Unable to verify email. The link may be invalid or expired.');
              return;
            }

            // Success - session established
            const user = retrySession.user;
            setUserEmail(user.email || '');
            
            if (user.email_confirmed_at) {
              setStatus('success');
              toast.success('Email verified successfully!');
              
              // Redirect after showing success message
              setTimeout(() => {
                redirectUser(user);
              }, 2000);
            } else {
              setStatus('error');
              setErrorMessage('Email verification failed. Please try again.');
            }
          }, 1000);
          return;
        }

        // Session exists - check if email is confirmed
        const user = session.user;
        setUserEmail(user.email || '');

        if (user.email_confirmed_at) {
          setStatus('success');
          toast.success('Email verified successfully!');
          
          // Redirect after showing success message
          setTimeout(() => {
            redirectUser(user);
          }, 2000);
        } else {
          // Email not confirmed yet, wait a moment
          setTimeout(async () => {
            const { data: { user: updatedUser } } = await supabase.auth.getUser();
            if (updatedUser?.email_confirmed_at) {
              setStatus('success');
              toast.success('Email verified successfully!');
              setTimeout(() => {
                redirectUser(updatedUser);
              }, 2000);
            } else {
              setStatus('error');
              setErrorMessage('Email verification failed. Please try again.');
            }
          }, 1000);
        }
      } catch (error: any) {
        console.error('[AuthVerify] Verification error:', error);
        setStatus('error');
        setErrorMessage(error?.message || 'An unexpected error occurred. Please try again.');
      }
    };

    verifyEmail();
  }, [setLocation]);

  const redirectUser = async (user: any) => {
    const accountType = user.user_metadata?.accountType || 'dealer';
    
    if (accountType === 'dealer') {
      // Wait a moment for the trigger to create organization, then check
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const { trpc } = await import('@/lib/trpc');
        const hasOrg = await trpc.auth.hasOrganization.query();
        
        if (!hasOrg) {
          setLocation('/onboarding/organization');
        } else {
          setLocation('/dealer');
        }
      } catch (error) {
        // If check fails, redirect to organization setup
        setLocation('/onboarding/organization');
      }
    } else {
      setLocation('/dashboard');
    }
  };

  if (status === 'verifying') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">Verifying Your Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                Please wait while we confirm your email address...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Email Confirmed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                Your email address has been successfully verified.
              </p>
              {userEmail && (
                <p className="font-semibold text-sm">{userEmail}</p>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                Redirecting you to continue setup...
              </p>
            </div>
            <div className="flex justify-center pt-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="max-w-md w-full mx-4">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
              <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Verification Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button
              onClick={() => setLocation('/verify-email')}
              className="w-full"
            >
              Request New Verification Email
            </Button>
            <Button
              onClick={() => setLocation('/login')}
              variant="outline"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              If you continue to experience issues, please contact support for assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


