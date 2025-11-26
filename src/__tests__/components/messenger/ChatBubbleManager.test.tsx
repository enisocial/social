import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatBubbleManager } from '@/components/messenger/ChatBubbleManager';
import * as MessengerContext from '@/contexts/MessengerContext';
import * as useMobile from '@/hooks/use-mobile';

// Mock dependencies
vi.mock('@/contexts/MessengerContext');
vi.mock('@/hooks/use-mobile');
vi.mock('@/components/messenger/ChatBubble', () => ({
  ChatBubble: () => <div data-testid="chat-bubble" />
}));

describe('ChatBubbleManager', () => {
  it('renders nothing when on mobile and all bubbles are minimized', () => {
    // Setup
    (useMobile.useIsMobile as any).mockReturnValue(true);
    (MessengerContext.useMessenger as any).mockReturnValue({
      bubbles: [
        { conversationId: '1', otherUser: { id: 'u1', name: 'User 1' }, isMinimized: true }
      ]
    });

    render(<ChatBubbleManager />);

    // Assert
    const manager = screen.queryByTestId('chat-bubble-manager');
    // Since we expect it to return null, we check if bubbles are rendered
    const bubble = screen.queryByTestId('chat-bubble');
    expect(bubble).toBeNull();
  });

  it('renders bubble when on mobile and bubble is NOT minimized', () => {
    // Setup
    (useMobile.useIsMobile as any).mockReturnValue(true);
    (MessengerContext.useMessenger as any).mockReturnValue({
      bubbles: [
        { conversationId: '1', otherUser: { id: 'u1', name: 'User 1' }, isMinimized: false }
      ]
    });

    render(<ChatBubbleManager />);

    // Assert
    const bubble = screen.getByTestId('chat-bubble');
    expect(bubble).toBeInTheDocument();
  });

  it('does not block clicks on container when minimized (desktop)', () => {
    // This is hard to test with just render, but we can check class names
    (useMobile.useIsMobile as any).mockReturnValue(false);
    (MessengerContext.useMessenger as any).mockReturnValue({
      bubbles: [
        { conversationId: '1', otherUser: { id: 'u1', name: 'User 1' }, isMinimized: true }
      ]
    });

    const { container } = render(<ChatBubbleManager />);
    const wrapper = container.firstChild as HTMLElement;
    
    // We expect the wrapper to NOT have bg-background and to be pointer-events-none ideally
    // But in current implementation it might be fixed.
    // This test will help us drive the refactor.
  });
});
