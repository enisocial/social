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

  // On mobile, if all visible bubbles are minimized, don't render anything
  // This prevents the manager container from blocking the screen
  const shouldRender = useMemo(() => {
    if (!displayBubbles.length) return false;
    if (isMobile) {
      return displayBubbles.some(b => !b.isMinimized);
    }
    return true;
  }, [displayBubbles, isMobile]);

  if (!shouldRender) return null;

  return (
    <div 
      data-testid="chat-bubble-manager"
      className={`fixed transition-all duration-200 pointer-events-none ${
      isMobile 
        ? 'inset-0 z-[100]' // Removed bg-background
        : 'bottom-0 right-4 z-50 flex gap-3 items-end pb-4'
    }`}>
      {displayBubbles.map((bubble, index) => (
        <div key={bubble.conversationId} className="pointer-events-auto">
          <ChatBubble
            conversationId={bubble.conversationId}
            otherUser={bubble.otherUser}
            isMinimized={bubble.isMinimized}
            position={index}
          />
        </div>
      ))}
    </div>
  );
});
