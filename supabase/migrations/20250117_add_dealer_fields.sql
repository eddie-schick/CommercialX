-- Migration: Add missing dealer fields to dealers table
-- Ensures all fields used in the profile page exist in the database

-- Add dealer_license_expires_at (date field)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS dealer_license_expires_at date;

-- Add duns_number (string field)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS duns_number character varying(20);

-- Add average_inventory_count (integer, nullable)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS average_inventory_count integer;

-- Add lot_capacity (integer, nullable)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS lot_capacity integer;

-- Add can_special_order (boolean, default false)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS can_special_order boolean DEFAULT false;

-- Add accepts_trade_ins (boolean, default false)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS accepts_trade_ins boolean DEFAULT false;

-- Add has_body_shop (boolean, default false)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS has_body_shop boolean DEFAULT false;

-- Add typical_delivery_days (integer, nullable)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS typical_delivery_days integer;

-- Add delivery_available (boolean, default false)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS delivery_available boolean DEFAULT false;

-- Add delivery_radius_miles (integer, nullable)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS delivery_radius_miles integer;

-- Add delivery_fee (numeric, nullable)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2);

-- Add current_promotions (text field)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS current_promotions text;

-- Add accepts_fleet_inquiries (boolean, default false)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS accepts_fleet_inquiries boolean DEFAULT false;

-- Add minimum_fleet_size (integer, nullable)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS minimum_fleet_size integer;

-- Add fleet_discount_percentage (numeric, nullable)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS fleet_discount_percentage numeric(5,2);

-- Add certifications (JSONB array)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '[]'::jsonb;

-- Add awards (JSONB array)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS awards jsonb DEFAULT '[]'::jsonb;

-- Add auto_respond_inquiries (boolean, default false)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS auto_respond_inquiries boolean DEFAULT false;

-- Add inquiry_email_notification (boolean, default false)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS inquiry_email_notification boolean DEFAULT false;

-- Add weekly_performance_report (boolean, default false)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS weekly_performance_report boolean DEFAULT false;

-- Add allow_price_negotiations (boolean, default false)
ALTER TABLE "02a. Dealership".dealers
ADD COLUMN IF NOT EXISTS allow_price_negotiations boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN "02a. Dealership".dealers.dealer_license_expires_at IS 'Date when dealer license expires';
COMMENT ON COLUMN "02a. Dealership".dealers.duns_number IS 'DUNS (Data Universal Numbering System) number';
COMMENT ON COLUMN "02a. Dealership".dealers.average_inventory_count IS 'Average number of vehicles in inventory';
COMMENT ON COLUMN "02a. Dealership".dealers.lot_capacity IS 'Maximum number of vehicles the lot can hold';
COMMENT ON COLUMN "02a. Dealership".dealers.can_special_order IS 'Whether dealer can place special orders';
COMMENT ON COLUMN "02a. Dealership".dealers.accepts_trade_ins IS 'Whether dealer accepts trade-in vehicles';
COMMENT ON COLUMN "02a. Dealership".dealers.has_body_shop IS 'Whether dealer has a body shop';
COMMENT ON COLUMN "02a. Dealership".dealers.typical_delivery_days IS 'Typical number of days for vehicle delivery';
COMMENT ON COLUMN "02a. Dealership".dealers.delivery_available IS 'Whether dealer offers delivery service';
COMMENT ON COLUMN "02a. Dealership".dealers.delivery_radius_miles IS 'Maximum delivery radius in miles';
COMMENT ON COLUMN "02a. Dealership".dealers.delivery_fee IS 'Delivery fee amount';
COMMENT ON COLUMN "02a. Dealership".dealers.current_promotions IS 'Current promotions or special offers';
COMMENT ON COLUMN "02a. Dealership".dealers.accepts_fleet_inquiries IS 'Whether dealer accepts fleet sales inquiries';
COMMENT ON COLUMN "02a. Dealership".dealers.minimum_fleet_size IS 'Minimum fleet size for fleet inquiries';
COMMENT ON COLUMN "02a. Dealership".dealers.fleet_discount_percentage IS 'Fleet discount percentage (0-100)';
COMMENT ON COLUMN "02a. Dealership".dealers.certifications IS 'Array of certifications (JSONB)';
COMMENT ON COLUMN "02a. Dealership".dealers.awards IS 'Array of awards (JSONB)';
COMMENT ON COLUMN "02a. Dealership".dealers.auto_respond_inquiries IS 'Automatically respond to customer inquiries';
COMMENT ON COLUMN "02a. Dealership".dealers.inquiry_email_notification IS 'Receive email notifications for inquiries';
COMMENT ON COLUMN "02a. Dealership".dealers.weekly_performance_report IS 'Receive weekly performance reports';
COMMENT ON COLUMN "02a. Dealership".dealers.allow_price_negotiations IS 'Allow customers to negotiate prices';

