-- Migration: Create update_dealer RPC Function
-- This function updates dealer data in the "02a. Dealership" schema
-- Works without requiring DATABASE_URL environment variable
-- Must be in public schema to be callable via Supabase client

DROP FUNCTION IF EXISTS update_dealer(bigint, jsonb) CASCADE;
DROP FUNCTION IF EXISTS update_dealer(integer, jsonb) CASCADE;

CREATE OR REPLACE FUNCTION update_dealer(
  p_dealer_id bigint,
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
  sql_text := 'UPDATE "02a. Dealership".dealers SET ';
  
  -- Build SET clauses
  FOR key, value IN SELECT * FROM jsonb_each(p_update_data)
  LOOP
    -- Allow null values to be set (for clearing fields)
    IF sql_text != 'UPDATE "02a. Dealership".dealers SET ' THEN
      sql_text := sql_text || ', ';
    END IF;
    
    -- Handle null values explicitly
    IF value IS NULL OR value = 'null'::jsonb THEN
      sql_text := sql_text || format('%I = NULL', key);
    -- Handle different JSONB types
    ELSIF jsonb_typeof(value) = 'object' OR jsonb_typeof(value) = 'array' THEN
      -- JSONB object/array - cast to jsonb (for fields like specializations, makes_carried, certifications, awards)
      sql_text := sql_text || format('%I = %L::jsonb', key, value::text);
    ELSIF jsonb_typeof(value) = 'string' THEN
      -- String value
      sql_text := sql_text || format('%I = %L', key, value #>> '{}');
    ELSIF jsonb_typeof(value) = 'number' THEN
      -- Number value (for integer and numeric fields)
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
  sql_text := sql_text || format(' WHERE id = %s', p_dealer_id);
  
  -- Execute the update
  EXECUTE sql_text;
  
  -- Get the updated row
  SELECT row_to_json(d.*)::jsonb INTO result
  FROM "02a. Dealership".dealers d
  WHERE d.id = p_dealer_id;
  
  -- If no result, return error
  IF result IS NULL THEN
    RETURN jsonb_build_object('error', 'dealer_not_found', 'dealer_id', p_dealer_id);
  END IF;
  
  RETURN result;
END;
$$;

-- Create function to get dealer by organization_id (for finding existing dealers)
CREATE OR REPLACE FUNCTION get_dealer_by_organization_id(
  p_organization_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT row_to_json(d.*)::jsonb INTO result
  FROM "02a. Dealership".dealers d
  WHERE d.organization_id = p_organization_id
  LIMIT 1;
  
  IF result IS NULL THEN
    RETURN jsonb_build_object('error', 'dealer_not_found', 'organization_id', p_organization_id);
  END IF;
  
  RETURN result;
END;
$$;

-- Create function to insert dealer
CREATE OR REPLACE FUNCTION insert_dealer(
  p_dealer_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  key text;
  value jsonb;
  columns text[];
  values_array text[];
  sql_text text;
BEGIN
  -- Build INSERT statement dynamically
  columns := ARRAY[]::text[];
  values_array := ARRAY[]::text[];
  
  FOR key, value IN SELECT * FROM jsonb_each(p_dealer_data)
  LOOP
    columns := array_append(columns, key);
    
    -- Handle different JSONB types
    IF value IS NULL OR value = 'null'::jsonb THEN
      values_array := array_append(values_array, 'NULL');
    ELSIF jsonb_typeof(value) = 'object' OR jsonb_typeof(value) = 'array' THEN
      -- JSONB object/array
      values_array := array_append(values_array, format('%L::jsonb', value::text));
    ELSIF jsonb_typeof(value) = 'string' THEN
      -- String value
      values_array := array_append(values_array, format('%L', value #>> '{}'));
    ELSIF jsonb_typeof(value) = 'number' THEN
      -- Number value
      values_array := array_append(values_array, value #>> '{}');
    ELSIF jsonb_typeof(value) = 'boolean' THEN
      -- Boolean value
      values_array := array_append(values_array, value #>> '{}');
    ELSE
      -- Fallback
      values_array := array_append(values_array, format('%L', value::text));
    END IF;
  END LOOP;
  
  sql_text := format(
    'INSERT INTO "02a. Dealership".dealers (%s) VALUES (%s) RETURNING row_to_json(dealers.*)::jsonb',
    array_to_string(columns, ', '),
    array_to_string(values_array, ', ')
  );
  
  -- Execute and get result
  EXECUTE sql_text INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_dealer(bigint, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION update_dealer(bigint, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION get_dealer_by_organization_id(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dealer_by_organization_id(bigint) TO anon;
GRANT EXECUTE ON FUNCTION insert_dealer(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_dealer(jsonb) TO anon;

-- Add comments
COMMENT ON FUNCTION update_dealer IS 
'Updates a dealer record in the "02a. Dealership".dealers table.
Takes dealer_id and a JSONB object with fields to update.
Returns the updated dealer record as JSONB.
This function is in the public schema to be callable via Supabase client RPC.';

COMMENT ON FUNCTION get_dealer_by_organization_id IS 
'Gets a dealer record by organization_id from the "02a. Dealership".dealers table.
Returns the dealer record as JSONB or an error if not found.';

COMMENT ON FUNCTION insert_dealer IS 
'Inserts a new dealer record into the "02a. Dealership".dealers table.
Takes a JSONB object with dealer fields.
Returns the inserted dealer record as JSONB.';

