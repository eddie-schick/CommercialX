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

export default function InfrastructureForm() {
  const [, params] = useRoute("/dealer/infrastructure/:id");
  const [, setLocation] = useLocation();
  const infrastructureId = params?.id && params.id !== "new" ? parseInt(params.id) : null;

  const { data: infrastructure, isLoading } = trpc.dealer.infrastructure.getById.useQuery(
    { id: infrastructureId! },
    { enabled: !!infrastructureId }
  );

  const createInfrastructure = trpc.dealer.infrastructure.create.useMutation({
    onSuccess: () => {
      toast.success("Infrastructure created successfully");
      setLocation("/dealer/infrastructure");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create infrastructure");
    },
  });

  const updateInfrastructure = trpc.dealer.infrastructure.update.useMutation({
    onSuccess: () => {
      toast.success("Infrastructure updated successfully");
      setLocation("/dealer/infrastructure");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update infrastructure");
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    category: "level_2" as "level_1" | "level_2" | "dc_fast" | "depot_charger" | "portable" | "accessories",
    manufacturer: "",
    model: "",
    description: "",
    msrp: 0,
    salePrice: 0,
    installationCost: 0,
    inputVoltage: "",
    outputPower: 0,
    outputCurrent: 0,
    efficiency: 0,
    connectorTypes: "",
    numberOfPorts: 1,
    simultaneousCharging: false,
    cableLength: 0,
    cableType: "",
    installationType: "wall_mount" as "wall_mount" | "pedestal" | "overhead" | "portable",
    installationRequirements: "",
    electricalRequirements: "",
    dimensions: "",
    networkConnected: false,
    paymentCapable: false,
    loadManagement: false,
    weatherRating: "",
    certifications: "",
    warrantyYears: 0,
    warrantyDetails: "",
    leadTimeDays: 0,
    stockStatus: "in_stock" as "in_stock" | "backorder" | "made_to_order" | "discontinued",
    locationAddress: "",
    locationCity: "",
    locationState: "",
    locationZipCode: "",
    latitude: "",
    longitude: "",
    isPublicAccess: false,
    featuredImage: "",
    status: "draft" as "draft" | "live" | "archived",
    isPublished: false,
  });

  useEffect(() => {
    if (infrastructure) {
      setFormData({
        name: infrastructure.name,
        category: infrastructure.category,
        manufacturer: infrastructure.manufacturer || "",
        model: infrastructure.model || "",
        description: infrastructure.description || "",
        msrp: infrastructure.msrp || 0,
        salePrice: infrastructure.salePrice || 0,
        installationCost: infrastructure.installationCost || 0,
        inputVoltage: infrastructure.inputVoltage || "",
        outputPower: infrastructure.outputPower || 0,
        outputCurrent: infrastructure.outputCurrent || 0,
        efficiency: infrastructure.efficiency || 0,
        connectorTypes: infrastructure.connectorTypes || "",
        numberOfPorts: infrastructure.numberOfPorts,
        simultaneousCharging: infrastructure.simultaneousCharging,
        cableLength: infrastructure.cableLength || 0,
        cableType: infrastructure.cableType || "",
        installationType: infrastructure.installationType || "wall_mount",
        installationRequirements: infrastructure.installationRequirements || "",
        electricalRequirements: infrastructure.electricalRequirements || "",
        dimensions: infrastructure.dimensions || "",
        networkConnected: infrastructure.networkConnected,
        paymentCapable: infrastructure.paymentCapable,
        loadManagement: infrastructure.loadManagement,
        weatherRating: infrastructure.weatherRating || "",
        certifications: infrastructure.certifications || "",
        warrantyYears: infrastructure.warrantyYears || 0,
        warrantyDetails: infrastructure.warrantyDetails || "",
        leadTimeDays: infrastructure.leadTimeDays || 0,
        stockStatus: infrastructure.stockStatus,
        locationAddress: infrastructure.locationAddress || "",
        locationCity: infrastructure.locationCity || "",
        locationState: infrastructure.locationState || "",
        locationZipCode: infrastructure.locationZipCode || "",
        latitude: infrastructure.latitude || "",
        longitude: infrastructure.longitude || "",
        isPublicAccess: infrastructure.isPublicAccess,
        featuredImage: infrastructure.featuredImage || "",
        status: infrastructure.status,
        isPublished: infrastructure.isPublished,
      });
    }
  }, [infrastructure]);

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
      outputPower: formData.outputPower || undefined,
      outputCurrent: formData.outputCurrent || undefined,
      efficiency: formData.efficiency || undefined,
      cableLength: formData.cableLength || undefined,
      warrantyYears: formData.warrantyYears || undefined,
      leadTimeDays: formData.leadTimeDays || undefined,
      manufacturer: formData.manufacturer || undefined,
      model: formData.model || undefined,
      description: formData.description || undefined,
      inputVoltage: formData.inputVoltage || undefined,
      connectorTypes: formData.connectorTypes || undefined,
      cableType: formData.cableType || undefined,
      installationType: formData.installationType || undefined,
      installationRequirements: formData.installationRequirements || undefined,
      electricalRequirements: formData.electricalRequirements || undefined,
      dimensions: formData.dimensions || undefined,
      weatherRating: formData.weatherRating || undefined,
      certifications: formData.certifications || undefined,
      warrantyDetails: formData.warrantyDetails || undefined,
      locationAddress: formData.locationAddress || undefined,
      locationCity: formData.locationCity || undefined,
      locationState: formData.locationState || undefined,
      locationZipCode: formData.locationZipCode || undefined,
      latitude: formData.latitude || undefined,
      longitude: formData.longitude || undefined,
      featuredImage: formData.featuredImage || undefined,
    };

    if (infrastructureId) {
      await updateInfrastructure.mutateAsync({ id: infrastructureId, ...data });
    } else {
      await createInfrastructure.mutateAsync(data);
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
            onClick={() => setLocation("/dealer/infrastructure")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {infrastructureId ? "Edit Charger" : "Add Charger"}
            </h1>
            <p className="text-gray-600 mt-2">
              {infrastructureId ? "Update" : "Add"} charging infrastructure details
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
                  placeholder="e.g., ChargePoint CPF50"
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
                    <SelectItem value="level_1">Level 1 (120V)</SelectItem>
                    <SelectItem value="level_2">Level 2 (240V)</SelectItem>
                    <SelectItem value="dc_fast">DC Fast Charger</SelectItem>
                    <SelectItem value="depot_charger">Depot Charger</SelectItem>
                    <SelectItem value="portable">Portable</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="e.g., ChargePoint, ABB, Tesla"
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
                placeholder="Detailed description of the charger..."
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

        {/* Technical Specifications */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inputVoltage">Input Voltage</Label>
                <Input
                  id="inputVoltage"
                  value={formData.inputVoltage}
                  onChange={(e) => setFormData({ ...formData, inputVoltage: e.target.value })}
                  placeholder="e.g., 208-240V AC"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outputPower">Output Power (kW)</Label>
                <Input
                  id="outputPower"
                  type="number"
                  value={formData.outputPower || ""}
                  onChange={(e) => setFormData({ ...formData, outputPower: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outputCurrent">Output Current (Amps)</Label>
                <Input
                  id="outputCurrent"
                  type="number"
                  value={formData.outputCurrent || ""}
                  onChange={(e) => setFormData({ ...formData, outputCurrent: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="efficiency">Efficiency (%)</Label>
                <Input
                  id="efficiency"
                  type="number"
                  value={formData.efficiency || ""}
                  onChange={(e) => setFormData({ ...formData, efficiency: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="connectorTypes">Connector Types</Label>
                <Input
                  id="connectorTypes"
                  value={formData.connectorTypes}
                  onChange={(e) => setFormData({ ...formData, connectorTypes: e.target.value })}
                  placeholder="e.g., NACS, SAE J1772, CCS"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberOfPorts">Number of Ports</Label>
                <Input
                  id="numberOfPorts"
                  type="number"
                  value={formData.numberOfPorts}
                  onChange={(e) => setFormData({ ...formData, numberOfPorts: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                />
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="simultaneousCharging"
                  checked={formData.simultaneousCharging}
                  onCheckedChange={(checked) => setFormData({ ...formData, simultaneousCharging: checked })}
                />
                <Label htmlFor="simultaneousCharging">Simultaneous Charging</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cable & Installation */}
        <Card>
          <CardHeader>
            <CardTitle>Cable & Installation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cableLength">Cable Length (feet)</Label>
                <Input
                  id="cableLength"
                  type="number"
                  value={formData.cableLength || ""}
                  onChange={(e) => setFormData({ ...formData, cableLength: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cableType">Cable Type</Label>
                <Input
                  id="cableType"
                  value={formData.cableType}
                  onChange={(e) => setFormData({ ...formData, cableType: e.target.value })}
                  placeholder="e.g., Tethered, Detachable"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="installationType">Installation Type</Label>
                <Select
                  value={formData.installationType}
                  onValueChange={(value: any) => setFormData({ ...formData, installationType: value })}
                >
                  <SelectTrigger id="installationType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wall_mount">Wall Mount</SelectItem>
                    <SelectItem value="pedestal">Pedestal</SelectItem>
                    <SelectItem value="overhead">Overhead</SelectItem>
                    <SelectItem value="portable">Portable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions (L x W x H)</Label>
                <Input
                  id="dimensions"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  placeholder='e.g., 24" x 12" x 36"'
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="installationRequirements">Installation Requirements</Label>
              <Textarea
                id="installationRequirements"
                value={formData.installationRequirements}
                onChange={(e) => setFormData({ ...formData, installationRequirements: e.target.value })}
                placeholder="Special installation requirements..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="electricalRequirements">Electrical Requirements</Label>
              <Textarea
                id="electricalRequirements"
                value={formData.electricalRequirements}
                onChange={(e) => setFormData({ ...formData, electricalRequirements: e.target.value })}
                placeholder="Electrical panel, breaker, and wiring requirements..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="networkConnected"
                  checked={formData.networkConnected}
                  onCheckedChange={(checked) => setFormData({ ...formData, networkConnected: checked })}
                />
                <Label htmlFor="networkConnected">Network Connected</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="paymentCapable"
                  checked={formData.paymentCapable}
                  onCheckedChange={(checked) => setFormData({ ...formData, paymentCapable: checked })}
                />
                <Label htmlFor="paymentCapable">Payment Capable</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="loadManagement"
                  checked={formData.loadManagement}
                  onCheckedChange={(checked) => setFormData({ ...formData, loadManagement: checked })}
                />
                <Label htmlFor="loadManagement">Load Management</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weatherRating">Weather Rating</Label>
                <Input
                  id="weatherRating"
                  value={formData.weatherRating}
                  onChange={(e) => setFormData({ ...formData, weatherRating: e.target.value })}
                  placeholder="e.g., NEMA 3R, IP65"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="certifications">Certifications</Label>
                <Input
                  id="certifications"
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                  placeholder="e.g., UL, CE, Energy Star"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warranty & Availability */}
        <Card>
          <CardHeader>
            <CardTitle>Warranty & Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Location (Optional) */}
        <Card>
          <CardHeader>
            <CardTitle>Location (Optional - for installed units)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="locationAddress">Address</Label>
                <Input
                  id="locationAddress"
                  value={formData.locationAddress}
                  onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                  placeholder="Street address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationCity">City</Label>
                <Input
                  id="locationCity"
                  value={formData.locationCity}
                  onChange={(e) => setFormData({ ...formData, locationCity: e.target.value })}
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationState">State</Label>
                <Input
                  id="locationState"
                  value={formData.locationState}
                  onChange={(e) => setFormData({ ...formData, locationState: e.target.value })}
                  placeholder="State"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationZipCode">ZIP Code</Label>
                <Input
                  id="locationZipCode"
                  value={formData.locationZipCode}
                  onChange={(e) => setFormData({ ...formData, locationZipCode: e.target.value })}
                  placeholder="ZIP Code"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublicAccess"
                  checked={formData.isPublicAccess}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublicAccess: checked })}
                />
                <Label htmlFor="isPublicAccess">Public Access</Label>
              </div>
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
            onClick={() => setLocation("/dealer/infrastructure")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createInfrastructure.isPending || updateInfrastructure.isPending}
          >
            {createInfrastructure.isPending || updateInfrastructure.isPending
              ? "Saving..."
              : infrastructureId
              ? "Update Charger"
              : "Create Charger"}
          </Button>
        </div>
      </form>
    </DealerDashboardLayout>
  );
}
