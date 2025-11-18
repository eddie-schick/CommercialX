-- Diagnostic Script: Check User-Organization Link
-- Run this in Supabase SQL Editor to diagnose why get_current_user_profile() might not be returning data
-- 
-- This script helps identify:
-- 1. If auth.uid() matches the user_id in organization_users
-- 2. If the organization exists
-- 3. If there are any RLS policy issues

-- ============================================================================
-- Step 1: Check current authenticated user (run this while logged in)
-- ============================================================================
-- Note: This will only work if you're authenticated via Supabase
SELECT 
  'Current auth.uid()' as check_type,
  auth.uid() as value,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NOT AUTHENTICATED - No user ID in JWT token'
    ELSE '✅ Authenticated'
  END as status;

-- ============================================================================
-- Step 2: Check if organization_users record exists for current user
-- ============================================================================
SELECT 
  'Organization User Record' as check_type,
  ou.id as org_user_id,
  ou.organization_id,
  ou.user_id,
  ou.role,
  CASE 
    WHEN ou.user_id = auth.uid() THEN '✅ user_id matches auth.uid()'
    WHEN ou.user_id IS NULL THEN '❌ user_id is NULL'
    WHEN auth.uid() IS NULL THEN '❌ Not authenticated'
    ELSE '❌ MISMATCH - user_id does not match auth.uid()'
  END as status
FROM "01. Organization".organization_users ou
WHERE ou.user_id = auth.uid()
LIMIT 1;

-- ============================================================================
-- Step 3: Check if organization exists for the organization_id
-- ============================================================================
SELECT 
  'Organization Record' as check_type,
  o.id as organization_id,
  o.organization_name,
  o.organization_type_id,
  CASE 
    WHEN o.id IS NOT NULL THEN '✅ Organization exists'
    ELSE '❌ Organization not found'
  END as status
FROM "01. Organization".organizations o
INNER JOIN "01. Organization".organization_users ou ON ou.organization_id = o.id
WHERE ou.user_id = auth.uid()
LIMIT 1;

-- ============================================================================
-- Step 4: Manual check - Replace YOUR_USER_ID_HERE with your actual user_id from organization_users table
-- ============================================================================
-- First, get your user_id from the organization_users table:
SELECT 
  ou.user_id,
  ou.organization_id,
  ou.role,
  o.organization_name,
  au.id as auth_users_id,
  CASE 
    WHEN au.id IS NOT NULL THEN '✅ User exists in auth.users'
    ELSE '❌ User NOT found in auth.users'
  END as auth_status
FROM "01. Organization".organization_users ou
INNER JOIN "01. Organization".organizations o ON ou.organization_id = o.id
LEFT JOIN auth.users au ON au.id = ou.user_id
WHERE ou.id = 5; -- Replace with your organization_users.id if different

-- ============================================================================
-- Step 5: Test get_current_user_profile() function directly
-- ============================================================================
-- This should return data if everything is linked correctly
SELECT * FROM get_current_user_profile();

-- If the above returns empty, check what auth.uid() returns:
SELECT 
  'auth.uid() value' as check_type,
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NULL - Not authenticated or JWT not passed'
    ELSE '✅ Has value'
  END as status;

-- Compare with your organization_users.user_id:
SELECT 
  'Comparison' as check_type,
  auth.uid() as auth_uid,
  ou.user_id as org_user_id,
  CASE 
    WHEN auth.uid() = ou.user_id THEN '✅ MATCH - IDs are the same'
    WHEN auth.uid() IS NULL THEN '❌ auth.uid() is NULL'
    WHEN ou.user_id IS NULL THEN '❌ user_id is NULL'
    ELSE '❌ MISMATCH - IDs do not match'
  END as status
FROM "01. Organization".organization_users ou
WHERE ou.id = 5; -- Replace with your organization_users.id

-- ============================================================================
-- Step 6: Check RLS policies on organization_users table
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = '01. Organization'
  AND tablename = 'organization_users';

-- ============================================================================
-- Step 6b: Check RLS policies on organizations table
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = '01. Organization'
  AND tablename = 'organizations';

-- ============================================================================
-- Step 7: Check if there are any orphaned records
-- ============================================================================
SELECT 
  'Orphaned organization_users' as issue_type,
  ou.id,
  ou.user_id,
  ou.organization_id,
  'User ID does not exist in auth.users' as description
FROM "01. Organization".organization_users ou
LEFT JOIN auth.users au ON au.id = ou.user_id
WHERE au.id IS NULL;

SELECT 
  'Orphaned organizations' as issue_type,
  o.id,
  o.organization_name,
  'No organization_users linked to this organization' as description
FROM "01. Organization".organizations o
LEFT JOIN "01. Organization".organization_users ou ON ou.organization_id = o.id
WHERE ou.id IS NULL;

