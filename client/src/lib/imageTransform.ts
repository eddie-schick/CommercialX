/**
 * Get transformed image URL using Supabase's built-in image transformation
 * Note: This requires Supabase Image Transformation to be enabled
 */
export function getTransformedImageUrl(
  publicUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
    resize?: 'cover' | 'contain' | 'fill';
  } = {}
): string {
  const url = new URL(publicUrl);
  const params = new URLSearchParams();

  if (options.width) params.set('width', options.width.toString());
  if (options.height) params.set('height', options.height.toString());
  if (options.quality) params.set('quality', options.quality.toString());
  if (options.format) params.set('format', options.format);
  if (options.resize) params.set('resize', options.resize);

  // If no params, return original URL
  if (params.toString() === '') {
    return publicUrl;
  }

  // Supabase image transformation uses /storage/v1/render/image/ path
  // Extract the bucket and path from the original URL
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
  
  if (pathMatch) {
    const [, bucket, path] = pathMatch;
    const transformUrl = new URL(`${url.origin}/storage/v1/render/image/public/${bucket}/${path}`);
    params.forEach((value, key) => {
      transformUrl.searchParams.set(key, value);
    });
    return transformUrl.toString();
  }

  // Fallback: append params to original URL
  return `${url.origin}${url.pathname}?${params.toString()}`;
}

/**
 * Get thumbnail URL (400x300, WebP, 80% quality)
 */
export function getThumbnailUrl(publicUrl: string): string {
  return getTransformedImageUrl(publicUrl, {
    width: 400,
    height: 300,
    quality: 80,
    format: 'webp',
    resize: 'cover',
  });
}

/**
 * Get medium-sized image URL (800x600, WebP, 85% quality)
 */
export function getMediumImageUrl(publicUrl: string): string {
  return getTransformedImageUrl(publicUrl, {
    width: 800,
    height: 600,
    quality: 85,
    format: 'webp',
    resize: 'cover',
  });
}

