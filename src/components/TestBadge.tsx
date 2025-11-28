// COMPOSANT DE TEST POUR VÉRIFIER LES BADGES
import React from 'react';
import { useMessengerBadges } from '@/hooks/useMessengerBadges';
import { useAuth } from '@/hooks/useAuth';

export const TestBadge: React.FC = () => {
  const { user } = useAuth();
  const { totalUnreadMessages, forceRefresh } = useMessengerBadges();

  if (!user) return null;

  return (
    <div className="fixed top-20 right-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-sm">
      <h3 className="font-bold mb-3 text-gray-800">🔴 Debug Badges Messenger</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">User ID:</span>
          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{user.id.slice(0, 8)}...</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Messages non lus:</span>
          <span className="font-bold text-red-600 text-lg">{totalUnreadMessages}</span>
        </div>

        <div className="pt-2 border-t">
          <button
            onClick={forceRefresh}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
          >
            🔄 Actualiser Badges
          </button>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-gray-500">
            Ce panneau disparaîtra en production.
            <br />
            Vérifiez la console pour les logs détaillés.
          </p>
        </div>
      </div>
    </div>
  );
};
