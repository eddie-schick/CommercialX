# Database Connection Fix - Summary

## Problem
The profile page was showing "database connection not available" error when trying to save. This was because the code tried to use a postgres client that requires `DATABASE_URL`, but this environment variable may not be configured.

## Solution
Updated the code to:
1. Check if `DATABASE_URL` is available
2. Use postgres client if available (faster)
3. Fall back to Supabase RPC functions if `DATABASE_URL` is not available
4. Created RPC functions for both organizations and dealers

## Migrations to Run

You need to run these migrations in order:

### 1. Update Organization RPC Function (Fixed)
**File:** `supabase/migrations/20250117_create_update_organization_function.sql`
- **Status:** ✅ Updated to handle null values properly
- **What it does:** Allows updating organization fields via RPC without requiring DATABASE_URL
- **Run this:** Yes, if you haven't run it yet, or re-run it to get the null-handling fix

### 2. Add Dealer Fields
**File:** `supabase/migrations/20250117_add_dealer_fields.sql`
- **Status:** ✅ Created
- **What it does:** Adds all missing dealer fields to the dealers table
- **Run this:** Yes, required for dealer profile to work

### 3. Create Dealer RPC Functions
**File:** `supabase/migrations/20250117_create_update_dealer_function.sql`
- **Status:** ✅ Created
- **What it does:** Creates RPC functions for:
  - `update_dealer` - Update existing dealer records
  - `get_dealer_by_organization_id` - Find dealer by organization
  - `insert_dealer` - Create new dealer records
- **Run this:** Yes, required for dealer updates to work without DATABASE_URL

## How It Works Now

### Organization Updates
1. Checks if `DATABASE_URL` is set
2. If yes: Uses postgres client (faster)
3. If no or fails: Uses `update_organization` RPC function
4. RPC function works without DATABASE_URL

### Dealer Updates
1. Checks if `DATABASE_URL` is set
2. If yes: Uses postgres client to query/update
3. If no or fails: Uses RPC functions:
   - `get_dealer_by_organization_id` to find existing dealer
   - `update_dealer` to update existing dealer
   - `insert_dealer` to create new dealer

## Environment Variables

### Required (for Supabase client)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Optional (for faster postgres client)
- `DATABASE_URL` - Direct postgres connection string
  - If not set, the system will use RPC functions instead
  - RPC functions work fine but may be slightly slower

## Testing

After running the migrations:
1. Try saving your organization profile
2. Try saving your dealer profile
3. Both should work even without DATABASE_URL set

## Error Messages

If you see errors, check:
1. **"RPC function does not exist"** → Run the migration files listed above
2. **"Database connection not available"** → This should no longer appear, but if it does, check that SUPABASE_URL and SUPABASE_ANON_KEY are set
3. **"Failed to update organization via RPC"** → Check server logs for detailed error, likely a data format issue

## Next Steps

1. ✅ Run migration `20250117_create_update_organization_function.sql` (or re-run if already run)
2. ✅ Run migration `20250117_add_dealer_fields.sql`
3. ✅ Run migration `20250117_create_update_dealer_function.sql`
4. ✅ Test saving organization profile
5. ✅ Test saving dealer profile

All migrations use `IF NOT EXISTS` or `DROP IF EXISTS` so they're safe to run multiple times.

