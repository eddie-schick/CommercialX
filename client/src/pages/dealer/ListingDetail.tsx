import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import DealerDashboardLayout from "@/components/DealerDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Loader2,
  Car,
  DollarSign,
  MapPin,
  Calendar,
  Eye,
  Gauge,
  Weight,
  Wrench,
} from "lucide-react";

export default function ListingDetail() {
  const [, params] = useRoute("/dealer/listings/:id");
  const [, setLocation] = useLocation();
  const listingId = params?.id ? parseInt(params.id) : null;

  const { data: listing, isLoading, refetch } = trpc.dealer.listings.getById.useQuery(
    { id: listingId! },
    { enabled: !!listingId }
  );

  const deleteListing = trpc.dealer.listings.delete.useMutation({
    onSuccess: () => {
      toast.success("Listing deleted successfully");
      setLocation("/dealer/vehicles");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete listing");
    },
  });

  const handleDelete = () => {
    if (!listing) return;
    
    const vehicleInfo = listing.vehicle
      ? `${listing.vehicle.year} ${listing.vehicle.make_name} ${listing.vehicle.model_name}`
      : "this listing";
    
    if (confirm(`Are you sure you want to delete ${vehicleInfo}? This will archive the listing.`)) {
      deleteListing.mutate({ id: listingId! });
    }
  };

  if (isLoading) {
    return (
      <DealerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading listing details...</p>
          </div>
        </div>
      </DealerDashboardLayout>
    );
  }

  if (!listing) {
    return (
      <DealerDashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Listing not found</p>
              <Button onClick={() => setLocation("/dealer/vehicles")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Listings
              </Button>
            </div>
          </CardContent>
        </Card>
      </DealerDashboardLayout>
    );
  }

  const vehicle = listing.vehicle;
  const vehicleConfig = listing.vehicleConfig;
  const equipmentConfig = listing.equipmentConfig;
  const images = listing.images || [];
  const primaryImage = images.find((img) => img.isPrimary) || images[0];

  return (
    <DealerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation("/dealer/vehicles")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Listing Details</h1>
              <p className="text-gray-600 mt-1">View and manage your vehicle listing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation(`/dealer/listings/${listingId}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleteListing.isPending}
              className="text-destructive hover:text-destructive"
            >
              {deleteListing.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Images and Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent>
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((image, index) => (
                      <div
                        key={image.id}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                          image.isPrimary ? "border-primary" : "border-gray-200"
                        }`}
                      >
                        <img
                          src={image.url}
                          alt={`Vehicle image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {image.isPrimary && (
                          <Badge className="absolute top-2 left-2">Primary</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <Car className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vehicle Information */}
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {vehicle && (
                  <div>
                    <h2 className="text-2xl font-bold">
                      {vehicle.year} {vehicle.make_name} {vehicle.model_name}
                      {vehicle.series && ` ${vehicle.series}`}
                    </h2>
                    {listing.config?.vin && (
                      <p className="text-sm text-muted-foreground mt-1">VIN: {listing.config.vin}</p>
                    )}
                  </div>
                )}

                {vehicleConfig && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                    {vehicleConfig.fuel_type && (
                      <div>
                        <p className="text-sm text-muted-foreground">Fuel Type</p>
                        <p className="font-medium capitalize">{vehicleConfig.fuel_type}</p>
                      </div>
                    )}
                    {vehicleConfig.body_style && (
                      <div>
                        <p className="text-sm text-muted-foreground">Body Style</p>
                        <p className="font-medium capitalize">
                          {vehicleConfig.body_style.replace(/_/g, " ")}
                        </p>
                      </div>
                    )}
                    {vehicleConfig.drive_type && (
                      <div>
                        <p className="text-sm text-muted-foreground">Drive Type</p>
                        <p className="font-medium">{vehicleConfig.drive_type}</p>
                      </div>
                    )}
                    {vehicleConfig.wheelbase_inches && (
                      <div>
                        <p className="text-sm text-muted-foreground">Wheelbase</p>
                        <p className="font-medium">{vehicleConfig.wheelbase_inches}"</p>
                      </div>
                    )}
                    {vehicleConfig.gvwr && (
                      <div>
                        <p className="text-sm text-muted-foreground">GVWR</p>
                        <p className="font-medium">{vehicleConfig.gvwr.toLocaleString()} lbs</p>
                      </div>
                    )}
                    {vehicleConfig.payload_capacity && (
                      <div>
                        <p className="text-sm text-muted-foreground">Payload Capacity</p>
                        <p className="font-medium">{vehicleConfig.payload_capacity.toLocaleString()} lbs</p>
                      </div>
                    )}
                    {vehicleConfig.engine && (
                      <div>
                        <p className="text-sm text-muted-foreground">Engine</p>
                        <p className="font-medium">{vehicleConfig.engine}</p>
                      </div>
                    )}
                    {vehicleConfig.transmission && (
                      <div>
                        <p className="text-sm text-muted-foreground">Transmission</p>
                        <p className="font-medium">{vehicleConfig.transmission}</p>
                      </div>
                    )}
                  </div>
                )}

                {equipmentConfig && (
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-3">Equipment</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {equipmentConfig.length_inches && (
                        <div>
                          <p className="text-sm text-muted-foreground">Length</p>
                          <p className="font-medium">{equipmentConfig.length_inches}"</p>
                        </div>
                      )}
                      {equipmentConfig.weight_lbs && (
                        <div>
                          <p className="text-sm text-muted-foreground">Weight</p>
                          <p className="font-medium">{equipmentConfig.weight_lbs.toLocaleString()} lbs</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            {listing.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Pricing and Details */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Asking Price</p>
                  <p className="text-3xl font-bold text-primary">
                    ${listing.asking_price?.toLocaleString() || "N/A"}
                  </p>
                </div>
                {listing.special_price && (
                  <div>
                    <p className="text-sm text-muted-foreground">Special Price</p>
                    <p className="text-2xl font-semibold text-green-600">
                      ${listing.special_price.toLocaleString()}
                    </p>
                  </div>
                )}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Condition</span>
                    <Badge className="capitalize">
                      {listing.condition?.replace(/_/g, " ") || "N/A"}
                    </Badge>
                  </div>
                  {listing.mileage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Mileage</span>
                      <span className="font-medium">{listing.mileage.toLocaleString()} miles</span>
                    </div>
                  )}
                  {listing.stock_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Stock #</span>
                      <span className="font-medium">{listing.stock_number}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status and Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Status & Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Status</p>
                  <Badge
                    variant={
                      listing.status === "available"
                        ? "default"
                        : listing.status === "draft"
                        ? "secondary"
                        : listing.status === "sold"
                        ? "destructive"
                        : "outline"
                    }
                    className="capitalize"
                  >
                    {listing.status}
                  </Badge>
                </div>
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Views</span>
                    </div>
                    <span className="font-medium">{listing.view_count || 0}</span>
                  </div>
                  {listing.created_at && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Created</span>
                      </div>
                      <span className="font-medium text-sm">
                        {new Date(listing.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            {(listing.location_city || listing.location_state) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">
                    {listing.location_city}
                    {listing.location_city && listing.location_state && ", "}
                    {listing.location_state}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DealerDashboardLayout>
  );
}

