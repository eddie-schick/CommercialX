import React from "react";
import DealerDashboardLayout from "@/components/DealerDashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import {
  Package,
  Zap,
  CheckCircle2,
  X,
  Car,
} from "lucide-react";

function DealerDashboardContent() {
  // Check if onboarding is complete from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const [showOnboardingComplete, setShowOnboardingComplete] = React.useState(
    searchParams.get("onboarding_complete") === "true"
  );
  const quickActions = [
    {
      title: "Create Vehicle Listing",
      description: "Add a new vehicle to your inventory",
      icon: Car,
      href: "/dealer/listings/new",
      color: "text-blue-600",
    },
    {
      title: "Add Body/Equipment",
      description: "Add upfitting equipment to your catalog",
      icon: Package,
      href: "/dealer/bodies/new",
      color: "text-orange-600",
    },
    {
      title: "Add Infrastructure",
      description: "List charging infrastructure products",
      icon: Zap,
      href: "/dealer/infrastructure/new",
      color: "text-yellow-600",
    },
  ];

  return (
    <DealerDashboardLayout>
      <div className="space-y-8">
        {/* Onboarding Complete Banner */}
        {showOnboardingComplete && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Welcome to CommercialX!</AlertTitle>
            <AlertDescription className="text-green-700">
              Your organization and first vehicle have been set up successfully. You're all set to start selling!
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => setShowOnboardingComplete(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Manage your inventory and track performance
          </p>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Add new items to your inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action) => (
                <Button
                  key={action.title}
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-start gap-3 hover:border-primary"
                  asChild
                >
                  <Link href={action.href}>
                    <div className="flex items-center gap-3 w-full">
                      <action.icon className={`h-5 w-5 ${action.color}`} />
                      <span className="font-semibold">{action.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 text-left">{action.description}</p>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </DealerDashboardLayout>
  );
}

export default function DealerDashboard() {
  return (
    <ProtectedRoute requireDealer={true}>
      <DealerDashboardContent />
    </ProtectedRoute>
  );
}
