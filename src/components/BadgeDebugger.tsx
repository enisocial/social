import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export const BadgeDebugger = () => {
  const { user } = useAuth();
  const [dbState, setDbState] = useState({
    messages: 0,
    notifications: 0,
    friendRequests: 0,
    lastCheck: Date.now()
  });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log('🔴 DEBUG:', message);
    setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const checkDatabase = async () => {
    if (!user?.id) {
      addLog('❌ Pas d\'utilisateur connecté');
      return;
    }

    addLog(`🔍 Vérification DB pour ${user.id}`);

    try {
      // Messages non lus
      let totalMessages = 0;
      const { data: conversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      addLog(`📋 ${conversations?.length || 0} conversations trouvées`);

      if (conversations) {
        for (const conv of conversations) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.conversation_id)
            .eq('read', false)
            .neq('sender_id', user.id);

          totalMessages += count || 0;
          addLog(`💬 Conv ${conv.conversation_id}: ${count || 0} non lus`);
        }
      }

      // Notifications
      const { count: notificationsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      // Friend requests
      const { count: friendRequestsCount } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      const newState = {
        messages: totalMessages,
        notifications: notificationsCount || 0,
        friendRequests: friendRequestsCount || 0,
        lastCheck: Date.now()
      };

      setDbState(newState);
      addLog(`📊 État DB: ${JSON.stringify(newState)}`);

    } catch (error) {
      addLog(`❌ Erreur DB: ${error}`);
    }
  };

  const createTestData = async () => {
    if (!user?.id) return;

    addLog('🧪 Création de données de test...');

    try {
      // Créer un ami de test
      const { data: testUser } = await supabase
        .from('profiles')
        .insert({
          id: 'test-user-' + Date.now(),
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com'
        })
        .select()
        .single();

      if (testUser) {
        // Créer une demande d'ami
        await supabase
          .from('friend_requests')
          .insert({
            sender_id: testUser.id,
            receiver_id: user.id,
            status: 'pending'
          });

        // Créer une conversation
        const { data: conversation } = await supabase
          .from('conversations')
          .insert({ type: 'dm' })
          .select()
          .single();

        if (conversation) {
          // Ajouter les participants
          await supabase
            .from('conversation_participants')
            .insert([
              { conversation_id: conversation.id, user_id: user.id },
              { conversation_id: conversation.id, user_id: testUser.id }
            ]);

          // Créer quelques messages non lus
          await supabase
            .from('messages')
            .insert([
              {
                conversation_id: conversation.id,
                sender_id: testUser.id,
                content: 'Message test 1',
                read: false
              },
              {
                conversation_id: conversation.id,
                sender_id: testUser.id,
                content: 'Message test 2',
                read: false
              }
            ]);

          addLog('✅ Données de test créées');
        }
      }
    } catch (error) {
      addLog(`❌ Erreur création test: ${error}`);
    }
  };

  useEffect(() => {
    checkDatabase();
    const interval = setInterval(checkDatabase, 3000);
    return () => clearInterval(interval);
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg shadow-lg max-w-md z-50">
      <h3 className="font-bold mb-2">🔴 DEBUG BADGES</h3>

      <div className="text-sm space-y-1 mb-3">
        <div>Messages DB: {dbState.messages}</div>
        <div>Notifications DB: {dbState.notifications}</div>
        <div>Friends DB: {dbState.friendRequests}</div>
        <div>Dernière vérif: {new Date(dbState.lastCheck).toLocaleTimeString()}</div>
      </div>

      <div className="space-x-2 mb-3">
        <Button size="sm" onClick={checkDatabase} variant="outline">
          Vérifier DB
        </Button>
        <Button size="sm" onClick={createTestData} variant="outline">
          Créer Test
        </Button>
      </div>

      <div className="text-xs max-h-32 overflow-y-auto">
        <div className="font-semibold mb-1">Logs:</div>
        {logs.map((log, i) => (
          <div key={i} className="text-xs opacity-80">{log}</div>
        ))}
      </div>
    </div>
  );
};
