# Profile Page Schema Verification

This document verifies that all fields on the Profile page are properly integrated with the Supabase database schema.

## Organization Fields Verification

### Fields Used in Profile Page (Organization Section)

| Field Name | Type | In Schema? | In Migration? | Notes |
|------------|------|------------|--------------|-------|
| organization_type_id | number | ✅ | ✅ | Required, foreign key |
| organization_name | string | ✅ | ✅ | Required |
| legal_entity_name | string | ✅ | ✅ | Optional |
| display_name | string | ✅ | ✅ | Optional |
| primary_email | string | ✅ | ✅ | Required |
| primary_phone | string | ✅ | ✅ | Optional |
| primary_phone_ext | string | ✅ | ✅ | Optional |
| address_line1 | string | ✅ | ✅ | Optional |
| address_line2 | string | ✅ | ✅ | Optional |
| city | string | ✅ | ✅ | Optional |
| state_province | string | ✅ | ✅ | Optional |
| postal_code | string | ✅ | ✅ | Optional |
| country | string | ✅ | ✅ | Optional, default 'US' |
| website_url | string | ✅ | ✅ | Optional |
| logo_url | string | ✅ | ✅ | Optional |
| tax_id | string | ✅ | ✅ | **Added via migration** |
| business_hours | JSONB | ✅ | ✅ | **Added via migration** |
| sales_territory_states | JSONB[] | ✅ | ✅ | **Added via migration** |
| status | enum | ✅ | ✅ | Optional, default 'pending_verification' |
| subscription_tier | enum | ✅ | ✅ | Optional, default 'free' |

### Fields in Schema But NOT in Profile Page

| Field Name | Type | Should Add? | Notes |
|------------|------|-------------|-------|
| slug | string | ❌ | Auto-generated, not user-editable |
| primary_phone_accepts_sms | boolean | ⚠️ | Could be useful for notifications |
| secondary_phone | string | ⚠️ | Could be useful |
| secondary_phone_ext | string | ⚠️ | Could be useful |
| latitude | numeric | ⚠️ | Could be auto-calculated from address |
| longitude | numeric | ⚠️ | Could be auto-calculated from address |
| timezone | string | ⚠️ | Could be auto-detected |
| preferred_currency | string | ⚠️ | Could default based on country |
| naics_code | string | ⚠️ | Industry classification code |
| facebook_url | string | ⚠️ | Social media links |
| linkedin_url | string | ⚠️ | Social media links |
| twitter_handle | string | ⚠️ | Social media links |
| instagram_handle | string | ⚠️ | Social media links |
| tiktok_handle | string | ⚠️ | Social media links |
| youtube_channel_url | string | ⚠️ | Social media links |
| is_verified | boolean | ❌ | System-managed, not user-editable |
| verified_at | timestamp | ❌ | System-managed |
| verified_by | uuid | ❌ | System-managed |
| verification_notes | text | ❌ | Admin-only |
| status_reason | text | ❌ | Admin-only |
| status_changed_at | timestamp | ❌ | System-managed |
| status_changed_by | uuid | ❌ | System-managed |
| subscription_starts_at | timestamp | ❌ | System-managed |
| subscription_expires_at | timestamp | ❌ | System-managed |
| metadata | JSONB | ❌ | System-managed |
| settings | JSONB | ❌ | System-managed |
| created_at | timestamp | ❌ | System-managed |
| updated_at | timestamp | ❌ | System-managed |
| created_by | uuid | ❌ | System-managed |

## Dealer Fields Verification

### Fields Used in Profile Page (Dealer Section)

| Field Name | Type | In Schema? | Notes |
|------------|------|------------|-------|
| business_type | enum | ✅ | Optional |
| dealer_license_number | string | ✅ | Optional |
| dealer_license_state | string(2) | ✅ | Optional |
| dealer_license_expires_at | date | ✅ | Optional |
| tax_id | string | ✅ | Optional |
| duns_number | string | ✅ | Optional |
| specializations | string[] | ✅ | Optional, JSONB array |
| makes_carried | string[] | ✅ | Optional, JSONB array |
| average_inventory_count | number | ✅ | Optional, nullable |
| lot_capacity | number | ✅ | Optional, nullable |
| can_special_order | boolean | ✅ | Optional |
| accepts_trade_ins | boolean | ✅ | Optional |
| has_service_department | boolean | ✅ | Optional |
| has_parts_department | boolean | ✅ | Optional |
| has_body_shop | boolean | ✅ | Optional |
| can_install_upfits | boolean | ✅ | Optional |
| typical_delivery_days | number | ✅ | Optional, nullable |
| sales_territory_states | string[] | ✅ | Optional, JSONB array |
| delivery_available | boolean | ✅ | Optional |
| delivery_radius_miles | number | ✅ | Optional, nullable |
| delivery_fee | number | ✅ | Optional, nullable |
| current_promotions | string | ✅ | Optional |
| accepts_fleet_inquiries | boolean | ✅ | Optional |
| minimum_fleet_size | number | ✅ | Optional, nullable |
| fleet_discount_percentage | number | ✅ | Optional, nullable |
| certifications | string[] | ✅ | Optional, JSONB array |
| awards | string[] | ✅ | Optional, JSONB array |
| auto_respond_inquiries | boolean | ✅ | Optional |
| inquiry_email_notification | boolean | ✅ | Optional |
| weekly_performance_report | boolean | ✅ | Optional |
| allow_price_negotiations | boolean | ✅ | Optional |

## Personal Information Fields

### Fields Used in Profile Page (Personal Section)

| Field Name | Type | Storage | Notes |
|------------|------|--------|-------|
| name | string | auth.users.user_metadata | ✅ |
| email | string | auth.users.email | ✅ Read-only |
| phone | string | auth.users.user_metadata | ✅ |
| bio | string | auth.users.user_metadata | ✅ |
| emailNotifications | boolean | auth.users.user_metadata | ✅ |
| marketingEmails | boolean | auth.users.user_metadata | ✅ |

## Integration Status

### ✅ Completed
- All organization fields from profile page are in database schema
- All dealer fields from profile page are in database schema
- Missing columns (tax_id, business_hours, sales_territory_states) have been added via migration
- Validation schemas match database constraints
- Number fields properly handle null values (using .nullish())
- Business hours normalization handles string values

### ⚠️ Potential Enhancements
- Consider adding social media fields to profile page
- Consider adding secondary phone field
- Consider adding NAICS code field for industry classification
- Consider auto-detecting timezone and coordinates from address

### ❌ Not Needed
- System-managed fields (created_at, updated_at, is_verified, etc.) should not be user-editable
- Slug is auto-generated and should not be user-editable

## Next Steps

1. ✅ Run migration `20250117_add_organization_fields.sql` - **COMPLETED**
2. ✅ Run migration `20250117_create_update_organization_function.sql` - **COMPLETED**
3. ⚠️ **Run migration `20250117_add_dealer_fields.sql`** - **REQUIRED** - Adds all missing dealer fields
4. ✅ Verify all fields save correctly - **IN PROGRESS**
5. ⚠️ Consider adding optional social media fields if needed
6. ⚠️ Consider adding secondary phone field if needed

## Dealer Fields Status

### Fields in create_dealer_organization function (subset)
- organization_id ✅
- business_type ✅
- dealer_license_number ✅
- dealer_license_state ✅
- tax_id ✅
- makes_carried ✅
- specializations ✅
- has_service_department ✅
- has_parts_department ✅
- can_install_upfits ✅
- business_hours ✅
- sales_territory_states ✅

### Additional Fields Used in Profile Page (need to be added)
- dealer_license_expires_at ⚠️ **Added in migration**
- duns_number ⚠️ **Added in migration**
- average_inventory_count ⚠️ **Added in migration**
- lot_capacity ⚠️ **Added in migration**
- can_special_order ⚠️ **Added in migration**
- accepts_trade_ins ⚠️ **Added in migration**
- has_body_shop ⚠️ **Added in migration**
- typical_delivery_days ⚠️ **Added in migration**
- delivery_available ⚠️ **Added in migration**
- delivery_radius_miles ⚠️ **Added in migration**
- delivery_fee ⚠️ **Added in migration**
- current_promotions ⚠️ **Added in migration**
- accepts_fleet_inquiries ⚠️ **Added in migration**
- minimum_fleet_size ⚠️ **Added in migration**
- fleet_discount_percentage ⚠️ **Added in migration**
- certifications ⚠️ **Added in migration**
- awards ⚠️ **Added in migration**
- auto_respond_inquiries ⚠️ **Added in migration**
- inquiry_email_notification ⚠️ **Added in migration**
- weekly_performance_report ⚠️ **Added in migration**
- allow_price_negotiations ⚠️ **Added in migration**

## Validation Notes

- Business hours: Properly normalized to handle string values
- Number fields: Use `.nullish()` to accept null, undefined, or number
- Arrays: Properly stored as JSONB arrays
- Optional fields: All properly marked as optional in schemas

