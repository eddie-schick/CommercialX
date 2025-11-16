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

export default function DealerBodiesList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [stockStatus, setStockStatus] = useState<string>("all");

  const { data: bodies, isLoading, refetch } = trpc.dealer.bodies.list.useQuery({
    search: search || undefined,
    stockStatus: stockStatus !== "all" ? stockStatus : undefined,
    limit: 100,
  });

  const deleteBody = trpc.dealer.bodies.delete.useMutation({
    onSuccess: () => {
      toast.success("Body/Equipment deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete body/equipment");
    },
  });

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      await deleteBody.mutateAsync({ id });
    }
  };

  // Filter by status on frontend since backend doesn't have status filter
  const filteredBodies = bodies?.filter((body) => {
    if (status !== "all" && body.status !== status) return false;
    return true;
  });

  return (
    <DealerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bodies & Equipment</h1>
            <p className="text-gray-600 mt-2">Manage your upfitting equipment catalog</p>
          </div>
          <Button asChild>
            <Link href="/dealer/bodies/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Body/Equipment
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
                    placeholder="Search by name, category, or manufacturer..."
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

        {/* Bodies List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredBodies?.length || 0} Item{filteredBodies?.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : filteredBodies && filteredBodies.length > 0 ? (
              <div className="space-y-4">
                {filteredBodies.map((body: any) => (
                  <div
                    key={body.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {body.featuredImage ? (
                        <img
                          src={body.featuredImage}
                          alt={body.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">No Image</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg">{body.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{body.category?.replace(/_/g, " ")}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>Manufacturer: {body.manufacturer || "N/A"}</span>
                        <span className="capitalize">{body.stockStatus?.replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          body.status === "live"
                            ? "bg-green-100 text-green-700"
                            : body.status === "draft"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {body.status}
                        </span>
                        <span className="flex items-center gap-1 text-gray-600">
                          <Eye className="h-4 w-4" />
                          {body.viewCount || 0}
                        </span>
                        <span className="flex items-center gap-1 text-gray-600">
                          <MessageSquare className="h-4 w-4" />
                          {body.inquiryCount || 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ${body.salePrice?.toLocaleString() || "N/A"}
                        </p>
                        {body.msrp && body.msrp !== body.salePrice && (
                          <p className="text-sm text-gray-500 line-through">
                            ${body.msrp.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dealer/bodies/${body.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(body.id, body.name)}
                          disabled={deleteBody.isPending}
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
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No bodies or equipment yet
                </h3>
                <p className="text-gray-600 mb-4">
                  {search || status !== "all" || stockStatus !== "all"
                    ? "Try adjusting your filters"
                    : "Start by adding your first body or equipment item"}
                </p>
                <Button asChild>
                  <Link href="/dealer/bodies/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Body/Equipment
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
