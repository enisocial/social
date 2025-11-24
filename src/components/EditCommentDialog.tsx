import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EditCommentDialogProps {
  comment: {
    id: string;
    text: string;
    edit_history?: Array<{ text: string; edited_at: string }>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const EditCommentDialog = ({ comment, open, onOpenChange, onSuccess }: EditCommentDialogProps) => {
  const [text, setText] = useState(comment.text);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleSave = async () => {
    if (!text.trim() || text === comment.text) return;

    setSaving(true);
    try {
      const currentHistory = comment.edit_history || [];
      const newHistory = [
        ...currentHistory,
        {
          text: comment.text,
          edited_at: new Date().toISOString()
        }
      ];

      const { error } = await supabase
        .from('comments')
        .update({
          text: text.trim(),
          edited_at: new Date().toISOString(),
          edit_history: newHistory
        })
        .eq('id', comment.id);

      if (error) throw error;

      toast.success('Commentaire modifié avec succès');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le commentaire</DialogTitle>
          <DialogDescription>
            Modifiez le contenu de votre commentaire
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrivez votre commentaire..."
            rows={4}
            className="resize-none"
          />

          {comment.edit_history && comment.edit_history.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                Historique des modifications ({comment.edit_history.length})
              </Button>

              {showHistory && (
                <div className="space-y-3 p-4 bg-muted rounded-lg max-h-60 overflow-y-auto">
                  {comment.edit_history.map((edit, index) => (
                    <div key={index} className="p-3 bg-background rounded border border-border">
                      <p className="text-xs text-muted-foreground mb-2">
                        {formatDistanceToNow(new Date(edit.edited_at), {
                          addSuffix: true,
                          locale: fr
                        })}
                      </p>
                      <p className="text-sm">{edit.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !text.trim() || text === comment.text}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
