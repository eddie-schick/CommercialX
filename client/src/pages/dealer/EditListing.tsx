import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import DealerDashboardLayout from "@/components/DealerDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { ImageUploadZone } from "@/components/ui/ImageUploadZone";

export default function EditListing() {
  const [, params] = useRoute("/dealer/listings/:id/edit");
  const [, setLocation] = useLocation();
  const listingId = params?.id ? parseInt(params.id) : null;

  const { data: listing, isLoading } = trpc.dealer.listings.getById.useQuery(
    { id: listingId! },
    { enabled: !!listingId }
  );

  const updateListing = trpc.dealer.listings.update.useMutation({
    onSuccess: () => {
      toast.success("Listing updated successfully");
      setLocation(`/dealer/listings/${listingId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update listing");
    },
  });

  const [formData, setFormData] = useState({
    askingPrice: 0,
    specialPrice: 0,
    stockNumber: "",
    condition: "new" as "new" | "used" | "certified_pre_owned" | "demo",
    mileage: 0,
    exteriorColor: "",
    interiorColor: "",
    description: "",
    locationCity: "",
    locationState: "",
    status: "draft" as "draft" | "available" | "pending" | "sold" | "archived",
    photos: [] as string[],
  });

  useEffect(() => {
    if (listing) {
      setFormData({
        askingPrice: listing.asking_price || 0,
        specialPrice: listing.special_price || 0,
        stockNumber: listing.stock_number || "",
        condition: listing.condition === "used" ? "used" : 
                   listing.condition === "new" ? "new" : 
                   listing.condition === "demo" ? "demo" : "used",
        mileage: listing.mileage || 0,
        exteriorColor: listing.exterior_color || "",
        interiorColor: listing.interior_color || "",
        description: listing.description || "",
        locationCity: listing.location_city || "",
        locationState: listing.location_state || "",
        status: listing.status,
        photos: listing.images?.map((img) => img.url) || [],
      });
    }
  }, [listing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!listingId) return;

    try {
      await updateListing.mutateAsync({
        id: listingId,
        askingPrice: formData.askingPrice || undefined,
        specialPrice: formData.specialPrice || undefined,
        stockNumber: formData.stockNumber || undefined,
        condition: formData.condition,
        mileage: formData.mileage || undefined,
        exteriorColor: formData.exteriorColor || undefined,
        interiorColor: formData.interiorColor || undefined,
        description: formData.description || undefined,
        locationCity: formData.locationCity || undefined,
        locationState: formData.locationState || undefined,
        status: formData.status,
        photos: formData.photos.length > 0 ? formData.photos : undefined,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <DealerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading listing...</p>
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

  return (
    <DealerDashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setLocation(`/dealer/listings/${listingId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Listing</h1>
            <p className="text-gray-600 mt-1">
              {vehicle
                ? `${vehicle.year} ${vehicle.make_name} ${vehicle.model_name}`
                : "Update listing details"}
            </p>
          </div>
        </div>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="askingPrice">Asking Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="askingPrice"
                    type="number"
                    className="pl-7"
                    value={formData.askingPrice || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        askingPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="specialPrice">Special/Sale Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="specialPrice"
                    type="number"
                    className="pl-7"
                    value={formData.specialPrice || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specialPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listing Details */}
        <Card>
          <CardHeader>
            <CardTitle>Listing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stockNumber">Stock Number</Label>
                <Input
                  id="stockNumber"
                  value={formData.stockNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, stockNumber: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="condition">Condition *</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, condition: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="certified_pre_owned">
                      Certified Pre-Owned
                    </SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(formData.condition === "used" ||
                formData.condition === "certified_pre_owned") && (
                <div>
                  <Label htmlFor="mileage">Mileage *</Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={formData.mileage || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mileage: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
              )}
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="exteriorColor">Exterior Color</Label>
                <Input
                  id="exteriorColor"
                  value={formData.exteriorColor}
                  onChange={(e) =>
                    setFormData({ ...formData, exteriorColor: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="interiorColor">Interior Color</Label>
                <Input
                  id="interiorColor"
                  value={formData.interiorColor}
                  onChange={(e) =>
                    setFormData({ ...formData, interiorColor: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={6}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe this vehicle's features, condition, and unique selling points..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="locationCity">City</Label>
                <Input
                  id="locationCity"
                  value={formData.locationCity}
                  onChange={(e) =>
                    setFormData({ ...formData, locationCity: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="locationState">State</Label>
                <Input
                  id="locationState"
                  value={formData.locationState}
                  onChange={(e) =>
                    setFormData({ ...formData, locationState: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploadZone
              value={formData.photos}
              onChange={(urls) => setFormData({ ...formData, photos: urls })}
              maxFiles={20}
              label="Vehicle Photos"
              description="Upload clear photos of the exterior, interior, equipment, and any damage"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation(`/dealer/listings/${listingId}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={updateListing.isPending}>
            {updateListing.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </DealerDashboardLayout>
  );
}

