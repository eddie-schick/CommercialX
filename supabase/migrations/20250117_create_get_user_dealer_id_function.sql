-- Migration: Create/Update get_user_dealer_id RPC Function
-- Gets the dealer_id for the current authenticated user

CREATE OR REPLACE FUNCTION get_user_dealer_id()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  v_dealer_id bigint;
BEGIN
  -- Get current authenticated user ID from JWT token
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get dealer_id for current user's organization
  SELECT d.id INTO v_dealer_id
  FROM "02a. Dealership".dealers d
  INNER JOIN "01. Organization".organizations o ON d.organization_id = o.id
  INNER JOIN "01. Organization".organization_users ou ON ou.organization_id = o.id
  WHERE ou.user_id = current_user_id  -- CRITICAL: Uses auth.uid() to match auth.users.id
  LIMIT 1;
  
  RETURN v_dealer_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_dealer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_dealer_id() TO anon;

-- Add comment
COMMENT ON FUNCTION get_user_dealer_id IS 
'Returns the dealer_id for the current authenticated user.
Uses auth.uid() to get the user ID from the JWT token, which must match auth.users.id.';

