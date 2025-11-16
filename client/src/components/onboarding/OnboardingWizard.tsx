import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2, ChevronRight, ChevronLeft, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CreateDealerOrganizationInput } from '@/types/organization';

const STEPS = [
  { id: 1, title: 'Account', description: 'Basic account information' },
  { id: 2, title: 'Business', description: 'Business details' },
  { id: 3, title: 'Location', description: 'Contact information' },
  { id: 4, title: 'Specialization', description: 'Makes and services' },
  { id: 5, title: 'Subscription', description: 'Choose your plan' },
];

const BUSINESS_TYPES = [
  { value: 'independent_dealer', label: 'Independent Dealer' },
  { value: 'franchise_dealer', label: 'Franchise Dealer' },
  { value: 'fleet_remarketer', label: 'Fleet Remarketer' },
  { value: 'broker', label: 'Broker' },
  { value: 'leasing_company', label: 'Leasing Company' },
  { value: 'rental_company', label: 'Rental Company' },
  { value: 'other', label: 'Other' },
];

// Makes will be loaded from NHTSA API

const SPECIALIZATIONS = [
  { value: 'medium_duty', label: 'Medium Duty' },
  { value: 'heavy_duty', label: 'Heavy Duty' },
  { value: 'electric_vehicles', label: 'Electric Vehicles' },
  { value: 'commercial_vans', label: 'Commercial Vans' },
  { value: 'trucks', label: 'Trucks' },
  { value: 'buses', label: 'Buses' },
];

export function OnboardingWizard() {
  const [, setLocation] = useLocation();
  const { user, refetch: refetchUser } = useCurrentUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableMakes, setAvailableMakes] = useState<string[]>([]);
  const [makesLoading, setMakesLoading] = useState(true);
  const [makesSearchQuery, setMakesSearchQuery] = useState('');

  // Fetch makes from NHTSA
  const getMakes = trpc.nhtsa.getMakes.useQuery(
    { vehicleType: 'truck' }, // Get commercial vehicle makes
    { 
      refetchOnWindowFocus: false,
      staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    }
  );

  React.useEffect(() => {
    if (getMakes.data?.makes) {
      setAvailableMakes(getMakes.data.makes);
      setMakesLoading(false);
    } else if (getMakes.isError) {
      // Fallback to common makes if API fails
      setAvailableMakes([
        'Ford', 'Freightliner', 'Isuzu', 'Hino', 'Mack', 'Peterbilt', 'Kenworth',
        'Volvo', 'International', 'Mercedes-Benz', 'Ram', 'Chevrolet', 'GMC'
      ]);
      setMakesLoading(false);
    }
  }, [getMakes.data, getMakes.isError]);

  // Form data state
  const [formData, setFormData] = useState<Partial<CreateDealerOrganizationInput>>({
    businessType: 'independent_dealer',
    hasServiceDepartment: false,
    hasPartsDepartment: false,
    canInstallUpfits: false,
    makesCarried: [],
    specializations: [],
  });

  const setupOrganization = trpc.auth.setupOrganization.useMutation();

  const updateFormData = (field: keyof CreateDealerOrganizationInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('You must be logged in to setup an organization');
      return;
    }

    if (!formData.organizationName?.trim()) {
      setError('Organization name is required');
      setCurrentStep(2); // Go back to business step
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      const orgName = formData.organizationName.trim();

      const result = await setupOrganization.mutateAsync({
        userId: user.id,
        email: user.email || '',
        name: userName,
        organizationName: orgName,
        // Enhanced fields
        businessType: formData.businessType,
        city: formData.city,
        stateProvince: formData.stateProvince,
        zipPostalCode: formData.zipPostalCode,
        primaryPhone: formData.primaryPhone,
        websiteUrl: formData.websiteUrl,
        makesCarried: formData.makesCarried,
        specializations: formData.specializations,
        dealerLicenseNumber: formData.dealerLicenseNumber,
        dealerLicenseState: formData.dealerLicenseState,
        taxId: formData.taxId,
        hasServiceDepartment: formData.hasServiceDepartment || false,
        hasPartsDepartment: formData.hasPartsDepartment || false,
        canInstallUpfits: formData.canInstallUpfits || false,
      });

      console.log('✅ Organization created:', result);
      toast.success('Organization created successfully!');
      
      // Refetch user profile
      await refetchUser();
      
      // Redirect to dealer dashboard
      setTimeout(() => {
        setLocation('/dealer');
      }, 1500);

    } catch (err: any) {
      console.error('Organization setup error:', err);
      const errorMessage = err?.message || 'Failed to create organization';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  // Step 1: Account (already handled by signup, but show summary)
  if (currentStep === 1) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-2xl">Welcome to CommercialX</CardTitle>
              <div className="text-sm text-muted-foreground">
                Step {currentStep} of {STEPS.length}
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Account Information</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Name:</strong> {user?.user_metadata?.name || user?.email?.split('@')[0]}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Business Information
  if (currentStep === 2) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-2xl">Business Information</CardTitle>
              <div className="text-sm text-muted-foreground">
                Step {currentStep} of {STEPS.length}
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Dealership Name *</Label>
              <Input
                id="organizationName"
                value={formData.organizationName || ''}
                onChange={(e) => updateFormData('organizationName', e.target.value)}
                required
                placeholder="ABC Motors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type *</Label>
              <select
                id="businessType"
                value={formData.businessType || 'independent_dealer'}
                onChange={(e) => updateFormData('businessType', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {BUSINESS_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">Dealer License Number</Label>
                <Input
                  id="licenseNumber"
                  value={formData.dealerLicenseNumber || ''}
                  onChange={(e) => updateFormData('dealerLicenseNumber', e.target.value)}
                  placeholder="12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseState">License State</Label>
                <Input
                  id="licenseState"
                  value={formData.dealerLicenseState || ''}
                  onChange={(e) => updateFormData('dealerLicenseState', e.target.value)}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID (Optional)</Label>
              <Input
                id="taxId"
                value={formData.taxId || ''}
                onChange={(e) => updateFormData('taxId', e.target.value)}
                placeholder="XX-XXXXXXX"
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={nextStep} disabled={!formData.organizationName?.trim()}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Location & Contact
  if (currentStep === 3) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-2xl">Location & Contact</CardTitle>
              <div className="text-sm text-muted-foreground">
                Step {currentStep} of {STEPS.length}
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city || ''}
                  onChange={(e) => updateFormData('city', e.target.value)}
                  placeholder="Los Angeles"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.stateProvince || ''}
                  onChange={(e) => updateFormData('stateProvince', e.target.value)}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip">Zip Code</Label>
              <Input
                id="zip"
                value={formData.zipPostalCode || ''}
                onChange={(e) => updateFormData('zipPostalCode', e.target.value)}
                placeholder="90210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Primary Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.primaryPhone || ''}
                onChange={(e) => updateFormData('primaryPhone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                value={formData.websiteUrl || ''}
                onChange={(e) => updateFormData('websiteUrl', e.target.value)}
                placeholder="https://www.example.com"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 4: Specialization
  if (currentStep === 4) {
    const toggleMake = (make: string) => {
      const current = formData.makesCarried || [];
      if (current.includes(make)) {
        updateFormData('makesCarried', current.filter(m => m !== make));
      } else {
        updateFormData('makesCarried', [...current, make]);
      }
    };

    const toggleSpecialization = (spec: string) => {
      const current = formData.specializations || [];
      if (current.includes(spec)) {
        updateFormData('specializations', current.filter(s => s !== spec));
      } else {
        updateFormData('specializations', [...current, spec]);
      }
    };

    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-2xl">Specialization</CardTitle>
              <div className="text-sm text-muted-foreground">
                Step {currentStep} of {STEPS.length}
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base mb-3 block">
                Makes Carried
                {getMakes.data?.source === 'nhtsa' && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (from NHTSA)
                  </span>
                )}
              </Label>
              {makesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading makes from NHTSA...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search makes..."
                      value={makesSearchQuery}
                      onChange={(e) => setMakesSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-9"
                    />
                    {makesSearchQuery && (
                      <button
                        onClick={() => setMakesSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        type="button"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto border rounded-md p-4">
                    {availableMakes
                      .filter(make => 
                        make.toLowerCase().includes(makesSearchQuery.toLowerCase())
                      )
                      .map(make => (
                        <div key={make} className="flex items-center space-x-2">
                          <Checkbox
                            id={`make-${make}`}
                            checked={formData.makesCarried?.includes(make) || false}
                            onCheckedChange={() => toggleMake(make)}
                          />
                          <Label htmlFor={`make-${make}`} className="font-normal cursor-pointer">
                            {make}
                          </Label>
                        </div>
                      ))}
                    {availableMakes.filter(make => 
                      make.toLowerCase().includes(makesSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="col-span-3 text-center py-4 text-muted-foreground text-sm">
                        No makes found matching "{makesSearchQuery}"
                      </div>
                    )}
                  </div>
                  {makesSearchQuery && (
                    <p className="text-xs text-muted-foreground">
                      Showing {availableMakes.filter(make => 
                        make.toLowerCase().includes(makesSearchQuery.toLowerCase())
                      ).length} of {availableMakes.length} makes
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label className="text-base mb-3 block">Specializations</Label>
              <div className="grid grid-cols-2 gap-3">
                {SPECIALIZATIONS.map(spec => (
                  <div key={spec.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`spec-${spec.value}`}
                      checked={formData.specializations?.includes(spec.value) || false}
                      onCheckedChange={() => toggleSpecialization(spec.value)}
                    />
                    <Label htmlFor={`spec-${spec.value}`} className="font-normal cursor-pointer">
                      {spec.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base mb-3 block">Service Capabilities</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasService"
                    checked={formData.hasServiceDepartment || false}
                    onCheckedChange={(checked) => updateFormData('hasServiceDepartment', checked)}
                  />
                  <Label htmlFor="hasService" className="font-normal cursor-pointer">
                    Has Service Department
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasParts"
                    checked={formData.hasPartsDepartment || false}
                    onCheckedChange={(checked) => updateFormData('hasPartsDepartment', checked)}
                  />
                  <Label htmlFor="hasParts" className="font-normal cursor-pointer">
                    Has Parts Department
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canInstall"
                    checked={formData.canInstallUpfits || false}
                    onCheckedChange={(checked) => updateFormData('canInstallUpfits', checked)}
                  />
                  <Label htmlFor="canInstall" className="font-normal cursor-pointer">
                    Can Install Upfits
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 5: Subscription (simplified for now)
  if (currentStep === 5) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-2xl">Complete Setup</CardTitle>
              <div className="text-sm text-muted-foreground">
                Step {currentStep} of {STEPS.length}
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Free Trial</h3>
              <p className="text-sm text-muted-foreground">
                You'll start with a free tier. You can upgrade to a paid subscription later from your dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Review Your Information</h3>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><strong>Organization:</strong> {formData.organizationName}</p>
                <p><strong>Business Type:</strong> {BUSINESS_TYPES.find(t => t.value === formData.businessType)?.label}</p>
                {formData.city && <p><strong>Location:</strong> {formData.city}, {formData.stateProvince}</p>}
                {formData.makesCarried && formData.makesCarried.length > 0 && (
                  <p><strong>Makes:</strong> {formData.makesCarried.join(', ')}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep} disabled={isSubmitting}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

