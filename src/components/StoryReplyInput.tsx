import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StoryReplyInputProps {
  storyId: string;
  storyOwnerId: string;
  onReplySent: () => void;
}

export const StoryReplyInput = ({ storyId, storyOwnerId, onReplySent }: StoryReplyInputProps) => {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendReply = async () => {
    if (!reply.trim()) return;

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insert reply
      const { error } = await supabase
        .from('story_replies')
        .upsert({
          story_id: storyId,
          user_id: user.id,
          content: reply.trim(),
        });

      if (error) throw error;

      // Create or find conversation and send message
      const { data: existingParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      let conversationId: string | null = null;

      if (existingParticipants) {
        for (const participant of existingParticipants) {
          const { data: otherParticipant } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', participant.conversation_id)
            .eq('user_id', storyOwnerId)
            .single();

          if (otherParticipant) {
            conversationId = participant.conversation_id;
            break;
          }
        }
      }

      // Create conversation if doesn't exist
      if (!conversationId) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({})
          .select()
          .single();

        if (newConv) {
          conversationId = newConv.id;
          await supabase
            .from('conversation_participants')
            .insert([
              { conversation_id: conversationId, user_id: user.id },
              { conversation_id: conversationId, user_id: storyOwnerId }
            ]);
        }
      }

      // Send as message
      if (conversationId) {
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: `Réponse à la story: ${reply.trim()}`,
          });
      }

      toast.success('Réponse envoyée');
      setReply('');
      onReplySent();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Erreur lors de l\'envoi de la réponse');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Textarea
        placeholder="Répondre à cette story..."
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={1}
        className="resize-none bg-white/10 border-white/20 text-white placeholder:text-white/50"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
          }
        }}
      />
      <Button
        onClick={handleSendReply}
        disabled={!reply.trim() || sending}
        size="icon"
        className="bg-white/20 hover:bg-white/30"
      >
        <Send className="w-4 h-4 text-white" />
      </Button>
    </div>
  );
};
