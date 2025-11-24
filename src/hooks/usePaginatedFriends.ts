import { useInfiniteQuery, QueryFunctionContext, InfiniteData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaginatedFriend {
  id: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  sender: {
    id: string;
    username: string;
    name: string;
    avatar_url: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
  };
  receiver: {
    id: string;
    username: string;
    name: string;
    avatar_url: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
  };
}

interface FriendsPage {
  friends: PaginatedFriend[];
  nextOffset: number | null;
}

export const usePaginatedFriends = (
  userId?: string,
  searchQuery?: string,
  locationFilter?: string
) => {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<FriendsPage, Error, InfiniteData<FriendsPage>, string[], number>({
    queryKey: ['paginated-friends', userId || '', searchQuery || '', locationFilter || ''],
    queryFn: async ({ pageParam }: QueryFunctionContext<string[], number>) => {
      if (!userId) return { friends: [], nextOffset: null };

      const { data, error } = await supabase.rpc('get_friends_paginated', {
        p_user_id: userId,
        p_limit: 20,
        p_offset: pageParam,
        p_search: searchQuery || null,
        p_location_filter: locationFilter === 'all' ? null : locationFilter,
      });

      if (error) {
        console.error('Error fetching paginated friends:', error);
        return { friends: [], nextOffset: null };
      }

      const friends = (data || []).map((row: any) => ({
        id: row.id,
        sender_id: row.sender_id,
        receiver_id: row.receiver_id,
        created_at: row.created_at,
        sender: row.sender_profile,
        receiver: row.receiver_profile,
      }));

      return {
        friends,
        nextOffset: friends.length === 20 ? pageParam + 20 : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const allFriends = data?.pages.flatMap((page) => page.friends) || [];

  return {
    friends: allFriends,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};
