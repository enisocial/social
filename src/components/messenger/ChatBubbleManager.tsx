import { useMemo, memo } from 'react';
import { useMessenger } from '@/contexts/MessengerContext';
import { ChatBubble } from './ChatBubble';
import { useIsMobile } from '@/hooks/use-mobile';

export const ChatBubbleManager = memo(() => {
  const { bubbles } = useMessenger();
  const isMobile = useIsMobile();

  const displayBubbles = useMemo(
    () => isMobile ? bubbles.slice(-1) : bubbles.slice(-3),
    [isMobile, bubbles]
  );

  if (isMobile && displayBubbles.length === 0) return null;

  return (
    <div className={`fixed transition-all duration-200 ${
      isMobile 
        ? 'inset-0 z-[100] bg-background' 
        : 'bottom-0 right-4 z-50 flex gap-3 items-end pb-4'
    }`}>
      {displayBubbles.map((bubble, index) => (
        <ChatBubble
          key={bubble.conversationId}
          conversationId={bubble.conversationId}
          otherUser={bubble.otherUser}
          isMinimized={bubble.isMinimized}
          position={index}
        />
      ))}
    </div>
  );
});
