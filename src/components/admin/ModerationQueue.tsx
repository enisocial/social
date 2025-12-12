import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, AlertTriangle } from 'lucide-react';
import { ModerationItem, useModeration } from '@/hooks/useModeration';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';

export const ModerationQueue = () => {
  const { queue, loading, approveContent, rejectContent, escalateContent } = useModeration();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'approved': return 'secondary';
      case 'rejected': return 'destructive';
      case 'escalated': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  if (queue.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="text-muted-foreground">Aucun élément dans la file de modération</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {queue.map((item) => (
        <Card key={item.id} className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={item.reporter?.avatar_url || ''} />
                  <AvatarFallback>{item.reporter?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{item.reporter?.name || 'Anonyme'}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant={getPriorityColor(item.priority)}>
                  {item.priority === 'urgent' && '🚨 '}{item.priority.toUpperCase()}
                </Badge>
                <Badge variant={getStatusColor(item.status)}>
                  {item.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Content Info */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{item.content_type.toUpperCase()}</Badge>
                <span className="text-sm text-muted-foreground">ID: {item.content_id.substring(0, 8)}...</span>
              </div>
              {item.reason && (
                <p className="text-sm text-foreground">
                  <span className="font-medium">Raison:</span> {item.reason}
                </p>
              )}
            </div>

            {/* Moderator Notes Input */}
            {item.status === 'pending' && (
              <Textarea
                placeholder="Notes du modérateur (optionnel)..."
                value={notes[item.id] || ''}
                onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}
                className="min-h-[80px]"
              />
            )}

            {/* Previous Notes */}
            {item.moderator_notes && (
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Notes du modérateur:</p>
                <p className="text-sm text-foreground">{item.moderator_notes}</p>
              </div>
            )}

            {/* Actions */}
            {item.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  onClick={() => approveContent(item.id, notes[item.id])}
                  variant="default"
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approuver
                </Button>
                <Button
                  onClick={() => rejectContent(item.id, notes[item.id])}
                  variant="destructive"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Rejeter
                </Button>
                <Button
                  onClick={() => escalateContent(item.id, notes[item.id])}
                  variant="outline"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Escalader
                </Button>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
