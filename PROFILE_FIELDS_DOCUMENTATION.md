# My Profile - Field Documentation

This document provides a comprehensive mapping of every field in the "My Profile" page to its corresponding Supabase database location.

---

## Table of Contents

1. [Personal Information](#personal-information)
2. [Organization Information](#organization-information)
3. [Dealership Information](#dealership-information)
4. [OEM Dealer Codes](#oem-dealer-codes)
5. [Notification Preferences](#notification-preferences)
6. [Account Information](#account-information)

---

## Personal Information

**Supabase Location:** `auth.users` table, `user_metadata` JSONB column

**API Endpoint:** `trpc.profile.updatePersonal`

**Update Method:** Supabase Auth Admin API (`auth.admin.updateUserById`) or REST API (`/auth/v1/user`)

| Field Name | UI Label | Database Location | Data Type | Notes |
|------------|----------|-------------------|-----------|-------|
| `name` | Full Name | `auth.users.user_metadata.name` | `string` (max 255) | Stored in user_metadata JSONB |
| `email` | Email | `auth.users.email` | `string` | **Read-only** - Cannot be changed via profile |
| `phone` | Phone Number | `auth.users.user_metadata.phone` | `string` (max 50) | Stored in user_metadata JSONB |
| `bio` | Bio | `auth.users.user_metadata.bio` | `string` (max 1000) | Stored in user_metadata JSONB |

**Important Notes:**
- All personal information fields are merged with existing `user_metadata` to preserve other fields
- Email is read-only and comes from `auth.users.email` directly
- The `id` field (user ID) comes from `auth.users.id` (UUID)

---

## Organization Information

**Supabase Location:** `01. Organization.organizations` table

**API Endpoint:** `trpc.profile.updateOrganization` (update) or `trpc.profile.createOrganization` (create)

**Update Method:** Direct PostgreSQL query via `updateSchemaTable` or RPC function

| Field Name | UI Label | Database Location | Data Type | Notes |
|------------|----------|-------------------|-----------|-------|
| `organization_type_id` | Organization Type * | `01. Organization.organizations.organization_type_id` | `bigint` | Foreign key to `01. Organization.organization_types.id` |
| `organization_name` | Organization Name * | `01. Organization.organizations.organization_name` | `character varying` (max 255) | Required field |
| `legal_entity_name` | Legal Entity Name | `01. Organization.organizations.legal_entity_name` | `character varying` (max 255) | Optional |
| `display_name` | Display Name | `01. Organization.organizations.display_name` | `character varying` (max 255) | Optional |
| `primary_email` | Primary Email * | `01. Organization.organizations.primary_email` | `character varying` (max 255) | Required, must be valid email format |
| `primary_phone` | Primary Phone | `01. Organization.organizations.primary_phone` | `character varying` (max 50) | Optional |
| `primary_phone_ext` | Phone Extension | `01. Organization.organizations.primary_phone_ext` | `character varying` (max 20) | Optional |
| `address_line1` | Address Line 1 | `01. Organization.organizations.address_line1` | `character varying` (max 255) | Optional |
| `address_line2` | Address Line 2 | `01. Organization.organizations.address_line2` | `character varying` (max 255) | Optional |
| `city` | City | `01. Organization.organizations.city` | `character varying` (max 100) | Optional |
| `state_province` | State/Province | `01. Organization.organizations.state_province` | `character varying` (max 100) | Optional |
| `postal_code` | Postal Code | `01. Organization.organizations.postal_code` | `character varying` (max 20) | Optional |
| `country` | Country | `01. Organization.organizations.country` | `character varying` (max 2) | Default: 'US' |
| `website_url` | Website URL | `01. Organization.organizations.website_url` | `character varying` (max 500) | Must be valid URL format |
| `logo_url` | Logo URL | `01. Organization.organizations.logo_url` | `character varying` (max 500) | Must be valid URL format |
| `tax_id` | Tax ID / EIN | `01. Organization.organizations.tax_id` | `character varying` (max 50) | Federal Tax ID or EIN |
| `business_hours` | Business Hours | `01. Organization.organizations.business_hours` | `jsonb` | JSON object with days (monday-sunday), each with `open`, `close`, `closed` properties |
| `sales_territory_states` | Sales Territory States | `01. Organization.organizations.sales_territory_states` | `jsonb` | JSON array of 2-letter state codes (e.g., ["CA", "NY", "TX"]) |
| `status` | Status | `01. Organization.organizations.status` | `character varying` | Enum: 'active', 'suspended', 'inactive', 'pending_verification', 'rejected' |
| `subscription_tier` | Subscription Tier | `01. Organization.organizations.subscription_tier` | `character varying` | Enum: 'free', 'basic', 'premium', 'enterprise' |

**Business Hours Structure:**
```json
{
  "monday": { "open": "09:00", "close": "17:00", "closed": false },
  "tuesday": { "open": "09:00", "close": "17:00", "closed": false },
  // ... other days
}
```

**Sales Territory States Structure:**
```json
["CA", "NY", "TX"]
```

**Important Notes:**
- Organization is linked to user via `01. Organization.organization_users` table
- The `slug` field is auto-generated from `organization_name` and must be unique
- `is_verified` is a read-only field managed by admins
- `created_at` and `updated_at` are automatically managed by the database

---

## Dealership Information

**Supabase Location:** `02a. Dealership.dealers` table

**API Endpoint:** `trpc.profile.updateDealer`

**Update Method:** Direct PostgreSQL query via `updateSchemaTable` or RPC function

| Field Name | UI Label | Database Location | Data Type | Notes |
|------------|----------|-------------------|-----------|-------|
| `organization_id` | (Internal) | `02a. Dealership.dealers.organization_id` | `bigint` | Foreign key to `01. Organization.organizations.id` (1:1 relationship) |
| `business_type` | Business Type | `02a. Dealership.dealers.business_type` | `character varying` | Enum: 'franchise_dealer', 'independent_dealer', 'fleet_remarketer', 'broker', 'leasing_company', 'rental_company', 'other' |
| `dealer_license_number` | Dealer License Number | `02a. Dealership.dealers.dealer_license_number` | `character varying` (max 100) | Optional |
| `dealer_license_state` | Dealer License State | `02a. Dealership.dealers.dealer_license_state` | `character varying` (2 chars) | 2-letter state code, uppercase |
| `dealer_license_expires_at` | License Expires | `02a. Dealership.dealers.dealer_license_expires_at` | `date` | Optional date field |
| `tax_id` | Tax ID / EIN | `02a. Dealership.dealers.tax_id` | `character varying` (max 50) | Optional |
| `duns_number` | DUNS Number | `02a. Dealership.dealers.duns_number` | `character varying` (max 20) | Optional |
| `specializations` | Specializations | `02a. Dealership.dealers.specializations` | `ARRAY` (text[]) | PostgreSQL array of strings (max 100 chars each) |
| `makes_carried` | Makes Carried | `02a. Dealership.dealers.makes_carried` | `ARRAY` (text[]) | PostgreSQL array of strings (max 50 chars each) |
| `average_inventory_count` | Average Inventory Count | `02a. Dealership.dealers.average_inventory_count` | `integer` | Optional, must be positive |
| `lot_capacity` | Lot Capacity | `02a. Dealership.dealers.lot_capacity` | `integer` | Optional, must be positive |
| `can_special_order` | Can Special Order | `02a. Dealership.dealers.can_special_order` | `boolean` | Default: true |
| `accepts_trade_ins` | Accepts Trade-Ins | `02a. Dealership.dealers.accepts_trade_ins` | `boolean` | Default: true |
| `has_service_department` | Service Department | `02a. Dealership.dealers.has_service_department` | `boolean` | Default: false |
| `has_parts_department` | Parts Department | `02a. Dealership.dealers.has_parts_department` | `boolean` | Default: false |
| `has_body_shop` | Body Shop | `02a. Dealership.dealers.has_body_shop` | `boolean` | Default: false |
| `can_install_upfits` | Can Install Upfits | `02a. Dealership.dealers.can_install_upfits` | `boolean` | Default: false |
| `typical_delivery_days` | Typical Delivery Days | `02a. Dealership.dealers.typical_delivery_days` | `integer` | Optional, must be positive |
| `sales_territory_states` | Sales Territory States | `02a. Dealership.dealers.sales_territory_states` | `ARRAY` (text[]) | PostgreSQL array of 2-letter state codes (uppercase) |
| `delivery_available` | Delivery Available | `02a. Dealership.dealers.delivery_available` | `boolean` | Default: true |
| `delivery_radius_miles` | Delivery Radius (miles) | `02a. Dealership.dealers.delivery_radius_miles` | `integer` | Optional, must be positive |
| `delivery_fee` | Delivery Fee ($) | `02a. Dealership.dealers.delivery_fee` | `numeric` | Optional, must be non-negative |
| `current_promotions` | Current Promotions | `02a. Dealership.dealers.current_promotions` | `text` (max 2000) | Optional text field |
| `accepts_fleet_inquiries` | Accepts Fleet Inquiries | `02a. Dealership.dealers.accepts_fleet_inquiries` | `boolean` | Default: true |
| `minimum_fleet_size` | Minimum Fleet Size | `02a. Dealership.dealers.minimum_fleet_size` | `integer` | Optional, must be positive |
| `fleet_discount_percentage` | Fleet Discount (%) | `02a. Dealership.dealers.fleet_discount_percentage` | `numeric` | Optional, 0-100 range |
| `certifications` | Certifications | `02a. Dealership.dealers.certifications` | `ARRAY` (text[]) | PostgreSQL array of strings (max 200 chars each) |
| `awards` | Awards | `02a. Dealership.dealers.awards` | `ARRAY` (text[]) | PostgreSQL array of strings (max 200 chars each) |
| `auto_respond_inquiries` | Auto-Respond to Inquiries | `02a. Dealership.dealers.auto_respond_inquiries` | `boolean` | Default: false |
| `inquiry_email_notification` | Email Notifications | `02a. Dealership.dealers.inquiry_email_notification` | `boolean` | Default: true |
| `weekly_performance_report` | Weekly Performance Report | `02a. Dealership.dealers.weekly_performance_report` | `boolean` | Default: true |
| `allow_price_negotiations` | Allow Price Negotiations | `02a. Dealership.dealers.allow_price_negotiations` | `boolean` | Default: true |
| `dealer_code` | Dealer Code | `02a. Dealership.dealers.dealer_code` | `character varying` (max 50) | Optional, must be unique if provided |
| `ford_dealer_code` | Ford Dealer Code | `02a. Dealership.dealers.ford_dealer_code` | `character varying` (max 50) | Optional, must be unique if provided |
| `default_price_level` | Default Price Level | `02a. Dealership.dealers.default_price_level` | `character varying` (max 20) | Default: '630' |
| `can_order_fleet` | Can Order Fleet Vehicles | `02a. Dealership.dealers.can_order_fleet` | `boolean` | Default: false |
| `can_order_government` | Can Order Government Vehicles | `02a. Dealership.dealers.can_order_government` | `boolean` | Default: false |
| `uses_b4a` | Uses B4A Program | `02a. Dealership.dealers.uses_b4a` | `boolean` | Default: true |
| `floor_plan_company` | Floor Plan Company | `02a. Dealership.dealers.floor_plan_company` | `character varying` (max 100) | Optional |
| `floor_plan_account` | Floor Plan Account | `02a. Dealership.dealers.floor_plan_account` | `character varying` (max 100) | Optional |
| `business_hours` | Business Hours | `02a. Dealership.dealers.business_hours` | `jsonb` | JSON object with days (monday-sunday), each with `open`, `close`, `closed` properties |

**Array Fields (PostgreSQL text[]):**
- `specializations`: Array of specialization strings
- `makes_carried`: Array of make names (e.g., ["FORD", "CHEVROLET"])
- `sales_territory_states`: Array of 2-letter state codes (e.g., ["CA", "NY"])
- `certifications`: Array of certification strings
- `awards`: Array of award strings

**Important Notes:**
- Array fields are stored as PostgreSQL `text[]` (not JSONB), so they're passed as JavaScript arrays directly
- The dealer record has a 1:1 relationship with organization (via `organization_id`)
- `business_hours` is stored as JSONB (same structure as organization business_hours)
- `created_at` and `updated_at` are automatically managed by the database

---

## OEM Dealer Codes

**Supabase Location:** `02a. Dealership.dealer_codes` table

**API Endpoints:** 
- `trpc.profile.getDealerCodes` (read)
- `trpc.profile.upsertDealerCode` (create/update)
- `trpc.profile.deleteDealerCode` (delete)

**Update Method:** Direct PostgreSQL query via `insertSchemaTable`, `updateSchemaTable`, or `querySchemaTable`

| Field Name | UI Label | Database Location | Data Type | Notes |
|------------|----------|-------------------|-----------|-------|
| `id` | (Internal) | `02a. Dealership.dealer_codes.id` | `bigint` | Auto-generated identity, primary key |
| `dealer_id` | (Internal) | `02a. Dealership.dealer_codes.dealer_id` | `bigint` | Foreign key to `02a. Dealership.dealers.id` |
| `organization_id` | (Internal) | `02a. Dealership.dealer_codes.organization_id` | `bigint` | Foreign key to `01. Organization.organizations.id` |
| `make` | Make / OEM * | `02a. Dealership.dealer_codes.make` | `character varying` | Required, must match a make from `03. Vehicle Data.makes` |
| `make_id` | (Internal) | `02a. Dealership.dealer_codes.make_id` | `bigint` | Foreign key to `03. Vehicle Data.makes.id` |
| `dealer_code` | Dealer Code * | `02a. Dealership.dealer_codes.dealer_code` | `character varying` | Required, OEM-specific dealer code |
| `is_primary` | Primary Code | `02a. Dealership.dealer_codes.is_primary` | `boolean` | Default: false |
| `is_active` | Active | `02a. Dealership.dealer_codes.is_active` | `boolean` | Default: true |
| `certified_date` | Certified Date | `02a. Dealership.dealer_codes.certified_date` | `date` | Optional |
| `certification_expires_at` | Certification Expires | `02a. Dealership.dealer_codes.certification_expires_at` | `date` | Optional |
| `default_price_level` | Default Price Level | `02a. Dealership.dealer_codes.default_price_level` | `character varying` | Default: '630' |
| `can_order_fleet` | Can Order Fleet | `02a. Dealership.dealer_codes.can_order_fleet` | `boolean` | Default: false |
| `can_order_government` | Can Order Government | `02a. Dealership.dealer_codes.can_order_government` | `boolean` | Default: false |
| `uses_b4a` | Uses B4A | `02a. Dealership.dealer_codes.uses_b4a` | `boolean` | Default: true |
| `created_at` | (Internal) | `02a. Dealership.dealer_codes.created_at` | `timestamp with time zone` | Auto-managed |
| `updated_at` | (Internal) | `02a. Dealership.dealer_codes.updated_at` | `timestamp with time zone` | Auto-managed |

**Important Notes:**
- Each dealer can have multiple dealer codes (one per OEM/make)
- The `make` field must match a make from the `makes_carried` array in the dealer record
- The `make_id` is automatically resolved from the `make` name by looking up `03. Vehicle Data.makes`
- Dealer codes are fetched via `trpc.profile.getMakes` which queries `03. Vehicle Data.makes` where `is_active = true` and `is_commercial_vehicle_manufacturer = true`

---

## Notification Preferences

**Supabase Location:** `auth.users` table, `user_metadata` JSONB column

**API Endpoint:** `trpc.profile.updatePersonal` (same as Personal Information)

**Update Method:** Supabase Auth Admin API (`auth.admin.updateUserById`) or REST API (`/auth/v1/user`)

| Field Name | UI Label | Database Location | Data Type | Notes |
|------------|----------|-------------------|-----------|-------|
| `emailNotifications` | Email Notifications | `auth.users.user_metadata.emailNotifications` | `boolean` | Default: true (if not set) |
| `marketingEmails` | Marketing Emails | `auth.users.user_metadata.marketingEmails` | `boolean` | Default: false |

**Important Notes:**
- These fields are stored in the same `user_metadata` JSONB column as Personal Information
- They are updated via the same `updatePersonal` mutation
- The data is merged with existing `user_metadata` to preserve other fields

---

## Account Information

**Supabase Location:** Multiple tables (read-only display)

**API Endpoint:** `trpc.profile.get` (read-only)

**Data Sources:**

| Field Name | UI Label | Database Location | Data Type | Notes |
|------------|----------|-------------------|-----------|-------|
| `role` | Account Type | `01. Organization.organization_users.role` | `character varying` | Enum: 'owner', 'admin', 'member', 'viewer' |
| `memberSince` | Member Since | `01. Organization.organization_users.joined_at` or `created_at` | `timestamp with time zone` | Falls back to `created_at` if `joined_at` is null |
| `lastSignInAt` | Last Sign In | `auth.users.last_sign_in_at` | `timestamp with time zone` | From auth.users table |
| `organization_name` | Organization | `01. Organization.organizations.organization_name` | `character varying` | Displayed if organization exists |
| `is_verified` | Verification Status | `01. Organization.organizations.is_verified` | `boolean` | Read-only, managed by admins |

**Important Notes:**
- All Account Information fields are **read-only** in the profile page
- The `role` comes from the `organization_users` table which links users to organizations
- The user's relationship to an organization is stored in `01. Organization.organization_users` with fields:
  - `user_id` (UUID) → references `auth.users.id`
  - `organization_id` (bigint) → references `01. Organization.organizations.id`
  - `role` (character varying) → the user's role in that organization
  - `joined_at` (timestamp) → when the user joined the organization

---

## Data Flow Summary

### Saving Profile Data

1. **Personal Information & Notification Preferences:**
   - Frontend: `client/src/pages/Profile.tsx` → `handleSubmit()` → `updatePersonalMutation.mutateAsync()`
   - Backend: `server/routers/profile.ts` → `updatePersonal` mutation
   - Database: Updates `auth.users.user_metadata` via Supabase Auth Admin API or REST API
   - Method: Merges new data with existing `user_metadata` to preserve other fields

2. **Organization Information:**
   - Frontend: `client/src/pages/Profile.tsx` → `handleSubmit()` → `updateOrganizationMutation.mutateAsync()` or `createOrganizationMutation.mutateAsync()`
   - Backend: `server/routers/profile.ts` → `updateOrganization` or `createOrganization` mutation
   - Database: Updates/Inserts into `01. Organization.organizations` via `updateSchemaTable` or `insertSchemaTable`
   - Method: Direct PostgreSQL query or RPC function call

3. **Dealership Information:**
   - Frontend: `client/src/pages/Profile.tsx` → `handleSubmit()` → `updateDealerMutation.mutateAsync()`
   - Backend: `server/routers/profile.ts` → `updateDealer` mutation
   - Database: Updates `02a. Dealership.dealers` via `updateSchemaTable` or RPC function
   - Method: Direct PostgreSQL query or RPC function call
   - Special Handling: Array fields (`specializations`, `makes_carried`, etc.) are passed as JavaScript arrays (PostgreSQL `text[]`)

4. **OEM Dealer Codes:**
   - Frontend: `client/src/pages/Profile.tsx` → `DealerCodesManager` → `upsertDealerCodeMutation.mutateAsync()` or `deleteDealerCodeMutation.mutateAsync()`
   - Backend: `server/routers/profile.ts` → `upsertDealerCode` or `deleteDealerCode` mutation
   - Database: Inserts/Updates/Deletes from `02a. Dealership.dealer_codes` via `insertSchemaTable`, `updateSchemaTable`, or `querySchemaTable`

### Loading Profile Data

1. **Complete Profile:**
   - Frontend: `client/src/pages/Profile.tsx` → `trpc.profile.get.useQuery()`
   - Backend: `server/routers/profile.ts` → `profile.get` query
   - Database: 
     - Fetches user from `auth.users` (via Supabase Auth)
     - Fetches organization via RPC function `01. Organization.get_current_user_profile()` or direct query
     - Fetches dealer via RPC function (included in organization profile) or direct query
     - Fetches dealer codes via `querySchemaTable('02a. Dealership', 'dealer_codes', { where: { dealer_id } })`

2. **Organization Types:**
   - Frontend: `client/src/pages/Profile.tsx` → `trpc.profile.getOrganizationTypes.useQuery()`
   - Backend: `server/routers/profile.ts` → `getOrganizationTypes` query
   - Database: Queries `01. Organization.organization_types` where `is_active = true`

3. **Makes (for Dealer Codes):**
   - Frontend: `client/src/pages/Profile.tsx` → `trpc.profile.getMakes.useQuery()`
   - Backend: `server/routers/profile.ts` → `getMakes` query
   - Database: Queries `03. Vehicle Data.makes` where `is_active = true` and `is_commercial_vehicle_manufacturer = true`

---

## Key Database Relationships

```
auth.users (id: UUID)
  └─ user_metadata (JSONB) → Personal Info, Notification Preferences
  └─ email → Email (read-only)

01. Organization.organization_users
  ├─ user_id (FK → auth.users.id)
  ├─ organization_id (FK → 01. Organization.organizations.id)
  └─ role → Account Type

01. Organization.organizations
  ├─ id (PK)
  ├─ organization_type_id (FK → 01. Organization.organization_types.id)
  └─ [all organization fields]

02a. Dealership.dealers
  ├─ id (PK)
  ├─ organization_id (FK → 01. Organization.organizations.id, UNIQUE)
  └─ [all dealer fields]

02a. Dealership.dealer_codes
  ├─ id (PK)
  ├─ dealer_id (FK → 02a. Dealership.dealers.id)
  ├─ organization_id (FK → 01. Organization.organizations.id)
  ├─ make_id (FK → 03. Vehicle Data.makes.id)
  └─ [all dealer code fields]

03. Vehicle Data.makes
  ├─ id (PK)
  ├─ make_name
  ├─ is_active
  └─ is_commercial_vehicle_manufacturer
```

---

## Important Implementation Notes

1. **Array Fields Handling:**
   - PostgreSQL `text[]` arrays (`specializations`, `makes_carried`, `sales_territory_states`, `certifications`, `awards`) are passed as JavaScript arrays directly
   - JSONB arrays (`sales_territory_states` in organizations) are JSON-stringified before storage
   - The code distinguishes between these in `server/lib/supabase-db.ts` using a `postgresArrayFields` map

2. **Business Hours:**
   - Stored as JSONB in both `organizations` and `dealers` tables
   - Structure: `{ "monday": { "open": "09:00", "close": "17:00", "closed": false }, ... }`
   - Normalized via `normalizeBusinessHours()` helper function before saving

3. **Data Merging:**
   - Personal information updates merge with existing `user_metadata` to preserve other fields
   - Organization and dealer updates use direct field updates (no merging needed)

4. **Permissions:**
   - Organization and dealer sections are marked "Admin Only" but backend enforces permissions
   - Only users with `role = 'owner'` or `role = 'admin'` in `organization_users` can update organization/dealer data

5. **Validation:**
   - All fields are validated using Zod schemas in `server/routers/profile.ts`
   - Frontend validation is handled by HTML5 form validation and TypeScript types

---

## API Endpoints Reference

| Endpoint | Method | Purpose | Updates Table |
|----------|--------|---------|---------------|
| `trpc.profile.get` | Query | Get complete profile data | N/A (read-only) |
| `trpc.profile.updatePersonal` | Mutation | Update personal info & notifications | `auth.users.user_metadata` |
| `trpc.profile.getOrganizationTypes` | Query | Get organization types | N/A (read-only) |
| `trpc.profile.createOrganization` | Mutation | Create new organization | `01. Organization.organizations` |
| `trpc.profile.updateOrganization` | Mutation | Update organization | `01. Organization.organizations` |
| `trpc.profile.updateDealer` | Mutation | Update dealer information | `02a. Dealership.dealers` |
| `trpc.profile.getMakes` | Query | Get active commercial makes | N/A (read-only) |
| `trpc.profile.getDealerCodes` | Query | Get dealer codes for dealer | N/A (read-only) |
| `trpc.profile.upsertDealerCode` | Mutation | Create or update dealer code | `02a. Dealership.dealer_codes` |
| `trpc.profile.deleteDealerCode` | Mutation | Delete dealer code | `02a. Dealership.dealer_codes` |

---

## File Locations

- **Frontend Component:** `client/src/pages/Profile.tsx`
- **Backend Router:** `server/routers/profile.ts`
- **Type Definitions:** `client/src/types/profile.ts`
- **Database Helpers:** `server/lib/supabase-db.ts`
- **Schema Context:** `schema context.sql`

---

*Last Updated: Based on current codebase as of profile implementation completion*

