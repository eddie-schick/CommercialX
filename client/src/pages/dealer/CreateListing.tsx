import { useLocation } from "wouter";
import DealerDashboardLayout from "@/components/DealerDashboardLayout";
import { CreateListingForm } from "@/components/listings/CreateListingForm";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function CreateListing() {
  const [, setLocation] = useLocation();
  
  // Check if this is onboarding flow (from query param)
  const searchParams = new URLSearchParams(window.location.search);
  const isOnboarding = searchParams.get("onboarding") === "true";

  return (
    <ProtectedRoute requireDealer={true}>
      <DealerDashboardLayout>
      <div className="space-y-6">
        {isOnboarding && (
          <Alert className="border-primary/20 bg-primary/5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Welcome to CommercialX!</AlertTitle>
            <AlertDescription>
              You're all set up! Let's add your first vehicle to get started. This will help buyers discover your inventory.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center gap-4">
          {!isOnboarding && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dealer/vehicles")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">
              {isOnboarding ? "Add Your First Vehicle" : "Create New Listing"}
            </h1>
            <p className="text-muted-foreground">
              {isOnboarding 
                ? "Create your first vehicle listing to start selling"
                : "Add a new vehicle to your inventory"
              }
            </p>
          </div>
        </div>

        <CreateListingForm isOnboarding={isOnboarding} />
      </div>
    </DealerDashboardLayout>
    </ProtectedRoute>
  );
}

