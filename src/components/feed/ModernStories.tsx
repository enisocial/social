import { useState } from 'react';
import { StoryRing } from '@/components/StoryRing';
import { StoryViewer } from '@/components/StoryViewer';
import { CreateStory } from '@/components/CreateStory';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useStories } from '@/hooks/useStories';

interface ModernStoriesProps {
  storyGroups: any[];
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
  const { user } = useAuth();
  const { createStory, markStoryAsViewed, deleteStory, uploadProgress, isUploading } = useStories();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);

  const handleCreateStory = async (file: File, textOverlay?: {
    text: string;
    text_position: { x: number; y: number };
    text_color: string;
    text_size: number;
  }) => {
    if (!user) return;

    try {
      await createStory(file, textOverlay);
      toast.success('✨ Story créée avec succès');
    } catch (error) {
      console.error('Error creating story:', error);
      toast.error('❌ Erreur lors de la création de la story');
    }
  };

  const handleStoryClick = (index: number) => {
    setSelectedGroupIndex(index);
    setViewerOpen(true);
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      await deleteStory(storyId);
      toast.success('🗑️ Story supprimée');
      setViewerOpen(false);
    } catch (error) {
      console.error('Error deleting story:', error);
      toast.error('❌ Erreur lors de la suppression');
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border mb-6">
        <div className="p-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {/* Create Story Button */}
            <div className="flex-shrink-0">
              <StoryRing
                isAddStory={true}
                onClick={onCreateStory}
              />
              <div className="mt-2 text-center">
                <p className="text-xs font-medium text-gray-900 dark:text-white">Créer une</p>
                <p className="text-xs font-medium text-gray-900 dark:text-white">story</p>
              </div>
            </div>

            {/* Stories Grid */}
            {storyGroups.map((group, index) => (
              <div
                key={group.userId}
                className="flex-shrink-0 cursor-pointer"
                onClick={() => handleStoryClick(index)}
              >
                <StoryRing
                  storyGroup={group}
                  onClick={() => handleStoryClick(index)}
                />
                <div className="mt-2 text-center">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[70px] mx-auto">
                    {group.username || 'Utilisateur'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Story Viewer */}
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
