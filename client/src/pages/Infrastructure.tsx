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
import { Zap, DollarSign, Gauge, CheckCircle, Loader2, Search } from "lucide-react";

export default function Infrastructure() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [manufacturer, setManufacturer] = useState<string | undefined>(undefined);
  const [minPower, setMinPower] = useState<string>("");
  const [maxPower, setMaxPower] = useState<string>("");
  const [connectorType, setConnectorType] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data: items, isLoading } = trpc.infrastructure.list.useQuery({
    category,
    manufacturer,
    minPower: minPower ? parseInt(minPower) : undefined,
    maxPower: maxPower ? parseInt(maxPower) : undefined,
    connectorType,
    limit: 50,
  });

  // Get unique values for filters from actual data
  const categories = items ? Array.from(new Set(items.map(item => item.category))) : [];
  const manufacturers = items ? Array.from(new Set(items.map(item => item.manufacturer).filter((m): m is string => Boolean(m)))) : [];
  const connectorTypes = items ? Array.from(new Set(
    items.flatMap(item => {
      try {
        return item.connectorTypes ? JSON.parse(item.connectorTypes as string) : [];
      } catch {
        return [];
      }
    })
  )) : [];

  const formatPrice = (price: number | null) => {
    if (!price) return "Contact for pricing";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      level_1: "Level 1 (120V)",
      level_2: "Level 2 (240V)",
      dc_fast: "DC Fast Charging",
      depot_charger: "Depot Charger",
      portable: "Portable Charger",
      accessories: "Accessories",
    };
    return labels[cat] || cat;
  };

  const filteredItems = items?.filter(item => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        item.name?.toLowerCase().includes(search) ||
        item.manufacturer?.toLowerCase().includes(search) ||
        item.model?.toLowerCase().includes(search)
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
            Charging Infrastructure
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl">
            Browse EV charging solutions for commercial fleets from verified providers
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
                      placeholder="Search chargers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Charging Level</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Levels</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {getCategoryLabel(cat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Manufacturer Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Manufacturer</label>
                  <Select value={manufacturer} onValueChange={setManufacturer}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Manufacturers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Manufacturers</SelectItem>
                      {manufacturers.map((mfr) => (
                        <SelectItem key={mfr} value={mfr}>
                          {mfr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Power Range */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Power Range (kW)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPower}
                      onChange={(e) => setMinPower(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPower}
                      onChange={(e) => setMaxPower(e.target.value)}
                    />
                  </div>
                </div>

                {/* Connector Type */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Connector Type</label>
                  <Select value={connectorType} onValueChange={setConnectorType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Types</SelectItem>
                      {connectorTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setCategory(undefined);
                    setManufacturer(undefined);
                    setMinPower("");
                    setMaxPower("");
                    setConnectorType(undefined);
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
                    {isLoading ? "Loading..." : `${filteredItems?.length || 0} Results`}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Browse available charging infrastructure
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
              {!isLoading && (!filteredItems || filteredItems.length === 0) && (
                <Card className="p-12 text-center">
                  <Zap className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">No Chargers Found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || category || manufacturer
                      ? "Try adjusting your filters to see more results"
                      : "There are currently no charging infrastructure listings available"}
                  </p>
                  <Button onClick={() => {
                    setCategory(undefined);
                    setManufacturer(undefined);
                    setMinPower("");
                    setMaxPower("");
                    setConnectorType(undefined);
                    setSearchTerm("");
                  }}>
                    Clear Filters
                  </Button>
                </Card>
              )}

              {/* Results Grid */}
              {!isLoading && filteredItems && filteredItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredItems.map((item) => (
                    <Link key={item.id} href={`/infrastructure/${item.id}`}>
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                          {item.featuredImage ? (
                            <img
                              src={item.featuredImage}
                              alt={item.name || "Charger"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Zap className="h-16 w-16 text-gray-300" />
                            </div>
                          )}
                          {item.stockStatus === "in_stock" && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                              In Stock
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="mb-2">
                            {item.manufacturer && (
                              <p className="text-sm text-gray-600">{item.manufacturer}</p>
                            )}
                            <h3 className="font-semibold text-lg line-clamp-2">
                              {item.name || "Untitled Charger"}
                            </h3>
                          </div>
                          {item.category && (
                            <p className="text-sm text-gray-600 mb-2">
                              {getCategoryLabel(item.category)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            {item.outputPower && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Gauge className="h-4 w-4 mr-1" />
                                {item.outputPower} kW
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <div>
                              <p className="text-2xl font-bold text-primary">
                                {formatPrice(item.msrp)}
                              </p>
                            </div>
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
