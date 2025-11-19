import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useState, useEffect, useMemo, useRef, useImperativeHandle, forwardRef } from "react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { User, Mail, Phone, Building, MapPin, Bell, Store, CheckCircle2, Clock, MapPin as MapPinIcon, X, AlertCircle, PlusCircle, ExternalLink, Settings, Briefcase, Shield, Truck, FileText, Zap, Save, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import type { CompleteProfile, PersonalInfo, OrganizationInfo, DealerInfo, OrganizationType, DealerCode, DealerLocation, Make } from "@/types/profile";
import { ImageUpload } from "@/components/ImageUpload";
import { US_STATES } from "@/lib/us-states";

// Dealer Codes Manager Component
function DealerCodesManager({
  dealerId,
  organizationId,
  dealerCodes,
  makes,
  makesCarried,
  onUpdate,
  upsertMutation,
  deleteMutation,
}: {
  dealerId: number;
  organizationId: number;
  dealerCodes: DealerCode[];
  makes: Make[];
  makesCarried?: string[];
  onUpdate: () => void;
  upsertMutation: any;
  deleteMutation: any;
}) {
  const [editingCode, setEditingCode] = useState<DealerCode | null>(null);
  const [newCode, setNewCode] = useState<Partial<DealerCode>>({
    dealer_id: dealerId,
    organization_id: organizationId,
    make: "",
    dealer_code: "",
    is_primary: false,
    is_active: true,
    can_order_fleet: false,
    can_order_government: false,
    uses_b4a: true,
    default_price_level: "0",
    make_id: 0,
  });

  const handleSave = async (code: Partial<DealerCode>) => {
    try {
      const selectedMake = makes.find(m => m.make_name === code.make || m.id === (typeof code.make_id === 'string' ? parseInt(code.make_id) : code.make_id));
      if (!selectedMake) {
        toast.error("Please select a valid make");
        return;
      }

      // Ensure make_id is a number
      const makeId = typeof selectedMake.id === 'number' ? selectedMake.id : parseInt(String(selectedMake.id));

      // Prepare the data, converting empty strings to undefined and ensuring id is a number if present
      const submitData: any = {
        ...code,
        dealer_id: dealerId,
        organization_id: organizationId,
        make: selectedMake.make_name,
        make_id: makeId,
      };

      // Convert id to number if it exists
      if (submitData.id !== undefined && submitData.id !== null) {
        submitData.id = typeof submitData.id === 'string' ? parseInt(submitData.id, 10) : submitData.id;
      }

      // Convert empty strings to undefined for optional fields
      const optionalStringFields = [
        'certified_date',
        'certification_expires_at',
        'certification_level',
        'volume_tier',
        'region_code',
        'district_code',
        'zone_manager_name',
        'zone_manager_email',
        'default_price_level',
      ];
      
      optionalStringFields.forEach(field => {
        if (submitData[field] === '' || submitData[field] === null) {
          submitData[field] = undefined;
        }
      });

      await upsertMutation.mutateAsync(submitData);
      
      toast.success("Dealer code saved successfully");
      setEditingCode(null);
      setNewCode({
        dealer_id: dealerId,
        organization_id: organizationId,
        make: "",
        dealer_code: "",
        is_primary: false,
        is_active: true,
        can_order_fleet: false,
        can_order_government: false,
        uses_b4a: true,
        default_price_level: "0",
        make_id: 0,
      });
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to save dealer code");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this dealer code?")) return;
    
    try {
      await deleteMutation.mutateAsync({ id, organizationId });
      toast.success("Dealer code deleted successfully");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete dealer code");
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing Dealer Codes */}
      {dealerCodes.length > 0 && (
        <div className="space-y-2">
          {dealerCodes.map((code) => (
            <div key={code.id} className="border rounded-lg p-4">
              {editingCode?.id === code.id ? (
                <DealerCodeForm
                  code={editingCode}
                  makes={makes}
                  makesCarried={makesCarried}
                  onSave={(updated) => handleSave(updated)}
                  onCancel={() => setEditingCode(null)}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{code.make}</span>
                      <Badge variant={code.is_primary ? "default" : "secondary"}>
                        {code.is_primary ? "Primary" : "Secondary"}
                      </Badge>
                      {!code.is_active && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Code: {code.dealer_code}
                      {code.default_price_level && ` • Price Level: ${code.default_price_level}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingCode(code)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(code.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add New Dealer Code */}
      {!editingCode && (
        <div className="border rounded-lg p-4">
          <DealerCodeForm
            code={newCode}
            makes={makes}
            makesCarried={makesCarried}
            onSave={(code) => handleSave(code)}
            onCancel={() => setNewCode({
              dealer_id: dealerId,
              organization_id: organizationId,
              make: "",
              dealer_code: "",
              is_primary: false,
              is_active: true,
              can_order_fleet: false,
              can_order_government: false,
              uses_b4a: true,
              default_price_level: "0",
              make_id: 0,
            })}
          />
        </div>
      )}
    </div>
  );
}

// Dealer Locations Manager Component
const DealerLocationsManager = forwardRef<
  { submit: () => Promise<void> },
  {
    dealerId: number;
    organizationId: number;
    dealerLocations: DealerLocation[];
    onUpdate: () => void;
    upsertMutation: any;
    deleteMutation: any;
  }
>(({
  dealerId,
  organizationId,
  dealerLocations,
  onUpdate,
  upsertMutation,
  deleteMutation,
}, ref) => {
  const [editingLocation, setEditingLocation] = useState<DealerLocation | null>(null);
  const [newLocation, setNewLocation] = useState<Partial<DealerLocation>>({
    dealer_id: dealerId,
    organization_id: organizationId,
    location_name: "",
    location_type: "main",
    is_primary: false,
    is_active: true,
    country: "US",
  });
  const newLocationFormRef = useRef<{ submit: () => Promise<void> }>(null);
  const editingLocationFormRef = useRef<{ submit: () => Promise<void> }>(null);

  const handleSave = async (location: Partial<DealerLocation>) => {
    try {
      // Validate required fields before submitting
      if (!location.location_name || location.location_name.trim() === '') {
        toast.error("Location name is required");
        return;
      }
      
      const result = await upsertMutation.mutateAsync({
        ...location,
        dealer_id: dealerId,
        organization_id: organizationId,
      });
      
      if (result) {
        toast.success("Location saved successfully");
        setEditingLocation(null);
        setNewLocation({
          dealer_id: dealerId,
          organization_id: organizationId,
          location_name: "",
          location_type: "main",
          is_primary: false,
          is_active: true,
          country: "US",
        });
        // Only call onUpdate if save was successful
        try {
          await onUpdate();
        } catch (updateError) {
          console.error('Error refetching profile after save:', updateError);
          // Don't throw - the save was successful, just the refetch failed
        }
      }
    } catch (error: any) {
      console.error('Error in handleSave:', error);
      const errorMessage = error?.message || error?.data?.message || error?.data?.zodError?.message || "Failed to save location";
      toast.error(errorMessage);
      // Re-throw to prevent form from thinking it succeeded
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this location?")) return;
    
    try {
      await deleteMutation.mutateAsync({ id, organizationId });
      toast.success("Location deleted successfully");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete location");
    }
  };

  const submitLocationForm = async () => {
    // Try to submit the editing form first, then the new location form
    if (editingLocationFormRef.current) {
      await editingLocationFormRef.current.submit();
    } else if (newLocationFormRef.current) {
      await newLocationFormRef.current.submit();
    }
  };

  useImperativeHandle(ref, () => ({
    submit: submitLocationForm,
  }));

  return (
    <div className="space-y-4">
      {/* Existing Locations */}
      {dealerLocations.length > 0 && (
        <div className="space-y-2">
          {dealerLocations.map((location) => (
            <div key={location.id} className="border rounded-lg p-4">
              {editingLocation?.id === location.id ? (
                <DealerLocationForm
                  ref={editingLocationFormRef}
                  location={editingLocation}
                  onSave={(updated) => handleSave(updated)}
                  onCancel={() => setEditingLocation(null)}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{location.location_name}</span>
                      <Badge variant={location.is_primary ? "default" : "secondary"}>
                        {location.is_primary ? "Primary" : location.location_type || "Main"}
                      </Badge>
                      {!location.is_active && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {location.address_line1 && `${location.address_line1}, `}
                      {location.city && `${location.city}, `}
                      {location.state_province && `${location.state_province} `}
                      {location.postal_code}
                      {location.phone && ` • ${location.phone}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingLocation(location)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(location.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add New Location */}
      {!editingLocation && (
        <div className="border rounded-lg p-4">
          <DealerLocationForm
            ref={newLocationFormRef}
            location={newLocation}
            onSave={(location) => handleSave(location)}
            onCancel={() => setNewLocation({
              dealer_id: dealerId,
              organization_id: organizationId,
              location_name: "",
              location_type: "main",
              is_primary: false,
              is_active: true,
              country: "US",
            })}
          />
        </div>
      )}
    </div>
  );
});

DealerLocationsManager.displayName = "DealerLocationsManager";

// Dealer Location Form Component
const DealerLocationForm = forwardRef<
  { submit: () => Promise<void> },
  {
    location: Partial<DealerLocation>;
    onSave: (location: Partial<DealerLocation>) => void;
    onCancel: () => void;
  }
>(({ location, onSave, onCancel }, ref) => {
  const [formData, setFormData] = useState<Partial<DealerLocation>>(location);

  useEffect(() => {
    setFormData(location);
  }, [location]);

  // Business hours state (must be before submitForm to be accessible)
  const [businessHours, setBusinessHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(
    formData.business_hours || {
      monday: { open: "08:00", close: "18:00", closed: false },
      tuesday: { open: "08:00", close: "18:00", closed: false },
      wednesday: { open: "08:00", close: "18:00", closed: false },
      thursday: { open: "08:00", close: "18:00", closed: false },
      friday: { open: "08:00", close: "18:00", closed: false },
      saturday: { open: "09:00", close: "17:00", closed: false },
      sunday: { closed: true, open: "", close: "" },
    }
  );

  const submitForm = async () => {
    // Validate required fields
    if (!formData.location_name || formData.location_name.trim() === '') {
      toast.error("Location name is required");
      return;
    }
    
    try {
      // Ensure business_hours is included in the submission
      await onSave({
        ...formData,
        business_hours: businessHours,
      });
    } catch (error) {
      // Error is already handled in handleSave, but ensure we don't reload
      console.error('Error saving location:', error);
      throw error;
    }
  };

  useImperativeHandle(ref, () => ({
    submit: submitForm,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await submitForm();
  };

  useEffect(() => {
    if (formData.business_hours) {
      setBusinessHours(formData.business_hours);
    }
  }, [formData.business_hours]);

  const updateBusinessHours = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setBusinessHours(prev => {
      const updated = {
        ...prev,
        [day]: {
          ...prev[day],
          [field]: value,
        },
      };
      // Update formData with the new business hours
      setFormData(prevFormData => ({
        ...prevFormData,
        business_hours: updated,
      }));
      return updated;
    });
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location_name">
            Location Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="location_name"
            value={formData.location_name || ""}
            onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location_type">Location Type</Label>
          <Select
            value={formData.location_type || "main"}
            onValueChange={(value) => setFormData({ ...formData, location_type: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main">Main</SelectItem>
              <SelectItem value="satellite">Satellite</SelectItem>
              <SelectItem value="service_only">Service Only</SelectItem>
              <SelectItem value="parts_only">Parts Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Address</Label>
        <div className="space-y-2">
          <Input
            placeholder="Address Line 1"
            value={formData.address_line1 || ""}
            onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
          />
          <Input
            placeholder="Address Line 2"
            value={formData.address_line2 || ""}
            onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              placeholder="City"
              value={formData.city || ""}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              placeholder="State/Province"
              value={formData.state_province || ""}
              onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
            />
            <Input
              placeholder="Postal Code"
              value={formData.postal_code || ""}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
            />
          </div>
          <Input
            placeholder="Country"
            value={formData.country || "US"}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone || ""}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone_ext">Phone Extension</Label>
          <Input
            id="phone_ext"
            value={formData.phone_ext || ""}
            onChange={(e) => setFormData({ ...formData, phone_ext: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Manager Information</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Manager Name"
            value={formData.manager_name || ""}
            onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
          />
          <Input
            placeholder="Manager Email"
            type="email"
            value={formData.manager_email || ""}
            onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
          />
          <Input
            placeholder="Manager Phone"
            value={formData.manager_phone || ""}
            onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Business Hours</Label>
        <div className="space-y-2 border rounded-lg p-4">
          {days.map((day) => (
            <div key={day} className="flex items-center gap-2">
              <div className="w-24 text-sm capitalize">{day}</div>
              <Switch
                checked={!businessHours[day]?.closed}
                onCheckedChange={(checked) => updateBusinessHours(day, 'closed', !checked)}
              />
              {!businessHours[day]?.closed && (
                <>
                  <Input
                    type="time"
                    value={businessHours[day]?.open || ""}
                    onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm">to</span>
                  <Input
                    type="time"
                    value={businessHours[day]?.close || ""}
                    onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                    className="w-32"
                  />
                </>
              )}
              {businessHours[day]?.closed && (
                <span className="text-sm text-muted-foreground">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_primary"
            checked={formData.is_primary || false}
            onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
          />
          <Label htmlFor="is_primary">Primary Location</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active !== false}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ""}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex gap-2">
        <Button 
          type="button" 
          size="sm"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await submitForm();
          }}
        >
          {location.id ? "Update" : "Add"} Location
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
});

DealerLocationForm.displayName = "DealerLocationForm";

// Dealer Code Form Component
function DealerCodeForm({
  code,
  makes,
  makesCarried,
  onSave,
  onCancel,
}: {
  code: Partial<DealerCode>;
  makes: Make[];
  makesCarried?: string[];
  onSave: (code: Partial<DealerCode>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<DealerCode>>(code);

  // Update formData when code prop changes (for editing existing codes)
  useEffect(() => {
    setFormData(code);
  }, [code]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Normalize makesCarried - handle PostgreSQL text[] arrays and ensure it's a proper array
  const normalizedMakesCarried = useMemo((): string[] => {
    if (!makesCarried) return [];
    // If it's already an array, use it
    if (Array.isArray(makesCarried)) {
      return makesCarried.map((m: any) => String(m).trim()).filter((m: string) => m.length > 0);
    }
    // If it's a string, try to parse it
    const makesCarriedStr = typeof makesCarried === 'string' ? makesCarried : String(makesCarried);
    try {
      const parsed = JSON.parse(makesCarriedStr);
      if (Array.isArray(parsed)) {
        return parsed.map((m: any) => String(m).trim()).filter((m: string) => m.length > 0);
      }
    } catch {
      // If parsing fails, treat as single value
      const trimmed = makesCarriedStr.trim();
      return trimmed.length > 0 ? [trimmed] : [];
    }
    return [];
  }, [makesCarried]);

  // Filter makes to only show those in makes_carried array
  // If makesCarried is not provided or empty, show all makes
  // If makesCarried is provided, only show makes that match (case-insensitive)
  const availableMakes = normalizedMakesCarried.length > 0
    ? makes.filter(make => 
        normalizedMakesCarried.some(carried => 
          carried.toLowerCase().trim() === make.make_name.toLowerCase().trim()
        )
      )
    : makes;

  // If editing an existing code, always include the current make even if not in makes_carried
  const currentMake = formData.make ? makes.find(m => m.make_name === formData.make) : null;
  const filteredMakes = currentMake && !availableMakes.find(m => m.id === currentMake.id)
    ? [...availableMakes, currentMake]
    : availableMakes;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="make">
            Make / OEM <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.make || ""}
            onValueChange={(value) => {
              const selectedMake = makes.find(m => m.make_name === value);
              setFormData({
                ...formData,
                make: value,
                make_id: selectedMake?.id ? Number(selectedMake.id) : 0,
              });
            }}
            disabled={filteredMakes.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={filteredMakes.length === 0 ? "No makes available - add makes to 'Makes Carried' first" : "Select a make"} />
            </SelectTrigger>
            <SelectContent>
              {filteredMakes.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No makes available. Please add makes to "Makes Carried" first.
                </div>
              ) : (
                filteredMakes.map((make) => (
                  <SelectItem key={make.id} value={make.make_name}>
                    {make.make_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {normalizedMakesCarried.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Add makes to "Makes Carried" above to create dealer codes for them.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dealer_code">
            Dealer Code <span className="text-destructive">*</span>
          </Label>
          <Input
            id="dealer_code"
            value={formData.dealer_code || ""}
            onChange={(e) => setFormData({ ...formData, dealer_code: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="default_price_level">Default Price Level</Label>
          <Input
            id="default_price_level"
            value={formData.default_price_level || "0"}
            onChange={(e) => setFormData({ ...formData, default_price_level: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="certified_date">Certified Date</Label>
          <Input
            id="certified_date"
            type="date"
            value={formData.certified_date ? new Date(formData.certified_date).toISOString().split('T')[0] : ""}
            onChange={(e) => setFormData({ ...formData, certified_date: e.target.value || undefined })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="certification_expires_at">Certification Expires</Label>
          <Input
            id="certification_expires_at"
            type="date"
            value={formData.certification_expires_at ? new Date(formData.certification_expires_at).toISOString().split('T')[0] : ""}
            onChange={(e) => setFormData({ ...formData, certification_expires_at: e.target.value || undefined })}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_primary"
            checked={formData.is_primary || false}
            onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
          />
          <Label htmlFor="is_primary">Primary Code</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active !== false}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="can_order_fleet"
            checked={formData.can_order_fleet || false}
            onCheckedChange={(checked) => setFormData({ ...formData, can_order_fleet: checked })}
          />
          <Label htmlFor="can_order_fleet">Can Order Fleet</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="can_order_government"
            checked={formData.can_order_government || false}
            onCheckedChange={(checked) => setFormData({ ...formData, can_order_government: checked })}
          />
          <Label htmlFor="can_order_government">Can Order Government</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="uses_b4a"
            checked={formData.uses_b4a !== false}
            onCheckedChange={(checked) => setFormData({ ...formData, uses_b4a: checked })}
          />
          <Label htmlFor="uses_b4a">Uses B4A</Label>
        </div>
      </div>

      {/* Program Tier/Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="certification_level">Certification Level</Label>
          <Input
            id="certification_level"
            value={formData.certification_level || ""}
            onChange={(e) => setFormData({ ...formData, certification_level: e.target.value || undefined })}
            maxLength={50}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="annual_volume_commitment">Annual Volume Commitment</Label>
          <Input
            id="annual_volume_commitment"
            type="number"
            value={formData.annual_volume_commitment || ""}
            onChange={(e) => setFormData({ ...formData, annual_volume_commitment: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="volume_tier">Volume Tier</Label>
          <Input
            id="volume_tier"
            value={formData.volume_tier || ""}
            onChange={(e) => setFormData({ ...formData, volume_tier: e.target.value || undefined })}
            maxLength={50}
          />
        </div>
      </div>

      {/* Regional Assignments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="region_code">Region Code</Label>
          <Input
            id="region_code"
            value={formData.region_code || ""}
            onChange={(e) => setFormData({ ...formData, region_code: e.target.value || undefined })}
            maxLength={20}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="district_code">District Code</Label>
          <Input
            id="district_code"
            value={formData.district_code || ""}
            onChange={(e) => setFormData({ ...formData, district_code: e.target.value || undefined })}
            maxLength={20}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="zone_manager_name">Zone Manager Name</Label>
          <Input
            id="zone_manager_name"
            value={formData.zone_manager_name || ""}
            onChange={(e) => setFormData({ ...formData, zone_manager_name: e.target.value || undefined })}
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zone_manager_email">Zone Manager Email</Label>
          <Input
            id="zone_manager_email"
            type="email"
            value={formData.zone_manager_email || ""}
            onChange={(e) => setFormData({ ...formData, zone_manager_email: e.target.value || undefined })}
            maxLength={255}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          type="button" 
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit(e as any);
          }}
        >
          {code.id ? "Update" : "Add"} Dealer Code
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Helper function to calculate profile completion percentage
function calculateProfileCompletion(profileData: CompleteProfile | undefined): number {
  if (!profileData) return 0;
  
  let completed = 0;
  let total = 0;
  
  // Personal Information (30%)
  total += 3;
  if (profileData.personal?.name) completed += 1;
  if (profileData.personal?.email) completed += 1;
  if (profileData.personal?.phone) completed += 1;
  
  // Organization Information (40%)
  if (profileData.organization) {
    total += 4;
    if (profileData.organization.organization_name) completed += 1;
    if (profileData.organization.organization_type_id) completed += 1;
    if (profileData.organization.primary_email) completed += 1;
    if (profileData.organization.address_line1 && profileData.organization.city) completed += 1;
  } else {
    total += 4; // Count as incomplete
  }
  
  // Dealer Information (30% - only if dealer exists)
  if (profileData.dealer) {
    total += 3;
    if (profileData.dealer.business_type) completed += 1;
    if (profileData.dealer.dealer_license_number) completed += 1;
    if (profileData.dealerCodes && profileData.dealerCodes.length > 0) completed += 1;
  }
  
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

export default function Profile() {
  const { user, profile: userProfile, loading: userLoading } = useCurrentUser();
  const [, setLocation] = useLocation();
  const [isSaving, setIsSaving] = useState(false);

  // Load complete profile data
  const { 
    data: profileData, 
    error: profileError, 
    isLoading: profileLoading,
    refetch: refetchProfile 
  } = trpc.profile.get.useQuery(undefined, {
    enabled: !!user,
    retry: 2,
    refetchOnWindowFocus: false,
  }) as {
    data: CompleteProfile | undefined;
    error: any;
    isLoading: boolean;
    refetch: () => Promise<any>;
  };

  // Load organization types
  const { 
    data: orgTypesData, 
    error: orgTypesError, 
    isLoading: orgTypesLoading,
    refetch: refetchOrgTypes 
  } = trpc.profile.getOrganizationTypes.useQuery(undefined, {
    enabled: true,
    retry: 3,
    retryDelay: 1000,
  }) as {
    data: OrganizationType[] | undefined;
    error: any;
    isLoading: boolean;
    refetch: () => Promise<any>;
  };

  // Mutations
  const updatePersonalMutation = trpc.profile.updatePersonal.useMutation() as any;
  const updateOrganizationMutation = trpc.profile.updateOrganization.useMutation() as any;
  const createOrganizationMutation = trpc.profile.createOrganization.useMutation() as any;
  const updateDealerMutation = trpc.profile.updateDealer.useMutation() as any;
  const upsertDealerCodeMutation = trpc.profile.upsertDealerCode.useMutation() as any;
  const deleteDealerCodeMutation = trpc.profile.deleteDealerCode.useMutation() as any;
  const upsertDealerLocationMutation = trpc.profile.upsertDealerLocation.useMutation() as any;
  const deleteDealerLocationMutation = trpc.profile.deleteDealerLocation.useMutation() as any;

  // Load makes for dealer codes (will be enabled when dealer section is shown)
  const { data: makesData } = trpc.profile.getMakes.useQuery(undefined, {
    enabled: !!profileData?.dealer?.id,
  }) as { data: Make[] | undefined };

  // Check if user can create listings (for integration with listing workflow)
  const { data: canCreateListings, refetch: refetchListingCapability } = trpc.user.canCreateListings.useQuery(undefined, {
    enabled: !!user && !!profileData?.organization?.id,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Diagnostic query (only in development)
  const { data: diagnosticData } = trpc.profile.diagnose.useQuery(undefined, {
    enabled: !!user && process.env.NODE_ENV === 'development',
    retry: false,
  });

  // Form state
  const [personalFormData, setPersonalFormData] = useState<PersonalInfo | null>(null);
  const [orgFormData, setOrgFormData] = useState<Partial<OrganizationInfo>>({});
  const [dealerFormData, setDealerFormData] = useState<Partial<DealerInfo>>({});

  // Tag input states
  const [specializationInput, setSpecializationInput] = useState("");
  const [makesInput, setMakesInput] = useState("");
  const [territoryStateInput, setTerritoryStateInput] = useState("");
  const [certificationInput, setCertificationInput] = useState("");
  const [awardInput, setAwardInput] = useState("");
  
  // Tab state for section navigation (must be before early returns)
  const [activeTab, setActiveTab] = useState("personal");
  
  // Auto-save state (must be before early returns)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  
  // Ref for dealer locations manager to trigger form submission
  const dealerLocationsManagerRef = useRef<{ submit: () => Promise<void> }>(null);
  
  // Calculate profile completion (must be before early returns)
  const profileCompletion = useMemo(() => calculateProfileCompletion(profileData), [profileData]);

  // Helper function to normalize business_hours - ensures all days are objects, not strings
  const normalizeBusinessHours = (rawHours: any): Record<string, { open: string; close: string; closed: boolean }> => {
    const normalized: Record<string, { open: string; close: string; closed: boolean }> = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    
    // Handle case where rawHours might be a string (JSON string)
    let hours = rawHours;
    if (typeof rawHours === 'string') {
      try {
        hours = JSON.parse(rawHours);
      } catch {
        hours = {};
      }
    }
    
    // If hours is null or undefined, treat as empty object
    if (!hours || typeof hours !== 'object' || Array.isArray(hours)) {
      hours = {};
    }
    
    days.forEach((day) => {
      const dayData = hours[day];
      
      // Check if dayData is a valid object with required properties
      if (dayData && 
          typeof dayData === 'object' && 
          !Array.isArray(dayData) && 
          dayData !== null &&
          'open' in dayData && 
          'close' in dayData &&
          typeof dayData.open === 'string' &&
          typeof dayData.close === 'string') {
        // Valid object - normalize and validate time format
        const openTime = String(dayData.open || '09:00');
        const closeTime = String(dayData.close || '17:00');
        
        normalized[day] = {
          open: timeRegex.test(openTime) ? openTime : '09:00',
          close: timeRegex.test(closeTime) ? closeTime : '17:00',
          closed: Boolean(dayData.closed ?? false),
        };
      } else {
        // Invalid, missing, or string value - set default object
        normalized[day] = {
          open: '09:00',
          close: '17:00',
          closed: false,
        };
      }
    });
    
    return normalized;
  };

  // Initialize form data when profile loads - two-way data binding
  useEffect(() => {
    // Only update if we have profile data and we're not currently saving
    if (!profileData || isSaving) return;

    console.log('[Profile] Loading form data from profile:', {
      hasProfileData: !!profileData,
      hasOrganization: !!profileData.organization,
      organizationId: profileData.organization?.id,
      organizationName: profileData.organization?.organization_name,
      avatar: profileData.personal?.avatar,
    });

    // Load personal information
    if (profileData.personal) {
      setPersonalFormData(prev => {
        // Only update if the data has actually changed to avoid unnecessary re-renders
        const newAvatar = profileData.personal.avatar || "";
        if (prev && prev.avatar === newAvatar && 
            prev.name === (profileData.personal.name || "") &&
            prev.email === (profileData.personal.email || "")) {
          // Data hasn't changed, return existing state
          return prev;
        }
        
        return {
          id: profileData.personal.id,
          email: profileData.personal.email || "",
          name: profileData.personal.name || "",
          phone: profileData.personal.phone || "",
          bio: profileData.personal.bio || "",
          avatar: newAvatar,
          emailNotifications: profileData.personal.emailNotifications ?? true,
          marketingEmails: profileData.personal.marketingEmails ?? false,
          createdAt: profileData.personal.createdAt,
          lastSignInAt: profileData.personal.lastSignInAt,
        };
      });
    }
    
    // Load organization information (even if no personal data exists)
    // Check both organization.id and account.role to determine if user has an org
    if (profileData.organization?.id) {
      // Normalize business_hours to ensure all days are objects, not strings
      const normalizedBusinessHours = normalizeBusinessHours(profileData.organization.business_hours);

      setOrgFormData({
        organization_type_id: profileData.organization.organization_type_id || undefined,
        organization_name: profileData.organization.organization_name || "",
        legal_entity_name: profileData.organization.legal_entity_name || "",
        display_name: profileData.organization.display_name || "",
        primary_email: profileData.organization.primary_email || "",
        primary_phone: profileData.organization.primary_phone || "",
        primary_phone_ext: profileData.organization.primary_phone_ext || "",
        address_line1: profileData.organization.address_line1 || "",
        address_line2: profileData.organization.address_line2 || "",
        city: profileData.organization.city || "",
        state_province: profileData.organization.state_province || "",
        postal_code: profileData.organization.postal_code || "",
        country: profileData.organization.country || "",
        website_url: profileData.organization.website_url || "",
        logo_url: profileData.organization.logo_url || "",
        tax_id: profileData.organization.tax_id || "",
        business_hours: normalizedBusinessHours,
        sales_territory_states: profileData.organization.sales_territory_states || [],
        status: profileData.organization.status || "active",
        subscription_tier: profileData.organization.subscription_tier || "free",
      });
    } else {
      // No organization data - check if we should show empty form or keep existing data
      console.warn('[Profile] No organization data found in profile:', {
        hasProfileData: !!profileData,
        hasOrganization: !!profileData.organization,
        accountRole: profileData.account?.role,
      });
      
      // Only reset if we're sure there's no organization
      // Don't reset if we're in the middle of loading
      if (!profileLoading) {
        setOrgFormData({
          organization_type_id: undefined,
          organization_name: "",
          legal_entity_name: "",
          display_name: "",
          primary_email: "",
          primary_phone: "",
          primary_phone_ext: "",
          address_line1: "",
          address_line2: "",
          city: "",
          state_province: "",
          postal_code: "",
          country: "",
          website_url: "",
          logo_url: "",
          tax_id: "",
          business_hours: {},
          sales_territory_states: [],
          status: "active",
          subscription_tier: "free",
        });
      }
    }

    // Load dealer information
    if (profileData.dealer?.id) {
      // Normalize business_hours for dealer if it exists
      const normalizedDealerBusinessHours = profileData.dealer.business_hours 
        ? normalizeBusinessHours(profileData.dealer.business_hours)
        : undefined;

      setDealerFormData({
        business_type: profileData.dealer.business_type || undefined,
        dealer_license_number: profileData.dealer.dealer_license_number || "",
        dealer_license_state: profileData.dealer.dealer_license_state || "",
        dealer_license_expires_at: profileData.dealer.dealer_license_expires_at ? 
          new Date(profileData.dealer.dealer_license_expires_at).toISOString().split('T')[0] : "",
        tax_id: profileData.dealer.tax_id || "",
        duns_number: profileData.dealer.duns_number || "",
        specializations: profileData.dealer.specializations || [],
        makes_carried: profileData.dealer.makes_carried || [],
        average_inventory_count: profileData.dealer.average_inventory_count,
        lot_capacity: profileData.dealer.lot_capacity,
        can_special_order: profileData.dealer.can_special_order,
        accepts_trade_ins: profileData.dealer.accepts_trade_ins,
        has_service_department: profileData.dealer.has_service_department,
        has_parts_department: profileData.dealer.has_parts_department,
        has_body_shop: profileData.dealer.has_body_shop,
        can_install_upfits: profileData.dealer.can_install_upfits,
        typical_delivery_days: profileData.dealer.typical_delivery_days,
        sales_territory_states: profileData.dealer.sales_territory_states || [],
        delivery_available: profileData.dealer.delivery_available,
        delivery_radius_miles: profileData.dealer.delivery_radius_miles,
        delivery_fee: profileData.dealer.delivery_fee,
        current_promotions: profileData.dealer.current_promotions || "",
        accepts_fleet_inquiries: profileData.dealer.accepts_fleet_inquiries,
        minimum_fleet_size: profileData.dealer.minimum_fleet_size,
        fleet_discount_percentage: profileData.dealer.fleet_discount_percentage,
        certifications: profileData.dealer.certifications || [],
        awards: profileData.dealer.awards || [],
        auto_respond_inquiries: profileData.dealer.auto_respond_inquiries,
        inquiry_email_notification: profileData.dealer.inquiry_email_notification,
        weekly_performance_report: profileData.dealer.weekly_performance_report,
        allow_price_negotiations: profileData.dealer.allow_price_negotiations,
        dealer_code: profileData.dealer.dealer_code || "",
        ford_dealer_code: profileData.dealer.ford_dealer_code || "",
        default_price_level: profileData.dealer.default_price_level || "",
        can_order_fleet: profileData.dealer.can_order_fleet ?? false,
        can_order_government: profileData.dealer.can_order_government ?? false,
        uses_b4a: profileData.dealer.uses_b4a ?? true,
        floor_plan_company: profileData.dealer.floor_plan_company || "",
        floor_plan_account: profileData.dealer.floor_plan_account || "",
        floor_plan_limit: profileData.dealer.floor_plan_limit,
        typical_days_to_floor: profileData.dealer.typical_days_to_floor,
        average_turn_days: profileData.dealer.average_turn_days,
        b4a_account_number: profileData.dealer.b4a_account_number || "",
        b4a_enrollment_date: profileData.dealer.b4a_enrollment_date ? 
          new Date(profileData.dealer.b4a_enrollment_date).toISOString().split('T')[0] : "",
        fein_number: profileData.dealer.fein_number || "",
        sam_registration: profileData.dealer.sam_registration ?? false,
        sam_expiration_date: profileData.dealer.sam_expiration_date ? 
          new Date(profileData.dealer.sam_expiration_date).toISOString().split('T')[0] : "",
        cage_code: profileData.dealer.cage_code || "",
        ford_pro_elite: profileData.dealer.ford_pro_elite ?? false,
        gm_fleet_certified: profileData.dealer.gm_fleet_certified ?? false,
        ram_commercial_certified: profileData.dealer.ram_commercial_certified ?? false,
        preferred_upfitter_ids: profileData.dealer.preferred_upfitter_ids || [],
        upfit_delivery_coordination: profileData.dealer.upfit_delivery_coordination ?? false,
        primary_contact_name: profileData.dealer.primary_contact_name || "",
        primary_contact_title: profileData.dealer.primary_contact_title || "",
        primary_contact_phone: profileData.dealer.primary_contact_phone || "",
        primary_contact_email: profileData.dealer.primary_contact_email || "",
        dms_dealer_id: profileData.dealer.cdk_dealer_id || profileData.dealer.reynolds_dealer_id || "",
        dms_provider: profileData.dealer.dms_provider || "",
        business_hours: normalizedDealerBusinessHours,
      });
    } else {
      // Reset dealer form if no dealer exists
      setDealerFormData({
        business_type: undefined,
        dealer_license_number: "",
        dealer_license_state: "",
        dealer_license_expires_at: "",
        tax_id: "",
        duns_number: "",
        specializations: [],
        makes_carried: [],
        average_inventory_count: undefined,
        lot_capacity: undefined,
        can_special_order: false,
        accepts_trade_ins: false,
        has_service_department: false,
        has_parts_department: false,
        has_body_shop: false,
        can_install_upfits: false,
        typical_delivery_days: undefined,
        sales_territory_states: [],
        delivery_available: false,
        delivery_radius_miles: undefined,
        delivery_fee: undefined,
        current_promotions: "",
        accepts_fleet_inquiries: false,
        minimum_fleet_size: undefined,
        fleet_discount_percentage: undefined,
        certifications: [],
        awards: [],
        auto_respond_inquiries: false,
        inquiry_email_notification: false,
        weekly_performance_report: false,
        allow_price_negotiations: false,
        dealer_code: "",
        ford_dealer_code: "",
        default_price_level: "",
        can_order_fleet: false,
        can_order_government: false,
        uses_b4a: true,
        floor_plan_company: "",
        floor_plan_account: "",
        floor_plan_limit: undefined,
        typical_days_to_floor: undefined,
        average_turn_days: undefined,
        b4a_account_number: "",
        b4a_enrollment_date: "",
        fein_number: "",
        sam_registration: false,
        sam_expiration_date: "",
        cage_code: "",
        ford_pro_elite: false,
        gm_fleet_certified: false,
        ram_commercial_certified: false,
        preferred_upfitter_ids: [],
        upfit_delivery_coordination: false,
        primary_contact_name: "",
        primary_contact_title: "",
        primary_contact_phone: "",
        primary_contact_email: "",
        dms_dealer_id: "",
        dms_provider: "",
        business_hours: undefined,
      });
    }
  }, [profileData, isSaving]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be signed in to update your profile");
      return;
    }
    
    // If we're on the locations tab, trigger the location form submission instead
    if (activeTab === "locations" && dealerLocationsManagerRef.current) {
      setIsSaving(true);
      setAutoSaveStatus("saving");
      try {
        await dealerLocationsManagerRef.current.submit();
        setAutoSaveStatus("saved");
        toast.success("Location saved successfully!");
        // Small delay to ensure database commit completes, then refetch profile data
        await new Promise(resolve => setTimeout(resolve, 100));
        await refetchProfile();
        // Reset auto-save status after 3 seconds
        setTimeout(() => setAutoSaveStatus("idle"), 3000);
      } catch (error: any) {
        console.error("Failed to save location:", error);
        const errorMessage = error?.message || error?.data?.message || "Failed to save location";
        toast.error(errorMessage);
        setAutoSaveStatus("idle");
      } finally {
        setIsSaving(false);
      }
      return;
    }
    
    setIsSaving(true);
    setAutoSaveStatus("saving");
    
    try {
      // Update personal information
      if (personalFormData) {
        await updatePersonalMutation.mutateAsync({
          name: personalFormData.name,
          phone: personalFormData.phone,
          bio: personalFormData.bio,
          avatar: personalFormData.avatar,
          emailNotifications: personalFormData.emailNotifications,
          marketingEmails: personalFormData.marketingEmails,
        });
      }

      // Create or update organization if user has permission
      let organizationId = profileData?.organization?.id;
      
      if (canManageOrg && orgFormData.organization_name && orgFormData.primary_email) {
        if (profileData?.organization?.id) {
          // Update existing organization
          await updateOrganizationMutation.mutateAsync({
            organizationId: profileData.organization.id,
            organization_type_id: orgFormData.organization_type_id || undefined,
            organization_name: orgFormData.organization_name || undefined,
            legal_entity_name: orgFormData.legal_entity_name || undefined,
            display_name: orgFormData.display_name || undefined,
            primary_email: orgFormData.primary_email || undefined,
            primary_phone: orgFormData.primary_phone || undefined,
            primary_phone_ext: orgFormData.primary_phone_ext || undefined,
            address_line1: orgFormData.address_line1 || undefined,
            address_line2: orgFormData.address_line2 || undefined,
            city: orgFormData.city || undefined,
            state_province: orgFormData.state_province || undefined,
            postal_code: orgFormData.postal_code || undefined,
            country: orgFormData.country || undefined,
            website_url: orgFormData.website_url || undefined,
            logo_url: orgFormData.logo_url || undefined,
            tax_id: orgFormData.tax_id || undefined,
            business_hours: (() => {
              // Use the helper function to ensure business_hours is always properly normalized
              const normalized = normalizeBusinessHours(orgFormData.business_hours);
              
              // Debug: Check for any string values (should never happen after normalization)
              const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
              const hasStringValues = days.some(day => typeof normalized[day] === 'string');
              if (hasStringValues) {
                console.error('[Profile] ERROR: Found string values in normalized business_hours!', {
                  raw: orgFormData.business_hours,
                  normalized,
                });
              }
              
              return Object.keys(normalized).length > 0 ? normalized : undefined;
            })(),
            sales_territory_states: (orgFormData.sales_territory_states || []).length > 0 ? orgFormData.sales_territory_states : undefined,
            status: orgFormData.status || undefined,
            subscription_tier: orgFormData.subscription_tier || undefined,
          });
        } else if (orgFormData.organization_type_id) {
          // Create new organization
          const createResult = await createOrganizationMutation.mutateAsync({
            organization_type_id: orgFormData.organization_type_id,
            organization_name: orgFormData.organization_name,
            legal_entity_name: orgFormData.legal_entity_name || undefined,
            display_name: orgFormData.display_name || undefined,
            primary_email: orgFormData.primary_email,
            primary_phone: orgFormData.primary_phone || undefined,
            primary_phone_ext: orgFormData.primary_phone_ext || undefined,
            address_line1: orgFormData.address_line1 || undefined,
            address_line2: orgFormData.address_line2 || undefined,
            city: orgFormData.city || undefined,
            state_province: orgFormData.state_province || undefined,
            postal_code: orgFormData.postal_code || undefined,
            country: orgFormData.country || undefined,
            website_url: orgFormData.website_url || undefined,
            logo_url: orgFormData.logo_url || undefined,
            tax_id: orgFormData.tax_id || undefined,
            business_hours: (() => {
              // Use the helper function to ensure business_hours is always properly normalized
              const normalized = normalizeBusinessHours(orgFormData.business_hours);
              
              // Debug: Check for any string values (should never happen after normalization)
              const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
              const hasStringValues = days.some(day => typeof normalized[day] === 'string');
              if (hasStringValues) {
                console.error('[Profile] ERROR: Found string values in normalized business_hours!', {
                  raw: orgFormData.business_hours,
                  normalized,
                });
              }
              
              return Object.keys(normalized).length > 0 ? normalized : undefined;
            })(),
            sales_territory_states: (orgFormData.sales_territory_states || []).length > 0 ? orgFormData.sales_territory_states : undefined,
            status: orgFormData.status || 'active',
            subscription_tier: orgFormData.subscription_tier || 'free',
          });
          organizationId = createResult.organizationId;
        }
      }

      // Update dealer if needed - only if dealer exists and we have dealer data
      // Don't update dealer if we're only updating personal info
      const selectedOrgType = orgTypesData?.find((t: OrganizationType) => t.id === orgFormData.organization_type_id);
      const needsDealer = selectedOrgType?.can_list_vehicles || !!profileData?.dealer;
      const hasDealerData = profileData?.dealer?.id && dealerFormData;
      
      // Check if dealer form has any meaningful data (not just empty defaults)
      const hasDealerFormData = hasDealerData && (
        dealerFormData.business_type ||
        dealerFormData.dealer_license_number ||
        dealerFormData.dealer_code ||
        dealerFormData.ford_dealer_code ||
        (dealerFormData.specializations && dealerFormData.specializations.length > 0) ||
        (dealerFormData.makes_carried && dealerFormData.makes_carried.length > 0) ||
        dealerFormData.average_inventory_count ||
        dealerFormData.lot_capacity
      );

      // Only update dealer if:
      // 1. User can manage org
      // 2. Organization exists
      // 3. Dealer is needed (org type requires it or dealer exists)
      // 4. Dealer data actually exists AND has meaningful data (don't try to update if dealer doesn't exist yet or form is empty)
      if (canManageOrg && organizationId && needsDealer && hasDealerFormData) {
        try {
          await updateDealerMutation.mutateAsync({
          organizationId: organizationId,
            business_type: dealerFormData.business_type || undefined,
            dealer_license_number: dealerFormData.dealer_license_number || undefined,
            dealer_license_state: dealerFormData.dealer_license_state || undefined,
            dealer_license_expires_at: dealerFormData.dealer_license_expires_at || undefined,
            tax_id: dealerFormData.tax_id || undefined,
            duns_number: dealerFormData.duns_number || undefined,
          specializations: (dealerFormData.specializations || []).length > 0 ? dealerFormData.specializations : undefined,
          makes_carried: (dealerFormData.makes_carried || []).length > 0 ? dealerFormData.makes_carried : undefined,
            average_inventory_count: dealerFormData.average_inventory_count,
            lot_capacity: dealerFormData.lot_capacity,
            can_special_order: dealerFormData.can_special_order,
            accepts_trade_ins: dealerFormData.accepts_trade_ins,
            has_service_department: dealerFormData.has_service_department,
            has_parts_department: dealerFormData.has_parts_department,
            has_body_shop: dealerFormData.has_body_shop,
            can_install_upfits: dealerFormData.can_install_upfits,
            typical_delivery_days: dealerFormData.typical_delivery_days,
          sales_territory_states: (dealerFormData.sales_territory_states || []).length > 0 ? dealerFormData.sales_territory_states : undefined,
            delivery_available: dealerFormData.delivery_available,
            delivery_radius_miles: dealerFormData.delivery_radius_miles,
            delivery_fee: dealerFormData.delivery_fee,
            current_promotions: dealerFormData.current_promotions || undefined,
            accepts_fleet_inquiries: dealerFormData.accepts_fleet_inquiries,
            minimum_fleet_size: dealerFormData.minimum_fleet_size,
            fleet_discount_percentage: dealerFormData.fleet_discount_percentage,
          certifications: (dealerFormData.certifications || []).length > 0 ? dealerFormData.certifications : undefined,
          awards: (dealerFormData.awards || []).length > 0 ? dealerFormData.awards : undefined,
            auto_respond_inquiries: dealerFormData.auto_respond_inquiries,
            inquiry_email_notification: dealerFormData.inquiry_email_notification,
            weekly_performance_report: dealerFormData.weekly_performance_report,
            allow_price_negotiations: dealerFormData.allow_price_negotiations,
            dealer_code: dealerFormData.dealer_code || undefined,
            ford_dealer_code: dealerFormData.ford_dealer_code || undefined,
            default_price_level: dealerFormData.default_price_level || undefined,
            can_order_fleet: dealerFormData.can_order_fleet,
            can_order_government: dealerFormData.can_order_government,
            uses_b4a: dealerFormData.uses_b4a,
            floor_plan_company: dealerFormData.floor_plan_company || undefined,
            floor_plan_account: dealerFormData.floor_plan_account || undefined,
            floor_plan_limit: dealerFormData.floor_plan_limit,
            typical_days_to_floor: dealerFormData.typical_days_to_floor,
            average_turn_days: dealerFormData.average_turn_days,
            b4a_account_number: dealerFormData.b4a_account_number || undefined,
            b4a_enrollment_date: dealerFormData.b4a_enrollment_date || undefined,
            fein_number: dealerFormData.fein_number || undefined,
            sam_registration: dealerFormData.sam_registration,
            sam_expiration_date: dealerFormData.sam_expiration_date || undefined,
            cage_code: dealerFormData.cage_code || undefined,
            ford_pro_elite: dealerFormData.ford_pro_elite,
            gm_fleet_certified: dealerFormData.gm_fleet_certified,
            ram_commercial_certified: dealerFormData.ram_commercial_certified,
            preferred_upfitter_ids: (dealerFormData.preferred_upfitter_ids || []).length > 0 ? dealerFormData.preferred_upfitter_ids : undefined,
            upfit_delivery_coordination: dealerFormData.upfit_delivery_coordination,
            primary_contact_name: dealerFormData.primary_contact_name || undefined,
            primary_contact_title: dealerFormData.primary_contact_title || undefined,
            primary_contact_phone: dealerFormData.primary_contact_phone || undefined,
            primary_contact_email: dealerFormData.primary_contact_email || undefined,
            cdk_dealer_id: dealerFormData.dms_dealer_id || undefined,
            dms_provider: dealerFormData.dms_provider || undefined,
            business_hours: dealerFormData.business_hours && Object.keys(dealerFormData.business_hours).length > 0 
              ? normalizeBusinessHours(dealerFormData.business_hours) 
              : undefined,
          });
        } catch (dealerError: any) {
          // Log dealer update error but don't fail the entire update
          console.error("Failed to update dealer (non-critical):", dealerError);
          // Show warning but don't throw - personal and org updates may have succeeded
          toast.warning("Profile updated, but dealer information update failed. Please try updating dealer information separately.");
        }
      }
      
      toast.success("Profile updated successfully!");
      setAutoSaveStatus("saved");
      
      // Small delay to ensure database commit completes, then refetch profile data
      await new Promise(resolve => setTimeout(resolve, 100));
      await refetchProfile();
      
      // Reset auto-save status after 3 seconds
      setTimeout(() => setAutoSaveStatus("idle"), 3000);
      
      // Refetch listing capability status after profile update
      if (profileData?.organization?.id) {
        setTimeout(() => {
          refetchListingCapability();
        }, 200);
      }
      
      // Set flag for listing page to auto-refresh when user returns
      sessionStorage.setItem('returnedFromProfile', 'true');
      
      // If organization type allows listings and dealer was created/updated, 
      // show success message about listing capability
      // Reuse selectedOrgType from earlier in the function
      if (selectedOrgType?.can_list_vehicles && organizationId) {
        toast.success("Your dealer profile has been saved! You can now create vehicle listings.", {
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      
      // Provide more detailed error messages
      let errorMessage = "Failed to update profile";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.cause?.message) {
        errorMessage = error.cause.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Check for network errors
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        errorMessage = "Network error: Could not connect to server. Please check if the server is running and try again.";
      }
      
      toast.error(errorMessage);
      setAutoSaveStatus("idle");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper functions for tag inputs
  const addSpecialization = () => {
    if (specializationInput.trim() && !dealerFormData.specializations?.includes(specializationInput.trim())) {
      setDealerFormData({
        ...dealerFormData,
        specializations: [...(dealerFormData.specializations || []), specializationInput.trim()],
      });
      setSpecializationInput("");
    }
  };

  const removeSpecialization = (index: number) => {
    setDealerFormData({
      ...dealerFormData,
      specializations: dealerFormData.specializations?.filter((_, i) => i !== index) || [],
    });
  };

  const addMake = () => {
    if (makesInput.trim() && !dealerFormData.makes_carried?.includes(makesInput.trim())) {
      setDealerFormData({
        ...dealerFormData,
        makes_carried: [...(dealerFormData.makes_carried || []), makesInput.trim()],
      });
      setMakesInput("");
    }
  };

  const removeMake = (index: number) => {
    setDealerFormData({
      ...dealerFormData,
      makes_carried: dealerFormData.makes_carried?.filter((_, i) => i !== index) || [],
    });
  };

  const addTerritoryState = () => {
    const state = territoryStateInput.trim().toUpperCase();
    if (state && state.length === 2 && !orgFormData.sales_territory_states?.includes(state)) {
      setOrgFormData({
        ...orgFormData,
        sales_territory_states: [...(orgFormData.sales_territory_states || []), state],
      });
      setTerritoryStateInput("");
    }
  };

  const removeTerritoryState = (index: number) => {
    setOrgFormData({
      ...orgFormData,
      sales_territory_states: orgFormData.sales_territory_states?.filter((_, i) => i !== index) || [],
    });
  };

  const addCertification = () => {
    if (certificationInput.trim() && !dealerFormData.certifications?.includes(certificationInput.trim())) {
      setDealerFormData({
        ...dealerFormData,
        certifications: [...(dealerFormData.certifications || []), certificationInput.trim()],
      });
      setCertificationInput("");
    }
  };

  const removeCertification = (index: number) => {
    setDealerFormData({
      ...dealerFormData,
      certifications: dealerFormData.certifications?.filter((_, i) => i !== index) || [],
    });
  };

  const addAward = () => {
    if (awardInput.trim() && !dealerFormData.awards?.includes(awardInput.trim())) {
      setDealerFormData({
        ...dealerFormData,
        awards: [...(dealerFormData.awards || []), awardInput.trim()],
      });
      setAwardInput("");
    }
  };

  const removeAward = (index: number) => {
    setDealerFormData({
      ...dealerFormData,
      awards: dealerFormData.awards?.filter((_, i) => i !== index) || [],
    });
  };

  const updateBusinessHours = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    // First normalize the current business_hours to ensure it's in the correct format
    const normalizedHours = normalizeBusinessHours(orgFormData.business_hours || {});
    const currentDayData = normalizedHours[day] || { open: '09:00', close: '17:00', closed: false };
    
    // Update the specific day with the new value
    setOrgFormData({
      ...orgFormData,
      business_hours: {
        ...normalizedHours,
        [day]: {
          ...currentDayData,
          [field]: value,
        },
      },
    });
  };

  // Loading state
  if (userLoading || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to view and edit your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation('/login')} className="w-full">
                Sign In
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Error Loading Profile</CardTitle>
              <CardDescription>
                {profileError.message || 'Failed to load profile data'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => refetchProfile()} className="w-full">
                Retry
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Check role from both sources (userProfile from hook and profileData from API)
  const userRole = profileData?.account?.role || userProfile?.role;
  const canManageOrg = userRole === 'owner' || userRole === 'admin';
  const selectedOrgType = orgTypesData?.find((t: OrganizationType) => t.id === orgFormData.organization_type_id);
  
  // Get current organization type from profile data or selected type
  const currentOrgType = profileData?.organization?.organizationType || 
    (profileData?.organization?.organization_type_id 
      ? orgTypesData?.find((t: OrganizationType) => t.id === profileData.organization?.organization_type_id)
      : null) ||
    selectedOrgType;
  
  // Check if current organization type is a dealer/seller type
  const isDealerOrgType = currentOrgType && (
    currentOrgType.type_code?.toLowerCase().includes('dealer') ||
    currentOrgType.type_code?.toLowerCase().includes('seller') ||
    currentOrgType.display_name?.toLowerCase().includes('dealer') ||
    currentOrgType.display_name?.toLowerCase().includes('seller')
  );
  
  const needsDealer = selectedOrgType?.can_list_vehicles || !!profileData?.dealer;
  
  // Always show organization section for logged-in users
  // The "Admin Only" badge indicates it's restricted, backend enforces permissions
  const showOrganizationSection = !!user;
  
  // Show dealer section only if user is logged in AND organization type is dealer
  const showDealerSection = !!user && !!isDealerOrgType;

  return (
    <SidebarProvider>
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
        <div className="flex flex-1">
          {/* Sidebar Navigation */}
          <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="border-b">
              {personalFormData && (
                <div className="flex items-center gap-3 px-2 py-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={personalFormData?.avatar || (personalFormData?.email ? `https://api.dicebear.com/7.x/initials/svg?seed=${personalFormData.name || personalFormData.email}` : undefined)} />
                    <AvatarFallback>
                      {personalFormData?.name?.charAt(0) || personalFormData?.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{personalFormData?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{personalFormData?.email || ""}</p>
                  </div>
                </div>
              )}
              <Separator />
              <div className="px-2 py-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Profile Complete</span>
                  <span className="font-medium">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="h-2" />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Profile Sections</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("personal")}
                        isActive={activeTab === "personal"}
                      >
                        <User className="h-4 w-4" />
                        <span>Personal</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {showOrganizationSection && (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => setActiveTab("organization")}
                          isActive={activeTab === "organization"}
                          disabled={!canManageOrg}
                        >
                          <Building className="h-4 w-4" />
                          <span>Organization</span>
                          {!canManageOrg && (
                            <Badge variant="outline" className="ml-auto text-xs">Admin</Badge>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => isDealerOrgType && setActiveTab("capabilities")}
                          isActive={activeTab === "capabilities"}
                          disabled={!isDealerOrgType}
                          className={!isDealerOrgType ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          <Zap className="h-4 w-4" />
                          <span>Dealer Capabilities</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => isDealerOrgType && setActiveTab("dealer-codes")}
                          isActive={activeTab === "dealer-codes"}
                          disabled={!isDealerOrgType}
                          className={!isDealerOrgType ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          <FileText className="h-4 w-4" />
                          <span>OEM Dealer Codes</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => setActiveTab("locations")}
                          isActive={activeTab === "locations"}
                        >
                          <MapPin className="h-4 w-4" />
                          <span>Locations</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {showDealerSection && (
                        <>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            onClick={() => setActiveTab("fleet-government")}
                            isActive={activeTab === "fleet-government"}
                          >
                            <Truck className="h-4 w-4" />
                            <span>Fleet & Government</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        </>
                      )}
                    </>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("notifications")}
                        isActive={activeTab === "notifications"}
                      >
                        <Bell className="h-4 w-4" />
                        <span>Notifications</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("account")}
                        isActive={activeTab === "account"}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Account</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          
          {/* Main Content */}
          <SidebarInset className="flex-1">
            <div className="flex h-full flex-col">
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-14 items-center gap-4 px-6">
                  <SidebarTrigger />
                  <Separator orientation="vertical" />
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <h1 className="text-xl font-semibold">My Profile</h1>
                      <p className="text-sm text-muted-foreground">
                        {activeTab === "personal" && "Manage your personal information"}
                        {activeTab === "organization" && "Organization details and settings"}
                        {activeTab === "capabilities" && "Dealer capabilities and services"}
                        {activeTab === "dealer-codes" && "OEM dealer codes and certifications"}
                        {activeTab === "locations" && "Dealership locations"}
                        {activeTab === "fleet-government" && "Fleet and government programs"}
                        {activeTab === "notifications" && "Notification preferences"}
                        {activeTab === "account" && "Account information"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {autoSaveStatus === "saving" && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3 animate-spin" />
                          Saving...
                        </Badge>
                      )}
                      {autoSaveStatus === "saved" && (
                        <Badge variant="outline" className="gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Saved
                        </Badge>
                      )}
                      <Button
                        type="submit"
                        form="profile-form"
                        disabled={isSaving || profileLoading}
                        className="gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </div>
          </div>

              {/* Content Area */}
              <div className="flex-1 overflow-auto">
                <div className="container max-w-5xl py-6 px-6">
                  <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
                    {activeTab === "personal" && personalFormData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                          <CardDescription>
                            Update your personal details and profile information
                          </CardDescription>
              </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Avatar Upload */}
                          <div className="flex items-center gap-6">
                            <Avatar className="h-24 w-24">
                              <AvatarImage src={personalFormData.avatar || (personalFormData.email ? `https://api.dicebear.com/7.x/initials/svg?seed=${personalFormData.name || personalFormData.email}` : undefined)} />
                              <AvatarFallback className="text-2xl">
                                {personalFormData.name?.charAt(0) || personalFormData.email?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                              <Label>Profile Photo</Label>
                              <ImageUpload
                                label="Upload Avatar"
                                value={personalFormData?.avatar || ""}
                                onChange={async (url) => {
                                  if (personalFormData) {
                                    // Update local state immediately for instant UI feedback
                                    setPersonalFormData({ ...personalFormData, avatar: url });
                                    
                                    // Auto-save avatar when uploaded
                                    try {
                                      setAutoSaveStatus("saving");
                                      await updatePersonalMutation.mutateAsync({
                                        name: personalFormData.name,
                                        phone: personalFormData.phone,
                                        bio: personalFormData.bio,
                                        avatar: url,
                                        emailNotifications: personalFormData.emailNotifications,
                                        marketingEmails: personalFormData.marketingEmails,
                                      });
                                      
                                      setAutoSaveStatus("saved");
                                      toast.success("Profile photo saved");
                                      
                                      // Refetch profile to sync with backend
                                      // Add cache-busting timestamp to ensure fresh data
                                      const { data: updatedProfile } = await refetchProfile();
                                      
                                      // Update local state from refetched data to ensure consistency
                                      if (updatedProfile?.personal?.avatar) {
                                        setPersonalFormData(prev => prev ? { ...prev, avatar: updatedProfile.personal.avatar } : null);
                                      }
                                      
                                      setAutoSaveStatus("idle");
                                    } catch (error: any) {
                                      setAutoSaveStatus("idle");
                                      toast.error(error.message || "Failed to save profile photo");
                                    }
                                  }
                                }}
                                onRemove={async () => {
                                  if (personalFormData) {
                                    // Update local state immediately
                                    setPersonalFormData({ ...personalFormData, avatar: "" });
                                    
                                    // Auto-save when avatar is removed
                                    try {
                                      setAutoSaveStatus("saving");
                                      await updatePersonalMutation.mutateAsync({
                                        name: personalFormData.name,
                                        phone: personalFormData.phone,
                                        bio: personalFormData.bio,
                                        avatar: "",
                                        emailNotifications: personalFormData.emailNotifications,
                                        marketingEmails: personalFormData.marketingEmails,
                                      });
                                      
                                      setAutoSaveStatus("saved");
                                      toast.success("Profile photo removed");
                                      
                                      // Refetch profile to sync with backend
                                      const { data: updatedProfile } = await refetchProfile();
                                      
                                      // Update local state from refetched data to ensure consistency
                                      if (updatedProfile?.personal) {
                                        setPersonalFormData(prev => prev ? { ...prev, avatar: updatedProfile.personal.avatar || "" } : null);
                                      }
                                      
                                      setAutoSaveStatus("idle");
                                    } catch (error: any) {
                                      setAutoSaveStatus("idle");
                                      toast.error(error.message || "Failed to remove profile photo");
                                    }
                                  }
                                }}
                                maxSizeMB={2}
                              />
                              <p className="text-xs text-muted-foreground">
                                Recommended: Square image, at least 200x200 pixels
                              </p>
                            </div>
                          </div>
                          
                          <Separator />
                          
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                              <Label htmlFor="name">
                                Full Name <span className="text-destructive">*</span>
                              </Label>
                    <Input
                      id="name"
                        value={personalFormData.name}
                        onChange={(e) => setPersonalFormData({ ...personalFormData, name: e.target.value })}
                                placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                              <Label htmlFor="email">Email Address</Label>
                              <div className="relative">
                    <Input
                      id="email"
                      type="email"
                        value={personalFormData.email || ""}
                      disabled
                      readOnly
                                  className="cursor-not-allowed opacity-60 pr-10"
                                />
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {profileData?.personal?.email ? (
                                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <AlertCircle className="h-4 w-4 text-amber-600" />
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {profileData?.personal?.email ? "Email verified" : "Email not verified"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                    <p className="text-xs text-muted-foreground">
                                Email cannot be changed. Contact support if you need to update it.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                      value={personalFormData.phone}
                      onChange={(e) => setPersonalFormData({ ...personalFormData, phone: e.target.value })}
                              placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                      value={personalFormData.bio}
                      onChange={(e) => setPersonalFormData({ ...personalFormData, bio: e.target.value })}
                    rows={4}
                              placeholder="Tell us about yourself..."
                              maxLength={1000}
                  />
                            <p className="text-xs text-muted-foreground">
                              {personalFormData.bio.length}/1000 characters
                            </p>
                </div>
                          
                          {profileData?.personal?.lastSignInAt && (
                            <div className="pt-4 border-t">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Last Sign In</span>
                                <span className="font-medium">
                                  {new Date(profileData.personal.lastSignInAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
              </CardContent>
            </Card>
            )}

            {/* Organization Information */}
                    {activeTab === "organization" && showOrganizationSection && (
              <Card>
                <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                              <CardTitle>Organization Information</CardTitle>
                              {!canManageOrg && (
                    <Badge variant="secondary" className="ml-2">Admin Only</Badge>
                              )}
                            </div>
                            {profileData?.organization && (
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={
                                    profileData.organization.status === 'active' ? "default" :
                                    profileData.organization.status === 'pending_verification' ? "secondary" :
                                    "destructive"
                                  }
                                >
                                  {profileData.organization.status === 'active' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                  {profileData.organization.status === 'pending_verification' && <Clock className="h-3 w-3 mr-1" />}
                                  {profileData.organization.status || 'Unknown'}
                                </Badge>
                                <Badge variant="outline">
                                  {profileData.organization.subscription_tier || 'free'}
                                </Badge>
                              </div>
                            )}
                          </div>
                  <CardDescription>
                    Manage your organization's details and settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!profileData?.organization?.id && canManageOrg && !profileLoading && (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-md text-sm text-blue-900 dark:text-blue-100">
                      <p className="font-medium mb-1">No organization set up yet</p>
                      <p className="text-xs">Fill out the form below to create your organization profile.</p>
                      {process.env.NODE_ENV === 'development' && (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer">Debug Info</summary>
                          <div className="mt-2 space-y-2">
                            <div>
                              <p className="font-semibold mb-1">Profile Data:</p>
                              <pre className="p-2 bg-white dark:bg-gray-900 rounded overflow-auto text-xs">
                                {JSON.stringify({
                                  hasProfileData: !!profileData,
                                  hasOrganization: !!profileData?.organization,
                                  organizationId: profileData?.organization?.id,
                                  profileError: profileError?.message,
                                  accountRole: profileData?.account?.role,
                                }, null, 2)}
                              </pre>
                            </div>
                            {diagnosticData && (
                              <div>
                                <p className="font-semibold mb-1">Diagnostic Data:</p>
                                <pre className="p-2 bg-white dark:bg-gray-900 rounded overflow-auto text-xs">
                                  {JSON.stringify(diagnosticData, null, 2)}
                                </pre>
                                {diagnosticData.issues && diagnosticData.issues.length > 0 && (
                                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900 rounded">
                                    <p className="font-semibold text-yellow-900 dark:text-yellow-100">Issues Found:</p>
                                    <ul className="list-disc list-inside mt-1 text-yellow-800 dark:text-yellow-200">
                                      {diagnosticData.issues.map((issue: string, idx: number) => (
                                        <li key={idx}>{issue}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {orgTypesError && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                      <p className="font-medium">Error loading organization types</p>
                      <p className="text-xs mt-1">{orgTypesError.message || 'Unknown error'}</p>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => refetchOrgTypes()}
                      >
                        Retry
                      </Button>
                    </div>
                  )}

                  {orgTypesLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Loading organization types...
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="organization_type_id">
                      Organization Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={orgFormData.organization_type_id?.toString() || ""}
                      onValueChange={(value) => {
                        const typeId = value ? parseInt(value) : undefined;
                        setOrgFormData({ ...orgFormData, organization_type_id: typeId || undefined });
                      }}
                      disabled={orgTypesLoading || !orgTypesData || orgTypesData.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="" />
                      </SelectTrigger>
                      <SelectContent>
                        {orgTypesData?.map((type: OrganizationType) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.display_name}
                              {type.description && ` - ${type.description}`}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the type that best describes your organization. This determines available features.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="organization_name">
                        Organization Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="organization_name"
                        value={orgFormData.organization_name || ""}
                        onChange={(e) => setOrgFormData({ ...orgFormData, organization_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="legal_entity_name">Legal Entity Name</Label>
                      <Input
                        id="legal_entity_name"
                        value={orgFormData.legal_entity_name || ""}
                        onChange={(e) => setOrgFormData({ ...orgFormData, legal_entity_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={orgFormData.display_name || ""}
                      onChange={(e) => setOrgFormData({ ...orgFormData, display_name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary_email">
                        Primary Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="primary_email"
                        type="email"
                        value={orgFormData.primary_email || ""}
                        onChange={(e) => setOrgFormData({ ...orgFormData, primary_email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="primary_phone">Primary Phone</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primary_phone"
                          value={orgFormData.primary_phone || ""}
                          onChange={(e) => setOrgFormData({ ...orgFormData, primary_phone: e.target.value })}
                          className="flex-1"
                        />
                        <Input
                          id="primary_phone_ext"
                          value={orgFormData.primary_phone_ext || ""}
                          onChange={(e) => setOrgFormData({ ...orgFormData, primary_phone_ext: e.target.value })}
                          className="w-24"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address_line1">Address Line 1</Label>
                      <Input
                        id="address_line1"
                        value={orgFormData.address_line1 || ""}
                        onChange={(e) => setOrgFormData({ ...orgFormData, address_line1: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address_line2">Address Line 2</Label>
                      <Input
                        id="address_line2"
                        value={orgFormData.address_line2 || ""}
                        onChange={(e) => setOrgFormData({ ...orgFormData, address_line2: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={orgFormData.city || ""}
                        onChange={(e) => setOrgFormData({ ...orgFormData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state_province">State/Province</Label>
                      <Input
                        id="state_province"
                        value={orgFormData.state_province || ""}
                        onChange={(e) => setOrgFormData({ ...orgFormData, state_province: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={orgFormData.postal_code || ""}
                        onChange={(e) => setOrgFormData({ ...orgFormData, postal_code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={orgFormData.country || ""}
                        onValueChange={(value) => setOrgFormData({ ...orgFormData, country: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="MX">Mexico</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                          <SelectItem value="IT">Italy</SelectItem>
                          <SelectItem value="ES">Spain</SelectItem>
                          <SelectItem value="NL">Netherlands</SelectItem>
                          <SelectItem value="BE">Belgium</SelectItem>
                          <SelectItem value="CH">Switzerland</SelectItem>
                          <SelectItem value="AT">Austria</SelectItem>
                          <SelectItem value="SE">Sweden</SelectItem>
                          <SelectItem value="NO">Norway</SelectItem>
                          <SelectItem value="DK">Denmark</SelectItem>
                          <SelectItem value="FI">Finland</SelectItem>
                          <SelectItem value="PL">Poland</SelectItem>
                          <SelectItem value="BR">Brazil</SelectItem>
                          <SelectItem value="AR">Argentina</SelectItem>
                          <SelectItem value="CL">Chile</SelectItem>
                          <SelectItem value="CO">Colombia</SelectItem>
                          <SelectItem value="JP">Japan</SelectItem>
                          <SelectItem value="CN">China</SelectItem>
                          <SelectItem value="IN">India</SelectItem>
                          <SelectItem value="KR">South Korea</SelectItem>
                          <SelectItem value="SG">Singapore</SelectItem>
                          <SelectItem value="NZ">New Zealand</SelectItem>
                          <SelectItem value="ZA">South Africa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website_url">Website URL</Label>
                      <Input
                        id="website_url"
                        type="url"
                        value={orgFormData.website_url || ""}
                        onChange={(e) => setOrgFormData({ ...orgFormData, website_url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logo_url">Logo URL</Label>
                      <Input
                        id="logo_url"
                        type="url"
                        value={orgFormData.logo_url || ""}
                        onChange={(e) => setOrgFormData({ ...orgFormData, logo_url: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_id">Tax ID / EIN</Label>
                    <Input
                      id="tax_id"
                      value={orgFormData.tax_id || ""}
                      onChange={(e) => setOrgFormData({ ...orgFormData, tax_id: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Federal Tax ID or Employer Identification Number (EIN)
                    </p>
                  </div>

                  {/* Business Hours */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <Label>Business Hours</Label>
                    </div>
                    <div className="space-y-3 border rounded-lg p-4">
                      {(() => {
                        // Normalize business hours once for all days
                        const normalizedHours = normalizeBusinessHours(orgFormData.business_hours || {});
                        return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                          const dayHours = normalizedHours[day] || { open: '09:00', close: '17:00', closed: false };
                        return (
                          <div key={day} className="flex items-center gap-3">
                            <div className="w-24">
                              <Label className="capitalize text-sm font-normal">{day}</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={!dayHours.closed}
                                onCheckedChange={(checked) => updateBusinessHours(day, 'closed', !checked)}
                              />
                              {!dayHours.closed ? (
                                <>
                                  <Input
                                    type="time"
                                    value={dayHours.open}
                                    onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                                    className="w-32"
                                  />
                                  <span className="text-muted-foreground">to</span>
                                  <Input
                                    type="time"
                                    value={dayHours.close}
                                    onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                                    className="w-32"
                                  />
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">Closed</span>
                              )}
                            </div>
                          </div>
                        );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Sales Territory States */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4" />
                      <Label>Sales Territory States</Label>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter the two-letter state codes where your organization operates
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={territoryStateInput}
                        onChange={(e) => setTerritoryStateInput(e.target.value.toUpperCase())}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTerritoryState();
                          }
                        }}
                        maxLength={2}
                        className="uppercase"
                      />
                      <Button type="button" onClick={addTerritoryState} variant="outline">
                        Add
                      </Button>
                    </div>
                    {(orgFormData.sales_territory_states || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(orgFormData.sales_territory_states || []).map((state, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {state}
                            <button
                              type="button"
                              onClick={() => removeTerritoryState(index)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={orgFormData.status || ""}
                        onValueChange={(value: any) => setOrgFormData({ ...orgFormData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending_verification">Pending Verification</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subscription_tier">Subscription Tier</Label>
                      <Select
                        value={orgFormData.subscription_tier || ""}
                        onValueChange={(value: any) => setOrgFormData({ ...orgFormData, subscription_tier: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

                    {/* Dealer Capabilities Tab */}
                    {activeTab === "capabilities" && (
              <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Dealer Capabilities
                          </CardTitle>
                          <CardDescription>
                            Configure your dealership's services, capabilities, and business information
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {!isDealerOrgType && (
                            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md text-sm text-yellow-900 dark:text-yellow-100">
                              <p className="font-medium mb-1">Dealer/Seller Organization Type Required</p>
                              <p className="text-xs">Please select "Dealer" or "Seller" as your organization type in the Organization section to access dealer capabilities.</p>
                            </div>
                          )}
                          {!profileData?.dealer && isDealerOrgType && (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-md text-sm text-blue-900 dark:text-blue-100">
                      <p className="font-medium mb-1">No dealer record found</p>
                      <p className="text-xs">Your organization type requires a dealer record. Fill out the form below and save to create one.</p>
                    </div>
                  )}

                          {/* Basic Dealership Information */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4" />
                              <Label className="text-base font-semibold">Basic Information</Label>
                            </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business_type">Business Type</Label>
                      <Select
                        value={dealerFormData.business_type || ""}
                        onValueChange={(value: any) => setDealerFormData({ ...dealerFormData, business_type: value })}
                      >
                        <SelectTrigger>
                                    <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="franchise_dealer">Franchise Dealer</SelectItem>
                          <SelectItem value="independent_dealer">Independent Dealer</SelectItem>
                          <SelectItem value="fleet_remarketer">Fleet Remarketer</SelectItem>
                          <SelectItem value="broker">Broker</SelectItem>
                          <SelectItem value="leasing_company">Leasing Company</SelectItem>
                          <SelectItem value="rental_company">Rental Company</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dealer_license_number">Dealer License Number</Label>
                      <Input
                        id="dealer_license_number"
                        value={dealerFormData.dealer_license_number || ""}
                        onChange={(e) => setDealerFormData({ ...dealerFormData, dealer_license_number: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dealer_license_state">Dealer License State</Label>
                      <Input
                        id="dealer_license_state"
                        value={dealerFormData.dealer_license_state || ""}
                                  onChange={(e) => setDealerFormData({ ...dealerFormData, dealer_license_state: e.target.value.toUpperCase() })}
                        maxLength={2}
                                  placeholder="CA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dealer_license_expires_at">License Expires</Label>
                      <Input
                        id="dealer_license_expires_at"
                        type="date"
                        value={dealerFormData.dealer_license_expires_at || ""}
                        onChange={(e) => setDealerFormData({ ...dealerFormData, dealer_license_expires_at: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dealer_tax_id">Tax ID / EIN</Label>
                      <Input
                        id="dealer_tax_id"
                        value={dealerFormData.tax_id || ""}
                        onChange={(e) => setDealerFormData({ ...dealerFormData, tax_id: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duns_number">DUNS Number</Label>
                      <Input
                        id="duns_number"
                        value={dealerFormData.duns_number || ""}
                        onChange={(e) => setDealerFormData({ ...dealerFormData, duns_number: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="average_inventory_count">Average Inventory Count</Label>
                      <Input
                        id="average_inventory_count"
                        type="number"
                        value={dealerFormData.average_inventory_count || ""}
                        onChange={(e) => setDealerFormData({ ...dealerFormData, average_inventory_count: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lot_capacity">Lot Capacity</Label>
                      <Input
                        id="lot_capacity"
                        type="number"
                        value={dealerFormData.lot_capacity || ""}
                        onChange={(e) => setDealerFormData({ ...dealerFormData, lot_capacity: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                              </div>
                    </div>
                  </div>

                          <Separator />

                          {/* Specializations and Makes */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              <Label className="text-base font-semibold">Specializations & Makes</Label>
                            </div>
                  <div className="space-y-2">
                    <Label>Specializations</Label>
                    <div className="flex gap-2">
                      <Input
                        value={specializationInput}
                        onChange={(e) => setSpecializationInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSpecialization();
                          }
                        }}
                                  placeholder="Add specialization"
                      />
                      <Button type="button" onClick={addSpecialization} variant="outline">
                        Add
                      </Button>
                    </div>
                    {(dealerFormData.specializations || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(dealerFormData.specializations || []).map((spec, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {spec}
                            <button
                              type="button"
                              onClick={() => removeSpecialization(index)}
                              className="ml-1 hover:text-destructive"
                            >
                                        <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Makes Carried</Label>
                    <div className="flex gap-2">
                      <Input
                        value={makesInput}
                        onChange={(e) => setMakesInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addMake();
                          }
                        }}
                                  placeholder="Add make"
                      />
                      <Button type="button" onClick={addMake} variant="outline">
                        Add
                      </Button>
                    </div>
                    {(dealerFormData.makes_carried || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(dealerFormData.makes_carried || []).map((make, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {make}
                            <button
                              type="button"
                              onClick={() => removeMake(index)}
                              className="ml-1 hover:text-destructive"
                            >
                                        <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                            </div>
                  </div>

                          <Separator />

                          {/* Sales Capabilities */}
                  <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4" />
                              <Label className="text-base font-semibold">Sales Capabilities</Label>
                            </div>
                            <div className="space-y-3">
                    {[
                      { key: 'can_special_order', label: 'Can Special Order', desc: 'Can you place special orders for customers?' },
                      { key: 'accepts_trade_ins', label: 'Accepts Trade-Ins', desc: 'Do you accept trade-in vehicles?' },
                      { key: 'accepts_fleet_inquiries', label: 'Accepts Fleet Inquiries', desc: 'Do you accept fleet sales inquiries?' },
                      { key: 'allow_price_negotiations', label: 'Allow Price Negotiations', desc: 'Allow customers to negotiate prices?' },
                    ].map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                  <div className="space-y-0.5 flex-1">
                                    <Label htmlFor={key} className="text-base">{label}</Label>
                          <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                          id={key}
                          checked={dealerFormData[key as keyof typeof dealerFormData] as boolean || false}
                        onCheckedChange={(checked) =>
                            setDealerFormData({ ...dealerFormData, [key]: checked })
                        }
                      />
                    </div>
                    ))}
                            </div>
                  </div>

                          <Separator />

                          {/* Service Capabilities */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              <Label className="text-base font-semibold">Service Capabilities</Label>
                            </div>
                            <div className="space-y-3">
                              {[
                                { key: 'has_service_department', label: 'Service Department', desc: 'Does your dealership have a service department?' },
                                { key: 'has_parts_department', label: 'Parts Department', desc: 'Does your dealership have a parts department?' },
                                { key: 'has_body_shop', label: 'Body Shop', desc: 'Does your dealership have a body shop?' },
                                { key: 'can_install_upfits', label: 'Can Install Upfits', desc: 'Can your dealership install upfitting equipment?' },
                              ].map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                  <div className="space-y-0.5 flex-1">
                                    <Label htmlFor={key} className="text-base">{label}</Label>
                                    <p className="text-sm text-muted-foreground">{desc}</p>
                                  </div>
                                  <Switch
                                    id={key}
                                    checked={dealerFormData[key as keyof typeof dealerFormData] as boolean || false}
                                    onCheckedChange={(checked) =>
                                      setDealerFormData({ ...dealerFormData, [key]: checked })
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          {/* Delivery Capabilities */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              <Label className="text-base font-semibold">Delivery Capabilities</Label>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                              <div className="space-y-0.5 flex-1">
                                <Label htmlFor="delivery_available" className="text-base">Delivery Available</Label>
                                <p className="text-sm text-muted-foreground">Do you offer vehicle delivery service?</p>
                              </div>
                              <Switch
                                id="delivery_available"
                                checked={dealerFormData.delivery_available || false}
                                onCheckedChange={(checked) => setDealerFormData({ ...dealerFormData, delivery_available: checked })}
                              />
                            </div>
                            {dealerFormData.delivery_available && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-4 border-l-2">
                    <div className="space-y-2">
                      <Label htmlFor="typical_delivery_days">Typical Delivery Days</Label>
                      <Input
                        id="typical_delivery_days"
                        type="number"
                        value={dealerFormData.typical_delivery_days || ""}
                        onChange={(e) => setDealerFormData({ ...dealerFormData, typical_delivery_days: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delivery_radius_miles">Delivery Radius (miles)</Label>
                      <Input
                        id="delivery_radius_miles"
                        type="number"
                        value={dealerFormData.delivery_radius_miles || ""}
                        onChange={(e) => setDealerFormData({ ...dealerFormData, delivery_radius_miles: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delivery_fee">Delivery Fee ($)</Label>
                      <Input
                        id="delivery_fee"
                        type="number"
                        step="0.01"
                        value={dealerFormData.delivery_fee || ""}
                        onChange={(e) => setDealerFormData({ ...dealerFormData, delivery_fee: e.target.value ? parseFloat(e.target.value) : undefined })}
                      />
                    </div>
                              </div>
                            )}
                  </div>

                          <Separator />

                          {/* Fleet Capabilities */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              <Label className="text-base font-semibold">Fleet Capabilities</Label>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                <div className="space-y-0.5 flex-1">
                                  <Label htmlFor="accepts_fleet_inquiries" className="text-base">Accepts Fleet Inquiries</Label>
                                  <p className="text-sm text-muted-foreground">Do you accept fleet sales inquiries?</p>
                                </div>
                                <Switch
                                  id="accepts_fleet_inquiries"
                                  checked={dealerFormData.accepts_fleet_inquiries || false}
                                  onCheckedChange={(checked) => setDealerFormData({ ...dealerFormData, accepts_fleet_inquiries: checked })}
                                />
                              </div>
                              {dealerFormData.accepts_fleet_inquiries && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2">
                    <div className="space-y-2">
                      <Label htmlFor="minimum_fleet_size">Minimum Fleet Size</Label>
                      <Input
                        id="minimum_fleet_size"
                        type="number"
                        value={dealerFormData.minimum_fleet_size || ""}
                        onChange={(e) => setDealerFormData({ ...dealerFormData, minimum_fleet_size: e.target.value ? parseInt(e.target.value) : undefined })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fleet_discount_percentage">Fleet Discount (%)</Label>
                      <Input
                        id="fleet_discount_percentage"
                        type="number"
                        step="0.01"
                        value={dealerFormData.fleet_discount_percentage || ""}
                        onChange={(e) => setDealerFormData({ ...dealerFormData, fleet_discount_percentage: e.target.value ? parseFloat(e.target.value) : undefined })}
                      />
                                  </div>
                                </div>
                              )}
                    </div>
                  </div>

                          <Separator />

                          {/* Communication Preferences */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Bell className="h-4 w-4" />
                              <Label className="text-base font-semibold">Communication Preferences</Label>
                            </div>
                            <div className="space-y-3">
                              {[
                                { key: 'auto_respond_inquiries', label: 'Auto-Respond to Inquiries', desc: 'Automatically respond to customer inquiries?' },
                                { key: 'inquiry_email_notification', label: 'Email Notifications', desc: 'Receive email notifications for inquiries?' },
                                { key: 'weekly_performance_report', label: 'Weekly Performance Report', desc: 'Receive weekly performance reports?' },
                              ].map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                  <div className="space-y-0.5 flex-1">
                                    <Label htmlFor={key} className="text-base">{label}</Label>
                                    <p className="text-sm text-muted-foreground">{desc}</p>
                                  </div>
                                  <Switch
                                    id={key}
                                    checked={dealerFormData[key as keyof typeof dealerFormData] as boolean || false}
                                    onCheckedChange={(checked) =>
                                      setDealerFormData({ ...dealerFormData, [key]: checked })
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                  </div>

                          <Separator />

                          {/* Certifications & Awards */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              <Label className="text-base font-semibold">Certifications & Awards</Label>
                            </div>
                  <div className="space-y-2">
                    <Label>Certifications</Label>
                    <div className="flex gap-2">
                      <Input
                        value={certificationInput}
                        onChange={(e) => setCertificationInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCertification();
                          }
                        }}
                                  placeholder="Add certification"
                      />
                      <Button type="button" onClick={addCertification} variant="outline">
                        Add
                      </Button>
                    </div>
                    {(dealerFormData.certifications || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(dealerFormData.certifications || []).map((cert, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {cert}
                            <button
                              type="button"
                              onClick={() => removeCertification(index)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Awards</Label>
                    <div className="flex gap-2">
                      <Input
                        value={awardInput}
                        onChange={(e) => setAwardInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addAward();
                          }
                        }}
                                  placeholder="Add award"
                      />
                      <Button type="button" onClick={addAward} variant="outline">
                        Add
                      </Button>
                    </div>
                    {(dealerFormData.awards || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(dealerFormData.awards || []).map((award, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {award}
                            <button
                              type="button"
                              onClick={() => removeAward(index)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                    </div>

                          <Separator />

                          {/* Promotions */}
                      <div className="space-y-2">
                            <Label htmlFor="current_promotions">Current Promotions</Label>
                            <Textarea
                              id="current_promotions"
                              value={dealerFormData.current_promotions || ""}
                              onChange={(e) => setDealerFormData({ ...dealerFormData, current_promotions: e.target.value })}
                              rows={4}
                              placeholder="Describe any current promotions or special offers..."
                        />
                      </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* OEM Dealer Codes Tab */}
                    {activeTab === "dealer-codes" && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            OEM Dealer Codes
                          </CardTitle>
                          <CardDescription>
                            Manage dealer codes for each OEM/make you represent
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {!isDealerOrgType && (
                            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md text-sm text-yellow-900 dark:text-yellow-100">
                              <p className="font-medium mb-1">Dealer/Seller Organization Type Required</p>
                              <p className="text-xs">Please select "Dealer" or "Seller" as your organization type in the Organization section to manage OEM dealer codes.</p>
                            </div>
                          )}
                          {!profileData?.dealer?.id && isDealerOrgType ? (
                            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-md text-sm text-blue-900 dark:text-blue-100">
                              <p className="font-medium mb-1">Dealer profile required</p>
                              <p className="text-xs">Please complete your basic dealership information in the Dealer Capabilities section first.</p>
                            </div>
                          ) : !makesData && isDealerOrgType ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                <p className="text-muted-foreground">Loading makes...</p>
                              </div>
                            </div>
                          ) : profileData?.dealer?.id && makesData ? (
                            <DealerCodesManager
                              dealerId={profileData.dealer.id}
                              organizationId={profileData.organization?.id || 0}
                              dealerCodes={profileData.dealerCodes || []}
                              makes={makesData || []}
                              makesCarried={dealerFormData.makes_carried || profileData.dealer?.makes_carried}
                              onUpdate={refetchProfile}
                              upsertMutation={upsertDealerCodeMutation}
                              deleteMutation={deleteDealerCodeMutation}
                            />
                          ) : null}
                        </CardContent>
                      </Card>
                    )}

                    {/* Locations Tab */}
                    {activeTab === "locations" && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Dealer Locations
                          </CardTitle>
                          <CardDescription>
                            Manage multiple locations for your dealership
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {!profileData?.dealer?.id && isDealerOrgType ? (
                            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-md text-sm text-blue-900 dark:text-blue-100">
                              <p className="font-medium mb-1">Dealer profile required</p>
                              <p className="text-xs">Please complete your basic dealership information in the Dealer Capabilities section first.</p>
                            </div>
                          ) : profileData?.dealer?.id ? (
                            <DealerLocationsManager
                              ref={dealerLocationsManagerRef}
                              dealerId={profileData.dealer.id}
                              organizationId={profileData.organization?.id || 0}
                              dealerLocations={profileData.dealerLocations || []}
                              onUpdate={refetchProfile}
                              upsertMutation={upsertDealerLocationMutation}
                              deleteMutation={deleteDealerLocationMutation}
                            />
                          ) : (
                            <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-4 rounded-md text-sm text-gray-900 dark:text-gray-100">
                              <p className="font-medium mb-1">Locations feature</p>
                              <p className="text-xs">Location management will be available for your organization type in a future update.</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Fleet & Government Tab */}
                    {activeTab === "fleet-government" && showDealerSection && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            Fleet & Government Programs
                          </CardTitle>
                          <CardDescription>
                            Configure your fleet and government program participation
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {!profileData?.dealer && (
                            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-md text-sm text-blue-900 dark:text-blue-100">
                              <p className="font-medium mb-1">No dealer record found</p>
                              <p className="text-xs">Your organization type requires a dealer record. Fill out the form below and save to create one.</p>
                      </div>
                          )}

                          {/* Ordering Capabilities */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              <Label className="text-base font-semibold">Ordering Capabilities</Label>
                            </div>
                            <div className="space-y-3">
                              {[
                                { key: 'can_order_fleet', label: 'Can Order Fleet Vehicles', desc: 'Can you order fleet vehicles from OEMs?' },
                                { key: 'can_order_government', label: 'Can Order Government Vehicles', desc: 'Can you order government vehicles?' },
                                { key: 'uses_b4a', label: 'Uses B4A Program', desc: 'Do you participate in the B4A (Buy 4 America) program?' },
                              ].map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                  <div className="space-y-0.5 flex-1">
                                    <Label htmlFor={key} className="text-base">{label}</Label>
                                    <p className="text-sm text-muted-foreground">{desc}</p>
                                  </div>
                                  <Switch
                                    id={key}
                                    checked={dealerFormData[key as keyof typeof dealerFormData] as boolean || false}
                                    onCheckedChange={(checked) =>
                                      setDealerFormData({ ...dealerFormData, [key]: checked })
                                    }
                                  />
                                </div>
                              ))}
                    </div>
                  </div>

                          <Separator />

                          {/* B4A Program */}
                          {dealerFormData.uses_b4a && (
                            <>
                              <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                                  <Label className="text-base font-semibold">B4A Program Details</Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="b4a_account_number">B4A Account Number</Label>
                        <Input
                          id="b4a_account_number"
                          value={dealerFormData.b4a_account_number || ""}
                          onChange={(e) => setDealerFormData({ ...dealerFormData, b4a_account_number: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="b4a_enrollment_date">B4A Enrollment Date</Label>
                        <Input
                          id="b4a_enrollment_date"
                          type="date"
                          value={dealerFormData.b4a_enrollment_date || ""}
                          onChange={(e) => setDealerFormData({ ...dealerFormData, b4a_enrollment_date: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                              <Separator />
                            </>
                          )}

                  {/* Fleet & Government Programs */}
                          <div className="space-y-4">
                    <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <Label className="text-base font-semibold">Government Registration</Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fein_number">FEIN Number</Label>
                        <Input
                          id="fein_number"
                          value={dealerFormData.fein_number || ""}
                          onChange={(e) => setDealerFormData({ ...dealerFormData, fein_number: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cage_code">CAGE Code</Label>
                        <Input
                          id="cage_code"
                          value={dealerFormData.cage_code || ""}
                          onChange={(e) => setDealerFormData({ ...dealerFormData, cage_code: e.target.value })}
                          maxLength={10}
                        />
                      </div>
                    </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                              <div className="space-y-0.5 flex-1">
                                <Label htmlFor="sam_registration" className="text-base">SAM Registration</Label>
                          <p className="text-sm text-muted-foreground">Registered in System for Award Management</p>
                        </div>
                        <Switch
                          id="sam_registration"
                          checked={dealerFormData.sam_registration || false}
                          onCheckedChange={(checked) => setDealerFormData({ ...dealerFormData, sam_registration: checked })}
                        />
                      </div>
                            {dealerFormData.sam_registration && (
                              <div className="space-y-2 pl-4 border-l-2">
                        <Label htmlFor="sam_expiration_date">SAM Expiration Date</Label>
                        <Input
                          id="sam_expiration_date"
                          type="date"
                          value={dealerFormData.sam_expiration_date || ""}
                          onChange={(e) => setDealerFormData({ ...dealerFormData, sam_expiration_date: e.target.value })}
                        />
                      </div>
                            )}
                  </div>

                          <Separator />

                  {/* OEM Program Certifications */}
                          <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <Label className="text-base font-semibold">OEM Program Certifications</Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                <div className="space-y-0.5 flex-1">
                                  <Label htmlFor="ford_pro_elite" className="text-base">Ford Pro Elite</Label>
                          <p className="text-sm text-muted-foreground">Ford Pro Elite certification</p>
                        </div>
                        <Switch
                          id="ford_pro_elite"
                          checked={dealerFormData.ford_pro_elite || false}
                          onCheckedChange={(checked) => setDealerFormData({ ...dealerFormData, ford_pro_elite: checked })}
                        />
                      </div>
                              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                <div className="space-y-0.5 flex-1">
                                  <Label htmlFor="gm_fleet_certified" className="text-base">GM Fleet Certified</Label>
                          <p className="text-sm text-muted-foreground">GM Fleet certification</p>
                        </div>
                        <Switch
                          id="gm_fleet_certified"
                          checked={dealerFormData.gm_fleet_certified || false}
                          onCheckedChange={(checked) => setDealerFormData({ ...dealerFormData, gm_fleet_certified: checked })}
                        />
                      </div>
                              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                <div className="space-y-0.5 flex-1">
                                  <Label htmlFor="ram_commercial_certified" className="text-base">RAM Commercial Certified</Label>
                          <p className="text-sm text-muted-foreground">RAM Commercial certification</p>
                        </div>
                        <Switch
                          id="ram_commercial_certified"
                          checked={dealerFormData.ram_commercial_certified || false}
                          onCheckedChange={(checked) => setDealerFormData({ ...dealerFormData, ram_commercial_certified: checked })}
                        />
                      </div>
                    </div>
                  </div>

                          <Separator />

                          {/* Floor Plan */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              <Label className="text-base font-semibold">Floor Plan</Label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="floor_plan_company">Floor Plan Company</Label>
                                <Input
                                  id="floor_plan_company"
                                  value={dealerFormData.floor_plan_company || ""}
                                  onChange={(e) => setDealerFormData({ ...dealerFormData, floor_plan_company: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="floor_plan_account">Floor Plan Account</Label>
                                <Input
                                  id="floor_plan_account"
                                  value={dealerFormData.floor_plan_account || ""}
                                  onChange={(e) => setDealerFormData({ ...dealerFormData, floor_plan_account: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="floor_plan_limit">Floor Plan Limit ($)</Label>
                                <Input
                                  id="floor_plan_limit"
                                  type="number"
                                  step="0.01"
                                  value={dealerFormData.floor_plan_limit || ""}
                                  onChange={(e) => setDealerFormData({ ...dealerFormData, floor_plan_limit: e.target.value ? parseFloat(e.target.value) : undefined })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="typical_days_to_floor">Typical Days to Floor</Label>
                                <Input
                                  id="typical_days_to_floor"
                                  type="number"
                                  value={dealerFormData.typical_days_to_floor || ""}
                                  onChange={(e) => setDealerFormData({ ...dealerFormData, typical_days_to_floor: e.target.value ? parseInt(e.target.value) : undefined })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="average_turn_days">Average Turn Days</Label>
                                <Input
                                  id="average_turn_days"
                                  type="number"
                                  value={dealerFormData.average_turn_days || ""}
                                  onChange={(e) => setDealerFormData({ ...dealerFormData, average_turn_days: e.target.value ? parseInt(e.target.value) : undefined })}
                                />
                              </div>
                            </div>
                          </div>

                          <Separator />

                  {/* Upfitter Relationships */}
                          <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <Label className="text-base font-semibold">Upfitter Relationships</Label>
                    </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                              <div className="space-y-0.5 flex-1">
                                <Label htmlFor="upfit_delivery_coordination" className="text-base">Upfit Delivery Coordination</Label>
                        <p className="text-sm text-muted-foreground">Coordinate delivery with upfitters</p>
                      </div>
                      <Switch
                        id="upfit_delivery_coordination"
                        checked={dealerFormData.upfit_delivery_coordination || false}
                        onCheckedChange={(checked) => setDealerFormData({ ...dealerFormData, upfit_delivery_coordination: checked })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preferred_upfitter_ids">Preferred Upfitter IDs</Label>
                      <Input
                        id="preferred_upfitter_ids"
                        placeholder="Enter upfitter IDs separated by commas (e.g., 1, 2, 3)"
                        value={dealerFormData.preferred_upfitter_ids?.join(', ') || ""}
                        onChange={(e) => {
                          const ids = e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                          setDealerFormData({ ...dealerFormData, preferred_upfitter_ids: ids });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter comma-separated upfitter IDs
                      </p>
                    </div>
                  </div>

                          <Separator />

                  {/* Primary Contact */}
                          <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <Label className="text-base font-semibold">Primary Contact</Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primary_contact_name">Contact Name</Label>
                        <Input
                          id="primary_contact_name"
                          value={dealerFormData.primary_contact_name || ""}
                          onChange={(e) => setDealerFormData({ ...dealerFormData, primary_contact_name: e.target.value })}
                          maxLength={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="primary_contact_title">Contact Title</Label>
                        <Input
                          id="primary_contact_title"
                          value={dealerFormData.primary_contact_title || ""}
                          onChange={(e) => setDealerFormData({ ...dealerFormData, primary_contact_title: e.target.value })}
                          maxLength={100}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primary_contact_phone">Contact Phone</Label>
                        <Input
                          id="primary_contact_phone"
                          value={dealerFormData.primary_contact_phone || ""}
                          onChange={(e) => setDealerFormData({ ...dealerFormData, primary_contact_phone: e.target.value })}
                          maxLength={50}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="primary_contact_email">Contact Email</Label>
                        <Input
                          id="primary_contact_email"
                          type="email"
                          value={dealerFormData.primary_contact_email || ""}
                          onChange={(e) => setDealerFormData({ ...dealerFormData, primary_contact_email: e.target.value })}
                          maxLength={255}
                        />
                      </div>
                    </div>
                  </div>

                          <Separator />

                  {/* DMS Integration */}
                          <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <Label className="text-base font-semibold">DMS Integration</Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dms_provider">DMS Provider</Label>
                        <Select
                          value={dealerFormData.dms_provider || ""}
                          onValueChange={(value) => setDealerFormData({ ...dealerFormData, dms_provider: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select DMS Provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cdk">CDK</SelectItem>
                            <SelectItem value="reynolds">Reynolds & Reynolds</SelectItem>
                            <SelectItem value="dealertrack">DealerTrack</SelectItem>
                            <SelectItem value="autosoft">AutoSoft</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dms_dealer_id">DMS Dealer ID</Label>
                        <Input
                          id="dms_dealer_id"
                          value={dealerFormData.dms_dealer_id || ""}
                          onChange={(e) => setDealerFormData({ ...dealerFormData, dms_dealer_id: e.target.value })}
                          maxLength={50}
                        />
                      </div>
                    </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                              <div className="space-y-0.5 flex-1">
                                <Label htmlFor="dms_sync_enabled" className="text-base">DMS Sync Enabled</Label>
                                <p className="text-sm text-muted-foreground">Enable automatic synchronization with your DMS</p>
                  </div>
                              <Switch
                                id="dms_sync_enabled"
                                checked={dealerFormData.dms_sync_enabled || false}
                                onCheckedChange={(checked) => setDealerFormData({ ...dealerFormData, dms_sync_enabled: checked })}
                      />
                    </div>
                        </div>
                </CardContent>
              </Card>
            )}

            {/* Notification Preferences */}
                    {activeTab === "notifications" && personalFormData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                          <CardDescription>
                            Manage how you receive notifications and updates
                          </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about your account activity
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                      checked={personalFormData.emailNotifications}
                              onCheckedChange={(checked) => setPersonalFormData({ ...personalFormData, emailNotifications: checked })}
                  />
                </div>
              </CardContent>
            </Card>
            )}

            {/* Account Information */}
                    {activeTab === "account" && profileData && (
            <Card>
              <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Account Information
                          </CardTitle>
                          <CardDescription>
                            View your account details and status
                          </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Account Type:</span>
                    <span className="font-medium capitalize">{profileData.account.role || "User"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Member Since:</span>
                  <span className="font-medium">
                      {profileData.account.memberSince ? new Date(profileData.account.memberSince).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Sign In:</span>
                  <span className="font-medium">
                      {profileData.personal.lastSignInAt ? new Date(profileData.personal.lastSignInAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                  {profileData.organization && (
                    <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Organization:</span>
                        <span className="font-medium">{profileData.organization.organization_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Verification Status:</span>
                    <span className="font-medium flex items-center gap-1">
                          {profileData.organization.is_verified ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Verified
                        </>
                      ) : (
                        "Not Verified"
                      )}
                    </span>
                  </div>
                    </>
                )}
              </CardContent>
            </Card>
            )}

                    {/* Listing Capability Status - Show in Account tab */}
                    {activeTab === "account" && profileData?.organization && (
                      <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Vehicle Listing Capability
                  </CardTitle>
                  <CardDescription>
                    Status of your ability to create and manage vehicle listings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const orgType = orgTypesData?.find((t: OrganizationType) => t.id === profileData.organization?.organization_type_id);
                    const canListVehicles = orgType?.can_list_vehicles || false;
                    const hasDealer = !!profileData.dealer?.id;
                    const hasOrg = !!profileData.organization?.id;
                    const canCreate = canCreateListings === true;
                    
                    if (canCreate && hasDealer && hasOrg) {
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">You can create vehicle listings!</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Your dealership account is fully set up. You can now create and manage vehicle listings.
                          </p>
                          <Button
                            type="button"
                            onClick={() => {
                              setLocation('/dealer/listings/new');
                            }}
                            className="w-full sm:w-auto"
                          >
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Create Your First Listing
                          </Button>
                        </div>
                      );
                    } else if (hasOrg && !canListVehicles) {
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-medium">Organization type does not allow listings</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Your organization type ({orgType?.display_name || 'Unknown'}) does not have permission to create vehicle listings. 
                            Please contact support if you need to change your organization type.
                          </p>
                        </div>
                      );
                    } else if (hasOrg && canListVehicles && !hasDealer) {
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-medium">Dealer profile incomplete</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Your organization type allows vehicle listings, but you need to complete your dealer profile below. 
                            Once you save your dealer information, you'll be able to create listings.
                          </p>
                        </div>
                      );
                    } else if (hasOrg && canListVehicles && hasDealer && canCreateListings === false) {
                      // Check what's missing - specific fields
                      const missingFields: string[] = [];
                      const org = profileData.organization;
                      const dealer = profileData.dealer;
                      
                      // Check organization status
                      if (org?.status !== 'active') {
                        missingFields.push(`Organization status must be "active" (currently: "${org?.status || 'unknown'}")`);
                      }
                      
                      // Check organization required fields
                      const orgMissingFields: string[] = [];
                      if (!org?.organization_name) orgMissingFields.push('Organization Name');
                      if (!org?.organization_type_id) orgMissingFields.push('Organization Type');
                      if (!org?.primary_email) orgMissingFields.push('Primary Email');
                      if (!org?.address_line1) orgMissingFields.push('Address Line 1');
                      if (!org?.city) orgMissingFields.push('City');
                      
                      if (orgMissingFields.length > 0) {
                        missingFields.push(`Organization missing: ${orgMissingFields.join(', ')}`);
                      }
                      
                      // Check dealer required fields
                      const dealerMissingFields: string[] = [];
                      if (!dealer?.business_type) dealerMissingFields.push('Business Type');
                      if (!dealer?.dealer_license_number) dealerMissingFields.push('Dealer License Number');
                      if (!profileData.dealerCodes || profileData.dealerCodes.length === 0) {
                        dealerMissingFields.push('At least one OEM Dealer Code');
                      }
                      if (!profileData.dealerLocations || profileData.dealerLocations.length === 0) {
                        dealerMissingFields.push('At least one Dealer Location');
                      }
                      
                      if (dealerMissingFields.length > 0) {
                        missingFields.push(`Dealer profile missing: ${dealerMissingFields.join(', ')}`);
                      }
                      
                      // Check organization completion percentage
                      const orgCompletion = (org as any)?.profile_completion_percentage;
                      if (orgCompletion !== null && orgCompletion !== undefined && orgCompletion < 50) {
                        missingFields.push(`Organization profile is only ${orgCompletion}% complete (minimum 50% required)`);
                      }
                      
                      // Check dealer completion percentage
                      const dealerCompletion = (dealer as any)?.profile_completion_percentage;
                      if (dealerCompletion !== null && dealerCompletion !== undefined && dealerCompletion < 50) {
                        missingFields.push(`Dealer profile is only ${dealerCompletion}% complete (minimum 50% required)`);
                      }
                      
                      // Check user role
                      const userRole = profileData.account?.role;
                      if (userRole === 'viewer') {
                        missingFields.push('Your role is "viewer" which cannot create listings. Contact your organization administrator to change your role.');
                      }
                      
                      // If no specific issues found, show generic message
                      if (missingFields.length === 0) {
                        missingFields.push('Your profile may need additional verification. Please ensure all required fields are completed.');
                      }
                      
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-medium">Listing capability pending verification</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Your dealer profile is set up, but your listing capability may need verification. 
                            Please address the following:
                          </p>
                          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                            {missingFields.map((field, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-amber-600 mt-0.5">•</span>
                                <span>{field}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-xs text-muted-foreground">
                              <strong>Tip:</strong> Complete your profile sections above to increase your profile completion percentage. 
                              Required sections include Organization, Dealer Capabilities, and at least one Dealer Location.
                            </p>
                          </div>
                        </div>
                      );
                    } else if (!hasOrg) {
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-medium">Organization required</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            You need to create an organization above before you can create vehicle listings.
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-5 w-5" />
                            <span className="font-medium">Checking listing capability...</span>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </CardContent>
              </Card>
            )}

          </form>
        </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      <Footer />
    </div>
    </SidebarProvider>
  );
}
