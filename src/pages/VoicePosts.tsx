import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Plus, Loader2 } from 'lucide-react';
import { useVoicePosts } from '@/hooks/useVoicePosts';
import { VoicePostCard } from '@/components/VoicePostCard';
import { CreateVoicePost } from '@/components/CreateVoicePost';
import { VoicePostComment } from '@/hooks/useVoicePosts';

const VoicePosts: React.FC = () => {
  console.log('🎤 VoicePosts component rendering...');

  const {
    voicePosts,
    loading,
    toggleLike,
    recordListen,
    getComments,
    addComment,
    deleteVoicePost
  } = useVoicePosts();

  console.log('VoicePosts hook data:', { voicePosts: voicePosts?.length, loading });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostComments, setSelectedPostComments] = useState<{[key: string]: VoicePostComment[]}>({});
  const [showComments, setShowComments] = useState<{[key: string]: boolean}>({});

  // Handle like action
  const handleLike = async (postId: string) => {
    console.log('Like clicked for post:', postId);
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

  // Handle share (placeholder)
  const handleShare = async (postId: string) => {
    // TODO: Implement share functionality
    console.log('Share post:', postId);
  };

  // Handle delete
  const handleDelete = async (postId: string) => {
    await deleteVoicePost(postId);
  };

  // Handle record listen
  const handleRecordListen = async (postId: string, duration: number, completed: boolean) => {
    await recordListen(postId, duration, completed);
  };

  // Debug loading state
  if (loading) {
    console.log('VoicePosts: Showing loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Chargement des posts vocaux...</p>
        </div>
      </div>
    );
  }

  console.log('VoicePosts: Rendering main content');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Posts Vocaux</h1>
              <p className="text-muted-foreground">Découvrez les messages audio de votre communauté</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="lg"
              className="rounded-full"
            >
              <Mic className="w-5 h-5 mr-2" />
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {voicePosts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Mic className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">Aucun post vocal</CardTitle>
              <p className="text-muted-foreground mb-6">
                Soyez le premier à partager un message vocal avec votre communauté !
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Mic className="w-4 h-4 mr-2" />
                Créer votre premier post vocal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {voicePosts.map((voicePost) => (
              <div key={voicePost.id}>
                <VoicePostCard
                  voicePost={voicePost}
                  onLike={handleLike}
                  onComment={handleComment}
                  onShare={handleShare}
                  onDelete={handleDelete}
                  onRecordListen={handleRecordListen}
                />

                {/* Comments Section */}
                {showComments[voicePost.id] && (
                  <Card className="mt-2 ml-8">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">
                          Commentaires ({voicePost.comments_count})
                        </h4>

                        {/* Comments List */}
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {selectedPostComments[voicePost.id]?.map((comment) => (
                            <div key={comment.id} className="flex items-start space-x-2 text-sm">
                              <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs">
                                {comment.name[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <span className="font-medium">{comment.name}</span>
                                <p className="text-muted-foreground">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Comment */}
                        <div className="flex space-x-2 pt-2 border-t">
                          <input
                            type="text"
                            placeholder="Écrivez un commentaire..."
                            className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            onKeyPress={async (e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                await handleAddComment(voicePost.id, e.currentTarget.value.trim());
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
