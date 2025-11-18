import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  url?: string;
  error?: Error;
}

interface UploadResult {
  fileName: string;
  url: string;
  path: string;
}

export function useImageUpload(bucketName: string = 'listing-images') {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());

  const uploadImages = async (files: File[], listingId?: number): Promise<UploadResult[]> => {
    const supabase = getSupabaseClient();
    const uploadPromises = files.map(async (file) => {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = listingId
        ? `listings/${listingId}/${fileName}`
        : `temp/${fileName}`;

      // Initialize progress tracking
      setUploads((prev) => {
        const next = new Map(prev);
        next.set(fileName, {
          fileName,
          progress: 0,
          status: 'pending',
        });
        return next;
      });

      try {
        // Update status to uploading
        setUploads((prev) => {
          const next = new Map(prev);
          const upload = next.get(fileName);
          if (upload) {
            upload.status = 'uploading';
          }
          return next;
        });

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw handleSupabaseError(error);

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucketName).getPublicUrl(data.path);

        // Update progress to complete
        setUploads((prev) => {
          const next = new Map(prev);
          const upload = next.get(fileName);
          if (upload) {
            upload.status = 'complete';
            upload.progress = 100;
            upload.url = publicUrl;
          }
          return next;
        });

        return {
          fileName,
          url: publicUrl,
          path: data.path,
        };
      } catch (error) {
        // Update status to error
        setUploads((prev) => {
          const next = new Map(prev);
          const upload = next.get(fileName);
          if (upload) {
            upload.status = 'error';
            upload.error = error instanceof Error ? error : new Error('Upload failed');
          }
          return next;
        });

        throw error;
      }
    });

    return Promise.all(uploadPromises);
  };

  const clearUploads = () => {
    setUploads(new Map());
  };

  return {
    uploads: Array.from(uploads.values()),
    uploadImages,
    clearUploads,
  };
}

