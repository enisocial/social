import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStories } from '@/hooks/useStories';
import { StoryRing } from './StoryRing';
import { StoryViewer } from './StoryViewer';
import { CreateStory } from './CreateStory';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Plus,
  Sparkles,
  Users,
  Camera,
  Eye,
  Clock,
  Zap
} from 'lucide-react';

export const StoriesSection = () => {
  const { user } = useAuth();
  const { storyGroups, loading, createStory, markStoryAsViewed, deleteStory, uploadProgress, isUploading } = useStories();
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

  // Statistiques des stories
  const stats = {
    total: storyGroups.length,
    hasUserStory: storyGroups.some(group => group.userId === user?.id),
    totalStories: storyGroups.reduce((sum, group) => sum + group.stories.length, 0)
  };

  if (loading) {
    // SKELETON LOADER ULTRA-MODERNE AFRICAIN
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-white/95 via-emerald-50/80 to-white/95 dark:from-gray-800/95 dark:via-emerald-950/20 dark:to-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/50 p-6"
      >
        {/* HEADER SKELETON */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-200 to-teal-200 dark:from-emerald-800 dark:to-teal-800 rounded-xl animate-pulse"></div>
            <div className="h-5 bg-gradient-to-r from-emerald-200 to-teal-200 dark:from-emerald-800 dark:to-teal-800 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* STORIES SKELETON */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex-shrink-0"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 animate-pulse"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full animate-pulse"></div>
              </div>
              <div className="mt-2 h-3 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 rounded w-16 animate-pulse mx-auto"></div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-br from-white/95 via-emerald-50/80 to-white/95 dark:from-gray-800/95 dark:via-emerald-950/20 dark:to-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-200/50 dark:border-emerald-800/50 overflow-hidden"
      >
        {/* HEADER ULTRA-MODERNE AFRICAIN */}
        <div className="relative p-6 border-b border-emerald-200/30 dark:border-emerald-800/30">
          {/* Fond avec motif subtil */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5"></div>

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                  Stories communautaires
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {stats.total} ami{stats.total !== 1 ? 's' : ''} • {stats.totalStories} storie{stats.totalStories !== 1 ? 's' : ''} aujourd'hui
                </p>
              </div>
            </div>

            {/* BADGE STATUT */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg"
            >
              <Eye className="w-3 h-3" />
              {stats.total}
            </motion.div>
          </div>
        </div>

        {/* CONTENU STORIES */}
        <div className="p-6">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {/* BOUTON CRÉER STORY ULTRA-MODERNE */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0"
            >
              <CreateStory
                onCreateStory={handleCreateStory}
                uploadProgress={uploadProgress}
                isUploading={isUploading}
              >
                <div className="relative cursor-pointer group">
                  {/* EFFET DE FOND ANIMÉ */}
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-2xl blur-sm"></div>

                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800 group-hover:shadow-xl transition-all duration-300">
                    {isUploading ? (
                      <div className="relative">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {uploadProgress > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{uploadProgress}%</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Plus className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-200" />
                    )}
                  </div>

                  {/* BADGE AJOUTER */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-lg">
                    <Camera className="w-3 h-3 text-white" />
                  </div>
                </div>
              </CreateStory>

              <div className="mt-3 text-center">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Créer</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Story</p>
              </div>
            </motion.div>

            {/* STORIES DES AMIS */}
            {storyGroups.map((group, index) => (
              <motion.div
                key={group.userId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 cursor-pointer group"
                onClick={() => handleStoryClick(index)}
              >
                <div className="relative">
                  {/* EFFET DE FOND ANIMÉ */}
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/20 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-2xl blur-sm"></div>

                  <StoryRing
                    storyGroup={group}
                    onClick={() => handleStoryClick(index)}
                  />

                  {/* INDICATEUR DE STATUT ULTRA-MODERNE */}
                  {group.stories && group.stories.length > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full border-2 border-white dark:border-gray-800 shadow-lg flex items-center justify-center"
                    >
                      <span className="text-white font-bold text-xs">{group.stories.length}</span>
                      {/* PULSE EFFECT */}
                      <div className="absolute inset-0 w-6 h-6 bg-red-400 rounded-full animate-ping opacity-75"></div>
                    </motion.div>
                  )}
                </div>

                {/* NOM DE L'UTILISATEUR */}
                <div className="mt-3 text-center">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[80px] mx-auto">
                    {group.username || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {group.stories.length} storie{group.stories.length > 1 ? 's' : ''}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* ÉTAT VIDE ULTRA-MODERNE */}
            {storyGroups.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-shrink-0 text-center py-8 px-6"
              >
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-full mx-auto flex items-center justify-center shadow-lg">
                    <Users className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  {/* Motifs décoratifs africains */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-1 -left-2 w-4 h-4 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                </div>

                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Aucun story disponible
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Soyez le premier à partager une story avec votre communauté !
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* STORY VIEWER */}
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
