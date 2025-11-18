# Backend Integrations Summary

## Current Backend Architecture

### Authentication & User Management

1. **Supabase Auth** (`auth.users`)
   - Primary authentication system
   - Users are created via Supabase Auth signup
   - User ID is stored as UUID in `auth.users.id`

2. **Organization Users** (`01. Organization.organization_users`)
   - Links authenticated users to organizations
   - Foreign key: `user_id` → `auth.users.id`
   - Contains role, permissions, and organization membership
   - Created when user creates or joins an organization

3. **Organizations** (`01. Organization.organizations`)
   - Main organization entity
   - Contains organization details, settings, and metadata
   - Linked to users via `organization_users` table

4. **Dealers** (`02a. Dealership.dealers`)
   - Optional dealer-specific information
   - Linked to organizations via `organization_id`
   - Only created for organizations that need dealer functionality

### Key Database Functions

1. **`get_current_user_profile()`**
   - Returns current user's organization profile
   - Uses `auth.uid()` to get authenticated user ID from JWT
   - Joins `organization_users`, `organizations`, `organization_types`, and `dealers`
   - Returns: organization_id, role, permissions, organization_name, dealer_id, etc.

2. **`get_user_dealer_id()`**
   - Returns dealer ID for current user's organization
   - Returns null if no dealer record exists

3. **`user_has_organization()`**
   - Checks if current user has an organization
   - Returns boolean

4. **`create_dealer_organization()`**
   - Atomically creates organization, organization_user, and dealer records
   - Ensures proper linking between auth.users and organization_users

### Backend API Endpoints (tRPC)

#### Profile Router (`server/routers/profile.ts`)

- **`profile.get`**: Get complete user profile with personal, organization, and dealer data
- **`profile.updatePersonal`**: Update personal information
- **`profile.updateOrganization`**: Update organization details (owner/admin only)
- **`profile.updateDealer`**: Update dealer information (owner/admin only)
- **`profile.createOrganization`**: Create new organization and link user as owner
- **`profile.getOrganizationTypes`**: Get available organization types
- **`profile.diagnose`**: Diagnostic endpoint to check user-organization link (NEW)

#### User Router (`server/routers/user.ts`)

- **`user.getProfile`**: Get user profile via Supabase RPC
- **`user.getDealerId`**: Get user's dealer ID
- **`user.getOrganizationId`**: Get user's organization ID
- **`user.getOrganization`**: Get full organization details
- **`user.getDealer`**: Get full dealer details
- **`user.canCreateListings`**: Check if user can create listings
- **`user.updatePreferences`**: Update notification preferences

### Data Flow

1. **User Signup**:
   - User signs up via Supabase Auth → creates record in `auth.users`
   - User ID is stored as UUID

2. **Organization Creation**:
   - User creates organization via `profile.createOrganization`
   - Creates record in `01. Organization.organizations`
   - Creates record in `01. Organization.organization_users` linking `user_id` to `auth.users.id`
   - If organization type requires dealer, creates record in `02a. Dealership.dealers`

3. **Profile Retrieval**:
   - Frontend calls `profile.get` endpoint
   - Backend calls `get_current_user_profile()` RPC function
   - Function uses `auth.uid()` to get user ID from JWT token
   - Joins organization and dealer data
   - Returns complete profile

### Foreign Key Relationships

```
auth.users (id: uuid)
    ↓ (FK: user_id)
01. Organization.organization_users (user_id: uuid)
    ↓ (FK: organization_id)
01. Organization.organizations (id: bigint)
    ↓ (FK: organization_id)
02a. Dealership.dealers (organization_id: bigint)
```

### Recent Fixes

1. **Fixed `get_current_user_profile()` function**:
   - Added `joined_at` field to return type
   - Ensures all required fields are returned

2. **Improved profile router error handling**:
   - Added try-catch blocks for organization and dealer queries
   - Better logging for debugging
   - Continues gracefully if organization/dealer not found

3. **Added diagnostic endpoint**:
   - `profile.diagnose` endpoint to check user-organization link
   - Helps identify issues with data linking

4. **Improved Profile.tsx**:
   - Better organization display logic
   - Added debug info in development mode
   - Shows organization name when it exists

### Common Issues & Solutions

1. **"No organization set up yet" when organization exists**:
   - Check if `organization_users` record exists for user
   - Verify `user_id` in `organization_users` matches `auth.users.id`
   - Use `profile.diagnose` endpoint to identify the issue

2. **Organization not found**:
   - Verify foreign key constraints are set up
   - Check if organization was deleted
   - Verify user has correct permissions

3. **Dealer record not found**:
   - Check if organization type requires dealer
   - Verify dealer record was created
   - May be normal if organization type doesn't require dealer

### Migration Files

- `20250117_add_fk_organization_users_to_auth_users.sql`: Adds foreign key constraint
- `20250117_create_get_current_user_profile_function.sql`: Creates profile lookup function
- `20250117_create_dealer_organization_function.sql`: Creates atomic organization creation function
- `20250117_setup_organization_auth_functions.sql`: Sets up helper functions
- `20250117_verify_auth_organization_link.sql`: Verification queries

### Next Steps

1. Run the updated migration to update `get_current_user_profile()` function
2. Test the diagnostic endpoint to identify any existing issues
3. Verify foreign key constraints are properly set up in your database
4. Check if any existing users need their `organization_users` records created

