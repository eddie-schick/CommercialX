import { useLocation } from "wouter";
import DealerDashboardLayout from "@/components/DealerDashboardLayout";
import { CreateListingForm } from "@/components/listings/CreateListingForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function CreateListing() {
  const [, setLocation] = useLocation();
  
  return (
    <ProtectedRoute requireDealer={true}>
      <DealerDashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dealer/vehicles")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Create New Listing</h1>
              <p className="text-muted-foreground">
                Add a new vehicle to your inventory
              </p>
            </div>
          </div>

          <CreateListingForm />
        </div>
      </DealerDashboardLayout>
    </ProtectedRoute>
  );
}

