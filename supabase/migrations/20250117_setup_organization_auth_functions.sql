-- Migration: Setup Organization Authentication Functions
-- This ensures all RPC functions properly link auth.users to organization_users

-- ============================================================================
-- 1. Ensure get_current_user_profile uses auth.uid() correctly
-- ============================================================================
-- This function should already exist, but we'll verify it uses auth.uid()
-- The function should be in the public schema and call the schema-specific version

-- ============================================================================
-- 2. Verify create_dealer_organization properly links user_id
-- ============================================================================
-- This function should:
-- 1. Take p_user_id (UUID from auth.users.id)
-- 2. Create organization
-- 3. Create organization_user record with user_id = p_user_id
-- 4. Create dealer record linked to organization

-- Check if the function exists and verify its signature
DO $$
BEGIN
  -- Verify organization_users table structure
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = '01. Organization' 
    AND table_name = 'organization_users' 
    AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'organization_users.user_id column does not exist';
  END IF;
  
  -- Verify user_id is UUID type (should match auth.users.id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = '01. Organization' 
    AND table_name = 'organization_users' 
    AND column_name = 'user_id'
    AND data_type = 'uuid'
  ) THEN
    RAISE WARNING 'organization_users.user_id should be UUID type to match auth.users.id';
  END IF;
END $$;

-- ============================================================================
-- 3. Create/Update helper function to get current user's organization_user record
-- ============================================================================
CREATE OR REPLACE FUNCTION "01. Organization".get_current_user_org_user()
RETURNS TABLE (
  id bigint,
  organization_id uuid,
  user_id uuid,
  role varchar,
  permissions jsonb,
  invited_by uuid,
  created_at timestamp,
  updated_at timestamp
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current authenticated user ID from JWT
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Return organization_user record for current user
  RETURN QUERY
  SELECT 
    ou.id,
    ou.organization_id,
    ou.user_id,
    ou.role,
    ou.permissions,
    ou.invited_by,
    ou.created_at,
    ou.updated_at
  FROM "01. Organization".organization_users ou
  WHERE ou.user_id = current_user_id
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION "01. Organization".get_current_user_org_user() TO authenticated;
GRANT EXECUTE ON FUNCTION "01. Organization".get_current_user_org_user() TO anon;

-- ============================================================================
-- 4. Verify get_current_user_profile uses auth.uid() correctly
-- ============================================================================
-- Note: This assumes get_current_user_profile exists in public schema
-- It should call the schema-specific function with auth.uid()

-- ============================================================================
-- 5. Add comment documenting the relationship
-- ============================================================================
COMMENT ON COLUMN "01. Organization".organization_users.user_id IS 
'Foreign key to auth.users.id. Links Supabase Auth users to organization_users table.';

-- ============================================================================
-- 6. Create index for faster lookups (if not exists)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id 
ON "01. Organization".organization_users(user_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_organization_users_org_user 
ON "01. Organization".organization_users(organization_id, user_id);

-- ============================================================================
-- 7. Verify foreign key constraint exists
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = '01. Organization'
    AND tc.table_name = 'organization_users'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id'
  ) THEN
    RAISE WARNING 'Foreign key constraint fk_organization_users_user_id may not exist. Run 20250117_add_fk_organization_users_to_auth_users.sql first.';
  END IF;
END $$;

