/**
 * Profile Types
 * Types for user profile management matching Supabase schema
 */

export interface PersonalInfo {
  id: string;
  email: string;
  name: string;
  phone: string;
  bio: string;
  avatar?: string;
  emailNotifications: boolean;
  marketingEmails: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

export interface OrganizationType {
  id: number;
  type_code: string;
  display_name: string;
  description?: string;
  can_list_vehicles: boolean;
  is_active: boolean;
  display_order?: number;
}

export interface OrganizationInfo {
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
  tax_id?: string;
  business_hours?: Record<string, { open: string; close: string; closed: boolean }>;
  sales_territory_states?: string[];
  is_verified: boolean;
  status: 'active' | 'suspended' | 'inactive' | 'pending_verification' | 'rejected';
  subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise';
  subscription_starts_at?: string;
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  organizationType?: OrganizationType;
}

export interface DealerInfo {
  id: number;
  organization_id: number;
  business_type?: 'franchise_dealer' | 'independent_dealer' | 'fleet_remarketer' | 'broker' | 'leasing_company' | 'rental_company' | 'other';
  dealer_license_number?: string;
  dealer_license_state?: string;
  dealer_license_expires_at?: string;
  tax_id?: string;
  duns_number?: string;
  specializations?: string[];
  makes_carried?: string[];
  average_inventory_count?: number;
  lot_capacity?: number;
  can_special_order: boolean;
  accepts_trade_ins: boolean;
  has_service_department: boolean;
  has_parts_department: boolean;
  has_body_shop: boolean;
  can_install_upfits: boolean;
  typical_delivery_days?: number;
  sales_territory_states?: string[];
  delivery_available: boolean;
  delivery_radius_miles?: number;
  delivery_fee?: number;
  current_promotions?: string;
  accepts_fleet_inquiries: boolean;
  minimum_fleet_size?: number;
  fleet_discount_percentage?: number;
  certifications?: string[];
  awards?: string[];
  auto_respond_inquiries: boolean;
  inquiry_email_notification: boolean;
  weekly_performance_report: boolean;
  allow_price_negotiations: boolean;
  dealer_code?: string;
  ford_dealer_code?: string;
  default_price_level?: string;
  can_order_fleet: boolean;
  can_order_government: boolean;
  uses_b4a: boolean;
  floor_plan_company?: string;
  floor_plan_account?: string;
  floor_plan_limit?: number;
  typical_days_to_floor?: number;
  average_turn_days?: number;
  b4a_account_number?: string;
  b4a_enrollment_date?: string;
  fein_number?: string;
  sam_registration: boolean;
  sam_expiration_date?: string;
  cage_code?: string;
  ford_pro_elite: boolean;
  gm_fleet_certified: boolean;
  ram_commercial_certified: boolean;
  preferred_upfitter_ids?: number[];
  upfit_delivery_coordination: boolean;
  primary_contact_name?: string;
  primary_contact_title?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  cdk_dealer_id?: string;
  reynolds_dealer_id?: string;
  dms_provider?: string;
  dms_dealer_id?: string; // Unified DMS Dealer ID field for form
  dms_sync_enabled: boolean;
  business_hours?: Record<string, { open: string; close: string; closed: boolean }>;
  created_at: string;
  updated_at: string;
}

export interface DealerCode {
  id: number;
  dealer_id: number;
  organization_id: number;
  make: string;
  dealer_code: string;
  is_primary: boolean;
  is_active: boolean;
  certified_date?: string;
  certification_expires_at?: string;
  default_price_level?: string;
  can_order_fleet: boolean;
  can_order_government: boolean;
  uses_b4a: boolean;
  make_id: number;
  certification_level?: string;
  annual_volume_commitment?: number;
  volume_tier?: string;
  region_code?: string;
  district_code?: string;
  zone_manager_name?: string;
  zone_manager_email?: string;
  programs_enrolled?: any; // JSONB
  created_at: string;
  updated_at: string;
}

export interface DealerLocation {
  id: number;
  dealer_id: number;
  organization_id: number;
  location_name: string;
  location_type?: 'main' | 'satellite' | 'service_only' | 'parts_only';
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  phone_ext?: string;
  fax?: string;
  email?: string;
  business_hours?: Record<string, { open: string; close: string; closed: boolean }>;
  is_primary: boolean;
  is_active: boolean;
  manager_name?: string;
  manager_email?: string;
  manager_phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Make {
  id: number;
  make_name: string;
  make_code?: string;
  is_active: boolean;
  is_commercial_vehicle_manufacturer: boolean;
}

export interface AccountInfo {
  role: 'owner' | 'admin' | 'member' | 'viewer' | null;
  memberSince: string | null;
}

export interface CompleteProfile {
  personal: PersonalInfo;
  organization: OrganizationInfo | null;
  dealer: DealerInfo | null;
  dealerCodes?: DealerCode[];
  dealerLocations?: DealerLocation[];
  account: AccountInfo;
}

