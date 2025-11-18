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
  created_at: string;
  updated_at: string;
}

export interface AccountInfo {
  role: 'owner' | 'admin' | 'member' | 'viewer' | null;
  memberSince: string | null;
}

export interface CompleteProfile {
  personal: PersonalInfo;
  organization: OrganizationInfo | null;
  dealer: DealerInfo | null;
  account: AccountInfo;
}

