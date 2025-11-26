import { useContext } from 'react';
// This file now just re-exports the hook from the context to avoid breaking existing imports
import { useUnreadMessages as useContextUnread } from '@/contexts/UnreadContext';

export const useUnreadMessages = (userId?: string | null) => {
  // We ignore the userId argument because the context handles it internally via auth state
  return useContextUnread();
};
