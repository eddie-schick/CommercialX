-- Pre-migration check: Find orphaned organization_users records
-- Run this BEFORE applying the foreign key migration to identify any data issues

-- Check for organization_users with user_id that don't exist in auth.users
SELECT 
    ou.id,
    ou.user_id,
    ou.organization_id,
    ou.role,
    'Orphaned: user_id does not exist in auth.users' as issue
FROM "01. Organization".organization_users ou
LEFT JOIN auth.users au ON ou.user_id = au.id
WHERE au.id IS NULL;

-- Count total orphaned records
SELECT 
    COUNT(*) as orphaned_records_count
FROM "01. Organization".organization_users ou
LEFT JOIN auth.users au ON ou.user_id = au.id
WHERE au.id IS NULL;

-- If the above query returns 0 rows, it's safe to apply the foreign key migration
-- If it returns rows, you need to either:
--   1. Delete the orphaned records, OR
--   2. Update them to valid user IDs

