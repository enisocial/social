import { useEffect, useState } from 'react';
import { useUnifiedPolling } from '@/hooks/useUnifiedPolling';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const BadgeTest = () => {
  const {
    badges,
    presence,
    forceRefresh,
    isInitialized,
    lastGlobalUpdate
  } = useUnifiedPolling();

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
    <div className="fixed bottom-20 left-4 bg-gradient-to-br from-green-500 to-blue-600 text-white p-4 rounded-xl shadow-2xl z-50 border-2 border-white/20">
      <h3 className="font-bold mb-3 text-lg">🎯 SYSTÈME UNIFIÉ - TEST</h3>

      {/* État d'initialisation */}
      <div className="mb-3">
        <Badge variant={isInitialized ? "default" : "destructive"} className="text-xs">
          {isInitialized ? '✅ Initialisé' : '⏳ Initialisation...'}
        </Badge>
      </div>

      {/* Section Présence */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-green-200">👥 PRÉSENCE</h4>
        <div className="text-sm space-y-1 bg-black/20 p-2 rounded-lg">
          <div>En ligne: <Badge className="ml-2 bg-green-500">{presence.totalOnline}</Badge></div>
          <div>Absent: <Badge className="ml-2 bg-yellow-500">{presence.totalAway}</Badge></div>
          <div className="text-xs opacity-75">
            Dernière MAJ: {new Date(presence.lastPresenceUpdate).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Section Badges */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-blue-200">🔔 BADGES</h4>
        <div className="text-sm space-y-1 bg-black/20 p-2 rounded-lg">
          <div>Messages: <Badge className="ml-2 bg-red-500">{badges.messages}</Badge></div>
          <div>Notifications: <Badge className="ml-2 bg-blue-500">{badges.notifications}</Badge></div>
          <div>Amis: <Badge className="ml-2 bg-purple-500">{badges.friendRequests}</Badge></div>
          <div>Total: <Badge className="ml-2 bg-orange-500 font-bold">{badges.total}</Badge></div>
          <div className="text-xs opacity-75">
            Dernière MAJ: {new Date(badges.lastBadgeUpdate).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Métriques globales */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-yellow-200">📊 MÉTRIQUES</h4>
        <div className="text-sm space-y-1 bg-black/20 p-2 rounded-lg">
          <div>Test Count: <Badge className="ml-2">{testCount}</Badge></div>
          <div className="text-xs opacity-75">
            Dernière globale: {new Date(lastGlobalUpdate).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Contrôles */}
      <div className="space-x-2">
        <Button
          size="sm"
          onClick={() => setAutoUpdate(!autoUpdate)}
          variant={autoUpdate ? "destructive" : "default"}
          className="text-xs"
        >
          {autoUpdate ? 'Stop Auto' : 'Start Auto'}
        </Button>
        <Button
          size="sm"
          onClick={forceRefresh}
          className="text-xs bg-white text-black hover:bg-gray-200"
        >
          Refresh
        </Button>
      </div>

      {/* Indicateur de performance */}
      <div className="mt-3 text-xs opacity-75 text-center">
        🔄 Polling unifié: 30s | 🌐 WebSocket actif
      </div>
    </div>
  );
};
