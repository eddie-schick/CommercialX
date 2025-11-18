-- Migration: Ensure RLS policies allow SECURITY DEFINER functions to work
-- Some RLS policies might be blocking the get_current_user_profile() function
-- even though it uses SECURITY DEFINER. This ensures the function can access data.

-- ============================================================================
-- Check if organizations table has RLS enabled
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = '01. Organization' 
    AND tablename = 'organizations'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'RLS is enabled on organizations table';
  ELSE
    RAISE NOTICE 'RLS is NOT enabled on organizations table';
  END IF;
END $$;

-- ============================================================================
-- Ensure get_current_user_profile() can access organizations
-- The function uses SECURITY DEFINER, so it should bypass RLS
-- But we'll verify the function owner has proper permissions
-- ============================================================================

-- Grant necessary permissions to the function owner (postgres by default)
-- This ensures the function can read from both tables
GRANT SELECT ON "01. Organization".organization_users TO postgres;
GRANT SELECT ON "01. Organization".organizations TO postgres;
GRANT SELECT ON "01. Organization".organization_types TO postgres;
GRANT SELECT ON "02a. Dealership".dealers TO postgres;

-- ============================================================================
-- Alternative: Create a policy that allows the function to read organizations
-- if the user has an organization_users record
-- ============================================================================
-- Note: This is only needed if RLS is blocking the function
-- Since the function uses SECURITY DEFINER, it should bypass RLS
-- But if there are issues, this policy will help

-- Check if a SELECT policy exists for organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = '01. Organization'
    AND tablename = 'organizations'
    AND cmd = 'SELECT'
  ) THEN
    -- Create a policy that allows users to view organizations they belong to
    EXECUTE '
    CREATE POLICY "Users can view their organizations"
    ON "01. Organization".organizations
    FOR SELECT
    TO authenticated
    USING (
      id IN (
        SELECT organization_id 
        FROM "01. Organization".organization_users 
        WHERE user_id = auth.uid()
      )
    )';
    
    RAISE NOTICE 'Created SELECT policy for organizations table';
  ELSE
    RAISE NOTICE 'SELECT policy already exists for organizations table';
  END IF;
END $$;

-- ============================================================================
-- Verify the function can be called
-- ============================================================================
-- This will test if the function works (run while authenticated)
-- SELECT * FROM get_current_user_profile();

