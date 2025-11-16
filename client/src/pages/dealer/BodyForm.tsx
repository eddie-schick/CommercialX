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
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

export default function BodyForm() {
  const [, params] = useRoute("/dealer/bodies/:id");
  const [, setLocation] = useLocation();
  const bodyId = params?.id && params.id !== "new" ? parseInt(params.id) : null;

  const { data: body, isLoading } = trpc.dealer.bodies.getById.useQuery(
    { id: bodyId! },
    { enabled: !!bodyId }
  );

  const createBody = trpc.dealer.bodies.create.useMutation({
    onSuccess: () => {
      toast.success("Body/Equipment created successfully");
      setLocation("/dealer/bodies");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create body/equipment");
    },
  });

  const updateBody = trpc.dealer.bodies.update.useMutation({
    onSuccess: () => {
      toast.success("Body/Equipment updated successfully");
      setLocation("/dealer/bodies");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update body/equipment");
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    category: "box_body" as "box_body" | "flatbed" | "dump_body" | "refrigerated" | "service_body" | "stake_body" | "van_body" | "crane" | "liftgate" | "toolbox" | "ladder_rack" | "shelving" | "partition" | "other",
    manufacturer: "",
    model: "",
    description: "",
    msrp: 0,
    salePrice: 0,
    installationCost: 0,
    dimensions: "",
    weight: 0,
    capacity: 0,
    material: "",
    color: "",
    compatibleChassisTypes: "",
    compatibleMakes: "",
    wheelbaseMin: 0,
    wheelbaseMax: 0,
    gvwrMin: 0,
    gvwrMax: 0,
    leadTimeDays: 0,
    stockStatus: "in_stock" as "in_stock" | "backorder" | "made_to_order" | "discontinued",
    installationTime: "",
    installationRequirements: "",
    warrantyYears: 0,
    warrantyDetails: "",
    configurationOptions: "",
    featuredImage: "",
    status: "draft" as "draft" | "live" | "archived",
    isPublished: false,
  });

  useEffect(() => {
    if (body) {
      setFormData({
        name: body.name,
        category: body.category,
        manufacturer: body.manufacturer || "",
        model: body.model || "",
        description: body.description || "",
        msrp: body.msrp || 0,
        salePrice: body.salePrice || 0,
        installationCost: body.installationCost || 0,
        dimensions: body.dimensions || "",
        weight: body.weight || 0,
        capacity: body.capacity || 0,
        material: body.material || "",
        color: body.color || "",
        compatibleChassisTypes: body.compatibleChassisTypes || "",
        compatibleMakes: body.compatibleMakes || "",
        wheelbaseMin: body.wheelbaseMin || 0,
        wheelbaseMax: body.wheelbaseMax || 0,
        gvwrMin: body.gvwrMin || 0,
        gvwrMax: body.gvwrMax || 0,
        leadTimeDays: body.leadTimeDays || 0,
        stockStatus: body.stockStatus,
        installationTime: body.installationTime || "",
        installationRequirements: body.installationRequirements || "",
        warrantyYears: body.warrantyYears || 0,
        warrantyDetails: body.warrantyDetails || "",
        configurationOptions: body.configurationOptions || "",
        featuredImage: body.featuredImage || "",
        status: body.status,
        isPublished: body.isPublished,
      });
    }
  }, [body]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    const data = {
      ...formData,
      msrp: formData.msrp || undefined,
      salePrice: formData.salePrice || undefined,
      installationCost: formData.installationCost || undefined,
      weight: formData.weight || undefined,
      capacity: formData.capacity || undefined,
      wheelbaseMin: formData.wheelbaseMin || undefined,
      wheelbaseMax: formData.wheelbaseMax || undefined,
      gvwrMin: formData.gvwrMin || undefined,
      gvwrMax: formData.gvwrMax || undefined,
      leadTimeDays: formData.leadTimeDays || undefined,
      warrantyYears: formData.warrantyYears || undefined,
      manufacturer: formData.manufacturer || undefined,
      model: formData.model || undefined,
      description: formData.description || undefined,
      dimensions: formData.dimensions || undefined,
      material: formData.material || undefined,
      color: formData.color || undefined,
      compatibleChassisTypes: formData.compatibleChassisTypes || undefined,
      compatibleMakes: formData.compatibleMakes || undefined,
      installationTime: formData.installationTime || undefined,
      installationRequirements: formData.installationRequirements || undefined,
      warrantyDetails: formData.warrantyDetails || undefined,
      configurationOptions: formData.configurationOptions || undefined,
      featuredImage: formData.featuredImage || undefined,
    };

    if (bodyId) {
      await updateBody.mutateAsync({ id: bodyId, ...data });
    } else {
      await createBody.mutateAsync(data);
    }
  };

  if (isLoading) {
    return (
      <DealerDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DealerDashboardLayout>
    );
  }

  return (
    <DealerDashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setLocation("/dealer/bodies")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {bodyId ? "Edit Body/Equipment" : "Add Body/Equipment"}
            </h1>
            <p className="text-gray-600 mt-2">
              {bodyId ? "Update" : "Add"} body or equipment item details
            </p>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 12ft Aluminum Box Body"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="box_body">Box Body</SelectItem>
                    <SelectItem value="flatbed">Flatbed</SelectItem>
                    <SelectItem value="dump_body">Dump Body</SelectItem>
                    <SelectItem value="refrigerated">Refrigerated</SelectItem>
                    <SelectItem value="service_body">Service Body</SelectItem>
                    <SelectItem value="stake_body">Stake Body</SelectItem>
                    <SelectItem value="van_body">Van Body</SelectItem>
                    <SelectItem value="crane">Crane</SelectItem>
                    <SelectItem value="liftgate">Liftgate</SelectItem>
                    <SelectItem value="toolbox">Toolbox</SelectItem>
                    <SelectItem value="ladder_rack">Ladder Rack</SelectItem>
                    <SelectItem value="shelving">Shelving</SelectItem>
                    <SelectItem value="partition">Partition</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="e.g., Morgan, Supreme, Reading"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Model number or name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the body/equipment..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="msrp">MSRP ($)</Label>
                <Input
                  id="msrp"
                  type="number"
                  value={formData.msrp || ""}
                  onChange={(e) => setFormData({ ...formData, msrp: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salePrice">Sale Price ($)</Label>
                <Input
                  id="salePrice"
                  type="number"
                  value={formData.salePrice || ""}
                  onChange={(e) => setFormData({ ...formData, salePrice: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="installationCost">Installation Cost ($)</Label>
                <Input
                  id="installationCost"
                  type="number"
                  value={formData.installationCost || ""}
                  onChange={(e) => setFormData({ ...formData, installationCost: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Specifications */}
        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions (L x W x H)</Label>
                <Input
                  id="dimensions"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  placeholder='e.g., 144" x 96" x 84"'
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight || ""}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Payload Capacity (lbs)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity || ""}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="material">Material</Label>
                <Input
                  id="material"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  placeholder="e.g., Aluminum, Steel, Composite"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="e.g., White, Custom"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compatibility */}
        <Card>
          <CardHeader>
            <CardTitle>Compatibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="compatibleChassisTypes">Compatible Chassis Types</Label>
                <Input
                  id="compatibleChassisTypes"
                  value={formData.compatibleChassisTypes}
                  onChange={(e) => setFormData({ ...formData, compatibleChassisTypes: e.target.value })}
                  placeholder="e.g., Cutaway, Cab & Chassis"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compatibleMakes">Compatible Makes</Label>
                <Input
                  id="compatibleMakes"
                  value={formData.compatibleMakes}
                  onChange={(e) => setFormData({ ...formData, compatibleMakes: e.target.value })}
                  placeholder="e.g., Ford, Chevrolet, Ram"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wheelbaseMin">Min Wheelbase (inches)</Label>
                <Input
                  id="wheelbaseMin"
                  type="number"
                  value={formData.wheelbaseMin || ""}
                  onChange={(e) => setFormData({ ...formData, wheelbaseMin: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wheelbaseMax">Max Wheelbase (inches)</Label>
                <Input
                  id="wheelbaseMax"
                  type="number"
                  value={formData.wheelbaseMax || ""}
                  onChange={(e) => setFormData({ ...formData, wheelbaseMax: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gvwrMin">Min GVWR (lbs)</Label>
                <Input
                  id="gvwrMin"
                  type="number"
                  value={formData.gvwrMin || ""}
                  onChange={(e) => setFormData({ ...formData, gvwrMin: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gvwrMax">Max GVWR (lbs)</Label>
                <Input
                  id="gvwrMax"
                  type="number"
                  value={formData.gvwrMax || ""}
                  onChange={(e) => setFormData({ ...formData, gvwrMax: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability & Installation */}
        <Card>
          <CardHeader>
            <CardTitle>Availability & Installation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stockStatus">Stock Status</Label>
                <Select
                  value={formData.stockStatus}
                  onValueChange={(value: any) => setFormData({ ...formData, stockStatus: value })}
                >
                  <SelectTrigger id="stockStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="backorder">Backorder</SelectItem>
                    <SelectItem value="made_to_order">Made to Order</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
                <Input
                  id="leadTimeDays"
                  type="number"
                  value={formData.leadTimeDays || ""}
                  onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="installationTime">Installation Time</Label>
                <Input
                  id="installationTime"
                  value={formData.installationTime}
                  onChange={(e) => setFormData({ ...formData, installationTime: e.target.value })}
                  placeholder="e.g., 2-3 days"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warrantyYears">Warranty (years)</Label>
                <Input
                  id="warrantyYears"
                  type="number"
                  value={formData.warrantyYears || ""}
                  onChange={(e) => setFormData({ ...formData, warrantyYears: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="installationRequirements">Installation Requirements</Label>
              <Textarea
                id="installationRequirements"
                value={formData.installationRequirements}
                onChange={(e) => setFormData({ ...formData, installationRequirements: e.target.value })}
                placeholder="Special tools, certifications, or requirements..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warrantyDetails">Warranty Details</Label>
              <Textarea
                id="warrantyDetails"
                value={formData.warrantyDetails}
                onChange={(e) => setFormData({ ...formData, warrantyDetails: e.target.value })}
                placeholder="Warranty coverage details..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Featured Image */}
        <Card>
          <CardHeader>
            <CardTitle>Featured Image</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload
              label="Featured Image"
              value={formData.featuredImage}
              onChange={(url) => setFormData({ ...formData, featuredImage: url })}
            />
          </CardContent>
        </Card>

        {/* Publishing Status */}
        <Card>
          <CardHeader>
            <CardTitle>Publishing Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="isPublished"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
                />
                <Label htmlFor="isPublished">Published to marketplace</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/dealer/bodies")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createBody.isPending || updateBody.isPending}
          >
            {createBody.isPending || updateBody.isPending
              ? "Saving..."
              : bodyId
              ? "Update Body/Equipment"
              : "Create Body/Equipment"}
          </Button>
        </div>
      </form>
    </DealerDashboardLayout>
  );
}
