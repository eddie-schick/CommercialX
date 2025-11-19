-- Migration: Auto-create organization for users on email confirmation
-- This trigger automatically creates the organization and organization_users link
-- when a user confirms their email. Dealer record is only created when user selects
-- dealer as the organization type during onboarding.

-- Function to handle new user email confirmation
CREATE OR REPLACE FUNCTION handle_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id bigint;
  v_org_user_id bigint;
  v_org_type_id bigint;
  v_slug text;
  v_user_name text;
  v_org_name text;
BEGIN
  -- Only process if email is confirmed (this trigger fires on UPDATE)
  IF NEW.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Check if user already has an organization
  IF EXISTS (
    SELECT 1 FROM "01. Organization".organization_users
    WHERE user_id = NEW.id AND status = 'active'
  ) THEN
    RETURN NEW;
  END IF;

  -- Get user name for organization name
  v_user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'firstName' || ' ' || NEW.raw_user_meta_data->>'lastName',
    split_part(NEW.email, '@', 1)
  );

  -- Create a default organization name (user will update during onboarding)
  v_org_name := v_user_name || '''s Organization';

  -- Get a default/generic organization type ID (not dealer-specific)
  -- Try to find a generic type, or use the first active type as fallback
  SELECT id INTO v_org_type_id
  FROM "01. Organization".organization_types
  WHERE is_active = true
  ORDER BY 
    CASE WHEN type_code IN ('business', 'company', 'organization', 'default') THEN 1 ELSE 2 END,
    display_order,
    id
  LIMIT 1;

  IF v_org_type_id IS NULL THEN
    -- If no organization type exists, log warning and return
    RAISE WARNING 'No active organization type found. Organization will not be auto-created for user %', NEW.id;
    RETURN NEW;
  END IF;

  -- Generate slug from organization name
  v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-|-$', '', 'g');

  -- Ensure slug is unique
  WHILE EXISTS (SELECT 1 FROM "01. Organization".organizations WHERE slug = v_slug) LOOP
    v_slug := v_slug || '-' || floor(random() * 1000)::text;
  END LOOP;

  -- Create organization (without dealer record - that's created when user selects dealer type)
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
    NEW.email,
    v_slug,
    'active',
    NEW.id,
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
    NEW.id,
    'owner',
    'active',
    true,
    false,
    now(),
    now(),
    now()
  )
  RETURNING id INTO v_org_user_id;

  RAISE NOTICE 'Auto-created organization % for user %. Dealer record will be created when user selects dealer organization type.', v_org_id, NEW.id;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
-- This trigger fires when a user's email_confirmed_at is set (email verification)
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at))
  EXECUTE FUNCTION handle_user_signup();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA "01. Organization" TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA "02a. Dealership" TO postgres, anon, authenticated, service_role;

-- Add comment
COMMENT ON FUNCTION handle_user_signup() IS 
'Automatically creates organization and organization_users link when a user confirms their email. Dealer record is only created when user selects dealer as organization type during onboarding.';

