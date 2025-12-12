import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStories } from '@/hooks/useStories';
import { StoryRing } from './StoryRing';
import { StoryViewer } from './StoryViewer';
import { CreateStory } from './CreateStory';
import { toast } from 'sonner';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
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
  ZapIcon,
  Trophy,
  Award
} from 'lucide-react';

export const StoriesSection = () => {
  const { user } = useAuth();
  const { storyGroups, loading, createStory, markStoryAsViewed, deleteStory, uploadProgress, isUploading } = useStories();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { scrollXProgress } = useScroll({
    container: scrollRef
  });

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

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative overflow-hidden bg-gradient-to-br from-slate-50/95 via-indigo-50/80 to-slate-50/95 dark:from-slate-800/95 dark:via-indigo-950/20 dark:to-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-indigo-200/30 dark:border-indigo-800/30"
      >
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-200/20 to-cyan-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative p-8">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-200 to-purple-200 dark:from-indigo-800 dark:to-purple-800 rounded-2xl animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-6 bg-gradient-to-r from-indigo-200 to-purple-200 dark:from-indigo-800 dark:to-purple-800 rounded-xl w-48 animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-700 dark:to-purple-700 rounded-lg w-32 animate-pulse"></div>
              </div>
            </div>
            <div className="w-20 h-8 bg-gradient-to-r from-indigo-200 to-purple-200 dark:from-indigo-800 dark:to-purple-800 rounded-full animate-pulse"></div>
          </div>

          {/* Stories Grid Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 animate-pulse shadow-lg"></div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full animate-pulse shadow-lg"></div>
                </div>
                <div className="space-y-2 text-center">
                  <div className="h-3 bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 rounded w-16 animate-pulse mx-auto"></div>
                  <div className="h-2 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded w-12 animate-pulse mx-auto"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative overflow-hidden bg-gradient-to-br from-white/95 via-indigo-50/90 to-white/95 dark:from-slate-800/95 dark:via-indigo-950/20 dark:to-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-indigo-200/30 dark:border-indigo-800/30"
      >
        {/* Static background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20"></div>
        </div>

        {/* Header Section */}
        <div className="relative p-8 border-b border-indigo-200/20 dark:border-indigo-800/20">
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
        <div className="relative p-8">
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Create Story Button - Ultra Modern */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="flex-shrink-0"
            >
              <CreateStory
                onCreateStory={handleCreateStory}
                uploadProgress={uploadProgress}
                isUploading={isUploading}
              >
                <div className="relative cursor-pointer group">
                  {/* Static background */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-indigo-400/20 via-purple-400/20 to-pink-400/20 blur-sm"></div>

                  <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl border-2 border-white/50 dark:border-slate-800/50 group-hover:shadow-3xl transition-all duration-300 overflow-hidden">
                    {isUploading ? (
                      <div className="relative z-10">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
                        />
                        {uploadProgress > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{uploadProgress}%</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="relative z-10"
                      >
                        <Plus className="w-10 h-10 text-white drop-shadow-lg" />
                      </motion.div>
                    )}
                  </div>

                  {/* Premium badge */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-full border-2 border-white dark:border-slate-800 shadow-xl flex items-center justify-center"
                  >
                    <Crown className="w-4 h-4 text-white" />
                  </motion.div>
                </div>
              </CreateStory>

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
                  onHoverStart={() => setHoveredIndex(index)}
                  onHoverEnd={() => setHoveredIndex(null)}
                >
                  <div className="relative">
                    {/* Advanced hover effects */}
                    <motion.div
                      animate={{
                        boxShadow: hoveredIndex === index
                          ? "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.1)"
                          : "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                      }}
                      transition={{ duration: 0.2 }}
                      className="relative overflow-hidden rounded-3xl"
                    >
                      <StoryRing
                        storyGroup={group}
                        onClick={() => handleStoryClick(index)}
                      />

                      {/* Advanced status indicators */}
                      {group.stories && group.stories.length > 0 && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.1 + 0.5, type: "spring" }}
                          className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 rounded-full border-3 border-white dark:border-slate-800 shadow-xl flex items-center justify-center"
                        >
                          <span className="text-white font-bold text-xs">{group.stories.length}</span>
                          {/* Pulsing effect */}
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 rounded-full bg-red-400/50"
                          />
                        </motion.div>
                      )}

                      {/* Premium user indicator */}
                      {group.stories.length > 5 && (
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full border-2 border-white dark:border-slate-800 shadow-lg flex items-center justify-center"
                        >
                          <Star className="w-3 h-3 text-white fill-white" />
                        </motion.div>
                      )}

                      {/* Engagement indicators */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: hoveredIndex === index ? 1 : 0, y: hoveredIndex === index ? 0 : 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-3xl flex items-end justify-center pb-4"
                      >
                        <div className="flex items-center gap-4 text-white text-xs">
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            <span>24</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            <span>8</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Share2 className="w-3 h-3" />
                            <span>3</span>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Enhanced user info */}
                  <motion.div
                    animate={{
                      y: hoveredIndex === index ? -2 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="mt-4 text-center"
                  >
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[100px] mx-auto group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {group.username || 'Utilisateur'}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <Eye className="w-3 h-3" />
                        <span>{group.stories.length}</span>
                      </div>
                      {group.stories.length > 0 && (
                        <>
                          <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                            <Flame className="w-3 h-3 text-orange-500" />
                            <span>Actif</span>
                          </div>
                        </>
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
