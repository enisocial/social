import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Plus, Loader2, Headphones, Heart, MessageCircle, TrendingUp, Users, Activity, Sparkles } from 'lucide-react';
import { useVoicePosts } from '@/hooks/useVoicePosts';
import { VoicePostCard } from '@/components/VoicePostCard';
import { CreateVoicePost } from '@/components/CreateVoicePost';
import { VoicePostComment } from '@/hooks/useVoicePosts';

const VoicePosts: React.FC = () => {
  const {
    voicePosts,
    loading,
    toggleLike,
    recordListen,
    getComments,
    addComment,
    deleteVoicePost
  } = useVoicePosts();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostComments, setSelectedPostComments] = useState<{[key: string]: VoicePostComment[]}>({});
  const [showComments, setShowComments] = useState<{[key: string]: boolean}>({});

  // Handle like action
  const handleLike = async (postId: string) => {
    await toggleLike(postId);
  };

  // Handle comment action
  const handleComment = async (postId: string) => {
    if (showComments[postId]) {
      // Hide comments
      setShowComments(prev => ({ ...prev, [postId]: false }));
    } else {
      // Show and load comments
      try {
        const comments = await getComments(postId);
        setSelectedPostComments(prev => ({ ...prev, [postId]: comments }));
        setShowComments(prev => ({ ...prev, [postId]: true }));
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    }
  };

  // Handle add comment
  const handleAddComment = async (postId: string, content: string) => {
    await addComment(postId, content);
    // Reload comments
    const comments = await getComments(postId);
    setSelectedPostComments(prev => ({ ...prev, [postId]: comments }));
  };

  // Handle share (fonctionnalité à implémenter)
  const handleShare = async (postId: string) => {
    // Fonctionnalité de partage à implémenter
  };

  // Handle delete
  const handleDelete = async (postId: string) => {
    await deleteVoicePost(postId);
  };

  // Handle record listen
  const handleRecordListen = async (postId: string, duration: number, completed: boolean) => {
    await recordListen(postId, duration, completed);
  };

  // Statistiques calculées
  const totalListens = voicePosts.reduce((sum, post) => sum + (post.listens_count || 0), 0);
  const totalLikes = voicePosts.reduce((sum, post) => sum + (post.likes_count || 0), 0);
  const totalComments = voicePosts.reduce((sum, post) => sum + (post.comments_count || 0), 0);

  // Loading state ultra-moderne
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-6">
            {/* Loader animé sophistiqué */}
            <div className="relative">
              <div className="w-20 h-20 border-4 border-purple-200 dark:border-purple-700 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.6s'}}></div>
              <div className="absolute inset-2 w-16 h-16 border-4 border-pink-200 dark:border-pink-700 rounded-full animate-spin" style={{animationDuration: '0.8s'}}></div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chargement des messages audio</h2>
              <p className="text-gray-600 dark:text-gray-400">Découvrez les voix de votre communauté...</p>
            </div>

            {/* Indicateur de progression animé */}
            <div className="w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section Premium */}
      <div className="relative overflow-hidden">
        {/* Fond animé subtil */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-pink-600/3 to-blue-600/5 animate-pulse"></div>

        <div className="relative container max-w-6xl mx-auto px-4 pt-8 pb-12">
          <div className="text-center space-y-6">
            {/* Titre principal avec icône animée */}
            <div className="flex items-center justify-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl animate-bounce">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                  Posts Vocaux
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 font-medium mt-2">
                  Découvrez les messages audio de votre communauté
                </p>
              </div>
            </div>

            {/* Statistiques premium */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/30 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Headphones className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalListens.toLocaleString()}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Écoutes totales</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/30 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalLikes.toLocaleString()}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Likes reçus</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/30 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalComments.toLocaleString()}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Commentaires</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/30 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{voicePosts.length.toLocaleString()}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Messages audio</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bouton CTA premium */}
            <div className="pt-4">
              <Button
                onClick={() => setShowCreateModal(true)}
                size="lg"
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white font-bold px-8 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 active:scale-95 transition-all duration-300 text-lg"
              >
                <Sparkles className="w-6 h-6 mr-3 animate-pulse" />
                Créer un message vocal
                <Plus className="w-5 h-5 ml-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Header Sticky Moderne */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages Audio</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{voicePosts.length} messages disponibles</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <Mic className="w-4 h-4 mr-2" />
                Nouveau
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid Moderne */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {voicePosts.length === 0 ? (
          /* État vide ultra-moderne */
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              {/* Illustration animée */}
              <div className="relative mb-8">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-3xl flex items-center justify-center shadow-2xl">
                  <Mic className="w-16 h-16 text-purple-600 dark:text-purple-400 animate-bounce" />
                </div>
                {/* Ondes animées autour */}
                <div className="absolute inset-0 -m-4">
                  <div className="w-full h-full border-4 border-purple-200 dark:border-purple-700 rounded-3xl animate-ping opacity-20"></div>
                </div>
                <div className="absolute inset-0 -m-8">
                  <div className="w-full h-full border-2 border-pink-200 dark:border-pink-700 rounded-3xl animate-pulse opacity-10" style={{animationDelay: '0.5s'}}></div>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Aucun message vocal encore
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed max-w-sm mx-auto">
                Soyez le premier à briser le silence ! Partagez un message vocal avec votre communauté et lancez la conversation.
              </p>

              <Button
                onClick={() => setShowCreateModal(true)}
                size="lg"
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white font-bold px-8 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <Mic className="w-6 h-6 mr-3" />
                Créer le premier message vocal
                <TrendingUp className="w-5 h-5 ml-3" />
              </Button>
            </div>
          </div>
        ) : (
          /* Grid des posts vocaux */
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {voicePosts.map((voicePost, index) => (
              <div
                key={voicePost.id}
                className="animate-fade-in"
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <VoicePostCard
                  voicePost={voicePost}
                  onLike={handleLike}
                  onComment={handleComment}
                  onShare={handleShare}
                  onDelete={handleDelete}
                  onRecordListen={handleRecordListen}
                />

                {/* Comments Section moderne (si visible) */}
                {showComments[voicePost.id] && (
                  <div className="mt-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-blue-600" />
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          Commentaires ({voicePost.comments_count})
                        </h4>
                      </div>

                      {/* Comments List moderne */}
                      <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 dark:scrollbar-thumb-purple-600 scrollbar-track-transparent">
                        {selectedPostComments[voicePost.id]?.map((comment) => (
                          <div key={comment.id} className="flex gap-3 p-3 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {comment.name[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white text-sm">{comment.name}</p>
                              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Comment moderne */}
                      <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Partagez votre pensée..."
                            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-medium transition-all duration-200"
                            onKeyPress={async (e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                await handleAddComment(voicePost.id, e.currentTarget.value.trim());
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                          <Button
                            onClick={async () => {
                              const input = document.querySelector(`input[placeholder="Partagez votre pensée..."]`) as HTMLInputElement;
                              if (input?.value.trim()) {
                                await handleAddComment(voicePost.id, input.value.trim());
                                input.value = '';
                              }
                            }}
                            className="px-6 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                          >
                            Publier
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Voice Post Modal */}
      {showCreateModal && (
        <CreateVoicePost
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            // Feed will auto-refresh via hook
          }}
        />
      )}
    </div>
  );
};

export default VoicePosts;
