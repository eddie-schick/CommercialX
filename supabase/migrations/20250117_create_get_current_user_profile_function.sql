-- Migration: Create/Update get_current_user_profile RPC Function
-- This function gets the current user's profile with organization data
-- Uses auth.uid() to get the authenticated user's ID from JWT

-- Drop existing function if it exists (needed when return type changes)
DROP FUNCTION IF EXISTS get_current_user_profile() CASCADE;

CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  org_user_count integer;
  result jsonb;
BEGIN
  -- Get current authenticated user ID from JWT token
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    -- Return empty result if not authenticated
    RAISE WARNING 'get_current_user_profile: auth.uid() returned NULL - user not authenticated';
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  
  -- Check if organization_user record exists
  SELECT COUNT(*) INTO org_user_count
  FROM "01. Organization".organization_users
  WHERE user_id = current_user_id;
  
  IF org_user_count = 0 THEN
    RAISE WARNING 'get_current_user_profile: No organization_users record found for user_id: %', current_user_id;
    RETURN jsonb_build_object('error', 'no_organization');
  END IF;
  
  -- Build complete profile from organization schema
  SELECT jsonb_build_object(
    'id', ou.id,
    'organization_id', ou.organization_id,
    'user_id', ou.user_id,
    'role', ou.role,
    'permissions', ou.permissions,
    'created_at', ou.created_at,
    'updated_at', ou.updated_at,
    'joined_at', ou.joined_at,
    'organization', CASE 
      WHEN o.id IS NOT NULL THEN (
        row_to_json(o.*)::jsonb ||
        jsonb_build_object(
          'organization_type', CASE 
            WHEN ot.id IS NOT NULL THEN jsonb_build_object(
              'id', ot.id,
              'type_code', ot.type_code,
              'display_name', ot.display_name,
              'description', ot.description,
              'can_list_vehicles', ot.can_list_vehicles,
              'can_list_products', ot.can_list_products,
              'is_active', ot.is_active
            )
            ELSE NULL
          END
        )
      )
      ELSE NULL
    END,
    'dealer', CASE 
      WHEN d.id IS NOT NULL THEN row_to_json(d.*)::jsonb
      ELSE NULL
    END
  ) INTO result
  FROM "01. Organization".organization_users ou
  LEFT JOIN "01. Organization".organizations o ON ou.organization_id = o.id
  LEFT JOIN "01. Organization".organization_types ot ON o.organization_type_id = ot.id
  LEFT JOIN "02a. Dealership".dealers d ON d.organization_id = o.id
  WHERE ou.user_id = current_user_id
  LIMIT 1;
  
  -- If no rows returned, log for debugging
  IF result IS NULL THEN
    RAISE WARNING 'get_current_user_profile: Query returned no rows for user_id: % (organization_users count: %)', current_user_id, org_user_count;
    RETURN jsonb_build_object('error', 'no_data');
  END IF;
  
  -- Check if organization was found (even with LEFT JOIN, we should verify)
  IF (result->>'organization') IS NULL OR (result->'organization'->>'id') IS NULL THEN
    -- Organization user exists but organization not found - log for debugging
    RAISE WARNING 'get_current_user_profile: organization_users record found (id: %, organization_id: %) but organization not found in database', 
      result->>'id', result->>'organization_id';
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_profile() TO anon;

-- Add comment
COMMENT ON FUNCTION get_current_user_profile IS 
'Returns the current authenticated user''s organization_user profile with organization and dealer data.
Uses auth.uid() to get the user ID from the JWT token, which must match auth.users.id.
The user_id in organization_users must be linked to auth.users.id via foreign key.';
