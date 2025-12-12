import React from 'react';
import { EnhancedPostCard } from '@/components/post/EnhancedPostCard';
import { VoicePostPreview } from '@/components/VoicePostPreview';

interface UnifiedFeedCardProps {
  item: any;
  onDelete?: () => void;
  onView?: (itemId: string, itemType: 'post' | 'voice_post') => void;
  onClick?: (itemId: string, itemType: 'post' | 'voice_post') => void;
  onTimeSpent?: (itemId: string, seconds: number, itemType: 'post' | 'voice_post') => void;
  onReaction?: (itemId: string, itemType: 'post' | 'voice_post') => void;
  onLike?: (itemId: string, itemType: 'post' | 'voice_post') => void;
  onComment?: (itemId: string, itemType: 'post' | 'voice_post') => void;
  onShare?: (itemId: string, itemType: 'post' | 'voice_post') => void;
  onListen?: (itemId: string, duration: number, completed: boolean, itemType: 'post' | 'voice_post') => void;
  priority?: boolean;
}

export const UnifiedFeedCard: React.FC<UnifiedFeedCardProps> = ({
  item,
  onDelete,
  onView,
  onClick,
  onTimeSpent,
  onReaction,
  onLike,
  onComment,
  onShare,
  onListen,
  priority = false
}) => {
  console.log('🎯 UnifiedFeedCard rendering item:', {
    id: item.id,
    type: item.type,
    content: item.content?.substring(0, 50),
    created_at: item.created_at
  });

  // Gestion des posts classiques
  if (item.type === 'post') {
    console.log('📝 Rendering POST item:', item.id);
    return (
      <EnhancedPostCard
        post={item}
        onDelete={onDelete}
        onView={(postId) => onView?.(postId, 'post')}
        onClick={(postId) => onClick?.(postId, 'post')}
        onTimeSpent={(postId, seconds) => onTimeSpent?.(postId, seconds, 'post')}
        onReaction={(postId) => onReaction?.(postId, 'post')}
        priority={priority}
      />
    );
  }

  // Gestion des posts vocaux
  if (item.type === 'voice_post') {
    console.log('🎵 Rendering VOICE POST item:', item.id, {
      audio_url: item.audio_url,
      duration: item.audio_duration
    });
    return (
      <VoicePostPreview
        id={item.id}
        title={item.title}
        audio_url={item.audio_url || item.media_url}
        audio_duration={item.audio_duration || 0}
        waveform_data={item.waveform_data}
        user_id={item.user_id}
        username={item.username}
        name={item.name}
        avatar_url={item.avatar_url}
        likes_count={item.likes_count || 0}
        comments_count={item.comments_count || 0}
        listens_count={item.listens_count || 0}
        user_liked={item.user_liked || false}
        user_listened={item.user_listened || false}
        created_at={item.created_at}
        onLike={(id) => onLike?.(id, 'voice_post')}
        onComment={(id) => onComment?.(id, 'voice_post')}
        onShare={(id) => onShare?.(id, 'voice_post')}
        onListen={(id, duration, completed) => onListen?.(id, duration, completed, 'voice_post')}
      />
    );
  }

  // Fallback pour les types inconnus
  console.log('❓ Unknown item type:', item.type, item.id);
  return null;
};
