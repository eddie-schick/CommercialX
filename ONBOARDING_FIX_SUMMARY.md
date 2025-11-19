# User Onboarding Flow Fix - Summary

## Problem
When users signed up, the system only created an `auth.users` record but didn't create:
1. Organization record in `"01. Organization".organizations`
2. Link in `"01. Organization".organization_users`
3. Dealer record in `"02a. Dealership".dealers`

This caused "Organization not found" errors when users tried to create listings.

## Solution

### 1. Created `create_dealer_organization` Function
**File:** `supabase/migrations/20250118_create_dealer_organization_function.sql`

This function creates the complete dealer organization chain in a single transaction:
- Creates or updates organization record (sets type to 'dealer')
- Creates organization_users link (role: 'owner', status: 'active')
- Creates dealer record (only for dealer organization types)

The function can be called manually via the `setupOrganization` tRPC mutation, and it handles:
- Checking for existing organizations (returns existing if found)
- Updating organization type to 'dealer' if it's not already
- Only creating dealer record when organization type is 'dealer'
- Generating unique slugs
- Setting proper defaults
- All required fields for the three records

**Important:** This function only creates dealer records for organizations with type 'dealer'. If the organization type is not dealer, no dealer record is created.

### 2. Created Auto-Creation Trigger
**File:** `supabase/migrations/20250118_auto_create_organization_on_signup.sql`

This trigger automatically creates the organization and organization_users link when:
- A user confirms their email (`email_confirmed_at` is set)
- The user doesn't already have an organization

The trigger:
- Creates organization with default name: `"{User's Name}'s Organization"`
- Uses a generic/default organization type (not dealer-specific)
- Creates organization_users link with 'owner' role
- Does NOT create dealer record automatically
- Sets records to 'active' status

**Important:** The dealer record is only created when the user explicitly selects "dealer" as the organization type during onboarding. This ensures dealer records are only created for dealer organizations.

### 3. Updated Email Verification Flows
**Files:** 
- `client/src/pages/VerifyEmail.tsx`
- `client/src/pages/AuthVerify.tsx`

Updated both verification pages to:
- Wait 1 second after email confirmation for the trigger to complete
- Check if organization exists
- Redirect to `/onboarding/organization` if no organization (fallback)
- Redirect to `/dealer` if organization exists

## Flow After Fix

1. **User Signs Up** (`SignupForm.tsx`)
   - Creates `auth.users` record
   - Redirects to `/verify-email`

2. **User Verifies Email** (`VerifyEmail.tsx` or `AuthVerify.tsx`)
   - When `email_confirmed_at` is set, the trigger fires
   - Trigger automatically creates:
     - Organization (with default name and generic type)
     - organization_users link
     - **NO dealer record** (only created when user selects dealer type)
   - After 1 second wait, checks if organization exists
   - Redirects to `/profile` or `/onboarding/organization` for setup

3. **Profile/Onboarding** (`Profile.tsx` or `OnboardingWizard.tsx`)
   - User selects organization type during onboarding
   - If user selects "dealer" as organization type:
     - Organization type is updated to 'dealer'
     - Dealer record is created via `create_dealer_organization` function
   - User can update organization name and details
   - User can proceed to create listings (if dealer type)

## Key Features

- **Automatic Organization Creation**: Organization and organization_users link are created automatically on email confirmation
- **Dealer Record Only for Dealer Types**: Dealer records are only created when user explicitly selects "dealer" as organization type
- **Type-Safe**: `ensure_dealer_for_organization` function checks organization type before creating dealer record
- **Idempotent**: Trigger checks for existing organization before creating
- **Fallback**: If trigger fails, user is redirected to manual onboarding
- **Default Values**: Auto-created organizations have sensible defaults that can be updated

## Migration Files Created

1. `supabase/migrations/20250118_create_dealer_organization_function.sql`
   - Creates the `create_dealer_organization` RPC function

2. `supabase/migrations/20250118_auto_create_organization_on_signup.sql`
   - Creates the `handle_dealer_user_signup()` trigger function
   - Creates the trigger on `auth.users` table

## Testing Checklist

- [ ] New dealer user signs up
- [ ] User verifies email
- [ ] Organization is automatically created
- [ ] organization_users link is created with 'owner' role
- [ ] Dealer record is created
- [ ] User can access `/dealer` dashboard
- [ ] User can create listings without "Organization not found" errors
- [ ] User can update organization name in Profile page
- [ ] If trigger fails, user is redirected to onboarding

## Notes

- The trigger requires at least one active organization type to exist in `"01. Organization".organization_types`
- The trigger uses a generic/default organization type (not dealer-specific)
- The `create_dealer_organization` function requires a 'dealer' organization type to exist
- The `ensure_dealer_for_organization` function will only create dealer records for organizations with type 'dealer'
- If a user updates their organization type to 'dealer', the dealer record will be created automatically
- The default organization name can be updated by the user in the Profile page
- The trigger only runs once per user (checks for existing organization)

