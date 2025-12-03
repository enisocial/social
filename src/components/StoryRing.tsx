import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryGroup } from '@/hooks/useStories';
import { Crown, Star, Flame, Zap, Sparkles, Heart, Eye, Clock } from 'lucide-react';

interface StoryRingProps {
  storyGroup?: StoryGroup;
  isAddStory?: boolean;
  onClick: () => void;
}

export const StoryRing = ({ storyGroup, isAddStory, onClick }: StoryRingProps) => {
  if (isAddStory) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        className="flex flex-col items-center gap-3 cursor-pointer group"
        onClick={onClick}
      >
        <div className="relative">
          {/* Multiple animated rings */}
          <div className="absolute inset-0 rounded-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400/30 via-purple-400/30 to-pink-400/30 blur-sm"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute inset-1 rounded-full bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-indigo-400/30 blur-sm"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 rounded-full bg-gradient-to-r from-pink-400/30 via-indigo-400/30 to-purple-400/30 blur-sm"
            />
          </div>

          {/* Main ring */}
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[3px] shadow-2xl">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center relative overflow-hidden">
              {/* Animated particles inside */}
              <div className="absolute inset-0">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      y: [0, -15, 0],
                      opacity: [0, 0.8, 0],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.4,
                      ease: "easeInOut"
                    }}
                    className="absolute w-1.5 h-1.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full"
                    style={{
                      left: `${15 + i * 10}%`,
                      top: '70%'
                    }}
                  />
                ))}
              </div>

              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="relative z-10"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Premium badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-full border-2 border-white dark:border-slate-800 shadow-xl flex items-center justify-center"
          >
            <Crown className="w-3.5 h-3.5 text-white" />
          </motion.div>
        </div>

        <div className="text-center">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Créer</p>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-1 w-6 h-1 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full mx-auto"
          />
        </div>
      </motion.div>
    );
  }

  if (!storyGroup) return null;

  const hasUnviewedStories = storyGroup.stories.some(story => !story.hasViewed);
  const isActive = storyGroup.stories.some(story => new Date(story.expires_at) > new Date());

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 200 }}
      className="flex flex-col items-center gap-3 cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative">
        {/* Ultra-modern animated rings */}
        <AnimatePresence>
          {hasUnviewedStories && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 rounded-3xl"
            >
              {/* Primary animated ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-3xl bg-gradient-to-r from-indigo-500/40 via-purple-500/40 to-pink-500/40 blur-sm"
              />

              {/* Secondary ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-1 rounded-3xl bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-indigo-500/30 blur-sm"
              />

              {/* Tertiary ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-3xl bg-gradient-to-r from-pink-500/20 via-indigo-500/20 to-purple-500/20 blur-sm"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main container */}
        <div className="relative w-24 h-24 rounded-3xl overflow-hidden shadow-2xl transform transition-all duration-300 group-hover:shadow-3xl">
          {/* Gradient border */}
          <div className={`absolute inset-0 rounded-3xl p-[3px] ${
            hasUnviewedStories
              ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
              : 'bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500'
          }`}>
            <div className="w-full h-full rounded-[22px] bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 relative overflow-hidden">
              {/* Animated background for viewed stories */}
              {!hasUnviewedStories && (
                <motion.div
                  animate={{
                    backgroundPosition: ["0% 0%", "100% 100%"],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "linear"
                  }}
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: "linear-gradient(45deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 50%, rgba(236, 72, 153, 0.1) 100%)",
                    backgroundSize: "200% 200%"
                  }}
                />
              )}

              {/* Avatar */}
              <div className="relative w-full h-full flex items-center justify-center p-1">
                <Avatar className="w-full h-full rounded-2xl border-2 border-white/50 dark:border-slate-700/50 shadow-lg">
                  <AvatarImage src={storyGroup.avatar_url || ''} className="object-cover" />
                  <AvatarFallback className={`bg-gradient-to-br ${
                    hasUnviewedStories
                      ? 'from-indigo-500 to-purple-500 text-white'
                      : 'from-slate-400 to-slate-500 text-slate-800 dark:text-slate-200'
                  } font-bold text-lg`}>
                    {storyGroup.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Status indicators overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Activity indicator */}
              {isActive && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute top-1 right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-slate-800 shadow-lg"
                />
              )}
            </div>
          </div>
        </div>

        {/* Advanced status badges */}
        <AnimatePresence>
          {storyGroup.stories.length > 0 && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -180 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 rounded-full border-3 border-white dark:border-slate-800 shadow-xl flex items-center justify-center"
            >
              <span className="text-white font-bold text-xs">{storyGroup.stories.length}</span>

              {/* Pulsing effect for unviewed stories */}
              {hasUnviewedStories && (
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-red-400/40"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium indicators */}
        {storyGroup.stories.length > 3 && (
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1 left-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full border-2 border-white dark:border-slate-800 shadow-lg flex items-center justify-center"
          >
            <Star className="w-2.5 h-2.5 text-white fill-white" />
          </motion.div>
        )}

        {/* Activity flame */}
        {isActive && hasUnviewedStories && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute top-0 right-0 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full border border-white dark:border-slate-800 shadow-lg flex items-center justify-center"
          >
            <Flame className="w-2 h-2 text-white" />
          </motion.div>
        )}

        {/* Hover engagement preview */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          whileHover={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap"
        >
          <div className="flex items-center gap-2">
            <Eye className="w-3 h-3" />
            <span>{storyGroup.stories.length} storie{storyGroup.stories.length > 1 ? 's' : ''}</span>
            {hasUnviewedStories && (
              <>
                <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400">Non vue{storyGroup.stories.filter(s => !s.hasViewed).length > 1 ? 's' : ''}</span>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Enhanced user info */}
      <motion.div
        animate={{ y: [0, -1, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="text-center"
      >
        <p className={`text-sm font-bold truncate max-w-[100px] mx-auto transition-colors ${
          hasUnviewedStories
            ? 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
            : 'text-slate-600 dark:text-slate-400'
        }`}>
          {storyGroup.name}
        </p>

        <div className="flex items-center justify-center gap-1 mt-1">
          {hasUnviewedStories ? (
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
  );
};
