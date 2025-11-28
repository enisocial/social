import { useEffect, useState } from 'react';
import { useGlobalBadgeSync } from '@/hooks/useGlobalBadgeSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const BadgeTest = () => {
  const { messages, notifications, friendRequests, total, forceRefresh } = useGlobalBadgeSync();
  const [testCount, setTestCount] = useState(0);
  const [autoUpdate, setAutoUpdate] = useState(false);

  // Auto-refresh toutes les secondes pour test
  useEffect(() => {
    if (!autoUpdate) return;

    const interval = setInterval(() => {
      forceRefresh();
      setTestCount(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [autoUpdate, forceRefresh]);

  return (
    <div className="fixed bottom-20 left-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
      <h3 className="font-bold mb-2">🧪 TEST BADGES</h3>

      <div className="text-sm space-y-1 mb-3">
        <div>Messages: <Badge className="ml-2">{messages}</Badge></div>
        <div>Notifications: <Badge className="ml-2">{notifications}</Badge></div>
        <div>Friends: <Badge className="ml-2">{friendRequests}</Badge></div>
        <div>Total: <Badge className="ml-2">{total}</Badge></div>
        <div>Test Count: {testCount}</div>
      </div>

      <div className="space-x-2">
        <Button
          size="sm"
          onClick={() => setAutoUpdate(!autoUpdate)}
          variant={autoUpdate ? "destructive" : "default"}
        >
          {autoUpdate ? 'Stop Auto' : 'Start Auto'}
        </Button>
        <Button size="sm" onClick={forceRefresh}>
          Refresh
        </Button>
      </div>
    </div>
  );
};
