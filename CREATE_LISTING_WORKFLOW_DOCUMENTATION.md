# Create Listing Workflow - Complete Field Mapping Documentation

## Overview

This document provides a complete mapping of every field in the Create Listing form to its corresponding Supabase database table and column. The workflow creates records across multiple schemas in a specific order.

## Workflow Steps

The create listing process follows this sequence:

1. **Authorization Check** - Verifies user has permission to create listings
2. **Vehicle Creation** - Creates/finds vehicle in Schema 03 (Vehicle Data)
3. **Equipment Creation** (if applicable) - Creates/finds equipment in Schema 04 (Equipment Data)
4. **Compatibility Check** - Creates compatibility record in Schema 05
5. **Complete Configuration** - Creates complete configuration in Schema 05
6. **Listing Creation** - Creates listing in Schema 02a (Dealership)
7. **Image Upload** - Creates listing images in Schema 02a

---

## Step 1: Authorization & Context

**No form fields** - System automatically retrieves:
- `dealer_id` from user's profile
- `organization_id` from user's organization

---

## Step 2: Vehicle Data (Schema 03: Vehicle Data)

### Table: `vehicle`

| Form Field | Database Column | Type | Notes |
|------------|----------------|------|-------|
| `year` | `year` | integer | Required, validated 2000-2099 |
| `make` | `make_name` | varchar | Required |
| `model` | `model_name` | varchar | Required |
| `series` | `series` | varchar | Optional |
| - | `data_source` | varchar | Set to "dealer_input" |
| - | `created_by_dealer_id` | bigint | From user context |
| - | `needs_verification` | boolean | Set to true |
| - | `confidence_score` | numeric | Set to 0.8 |

### Table: `vehicle_config`

| Form Field | Database Column | Type | Notes |
|------------|----------------|------|-------|
| `bodyStyle` | `body_style` | varchar | From form or VIN decode |
| `wheelbase` | `wheelbase_inches` | numeric | From form or VIN decode |
| `gvwr` | `gvwr_lbs` | integer | From form or VIN decode |
| `payload` | `payload_capacity_lbs` | integer | From form or VIN decode |
| `engineDescription` | `engine_description` | varchar | From form or VIN decode |
| `transmission` | `transmission` | varchar | From form or VIN decode |
| `driveType` | `drive_type` | varchar | Enum: RWD, AWD, 4WD, FWD |
| `fuelType` | `fuel_type` | varchar | Enum: gasoline, diesel, electric, hybrid, cng, propane |
| `heightType` | `height_type` | varchar | From VIN decode |
| `axleDescription` | `axle_description` | varchar | From VIN decode |
| `rearWheels` | `rear_wheels` | varchar | Enum: SRW, DRW |
| `batteryVoltage` | `battery_voltage` | numeric | From VIN decode |
| `torqueFtLbs` | `torque_ftlbs` | integer | From VIN decode |
| `horsepower` | `horsepower` | integer | From VIN decode |
| `mpgCity` | `mpg_city` | numeric | From VIN decode (EPA) |
| `mpgHighway` | `mpg_highway` | numeric | From VIN decode (EPA) |
| `mpge` | `mpge` | integer | From VIN decode (EPA) |
| `lengthInches` | `length_inches` | numeric | From VIN decode |
| `widthInches` | `width_inches` | numeric | From VIN decode |
| `heightInches` | `height_inches` | numeric | From VIN decode |
| `baseCurbWeightLbs` | `base_curb_weight_lbs` | integer | From VIN decode |
| `seatingCapacity` | `seating_capacity` | integer | From VIN decode |
| `gawrFront` | `gawr_front_lbs` | integer | From VIN decode (NHTSA) |
| `gawrRear` | `gawr_rear_lbs` | integer | From VIN decode (NHTSA) |
| `towingCapacity` | `towing_capacity_lbs` | integer | From VIN decode |
| `fuelTankCapacity` | `fuel_tank_capacity_gallons` | numeric | From VIN decode |
| `backupCamera` | `backup_camera` | boolean | From VIN decode |
| `bluetoothCapable` | `bluetooth_capable` | boolean | From VIN decode |
| `tpms` | `tpms` | boolean | From VIN decode |
| - | `vehicle_id` | bigint | FK to vehicle table |
| - | `data_source` | varchar | Set based on VIN decode sources |
| - | `enrichment_metadata` | jsonb | Contains VIN decode metadata |

**Note:** Fields can come from form input OR VIN decode. VIN decode takes precedence when available.

---

## Step 3: Equipment Data (Schema 04: Equipment Data) - Optional

### Table: `equipment`

| Form Field | Database Column | Type | Notes |
|------------|----------------|------|-------|
| `equipmentUpfitterName` or `equipmentManufacturer` | `upfitter_name` | varchar | Required if hasEquipment=true |
| `equipmentProductLine` | `product_line` | varchar | Required, defaults to "Unknown" |
| `equipmentModelName` | `model_name` | varchar | Required, defaults to "Unknown" |
| `equipmentType` | `equipment_type` | varchar | Required, defaults to "other" |
| `equipmentSubtype` | `equipment_subtype` | varchar | Optional |
| `equipmentPrimaryMaterial` or `equipmentMaterial` | `primary_material` | varchar | Required, defaults to "steel" |
| `equipmentBodyCategory` | `body_category` | varchar | Optional |
| `equipmentApplicationType` | `application_type` | varchar | Optional |
| `equipmentStartingMsrp` | `starting_msrp` | numeric | Optional |
| `equipmentMarketingDescription` | `marketing_description` | text | Optional |
| - | `status` | varchar | Set to "active" |

### Table: `equipment_config`

| Form Field | Database Column | Type | Notes |
|------------|----------------|------|-------|
| `equipmentConfigName` | `config_name` | varchar | Required, auto-generated if not provided |
| `equipmentConfigCode` | `config_code` | varchar | Optional |
| `equipmentModelNumber` | `model_number` | varchar | Optional |
| `equipmentLength` | `length_inches` | numeric | Required in schema, optional in form |
| `equipmentWidth` | `width_inches` | numeric | Required in schema, optional in form |
| `equipmentHeight` | `height_inches` | numeric | Required in schema, optional in form |
| `equipmentInteriorLength` | `interior_length_inches` | numeric | Optional |
| `equipmentInteriorWidth` | `interior_width_inches` | numeric | Optional |
| `equipmentInteriorHeight` | `interior_height_inches` | numeric | Optional |
| `equipmentUsableVolumeCubicFeet` | `usable_volume_cubic_feet` | numeric | Optional |
| `equipmentWeight` | `equipment_weight_lbs` | integer | Required in schema, optional in form |
| `equipmentMaximumPayload` | `maximum_payload_lbs` | integer | Optional |
| `equipmentMinimumCabToAxle` | `minimum_cab_to_axle_inches` | numeric | Optional |
| `equipmentMaximumCabToAxle` | `maximum_cab_to_axle_inches` | numeric | Optional |
| `equipmentRecommendedCabToAxle` | `recommended_cab_to_axle_inches` | numeric | Optional |
| `equipmentMountingType` | `mounting_type` | varchar | Optional |
| `equipmentRequiresSubframe` | `requires_subframe` | boolean | Defaults to false |
| `equipmentCompatibleGvwrMin` | `compatible_gvwr_min` | integer | Optional |
| `equipmentCompatibleGvwrMax` | `compatible_gvwr_max` | integer | Optional |
| `equipmentMaterial` | `material` | varchar | Required, defaults to primary_material or "steel" |
| `equipmentGaugeThickness` | `gauge_thickness` | varchar | Optional |
| `equipmentCoatingFinish` | `coating_finish` | varchar | Optional |
| `equipmentCorrosionProtection` | `corrosion_protection` | varchar | Optional |
| `equipmentToolCompartmentVolume` | `tool_compartment_volume_cubic_feet` | numeric | Optional |
| `equipmentDoorStyle` | `door_style` | varchar | Optional |
| `equipmentLockingMechanism` | `locking_mechanism` | varchar | Optional |
| `equipmentDoorConfiguration` or `doorConfiguration` | `door_configuration` | varchar | Optional |
| `equipmentCompartmentCount` or `compartmentCount` | `compartment_count` | integer | Optional |
| `equipmentDrawerCount` | `drawer_count` | integer | Optional |
| `equipmentShelfCount` | `shelf_count` | integer | Optional |
| `equipmentHasInteriorLighting` or `hasInteriorLighting` | `has_interior_lighting` | boolean | Defaults to false |
| `equipmentHasExteriorLighting` or `hasExteriorLighting` | `has_exterior_lighting` | boolean | Defaults to false |
| `equipmentHasPowerOutlets` | `has_power_outlets` | boolean | Defaults to false |
| `equipmentElectricalSystemVoltage` | `electrical_system_voltage` | integer | Optional |
| `equipmentHasCraneProvisions` | `has_crane_provisions` | boolean | Defaults to false |
| `equipmentCraneMountingLocation` | `crane_mounting_location` | varchar | Optional |
| `equipmentMaxCraneCapacity` | `max_crane_capacity_lbs` | integer | Optional |
| `equipmentHasLadderRackProvisions` | `has_ladder_rack_provisions` | boolean | Defaults to false |
| `equipmentLadderRackType` | `ladder_rack_type` | varchar | Optional |
| `equipmentHasStakePockets` | `has_stake_pockets` | boolean | Defaults to false |
| `equipmentHasTieDowns` | `has_tie_downs` | boolean | Defaults to false |
| `equipmentTieDownCount` | `tie_down_count` | integer | Optional |
| `equipmentFrontAxleWeightDistribution` | `front_axle_weight_distribution_lbs` | integer | Optional |
| `equipmentRearAxleWeightDistribution` | `rear_axle_weight_distribution_lbs` | integer | Optional |
| `equipmentCenterOfGravityFromRearAxle` | `center_of_gravity_from_rear_axle_inches` | numeric | Optional |
| `equipmentBaseMsrp` | `base_msrp` | numeric | Optional |
| `equipmentDealerCost` | `dealer_cost` | numeric | Optional |
| `equipmentInstallationLaborHours` | `installation_labor_hours` | numeric | Optional |
| `equipmentEstimatedInstallationCost` | `estimated_installation_cost` | numeric | Optional |
| `equipmentLeadTimeDays` | `lead_time_days` | integer | Defaults to 30 |
| `equipmentMinimumOrderQuantity` | `minimum_order_quantity` | integer | Defaults to 1 |
| `equipmentMeetsFmvss` | `meets_fmvss` | boolean | Defaults to true |
| `equipmentFmvssComplianceNotes` | `fmvss_compliance_notes` | text | Optional |
| `equipmentDotApproved` | `dot_approved` | boolean | Defaults to true |
| `equipmentNotes` | `notes` | text | Optional |
| - | `equipment_id` | bigint | FK to equipment table |
| - | `is_active` | boolean | Set to true |
| - | `is_in_stock` | boolean | Set to false |

---

## Step 4: Compatibility Check (Schema 05: Completed Unit Configuration)

### Table: `chassis_equipment_compatibility`

**No direct form fields** - Calculated automatically from vehicle_config and equipment_config:

| Calculated Field | Database Column | Type | Notes |
|-----------------|----------------|------|-------|
| - | `vehicle_config_id` | bigint | FK to vehicle_config |
| - | `equipment_config_id` | bigint | FK to equipment_config |
| - | `is_compatible` | boolean | Calculated from compatibility status |
| - | `compatibility_status` | varchar | Enum: compatible, incompatible, needs_review |
| - | `payload_remaining_lbs` | integer | Calculated: payload - equipment weight |
| - | `gvwr_compliant` | boolean | Calculated: total weight <= GVWR |
| - | `gawr_compliant` | boolean | Calculated: axle weights <= GAWR |
| - | `compatibility_notes` | text | Contains warnings if any |
| - | `is_verified` | boolean | Set to false (dealer input) |

**Note:** This step only runs if equipment is present (`hasEquipment = true`).

---

## Step 5: Complete Configuration (Schema 05: Completed Unit Configuration)

### Table: `complete_configurations`

| Form Field | Database Column | Type | Notes |
|------------|----------------|------|-------|
| `listingType` | `configuration_type` | varchar | Enum: stock_unit, build_to_order (mapped to custom_build) |
| `vin` | `vin` | varchar | Stored in complete_configuration |
| - | `vehicle_config_id` | bigint | FK to vehicle_config |
| - | `equipment_config_id` | bigint | FK to equipment_config (nullable) |
| - | `owner_type` | varchar | Set to "dealer" |
| - | `owner_name` | varchar | From dealer organization name |
| - | `build_status` | varchar | Set to "configured" |
| - | `is_complete` | boolean | Set to false |
| - | `total_combined_weight_lbs` | integer | Calculated from vehicle + equipment |
| - | `front_axle_weight_lbs` | integer | Calculated |
| - | `rear_axle_weight_lbs` | integer | Calculated |
| - | `payload_capacity_remaining_lbs` | integer | Calculated |
| - | `gvwr_compliant` | boolean | Calculated |
| - | `front_gawr_compliant` | boolean | Calculated |
| - | `rear_gawr_compliant` | boolean | Calculated |
| - | `fmvss_compliant` | boolean | Defaults to true |
| - | `chassis_cost` | numeric | Set to 0 (not from form) |
| - | `equipment_cost` | numeric | From equipmentBaseMsrp if available |
| - | `total_package_msrp` | numeric | Calculated |
| - | `created_by_dealer_id` | bigint | From user context |
| - | `created_by_organization_id` | bigint | From user context |

---

## Step 6: Listing Creation (Schema 02a: Dealership)

### Table: `vehicle_listings`

| Form Field | Database Column | Type | Notes |
|------------|----------------|------|-------|
| `askingPrice` | `asking_price` | numeric | Required, must be >= 0 |
| `specialPrice` | `special_price` | numeric | Optional, must be < askingPrice |
| `stockNumber` | `stock_number` | varchar | Optional |
| `condition` | `condition` | varchar | Enum: new, used, certified_pre_owned, demo (certified_pre_owned stored as "used") |
| `mileage` | `mileage` | integer | Optional, must be >= 0 |
| `exteriorColor` | `exterior_color` | varchar | Optional |
| `interiorColor` | `interior_color` | varchar | Optional |
| `description` | `listing_description` | text | Optional |
| `locationCity` | `location_city` | varchar | Optional |
| `locationState` | `location_state` | varchar | Optional |
| `priceType` | `price_type` | varchar | Enum: negotiable, fixed, call_for_price (defaults to "negotiable") |
| `paintCondition` | `paint_condition` | varchar | Enum: excellent, good, fair, poor |
| `interiorCondition` | `interior_condition` | varchar | Enum: excellent, good, fair, poor |
| `listingTitle` | `listing_title` | varchar | Optional |
| `keyHighlights` | `key_highlights` | text[] | Array, parsed from newline-separated string |
| `marketingHeadline` | `marketing_headline` | varchar | Optional |
| `isFeatured` | `is_featured` | boolean | Defaults to false |
| `isHotDeal` | `is_hot_deal` | boolean | Defaults to false |
| `vin` | `vin` | varchar | Required, 17 characters, validated format |
| - | `dealer_id` | bigint | From user context |
| - | `complete_configuration_id` | bigint | FK to complete_configurations |
| - | `organization_id` | bigint | From user context |
| - | `status` | varchar | Auto-set: "available" for new/demo, "draft" otherwise |
| - | `view_count` | integer | Set to 0 |

**Additional fields not in form (with defaults):**
- `is_clearance` - boolean, defaults to false
- `warranty_type` - varchar, null
- `warranty_expires_at` - date, null
- `previous_owners` - integer, null
- `accident_history` - text, null

### Table: `listing_images`

| Form Field | Database Column | Type | Notes |
|------------|----------------|------|-------|
| `photos[0]` | `image_url` | varchar | First photo URL |
| `photos[0]` | `is_primary` | boolean | Set to true for first photo |
| `photos[1]` | `image_url` | varchar | Second photo URL |
| `photos[1]` | `is_primary` | boolean | Set to false |
| `photos[n]` | `image_url` | varchar | Additional photo URLs |
| `photos[n]` | `is_primary` | boolean | Set to false |
| - | `listing_id` | bigint | FK to vehicle_listings |
| - | `sort_order` | integer | Set to array index (0, 1, 2, ...) |
| - | `display_order` | integer | Set to array index |
| - | `is_featured` | boolean | Set to false |
| - | `uploaded_at` | timestamp | Set to now() |

**Note:** Each URL in the `photos` array creates a separate row in `listing_images`.

---

## Field Mapping Summary by Form Step

### Step 0: Listing Type
- `listingType` → `complete_configurations.configuration_type`

### Step 1: Vehicle Information
- `vin` → `vehicle_listings.vin` + `complete_configurations.vin`
- `year` → `vehicle.year`
- `make` → `vehicle.make_name`
- `model` → `vehicle.model_name`
- `series` → `vehicle.series_name`
- `bodyStyle` → `vehicle_config.body_style`
- `fuelType` → `vehicle_config.fuel_type`
- `wheelbase` → `vehicle_config.wheelbase_inches`
- `gvwr` → `vehicle_config.gvwr_lbs`
- `payload` → `vehicle_config.payload_capacity_lbs`
- `engineDescription` → `vehicle_config.engine_description`
- `transmission` → `vehicle_config.transmission`
- `driveType` → `vehicle_config.drive_type`
- Plus all VIN decode fields (see vehicle_config table above)

### Step 2: Equipment Information (if hasEquipment = true)
- All `equipment*` fields → `equipment` and `equipment_config` tables (see above)

### Step 3: Pricing & Details
- `askingPrice` → `vehicle_listings.asking_price`
- `specialPrice` → `vehicle_listings.special_price`
- `stockNumber` → `vehicle_listings.stock_number`
- `condition` → `vehicle_listings.condition`
- `mileage` → `vehicle_listings.mileage`
- `exteriorColor` → `vehicle_listings.exterior_color`
- `interiorColor` → `vehicle_listings.interior_color`
- `description` → `vehicle_listings.listing_description`
- `locationCity` → `vehicle_listings.location_city`
- `locationState` → `vehicle_listings.location_state`
- `priceType` → `vehicle_listings.price_type`
- `paintCondition` → `vehicle_listings.paint_condition`
- `interiorCondition` → `vehicle_listings.interior_condition`
- `listingTitle` → `vehicle_listings.listing_title`
- `keyHighlights` → `vehicle_listings.key_highlights` (array)
- `marketingHeadline` → `vehicle_listings.marketing_headline`
- `isFeatured` → `vehicle_listings.is_featured`
- `isHotDeal` → `vehicle_listings.is_hot_deal`

### Step 4: Photos
- `photos[]` → `listing_images.image_url` (one row per photo)

### Step 5: Review & Submit
- No new fields - submits all collected data

---

## Data Flow Diagram

```
User Input (Form)
    ↓
[Authorization Check]
    ↓
[Vehicle Creation]
    ├─→ vehicle (year, make, model, series)
    └─→ vehicle_config (all vehicle specs)
    ↓
[Equipment Creation] (if hasEquipment)
    ├─→ equipment (upfitter, product line, model)
    └─→ equipment_config (all equipment specs)
    ↓
[Compatibility Check] (if equipment exists)
    └─→ chassis_equipment_compatibility
    ↓
[Complete Configuration]
    └─→ complete_configurations
    ↓
[Listing Creation]
    └─→ vehicle_listings
    ↓
[Image Upload]
    └─→ listing_images (one per photo)
```

---

## Important Notes

1. **VIN Decode Priority**: When a VIN is decoded, enriched data takes precedence over manual form input for vehicle fields.

2. **Fuzzy Matching**: The system uses fuzzy matching to find existing vehicles/equipment before creating new records:
   - Vehicle: Matches on year + make + model, then checks wheelbase (±1"), body style, drive type, GVWR (±100 lbs)
   - Equipment: Matches on upfitter + product line, then checks dimensions (±6") and weight (±100 lbs)

3. **Required vs Optional**: While the schema has many NOT NULL constraints, the form allows all fields to be optional. The system provides defaults or uses null values where appropriate.

4. **Legacy Field Names**: The form supports legacy field names for backward compatibility:
   - `equipmentManufacturer` → `equipmentUpfitterName`
   - `doorConfiguration` → `equipmentDoorConfiguration`
   - `compartmentCount` → `equipmentCompartmentCount`
   - `hasInteriorLighting` → `equipmentHasInteriorLighting`
   - `hasExteriorLighting` → `equipmentHasExteriorLighting`

5. **Status Auto-Setting**: Listing status is automatically set based on condition:
   - "new" or "demo" → "available"
   - All others → "draft"

6. **Compatibility Calculations**: When equipment is present, the system automatically calculates:
   - Total combined weight
   - Payload remaining
   - GVWR compliance
   - GAWR compliance (front and rear)

---

## Database Schema References

- **Schema 01**: Organization (not directly used in listing creation)
- **Schema 02a**: Dealership (`vehicle_listings`, `listing_images`)
- **Schema 03**: Vehicle Data (`vehicle`, `vehicle_config`)
- **Schema 04**: Equipment Data (`equipment`, `equipment_config`)
- **Schema 05**: Completed Unit Configuration (`complete_configurations`, `chassis_equipment_compatibility`)

---

## Validation Rules

1. **VIN**: Must be exactly 17 characters, no I, O, or Q
2. **Year**: Must be between 2000 and current year + 1
3. **Special Price**: Must be less than asking price (if both provided)
4. **Mileage**: Must be >= 0
5. **Asking Price**: Must be >= 0
6. **Condition**: Must be one of: new, used, certified_pre_owned, demo
7. **Price Type**: Must be one of: negotiable, fixed, call_for_price
8. **Paint/Interior Condition**: Must be one of: excellent, good, fair, poor

---

## Error Handling

If any step fails, the system:
1. Logs the error with context
2. Returns error details to the frontend
3. Does NOT create partial records (transaction rollback)
4. Provides user-friendly error messages

---

*Last Updated: Based on current codebase as of this documentation creation*

