import { SignupForm } from "@/components/auth/SignupForm";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export default function Signup() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 flex items-center justify-center py-12">
        <SignupForm />
      </main>
      <Footer />
    </div>
  );
}

