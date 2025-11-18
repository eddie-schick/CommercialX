-- Migration: Add missing fields to organizations table
-- Adds business_hours, sales_territory_states, and tax_id columns

-- Add tax_id column
ALTER TABLE "01. Organization".organizations
ADD COLUMN IF NOT EXISTS tax_id character varying(50);

-- Add business_hours column (JSONB to store day objects)
ALTER TABLE "01. Organization".organizations
ADD COLUMN IF NOT EXISTS business_hours jsonb DEFAULT '{}'::jsonb;

-- Add sales_territory_states column (JSONB array to store state codes)
ALTER TABLE "01. Organization".organizations
ADD COLUMN IF NOT EXISTS sales_territory_states jsonb DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN "01. Organization".organizations.tax_id IS 'Federal Tax ID or Employer Identification Number (EIN)';
COMMENT ON COLUMN "01. Organization".organizations.business_hours IS 'Business hours for each day of the week. Format: {"monday": {"open": "09:00", "close": "17:00", "closed": false}, ...}';
COMMENT ON COLUMN "01. Organization".organizations.sales_territory_states IS 'Array of two-letter state codes where the organization operates. Format: ["CA", "TX", "NY"]';

