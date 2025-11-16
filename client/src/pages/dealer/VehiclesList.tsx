import { useLocation } from "wouter";
import DealerDashboardLayout from "@/components/DealerDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function DealerVehiclesList() {
  const [, setLocation] = useLocation();

  return (
    <DealerDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vehicle Listings</h1>
            <p className="text-gray-600 mt-2">Manage your vehicle inventory</p>
          </div>
          <Button onClick={() => setLocation("/dealer/listings/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Listing
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your vehicle listings will appear here. Click "Create New Listing" to add a vehicle to your inventory.
            </p>
          </CardContent>
        </Card>
      </div>
    </DealerDashboardLayout>
  );
}

