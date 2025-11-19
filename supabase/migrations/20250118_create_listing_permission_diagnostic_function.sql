-- Create diagnostic function to check why user cannot create listings
-- This function returns detailed information about which conditions pass/fail

CREATE OR REPLACE FUNCTION "01. Organization".diagnose_listing_permission()
RETURNS TABLE (
  user_id uuid,
  has_organization_user boolean,
  organization_user_status text,
  organization_user_role text,
  has_organization boolean,
  organization_status text,
  organization_name text,
  has_organization_type boolean,
  organization_type_can_list boolean,
  has_dealer boolean,
  all_conditions_met boolean,
  failure_reasons text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_org_user boolean := false;
  v_org_user_status text;
  v_org_user_role text;
  v_has_org boolean := false;
  v_org_status text;
  v_org_name text;
  v_has_org_type boolean := false;
  v_can_list boolean := false;
  v_has_dealer boolean := false;
  v_failure_reasons text[] := ARRAY[]::text[];
BEGIN
  -- Get current user ID from auth context
  v_user_id := auth.uid();
  
  -- If no user is authenticated, return early
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 
      NULL::uuid,
      false,
      NULL::text,
      NULL::text,
      false,
      NULL::text,
      NULL::text,
      false,
      false,
      false,
      false,
      ARRAY['No authenticated user']::text[];
    RETURN;
  END IF;
  
  -- Check organization_users record
  SELECT 
    true,
    ou.status,
    ou.role,
    CASE WHEN o.id IS NOT NULL THEN true ELSE false END,
    o.status,
    o.organization_name,
    CASE WHEN ot.id IS NOT NULL THEN true ELSE false END,
    COALESCE(ot.can_list_vehicles, false),
    CASE WHEN d.id IS NOT NULL THEN true ELSE false END
  INTO 
    v_has_org_user,
    v_org_user_status,
    v_org_user_role,
    v_has_org,
    v_org_status,
    v_org_name,
    v_has_org_type,
    v_can_list,
    v_has_dealer
  FROM "01. Organization".organization_users ou
  LEFT JOIN "01. Organization".organizations o ON ou.organization_id = o.id
  LEFT JOIN "01. Organization".organization_types ot ON o.organization_type_id = ot.id
  LEFT JOIN "02a. Dealership".dealers d ON d.organization_id = o.id
  WHERE ou.user_id = v_user_id
  LIMIT 1;
  
  -- Build failure reasons
  IF NOT v_has_org_user THEN
    v_failure_reasons := array_append(v_failure_reasons, 'No organization_users record found');
  END IF;
  
  IF v_has_org_user AND v_org_user_status != 'active' THEN
    v_failure_reasons := array_append(v_failure_reasons, 'Organization user status is "' || COALESCE(v_org_user_status, 'NULL') || '" (must be "active")');
  END IF;
  
  IF v_has_org_user AND v_org_user_role = 'viewer' THEN
    v_failure_reasons := array_append(v_failure_reasons, 'User role is "viewer" (must be owner, admin, or member)');
  END IF;
  
  IF NOT v_has_org THEN
    v_failure_reasons := array_append(v_failure_reasons, 'No organization record found');
  END IF;
  
  IF v_has_org AND v_org_status != 'active' THEN
    v_failure_reasons := array_append(v_failure_reasons, 'Organization status is "' || COALESCE(v_org_status, 'NULL') || '" (must be "active")');
  END IF;
  
  IF NOT v_has_org_type THEN
    v_failure_reasons := array_append(v_failure_reasons, 'No organization type found');
  END IF;
  
  IF v_has_org_type AND NOT v_can_list THEN
    v_failure_reasons := array_append(v_failure_reasons, 'Organization type does not allow listing vehicles (can_list_vehicles = false)');
  END IF;
  
  IF NOT v_has_dealer THEN
    v_failure_reasons := array_append(v_failure_reasons, 'No dealer record found for organization');
  END IF;
  
  -- Return diagnostic data
  RETURN QUERY SELECT 
    v_user_id,
    v_has_org_user,
    COALESCE(v_org_user_status, 'N/A'),
    COALESCE(v_org_user_role, 'N/A'),
    v_has_org,
    COALESCE(v_org_status, 'N/A'),
    COALESCE(v_org_name, 'N/A'),
    v_has_org_type,
    v_can_list,
    v_has_dealer,
    (array_length(v_failure_reasons, 1) IS NULL),
    v_failure_reasons;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION "01. Organization".diagnose_listing_permission() TO authenticated;
GRANT EXECUTE ON FUNCTION "01. Organization".diagnose_listing_permission() TO anon;

-- Add comment
COMMENT ON FUNCTION "01. Organization".diagnose_listing_permission() IS 
'Diagnostic function that returns detailed information about why a user cannot create listings. Shows which conditions pass/fail and specific failure reasons.';



