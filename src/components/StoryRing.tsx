import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { StoryGroup } from '@/hooks/useStories';

interface StoryRingProps {
  storyGroup?: StoryGroup;
  isAddStory?: boolean;
  onClick: () => void;
}

export const StoryRing = ({ storyGroup, isAddStory, onClick }: StoryRingProps) => {
  if (isAddStory) {
    return (
      <div 
        className="flex flex-col items-center gap-2 cursor-pointer group"
        onClick={onClick}
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-pink-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
              <Plus className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
        <span className="text-xs font-medium text-foreground">Ajouter</span>
      </div>
    );
  }

  if (!storyGroup) return null;

  return (
    <div 
      className="flex flex-col items-center gap-2 cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative">
        <div 
          className={`w-16 h-16 rounded-full p-[2px] ${
            storyGroup.hasViewed 
              ? 'bg-muted' 
              : 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500'
          }`}
        >
          <div className="w-full h-full rounded-full bg-background p-[2px]">
            <Avatar className="w-full h-full">
              <AvatarImage src={storyGroup.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {storyGroup.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        {storyGroup.stories.length > 1 && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary border-2 border-background flex items-center justify-center">
            <span className="text-[10px] text-primary-foreground font-bold">
              {storyGroup.stories.length}
            </span>
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-foreground text-center w-16 truncate">
        {storyGroup.name}
      </span>
    </div>
  );
};
