import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getSupabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const RESEND_COOLDOWN_SECONDS = 60; // 60 seconds between resend requests

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  // Check verification status on mount
  useEffect(() => {
    const checkVerification = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setLocation('/login');
          return;
        }

        setEmail(user.email || '');

        // Check if email is already verified
        if (user.email_confirmed_at) {
          setIsVerified(true);
          toast.success('Email verified!');
          
          // Check if user needs organization setup
          const accountType = user.user_metadata?.accountType || 'dealer';
          if (accountType === 'dealer') {
            // Check if organization exists
            const { trpc } = await import('@/lib/trpc');
            const hasOrg = await trpc.auth.hasOrganization.query();
            
            if (!hasOrg) {
              setTimeout(() => {
                setLocation('/onboarding/organization');
              }, 2000);
            } else {
              setTimeout(() => {
                setLocation('/dealer');
              }, 2000);
            }
          } else {
            setTimeout(() => {
              setLocation('/dashboard');
            }, 2000);
          }
        } else {
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Error checking verification:', error);
        setIsChecking(false);
      }
    };

    checkVerification();

    // Poll for email confirmation every 3 seconds
    const interval = setInterval(async () => {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email_confirmed_at && !isVerified) {
        clearInterval(interval);
        setIsVerified(true);
        toast.success('Email verified!');
        
        // Redirect based on account type
        const accountType = user.user_metadata?.accountType || 'dealer';
        if (accountType === 'dealer') {
          const { trpc } = await import('@/lib/trpc');
          const hasOrg = await trpc.auth.hasOrganization.query();
          
          if (!hasOrg) {
            setLocation('/onboarding/organization');
          } else {
            setLocation('/dealer');
          }
        } else {
          setLocation('/dashboard');
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [setLocation, isVerified]);

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) {
      return;
    }

    try {
      setIsResending(true);
      const supabase = getSupabaseClient();
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify?token=`,
        },
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          toast.error('Too many requests. Please wait a moment before trying again.');
          setResendCooldown(120); // 2 minutes if rate limited
        } else {
          toast.error(error.message || 'Failed to resend verification email');
        }
      } else {
        setResendCount(prev => prev + 1);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        toast.success('Verification email sent! Please check your inbox.');
      }
    } catch (error: any) {
      console.error('Error resending email:', error);
      toast.error('Failed to resend verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-lg">Checking verification status...</div>
        </div>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Email Verified!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                Your email has been successfully verified.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting you to continue setup...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Check Your Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              We've sent a verification email to:
            </p>
            <p className="font-semibold">{email}</p>
            <p className="text-sm text-muted-foreground">
              Please click the link in the email to verify your account.
            </p>
          </div>

          {resendCount > 0 && (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                {resendCount === 1 
                  ? 'A new verification email has been sent.'
                  : `${resendCount} verification emails have been sent.`}
              </AlertDescription>
            </Alert>
          )}

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-semibold">Didn't receive the email?</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Check your spam/junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes for the email to arrive</li>
              <li>Check that the email didn't get filtered by your email provider</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleResend} 
              disabled={isResending || resendCooldown > 0}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Resend in {resendCooldown}s
                </>
              ) : (
                'Resend Verification Email'
              )}
            </Button>
            
            <Button 
              onClick={() => {
                const supabase = getSupabaseClient();
                supabase.auth.signOut();
                setLocation('/login');
              }} 
              variant="ghost"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">Wrong email address?</p>
                <p>
                  If you need to change your email, please contact support or sign out and create a new account with the correct email.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Once verified, you'll be able to complete your organization setup.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
