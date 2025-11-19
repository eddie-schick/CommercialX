-- Migration: Create functions to ensure dealer records exist
-- This migration creates functions that automatically create dealer records
-- for organizations that don't have one yet

-- Function to create dealer record if missing for an organization
CREATE OR REPLACE FUNCTION "02a. Dealership".ensure_dealer_for_organization(
  p_organization_id bigint
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dealer_id bigint;
  v_org_name text;
  v_org_type_id bigint;
  v_is_dealer_type boolean;
BEGIN
  -- Check if dealer already exists
  SELECT id INTO v_dealer_id
  FROM "02a. Dealership".dealers
  WHERE organization_id = p_organization_id
  LIMIT 1;
  
  -- If dealer exists, return it
  IF v_dealer_id IS NOT NULL THEN
    RETURN v_dealer_id;
  END IF;
  
  -- Get organization details
  SELECT organization_name, organization_type_id
  INTO v_org_name, v_org_type_id
  FROM "01. Organization".organizations
  WHERE id = p_organization_id;
  
  -- If organization doesn't exist, raise error
  IF v_org_name IS NULL THEN
    RAISE EXCEPTION 'Organization % does not exist', p_organization_id;
  END IF;
  
  -- Check if organization type is dealer
  -- Only create dealer record if organization type is dealer
  SELECT EXISTS (
    SELECT 1 
    FROM "01. Organization".organization_types
    WHERE id = v_org_type_id
      AND type_code = 'dealer'
  ) INTO v_is_dealer_type;
  
  IF NOT v_is_dealer_type THEN
    RAISE EXCEPTION 'Organization % is not a dealer type. Dealer records can only be created for dealer organizations.', p_organization_id;
  END IF;
  
  -- Create dealer record with minimal required fields
  INSERT INTO "02a. Dealership".dealers (
    organization_id,
    business_type,
    can_special_order,
    accepts_trade_ins,
    has_service_department,
    has_parts_department,
    can_install_upfits,
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
    p_organization_id,
    'independent_dealer', -- Default business type
    true,
    true,
    false,
    false,
    false,
    true,
    true,
    false,
    true,
    true,
    true,
    true,
    false,
    false,
    0, -- Start with 0% completion
    now(),
    now()
  )
  RETURNING id INTO v_dealer_id;
  
  RETURN v_dealer_id;
END;
$$;

-- RPC wrapper for easier calling from application
-- This function automatically gets the current user's organization and ensures a dealer exists
CREATE OR REPLACE FUNCTION ensure_dealer_for_current_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id bigint;
  v_dealer_id bigint;
  v_result jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;
  
  -- Get user's organization
  SELECT organization_id INTO v_org_id
  FROM "01. Organization".organization_users
  WHERE user_id = v_user_id
    AND status = 'active'
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User does not have an active organization'
    );
  END IF;
  
  -- Ensure dealer exists
  BEGIN
    v_dealer_id := "02a. Dealership".ensure_dealer_for_organization(v_org_id);
    
    RETURN jsonb_build_object(
      'success', true,
      'dealer_id', v_dealer_id,
      'organization_id', v_org_id,
      'created', true
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION "02a. Dealership".ensure_dealer_for_organization(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_dealer_for_current_user() TO authenticated;

-- Add comments
COMMENT ON FUNCTION "02a. Dealership".ensure_dealer_for_organization(bigint) IS 
'Creates a dealer record for an organization if one does not exist. Returns the dealer ID (existing or newly created).';

COMMENT ON FUNCTION ensure_dealer_for_current_user() IS 
'Automatically ensures a dealer record exists for the current authenticated user''s organization. Returns JSONB with success status and dealer_id.';


