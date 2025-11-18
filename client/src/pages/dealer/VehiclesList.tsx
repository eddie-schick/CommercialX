import { useState } from "react";
import DealerDashboardLayout from "@/components/DealerDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Plus, Search, Edit, Trash2, Eye, Loader2, Car } from "lucide-react";
import { toast } from "sonner";

export default function DealerVehiclesList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data: listings, isLoading, refetch } = trpc.dealer.listings.list.useQuery({
    status: status !== "all" ? (status as any) : undefined,
    limit: 100,
  });

  const deleteListing = trpc.dealer.listings.delete.useMutation({
    onSuccess: () => {
      toast.success("Listing deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete listing");
    },
  });

  const handleDelete = async (id: number) => {
    const listing = listings?.find((l: any) => l.id === id);
    const vehicleInfo = listing?.vehicle
      ? `${listing.vehicle.year} ${listing.vehicle.make_name} ${listing.vehicle.model_name}`
      : "this listing";
    
    if (confirm(`Are you sure you want to delete ${vehicleInfo}? This will archive the listing.`)) {
      try {
        await deleteListing.mutateAsync({ id });
      } catch (error) {
        // Error handled by mutation onError
      }
    }
  };

  // Filter by search term on frontend
  const filteredListings = listings?.filter((listing: any) => {
    if (status !== "all" && listing.status !== status) return false;
    
    if (search) {
      const searchLower = search.toLowerCase();
      const vehicle = listing.vehicle;
      const vehicleText = vehicle
        ? `${vehicle.year} ${vehicle.make_name} ${vehicle.model_name} ${vehicle.series || ""}`.toLowerCase()
        : "";
      const stockNumber = listing.stock_number?.toLowerCase() || "";
      const vin = listing.config?.vin?.toLowerCase() || "";
      
      return (
        vehicleText.includes(searchLower) ||
        stockNumber.includes(searchLower) ||
        vin.includes(searchLower)
      );
    }
    
    return true;
  });

  return (
    <DealerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
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

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by VIN, stock number, make, model..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Listings List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredListings?.length || 0} Listing{filteredListings?.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading listings...</p>
              </div>
            ) : filteredListings && filteredListings.length > 0 ? (
              <div className="space-y-4">
                {filteredListings.map((listing: any) => {
                  const vehicle = listing.vehicle;
                  const vehicleConfig = listing.vehicleConfig;
                  const primaryImage = listing.images?.find((img: any) => img.isPrimary) || listing.images?.[0];
                  
                  return (
                    <div
                      key={listing.id}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors"
                    >
                      <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {primaryImage?.url ? (
                          <img
                            src={primaryImage.url}
                            alt={vehicle ? `${vehicle.year} ${vehicle.make_name} ${vehicle.model_name}` : "Vehicle"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Car className="w-8 h-8 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {vehicle
                                ? `${vehicle.year} ${vehicle.make_name} ${vehicle.model_name}${vehicle.series ? ` ${vehicle.series}` : ""}`
                                : "Unknown Vehicle"}
                            </h3>
                            {vehicleConfig && (
                              <p className="text-sm text-gray-600 mt-1">
                                {vehicleConfig.fuel_type && (
                                  <span className="capitalize">{vehicleConfig.fuel_type}</span>
                                )}
                                {vehicleConfig.body_style && (
                                  <span className="ml-2 capitalize">{vehicleConfig.body_style.replace(/_/g, " ")}</span>
                                )}
                                {vehicleConfig.gvwr && (
                                  <span className="ml-2">GVWR: {vehicleConfig.gvwr.toLocaleString()} lbs</span>
                                )}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              {listing.stock_number && (
                                <span>Stock #: {listing.stock_number}</span>
                              )}
                              {listing.config?.vin && (
                                <span>VIN: {listing.config.vin}</span>
                              )}
                              {listing.condition && (
                                <span className="capitalize">{listing.condition.replace(/_/g, " ")}</span>
                              )}
                              {listing.mileage && (
                                <span>{listing.mileage.toLocaleString()} miles</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-lg font-bold text-primary">
                                ${listing.asking_price?.toLocaleString() || "N/A"}
                              </span>
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
                              {listing.view_count > 0 && (
                                <span className="text-sm text-gray-500">
                                  {listing.view_count} view{listing.view_count !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/dealer/listings/${listing.id}`)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/dealer/listings/${listing.id}/edit`)}
                          title="Edit Listing"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(listing.id)}
                          disabled={deleteListing.isPending}
                          title="Delete Listing"
                          className="text-destructive hover:text-destructive"
                        >
                          {deleteListing.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {search || status !== "all"
                    ? "No listings match your filters"
                    : "You don't have any vehicle listings yet"}
                </p>
                {!search && status === "all" && (
                  <Button onClick={() => setLocation("/dealer/listings/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Listing
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DealerDashboardLayout>
  );
}
