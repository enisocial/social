import { supabase } from '@/integrations/supabase/client';

// Facebook-like Image Optimization System
// Handles multiple image sizes and formats like Facebook

export interface ImageSizes {
  thumbnail: string;    // 150x150px - for lists, grids
  small: string;       // 320px width - for feed previews
  medium: string;      // 720px width - for post display
  large: string;       // 1200px width - for full view
  original: string;    // Full resolution - for downloads
}

export interface ImageBlobs {
  thumbnail: Blob;
  small: Blob;
  medium: Blob;
  large: Blob;
  original: File;
}

export interface ImageOptimizationOptions {
  quality?: number;    // JPEG/WebP quality (0-1)
  format?: 'jpeg' | 'webp' | 'png';
  maxWidth?: number;
  maxHeight?: number;
  crop?: boolean;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/**
 * Resize and optimize image using Canvas API
 */
export async function resizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<Blob> {
  const {
    quality = 0.85,
    format = 'jpeg',
    maxWidth = 1920,
    maxHeight = 1920,
    crop = false,
    fit = 'inside'
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight,
          fit
        );

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Draw and resize
        if (crop) {
          // Center crop
          const scale = Math.max(width / img.width, height / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const x = (width - scaledWidth) / 2;
          const y = (height - scaledHeight) / 2;

          ctx?.drawImage(img, x, y, scaledWidth, scaledHeight);
        } else {
          ctx?.drawImage(img, 0, 0, width, height);
        }

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          },
          `image/${format}`,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate optimal dimensions for resizing
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
): { width: number; height: number } {
  const ratio = originalWidth / originalHeight;

  let width = originalWidth;
  let height = originalHeight;

  // Constrain dimensions based on fit mode
  switch (fit) {
    case 'inside':
      if (width > maxWidth) {
        width = maxWidth;
        height = width / ratio;
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = height * ratio;
      }
      break;

    case 'outside':
      if (width < maxWidth) {
        width = maxWidth;
        height = width / ratio;
      }
      if (height < maxHeight) {
        height = maxHeight;
        width = height * ratio;
      }
      break;

    case 'cover':
      width = maxWidth;
      height = maxHeight;
      break;

    case 'contain':
      if (width > maxWidth || height > maxHeight) {
        const scale = Math.min(maxWidth / width, maxHeight / height);
        width *= scale;
        height *= scale;
      }
      break;

    default:
      width = Math.min(width, maxWidth);
      height = Math.min(height, maxHeight);
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

/**
 * Generate Facebook-like image sizes and upload them
 */
export async function generateFacebookImageSizes(file: File, basePath: string, bucket: string = 'media'): Promise<ImageSizes> {
  const blobs = {
    thumbnail: await resizeImage(file, {
      maxWidth: 150,
      maxHeight: 150,
      crop: true,
      fit: 'cover',
      quality: 0.8,
      format: 'webp'
    }),
    small: await resizeImage(file, {
      maxWidth: 320,
      maxHeight: 320,
      fit: 'inside',
      quality: 0.85,
      format: 'webp'
    }),
    medium: await resizeImage(file, {
      maxWidth: 720,
      maxHeight: 720,
      fit: 'inside',
      quality: 0.9,
      format: 'webp'
    }),
    large: await resizeImage(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      fit: 'inside',
      quality: 0.9,
      format: 'webp'
    }),
    original: file
  };

  // Upload all sizes
  const uploadPromises = Object.entries(blobs).map(async ([sizeName, blob]) => {
    const fileName = `${basePath}_${sizeName}.webp`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        cacheControl: '31536000', // 1 year cache
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return [sizeName, publicUrl] as [string, string];
  });

  const uploadedUrls = await Promise.all(uploadPromises);
  const imageUrls: any = {};

  uploadedUrls.forEach(([sizeName, url]) => {
    imageUrls[sizeName] = url;
  });

  return imageUrls as ImageSizes;
}



/**
 * Get optimal image URL based on container size
 */
export function getOptimalImageUrl(
  imageSizes: ImageSizes,
  containerWidth: number,
  containerHeight: number = 0
): string {
  // Determine best size based on container dimensions
  if (containerWidth <= 150 || containerHeight <= 150) {
    return imageSizes.thumbnail;
  } else if (containerWidth <= 320) {
    return imageSizes.small;
  } else if (containerWidth <= 720) {
    return imageSizes.medium;
  } else if (containerWidth <= 1200) {
    return imageSizes.large;
  } else {
    return imageSizes.original;
  }
}

/**
 * Facebook-style responsive image component props
 */
export interface FacebookImageProps {
  src: string | ImageSizes;
  alt: string;
  className?: string;
  containerWidth?: number;
  containerHeight?: number;
  lazy?: boolean;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(imageSizes: ImageSizes): string {
  return [
    `${imageSizes.thumbnail} 150w`,
    `${imageSizes.small} 320w`,
    `${imageSizes.medium} 720w`,
    `${imageSizes.large} 1200w`,
    `${imageSizes.original} 1920w`
  ].join(', ');
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizes(containerWidth?: number): string {
  if (containerWidth) {
    return `(max-width: ${containerWidth}px) 100vw, ${containerWidth}px`;
  }

  // Default responsive sizes
  return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw';
}
