import { Button } from '@/components/ui/button';
import { Smile } from 'lucide-react';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '😠', '🔥', '👏', '🎉', '💯'];

interface MessageReactionsProps {
  messageId: string;
  currentUserId?: string;
}

export const MessageReactions = ({ messageId, currentUserId }: MessageReactionsProps) => {
  const { reactions, addReaction } = useMessageReactions(messageId);
  const [open, setOpen] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        count: 0,
        users: [],
        hasUserReacted: false
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.user?.name || 'Unknown');
    if (reaction.user_id === currentUserId) {
      acc[reaction.emoji].hasUserReacted = true;
    }
    return acc;
  }, {} as Record<string, { count: number; users: string[]; hasUserReacted: boolean }>);

  const handleReaction = async (emoji: string) => {
    await addReaction(emoji);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      {Object.entries(groupedReactions).map(([emoji, data]) => (
        <Button
          key={emoji}
          variant={data.hasUserReacted ? 'secondary' : 'ghost'}
          size="sm"
          className="h-6 px-2 text-xs gap-1"
          onClick={() => handleReaction(emoji)}
          title={data.users.join(', ')}
        >
          <span>{emoji}</span>
          <span>{data.count}</span>
        </Button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Smile className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1 flex-wrap max-w-[200px]">
            {EMOJI_LIST.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg hover:scale-125 transition-transform"
                onClick={() => handleReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
