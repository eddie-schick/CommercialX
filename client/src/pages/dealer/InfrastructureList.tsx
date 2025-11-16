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
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Plus, Search, Edit, Trash2, Eye, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function DealerInfrastructureList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [stockStatus, setStockStatus] = useState<string>("all");

  const { data: infrastructure, isLoading, refetch } = trpc.dealer.infrastructure.list.useQuery({
    search: search || undefined,
    stockStatus: stockStatus !== "all" ? stockStatus : undefined,
    limit: 100,
  });

  const deleteInfrastructure = trpc.dealer.infrastructure.delete.useMutation({
    onSuccess: () => {
      toast.success("Infrastructure deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete infrastructure");
    },
  });

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      await deleteInfrastructure.mutateAsync({ id });
    }
  };

  // Filter by status on frontend since backend doesn't have status filter
  const filteredInfrastructure = infrastructure?.filter((item) => {
    if (status !== "all" && item.status !== status) return false;
    return true;
  });

  return (
    <DealerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Charging Infrastructure</h1>
            <p className="text-gray-600 mt-2">Manage your charging equipment catalog</p>
          </div>
          <Button asChild>
            <Link href="/dealer/infrastructure/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Charger
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, manufacturer, or connector type..."
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
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stockStatus} onValueChange={setStockStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="backorder">Backorder</SelectItem>
                  <SelectItem value="made_to_order">Made to Order</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Infrastructure List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredInfrastructure?.length || 0} Item{filteredInfrastructure?.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : filteredInfrastructure && filteredInfrastructure.length > 0 ? (
              <div className="space-y-4">
                {filteredInfrastructure.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.featuredImage ? (
                        <img
                          src={item.featuredImage}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">No Image</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg">{item.name}</h3>
                      <p className="text-sm text-gray-600">{item.manufacturer || "N/A"}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        {item.outputPower && <span>{item.outputPower}kW</span>}
                        <span className="capitalize">{item.category?.replace(/_/g, " ")}</span>
                        <span className="capitalize">{item.stockStatus?.replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === "live"
                            ? "bg-green-100 text-green-700"
                            : item.status === "draft"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {item.status}
                        </span>
                        <span className="flex items-center gap-1 text-gray-600">
                          <Eye className="h-4 w-4" />
                          {item.viewCount || 0}
                        </span>
                        <span className="flex items-center gap-1 text-gray-600">
                          <MessageSquare className="h-4 w-4" />
                          {item.inquiryCount || 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ${item.salePrice?.toLocaleString() || "N/A"}
                        </p>
                        {item.msrp && item.msrp !== item.salePrice && (
                          <p className="text-sm text-gray-500 line-through">
                            ${item.msrp.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dealer/infrastructure/${item.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id, item.name)}
                          disabled={deleteInfrastructure.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No charging infrastructure yet
                </h3>
                <p className="text-gray-600 mb-4">
                  {search || status !== "all" || stockStatus !== "all"
                    ? "Try adjusting your filters"
                    : "Start by adding your first charger"}
                </p>
                <Button asChild>
                  <Link href="/dealer/infrastructure/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Charger
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DealerDashboardLayout>
  );
}
