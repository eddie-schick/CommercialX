-- Script to create organization and organization_users for existing users
-- This fixes users who signed up before the trigger was created
-- Run this in Supabase SQL Editor

-- Step 1: Find users without organizations
-- Uncomment and run this first to see which users need fixing:
/*
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  ou.organization_id,
  o.organization_name
FROM auth.users u
LEFT JOIN "01. Organization".organization_users ou ON ou.user_id = u.id AND ou.status = 'active'
LEFT JOIN "01. Organization".organizations o ON o.id = ou.organization_id
WHERE ou.organization_id IS NULL
  AND u.email_confirmed_at IS NOT NULL
ORDER BY u.created_at;
*/

-- Step 2: Create organization for a specific user (replace USER_EMAIL with your email)
-- Or use this to create for ALL users without organizations:

DO $$
DECLARE
  v_user_record RECORD;
  v_org_id bigint;
  v_org_user_id bigint;
  v_org_type_id bigint;
  v_slug text;
  v_user_name text;
  v_org_name text;
  v_count integer := 0;
BEGIN
  -- Get a default organization type (prefer generic types, fallback to first active)
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

  -- Loop through users without organizations
  FOR v_user_record IN
    SELECT 
      u.id,
      u.email,
      u.raw_user_meta_data,
      u.email_confirmed_at
    FROM auth.users u
    WHERE u.email_confirmed_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 
        FROM "01. Organization".organization_users ou
        WHERE ou.user_id = u.id 
          AND ou.status = 'active'
      )
  LOOP
    -- Get user name for organization name
    v_user_name := COALESCE(
      v_user_record.raw_user_meta_data->>'name',
      v_user_record.raw_user_meta_data->>'firstName' || ' ' || v_user_record.raw_user_meta_data->>'lastName',
      split_part(v_user_record.email, '@', 1)
    );

    -- Create organization name
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
    ) VALUES (
      v_org_type_id,
      v_org_name,
      v_user_record.email,
      v_slug,
      'active',
      v_user_record.id,
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
      v_user_record.id,
      'owner',
      'active',
      true,
      false,
      now(),
      now(),
      now()
    )
    RETURNING id INTO v_org_user_id;

    v_count := v_count + 1;
    RAISE NOTICE 'Created organization % for user % (%)', v_org_id, v_user_record.email, v_user_name;
  END LOOP;

  RAISE NOTICE 'Completed: Created organizations for % users', v_count;
END $$;

-- Step 3: Verify the results
SELECT 
  u.email,
  ou.organization_id,
  o.organization_name,
  o.organization_type_id,
  ot.type_code as org_type,
  d.id as dealer_id
FROM auth.users u
LEFT JOIN "01. Organization".organization_users ou ON ou.user_id = u.id AND ou.status = 'active'
LEFT JOIN "01. Organization".organizations o ON o.id = ou.organization_id
LEFT JOIN "01. Organization".organization_types ot ON ot.id = o.organization_type_id
LEFT JOIN "02a. Dealership".dealers d ON d.organization_id = o.id
WHERE u.email_confirmed_at IS NOT NULL
ORDER BY u.created_at DESC;



