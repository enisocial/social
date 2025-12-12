import { ReactionType } from '@/hooks/usePostReactions';
import { getReactionEmoji } from './ReactionPicker';

interface ReactionCount {
  type: ReactionType;
  count: number;
}

interface ReactionsSummaryProps {
  reactions: ReactionCount[];
  totalCount: number;
  onClick?: () => void;
}

export const ReactionsSummary = ({ reactions, totalCount, onClick }: ReactionsSummaryProps) => {
  if (totalCount === 0) return null;

  // Show top 3 reactions
  const topReactions = [...reactions]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-1 hover:underline cursor-pointer"
    >
      <div className="flex -space-x-1">
        {topReactions.map((reaction) => (
          <div
            key={reaction.type}
            className="inline-flex items-center justify-center w-5 h-5 bg-background rounded-full border border-border text-xs"
          >
            {getReactionEmoji(reaction.type)}
          </div>
        ))}
      </div>
      <span className="text-sm text-muted-foreground ml-1">
        {totalCount}
      </span>
    </button>
  );
};
