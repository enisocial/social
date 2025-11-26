import { renderHook, act } from '@testing-library/react-hooks';
import { describe, it, expect, vi } from 'vitest';
import { useMessenger } from '@/hooks/useMessenger';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-msg-id', created_at: new Date().toISOString() }, error: null }),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { messages: [] }, error: null }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      track: vi.fn(),
      send: vi.fn(),
      state: 'joined',
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

describe('useMessenger', () => {
  it('sends a message successfully', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useMessenger('test-conv-id'));

    await act(async () => {
      await result.current.sendMessage('Hello world');
    });

    // Expect the optimistic message to be replaced by the real one (mocked)
    // This is a simplified test, real checking would need more complex mocking of the state update flow
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Hello world');
  });

  it('handles RLS error correctly', async () => {
    // Override mock for error
    (supabase.from as any).mockImplementationOnce(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { code: '42501', message: 'row-level security policy violated' } 
          }),
        })),
      })),
    }));

    const { result } = renderHook(() => useMessenger('test-conv-id'));

    await act(async () => {
      await result.current.sendMessage('Fail please');
    });

    // Should handle error (toast is called, message removed or flagged)
    // In our current implementation, it removes the optimistic message on error
    expect(result.current.messages).toHaveLength(0);
  });
});
