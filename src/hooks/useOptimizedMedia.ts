import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

interface OptimizedMediaData {
  originalUrl: string;
  optimizedUrl: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
  sizes?: Record<string, string>;
  qualities?: Record<string, string>;
  poster?: string;
  cached: boolean;
  performance: {
    cacheHit: boolean;
    responseTime: number;
  };
}

interface UseOptimizedMediaOptions {
  mediaUrls: string[];
  enabled?: boolean;
  staleTime?: number;
}

export const useOptimizedMedia = ({
  mediaUrls,
  enabled = true,
  staleTime = 30 * 60 * 1000, // 30 minutes
}: UseOptimizedMediaOptions) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['optimized-media', mediaUrls.sort().join(',')],
    queryFn: async (): Promise<OptimizedMediaData[]> => {
      if (!mediaUrls || mediaUrls.length === 0) {
        return [];
      }

      const startTime = Date.now();

      try {
        const { data: response, error } = await supabase.functions.invoke('cached-media', {
          body: { mediaUrls, action: 'get' },
        });

        if (error) {
          console.error('Error fetching optimized media:', error);
          throw error;
        }

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to optimize media');
        }

        const endTime = Date.now();

        return response.data;
      } catch (error) {
        console.error('Failed to optimize media:', error);
        // Fallback: return original URLs with optimization
        return mediaUrls.map(url => {
          // Apply basic optimization even in fallback
          const optimizedUrl = url.includes('supabase') ? `${url}?w=800&h=800&fit=crop&quality=80` : url;
          return {
            originalUrl: url,
            optimizedUrl,
            thumbnailUrl: optimizedUrl,
            type: url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') ? 'video' : 'image',
            cached: false,
            performance: { cacheHit: false, responseTime: Date.now() }
          };
        });
      }
    },
    enabled: enabled && mediaUrls.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour - increased for better caching
    gcTime: 2 * 60 * 60 * 1000, // 2 hours in memory
    retry: 1, // Reduced retries for faster fallback
    refetchOnWindowFocus: false, // Don't refetch on window focus for media
    refetchOnMount: false, // Use cache if available
  });

  // Helper function to get optimized URL for a specific media
  const getOptimizedUrl = useCallback((originalUrl: string): string => {
    if (!data) return originalUrl;

    const mediaData = data.find(item => item.originalUrl === originalUrl);
    return mediaData?.optimizedUrl || originalUrl;
  }, [data]);

  // Helper function to get thumbnail URL
  const getThumbnailUrl = useCallback((originalUrl: string): string => {
    if (!data) return originalUrl;

    const mediaData = data.find(item => item.originalUrl === originalUrl);
    return mediaData?.thumbnailUrl || originalUrl;
  }, [data]);

  // Helper function to get poster URL for videos
  const getPosterUrl = useCallback((originalUrl: string): string => {
    if (!data) return originalUrl;

    const mediaData = data.find(item => item.originalUrl === originalUrl);
    if (mediaData?.type === 'video') {
      return mediaData.poster || mediaData.thumbnailUrl || originalUrl;
    }
    return originalUrl;
  }, [data]);

  // Function to invalidate cache for specific media
  const invalidateMediaCache = useCallback(async (urls: string[]) => {
    if (!urls || urls.length === 0) return;

    try {
      console.log(`🗑️ Invalidating cache for ${urls.length} media URLs`);

      await supabase.functions.invoke('cached-media', {
        body: { mediaUrls: urls, action: 'invalidate' },
      });

      // Invalidate React Query cache
      await queryClient.invalidateQueries({
        queryKey: ['optimized-media']
      });

      console.log('✅ Media cache invalidated');
    } catch (error) {
      console.error('Failed to invalidate media cache:', error);
    }
  }, [queryClient]);

  // Get media info for a specific URL
  const getMediaInfo = useCallback((originalUrl: string): OptimizedMediaData | undefined => {
    return data?.find(item => item.originalUrl === originalUrl);
  }, [data]);

  return {
    mediaData: data || [],
    isLoading,
    error,
    refetch,
    getOptimizedUrl,
    getThumbnailUrl,
    getPosterUrl,
    getMediaInfo,
    invalidateMediaCache,
    // Computed properties
    cacheHitRate: data ? (data.filter(item => item.cached).length / data.length) * 100 : 0,
    totalMedia: mediaUrls.length,
    optimizedCount: data?.length || 0,
  };
};
