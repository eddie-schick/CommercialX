/**
 * Supabase Database Layer
 * Handles queries to Supabase schemas with quoted identifiers
 * Uses raw SQL for schemas like "03. Vehicle Data" since Supabase client
 * doesn't directly support quoted schema names in .from()
 */

import postgres from "postgres";
import { ENV } from "../_core/env";
import { getSupabaseClient } from "../_core/supabase";

let _postgresClient: ReturnType<typeof postgres> | null = null;

function getPostgresClient() {
  if (!_postgresClient && ENV.databaseUrl) {
    try {
      _postgresClient = postgres(ENV.databaseUrl, {
        max: 1, // Limit connections for serverless
        idle_timeout: 20,
        connect_timeout: 10,
      });
    } catch (error) {
      console.error("[Supabase DB] Failed to create postgres client:", error);
      return null;
    }
  }
  return _postgresClient;
}

/**
 * Query a table in a numbered Supabase schema using raw SQL
 * Handles quoted schema names like "03. Vehicle Data"
 */
export async function querySchemaTable<T = any>(
  schema: string,
  table: string,
  options: {
    select?: string;
    where?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  } = {}
): Promise<T[]> {
  const client = getPostgresClient();
  if (!client) {
    console.warn(`[Supabase DB] Database connection not available for ${schema}.${table}`);
    return [];
  }

  const { select = "*", where = {}, orderBy, limit, offset } = options;

  let query = `SELECT ${select} FROM "${schema}".${table}`;
  const params: any[] = [];
  let paramIndex = 1;

  // Build WHERE clause
  const whereConditions: string[] = [];
  for (const [key, value] of Object.entries(where)) {
    if (value !== undefined && value !== null) {
      whereConditions.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (whereConditions.length > 0) {
    query += ` WHERE ${whereConditions.join(" AND ")}`;
  }

  // Add ORDER BY
  if (orderBy) {
    query += ` ORDER BY ${orderBy.column} ${orderBy.ascending !== false ? "ASC" : "DESC"}`;
  }

  // Add LIMIT
  if (limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(limit);
    paramIndex++;
  }

  // Add OFFSET
  if (offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(offset);
  }

  try {
    const result = await client.unsafe(query, params);
    return (result as unknown) as T[];
  } catch (error) {
    // Log error but return empty array instead of throwing to prevent app crashes
    console.error(`[Supabase DB] Query error for ${schema}.${table}:`, error);
    // Check if it's a table/schema doesn't exist error
    if (error instanceof Error && error.message.includes("does not exist")) {
      console.warn(`[Supabase DB] Table or schema ${schema}.${table} does not exist yet`);
    }
    return [];
  }
}

/**
 * Insert into a schema table
 */
export async function insertSchemaTable<T = any>(
  schema: string,
  table: string,
  data: Record<string, any>
): Promise<T> {
  const client = getPostgresClient();
  if (!client) {
    throw new Error("Database connection not available");
  }

  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

  const query = `
    INSERT INTO "${schema}".${table} (${columns.join(", ")})
    VALUES (${placeholders})
    RETURNING *
  `;

  try {
    const [result] = await client.unsafe(query, values);
    return result as T;
  } catch (error) {
    console.error(`[Supabase DB] Insert error for ${schema}.${table}:`, error);
    throw error;
  }
}

/**
 * Update a schema table
 */
export async function updateSchemaTable<T = any>(
  schema: string,
  table: string,
  data: Record<string, any>,
  where: Record<string, any>
): Promise<T> {
  const client = getPostgresClient();
  if (!client) {
    throw new Error("Database connection not available");
  }

  const setClauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    setClauses.push(`${key} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  const whereConditions: string[] = [];
  for (const [key, value] of Object.entries(where)) {
    whereConditions.push(`${key} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  const query = `
    UPDATE "${schema}".${table}
    SET ${setClauses.join(", ")}
    WHERE ${whereConditions.join(" AND ")}
    RETURNING *
  `;

  try {
    const [result] = await client.unsafe(query, params);
    return result as T;
  } catch (error) {
    console.error(`[Supabase DB] Update error for ${schema}.${table}:`, error);
    throw error;
  }
}

/**
 * Delete from a schema table
 */
export async function deleteSchemaTable(
  schema: string,
  table: string,
  where: Record<string, any>
): Promise<void> {
  const client = getPostgresClient();
  if (!client) {
    throw new Error("Database connection not available");
  }

  const whereConditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(where)) {
    whereConditions.push(`${key} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  const query = `DELETE FROM "${schema}".${table} WHERE ${whereConditions.join(" AND ")}`;

  try {
    await client.unsafe(query, params);
  } catch (error) {
    console.error(`[Supabase DB] Delete error for ${schema}.${table}:`, error);
    throw error;
  }
}

/**
 * Use Supabase client for public schema or when RPC is available
 * This is for tables in the default public schema
 */
export async function querySupabaseTable<T = any>(
  table: string,
  options: {
    select?: string;
    where?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  } = {}
): Promise<T[]> {
  const supabase = getSupabaseClient();
  const { select = "*", where = {}, orderBy, limit, offset } = options;

  let query = supabase.from(table).select(select);

  // Apply filters
  for (const [key, value] of Object.entries(where)) {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  }

  // Apply ordering
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
  }

  // Apply limit
  if (limit) {
    query = query.limit(limit);
  }

  // Apply offset
  if (offset) {
    query = query.range(offset, offset + (limit || 10) - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error(`[Supabase] Query error for ${table}:`, error);
    throw error;
  }

  return (data || []) as T[];
}

/**
 * Insert using Supabase client (for public schema)
 */
export async function insertSupabaseTable<T = any>(
  table: string,
  data: Record<string, any>
): Promise<T> {
  const supabase = getSupabaseClient();
  // Use type assertion to bypass strict typing for dynamic tables
  const tableRef = supabase.from(table) as any;
  const { data: result, error } = await tableRef.insert(data).select().single();

  if (error) {
    console.error(`[Supabase] Insert error for ${table}:`, error);
    throw error;
  }

  return result as T;
}

/**
 * Update using Supabase client (for public schema)
 */
export async function updateSupabaseTable<T = any>(
  table: string,
  data: Record<string, any>,
  where: Record<string, any>
): Promise<T> {
  const supabase = getSupabaseClient();
  // Use type assertion to bypass strict typing for dynamic tables
  const tableRef = supabase.from(table) as any;
  let query = tableRef.update(data);

  for (const [key, value] of Object.entries(where)) {
    query = query.eq(key, value);
  }

  const { data: result, error } = await query.select().single();

  if (error) {
    console.error(`[Supabase] Update error for ${table}:`, error);
    throw error;
  }

  return result as T;
}

/**
 * Call a schema-qualified RPC function using Postgres client
 * Handles functions in schemas with special characters like "01. Organization"
 * @param schema - The schema name (e.g., "01. Organization")
 * @param functionName - The function name (e.g., "create_dealer_organization")
 * @param params - Array of parameter values in the order they appear in the function signature
 * @param returnsTable - Whether the function returns a table (default: true). If false, returns scalar value.
 */
export async function callSchemaRPC<T = any>(
  schema: string,
  functionName: string,
  params: any[] = [],
  returnsTable: boolean = true
): Promise<T[] | T> {
  const client = getPostgresClient();
  if (!client) {
    throw new Error("Database connection not available");
  }

  // Build parameter placeholders for the function call
  const paramPlaceholders = params.length > 0 
    ? params.map((_, i) => `$${i + 1}`).join(", ")
    : "";

  // Build the SQL query to call the function
  const query = returnsTable
    ? `SELECT * FROM "${schema}".${functionName}(${paramPlaceholders})`
    : `SELECT "${schema}".${functionName}(${paramPlaceholders}) as result`;

  try {
    const result = await client.unsafe(query, params);
    if (returnsTable) {
      return (result as unknown) as T[];
    } else {
      // For scalar functions, return the first value from the first row
      return (result[0]?.result ?? result[0]) as T;
    }
  } catch (error) {
    console.error(`[Supabase DB] RPC error for ${schema}.${functionName}:`, error);
    throw error;
  }
}

