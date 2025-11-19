# Listing Creation Workflow Fix

This document describes the fixes applied to streamline the vehicle listing creation workflow in CommercialX.

## Summary of Changes

### 1. Diagnostic Query (`scripts/diagnose-user-setup.sql`)
A comprehensive SQL query to diagnose user organization and dealer setup issues.

**Usage:**
1. Open Supabase SQL Editor
2. Replace `'YOUR_USER_ID_HERE'` with your actual `auth.users.id` (UUID)
3. Run the query to see:
   - Organization status and completion percentage
   - Dealer record existence and completion percentage
   - User role and permissions
   - Specific missing items with recommendations

**Example Output:**
- ✅ Has Organization: true
- ✅ Has Dealer Record: false
- ⚠️ Diagnosis: Missing: dealer record for organization
- 💡 Recommendation: Create dealer record for organization (see create-missing-dealer.sql)

### 2. Auto-Create Dealer Function (`scripts/create-missing-dealer.sql`)
A database function that automatically creates dealer records for organizations that don't have one.

**Functions Created:**
- `"02a. Dealership".ensure_dealer_for_organization(p_organization_id)` - Creates dealer for a specific organization
- `ensure_dealer_for_current_user()` - RPC wrapper that creates dealer for the authenticated user

**Usage:**
1. Run the migration in Supabase SQL Editor to create the functions
2. The listing creation endpoint will automatically call `ensure_dealer_for_current_user()` if a dealer record is missing
3. Alternatively, call it manually:
   ```sql
   SELECT ensure_dealer_for_current_user();
   ```

### 3. Enhanced Validation Logic (`server/routers.ts`)
The validation logic has been completely rewritten to:

**Improvements:**
- ✅ **Specific Error Messages**: Identifies exactly what's missing (org vs dealer vs specific fields)
- ✅ **Auto-Creation**: Automatically creates dealer records if organization exists
- ✅ **Warnings Instead of Blocks**: Allows listing creation with incomplete profiles (warns but doesn't block)
- ✅ **Development Bypass**: Skip validation in local development
- ✅ **Detailed Diagnostics**: Checks organization status, completion percentages, user roles

**Error Message Examples:**
- Before: "Organization and dealer profile not set up"
- After: "Dealer profile not set up. Please complete dealership information at /profile"

**Multiple Issues:**
```
Multiple issues found:
1. Organization status is "pending_verification" (must be "active")
2. Organization profile is only 30% complete
3. Dealer profile is only 20% complete

Please resolve these issues at /profile before creating listings.
```

### 4. Development Bypass
For local development, you can skip profile validation entirely.

**Setup:**
1. Add to your `.env` file:
   ```env
   SKIP_PROFILE_VALIDATION=true
   ```
2. The validation will be skipped in non-production environments
3. Warnings will still be logged to console for debugging

**Note:** This bypass only works when `NODE_ENV !== "production"` for safety.

## Data Flow

The validation now follows this flow:

```
1. Get user profile via get_current_user_profile RPC
   ├─ Extract: organization_id, dealer_id, role, status, completion %
   └─ If missing, query organization_users table

2. If dealer_id missing:
   ├─ Try get_user_dealer_id RPC
   ├─ Try query dealers table by organization_id
   └─ If still missing AND organization exists:
       └─ Auto-create dealer via ensure_dealer_for_current_user()

3. Validate:
   ├─ Organization exists? (BLOCK if missing)
   ├─ Organization active? (WARN if not)
   ├─ Dealer exists? (BLOCK if missing, auto-create if org exists)
   ├─ User role allows listing? (BLOCK if viewer)
   └─ Profile completion > 50%? (WARN if not)

4. If critical items missing → BLOCK with specific error
   If non-critical items missing → WARN but continue
```

## Required Database Setup

Before using the auto-creation feature, run the migration:

```sql
-- Run this in Supabase SQL Editor
\i scripts/create-missing-dealer.sql
```

Or copy-paste the contents of `scripts/create-missing-dealer.sql` into the SQL Editor.

## Testing

### Test Case 1: User with Organization but No Dealer
1. User has organization_users record
2. Organization exists and is active
3. No dealer record exists
4. **Expected**: Dealer record auto-created, listing creation proceeds

### Test Case 2: User with Incomplete Profile
1. User has organization and dealer
2. Organization completion: 30%
3. Dealer completion: 20%
4. **Expected**: Warning logged, listing creation proceeds

### Test Case 3: User with No Organization
1. User has no organization_users record
2. **Expected**: Error message: "Organization not found. Please complete organization setup at /profile"

### Test Case 4: User with Viewer Role
1. User has organization and dealer
2. User role is "viewer"
3. **Expected**: Error message: "Your role is 'viewer' which cannot create listings..."

## Troubleshooting

### Issue: "Function ensure_dealer_for_current_user does not exist"
**Solution**: Run the migration in `scripts/create-missing-dealer.sql`

### Issue: "Organization status is not active"
**Solution**: Update organization status to 'active' in Supabase dashboard or contact support

### Issue: Auto-creation fails silently
**Solution**: 
1. Check Supabase logs for errors
2. Verify user has active organization_users record
3. Run diagnostic query to identify the issue

## Next Steps

1. **Run Diagnostic Query**: Use `scripts/diagnose-user-setup.sql` to check your current setup
2. **Run Migration**: Execute `scripts/create-missing-dealer.sql` to enable auto-creation
3. **Test Listing Creation**: Try creating a listing at `/dealer/listings/new`
4. **Check Logs**: Review server logs for any warnings or errors

## Files Modified

- `server/routers.ts` - Enhanced validation logic
- `scripts/diagnose-user-setup.sql` - New diagnostic query
- `scripts/create-missing-dealer.sql` - New auto-creation migration

## Environment Variables

Add to `.env` for development:
```env
SKIP_PROFILE_VALIDATION=true  # Skip validation in non-production
```


