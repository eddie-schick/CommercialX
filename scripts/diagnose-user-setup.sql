-- Diagnostic Query: Check User Organization and Dealer Setup
-- Run this query in Supabase SQL Editor to diagnose listing creation issues
-- Replace 'YOUR_USER_ID_HERE' with your actual auth.users.id (UUID)

-- Option 1: Check for a specific user ID
-- Your user ID from the database
WITH user_id_param AS (
  SELECT '9794afda-93f5-4fe2-96ea-d7652a7c8882'::uuid AS user_id
),
-- Option 2: Check for the currently authenticated user (if running as that user)
-- Uncomment the line below and comment out the user_id_param above
-- user_id_param AS (
--   SELECT auth.uid() AS user_id
-- )

-- Get all relevant data in one query
diagnostic_data AS (
  SELECT 
    -- User info
    u.id AS user_id,
    u.email AS user_email,
    u.created_at AS user_created_at,
    
    -- Organization Users link
    ou.id AS organization_user_id,
    ou.organization_id,
    ou.role AS user_role,
    ou.status AS user_status,
    ou.joined_at,
    
    -- Organization details
    o.id AS org_id,
    o.organization_name,
    o.organization_type_id,
    o.status AS org_status,
    o.profile_completion_percentage AS org_completion_pct,
    o.primary_email AS org_email,
    o.primary_phone AS org_phone,
    o.city AS org_city,
    o.state_province AS org_state,
    
    -- Organization Type
    ot.type_code AS org_type_code,
    ot.display_name AS org_type_name,
    ot.can_list_vehicles,
    
    -- Dealer record
    d.id AS dealer_id,
    d.organization_id AS dealer_org_id,
    d.business_type,
    d.dealer_license_number,
    d.dealer_license_state,
    d.profile_completion_percentage AS dealer_completion_pct,
    d.created_at AS dealer_created_at,
    
    -- Validation flags
    CASE WHEN ou.id IS NOT NULL THEN true ELSE false END AS has_organization_user,
    CASE WHEN o.id IS NOT NULL THEN true ELSE false END AS has_organization,
    CASE WHEN d.id IS NOT NULL THEN true ELSE false END AS has_dealer,
    CASE WHEN ou.status = 'active' THEN true ELSE false END AS org_user_active,
    CASE WHEN o.status = 'active' THEN true ELSE false END AS org_active,
    CASE WHEN ot.can_list_vehicles = true THEN true ELSE false END AS org_can_list,
    CASE WHEN ou.role IN ('owner', 'admin', 'member') THEN true ELSE false END AS has_listing_permission
    
  FROM user_id_param uid
  LEFT JOIN auth.users u ON u.id = uid.user_id
  LEFT JOIN "01. Organization".organization_users ou ON ou.user_id = u.id
  LEFT JOIN "01. Organization".organizations o ON o.id = ou.organization_id
  LEFT JOIN "01. Organization".organization_types ot ON ot.id = o.organization_type_id
  LEFT JOIN "02a. Dealership".dealers d ON d.organization_id = o.id
)

SELECT 
  -- Summary
  user_id,
  user_email,
  
  -- Organization Status
  has_organization_user AS "Has Org User Link",
  has_organization AS "Has Organization",
  organization_name AS "Organization Name",
  org_status AS "Org Status",
  org_active AS "Org Active",
  org_completion_pct AS "Org Completion %",
  
  -- Organization Type
  org_type_code AS "Org Type Code",
  org_type_name AS "Org Type Name",
  can_list_vehicles AS "Can List Vehicles",
  org_can_list AS "Org Can List",
  
  -- User Role
  user_role AS "User Role",
  user_status AS "User Status",
  org_user_active AS "Org User Active",
  has_listing_permission AS "Has Listing Permission",
  
  -- Dealer Status
  has_dealer AS "Has Dealer Record",
  dealer_id AS "Dealer ID",
  business_type AS "Business Type",
  dealer_completion_pct AS "Dealer Completion %",
  
  -- Missing Data Check
  CASE 
    WHEN NOT has_organization_user THEN 'Missing: organization_users record'
    WHEN NOT has_organization THEN 'Missing: organization record'
    WHEN NOT org_active THEN 'Issue: Organization not active (status: ' || org_status || ')'
    WHEN NOT org_can_list THEN 'Issue: Organization type cannot list vehicles'
    WHEN NOT org_user_active THEN 'Issue: Organization user not active (status: ' || user_status || ')'
    WHEN NOT has_listing_permission THEN 'Issue: User role "' || user_role || '" cannot create listings'
    WHEN NOT has_dealer THEN 'Missing: dealer record for organization'
    ELSE 'OK: All checks passed'
  END AS "Diagnosis",
  
  -- Recommendations
  CASE 
    WHEN NOT has_organization_user THEN 'Create organization_users record linking user to organization'
    WHEN NOT has_organization THEN 'User needs to complete organization setup at /profile'
    WHEN NOT org_active THEN 'Organization needs to be activated (contact support)'
    WHEN NOT org_can_list THEN 'Organization type does not allow listing vehicles (contact support)'
    WHEN NOT org_user_active THEN 'Organization user status needs to be set to active'
    WHEN NOT has_listing_permission THEN 'User role needs to be owner, admin, or member (not viewer)'
    WHEN NOT has_dealer THEN 'Create dealer record for organization (see create-missing-dealer.sql)'
    ELSE 'No action needed'
  END AS "Recommendation"

FROM diagnostic_data;

-- Additional detailed queries for troubleshooting:
-- Note: These are separate queries that run after the main diagnostic query

-- Check for NULL required fields in organization
SELECT 
  'Organization Missing Fields' AS check_type,
  o.id,
  o.organization_name,
  CASE WHEN o.organization_name IS NULL THEN 'organization_name' END AS missing_field
FROM "01. Organization".organizations o
INNER JOIN "01. Organization".organization_users ou ON ou.organization_id = o.id
WHERE ou.user_id = '9794afda-93f5-4fe2-96ea-d7652a7c8882'::uuid
  AND o.organization_name IS NULL

UNION ALL

-- Check for NULL required fields in dealer
SELECT 
  'Dealer Missing Fields' AS check_type,
  d.id,
  d.organization_id::text AS identifier,
  CASE 
    WHEN d.organization_id IS NULL THEN 'organization_id'
    ELSE NULL
  END AS missing_field
FROM "02a. Dealership".dealers d
INNER JOIN "01. Organization".organizations o ON o.id = d.organization_id
INNER JOIN "01. Organization".organization_users ou ON ou.organization_id = o.id
WHERE ou.user_id = '9794afda-93f5-4fe2-96ea-d7652a7c8882'::uuid
  AND d.organization_id IS NULL;

