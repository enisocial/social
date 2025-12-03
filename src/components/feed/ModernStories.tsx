import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useStories } from '@/hooks/useStories';
import { StoryRing } from '@/components/StoryRing';
import { StoryViewer } from '@/components/StoryViewer';
import { CreateStory } from '@/components/CreateStory';
import { toast } from 'sonner';
import {
  Plus,
  Sparkles,
  Users,
  Camera,
  Eye,
  Clock,
  Zap,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Crown,
  Star,
  Flame,
  Trophy,
  Award,
  Target
} from 'lucide-react';

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

  // Statistiques avancées des stories
  const stats = {
    total: storyGroups.length,
    hasUserStory: storyGroups.some(group => group.userId === user?.id),
    totalStories: storyGroups.reduce((sum, group) => sum + group.stories.length, 0),
    activeUsers: storyGroups.filter(group => group.stories.some(story =>
      new Date(story.expires_at) > new Date()
    )).length,
    topContributor: storyGroups.reduce((max, group) =>
      group.stories.length > max.stories.length ? group : max,
      storyGroups[0] || { stories: [] }
    )
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative overflow-hidden bg-gradient-to-br from-white/95 via-indigo-50/90 to-white/95 dark:from-slate-800/95 dark:via-indigo-950/20 dark:to-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-indigo-200/30 dark:border-indigo-800/30 mb-6"
      >
        {/* Static background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20"></div>
        </div>

        {/* Header Section */}
        <div className="relative p-6 border-b border-indigo-200/20 dark:border-indigo-800/20">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <Zap className="w-2.5 h-2.5 text-white" />
                </motion.div>
              </div>

              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-indigo-700 to-purple-700 dark:from-white dark:via-indigo-300 dark:to-purple-300 bg-clip-text text-transparent">
                  Stories Dynamiques
                </h3>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {stats.activeUsers} actifs
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {stats.totalStories} stories
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    24h restantes
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Advanced Stats Badge */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-2xl shadow-xl"
            >
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span className="font-bold text-lg">{stats.total}</span>
              </div>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="text-xs font-medium">
                <div>Stories</div>
                <div className="opacity-90">aujourd'hui</div>
              </div>
            </motion.div>
          </div>


        </div>

        {/* Stories Content */}
        <div className="relative p-6">
          <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide scroll-smooth">
            {/* Create Story Button - Ultra Modern */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="flex-shrink-0"
            >
              <StoryRing
                isAddStory={true}
                onClick={onCreateStory}
              />

              <div className="mt-4 text-center">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Créer</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">votre story</p>
              </div>
            </motion.div>

            {/* Stories Grid */}
            <AnimatePresence>
              {storyGroups.map((group, index) => (
                <motion.div
                  key={group.userId}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{
                    delay: index * 0.1 + 0.3,
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                  whileHover={{ y: -8 }}
                  className="flex-shrink-0 group cursor-pointer"
                  onClick={() => handleStoryClick(index)}
                >
                  <StoryRing
                    storyGroup={group}
                    onClick={() => handleStoryClick(index)}
                  />

                  {/* Enhanced user info */}
                  <motion.div
                    animate={{
                      y: [0, -1, 0],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="mt-4 text-center"
                  >
                    <p className={`text-sm font-bold truncate max-w-[100px] mx-auto transition-colors ${
                      group.stories.some(story => !story.hasViewed)
                        ? 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {group.username || 'Utilisateur'}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {group.stories.some(story => !story.hasViewed) ? (
                        <motion.div
                          animate={{ opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Active</span>
                        </motion.div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>Vu</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty state - Ultra Premium */}
            {storyGroups.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="flex-shrink-0 w-full max-w-sm mx-auto text-center py-12"
              >
                <div className="relative mb-6">
                  <motion.div
                    animate={{
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-20 h-20 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-indigo-900/50 dark:via-purple-900/50 dark:to-pink-900/50 rounded-full mx-auto flex items-center justify-center shadow-2xl"
                  >
                    <Users className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                  </motion.div>

                  {/* Floating elements */}
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute -top-3 -right-3 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-lg flex items-center justify-center"
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                    className="absolute -bottom-2 -left-2 w-5 h-5 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full shadow-lg flex items-center justify-center"
                  >
                    <Camera className="w-2.5 h-2.5 text-white" />
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">
                    Soyez le premier !
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6 max-w-xs">
                    Partagez vos moments avec votre communauté. Créez votre première story et inspirez les autres !
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <CreateStory
                      onCreateStory={handleCreateStory}
                      uploadProgress={uploadProgress}
                      isUploading={isUploading}
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-200"
                      >
                        ✨ Créer ma première story
                      </motion.button>
                    </CreateStory>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-2xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                      Découvrir les stories
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Enhanced Story Viewer */}
      <AnimatePresence>
        {viewerOpen && storyGroups.length > 0 && (
          <StoryViewer
            storyGroups={storyGroups}
            initialGroupIndex={selectedGroupIndex}
            onClose={() => setViewerOpen(false)}
            onMarkAsViewed={markStoryAsViewed}
            onDelete={handleDeleteStory}
          />
        )}
      </AnimatePresence>
    </>
  );
};
