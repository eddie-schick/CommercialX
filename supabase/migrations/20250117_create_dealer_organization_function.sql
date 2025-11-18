-- Migration: Create/Update create_dealer_organization RPC Function
-- This function atomically creates organization, organization_user, and dealer records
-- Properly links auth.users.id to organization_users.user_id

CREATE OR REPLACE FUNCTION create_dealer_organization(
  p_user_id uuid,
  p_email varchar,
  p_user_name varchar,
  p_org_name varchar,
  p_business_type varchar DEFAULT 'independent_dealer',
  p_city varchar DEFAULT NULL,
  p_state_province varchar DEFAULT NULL,
  p_zip_postal_code varchar DEFAULT NULL,
  p_primary_phone varchar DEFAULT NULL,
  p_website_url varchar DEFAULT NULL,
  p_makes_carried text[] DEFAULT NULL,
  p_specializations text[] DEFAULT NULL,
  p_dealer_license_number varchar DEFAULT NULL,
  p_dealer_license_state varchar DEFAULT NULL,
  p_tax_id varchar DEFAULT NULL,
  p_has_service_department boolean DEFAULT false,
  p_has_parts_department boolean DEFAULT false,
  p_can_install_upfits boolean DEFAULT false,
  p_business_hours jsonb DEFAULT NULL,
  p_sales_territory_states text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id bigint;
  v_organization_type_id bigint;
  v_dealer_id bigint;
  v_organization_user_id bigint;
  v_user_exists boolean;
  v_slug varchar;
BEGIN
  -- Verify user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User with ID % does not exist in auth.users', p_user_id;
  END IF;

  -- Check if user already has an organization
  SELECT organization_id INTO v_organization_id
  FROM "01. Organization".organization_users
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_organization_id IS NOT NULL THEN
    -- User already has an organization, return existing one
    SELECT d.id INTO v_dealer_id
    FROM "02a. Dealership".dealers d
    WHERE d.organization_id = v_organization_id
    LIMIT 1;
    
    -- Get organization_user_id
    SELECT id INTO v_organization_user_id
    FROM "01. Organization".organization_users
    WHERE organization_id = v_organization_id AND user_id = p_user_id
    LIMIT 1;
    
    RETURN jsonb_build_object(
      'success', true,
      'organization_id', v_organization_id,
      'organization_user_id', COALESCE(v_organization_user_id, 0),
      'dealer_id', COALESCE(v_dealer_id, 0),
      'message', 'Organization already exists'
    );
  END IF;

  -- Get organization_type_id for dealer using type_code
  SELECT id INTO v_organization_type_id
  FROM "01. Organization".organization_types
  WHERE type_code = 'dealer' OR type_code = 'independent_dealer' OR type_code = 'franchise_dealer'
  LIMIT 1;

  IF v_organization_type_id IS NULL THEN
    -- Create dealer organization type if it doesn't exist
    INSERT INTO "01. Organization".organization_types (
      type_code,
      display_name,
      description,
      can_list_vehicles,
      can_list_products,
      can_request_quotes,
      can_receive_quotes
    )
    VALUES (
      'dealer',
      'Dealer',
      'Vehicle dealership',
      true,
      false,
      false,
      true
    )
    RETURNING id INTO v_organization_type_id;
  END IF;

  -- Generate slug from organization name
  v_slug := lower(regexp_replace(p_org_name, '[^a-z0-9]+', '-', 'gi'));
  v_slug := regexp_replace(v_slug, '^-|-$', '', 'g');
  
  -- Ensure slug is unique
  WHILE EXISTS (SELECT 1 FROM "01. Organization".organizations WHERE slug = v_slug) LOOP
    v_slug := v_slug || '-' || floor(random() * 1000)::text;
  END LOOP;

  -- Create organization
  INSERT INTO "01. Organization".organizations (
    organization_type_id,
    organization_name,
    slug,
    primary_email,
    city,
    state_province,
    postal_code,
    primary_phone,
    website_url,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    v_organization_type_id,
    p_org_name,
    v_slug,
    p_email,
    p_city,
    p_state_province,
    p_zip_postal_code,
    p_primary_phone,
    p_website_url,
    p_user_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_organization_id;

  -- Create organization_user record
  INSERT INTO "01. Organization".organization_users (
    organization_id,
    user_id,
    role,
    permissions,
    joined_at,
    created_at,
    updated_at
  )
  VALUES (
    v_organization_id,
    p_user_id,
    'owner',
    jsonb_build_object(
      'canCreateListings', true,
      'canManageOrganization', true,
      'canInviteUsers', true,
      'canManageUsers', true,
      'isAdmin', true,
      'isOwner', true
    ),
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_organization_user_id;

  -- Create dealer record
  -- Note: Location, phone, and website are stored in organizations table, not dealers table
  INSERT INTO "02a. Dealership".dealers (
    organization_id,
    business_type,
    dealer_license_number,
    dealer_license_state,
    tax_id,
    makes_carried,
    specializations,
    has_service_department,
    has_parts_department,
    can_install_upfits,
    business_hours,
    sales_territory_states,
    created_at,
    updated_at
  )
  VALUES (
    v_organization_id,
    p_business_type,
    p_dealer_license_number,
    p_dealer_license_state,
    p_tax_id,
    p_makes_carried,
    p_specializations,
    p_has_service_department,
    p_has_parts_department,
    p_can_install_upfits,
    p_business_hours,
    p_sales_territory_states,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_dealer_id;

  -- Return success with IDs
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_organization_id,
    'organization_user_id', v_organization_user_id,
    'dealer_id', v_dealer_id,
    'message', 'Organization and dealer created successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create organization: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_dealer_organization TO authenticated;
GRANT EXECUTE ON FUNCTION create_dealer_organization TO anon;

-- Add comment
COMMENT ON FUNCTION create_dealer_organization IS 
'Atomically creates organization, organization_user (linked to auth.users.id), and dealer records. 
The user_id parameter MUST be a valid UUID from auth.users.id table.';
