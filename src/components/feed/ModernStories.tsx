import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { StoryGroup } from '@/hooks/useStories';
import { StoryViewer } from '@/components/StoryViewer';

interface ModernStoriesProps {
  storyGroups: StoryGroup[];
  onCreateStory: () => void;
  currentUserAvatar?: string;
  currentUserName?: string;
}

export const ModernStories = ({ 
  storyGroups, 
  onCreateStory,
  currentUserAvatar,
  currentUserName 
}: ModernStoriesProps) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);

  const handleStoryClick = (index: number) => {
    setSelectedGroupIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <Card className="mb-4 shadow-md border-border/50">
        <div className="p-4">
          {/* Horizontal scrollable container */}
          <div className="flex gap-3 overflow-x-auto overflow-y-hidden pb-2 snap-x snap-mandatory">
            {/* Create Story Card */}
            <button
              onClick={onCreateStory}
              className="flex-shrink-0 w-28 h-48 rounded-xl overflow-hidden relative group cursor-pointer hover:scale-[1.02] transition-all shadow-sm hover:shadow-md snap-start"
            >
              <div className="h-3/4 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative">
                {currentUserAvatar ? (
                  <img src={currentUserAvatar} alt="You" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-card border-t border-border/40">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-primary border-4 border-card flex items-center justify-center shadow-sm">
                  <Plus className="h-5 w-5 text-primary-foreground" />
                </div>
                <p className="text-xs font-semibold text-center mt-3 text-foreground">Créer</p>
              </div>
            </button>

            {/* Stories List */}
            {storyGroups.length > 0 ? (
              storyGroups.map((group, index) => {
                const firstStory = group.stories[0];
                const isVideo = firstStory?.media_type === 'video';
                
                return (
                  <button
                    key={group.userId}
                    onClick={() => handleStoryClick(index)}
                    className="flex-shrink-0 w-28 h-48 rounded-xl overflow-hidden relative group cursor-pointer hover:scale-[1.02] transition-all shadow-sm hover:shadow-md snap-start bg-black"
                  >
                    {/* Media Preview */}
                    {isVideo ? (
                      <video
                        src={firstStory.media_url}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img
                        src={firstStory?.media_url}
                        alt={group.username}
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
                    
                    {/* Avatar with colored ring */}
                    <div className="absolute top-3 left-3">
                      <div className={`p-[2px] rounded-full ${group.hasViewed ? 'bg-muted/60' : 'bg-gradient-to-tr from-primary via-accent to-primary'} shadow-md`}>
                        <Avatar className="h-10 w-10 border-[3px] border-card">
                          <AvatarImage src={group.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                            {group.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>

                    {/* Username */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-xs font-semibold text-white truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {group.username}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex-shrink-0 w-64 h-48 rounded-xl bg-muted/30 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center px-4">
                <p className="text-sm text-muted-foreground text-center">
                  Aucune story disponible pour le moment
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {viewerOpen && (
        <StoryViewer
          storyGroups={storyGroups}
          initialGroupIndex={selectedGroupIndex}
          onClose={() => setViewerOpen(false)}
          onMarkAsViewed={() => {}}
          onDelete={() => {}}
        />
      )}
    </>
  );
};
