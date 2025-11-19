-- Quick Fix: Set default organization status to 'active'
-- Run this in Supabase SQL Editor to make all new organizations active by default

-- Change the default value
ALTER TABLE "01. Organization".organizations 
ALTER COLUMN status SET DEFAULT 'active';

-- Verify the change
SELECT 
  column_name,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_schema = '01. Organization'
  AND table_name = 'organizations'
  AND column_name = 'status';

-- Expected result: column_default should be '''active''::character varying'


