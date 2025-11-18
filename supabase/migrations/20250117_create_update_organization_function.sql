-- Migration: Create update_organization RPC Function
-- This function updates organization data in the "01. Organization" schema
-- Works without requiring DATABASE_URL environment variable
-- Must be in public schema to be callable via Supabase client

DROP FUNCTION IF EXISTS update_organization(bigint, jsonb) CASCADE;
DROP FUNCTION IF EXISTS update_organization(integer, jsonb) CASCADE;

CREATE OR REPLACE FUNCTION update_organization(
  p_organization_id bigint,
  p_update_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  key text;
  value jsonb;
  sql_text text;
BEGIN
  -- Build UPDATE statement dynamically
  sql_text := 'UPDATE "01. Organization".organizations SET ';
  
  -- Build SET clauses
  FOR key, value IN SELECT * FROM jsonb_each(p_update_data)
  LOOP
    -- Skip only if key is 'updated_at' and we're setting it, or if value is truly missing
    -- Allow null values to be set (for clearing fields)
    IF sql_text != 'UPDATE "01. Organization".organizations SET ' THEN
      sql_text := sql_text || ', ';
    END IF;
    
    -- Handle null values explicitly
    IF value IS NULL OR value = 'null'::jsonb THEN
      sql_text := sql_text || format('%I = NULL', key);
    -- Handle different JSONB types
    ELSIF jsonb_typeof(value) = 'object' OR jsonb_typeof(value) = 'array' THEN
      -- JSONB object/array - cast to jsonb
      sql_text := sql_text || format('%I = %L::jsonb', key, value::text);
    ELSIF jsonb_typeof(value) = 'string' THEN
      -- String value - handle empty strings as null for optional fields
      IF value #>> '{}' = '' AND key IN ('legal_entity_name', 'display_name', 'address_line2', 'website_url', 'logo_url', 'tax_id') THEN
        sql_text := sql_text || format('%I = NULL', key);
      ELSE
        sql_text := sql_text || format('%I = %L', key, value #>> '{}');
      END IF;
    ELSIF jsonb_typeof(value) = 'number' THEN
      -- Number value
      sql_text := sql_text || format('%I = %s', key, value #>> '{}');
    ELSIF jsonb_typeof(value) = 'boolean' THEN
      -- Boolean value
      sql_text := sql_text || format('%I = %s', key, value #>> '{}');
    ELSE
      -- Fallback
      sql_text := sql_text || format('%I = %L', key, value::text);
    END IF;
  END LOOP;
  
  -- Add WHERE clause
  sql_text := sql_text || format(' WHERE id = %s', p_organization_id);
  
  -- Execute the update
  EXECUTE sql_text;
  
  -- Get the updated row
  SELECT row_to_json(o.*)::jsonb INTO result
  FROM "01. Organization".organizations o
  WHERE o.id = p_organization_id;
  
  -- If no result, return error
  IF result IS NULL THEN
    RETURN jsonb_build_object('error', 'organization_not_found', 'organization_id', p_organization_id);
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_organization(bigint, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION update_organization(bigint, jsonb) TO anon;

-- Add comment
COMMENT ON FUNCTION update_organization IS 
'Updates an organization record in the "01. Organization".organizations table.
Takes organization_id and a JSONB object with fields to update.
Returns the updated organization record as JSONB.
This function is in the public schema to be callable via Supabase client RPC.';

