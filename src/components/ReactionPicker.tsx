import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ReactionType } from '@/hooks/usePostReactions';

const REACTIONS = [
  { type: 'like' as ReactionType, emoji: '👍', label: 'J\'aime' },
  { type: 'love' as ReactionType, emoji: '❤️', label: 'J\'adore' },
  { type: 'haha' as ReactionType, emoji: '😂', label: 'Haha' },
  { type: 'wow' as ReactionType, emoji: '😮', label: 'Wow' },
  { type: 'sad' as ReactionType, emoji: '😢', label: 'Triste' },
  { type: 'angry' as ReactionType, emoji: '😠', label: 'Grrr' },
];

interface ReactionPickerProps {
  onSelect: (reaction: ReactionType) => void;
  currentReaction?: ReactionType | null;
  children: React.ReactNode;
}

export const ReactionPicker = ({ onSelect, currentReaction, children }: ReactionPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (reaction: ReactionType) => {
    onSelect(reaction);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-1">
          {REACTIONS.map((reaction) => (
            <Button
              key={reaction.type}
              variant={currentReaction === reaction.type ? 'secondary' : 'ghost'}
              size="sm"
              className="h-10 w-10 p-0 text-2xl hover:scale-125 transition-transform"
              onClick={() => handleSelect(reaction.type)}
              title={reaction.label}
            >
              {reaction.emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const getReactionEmoji = (type: ReactionType): string => {
  const reaction = REACTIONS.find(r => r.type === type);
  return reaction?.emoji || '👍';
};
