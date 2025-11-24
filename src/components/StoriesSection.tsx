import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStories } from '@/hooks/useStories';
import { StoryRing } from './StoryRing';
import { StoryViewer } from './StoryViewer';
import { CreateStory } from './CreateStory';
import { toast } from 'sonner';

export const StoriesSection = () => {
  const { user } = useAuth();
  const { storyGroups, loading, createStory, markStoryAsViewed, deleteStory, uploadProgress, isUploading } = useStories();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);

  const handleCreateStory = async (file: File) => {
    if (!user) return;

    try {
      await createStory(file);
      toast.success('Story créée avec succès');
    } catch (error) {
      console.error('Error creating story:', error);
      toast.error('Erreur lors de la création de la story');
    }
  };

  const handleStoryClick = (index: number) => {
    setSelectedGroupIndex(index);
    setViewerOpen(true);
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      await deleteStory(storyId);
      toast.success('Story supprimée');
      setViewerOpen(false);
    } catch (error) {
      console.error('Error deleting story:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-shrink-0 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-muted"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        <CreateStory 
          onCreateStory={handleCreateStory}
          uploadProgress={uploadProgress}
          isUploading={isUploading}
        >
          <StoryRing isAddStory onClick={() => {}} />
        </CreateStory>

        {storyGroups.map((group, index) => (
          <StoryRing
            key={group.userId}
            storyGroup={group}
            onClick={() => handleStoryClick(index)}
          />
        ))}
      </div>

      {viewerOpen && storyGroups.length > 0 && (
        <StoryViewer
          storyGroups={storyGroups}
          initialGroupIndex={selectedGroupIndex}
          onClose={() => setViewerOpen(false)}
          onMarkAsViewed={markStoryAsViewed}
          onDelete={handleDeleteStory}
        />
      )}
    </>
  );
};
