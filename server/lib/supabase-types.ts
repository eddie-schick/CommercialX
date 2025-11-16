/**
 * TypeScript types for Supabase schemas
 * Based on the 5 numbered schemas in Supabase
 */

// ============ Schema 01: Organization ============

export interface Organization {
  id: number;
  name: string;
  organization_type_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationUser {
  id: number;
  organization_id: number;
  user_id: string; // Supabase auth user ID
  role: "owner" | "admin" | "manager" | "sales" | "viewer";
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationType {
  id: number;
  name: string;
  description?: string;
}

// ============ Schema 02a: Dealership ============

export interface Dealer {
  id: number;
  organization_id: number;
  dealer_name: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface VehicleListing {
  id: number;
  dealer_id: number;
  complete_configuration_id: number;
  asking_price: number;
  condition: "new" | "used";
  mileage?: number;
  stock_number?: string;
  location_city?: string;
  location_state?: string;
  description?: string;
  status: "draft" | "available" | "pending" | "sold" | "archived";
  view_count: number;
  // Additional listing fields
  price_type?: "negotiable" | "fixed" | "call_for_price";
  paint_condition?: "excellent" | "good" | "fair" | "poor";
  interior_condition?: "excellent" | "good" | "fair" | "poor";
  listing_title?: string;
  key_highlights?: string[];
  marketing_headline?: string;
  is_featured?: boolean;
  is_hot_deal?: boolean;
  is_clearance?: boolean;
  warranty_type?: string;
  warranty_expires_at?: Date;
  previous_owners?: number;
  accident_history?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ListingImage {
  id: number;
  listing_id: number;
  image_url: string;
  sort_order: number;
  is_primary: boolean;
  created_at: Date;
}

// ============ Schema 03: Vehicle Data ============

export interface Vehicle {
  id: number;
  year: number;
  make_name: string;
  model_name: string;
  series?: string;
  data_source?: "dealer_input" | "admin_curated" | "vin_decode";
  created_by_dealer_id?: number;
  needs_verification?: boolean;
  confidence_score?: number;
  created_at: Date;
  updated_at: Date;
}

export interface VehicleConfig {
  id: number;
  vehicle_id: number;
  body_style?: string;
  cab_type?: string;
  wheelbase_inches?: number;
  gvwr?: number;
  payload_capacity?: number;
  engine?: string;
  transmission?: string;
  drive_type?: string;
  fuel_type?: string;
  mpg?: string;
  mpge?: string;
  // Additional fields
  height_type?: string;
  axle_description?: string;
  rear_wheels?: "SRW" | "DRW";
  battery_voltage?: number;
  torque_ftlbs?: number;
  horsepower?: number;
  mpg_city?: number;
  mpg_highway?: number;
  length_inches?: number;
  width_inches?: number;
  height_inches?: number;
  base_curb_weight_lbs?: number;
  seating_capacity?: number;
  
  // GAWR (CRITICAL for commercial vehicles)
  gawr_front_lbs?: number;
  gawr_rear_lbs?: number;
  
  // Towing
  towing_capacity_lbs?: number;
  
  // Fuel
  fuel_tank_capacity_gallons?: number;
  
  // Technology & Safety
  bluetooth_capable?: boolean;
  backup_camera?: boolean;
  tpms?: boolean;
  
  data_source?: "vin_decode_nhtsa" | "vin_decode_epa" | "vin_decode_both" | "dealer_manual_entry" | "admin_curated";
  enrichment_metadata?: {
    nhtsaConfidence?: "high" | "medium" | "low";
    epaAvailable?: boolean;
    decodedAt?: string;
    dataSources?: string[];
    fieldsFromNHTSA?: string[];
    fieldsFromEPA?: string[];
    fieldsManual?: string[];
    decodedVIN?: string;
    year?: number;
    make?: string;
    model?: string;
  };
  created_at: Date;
  updated_at: Date;
}

export interface StandardOption {
  id: number;
  name: string;
  category?: string;
  description?: string;
}

export interface Option {
  id: number;
  name: string;
  category?: string;
  description?: string;
  is_standard: boolean;
}

export interface VehicleConfigOption {
  id: number;
  vehicle_config_id: number;
  option_id: number;
  is_standard: boolean;
}

// ============ Schema 04: Equipment Data ============

export interface Equipment {
  id: number;
  manufacturer: string;
  product_line?: string;
  equipment_type: string;
  data_source?: "dealer_input" | "admin_curated";
  created_by_dealer_id?: number;
  needs_verification?: boolean;
  confidence_score?: number;
  created_at: Date;
  updated_at: Date;
}

export interface EquipmentConfig {
  id: number;
  equipment_id: number;
  length_inches?: number;
  height_inches?: number;
  width_inches?: number;
  weight_lbs?: number;
  material?: string;
  door_configuration?: string;
  compartment_count?: number;
  has_interior_lighting?: boolean;
  has_exterior_lighting?: boolean;
  compatible_gvwr_min?: number;
  compatible_gvwr_max?: number;
  compatible_chassis_classes?: string[];
  compatible_cab_types?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface StandardFeature {
  id: number;
  name: string;
  category?: string;
  description?: string;
}

export interface EquipmentOption {
  id: number;
  name: string;
  category?: string;
  description?: string;
  is_standard: boolean;
}

export interface EquipmentConfigOption {
  id: number;
  equipment_config_id: number;
  option_id: number;
  is_standard: boolean;
}

// ============ Schema 05: Completed Unit Configuration ============

export interface CompleteConfiguration {
  id: number;
  vehicle_config_id: number;
  equipment_config_id: number;
  vin?: string;
  configuration_type: "stock_unit" | "custom_build" | "spec_unit";
  total_weight?: number;
  total_combined_weight_lbs?: number;
  payload_capacity_remaining_lbs?: number;
  gvwr_compliant: boolean;
  front_gawr_compliant?: boolean;
  rear_gawr_compliant?: boolean;
  asking_price?: number;
  owner_type?: string;
  owner_id?: number;
  owner_name?: string;
  created_by_dealer_id?: number;
  created_at: Date;
  updated_at: Date;
}

export interface ChassisEquipmentCompatibility {
  id: number;
  vehicle_config_id: number;
  equipment_config_id: number;
  is_compatible?: boolean;
  compatibility_status?: "compatible" | "needs_review" | "incompatible";
  payload_remaining_lbs?: number;
  gvwr_compliant?: boolean;
  gawr_compliant?: boolean;
  compatibility_notes?: string;
  is_verified: boolean;
  verified_by?: number;
  verified_at?: Date;
  notes?: string;
  created_at: Date;
}

