-- Migration: Create/Update user_has_organization RPC Function
-- Checks if the current authenticated user has an organization

CREATE OR REPLACE FUNCTION user_has_organization()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  v_has_org boolean;
BEGIN
  -- Get current authenticated user ID from JWT token
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has an organization_user record
  SELECT EXISTS(
    SELECT 1 
    FROM "01. Organization".organization_users 
    WHERE user_id = current_user_id  -- CRITICAL: Uses auth.uid() to match auth.users.id
  ) INTO v_has_org;
  
  RETURN v_has_org;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION user_has_organization() TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_organization() TO anon;

-- Add comment
COMMENT ON FUNCTION user_has_organization IS 
'Checks if the current authenticated user has an organization.
Uses auth.uid() to get the user ID from the JWT token, which must match auth.users.id.';

