-- Migration: Add Foreign Key from organization_users.user_id to auth.users.id
-- This links users in the organization schema to the Supabase auth.users table

-- First, ensure the user_id column exists and is the correct type
-- (It should already be uuid based on the schema, but we'll verify)

-- Add foreign key constraint
-- Note: We reference auth.users which is in the protected auth schema
ALTER TABLE "01. Organization".organization_users
ADD CONSTRAINT fk_organization_users_user_id 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Add index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id 
ON "01. Organization".organization_users(user_id);

-- Add comment to document the relationship
COMMENT ON CONSTRAINT fk_organization_users_user_id 
ON "01. Organization".organization_users 
IS 'Foreign key linking organization_users to Supabase auth.users table';

