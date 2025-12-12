import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

// Preload common queries for faster navigation
export const RoutePreloader = () => {
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch common data based on current route
    const prefetchData = async () => {
      if (location.pathname === '/feed') {
        // Prefetch notifications when on feed
        queryClient.prefetchQuery({
          queryKey: ['notifications'],
        });
      } else if (location.pathname.startsWith('/profile/')) {
        // Prefetch friends data when viewing a profile
        queryClient.prefetchQuery({
          queryKey: ['friend-requests'],
        });
      }
    };

    prefetchData();
  }, [location.pathname, queryClient]);

  return null;
};
