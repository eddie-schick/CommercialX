-- Create function to check if current user can create listings
-- This function checks:
-- 1. User has an active organization_users record
-- 2. Organization has a dealer record
-- 3. Organization type allows listing vehicles (can_list_vehicles = true)
-- 4. User role is not 'viewer' (owner, admin, or member are OK)
-- 5. Organization status is 'active'
-- 6. Organization user status is 'active'

CREATE OR REPLACE FUNCTION "01. Organization".user_can_create_listings()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_org boolean := false;
  v_has_dealer boolean := false;
  v_can_list boolean := false;
  v_user_role text;
  v_org_status text;
  v_user_status text;
BEGIN
  -- Get current user ID from auth context
  v_user_id := auth.uid();
  
  -- If no user is authenticated, return false
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has an active organization_users record
  -- and get organization details in one query
  SELECT 
    ou.role,
    ou.status as user_status,
    o.status as org_status,
    ot.can_list_vehicles,
    CASE WHEN d.id IS NOT NULL THEN true ELSE false END as has_dealer
  INTO 
    v_user_role,
    v_user_status,
    v_org_status,
    v_can_list,
    v_has_dealer
  FROM "01. Organization".organization_users ou
  INNER JOIN "01. Organization".organizations o ON ou.organization_id = o.id
  INNER JOIN "01. Organization".organization_types ot ON o.organization_type_id = ot.id
  LEFT JOIN "02a. Dealership".dealers d ON d.organization_id = o.id
  WHERE ou.user_id = v_user_id
    AND ou.status = 'active'
    AND o.status = 'active'
  LIMIT 1;
  
  -- If no organization found, return false
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check all conditions:
  -- 1. User must have active organization_users record (already checked above)
  -- 2. Organization must be active (already checked above)
  -- 3. Organization type must allow listing vehicles
  -- 4. User must have a dealer record
  -- 5. User role must not be 'viewer'
  -- 6. Organization user status must be 'active' (already checked above)
  
  IF v_can_list = true 
     AND v_has_dealer = true 
     AND v_user_role != 'viewer'
     AND v_user_status = 'active'
     AND v_org_status = 'active' THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION "01. Organization".user_can_create_listings() TO authenticated;
GRANT EXECUTE ON FUNCTION "01. Organization".user_can_create_listings() TO anon;

-- Add comment
COMMENT ON FUNCTION "01. Organization".user_can_create_listings() IS 
'Checks if the current authenticated user can create vehicle listings. Returns true if user has an active organization with a dealer record, organization type allows listing vehicles, and user role is owner/admin/member (not viewer).';

