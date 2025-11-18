import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { User, Mail, Phone, Building, MapPin, Bell, Store, CheckCircle2, Clock, MapPin as MapPinIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import type { CompleteProfile, PersonalInfo, OrganizationInfo, DealerInfo, OrganizationType } from "@/types/profile";

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
    });

    // Load personal information
    if (profileData.personal) {
      setPersonalFormData({
        id: profileData.personal.id,
        email: profileData.personal.email || "",
        name: profileData.personal.name || "",
        phone: profileData.personal.phone || "",
        bio: profileData.personal.bio || "",
        emailNotifications: profileData.personal.emailNotifications ?? true,
        marketingEmails: profileData.personal.marketingEmails ?? false,
        createdAt: profileData.personal.createdAt,
        lastSignInAt: profileData.personal.lastSignInAt,
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
      });
    }
  }, [profileData, isSaving]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be signed in to update your profile");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Update personal information
      if (personalFormData) {
        await updatePersonalMutation.mutateAsync({
          name: personalFormData.name,
          phone: personalFormData.phone,
          bio: personalFormData.bio,
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

      // Update dealer if needed
      
      const selectedOrgType = orgTypesData?.find((t: OrganizationType) => t.id === orgFormData.organization_type_id);
      const needsDealer = selectedOrgType?.can_list_vehicles || !!profileData?.dealer;

      if (canManageOrg && organizationId && needsDealer) {
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
          });
      }
      
      toast.success("Profile updated successfully!");
      
      // Refetch profile data
      await refetchProfile();
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
  const needsDealer = selectedOrgType?.can_list_vehicles || !!profileData?.dealer;
  
  // Always show organization section for logged-in users
  // The "Admin Only" badge indicates it's restricted, backend enforces permissions
  const showOrganizationSection = !!user;
  
  // Show dealer section if user is logged in and any of these conditions:
  // 1. User can manage org (owner/admin), OR
  // 2. User has an organization, OR
  // 3. User has a dealer record, OR
  // 4. Selected org type requires dealer
  const showDealerSection = !!user && (
    canManageOrg || 
    !!profileData?.organization?.id || 
    !!profileData?.dealer ||
    !!selectedOrgType?.can_list_vehicles
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 py-12 bg-gray-50">
        <div className="container max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-2">
              Manage your account settings, organization, and dealership information
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            {personalFormData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                        value={personalFormData.name}
                        onChange={(e) => setPersonalFormData({ ...personalFormData, name: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                        value={personalFormData.email || ""}
                      disabled
                      readOnly
                      className="cursor-not-allowed opacity-60"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                      value={personalFormData.phone}
                      onChange={(e) => setPersonalFormData({ ...personalFormData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                      value={personalFormData.bio}
                      onChange={(e) => setPersonalFormData({ ...personalFormData, bio: e.target.value })}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
            )}

            {/* Organization Information */}
            {showOrganizationSection && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Organization Information
                    <Badge variant="secondary" className="ml-2">Admin Only</Badge>
                  </CardTitle>
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
                    <Label htmlFor="organization_type_id">Organization Type *</Label>
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
                      <Label htmlFor="organization_name">Organization Name *</Label>
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
                      <Label htmlFor="primary_email">Primary Email *</Label>
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

            {/* Dealership Information */}
            {showDealerSection && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Dealership Information
                    <Badge variant="secondary" className="ml-2">Admin Only</Badge>
                  </CardTitle>
                  <CardDescription>
                    Manage your dealership's business details and capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!profileData?.dealer && (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-md text-sm text-blue-900 dark:text-blue-100">
                      <p className="font-medium mb-1">No dealer record found</p>
                      <p className="text-xs">Your organization type requires a dealer record. Fill out the form below and save to create one.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business_type">Business Type</Label>
                      <Select
                        value={dealerFormData.business_type || ""}
                        onValueChange={(value: any) => setDealerFormData({ ...dealerFormData, business_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="" />
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
                        onChange={(e) => setDealerFormData({ ...dealerFormData, dealer_license_state: e.target.value })}
                        maxLength={2}
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
                              ×
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
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Toggle switches for dealer capabilities */}
                  <div className="space-y-4">
                    {[
                      { key: 'has_service_department', label: 'Service Department', desc: 'Does your dealership have a service department?' },
                      { key: 'has_parts_department', label: 'Parts Department', desc: 'Does your dealership have a parts department?' },
                      { key: 'can_install_upfits', label: 'Can Install Upfits', desc: 'Can your dealership install upfitting equipment?' },
                      { key: 'has_body_shop', label: 'Body Shop', desc: 'Does your dealership have a body shop?' },
                      { key: 'can_special_order', label: 'Can Special Order', desc: 'Can you place special orders for customers?' },
                      { key: 'accepts_trade_ins', label: 'Accepts Trade-Ins', desc: 'Do you accept trade-in vehicles?' },
                      { key: 'delivery_available', label: 'Delivery Available', desc: 'Do you offer vehicle delivery service?' },
                      { key: 'accepts_fleet_inquiries', label: 'Accepts Fleet Inquiries', desc: 'Do you accept fleet sales inquiries?' },
                      { key: 'auto_respond_inquiries', label: 'Auto-Respond to Inquiries', desc: 'Automatically respond to customer inquiries?' },
                      { key: 'inquiry_email_notification', label: 'Email Notifications', desc: 'Receive email notifications for inquiries?' },
                      { key: 'weekly_performance_report', label: 'Weekly Performance Report', desc: 'Receive weekly performance reports?' },
                      { key: 'allow_price_negotiations', label: 'Allow Price Negotiations', desc: 'Allow customers to negotiate prices?' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                          <Label htmlFor={key}>{label}</Label>
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="space-y-2">
                    <Label htmlFor="current_promotions">Current Promotions</Label>
                    <Textarea
                      id="current_promotions"
                      value={dealerFormData.current_promotions || ""}
                      onChange={(e) => setDealerFormData({ ...dealerFormData, current_promotions: e.target.value })}
                      rows={3}
                    />
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
                </CardContent>
              </Card>
            )}

            {/* Notification Preferences */}
            {personalFormData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
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
                    onCheckedChange={(checked) =>
                        setPersonalFormData({ ...personalFormData, emailNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketingEmails">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and promotions
                    </p>
                  </div>
                  <Switch
                    id="marketingEmails"
                      checked={personalFormData.marketingEmails}
                    onCheckedChange={(checked) =>
                        setPersonalFormData({ ...personalFormData, marketingEmails: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
            )}

            {/* Account Information */}
            {profileData && (
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
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

            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={isSaving || profileLoading}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
