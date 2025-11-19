-- Migration: Set default organization status to 'active' instead of 'pending_verification'
-- This ensures all new organizations are created as active by default

-- Step 1: Change the default value in the organizations table
ALTER TABLE "01. Organization".organizations 
ALTER COLUMN status SET DEFAULT 'active';

-- Step 2: Update the create_dealer_organization function if it exists
-- This function is called during onboarding and should create organizations as active
DO $$
BEGIN
  -- Check if the function exists and update it
  IF EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'create_dealer_organization'
  ) THEN
    -- Note: We can't directly alter a function's default behavior if it hardcodes status
    -- The function would need to be recreated. For now, we'll just ensure the table default is correct.
    -- If you have the function definition, you should update it to explicitly set status = 'active'
    RAISE NOTICE 'Function create_dealer_organization exists. Ensure it sets status = ''active'' when creating organizations.';
  END IF;
END $$;

-- Step 3: Verify the change
DO $$
DECLARE
  v_default text;
BEGIN
  SELECT column_default INTO v_default
  FROM information_schema.columns
  WHERE table_schema = '01. Organization'
    AND table_name = 'organizations'
    AND column_name = 'status';
  
  IF v_default = '''active''::character varying' THEN
    RAISE NOTICE '✓ Default status successfully set to active';
  ELSE
    RAISE WARNING 'Default status is: % (expected: active)', v_default;
  END IF;
END $$;


