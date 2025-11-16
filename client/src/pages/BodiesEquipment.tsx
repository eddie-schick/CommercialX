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
import { Package, DollarSign, Clock, CheckCircle, Loader2, Search } from "lucide-react";

export default function BodiesEquipment() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [manufacturer, setManufacturer] = useState<string | undefined>(undefined);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [stockStatus, setStockStatus] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data: items, isLoading } = trpc.bodiesEquipment.list.useQuery({
    category,
    manufacturer,
    minPrice: minPrice ? parseInt(minPrice) : undefined,
    maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    stockStatus,
    limit: 50,
  });

  // Get unique values for filters from actual data
  const categories = items ? Array.from(new Set(items.map(item => item.category))) : [];
  const manufacturers = items ? Array.from(new Set(items.map(item => item.manufacturer).filter((m): m is string => Boolean(m)))) : [];

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
      box_body: "Box Body",
      flatbed: "Flatbed",
      dump_body: "Dump Body",
      refrigerated: "Refrigerated",
      service_body: "Service Body",
      stake_body: "Stake Body",
      crane_body: "Crane Body",
      liftgate: "Liftgate",
      toolbox: "Toolbox",
      rack: "Rack",
      other: "Other",
    };
    return labels[cat] || cat;
  };

  const filteredItems = items?.filter(item => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        item.name?.toLowerCase().includes(search) ||
        item.manufacturer?.toLowerCase().includes(search) ||
        item.category?.toLowerCase().includes(search)
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
            Bodies & Equipment
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl">
            Browse commercial vehicle bodies, upfit equipment, and accessories from verified suppliers
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
                      placeholder="Search equipment..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Categories</SelectItem>
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

                {/* Stock Status */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Availability</label>
                  <Select value={stockStatus} onValueChange={setStockStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All</SelectItem>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="made_to_order">Made to Order</SelectItem>
                      <SelectItem value="backorder">Backorder</SelectItem>
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
                    setMinPrice("");
                    setMaxPrice("");
                    setStockStatus(undefined);
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
                    Browse available bodies and equipment
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
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">No Equipment Found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || category || manufacturer
                      ? "Try adjusting your filters to see more results"
                      : "There are currently no bodies or equipment listings available"}
                  </p>
                  <Button onClick={() => {
                    setCategory(undefined);
                    setManufacturer(undefined);
                    setMinPrice("");
                    setMaxPrice("");
                    setStockStatus(undefined);
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
                    <Link key={item.id} href={`/body-equipment/${item.id}`}>
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                          {item.featuredImage ? (
                            <img
                              src={item.featuredImage}
                              alt={item.name || "Equipment"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-16 w-16 text-gray-300" />
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
                              {item.name || "Untitled Equipment"}
                            </h3>
                          </div>
                          {item.category && (
                            <p className="text-sm text-gray-600 mb-2">
                              {getCategoryLabel(item.category)}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-4">
                            <div>
                              <p className="text-2xl font-bold text-primary">
                                {formatPrice(item.msrp)}
                              </p>
                            </div>
                            {item.leadTimeDays && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 mr-1" />
                                {item.leadTimeDays} days
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
