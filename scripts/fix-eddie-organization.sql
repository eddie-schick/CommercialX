-- Fix organization for eddie.schick@shaed.ai
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_user_id uuid;
  v_org_id bigint;
  v_org_user_id bigint;
  v_org_type_id bigint;
  v_slug text;
  v_user_name text;
  v_org_name text;
BEGIN
  -- Get your user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'eddie.schick@shaed.ai';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: eddie.schick@shaed.ai';
  END IF;

  -- Check if organization already exists
  IF EXISTS (
    SELECT 1 FROM "01. Organization".organization_users
    WHERE user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE NOTICE 'User already has an organization';
    RETURN;
  END IF;

  -- Get default organization type
  SELECT id INTO v_org_type_id
  FROM "01. Organization".organization_types
  WHERE is_active = true
  ORDER BY 
    CASE WHEN type_code IN ('business', 'company', 'organization', 'default') THEN 1 ELSE 2 END,
    display_order,
    id
  LIMIT 1;

  IF v_org_type_id IS NULL THEN
    RAISE EXCEPTION 'No active organization type found. Please create at least one organization type.';
  END IF;

  -- Get user name
  SELECT 
    COALESCE(
      raw_user_meta_data->>'name',
      raw_user_meta_data->>'firstName' || ' ' || raw_user_meta_data->>'lastName',
      split_part(email, '@', 1)
    )
  INTO v_user_name
  FROM auth.users
  WHERE id = v_user_id;

  v_org_name := v_user_name || '''s Organization';

  -- Generate slug
  v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
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
    created_at,
    updated_at
  )
  SELECT 
    v_org_type_id,
    v_org_name,
    email,
    v_slug,
    'active',
    v_user_id,
    now(),
    now()
  FROM auth.users
  WHERE id = v_user_id
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
    v_user_id,
    'owner',
    'active',
    true,
    false,
    now(),
    now(),
    now()
  )
  RETURNING id INTO v_org_user_id;

  RAISE NOTICE '✅ Successfully created organization % (ID: %) for Eddie Schick', v_org_name, v_org_id;
  RAISE NOTICE '✅ Organization user link created (ID: %)', v_org_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Go to /profile in your app';
  RAISE NOTICE '2. Select "dealer" as your organization type';
  RAISE NOTICE '3. Complete your dealer profile';
  RAISE NOTICE '4. You should then be able to create listings!';
END $$;

-- Verify it worked
SELECT 
  u.email,
  ou.organization_id,
  o.organization_name,
  o.organization_type_id,
  ot.type_code as org_type,
  ot.display_name as org_type_name,
  d.id as dealer_id,
  CASE 
    WHEN ou.organization_id IS NOT NULL THEN '✅ Has Organization'
    ELSE '❌ No Organization'
  END as status
FROM auth.users u
LEFT JOIN "01. Organization".organization_users ou ON ou.user_id = u.id AND ou.status = 'active'
LEFT JOIN "01. Organization".organizations o ON o.id = ou.organization_id
LEFT JOIN "01. Organization".organization_types ot ON ot.id = o.organization_type_id
LEFT JOIN "02a. Dealership".dealers d ON d.organization_id = o.id
WHERE u.email = 'eddie.schick@shaed.ai';



