/**
 * Organization and Dealer Types
 * Aligned with CommercialX database schema
 */

export interface Organization {
  id: number;
  organization_type_id: number;
  organization_name: string;
  legal_entity_name?: string;
  display_name?: string;
  slug: string;
  primary_email: string;
  primary_phone?: string;
  primary_phone_ext?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country: string;
  website_url?: string;
  logo_url?: string;
  is_verified: boolean;
  status: 'active' | 'suspended' | 'inactive' | 'pending_verification' | 'rejected';
  subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise';
  subscription_starts_at?: string;
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Dealer {
  id: number;
  organization_id: number;
  business_type?: 'franchise_dealer' | 'independent_dealer' | 'fleet_remarketer' | 'broker' | 'leasing_company' | 'rental_company' | 'other';
  dealer_license_number?: string;
  dealer_license_state?: string;
  specializations?: string[];
  makes_carried?: string[];
  has_service_department: boolean;
  has_parts_department: boolean;
  can_install_upfits: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDealerOrganizationInput {
  userId: string;
  email: string;
  name: string;
  organizationName: string;
  // Enhanced fields
  businessType?: 'franchise_dealer' | 'independent_dealer' | 'fleet_remarketer' | 'broker' | 'leasing_company' | 'rental_company' | 'other';
  city?: string;
  stateProvince?: string;
  zipPostalCode?: string;
  primaryPhone?: string;
  websiteUrl?: string;
  makesCarried?: string[];
  specializations?: string[];
  dealerLicenseNumber?: string;
  dealerLicenseState?: string;
  taxId?: string;
  hasServiceDepartment?: boolean;
  hasPartsDepartment?: boolean;
  canInstallUpfits?: boolean;
  businessHours?: Record<string, any>;
  salesTerritoryStates?: string[];
}

export interface CreateDealerOrganizationResult {
  organization_id: number;
  dealer_id: number;
  organization_user_id: number;
}

