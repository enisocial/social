import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UserPresence {
  user_id: string;
  online: boolean;
  last_seen: string | null;
}

export const PresenceChecker: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [loading, setLoading] = useState(false);

  const checkPresence = async () => {
    if (!userId.trim() && !username.trim()) return;

    setLoading(true);
    try {
      let targetUserId = userId;

      // If username provided, find user ID
      if (username.trim() && !userId.trim()) {
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.trim())
          .single();

        if (user) {
          targetUserId = user.id;
        } else {
          alert('Utilisateur non trouvé');
          setLoading(false);
          return;
        }
      }

      // Check presence
      const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, online, last_seen')
        .eq('user_id', targetUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // PGRST116 = not found
          // User has no presence record, set default
          setPresence({
            user_id: targetUserId,
            online: false,
            last_seen: null
          });
        } else {
          console.error('Erreur:', error);
          alert('Erreur lors de la vérification');
        }
      } else if (data) {
        setPresence({
          user_id: data.user_id,
          online: data.online || false,
          last_seen: data.last_seen
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la vérification');
    }
    setLoading(false);
  };

  const findUserByName = async () => {
    if (!username.trim()) return;

    try {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name, username')
        .ilike('name', `%${username}%`)
        .limit(5);

      if (users && users.length > 0) {
        const user = users[0];
        setUserId(user.id);
        setUsername(user.username);
        alert(`Utilisateur trouvé: ${user.name} (@${user.username}) - ID: ${user.id}`);
      } else {
        alert('Aucun utilisateur trouvé');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Vérificateur de Statut en Ligne</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nom d'utilisateur</label>
          <div className="flex gap-2">
            <Input
              placeholder="Entrez le nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Button onClick={findUserByName} variant="outline">
              🔍
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">ID Utilisateur (optionnel)</label>
          <Input
            placeholder="ID utilisateur (sera rempli automatiquement)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>

        <Button onClick={checkPresence} disabled={loading} className="w-full">
          {loading ? 'Vérification...' : 'Vérifier le statut'}
        </Button>

        {presence && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
            <h3 className="font-semibold">Résultat:</h3>
            <div className="flex items-center gap-2">
              <span>Statut:</span>
              <Badge variant={presence.online ? "default" : "secondary"}>
                {presence.online ? '🟢 En ligne' : '⚫ Hors ligne'}
              </Badge>
            </div>
            {presence.last_seen && (
              <div>
                <span>Dernière activité: </span>
                <span className="text-sm text-gray-600">
                  {new Date(presence.last_seen).toLocaleString('fr-FR')}
                </span>
              </div>
            )}
            <div className="text-xs text-gray-500">
              User ID: {presence.user_id}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
