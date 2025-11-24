import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, MessageSquare } from 'lucide-react';
import { useBroadcastMessages } from '@/hooks/useBroadcastMessages';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const priorityColors = {
  low: 'bg-blue-500/10 text-blue-500',
  normal: 'bg-gray-500/10 text-gray-500',
  high: 'bg-orange-500/10 text-orange-500',
  urgent: 'bg-red-500/10 text-red-500',
};

const categoryLabels = {
  general: 'Général',
  feature: 'Fonctionnalité',
  maintenance: 'Maintenance',
  security: 'Sécurité',
  event: 'Événement',
};

const priorityLabels = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
};

export const BroadcastMessagesList = () => {
  const { messages, isLoading, deleteBroadcast } = useBroadcastMessages();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Historique des messages broadcast
        </CardTitle>
        <CardDescription>
          Liste de tous les messages envoyés aux utilisateurs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!messages || messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun message broadcast envoyé pour le moment
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{msg.title}</h3>
                      <Badge className={priorityColors[msg.priority]}>
                        {priorityLabels[msg.priority]}
                      </Badge>
                      <Badge variant="outline">
                        {categoryLabels[msg.category]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{msg.message}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Par {msg.profiles?.name || msg.profiles?.username || 'Admin'}
                      </span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(msg.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteBroadcast.mutate(msg.id)}
                    disabled={deleteBroadcast.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
