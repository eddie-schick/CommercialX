// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)
// Falls back to Supabase storage if Forge API credentials are not available

import { ENV } from './_core/env';

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig | null {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    return null; // Return null instead of throwing - will fallback to Supabase
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

/**
 * Fallback to Supabase storage when Forge API is not configured
 */
async function uploadToSupabase(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const { getSupabaseClient } = await import('./_core/supabase');
  const supabase = getSupabaseClient();
  
  const bucketName = 'listing-images';
  const key = normalizeKey(relKey);
  
  // Convert data to Buffer if needed
  const buffer = typeof data === 'string' 
    ? Buffer.from(data, 'base64') 
    : Buffer.from(data);
  
  // Try to create bucket if it doesn't exist (requires service role)
  // Check if we have service role key available
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    try {
      // Create a client with service role for bucket operations
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(ENV.supabaseUrl, serviceRoleKey);
      
      const { data: buckets } = await serviceClient.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === bucketName);
      
      if (!bucketExists) {
        console.log(`[Storage] Bucket '${bucketName}' not found, attempting to create...`);
        const { error: createError } = await serviceClient.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        });
        
        if (createError) {
          console.warn(`[Storage] Could not create bucket '${bucketName}': ${createError.message}`);
        } else {
          console.log(`[Storage] Successfully created bucket '${bucketName}'`);
        }
      }
    } catch (err) {
      // Ignore bucket check/creation errors - we'll handle upload errors below
      console.warn(`[Storage] Could not check/create bucket: ${err}`);
    }
  }
  
  // Upload to Supabase Storage
  const { data: uploadData, error } = await supabase.storage
    .from(bucketName)
    .upload(key, buffer, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) {
    // Provide helpful error message for bucket not found
    if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
      throw new Error(
        `Storage bucket '${bucketName}' does not exist. Please create it in Supabase Dashboard: ` +
        `Go to Storage > New bucket > Name: ${bucketName}, Public: true, File size limit: 50MB`
      );
    }
    throw new Error(`Supabase storage upload failed: ${error.message}`);
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(uploadData.path);
  
  return { key: uploadData.path, url: publicUrl };
}

async function getFromSupabase(relKey: string): Promise<{ key: string; url: string }> {
  const { getSupabaseClient } = await import('./_core/supabase');
  const supabase = getSupabaseClient();
  
  const bucketName = 'listing-images';
  const key = normalizeKey(relKey);
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(key);
  
  return { key, url: publicUrl };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  
  // Fallback to Supabase if Forge API is not configured
  if (!config) {
    console.log('[Storage] Forge API not configured, falling back to Supabase storage');
    return uploadToSupabase(relKey, data, contentType);
  }
  
  // Use Forge API storage
  const { baseUrl, apiKey } = config;
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const config = getStorageConfig();
  
  // Fallback to Supabase if Forge API is not configured
  if (!config) {
    console.log('[Storage] Forge API not configured, using Supabase storage');
    return getFromSupabase(relKey);
  }
  
  // Use Forge API storage
  const { baseUrl, apiKey } = config;
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
