import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EditPostDialogProps {
  post: {
    id: string;
    content: string;
    edit_history?: Array<{ content: string; edited_at: string }>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const EditPostDialog = ({ post, open, onOpenChange, onSuccess }: EditPostDialogProps) => {
  const [content, setContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleSave = async () => {
    if (!content.trim() || content === post.content) return;

    setSaving(true);
    try {
      // Build edit history
      const currentHistory = post.edit_history || [];
      const newHistory = [
        ...currentHistory,
        {
          content: post.content,
          edited_at: new Date().toISOString()
        }
      ];

      const { error } = await supabase
        .from('posts')
        .update({
          content: content.trim(),
          edited_at: new Date().toISOString(),
          edit_history: newHistory
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post modifié avec succès');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la publication</DialogTitle>
          <DialogDescription>
            Modifiez le contenu de votre publication
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Quoi de neuf ?"
            rows={6}
            className="resize-none"
          />

          {post.edit_history && post.edit_history.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                Historique des modifications ({post.edit_history.length})
              </Button>

              {showHistory && (
                <div className="space-y-3 p-4 bg-muted rounded-lg max-h-60 overflow-y-auto">
                  {post.edit_history.map((edit, index) => (
                    <div key={index} className="p-3 bg-background rounded border border-border">
                      <p className="text-xs text-muted-foreground mb-2">
                        {formatDistanceToNow(new Date(edit.edited_at), {
                          addSuffix: true,
                          locale: fr
                        })}
                      </p>
                      <p className="text-sm">{edit.content}</p>
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
              disabled={saving || !content.trim() || content === post.content}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
