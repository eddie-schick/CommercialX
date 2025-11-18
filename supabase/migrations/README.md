# Supabase Migrations

This directory contains SQL migration files for the CommercialX database.

## Migration Files

### 1. Add Foreign Key from organization_users to auth.users

**File:** `20250117_add_fk_organization_users_to_auth_users.sql`

**Purpose:** Links the `organization_users.user_id` column to the `auth.users.id` table to establish a proper foreign key relationship.

### 2. Setup Organization Authentication Functions

**File:** `20250117_setup_organization_auth_functions.sql`

**Purpose:** Creates helper functions and ensures all RPC functions properly link `auth.users` to `organization_users` using `auth.uid()`.

### 3. Check for Orphaned Users

**File:** `20250117_check_orphaned_users.sql`

**Purpose:** Pre-migration check to identify any `organization_users` records with invalid `user_id` values before adding the foreign key constraint.

### Migration Order

Apply migrations in this order:

1. **First**: `20250117_check_orphaned_users.sql` - Check for data issues
2. **Second**: `20250117_add_fk_organization_users_to_auth_users.sql` - Add foreign key
3. **Third**: `20250117_setup_organization_auth_functions.sql` - Setup helper functions
4. **Fourth**: `20250117_create_dealer_organization_function.sql` - Create organization setup function
5. **Fifth**: `20250117_create_get_current_user_profile_function.sql` - Create profile function
6. **Sixth**: `20250117_create_get_user_dealer_id_function.sql` - Create dealer ID function
7. **Seventh**: `20250117_create_user_has_organization_function.sql` - Create organization check function
8. **Finally**: `20250117_verify_auth_organization_link.sql` - Verify everything works

### How to Apply Migrations

You have two options to apply these migrations:

#### Option 1: Using Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Run each migration file in order:
   - First: Copy and paste `20250117_check_orphaned_users.sql` and run it
   - If it finds orphaned records, fix them first
   - Second: Copy and paste `20250117_add_fk_organization_users_to_auth_users.sql` and run it
   - Third: Copy and paste `20250117_setup_organization_auth_functions.sql` and run it
   - Finally: Copy and paste `20250117_verify_auth_organization_link.sql` and run it to verify

#### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Apply all migrations
supabase db push
```

### What These Migrations Do

#### Migration 1: Foreign Key Constraint
1. **Adds Foreign Key Constraint**: Creates a foreign key relationship from `"01. Organization".organization_users.user_id` to `auth.users.id`
2. **Cascade Behavior**: 
   - `ON DELETE CASCADE`: If a user is deleted from `auth.users`, their organization_user records are automatically deleted
   - `ON UPDATE CASCADE`: If a user ID is updated, the foreign key is automatically updated
3. **Adds Index**: Creates an index on `user_id` for better query performance
4. **Adds Documentation**: Adds a comment explaining the relationship

#### Migration 2: Authentication Functions
1. **Creates Helper Function**: `get_current_user_org_user()` - Gets organization_user record for current authenticated user
2. **Uses auth.uid()**: Properly gets the current user ID from Supabase Auth JWT
3. **Verifies Table Structure**: Checks that `user_id` column is UUID type
4. **Creates Composite Index**: Adds index on (organization_id, user_id) for faster queries
5. **Security**: Function uses `SECURITY DEFINER` to access auth schema safely

### Verification

After running the migration, you can verify it worked by:

1. In Supabase Dashboard, go to **Table Editor**
2. Select the `"01. Organization".organization_users` table
3. Check the `user_id` column - it should now show a link icon indicating it's a foreign key
4. Click on the column to see the foreign key relationship details

### Important Notes

- The `auth.users` table is in Supabase's protected `auth` schema
- This foreign key ensures referential integrity between your organization data and Supabase auth users
- The cascade behavior means deleting a user will automatically clean up their organization associations
- Make sure all existing `user_id` values in `organization_users` reference valid `auth.users.id` values before running this migration

### Troubleshooting

If you get an error about existing data:
- Some `user_id` values might not exist in `auth.users`
- You'll need to either:
  - Remove orphaned records: `DELETE FROM "01. Organization".organization_users WHERE user_id NOT IN (SELECT id FROM auth.users);`
  - Or update them to valid user IDs
  - Then re-run the migration

## Storage Bucket Setup

### Create listing-images Bucket

The application requires a Supabase storage bucket named `listing-images` for uploading vehicle photos.

**To create the bucket:**

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name:** `listing-images`
   - **Public bucket:** ✅ Yes (checked)
   - **File size limit:** `52428800` (50MB)
   - **Allowed MIME types:** `image/jpeg, image/png, image/gif, image/webp`
5. Click **Create bucket**

**Alternative: Using Supabase CLI**

```bash
supabase storage create listing-images --public
```

**Note:** If you have `SUPABASE_SERVICE_ROLE_KEY` set in your environment variables, the application will attempt to create the bucket automatically on first upload. However, it's recommended to create it manually to ensure proper configuration.

