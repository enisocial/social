import React from 'react';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';

export const PresenceTest = () => {
  const { user } = useAuth();
  const { presenceState, isUserOnline, getLastSeen, isOnline: currentUserOnline } = usePresence();

  if (!user) return null;

  const currentUserPresence = presenceState[user.id];
  const onlineFriends = Object.entries(presenceState).filter(([userId, presence]) =>
    presence.is_online && userId !== user.id
  );

  const offlineFriends = Object.entries(presenceState).filter(([userId, presence]) =>
    !presence.is_online && userId !== user.id
  );

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-sm">
      <h3 className="font-bold mb-3 text-gray-800">🟢 Test Présence</h3>

      <div className="space-y-2 text-sm">
        {/* Current User Status */}
        <div className="border-b pb-2">
          <div className="font-semibold text-blue-600">Vous:</div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${currentUserOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-xs font-mono">{user.id.slice(0, 8)}...</span>
            <span className="text-xs">{currentUserOnline ? 'En ligne' : 'Hors ligne'}</span>
          </div>
          {currentUserPresence && (
            <div className="text-xs text-gray-500 ml-4">
              Dernière activité: {new Date(currentUserPresence.last_seen).toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="text-green-600 font-semibold">
          Amis en ligne ({onlineFriends.length}):
        </div>
        {onlineFriends.map(([userId, presence]) => (
          <div key={userId} className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-mono">{userId.slice(0, 8)}...</span>
          </div>
        ))}

        <div className="text-gray-500 font-semibold pt-2 border-t">
          Amis hors ligne ({offlineFriends.length}):
        </div>
        {offlineFriends.slice(0, 5).map(([userId, presence]) => (
          <div key={userId} className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-xs font-mono">{userId.slice(0, 8)}...</span>
            <span className="text-xs text-gray-400">
              {presence.last_seen ? new Date(presence.last_seen).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        ))}

        <div className="pt-2 border-t text-xs text-gray-500">
          Total dans cache: {Object.keys(presenceState).length}
        </div>
      </div>
    </div>
  );
};
