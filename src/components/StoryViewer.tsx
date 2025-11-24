import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Story, StoryGroup } from '@/hooks/useStories';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Eye, Trash2, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { StoryReplyInput } from './StoryReplyInput';
import { StoryEmojiSlider } from './StoryEmojiSlider';

interface StoryViewerProps {
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onMarkAsViewed: (storyId: string) => void;
  onDelete?: (storyId: string) => void;
}

export const StoryViewer = ({ 
  storyGroups, 
  initialGroupIndex, 
  onClose, 
  onMarkAsViewed,
  onDelete 
}: StoryViewerProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  const isOwnStory = currentStory?.user_id === user?.id;

  useEffect(() => {
    if (!currentStory) return;

    // Mark story as viewed
    if (!isOwnStory && !currentStory.hasViewed) {
      onMarkAsViewed(currentStory.id);
    }

    setProgress(0);
    const duration = currentStory.media_type === 'video' ? 15000 : 5000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(progressInterval);
  }, [currentGroupIndex, currentStoryIndex]);

  const handleNext = () => {
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      setCurrentGroupIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(prev => prev - 1);
      setCurrentStoryIndex(storyGroups[currentGroupIndex - 1].stories.length - 1);
    }
  };

  const handleDelete = () => {
    if (onDelete && currentStory) {
      onDelete(currentStory.id);
      if (currentGroup.stories.length === 1) {
        onClose();
      } else {
        handleNext();
      }
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {currentGroup.stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: idx < currentStoryIndex ? '100%' : idx === currentStoryIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/profile/${currentGroup.username}`)}
        >
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={currentGroup.avatar_url || ''} />
            <AvatarFallback className="bg-primary text-white">
              {currentGroup.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-semibold">{currentGroup.name}</p>
            <p className="text-white/80 text-sm">
              {formatDistanceToNow(new Date(currentStory.created_at), { 
                addSuffix: true, 
                locale: fr 
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwnStory && (
            <>
              <div className="flex items-center gap-1 text-white">
                <Eye className="w-4 h-4" />
                <span className="text-sm">{currentStory.views}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-white hover:bg-white/20"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Navigation areas */}
      <div className="absolute inset-0 flex">
        <div
          className="flex-1 cursor-pointer"
          onClick={handlePrevious}
        />
        <div
          className="flex-1 cursor-pointer"
          onClick={handleNext}
        />
      </div>

      {/* Navigation buttons */}
      {currentGroupIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setCurrentGroupIndex(prev => prev - 1);
            setCurrentStoryIndex(0);
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      )}

      {currentGroupIndex < storyGroups.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setCurrentGroupIndex(prev => prev + 1);
            setCurrentStoryIndex(0);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      )}

      {/* Media */}
      <div className="relative w-full h-full flex items-center justify-center">
        {currentStory.media_type === 'image' ? (
          <img
            src={currentStory.media_url}
            alt="Story"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            src={currentStory.media_url}
            autoPlay
            muted
            className="max-w-full max-h-full object-contain"
            onEnded={handleNext}
          />
        )}
      </div>

      {/* Interactive Elements */}
      {!isOwnStory && (
        <div className="absolute bottom-20 left-0 right-0 px-4 space-y-3 z-10">
          {/* Emoji Sliders */}
          <StoryEmojiSlider storyId={currentStory.id} emoji="🔥" label="Chaud" />
          <StoryEmojiSlider storyId={currentStory.id} emoji="😍" label="J'adore" />
          
          {/* Reply Button */}
          <Button
            onClick={() => setShowReplyInput(!showReplyInput)}
            className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-lg text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Répondre à la story
          </Button>

          {/* Reply Input */}
          {showReplyInput && (
            <StoryReplyInput
              storyId={currentStory.id}
              storyOwnerId={currentStory.user_id}
              onReplySent={() => {
                setShowReplyInput(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
