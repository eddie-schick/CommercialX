import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getSupabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkVerification = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLocation('/login');
          return;
        }

        setEmail(user.email || '');

        // Check if email is already verified
        if (user.email_confirmed_at) {
          // Email is verified, check if they have organization
          const { data: { user: refreshedUser } } = await supabase.auth.getUser();
          if (refreshedUser?.email_confirmed_at) {
            setLocation('/setup-organization');
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

    // Poll for email confirmation
    const interval = setInterval(async () => {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email_confirmed_at) {
        clearInterval(interval);
        toast.success('Email verified!');
        setLocation('/setup-organization');
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [setLocation]);

  const handleResend = async () => {
    try {
      setIsResending(true);
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Verification email sent! Please check your inbox.');
      }
    } catch (error) {
      toast.error('Failed to resend verification email');
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

  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Verify Your Email</CardTitle>
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

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-semibold">Didn't receive the email?</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Check your spam/junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes for the email to arrive</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleResend} 
              disabled={isResending}
              variant="outline"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </Button>
            <Button 
              onClick={() => setLocation('/login')} 
              variant="ghost"
            >
              Back to Login
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Once verified, you'll be able to complete your organization setup.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

