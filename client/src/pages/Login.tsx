import { LoginForm } from "@/components/auth/LoginForm";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { getSupabaseClient } from "@/lib/supabase";

export default function Login() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('[Login] User already authenticated, redirecting to profile');
          // User is already logged in, redirect to profile page
          setLocation('/profile');
        }
      } catch (error) {
        // If check fails, stay on login page
        console.log('[Login] Auth check failed, staying on login page');
      }
    };

    checkAuth();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 flex items-center justify-center py-12">
        <LoginForm />
      </main>
      <Footer />
    </div>
  );
}

