-- Migration: Create function to create dealer organization chain
-- This function creates organization, organization_users link, and dealer record in one transaction
-- It's called from the application when a dealer user completes onboarding

-- Drop existing function if it exists with different signature (to avoid conflicts)
DROP FUNCTION IF EXISTS create_dealer_organization CASCADE;

-- Create the function
CREATE OR REPLACE FUNCTION create_dealer_organization(
  p_user_id uuid,
  p_email text,
  p_user_name text,
  p_org_name text,
  p_business_type text DEFAULT 'independent_dealer',
  p_city text DEFAULT NULL,
  p_state_province text DEFAULT NULL,
  p_zip_postal_code text DEFAULT NULL,
  p_primary_phone text DEFAULT NULL,
  p_website_url text DEFAULT NULL,
  p_makes_carried text[] DEFAULT NULL,
  p_specializations text[] DEFAULT NULL,
  p_dealer_license_number text DEFAULT NULL,
  p_dealer_license_state text DEFAULT NULL,
  p_tax_id text DEFAULT NULL,
  p_has_service_department boolean DEFAULT false,
  p_has_parts_department boolean DEFAULT false,
  p_can_install_upfits boolean DEFAULT false,
  p_business_hours jsonb DEFAULT NULL,
  p_sales_territory_states text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id bigint;
  v_dealer_id bigint;
  v_org_user_id bigint;
  v_org_type_id bigint;
  v_slug text;
  v_existing_org_id bigint;
  v_existing_dealer_id bigint;
BEGIN
  -- Get dealer organization type ID first (needed for checks)
  SELECT id INTO v_org_type_id
  FROM "01. Organization".organization_types
  WHERE type_code = 'dealer'
  LIMIT 1;

  IF v_org_type_id IS NULL THEN
    RAISE EXCEPTION 'Dealer organization type not found. Please ensure organization_types table has a dealer type.';
  END IF;

  -- Check if user already has an organization
  SELECT organization_id INTO v_existing_org_id
  FROM "01. Organization".organization_users
  WHERE user_id = p_user_id
    AND status = 'active'
  LIMIT 1;

  -- If organization exists, handle it
  IF v_existing_org_id IS NOT NULL THEN
    -- Check if dealer exists
    SELECT id INTO v_existing_dealer_id
    FROM "02a. Dealership".dealers
    WHERE organization_id = v_existing_org_id
    LIMIT 1;

    -- Update organization type to dealer if it's not already
    UPDATE "01. Organization".organizations
    SET organization_type_id = v_org_type_id,
        organization_name = p_org_name, -- Update name if provided
        updated_at = now()
    WHERE id = v_existing_org_id
      AND organization_type_id != v_org_type_id;

    -- If dealer doesn't exist yet, create it (since we're now/becoming a dealer type)
    IF v_existing_dealer_id IS NULL THEN
      -- Create dealer record for existing organization
      INSERT INTO "02a. Dealership".dealers (
        organization_id,
        business_type,
        dealer_license_number,
        dealer_license_state,
        tax_id,
        specializations,
        makes_carried,
        has_service_department,
        has_parts_department,
        can_install_upfits,
        business_hours,
        sales_territory_states,
        can_special_order,
        accepts_trade_ins,
        delivery_available,
        accepts_fleet_inquiries,
        auto_respond_inquiries,
        inquiry_email_notification,
        weekly_performance_report,
        allow_price_negotiations,
        uses_b4a,
        can_order_fleet,
        can_order_government,
        profile_completion_percentage,
        created_at,
        updated_at
      ) VALUES (
        v_existing_org_id,
        p_business_type,
        p_dealer_license_number,
        p_dealer_license_state,
        p_tax_id,
        p_specializations,
        p_makes_carried,
        p_has_service_department,
        p_has_parts_department,
        p_can_install_upfits,
        p_business_hours,
        p_sales_territory_states,
        true,
        true,
        true,
        true,
        false,
        true,
        true,
        true,
        true,
        false,
        false,
        0,
        now(),
        now()
      )
      RETURNING id INTO v_existing_dealer_id;
    END IF;

    -- Return existing/updated records
    RETURN jsonb_build_object(
      'organization_id', v_existing_org_id,
      'dealer_id', COALESCE(v_existing_dealer_id, 0),
      'organization_user_id', (
        SELECT id FROM "01. Organization".organization_users
        WHERE user_id = p_user_id AND organization_id = v_existing_org_id
        LIMIT 1
      ),
      'created', false
    );
  END IF;

  -- Generate slug from organization name
  v_slug := lower(regexp_replace(p_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-|-$', '', 'g');

  -- Ensure slug is unique
  WHILE EXISTS (SELECT 1 FROM "01. Organization".organizations WHERE slug = v_slug) LOOP
    v_slug := v_slug || '-' || floor(random() * 1000)::text;
  END LOOP;

  -- Create organization
  INSERT INTO "01. Organization".organizations (
    organization_type_id,
    organization_name,
    primary_email,
    slug,
    status,
    created_by,
    city,
    state_province,
    postal_code,
    primary_phone,
    website_url,
    tax_id,
    business_hours,
    sales_territory_states,
    created_at,
    updated_at
  ) VALUES (
    v_org_type_id,
    p_org_name,
    p_email,
    v_slug,
    'active', -- Set to active by default
    p_user_id,
    p_city,
    p_state_province,
    p_zip_postal_code,
    p_primary_phone,
    p_website_url,
    p_tax_id,
    p_business_hours,
    p_sales_territory_states,
    now(),
    now()
  )
  RETURNING id INTO v_org_id;

  -- Create organization_users link
  INSERT INTO "01. Organization".organization_users (
    organization_id,
    user_id,
    role,
    status,
    email_notifications,
    sms_notifications,
    joined_at,
    created_at,
    updated_at
  ) VALUES (
    v_org_id,
    p_user_id,
    'owner',
    'active',
    true,
    false,
    now(),
    now(),
    now()
  )
  RETURNING id INTO v_org_user_id;

  -- Create dealer record
  INSERT INTO "02a. Dealership".dealers (
    organization_id,
    business_type,
    dealer_license_number,
    dealer_license_state,
    tax_id,
    specializations,
    makes_carried,
    has_service_department,
    has_parts_department,
    can_install_upfits,
    business_hours,
    sales_territory_states,
    can_special_order,
    accepts_trade_ins,
    delivery_available,
    accepts_fleet_inquiries,
    auto_respond_inquiries,
    inquiry_email_notification,
    weekly_performance_report,
    allow_price_negotiations,
    uses_b4a,
    can_order_fleet,
    can_order_government,
    profile_completion_percentage,
    created_at,
    updated_at
  ) VALUES (
    v_org_id,
    p_business_type,
    p_dealer_license_number,
    p_dealer_license_state,
    p_tax_id,
    p_specializations,
    p_makes_carried,
    p_has_service_department,
    p_has_parts_department,
    p_can_install_upfits,
    p_business_hours,
    p_sales_territory_states,
    true,
    true,
    true,
    true,
    false,
    true,
    true,
    true,
    true,
    false,
    false,
    0,
    now(),
    now()
  )
  RETURNING id INTO v_dealer_id;

  -- Return result
  RETURN jsonb_build_object(
    'organization_id', v_org_id,
    'dealer_id', v_dealer_id,
    'organization_user_id', v_org_user_id,
    'created', true
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_dealer_organization(
  uuid, text, text, text, text, text, text, text, text, text, text[], text[], text, text, text, boolean, boolean, boolean, jsonb, text[]
) TO authenticated;

-- Add comment (must specify full signature to avoid ambiguity)
COMMENT ON FUNCTION create_dealer_organization(
  uuid, text, text, text, text, text, text, text, text, text, text[], text[], text, text, text, boolean, boolean, boolean, jsonb, text[]
) IS 
'Creates a complete dealer organization chain: organization, organization_users link, and dealer record. Returns JSONB with IDs and created status. Only creates dealer record for dealer organization types.';

