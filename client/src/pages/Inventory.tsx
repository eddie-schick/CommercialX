import { useState } from "react";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Truck, CheckCircle, Loader2, Search } from "lucide-react";

export default function Inventory() {
  const [fuelType, setFuelType] = useState<string | undefined>(undefined);
  const [make, setMake] = useState<string | undefined>(undefined);
  const [bodyType, setBodyType] = useState<string | undefined>(undefined);
  const [minYear, setMinYear] = useState<string>("");
  const [maxYear, setMaxYear] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data: vehicles, isLoading } = trpc.vehicles.list.useQuery({
    fuelType: fuelType && fuelType !== "__all__" ? [fuelType] : undefined,
    make: make && make !== "__all__" ? [make] : undefined,
    bodyType: bodyType && bodyType !== "__all__" ? [bodyType] : undefined,
    minYear: minYear ? parseInt(minYear) : undefined,
    maxYear: maxYear ? parseInt(maxYear) : undefined,
    minPrice: minPrice ? parseInt(minPrice) : undefined,
    maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    limit: 50,
  });

  // Get unique values for filters from actual data
  const fuelTypes = vehicles ? Array.from(new Set(vehicles.map(v => v.fuelType).filter(Boolean))) : [];
  const makes = vehicles ? Array.from(new Set(vehicles.map(v => v.make).filter(Boolean))) : [];
  const bodyTypes = vehicles ? Array.from(new Set(vehicles.map(v => v.bodyType).filter(Boolean))) : [];

  const formatPrice = (price: number | null) => {
    if (!price) return "Contact for pricing";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const filteredVehicles = vehicles?.filter(vehicle => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        vehicle.make?.toLowerCase().includes(search) ||
        vehicle.model?.toLowerCase().includes(search) ||
        vehicle.fuelType?.toLowerCase().includes(search) ||
        vehicle.bodyType?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      {/* Header */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16">
        <div className="container">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Browse Commercial Vehicles
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl">
            Find the perfect commercial vehicle for your fleet from verified dealers
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-4">
                <h2 className="text-lg font-semibold mb-4">Filters</h2>

                {/* Search */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search vehicles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Fuel Type Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Fuel Type</label>
                  <Select value={fuelType} onValueChange={setFuelType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Fuel Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Fuel Types</SelectItem>
                      {fuelTypes.map((ft) => (
                        <SelectItem key={ft} value={ft}>
                          {ft}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Make Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Make</label>
                  <Select value={make} onValueChange={setMake}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Makes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Makes</SelectItem>
                      {makes.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Body Type Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Body Type</label>
                  <Select value={bodyType} onValueChange={setBodyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Body Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Body Types</SelectItem>
                      {bodyTypes.map((bt) => (
                        <SelectItem key={bt} value={bt}>
                          {bt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Range */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Year Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minYear}
                      onChange={(e) => setMinYear(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxYear}
                      onChange={(e) => setMaxYear(e.target.value)}
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Price Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFuelType(undefined);
                    setMake(undefined);
                    setBodyType(undefined);
                    setMinYear("");
                    setMaxYear("");
                    setMinPrice("");
                    setMaxPrice("");
                    setSearchTerm("");
                  }}
                >
                  Clear All Filters
                </Button>
              </Card>
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    {isLoading ? "Loading..." : `${filteredVehicles?.length || 0} Results`}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Browse available commercial vehicles
                  </p>
                </div>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {/* Empty State */}
              {!isLoading && (!filteredVehicles || filteredVehicles.length === 0) && (
                <Card className="p-12 text-center">
                  <Truck className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">No Vehicles Found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || fuelType || make
                      ? "Try adjusting your filters to see more results"
                      : "There are currently no vehicle listings available"}
                  </p>
                  <Button onClick={() => {
                    setFuelType(undefined);
                    setMake(undefined);
                    setBodyType(undefined);
                    setMinYear("");
                    setMaxYear("");
                    setMinPrice("");
                    setMaxPrice("");
                    setSearchTerm("");
                  }}>
                    Clear Filters
                  </Button>
                </Card>
              )}

              {/* Results Grid */}
              {!isLoading && filteredVehicles && filteredVehicles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredVehicles.map((vehicle) => (
                    <Link key={vehicle.id} href={`/vehicle/${vehicle.id}`}>
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                          {vehicle.featuredImage ? (
                            <img
                              src={vehicle.featuredImage}
                              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Truck className="h-16 w-16 text-gray-300" />
                            </div>
                          )}
                          {vehicle.isFeatured && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                              Featured
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="mb-2">
                            {vehicle.make && (
                              <p className="text-sm text-gray-600">{vehicle.make}</p>
                            )}
                            <h3 className="font-semibold text-lg line-clamp-2">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </h3>
                          </div>
                          {vehicle.fuelType && vehicle.bodyType && (
                            <p className="text-sm text-gray-600 mb-2">
                              {vehicle.fuelType} • {vehicle.bodyType}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-4">
                            <div>
                              <p className="text-2xl font-bold text-primary">
                                {formatPrice(vehicle.salePrice)}
                              </p>
                            </div>
                            {vehicle.stockNumber && (
                              <div className="flex items-center text-sm text-gray-600">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Stock #{vehicle.stockNumber}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
