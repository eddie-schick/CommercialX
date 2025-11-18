-- Verification Script: Verify Authentication and Organization Linking
-- Run this AFTER applying the migrations to verify everything is set up correctly

-- ============================================================================
-- 1. Verify Foreign Key Constraint Exists
-- ============================================================================
SELECT 
    tc.constraint_name,
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = '01. Organization'
  AND tc.table_name = 'organization_users'
  AND kcu.column_name = 'user_id';

-- Expected result: Should show fk_organization_users_user_id pointing to auth.users.id

-- ============================================================================
-- 2. Verify Indexes Exist
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = '01. Organization'
  AND tablename = 'organization_users'
  AND indexname LIKE '%user_id%';

-- Expected: Should show idx_organization_users_user_id and idx_organization_users_org_user

-- ============================================================================
-- 3. Check for Orphaned Records (should return 0 rows after FK is added)
-- ============================================================================
SELECT 
    ou.id,
    ou.user_id,
    ou.organization_id,
    ou.role,
    'Orphaned: user_id does not exist in auth.users' as issue
FROM "01. Organization".organization_users ou
LEFT JOIN auth.users au ON ou.user_id = au.id
WHERE au.id IS NULL;

-- Expected: 0 rows (all user_ids should reference valid auth.users)

-- ============================================================================
-- 4. Verify Helper Function Exists
-- ============================================================================
SELECT 
    routine_schema,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = '01. Organization'
  AND routine_name = 'get_current_user_org_user';

-- Expected: Should return the function definition

-- ============================================================================
-- 5. Test Data Integrity
-- ============================================================================
-- Count organization_users linked to valid auth users
SELECT 
    COUNT(*) as total_org_users,
    COUNT(DISTINCT ou.user_id) as unique_users,
    COUNT(DISTINCT ou.organization_id) as unique_organizations
FROM "01. Organization".organization_users ou
INNER JOIN auth.users au ON ou.user_id = au.id;

-- Expected: Should show counts matching your actual data

-- ============================================================================
-- 6. Verify Column Types Match
-- ============================================================================
SELECT 
    'organization_users.user_id' as column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = '01. Organization'
  AND table_name = 'organization_users'
  AND column_name = 'user_id'
UNION ALL
SELECT 
    'auth.users.id' as column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'auth'
  AND table_name = 'users'
  AND column_name = 'id';

-- Expected: Both should be uuid type

