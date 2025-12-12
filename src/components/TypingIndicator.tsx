import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from '@/utils/performance';

interface TypingIndicatorProps {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
}

export const TypingIndicator = ({ 
  conversationId, 
  currentUserId,
  otherUserId,
  otherUserName 
}: TypingIndicatorProps) => {
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTyping = useMemo(
    () => debounce(() => setIsTyping(false), 3000),
    []
  );

  useEffect(() => {
    // Subscribe to typing events via broadcast
    const channel = supabase
      .channel(`conversation_${conversationId}`)
      .on('broadcast', { event: 'user_typing' }, (payload) => {
        const data = payload.payload as any;
        
        // Only show typing indicator for the other user
        if (data.userId === otherUserId) {
          setIsTyping(data.typing);
          
          // Auto-clear typing indicator after 3 seconds
          if (data.typing) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
              setIsTyping(false);
            }, 3000);
          } else if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [conversationId, currentUserId, otherUserId]);

  if (!isTyping) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs">{otherUserName} est en train d'écrire...</span>
    </div>
  );
};
