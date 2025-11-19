-- Activate Organization: Set status from pending_verification to active
-- This script activates your organization so you can create listings
-- Replace the organization_id with your actual organization ID (from the diagnostic query)

-- Option 1: Activate by organization ID (if you know it)
-- Replace 5 with your actual organization_id
UPDATE "01. Organization".organizations
SET 
  status = 'active',
  status_changed_at = now(),
  updated_at = now()
WHERE id = 5  -- Replace with your organization_id
RETURNING id, organization_name, status, status_changed_at;

-- Option 2: Activate by user ID (automatically finds your organization)
UPDATE "01. Organization".organizations
SET 
  status = 'active',
  status_changed_at = now(),
  updated_at = now()
WHERE id IN (
  SELECT organization_id 
  FROM "01. Organization".organization_users
  WHERE user_id = '9794afda-93f5-4fe2-96ea-d7652a7c8882'::uuid
)
RETURNING id, organization_name, status, status_changed_at;

-- Verify the update
SELECT 
  id,
  organization_name,
  status,
  status_changed_at,
  updated_at
FROM "01. Organization".organizations
WHERE id IN (
  SELECT organization_id 
  FROM "01. Organization".organization_users
  WHERE user_id = '9794afda-93f5-4fe2-96ea-d7652a7c8882'::uuid
);


