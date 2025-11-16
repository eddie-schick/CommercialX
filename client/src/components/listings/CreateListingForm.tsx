"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Import the schema type - we'll define it locally for now
const listingSchema = z.object({
  listingType: z.enum(["stock_unit", "build_to_order"]),
  vin: z.string().length(17).regex(/^[A-HJ-NPR-Z0-9]{17}$/),
  year: z.number().int().min(2000).max(new Date().getFullYear() + 1),
  make: z.string().min(1),
  model: z.string().min(1),
  series: z.string().optional(),
  bodyStyle: z.string().optional(),
  fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid", "cng", "propane"]),
  wheelbase: z.number().positive().optional(),
  gvwr: z.number().positive().optional(),
  payload: z.number().positive().optional(),
  engineDescription: z.string().optional(),
  transmission: z.string().optional(),
  driveType: z.enum(["RWD", "AWD", "4WD", "FWD"]).optional(),
  hasEquipment: z.boolean(),
  equipmentManufacturer: z.string().optional(),
  equipmentProductLine: z.string().optional(),
  equipmentType: z.string().optional(),
  equipmentLength: z.number().positive().optional(),
  equipmentWeight: z.number().positive().optional(),
  askingPrice: z.number().positive(),
  specialPrice: z.number().positive().optional(),
  stockNumber: z.string().optional(),
  condition: z.enum(["new", "used", "certified_pre_owned", "demo"]),
  mileage: z.number().nonnegative().optional(),
  exteriorColor: z.string().optional(),
  interiorColor: z.string().optional(),
  description: z.string().optional(),
  locationCity: z.string().optional(),
  locationState: z.string().optional(),
  photos: z.array(z.string().url()).optional(),
}).refine(
  (data) => {
    if (data.condition === "used" || data.condition === "certified_pre_owned") {
      return data.mileage !== undefined && data.mileage !== null;
    }
    return true;
  },
  { message: "Mileage is required for used vehicles", path: ["mileage"] }
).refine(
  (data) => {
    if (data.hasEquipment) {
      return data.equipmentManufacturer && data.equipmentManufacturer.length > 0;
    }
    return true;
  },
  { message: "Equipment manufacturer is required when equipment is installed", path: ["equipmentManufacturer"] }
);

type ListingFormData = z.infer<typeof listingSchema>;
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { VINInput } from "@/components/ui/VINInput";
import { SmartCombobox } from "@/components/ui/SmartCombobox";
import { ImageUploadZone } from "@/components/ui/ImageUploadZone";
import { VehicleDataPreview } from "@/components/listings/VehicleDataPreview";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, CheckCircle2, Sparkles, Info, AlertCircle, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const STEPS = [
  { id: 0, title: "Listing Type" },
  { id: 1, title: "Vehicle Information" },
  { id: 2, title: "Equipment Information" },
  { id: 3, title: "Pricing & Details" },
  { id: 4, title: "Photos" },
  { id: 5, title: "Review & Submit" },
];

export function CreateListingForm() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [, setLocation] = useLocation();
  const { profile, permissions, dealerId, loading: userLoading } = useCurrentUser();
  const [equipmentOptions, setEquipmentOptions] = React.useState<Array<{ value: string; label: string }>>([]);
  // Track which fields were populated from VIN decode
  const [decodedFields, setDecodedFields] = React.useState<Set<string>>(new Set());
  // Store enriched data for preview
  const [enrichedData, setEnrichedData] = React.useState<{
    data: any;
    dataSources: string[];
    nhtsaConfidence: 'high' | 'medium' | 'low';
    epaAvailable: boolean;
  } | null>(null);

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      listingType: "stock_unit",
      vin: "",
      year: new Date().getFullYear(),
      make: "",
      model: "",
      fuelType: "gasoline",
      hasEquipment: false,
      condition: "new",
      photos: [],
    },
  });

  const hasEquipment = form.watch("hasEquipment");
  const condition = form.watch("condition");
  const listingType = form.watch("listingType");
  const vin = form.watch("vin");
  
  // Clear decoded fields when VIN is cleared or changed
  React.useEffect(() => {
    if (!vin || vin.length < 17) {
      setDecodedFields(new Set());
      setEnrichedData(null);
    }
  }, [vin]);

  const createListing = trpc.dealer.listings.create.useMutation({
    onSuccess: (data) => {
      toast.success("Listing created successfully!");
      setLocation(`/dealer/listings/${data.listingId}?success=true`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create listing");
    },
  });

  const handleVINDecode = (decodedData: any) => {
    const fieldsToMark: string[] = [];
    
    // Store enriched data for preview
    setEnrichedData({
      data: decodedData,
      dataSources: decodedData.dataSources || ['nhtsa'],
      nhtsaConfidence: decodedData.nhtsaConfidence || 'medium',
      epaAvailable: decodedData.epaAvailable || false,
    });
    
    // Set and track fields that were populated from VIN decode
    if (decodedData.year !== undefined && decodedData.year !== null) {
      form.setValue("year", decodedData.year);
      fieldsToMark.push("year");
    }
    if (decodedData.make) {
      form.setValue("make", decodedData.make);
      fieldsToMark.push("make");
    }
    if (decodedData.model) {
      form.setValue("model", decodedData.model);
      fieldsToMark.push("model");
    }
    if (decodedData.series) {
      form.setValue("series", decodedData.series);
      fieldsToMark.push("series");
    }
    if (decodedData.trim) {
      form.setValue("series", decodedData.trim); // Use trim as series if series not available
      if (!decodedData.series) fieldsToMark.push("series");
    }
    if (decodedData.bodyStyle || decodedData.bodyClass) {
      form.setValue("bodyStyle", decodedData.bodyStyle || decodedData.bodyClass || '');
      fieldsToMark.push("bodyStyle");
    }
    if (decodedData.fuelTypePrimary) {
      form.setValue("fuelType", decodedData.fuelTypePrimary as any);
      fieldsToMark.push("fuelType");
    }
    if (decodedData.wheelbase !== undefined && decodedData.wheelbase !== null) {
      form.setValue("wheelbase", decodedData.wheelbase);
      fieldsToMark.push("wheelbase");
    }
    if (decodedData.gvwr !== undefined && decodedData.gvwr !== null) {
      form.setValue("gvwr", decodedData.gvwr);
      fieldsToMark.push("gvwr");
    }
    if (decodedData.payloadCapacity !== undefined && decodedData.payloadCapacity !== null) {
      form.setValue("payload", decodedData.payloadCapacity);
      fieldsToMark.push("payload");
    }
    if (decodedData.engineDescription || decodedData.engineModel) {
      form.setValue("engineDescription", decodedData.engineDescription || decodedData.engineModel || '');
      fieldsToMark.push("engineDescription");
    }
    if (decodedData.transmission) {
      form.setValue("transmission", decodedData.transmission);
      fieldsToMark.push("transmission");
    }
    if (decodedData.driveType) {
      form.setValue("driveType", decodedData.driveType as any);
      fieldsToMark.push("driveType");
    }
    
    // Set additional enriched fields if available
    if (decodedData.overallHeight) {
      const heightType = decodedData.overallHeight < 80 ? 'Low Roof' : 
                        decodedData.overallHeight < 90 ? 'Medium Roof' : 'High Roof';
      form.setValue("heightType" as any, heightType);
      fieldsToMark.push("heightType");
    }
    if (decodedData.axleDescription) {
      form.setValue("axleDescription" as any, decodedData.axleDescription);
      fieldsToMark.push("axleDescription");
    }
    if (decodedData.rearWheels) {
      form.setValue("rearWheels" as any, decodedData.rearWheels);
      fieldsToMark.push("rearWheels");
    }
    if (decodedData.batteryVoltage !== undefined && decodedData.batteryVoltage !== null) {
      form.setValue("batteryVoltage" as any, decodedData.batteryVoltage);
      fieldsToMark.push("batteryVoltage");
    }
    if (decodedData.horsepower !== undefined && decodedData.horsepower !== null) {
      form.setValue("horsepower" as any, decodedData.horsepower);
      fieldsToMark.push("horsepower");
    }
    if (decodedData.mpgCity !== undefined && decodedData.mpgCity !== null) {
      form.setValue("mpgCity" as any, decodedData.mpgCity);
      fieldsToMark.push("mpgCity");
    }
    if (decodedData.mpgHighway !== undefined && decodedData.mpgHighway !== null) {
      form.setValue("mpgHighway" as any, decodedData.mpgHighway);
      fieldsToMark.push("mpgHighway");
    }
    if (decodedData.mpge !== undefined && decodedData.mpge !== null) {
      form.setValue("mpge" as any, decodedData.mpge);
      fieldsToMark.push("mpge");
    }
    if (decodedData.overallLength !== undefined && decodedData.overallLength !== null) {
      form.setValue("lengthInches" as any, decodedData.overallLength);
      fieldsToMark.push("lengthInches");
    }
    if (decodedData.overallWidth !== undefined && decodedData.overallWidth !== null) {
      form.setValue("widthInches" as any, decodedData.overallWidth);
      fieldsToMark.push("widthInches");
    }
    if (decodedData.overallHeight !== undefined && decodedData.overallHeight !== null) {
      form.setValue("heightInches" as any, decodedData.overallHeight);
      fieldsToMark.push("heightInches");
    }
    if (decodedData.curbWeight !== undefined && decodedData.curbWeight !== null) {
      form.setValue("baseCurbWeightLbs" as any, decodedData.curbWeight);
      fieldsToMark.push("baseCurbWeightLbs");
    }
    if (decodedData.seatingCapacity !== undefined && decodedData.seatingCapacity !== null) {
      form.setValue("seatingCapacity" as any, decodedData.seatingCapacity);
      fieldsToMark.push("seatingCapacity");
    }
    
    // GAWR fields (CRITICAL for commercial vehicles)
    if (decodedData.gawrFront !== undefined && decodedData.gawrFront !== null) {
      form.setValue("gawrFront" as any, decodedData.gawrFront);
      fieldsToMark.push("gawrFront");
    }
    if (decodedData.gawrRear !== undefined && decodedData.gawrRear !== null) {
      form.setValue("gawrRear" as any, decodedData.gawrRear);
      fieldsToMark.push("gawrRear");
    }
    
    // Towing capacity
    if (decodedData.towingCapacity !== undefined && decodedData.towingCapacity !== null) {
      form.setValue("towingCapacity" as any, decodedData.towingCapacity);
      fieldsToMark.push("towingCapacity");
    }
    
    // Fuel tank capacity
    if (decodedData.fuelTankCapacity !== undefined && decodedData.fuelTankCapacity !== null) {
      form.setValue("fuelTankCapacity" as any, decodedData.fuelTankCapacity);
      fieldsToMark.push("fuelTankCapacity");
    }
    
    // Technology & Safety features
    if (decodedData.backupCamera !== undefined) {
      form.setValue("backupCamera" as any, decodedData.backupCamera);
      fieldsToMark.push("backupCamera");
    }
    if (decodedData.bluetoothCapable !== undefined) {
      form.setValue("bluetoothCapable" as any, decodedData.bluetoothCapable);
      fieldsToMark.push("bluetoothCapable");
    }
    if (decodedData.tpms !== undefined) {
      form.setValue("tpms" as any, decodedData.tpms);
      fieldsToMark.push("tpms");
    }
    
    // Mark all populated fields as decoded
    setDecodedFields(new Set(fieldsToMark));
    
    const sourceCount = decodedData.dataSources?.length || 1;
    const sourceNames = decodedData.dataSources?.join(' + ') || 'NHTSA';
    toast.success(`VIN decoded successfully! ${sourceCount} data source(s): ${sourceNames}`);
  };

  const onSubmit = (data: ListingFormData) => {
    createListing.mutate(data);
  };

  const nextStep = () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    form.trigger(fieldsToValidate as any).then((isValid) => {
      if (isValid) {
        setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      }
    });
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const getFieldsForStep = (step: number): (keyof ListingFormData)[] => {
    switch (step) {
      case 0:
        return ["listingType"];
      case 1:
        return ["vin", "year", "make", "model", "fuelType"];
      case 2:
        return hasEquipment ? ["equipmentManufacturer"] : [];
      case 3:
        return ["askingPrice", "condition", ...(condition === "used" || condition === "certified_pre_owned" ? ["mileage"] : [])];
      default:
        return [];
    }
  };

  const progressPercentage = ((currentStep + 1) / STEPS.length) * 100;

  // Show loading state
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-lg">Loading user profile...</div>
        </div>
      </div>
    );
  }

  // Check if user can create listings
  if (!permissions?.canCreateListings) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Insufficient Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            You do not have permission to create vehicle listings. 
            Please contact your organization administrator.
          </p>
          {profile && (
            <div className="text-sm text-muted-foreground">
              <p>Current role: <strong>{profile.role}</strong></p>
              <p>Organization: <strong>{profile.organization_name}</strong></p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Check if dealer ID exists
  if (!dealerId) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Dealer Profile Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You need to be associated with a dealer organization to create listings.
            {profile && (
              <>
                <br />
                <br />
                Your organization type is: <strong>{profile.organization_type}</strong>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Enhanced Progress Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Create New Listing</h2>
            <p className="text-muted-foreground mt-1">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {Math.round(progressPercentage)}% Complete
          </Badge>
        </div>
        
        {/* Modern Progress Bar */}
        <div className="relative">
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center flex-1">
                <button
                  type="button"
                  onClick={() => {
                    if (index <= currentStep) {
                      const fieldsToValidate = getFieldsForStep(index);
                      form.trigger(fieldsToValidate as any).then((isValid) => {
                        if (isValid || index < currentStep) {
                          setCurrentStep(index);
                        }
                      });
                    }
                  }}
                  disabled={index > currentStep}
                  className={`
                    relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300
                    ${index === currentStep
                      ? "border-primary bg-primary text-primary-foreground shadow-lg scale-110"
                      : index < currentStep
                      ? "border-primary bg-primary/10 text-primary hover:scale-105 cursor-pointer"
                      : "border-muted bg-muted/50 text-muted-foreground cursor-not-allowed"
                    }
                  `}
                >
                  {index < currentStep ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <span className="text-sm font-semibold">{step.id + 1}</span>
                  )}
                  {index === currentStep && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                  )}
                </button>
                <span className={`mt-2 text-xs font-medium text-center hidden sm:block max-w-[80px] ${
                  index === currentStep ? "text-primary" : index < currentStep ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${
                  index < currentStep ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                {currentStep === 0 && <Sparkles className="w-5 h-5 text-primary" />}
                {STEPS[currentStep].title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentStep === 0 && "Choose how you want to list this vehicle"}
                {currentStep === 1 && "Enter vehicle details or scan the VIN to auto-populate"}
                {currentStep === 2 && "Add equipment information if applicable"}
                {currentStep === 3 && "Set pricing and listing details"}
                {currentStep === 4 && "Upload photos to showcase your vehicle"}
                {currentStep === 5 && "Review all information before submitting"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-3 block">What type of listing is this?</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Select how you want to list this vehicle in the marketplace
                </p>
              </div>
              <RadioGroup
                value={listingType}
                onValueChange={(value) => form.setValue("listingType", value as any)}
                className="grid gap-4 md:grid-cols-2"
              >
                <label
                  htmlFor="stock_unit"
                  className={`
                    relative flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all
                    ${listingType === "stock_unit" 
                      ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20" 
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                    }
                  `}
                >
                  <RadioGroupItem value="stock_unit" id="stock_unit" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-semibold cursor-pointer block mb-1">
                      In Stock
                    </div>
                    <p className="text-sm text-muted-foreground">
                      I have this unit on my lot and ready for immediate sale
                    </p>
                  </div>
                </label>
                <label
                  htmlFor="build_to_order"
                  className={`
                    relative flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all
                    ${listingType === "build_to_order" 
                      ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20" 
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                    }
                  `}
                >
                  <RadioGroupItem value="build_to_order" id="build_to_order" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-semibold cursor-pointer block mb-1">
                      Build-to-Order
                    </div>
                    <p className="text-sm text-muted-foreground">
                      I can order this configuration from the manufacturer
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              {/* VIN Input Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-semibold">Vehicle Identification Number (VIN)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Enter the 17-character VIN to automatically populate vehicle information from official databases.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <VINInput
                  value={form.watch("vin")}
                  onChange={(value) => form.setValue("vin", value)}
                  onDecode={handleVINDecode}
                  label=""
                  error={form.formState.errors.vin?.message}
                />
                {form.formState.errors.vin && (
                  <div className="flex items-center gap-2 text-sm text-destructive mt-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{form.formState.errors.vin.message}</span>
                  </div>
                )}
              </div>

              {/* Show preview after decode */}
              {enrichedData && (
                <VehicleDataPreview 
                  data={enrichedData.data}
                  dataSources={enrichedData.dataSources}
                  nhtsaConfidence={enrichedData.nhtsaConfidence}
                  epaAvailable={enrichedData.epaAvailable}
                />
              )}

              {/* Vehicle Information Grid */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span>Basic Information</span>
                    {decodedFields.size > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {decodedFields.size} fields auto-filled
                      </Badge>
                    )}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="year">Year</Label>
                        {decodedFields.has("year") && (
                          <Badge variant="outline" className="text-xs">
                            Auto-filled
                          </Badge>
                        )}
                      </div>
                      <Input
                        id="year"
                        type="number"
                        readOnly={decodedFields.has("year")}
                        className={decodedFields.has("year") 
                          ? "bg-primary/5 border-primary/20 cursor-not-allowed" 
                          : ""
                        }
                        {...form.register("year", { valueAsNumber: true })}
                      />
                      {form.formState.errors.year && (
                        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {form.formState.errors.year.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="make">Make</Label>
                        {decodedFields.has("make") && (
                          <Badge variant="outline" className="text-xs">
                            Auto-filled
                          </Badge>
                        )}
                      </div>
                      <Input
                        id="make"
                        readOnly={decodedFields.has("make")}
                        className={decodedFields.has("make") 
                          ? "bg-primary/5 border-primary/20 cursor-not-allowed" 
                          : ""
                        }
                        {...form.register("make")}
                      />
                      {form.formState.errors.make && (
                        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {form.formState.errors.make.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="model">Model</Label>
                        {decodedFields.has("model") && (
                          <Badge variant="outline" className="text-xs">
                            Auto-filled
                          </Badge>
                        )}
                      </div>
                      <Input
                        id="model"
                        readOnly={decodedFields.has("model")}
                        className={decodedFields.has("model") 
                          ? "bg-primary/5 border-primary/20 cursor-not-allowed" 
                          : ""
                        }
                        {...form.register("model")}
                      />
                      {form.formState.errors.model && (
                        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {form.formState.errors.model.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="series">Series/Trim</Label>
                        {decodedFields.has("series") && (
                          <Badge variant="outline" className="text-xs">
                            Auto-filled
                          </Badge>
                        )}
                      </div>
                      <Input
                        id="series"
                        readOnly={decodedFields.has("series")}
                        className={decodedFields.has("series") 
                          ? "bg-primary/5 border-primary/20 cursor-not-allowed" 
                          : ""
                        }
                        {...form.register("series")}
                      />
                      {form.formState.errors.series && (
                        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {form.formState.errors.series.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Specifications Section */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Specifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bodyStyle">Body Style</Label>
                  <Input
                    id="bodyStyle"
                    readOnly={decodedFields.has("bodyStyle")}
                    className={decodedFields.has("bodyStyle") ? "bg-muted cursor-not-allowed" : ""}
                    {...form.register("bodyStyle")}
                  />
                  {form.formState.errors.bodyStyle && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.bodyStyle.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="fuelType">Fuel Type</Label>
                  <Select
                    value={form.watch("fuelType")}
                    onValueChange={(value) => form.setValue("fuelType", value as any)}
                    disabled={decodedFields.has("fuelType")}
                  >
                    <SelectTrigger className={decodedFields.has("fuelType") ? "bg-muted cursor-not-allowed" : ""}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasoline">Gasoline</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="cng">CNG</SelectItem>
                      <SelectItem value="propane">Propane</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="wheelbase">Wheelbase (inches)</Label>
                  <Input
                    id="wheelbase"
                    type="number"
                    readOnly={decodedFields.has("wheelbase")}
                    className={decodedFields.has("wheelbase") ? "bg-muted cursor-not-allowed" : ""}
                    {...form.register("wheelbase", { valueAsNumber: true })}
                  />
                  {form.formState.errors.wheelbase && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.wheelbase.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="gvwr">GVWR (lbs)</Label>
                  <Input
                    id="gvwr"
                    type="number"
                    readOnly={decodedFields.has("gvwr")}
                    className={decodedFields.has("gvwr") ? "bg-muted cursor-not-allowed" : ""}
                    {...form.register("gvwr", { valueAsNumber: true })}
                  />
                  {form.formState.errors.gvwr && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.gvwr.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="payload">Payload Capacity (lbs)</Label>
                  <Input
                    id="payload"
                    type="number"
                    readOnly={decodedFields.has("payload")}
                    className={decodedFields.has("payload") ? "bg-muted cursor-not-allowed" : ""}
                    {...form.register("payload", { valueAsNumber: true })}
                  />
                  {form.formState.errors.payload && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.payload.message}</p>
                  )}
                </div>
                
                {/* GAWR Fields - Critical for Commercial Vehicles */}
                <div>
                  <Label htmlFor="gawrFront">Front GAWR (lbs)</Label>
                  <Input
                    id="gawrFront"
                    type="number"
                    readOnly={decodedFields.has("gawrFront")}
                    className={decodedFields.has("gawrFront") ? "bg-muted cursor-not-allowed" : ""}
                    {...form.register("gawrFront" as any, { valueAsNumber: true })}
                    placeholder="7,260"
                  />
                </div>
                <div>
                  <Label htmlFor="gawrRear">Rear GAWR (lbs)</Label>
                  <Input
                    id="gawrRear"
                    type="number"
                    readOnly={decodedFields.has("gawrRear")}
                    className={decodedFields.has("gawrRear") ? "bg-muted cursor-not-allowed" : ""}
                    {...form.register("gawrRear" as any, { valueAsNumber: true })}
                    placeholder="13,110"
                  />
                </div>
                
                {/* Towing Capacity */}
                <div>
                  <Label htmlFor="towingCapacity">Towing Capacity (lbs)</Label>
                  <Input
                    id="towingCapacity"
                    type="number"
                    readOnly={decodedFields.has("towingCapacity")}
                    className={decodedFields.has("towingCapacity") ? "bg-muted cursor-not-allowed" : ""}
                    {...form.register("towingCapacity" as any, { valueAsNumber: true })}
                    placeholder="21,000"
                  />
                </div>
                
                {/* Fuel Tank Capacity */}
                <div>
                  <Label htmlFor="fuelTankCapacity">Fuel Tank Capacity (gal)</Label>
                  <Input
                    id="fuelTankCapacity"
                    type="number"
                    readOnly={decodedFields.has("fuelTankCapacity")}
                    className={decodedFields.has("fuelTankCapacity") ? "bg-muted cursor-not-allowed" : ""}
                    {...form.register("fuelTankCapacity" as any, { valueAsNumber: true })}
                    placeholder="40"
                  />
                </div>
                
                {/* Technology & Safety Features */}
                <div className="col-span-2">
                  <Label className="text-base font-semibold mb-2 block">Safety & Technology Features</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="backupCamera"
                        checked={form.watch("backupCamera" as any) || false}
                        onCheckedChange={(checked) => form.setValue("backupCamera" as any, checked === true)}
                        disabled={decodedFields.has("backupCamera")}
                      />
                      <Label htmlFor="backupCamera" className="font-normal cursor-pointer">
                        Backup Camera
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="bluetoothCapable"
                        checked={form.watch("bluetoothCapable" as any) || false}
                        onCheckedChange={(checked) => form.setValue("bluetoothCapable" as any, checked === true)}
                        disabled={decodedFields.has("bluetoothCapable")}
                      />
                      <Label htmlFor="bluetoothCapable" className="font-normal cursor-pointer">
                        Bluetooth
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tpms"
                        checked={form.watch("tpms" as any) || false}
                        onCheckedChange={(checked) => form.setValue("tpms" as any, checked === true)}
                        disabled={decodedFields.has("tpms")}
                      />
                      <Label htmlFor="tpms" className="font-normal cursor-pointer">
                        TPMS
                      </Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="engineDescription">Engine</Label>
                  <Input
                    id="engineDescription"
                    readOnly={decodedFields.has("engineDescription")}
                    className={decodedFields.has("engineDescription") ? "bg-muted cursor-not-allowed" : ""}
                    {...form.register("engineDescription")}
                  />
                  {form.formState.errors.engineDescription && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.engineDescription.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="transmission">Transmission</Label>
                  <Input
                    id="transmission"
                    readOnly={decodedFields.has("transmission")}
                    className={decodedFields.has("transmission") ? "bg-muted cursor-not-allowed" : ""}
                    {...form.register("transmission")}
                  />
                  {form.formState.errors.transmission && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.transmission.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="driveType">Drive Type</Label>
                  <Select
                    value={form.watch("driveType") || ""}
                    onValueChange={(value) => form.setValue("driveType", value as any)}
                    disabled={decodedFields.has("driveType")}
                  >
                    <SelectTrigger className={decodedFields.has("driveType") ? "bg-muted cursor-not-allowed" : ""}>
                      <SelectValue placeholder="Select drive type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RWD">RWD</SelectItem>
                      <SelectItem value="AWD">AWD</SelectItem>
                      <SelectItem value="4WD">4WD</SelectItem>
                      <SelectItem value="FWD">FWD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasEquipment"
                  checked={hasEquipment}
                  onCheckedChange={(checked) => form.setValue("hasEquipment", checked === true)}
                />
                <Label htmlFor="hasEquipment" className="font-normal cursor-pointer">
                  This unit has upfitter equipment installed
                </Label>
              </div>

              {hasEquipment && (
                <>
                  <SmartCombobox
                    value={form.watch("equipmentManufacturer")}
                    onChange={(value) => form.setValue("equipmentManufacturer", value)}
                    options={equipmentOptions}
                    allowCreate={true}
                    placeholder="e.g., Knapheide, Reading, Morgan"
                    label="Equipment Manufacturer"
                    error={form.formState.errors.equipmentManufacturer?.message}
                  />
                  <SmartCombobox
                    value={form.watch("equipmentProductLine")}
                    onChange={(value) => form.setValue("equipmentProductLine", value)}
                    options={equipmentOptions}
                    allowCreate={true}
                    placeholder="e.g., KUV, KMT, Classic II"
                    label="Product Line"
                  />
                  <div>
                    <Label htmlFor="equipmentType">Equipment Type</Label>
                    <Select
                      value={form.watch("equipmentType") || ""}
                      onValueChange={(value) => form.setValue("equipmentType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select equipment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="service_body">Service Body</SelectItem>
                        <SelectItem value="dump_body">Dump Body</SelectItem>
                        <SelectItem value="flatbed">Flatbed</SelectItem>
                        <SelectItem value="stake_body">Stake Body</SelectItem>
                        <SelectItem value="van_body">Van Body</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="equipmentLength">Length (inches)</Label>
                      <Input
                        id="equipmentLength"
                        type="number"
                        {...form.register("equipmentLength", { valueAsNumber: true })}
                      />
                      {form.formState.errors.equipmentLength && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.equipmentLength.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="equipmentWidth">Width (inches)</Label>
                      <Input
                        id="equipmentWidth"
                        type="number"
                        {...form.register("equipmentWidth", { valueAsNumber: true })}
                      />
                      {form.formState.errors.equipmentWidth && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.equipmentWidth.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="equipmentHeight">Height (inches)</Label>
                      <Input
                        id="equipmentHeight"
                        type="number"
                        {...form.register("equipmentHeight", { valueAsNumber: true })}
                      />
                      {form.formState.errors.equipmentHeight && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.equipmentHeight.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="equipmentWeight">Weight (lbs)</Label>
                      <Input
                        id="equipmentWeight"
                        type="number"
                        {...form.register("equipmentWeight", { valueAsNumber: true })}
                      />
                      {form.formState.errors.equipmentWeight && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.equipmentWeight.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="equipmentMaterial">Material</Label>
                    <Select
                      value={form.watch("equipmentMaterial") || ""}
                      onValueChange={(value) => form.setValue("equipmentMaterial", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aluminum">Aluminum</SelectItem>
                        <SelectItem value="steel">Steel</SelectItem>
                        <SelectItem value="stainless_steel">Stainless Steel</SelectItem>
                        <SelectItem value="composite">Composite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="doorConfiguration">Door Configuration</Label>
                    <Input
                      id="doorConfiguration"
                      placeholder="e.g., 2 side doors, 1 rear door"
                      {...form.register("doorConfiguration")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="compartmentCount">Number of Compartments</Label>
                    <Input
                      id="compartmentCount"
                      type="number"
                      {...form.register("compartmentCount", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasInteriorLighting"
                        checked={form.watch("hasInteriorLighting") || false}
                        onCheckedChange={(checked) => form.setValue("hasInteriorLighting", checked === true)}
                      />
                      <Label htmlFor="hasInteriorLighting" className="font-normal cursor-pointer">
                        Has Interior Lighting
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasExteriorLighting"
                        checked={form.watch("hasExteriorLighting") || false}
                        onCheckedChange={(checked) => form.setValue("hasExteriorLighting", checked === true)}
                      />
                      <Label htmlFor="hasExteriorLighting" className="font-normal cursor-pointer">
                        Has Exterior Lighting
                      </Label>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="listingTitle">Listing Title</Label>
                <Input
                  id="listingTitle"
                  placeholder="2024 Ford F-550 with Knapheide Service Body - Low Miles!"
                  {...form.register("listingTitle")}
                />
              </div>
              <div>
                <Label htmlFor="marketingHeadline">Marketing Headline</Label>
                <Input
                  id="marketingHeadline"
                  placeholder="Fleet Ready! Perfect for Contractors!"
                  {...form.register("marketingHeadline")}
                />
              </div>
              <div>
                <Label htmlFor="keyHighlights">Key Selling Points</Label>
                <Textarea
                  id="keyHighlights"
                  rows={4}
                  placeholder="• Low mileage&#10;• One owner&#10;• Full service history"
                  {...form.register("keyHighlights")}
                />
                <p className="text-sm text-muted-foreground mt-1">Enter one point per line</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="askingPrice">Asking Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="askingPrice"
                      type="number"
                      className="pl-7"
                      {...form.register("askingPrice", { valueAsNumber: true })}
                    />
                  </div>
                  {form.formState.errors.askingPrice && (
                    <p className="text-sm text-destructive">{form.formState.errors.askingPrice.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="priceType">Price Type</Label>
                  <Select
                    value={form.watch("priceType") || "negotiable"}
                    onValueChange={(value) => form.setValue("priceType", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="negotiable">Negotiable</SelectItem>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="call_for_price">Call for Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="specialPrice">Special/Sale Price (optional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="specialPrice"
                      type="number"
                      className="pl-7"
                      {...form.register("specialPrice", { valueAsNumber: true })}
                    />
                  </div>
                  {form.formState.errors.specialPrice && (
                    <p className="text-sm text-destructive">{form.formState.errors.specialPrice.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="stockNumber">Stock Number</Label>
                  <Input
                    id="stockNumber"
                    {...form.register("stockNumber")}
                  />
                  {form.formState.errors.stockNumber && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.stockNumber.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="condition">Condition</Label>
                  <Select
                    value={form.watch("condition")}
                    onValueChange={(value) => form.setValue("condition", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="certified_pre_owned">Certified Pre-Owned</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(condition === "used" || condition === "certified_pre_owned") && (
                  <div>
                    <Label htmlFor="mileage">Mileage</Label>
                    <Input
                      id="mileage"
                      type="number"
                      {...form.register("mileage", { valueAsNumber: true })}
                    />
                    {form.formState.errors.mileage && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.mileage.message}</p>
                    )}
                  </div>
                )}
                <div>
                  <Label htmlFor="exteriorColor">Exterior Color</Label>
                  <Input
                    id="exteriorColor"
                    {...form.register("exteriorColor")}
                  />
                  {form.formState.errors.exteriorColor && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.exteriorColor.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="interiorColor">Interior Color</Label>
                  <Input
                    id="interiorColor"
                    {...form.register("interiorColor")}
                  />
                  {form.formState.errors.interiorColor && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.interiorColor.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="paintCondition">Paint Condition</Label>
                  <Select
                    value={form.watch("paintCondition") || ""}
                    onValueChange={(value) => form.setValue("paintCondition", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="interiorCondition">Interior Condition</Label>
                  <Select
                    value={form.watch("interiorCondition") || ""}
                    onValueChange={(value) => form.setValue("interiorCondition", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isFeatured"
                    checked={form.watch("isFeatured") || false}
                    onCheckedChange={(checked) => form.setValue("isFeatured", checked === true)}
                  />
                  <Label htmlFor="isFeatured" className="font-normal cursor-pointer">
                    Feature this listing
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isHotDeal"
                    checked={form.watch("isHotDeal") || false}
                    onCheckedChange={(checked) => form.setValue("isHotDeal", checked === true)}
                  />
                  <Label htmlFor="isHotDeal" className="font-normal cursor-pointer">
                    Mark as hot deal
                  </Label>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={6}
                  placeholder="Describe this vehicle's features, condition, and unique selling points..."
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="locationCity">Location City</Label>
                  <Input
                    id="locationCity"
                    {...form.register("locationCity")}
                  />
                  {form.formState.errors.locationCity && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.locationCity.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="locationState">Location State</Label>
                  <Input
                    id="locationState"
                    {...form.register("locationState")}
                  />
                  {form.formState.errors.locationState && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.locationState.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <ImageUploadZone
              value={form.watch("photos") || []}
              onChange={(urls) => form.setValue("photos", urls)}
              maxFiles={20}
              label="Vehicle Photos"
              description="Upload clear photos of the exterior, interior, equipment, and any damage"
            />
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">
                    {form.watch("year")} {form.watch("make")} {form.watch("model")} {form.watch("series")}
                  </p>
                  <p className="text-sm text-muted-foreground">VIN: {form.watch("vin")}</p>
                  <p className="text-sm text-muted-foreground">
                    GVWR: {form.watch("gvwr")} lbs | Payload: {form.watch("payload")} lbs
                  </p>
                </CardContent>
              </Card>

              {hasEquipment && (
                <Card>
                  <CardHeader>
                    <CardTitle>Equipment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">
                      {form.watch("equipmentManufacturer")} {form.watch("equipmentProductLine")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Length: {form.watch("equipmentLength")}" | Weight: {form.watch("equipmentWeight")} lbs
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">Asking Price: ${form.watch("askingPrice")?.toLocaleString()}</p>
                  {form.watch("specialPrice") && (
                    <p className="text-sm text-muted-foreground">
                      Special Price: ${form.watch("specialPrice")?.toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">Condition: {form.watch("condition")}</p>
                  {form.watch("stockNumber") && (
                    <p className="text-sm text-muted-foreground">Stock #: {form.watch("stockNumber")}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="min-w-[120px]"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        
        <div className="text-sm text-muted-foreground hidden sm:block">
          Step {currentStep + 1} of {STEPS.length}
        </div>
        
        {currentStep < STEPS.length - 1 ? (
          <Button 
            type="button" 
            onClick={nextStep}
            className="min-w-[120px] bg-primary hover:bg-primary/90"
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button 
            type="submit" 
            disabled={createListing.isPending}
            className="min-w-[160px] bg-primary hover:bg-primary/90"
          >
            {createListing.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Create Listing
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}

