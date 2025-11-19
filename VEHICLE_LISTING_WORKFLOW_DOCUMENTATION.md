# Vehicle Listing Creation Workflow - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authorization & Profile References](#authorization--profile-references)
3. [Frontend Workflow](#frontend-workflow)
4. [Backend Processing Flow](#backend-processing-flow)
5. [Complete Field Mappings](#complete-field-mappings)
6. [Database Schema References](#database-schema-references)
7. [VIN Decode Integration](#vin-decode-integration)
8. [Error Handling](#error-handling)

---

## Overview

The vehicle listing creation workflow is a multi-step process that:
1. Validates user authorization and profile setup
2. Creates/finds vehicle records in the catalog (Schema 03)
3. Optionally creates/finds equipment records (Schema 04)
4. Calculates vehicle-equipment compatibility (Schema 05)
5. Creates a complete configuration (Schema 05)
6. Creates the dealer listing (Schema 02a)
7. Uploads listing images (Schema 02a)

**Key Files:**
- Frontend: `client/src/components/listings/CreateListingForm.tsx`
- Backend Router: `server/routers.ts` (dealer.listings.create mutation)
- Smart Routing: `server/lib/database/smart-routing.ts`
- Authorization: `server/lib/database/smart-routing.ts` (canUserCreateListings, verifyUserPermission)

---

## Authorization & Profile References

### Profile Data Sources

The system uses multiple sources to verify user authorization and retrieve profile data:

#### 1. User Profile Check (Frontend)
**Location:** `client/src/components/auth/ProtectedRoute.tsx`

Checks performed:
- `profile.organization_id` from `useAuth()` hook
- `organizationData` from `trpc.user.getOrganization.useQuery()`
- `fullProfileData.organization` from `trpc.profile.get.useQuery()`

**Access Control:**
- User must be authenticated
- User must have an organization (checked via multiple sources)
- If `requireDealer={true}`, organization check is required

#### 2. Backend Authorization (Server)
**Location:** `server/routers.ts` (lines 1432-1641)

**Profile Data Retrieval Sequence:**

1. **Primary Source: `get_current_user_profile` RPC**
   ```typescript
   const { data: profileData } = await supabase.rpc('get_current_user_profile');
   const profile = Array.isArray(profileData) ? profileData[0] : profileData;
   ```
   - Extracts: `organization_id`, `organization.name`, `role`, `dealer.id`
   - Source: `"01. Organization".organization_users` joined with `organizations` and `dealers`

2. **Fallback: `get_user_dealer_id` RPC**
   ```typescript
   const { data, error } = await supabase.rpc('get_user_dealer_id');
   ```
   - Returns dealer ID directly
   - Source: `"02a. Dealership".dealers` table

3. **Fallback: Direct Query by Organization**
   ```typescript
   const dealers = await querySchemaTable("02a. Dealership", "dealers", {
     where: { organization_id: organizationId }
   });
   ```
   - Queries dealer table directly using organization_id

4. **Fallback: Query `organization_users` Table**
   ```typescript
   const orgUsers = await querySchemaTable("01. Organization", "organization_users", {
     where: { user_id: ctx.supabaseUser.id }
   });
   ```
   - Gets organization_id from organization_users relationship

**Profile Validation Checks:**

| Check | Field | Source | Action if Missing |
|-------|-------|--------|-------------------|
| Organization exists | `organization_id` | RPC or organization_users | Block with error message |
| Organization active | `organization.status` | organizations table | Block if not 'active' |
| Organization completion | `organization.profile_completion_percentage` | organizations table | Warn if < 50% |
| Dealer exists | `dealer.id` | dealers table | Auto-create if org exists, else block |
| Dealer completion | `dealer.profile_completion_percentage` | dealers table | Warn if < 50% |
| User role | `role` | organization_users table | Block if 'viewer' |

**Auto-Creation:**
- If organization exists but dealer doesn't: Calls `ensure_dealer_for_current_user()` RPC
- Function location: `supabase/migrations/20250117_create_ensure_dealer_functions.sql`

#### 3. Authorization Functions

**Location:** `server/lib/database/smart-routing.ts`

**Functions:**
- `canUserCreateListings(supabase)` - Checks if user can create listings
  - Uses: `"01. Organization".user_can_create_listings()` RPC
  - Validates: organization exists, dealer exists, role is not 'viewer', org/dealer are active
- `getCurrentDealerId(supabase)` - Gets dealer ID for current user
  - Uses: `get_user_dealer_id()` RPC
- `getCurrentOrganizationId(supabase)` - Gets organization ID for current user
  - Uses: `"01. Organization".get_user_organization_id()` RPC
- `verifyUserPermission(supabase, organizationId, requiredRole)` - Verifies user has required role
  - Queries: `"01. Organization".organization_users` table
  - Checks role hierarchy: owner (4) > admin (3) > member (2) > viewer (1)

---

## Frontend Workflow

### Form Structure

**Location:** `client/src/components/listings/CreateListingForm.tsx`

**Steps:**
1. **Listing Type** - Stock unit vs Build to order (currently only stock_unit enabled)
2. **Vehicle Information** - VIN, year, make, model, specs
3. **Equipment Information** - Optional equipment details
4. **Pricing & Details** - Price, condition, description, location
5. **Photos** - Image upload
6. **Review & Submit** - Final review before submission

### Form Schema

**Location:** `client/src/components/listings/CreateListingForm.tsx` (lines 35-205)

All fields are optional in the form (no required validations), but the backend may enforce requirements based on schema constraints.

### VIN Decode Integration

**Location:** `client/src/components/listings/CreateListingForm.tsx` (lines 300-500)

**Process:**
1. User enters 17-character VIN
2. Form calls `trpc.dealer.listings.decodeVin.useMutation()`
3. VIN decode returns enriched data from:
   - NHTSA API (vehicle specifications)
   - EPA API (fuel economy data)
4. Form auto-populates fields from decoded data
5. Enriched data is cached and passed to backend on submit

**Enriched Data Structure:**
```typescript
{
  data: {
    year, make, model, bodyStyle, wheelbase, gvwr, payload, engine, transmission, driveType,
    // ... all vehicle specs
  },
  dataSources: ['nhtsa', 'epa'],
  nhtsaConfidence: 'high' | 'medium' | 'low',
  epaAvailable: boolean
}
```

### Form Submission

**Location:** `client/src/components/listings/CreateListingForm.tsx` (lines 556-592)

**Process:**
1. Form validates using Zod schema
2. Retrieves enriched data from cache (if VIN was decoded)
3. Calls `trpc.dealer.listings.create.useMutation()`
4. Passes form data + enriched data to backend
5. Handles success/error responses

---

## Backend Processing Flow

### Entry Point

**Location:** `server/routers.ts` (line 1432)

**Mutation:** `dealer.listings.create`

### Processing Steps

#### Step 0: Authorization & Profile Validation

**Location:** `server/routers.ts` (lines 1457-1641)

**Process:**
1. Get user profile via `get_current_user_profile` RPC
2. Extract: `organizationId`, `dealerId`, `userRole`, `orgStatus`, completion percentages
3. Validate organization exists and is active
4. Validate dealer exists (auto-create if missing)
5. Validate user role (block if 'viewer')
6. Log warnings for incomplete profiles but allow continuation

**Auto-Creation:**
- If `organizationId` exists but `dealerId` is missing:
  - Calls `ensure_dealer_for_current_user()` RPC
  - Creates dealer record linked to organization
  - Function: `supabase/migrations/20250117_create_ensure_dealer_functions.sql`

#### Step 1: Vehicle Creation

**Location:** `server/lib/database/smart-routing.ts` (lines 295-453)

**Function:** `findOrCreateVehicle(supabase, dealerId, formData, enrichedData)`

**Process:**
1. Search for existing `vehicle` by: `year`, `make_name`, `model_name`
2. If not found, create new `vehicle` record
3. Search for existing `vehicle_config` by: `vehicle_id`, `wheelbase` (±1"), `body_style`, `drive_type`, `gvwr` (±100 lbs)
4. If not found, create new `vehicle_config` with all available fields
5. Returns `vehicle_config_id`

**Data Priority:**
- VIN decode data takes precedence over form input
- Form input used as fallback if VIN decode unavailable

**Tables:**
- `"03. Vehicle Data".vehicle` - Base vehicle (year, make, model, series)
- `"03. Vehicle Data".vehicle_config` - Vehicle configuration (all specs)

#### Step 2: Equipment Creation (Optional)

**Location:** `server/lib/database/smart-routing.ts` (lines 459-619)

**Function:** `findOrCreateEquipment(supabase, dealerId, formData)`

**Process:**
1. Check if `hasEquipment = true` and `equipmentUpfitterName` exists
2. Search for existing `equipment` by: `upfitter_name`, `product_line`
3. If not found, create new `equipment` record
4. Search for existing `equipment_config` by: `equipment_id`, dimensions (±6"), weight (±100 lbs)
5. If not found, create new `equipment_config` with all available fields
6. Returns `equipment_config_id` or `null`

**Tables:**
- `"04. Equipment Data".equipment` - Base equipment (upfitter, product line, model)
- `"04. Equipment Data".equipment_config` - Equipment configuration (all specs)

#### Step 3: Compatibility Check

**Location:** `server/lib/database/smart-routing.ts` (lines 644-732)

**Function:** `ensureCompatibility(supabase, vehicleConfigId, equipmentConfigId)`

**Process:**
1. Only runs if `equipmentConfigId` is not null
2. Check if compatibility record already exists
3. Fetch vehicle and equipment configs
4. Calculate compatibility using `calculateCompatibility()` function
5. Create `chassis_equipment_compatibility` record with:
   - `is_compatible` (boolean)
   - `compatibility_status` ('compatible', 'incompatible', 'needs_review')
   - `payload_remaining_lbs` (calculated)
   - `gvwr_compliant` (boolean)
   - `gawr_compliant` (boolean)
   - `compatibility_notes` (warnings if any)

**Table:**
- `"05. Completed Unit Configuration".chassis_equipment_compatibility`

#### Step 4: Complete Configuration

**Location:** `server/lib/database/smart-routing.ts` (lines 737-827)

**Function:** `createCompleteConfiguration(supabase, dealerId, vehicleConfigId, equipmentConfigId, formData, organizationId)`

**Process:**
1. Determine `configuration_type` from `listingType`:
   - `"stock_unit"` → `"stock_unit"`
   - `"build_to_order"` → `"custom_build"`
2. Fetch vehicle and equipment configs
3. Calculate compliance (GVWR, GAWR, payload)
4. Get dealer info for `owner_name`
5. Create `complete_configurations` record

**Table:**
- `"05. Completed Unit Configuration".complete_configurations`

**Key Fields:**
- `vehicle_config_id` (FK)
- `equipment_config_id` (FK, nullable)
- `vin` (from form)
- `configuration_type`
- `total_combined_weight_lbs` (calculated)
- `payload_capacity_remaining_lbs` (calculated)
- `gvwr_compliant` (calculated)
- `front_gawr_compliant` (calculated)
- `rear_gawr_compliant` (calculated)
- `owner_type` = 'dealer'
- `owner_id` = organizationId
- `owner_name` = dealer name
- `created_by_dealer_id` = dealerId

#### Step 5: Listing Creation

**Location:** `server/lib/database/smart-routing.ts` (lines 832-901)

**Function:** `createDealerListing(supabase, dealerId, completeConfigId, formData)`

**Process:**
1. Determine `status` based on `condition`:
   - `"new"` or `"demo"` → `"available"`
   - All others → `"draft"`
2. Parse `keyHighlights` (split by newline if string)
3. Create `vehicle_listings` record
4. Create `listing_images` records (one per photo URL)

**Tables:**
- `"02a. Dealership".vehicle_listings`
- `"02a. Dealership".listing_images`

#### Step 6: Master Orchestration

**Location:** `server/lib/database/smart-routing.ts` (lines 908-1024)

**Function:** `createListingFromDealerInput(supabase, dealerId, formData, enrichedData)`

**Process:**
1. Verify authorization (`canUserCreateListings`)
2. Get dealer ID (if not provided)
3. Get organization ID
4. Verify user permissions
5. Execute steps 1-5 in sequence
6. Return result with created IDs

**Return Value:**
```typescript
{
  success: boolean,
  listingId?: number,
  vehicleConfigId?: number,
  equipmentConfigId?: number | null,
  completeConfigurationId?: number,
  errors?: string[],
  createdEntries?: {
    vehicle?: boolean,
    vehicleConfig?: boolean,
    equipment?: boolean,
    equipmentConfig?: boolean,
    completeConfiguration?: boolean,
    listing?: boolean
  }
}
```

---

## Complete Field Mappings

### Vehicle Fields

#### Form → Database Mapping

| Form Field | Database Table | Database Column | Type | Notes |
|------------|----------------|-----------------|------|-------|
| `year` | `vehicle` | `year` | integer | Required, 2000-2099 |
| `make` | `vehicle` | `make_name` | varchar | Required |
| `model` | `vehicle` | `model_name` | varchar | Required |
| `series` | `vehicle` | `series_name` | varchar | Optional |
| `bodyStyle` | `vehicle_config` | `body_style` | varchar | From form or VIN decode |
| `fuelType` | `vehicle_config` | `fuel_type` | varchar | Enum: gasoline, diesel, electric, hybrid, cng, propane |
| `wheelbase` | `vehicle_config` | `wheelbase_inches` | numeric | From form or VIN decode |
| `gvwr` | `vehicle_config` | `gvwr_lbs` | integer | From form or VIN decode |
| `payload` | `vehicle_config` | `payload_capacity_lbs` | integer | From form or VIN decode |
| `engineDescription` | `vehicle_config` | `engine_description` | varchar | From form or VIN decode |
| `transmission` | `vehicle_config` | `transmission` | varchar | From form or VIN decode |
| `driveType` | `vehicle_config` | `drive_type` | varchar | Enum: RWD, AWD, 4WD, FWD |
| `heightType` | `vehicle_config` | `height_type` | varchar | From VIN decode |
| `axleDescription` | `vehicle_config` | `axle_description` | varchar | From VIN decode |
| `rearWheels` | `vehicle_config` | `rear_wheels` | varchar | Enum: SRW, DRW |
| `batteryVoltage` | `vehicle_config` | `battery_voltage` | numeric | From VIN decode |
| `torqueFtLbs` | `vehicle_config` | `torque_ftlbs` | integer | From VIN decode |
| `horsepower` | `vehicle_config` | `horsepower` | integer | From VIN decode |
| `mpgCity` | `vehicle_config` | `mpg_city` | numeric | From VIN decode (EPA) |
| `mpgHighway` | `vehicle_config` | `mpg_highway` | numeric | From VIN decode (EPA) |
| `mpge` | `vehicle_config` | `mpge` | integer | From VIN decode (EPA) |
| `lengthInches` | `vehicle_config` | `length_inches` | numeric | From VIN decode |
| `widthInches` | `vehicle_config` | `width_inches` | numeric | From VIN decode |
| `heightInches` | `vehicle_config` | `height_inches` | numeric | From VIN decode |
| `baseCurbWeightLbs` | `vehicle_config` | `base_curb_weight_lbs` | integer | From VIN decode |
| `seatingCapacity` | `vehicle_config` | `seating_capacity` | integer | From VIN decode |
| `gawrFront` | `vehicle_config` | `gawr_front_lbs` | integer | From VIN decode (NHTSA) |
| `gawrRear` | `vehicle_config` | `gawr_rear_lbs` | integer | From VIN decode (NHTSA) |
| `towingCapacity` | `vehicle_config` | `towing_capacity_lbs` | integer | From VIN decode |
| `fuelTankCapacity` | `vehicle_config` | `fuel_tank_capacity_gallons` | numeric | From VIN decode |
| `backupCamera` | `vehicle_config` | `backup_camera` | boolean | From VIN decode |
| `bluetoothCapable` | `vehicle_config` | `bluetooth_capable` | boolean | From VIN decode |
| `tpms` | `vehicle_config` | `tpms` | boolean | From VIN decode |

**Additional vehicle_config fields (auto-set):**
- `vehicle_id` (FK to vehicle table)
- `data_source` ('dealer_manual_entry', 'vin_decode_nhtsa', 'vin_decode_epa', 'vin_decode_both')
- `enrichment_metadata` (JSONB with VIN decode metadata)

### Equipment Fields

#### Form → Database Mapping

| Form Field | Database Table | Database Column | Type | Notes |
|------------|----------------|-----------------|------|-------|
| `equipmentUpfitterName` or `equipmentManufacturer` | `equipment` | `upfitter_name` | varchar | Required if hasEquipment=true |
| `equipmentProductLine` | `equipment` | `product_line` | varchar | Required, defaults to "Unknown" |
| `equipmentModelName` | `equipment` | `model_name` | varchar | Required, defaults to "Unknown" |
| `equipmentType` | `equipment` | `equipment_type` | varchar | Required, defaults to "other" |
| `equipmentSubtype` | `equipment` | `equipment_subtype` | varchar | Optional |
| `equipmentPrimaryMaterial` or `equipmentMaterial` | `equipment` | `primary_material` | varchar | Required, defaults to "steel" |
| `equipmentBodyCategory` | `equipment` | `body_category` | varchar | Optional |
| `equipmentApplicationType` | `equipment` | `application_type` | varchar | Optional |
| `equipmentStartingMsrp` | `equipment` | `starting_msrp` | numeric | Optional |
| `equipmentMarketingDescription` | `equipment` | `marketing_description` | text | Optional |
| `equipmentConfigName` | `equipment_config` | `config_name` | varchar | Required, auto-generated if not provided |
| `equipmentConfigCode` | `equipment_config` | `config_code` | varchar | Optional |
| `equipmentModelNumber` | `equipment_config` | `model_number` | varchar | Optional |
| `equipmentLength` | `equipment_config` | `length_inches` | numeric | Required in schema, optional in form |
| `equipmentWidth` | `equipment_config` | `width_inches` | numeric | Required in schema, optional in form |
| `equipmentHeight` | `equipment_config` | `height_inches` | numeric | Required in schema, optional in form |
| `equipmentInteriorLength` | `equipment_config` | `interior_length_inches` | numeric | Optional |
| `equipmentInteriorWidth` | `equipment_config` | `interior_width_inches` | numeric | Optional |
| `equipmentInteriorHeight` | `equipment_config` | `interior_height_inches` | numeric | Optional |
| `equipmentUsableVolumeCubicFeet` | `equipment_config` | `usable_volume_cubic_feet` | numeric | Optional |
| `equipmentWeight` | `equipment_config` | `equipment_weight_lbs` | integer | Required in schema, optional in form |
| `equipmentMaximumPayload` | `equipment_config` | `maximum_payload_lbs` | integer | Optional |
| `equipmentMinimumCabToAxle` | `equipment_config` | `minimum_cab_to_axle_inches` | numeric | Optional |
| `equipmentMaximumCabToAxle` | `equipment_config` | `maximum_cab_to_axle_inches` | numeric | Optional |
| `equipmentRecommendedCabToAxle` | `equipment_config` | `recommended_cab_to_axle_inches` | numeric | Optional |
| `equipmentMountingType` | `equipment_config` | `mounting_type` | varchar | Optional |
| `equipmentRequiresSubframe` | `equipment_config` | `requires_subframe` | boolean | Defaults to false |
| `equipmentCompatibleGvwrMin` | `equipment_config` | `compatible_gvwr_min` | integer | Optional |
| `equipmentCompatibleGvwrMax` | `equipment_config` | `compatible_gvwr_max` | integer | Optional |
| `equipmentMaterial` | `equipment_config` | `material` | varchar | Required, defaults to primary_material or "steel" |
| `equipmentGaugeThickness` | `equipment_config` | `gauge_thickness` | varchar | Optional |
| `equipmentCoatingFinish` | `equipment_config` | `coating_finish` | varchar | Optional |
| `equipmentCorrosionProtection` | `equipment_config` | `corrosion_protection` | varchar | Optional |
| `equipmentToolCompartmentVolume` | `equipment_config` | `tool_compartment_volume_cubic_feet` | numeric | Optional |
| `equipmentDoorStyle` | `equipment_config` | `door_style` | varchar | Optional |
| `equipmentLockingMechanism` | `equipment_config` | `locking_mechanism` | varchar | Optional |
| `equipmentDoorConfiguration` or `doorConfiguration` | `equipment_config` | `door_configuration` | varchar | Optional |
| `equipmentCompartmentCount` or `compartmentCount` | `equipment_config` | `compartment_count` | integer | Optional |
| `equipmentDrawerCount` | `equipment_config` | `drawer_count` | integer | Optional |
| `equipmentShelfCount` | `equipment_config` | `shelf_count` | integer | Optional |
| `equipmentHasInteriorLighting` or `hasInteriorLighting` | `equipment_config` | `has_interior_lighting` | boolean | Defaults to false |
| `equipmentHasExteriorLighting` or `hasExteriorLighting` | `equipment_config` | `has_exterior_lighting` | boolean | Defaults to false |
| `equipmentHasPowerOutlets` | `equipment_config` | `has_power_outlets` | boolean | Defaults to false |
| `equipmentElectricalSystemVoltage` | `equipment_config` | `electrical_system_voltage` | integer | Optional |
| `equipmentHasCraneProvisions` | `equipment_config` | `has_crane_provisions` | boolean | Defaults to false |
| `equipmentCraneMountingLocation` | `equipment_config` | `crane_mounting_location` | varchar | Optional |
| `equipmentMaxCraneCapacity` | `equipment_config` | `max_crane_capacity_lbs` | integer | Optional |
| `equipmentHasLadderRackProvisions` | `equipment_config` | `has_ladder_rack_provisions` | boolean | Defaults to false |
| `equipmentLadderRackType` | `equipment_config` | `ladder_rack_type` | varchar | Optional |
| `equipmentHasStakePockets` | `equipment_config` | `has_stake_pockets` | boolean | Defaults to false |
| `equipmentHasTieDowns` | `equipment_config` | `has_tie_downs` | boolean | Defaults to false |
| `equipmentTieDownCount` | `equipment_config` | `tie_down_count` | integer | Optional |
| `equipmentFrontAxleWeightDistribution` | `equipment_config` | `front_axle_weight_distribution_lbs` | integer | Optional |
| `equipmentRearAxleWeightDistribution` | `equipment_config` | `rear_axle_weight_distribution_lbs` | integer | Optional |
| `equipmentCenterOfGravityFromRearAxle` | `equipment_config` | `center_of_gravity_from_rear_axle_inches` | numeric | Optional |
| `equipmentBaseMsrp` | `equipment_config` | `base_msrp` | numeric | Optional |
| `equipmentDealerCost` | `equipment_config` | `dealer_cost` | numeric | Optional |
| `equipmentInstallationLaborHours` | `equipment_config` | `installation_labor_hours` | numeric | Optional |
| `equipmentEstimatedInstallationCost` | `equipment_config` | `estimated_installation_cost` | numeric | Optional |
| `equipmentLeadTimeDays` | `equipment_config` | `lead_time_days` | integer | Defaults to 30 |
| `equipmentMinimumOrderQuantity` | `equipment_config` | `minimum_order_quantity` | integer | Defaults to 1 |
| `equipmentMeetsFmvss` | `equipment_config` | `meets_fmvss` | boolean | Defaults to true |
| `equipmentFmvssComplianceNotes` | `equipment_config` | `fmvss_compliance_notes` | text | Optional |
| `equipmentDotApproved` | `equipment_config` | `dot_approved` | boolean | Defaults to true |
| `equipmentNotes` | `equipment_config` | `notes` | text | Optional |

**Additional equipment_config fields (auto-set):**
- `equipment_id` (FK to equipment table)
- `is_active` = true
- `is_in_stock` = false

### Listing Fields

#### Form → Database Mapping

| Form Field | Database Table | Database Column | Type | Notes |
|------------|----------------|-----------------|------|-------|
| `listingType` | `complete_configurations` | `configuration_type` | varchar | Enum: stock_unit, custom_build |
| `vin` | `vehicle_listings` + `complete_configurations` | `vin` | varchar | 17 characters, validated |
| `askingPrice` | `vehicle_listings` | `asking_price` | numeric | Required, must be >= 0 |
| `specialPrice` | `vehicle_listings` | `special_price` | numeric | Optional, must be < askingPrice |
| `stockNumber` | `vehicle_listings` | `stock_number` | varchar | Optional |
| `condition` | `vehicle_listings` | `condition` | varchar | Enum: new, used, certified_pre_owned, demo (certified_pre_owned stored as "used") |
| `mileage` | `vehicle_listings` | `mileage` | integer | Optional, must be >= 0 |
| `exteriorColor` | `vehicle_listings` | `exterior_color` | varchar | Optional |
| `interiorColor` | `vehicle_listings` | `interior_color` | varchar | Optional |
| `description` | `vehicle_listings` | `listing_description` | text | Optional |
| `locationCity` | `vehicle_listings` | `location_city` | varchar | Optional |
| `locationState` | `vehicle_listings` | `location_state` | varchar | Optional |
| `priceType` | `vehicle_listings` | `price_type` | varchar | Enum: negotiable, fixed, call_for_price (defaults to "negotiable") |
| `paintCondition` | `vehicle_listings` | `paint_condition` | varchar | Enum: excellent, good, fair, poor |
| `interiorCondition` | `vehicle_listings` | `interior_condition` | varchar | Enum: excellent, good, fair, poor |
| `listingTitle` | `vehicle_listings` | `listing_title` | varchar | Optional |
| `keyHighlights` | `vehicle_listings` | `key_highlights` | text[] | Array, parsed from newline-separated string |
| `marketingHeadline` | `vehicle_listings` | `marketing_headline` | varchar | Optional |
| `isFeatured` | `vehicle_listings` | `is_featured` | boolean | Defaults to false |
| `isHotDeal` | `vehicle_listings` | `is_hot_deal` | boolean | Defaults to false |
| `photos[]` | `listing_images` | `image_url` | varchar | One row per photo URL |
| `photos[0]` | `listing_images` | `is_primary` | boolean | Set to true for first photo |

**Additional vehicle_listings fields (auto-set):**
- `dealer_id` (from user context)
- `complete_configuration_id` (FK to complete_configurations)
- `organization_id` (from user context)
- `status` (auto-set: "available" for new/demo, "draft" otherwise)
- `view_count` = 0
- `is_clearance` = false
- `warranty_type` = null
- `warranty_expires_at` = null
- `previous_owners` = null
- `accident_history` = null

**Additional listing_images fields (auto-set):**
- `listing_id` (FK to vehicle_listings)
- `sort_order` (array index: 0, 1, 2, ...)
- `display_order` (array index)
- `is_featured` = false
- `uploaded_at` = now()

---

## Database Schema References

### Schema 01: Organization

**Tables Used:**
- `organization_users` - Links users to organizations
- `organizations` - Organization details

**Key Fields:**
- `organization_users.user_id` → Links to `auth.users.id`
- `organization_users.organization_id` → Links to `organizations.id`
- `organization_users.role` → 'owner', 'admin', 'member', 'viewer'
- `organization_users.status` → 'active', 'pending', 'suspended', 'removed'
- `organizations.status` → 'active', 'pending', 'suspended'
- `organizations.profile_completion_percentage` → 0-100

**RPC Functions:**
- `get_current_user_profile()` - Returns user profile with organization and dealer data
- `"01. Organization".user_can_create_listings()` - Checks if user can create listings
- `"01. Organization".get_user_organization_id()` - Gets organization ID for current user

### Schema 02a: Dealership

**Tables Used:**
- `dealers` - Dealer records linked to organizations
- `vehicle_listings` - Dealer vehicle listings
- `listing_images` - Images for listings

**Key Fields:**
- `dealers.organization_id` → Links to `organizations.id`
- `dealers.profile_completion_percentage` → 0-100
- `vehicle_listings.dealer_id` → Links to `dealers.id`
- `vehicle_listings.complete_configuration_id` → Links to `complete_configurations.id`
- `vehicle_listings.organization_id` → Links to `organizations.id`
- `listing_images.listing_id` → Links to `vehicle_listings.id`

**RPC Functions:**
- `get_user_dealer_id()` - Gets dealer ID for current user
- `ensure_dealer_for_current_user()` - Auto-creates dealer record if missing

### Schema 03: Vehicle Data

**Tables Used:**
- `vehicle` - Base vehicle (year, make, model)
- `vehicle_config` - Vehicle configuration (all specs)

**Key Fields:**
- `vehicle.year`, `vehicle.make_name`, `vehicle.model_name` - Base identification
- `vehicle_config.vehicle_id` → Links to `vehicle.id`
- `vehicle_config.data_source` → 'dealer_manual_entry', 'vin_decode_nhtsa', 'vin_decode_epa', 'vin_decode_both'
- `vehicle_config.enrichment_metadata` → JSONB with VIN decode metadata

### Schema 04: Equipment Data

**Tables Used:**
- `equipment` - Base equipment (upfitter, product line, model)
- `equipment_config` - Equipment configuration (all specs)

**Key Fields:**
- `equipment.upfitter_name`, `equipment.product_line`, `equipment.model_name` - Base identification
- `equipment_config.equipment_id` → Links to `equipment.id`

### Schema 05: Completed Unit Configuration

**Tables Used:**
- `chassis_equipment_compatibility` - Vehicle-equipment compatibility records
- `complete_configurations` - Complete vehicle+equipment configurations

**Key Fields:**
- `chassis_equipment_compatibility.vehicle_config_id` → Links to `vehicle_config.id`
- `chassis_equipment_compatibility.equipment_config_id` → Links to `equipment_config.id`
- `chassis_equipment_compatibility.compatibility_status` → 'compatible', 'incompatible', 'needs_review'
- `complete_configurations.vehicle_config_id` → Links to `vehicle_config.id`
- `complete_configurations.equipment_config_id` → Links to `equipment_config.id` (nullable)
- `complete_configurations.owner_id` → Links to `organizations.id`
- `complete_configurations.created_by_dealer_id` → Links to `dealers.id`

---

## VIN Decode Integration

### Frontend VIN Decode

**Location:** `client/src/components/listings/CreateListingForm.tsx`

**Process:**
1. User enters 17-character VIN
2. Form calls `trpc.dealer.listings.decodeVin.useMutation()`
3. Backend calls VIN decode service
4. Returns enriched data from NHTSA and EPA APIs
5. Form auto-populates fields
6. Enriched data cached for submission

### Backend VIN Decode

**Location:** `server/routers.ts` (dealer.listings.decodeVin mutation)

**Services:**
- `server/lib/services/vin-decoder.ts` - NHTSA VIN decode
- `server/lib/services/epa-fuel-economy.ts` - EPA fuel economy data
- `server/lib/services/vehicle-data-enrichment.ts` - Combines NHTSA + EPA data

**Enriched Data Structure:**
```typescript
{
  year: number,
  make: string,
  model: string,
  bodyStyle?: string,
  wheelbase?: number,
  gvwr?: number,
  payloadCapacity?: number,
  engineDescription?: string,
  transmission?: string,
  driveType?: string,
  fuelTypePrimary?: string,
  // ... all vehicle specs
  dataSources: ['nhtsa', 'epa'],
  nhtsaConfidence: 'high' | 'medium' | 'low',
  epaAvailable: boolean
}
```

**Data Priority:**
- VIN decode data takes precedence over form input
- Form input used as fallback if VIN decode unavailable
- Both sources merged in `findOrCreateVehicle()` function

---

## Error Handling

### Frontend Error Handling

**Location:** `client/src/components/listings/CreateListingForm.tsx`

**Process:**
1. Form validation errors shown inline
2. Submission errors shown via toast notification
3. User-friendly error messages mapped from backend errors

### Backend Error Handling

**Location:** `server/routers.ts` (lines 1653-1689)

**Error Mapping:**
- "Dealer record not found" → "Your dealer account is not set up. Please contact support."
- "organization" → "Organization setup issue. Please contact support."
- "permission" → "You don't have permission to create listings. Please contact your organization administrator."
- "VIN" or "vin" → "There was an issue processing the VIN. Please verify the VIN is correct."
- "vehicle" or "Vehicle" → "There was an issue creating the vehicle record. Please try again."
- "equipment" or "Equipment" → "There was an issue processing the equipment information. Please check your equipment details."
- "compatibility" or "Compatibility" → "The vehicle and equipment combination may not be compatible. Please review your specifications."

**Validation Errors:**
- Organization not found → Block with message
- Organization not active → Block with message
- Dealer not found → Auto-create if org exists, else block
- User role is 'viewer' → Block with message
- Profile completion < 50% → Warn but continue

**Transaction Safety:**
- If any step fails, partial records are not created
- Errors are logged with full context
- User receives friendly error message

---

## Summary

The vehicle listing creation workflow is a comprehensive multi-schema process that:

1. **Validates Authorization** - Checks user profile, organization, dealer, and permissions
2. **Creates Vehicle Records** - Finds or creates vehicle and vehicle_config in Schema 03
3. **Creates Equipment Records** - Optionally finds or creates equipment and equipment_config in Schema 04
4. **Calculates Compatibility** - Creates compatibility record in Schema 05 if equipment exists
5. **Creates Complete Configuration** - Links vehicle + equipment in Schema 05
6. **Creates Listing** - Creates dealer listing in Schema 02a with all details
7. **Uploads Images** - Creates listing_images records for each photo

All steps are orchestrated by `createListingFromDealerInput()` which ensures data integrity and proper error handling throughout the process.

---

*Last Updated: Based on current codebase analysis*
*Documentation Version: 1.0*


