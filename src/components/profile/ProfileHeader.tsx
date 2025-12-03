import { useState, useEffect, useRef } from 'react';
import { Camera, MessageSquare, UserPlus, UserMinus, Check, X, Loader2, Volume2, VolumeX } from 'lucide-react';
import { FriendActions } from './FriendActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CoverPhotoEditor } from '@/components/CoverPhotoEditor';
import { AvatarEditor } from '@/components/AvatarEditor';
import { useNavigate } from 'react-router-dom';
import { useMessenger as useMessengerContext } from '@/contexts/MessengerContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProfileHeaderProps {
  profile: any;
  friendsCount: number;
  isOwnProfile: boolean;
  friendshipStatus?: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  onProfileUpdate?: () => void;
}

export const ProfileHeader = ({ 
  profile, 
  friendsCount, 
  isOwnProfile, 
  friendshipStatus = 'none',
  onProfileUpdate 
}: ProfileHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sendFriendRequest, acceptFriendRequest, cancelFriendRequest } = useFriendRequests();
  const { openBubble } = useMessengerContext();

  const handleSendFriendRequest = async () => {
    if (!user) return;
    try {
      await sendFriendRequest(profile.id);
      toast.success('Demande d\'ami envoyée');
      onProfileUpdate?.();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la demande');
    }
  };

  const handleAcceptRequest = async () => {
    if (!user || !friendshipStatus) return;
    try {
      // Find the request ID
      const { data } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', profile.id)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .single();
      
      if (data) {
        await acceptFriendRequest(data.id);
        toast.success('Demande acceptée');
        onProfileUpdate?.();
      }
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleRemoveFriend = async () => {
    if (!confirm('Voulez-vous vraiment retirer cet ami ?')) return;
    
    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${user?.id})`)
        .eq('status', 'accepted');
      
      if (error) throw error;
      toast.success('Ami retiré');
      onProfileUpdate?.();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleCancelRequest = async () => {
    try {
      await cancelFriendRequest(profile.id);
      toast.success('Demande annulée');
      onProfileUpdate?.();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleOpenChat = async () => {
    if (!user) return;

    try {
      console.log('🗨️ Ouverture chat avec:', profile.name);

      // TROUVER OU CRÉER UNE CONVERSATION SIMPLE
      let conversationId = null;

      // 1. Chercher une conversation existante entre ces 2 utilisateurs
      const { data: existingParticipants } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(type)
        `)
        .eq('user_id', user.id)
        .eq('conversations.type', 'dm');

      if (existingParticipants && existingParticipants.length > 0) {
        // Vérifier chaque conversation pour voir si elle contient l'autre utilisateur
        for (const participant of existingParticipants) {
          const { data: otherParticipant } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', participant.conversation_id)
            .neq('user_id', user.id)
            .single();

          if (otherParticipant && otherParticipant.user_id === profile.id) {
            conversationId = participant.conversation_id;
            console.log('✅ Conversation existante trouvée:', conversationId);
            break;
          }
        }
      }

      // 2. Créer une nouvelle conversation si aucune n'existe
      if (!conversationId) {
        console.log('🆕 Création nouvelle conversation');

        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({ type: 'dm' })
          .select()
          .single();

        if (convError) {
          console.error('❌ Erreur création conversation:', convError);
          throw convError;
        }

        conversationId = newConv.id;
        console.log('✅ Nouvelle conversation créée:', conversationId);

        // Ajouter les participants
        const { error: participantsError } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: profile.id }
          ]);

        if (participantsError) {
          console.error('❌ Erreur ajout participants:', participantsError);
          throw participantsError;
        }

        console.log('✅ Participants ajoutés');
      }

      // Ouvrir le chat avec le vrai UUID
      console.log('🚀 Ouverture chat bubble avec ID:', conversationId);
      openBubble(conversationId, {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        avatar_url: profile.avatar_url
      });

    } catch (error) {
      console.error('💥 Erreur ouverture chat:', error);
      toast.error('Erreur lors de l\'ouverture du chat');
    }
  };

  // Vérifier le cache Redis pour les données de couverture (durée étendue à 30 minutes)
  const getCachedCoverData = () => {
    try {
      const cacheKey = `profile_cover_${profile.id}`;
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        const cacheAge = Date.now() - new Date(parsedCache.cached_at).getTime();
        const cacheMaxAge = 30 * 60 * 1000; // 30 minutes (au lieu de 5)

        if (cacheAge < cacheMaxAge) {
          console.log('✅ Cache Redis utilisé pour:', cacheKey, `(âge: ${Math.round(cacheAge/1000/60)}min)`);
          return parsedCache;
        } else {
          // Cache expiré, supprimer
          localStorage.removeItem(cacheKey);
          console.log('♻️ Cache expiré, supprimé pour:', cacheKey);
        }
      }
    } catch (error) {
      console.warn('⚠️ Erreur lecture cache Redis:', error);
    }
    return null;
  };

  // États pour gérer le chargement des vidéos
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [localVideoMuted, setLocalVideoMuted] = useState(true); // État local pour le contrôle du son par les visiteurs
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialiser l'état du son depuis localStorage
  useEffect(() => {
    const savedMuteState = localStorage.getItem(`profile_video_muted_${profile.id}`);
    if (savedMuteState !== null) {
      setLocalVideoMuted(JSON.parse(savedMuteState));
    }
  }, [profile.id]);

  // Fonction pour basculer le son de la vidéo
  const toggleVideoSound = () => {
    const newMutedState = !localVideoMuted;
    setLocalVideoMuted(newMutedState);

    // Sauvegarder la préférence dans localStorage
    localStorage.setItem(`profile_video_muted_${profile.id}`, JSON.stringify(newMutedState));

    // Appliquer immédiatement à la vidéo si elle existe
    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
    }

    toast.success(newMutedState ? '🔇 Son désactivé' : '🔊 Son activé');
  };

  // Utiliser les données mises en cache si disponibles
  const cachedCoverData = getCachedCoverData();
  const finalCoverUrl = cachedCoverData?.cover_photo_url || profile.cover_photo_url;
  const finalMediaType = cachedCoverData?.cover_media_type || profile.cover_media_type;
  const finalVideoMuted = cachedCoverData?.cover_video_muted ?? profile.cover_video_muted;

  // Préchargement intelligent de la vidéo
  useEffect(() => {
    if (finalCoverUrl && finalMediaType === 'video' && !cachedCoverData) {
      console.log('🚀 Préchargement intelligent activé pour:', profile.name);
      setVideoLoading(true);

      // Précharger la vidéo en arrière-plan
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = finalCoverUrl;
      video.muted = true;

      video.onloadeddata = () => {
        console.log('✅ Préchargement terminé pour:', profile.name);
        setVideoLoading(false);
      };

      video.onerror = () => {
        console.warn('⚠️ Erreur préchargement vidéo pour:', profile.name);
        setVideoLoading(false);
      };
    } else if (cachedCoverData) {
      // Si on a du cache, la vidéo est considérée comme chargée
      setVideoLoading(false);
      setVideoLoaded(true);
    } else {
      setVideoLoading(false);
    }
  }, [finalCoverUrl, finalMediaType, cachedCoverData, profile.name]);

  console.log('🎥 ProfileHeader - Audio settings:', {
    cover_video_muted: finalVideoMuted,
    cover_media_type: finalMediaType,
    isVideo: finalMediaType === 'video',
    shouldBeMuted: finalVideoMuted !== false,
    cached: !!cachedCoverData,
    loading: videoLoading,
    loaded: videoLoaded
  });

  // S'assurer que le profil a TOUTES les données critiques avant d'afficher
  if (!profile ||
      !profile.name ||
      !profile.username ||
      !profile.id ||
      typeof profile.name !== 'string' ||
      typeof profile.username !== 'string') {
    return (
      <Card className="overflow-hidden">
        <div className="relative h-[400px] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Cover Photo/Video */}
      <div className="relative h-[400px] bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {/* Skeleton Loader pour vidéos en cours de chargement */}
        {finalCoverUrl && finalMediaType === 'video' && videoLoading && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 animate-pulse flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-sm text-muted-foreground font-medium">
                Chargement de la vidéo...
              </div>
            </div>
          </div>
        )}

        {finalCoverUrl ? (
          finalMediaType === 'video' ? (
            <video
              ref={videoRef}
              src={finalCoverUrl}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                videoLoading ? 'opacity-0' : 'opacity-100'
              }`}
              autoPlay
              muted={localVideoMuted} // Utiliser l'état local du son contrôlé par l'utilisateur
              loop
              playsInline
              preload="metadata" // Charger seulement les métadonnées pour un démarrage plus rapide
              poster="" // Pas de poster pour éviter un chargement supplémentaire
              onLoadedData={(e) => {
                console.log('🎬 Vidéo chargée pour:', profile.name);
                console.log('   - URL:', finalCoverUrl);
                console.log('   - cover_video_muted:', finalVideoMuted);
                console.log('   - muted calculé:', finalVideoMuted === true);
                console.log('   - muted réel:', e.currentTarget.muted);
                console.log('   - cache utilisé:', !!cachedCoverData);
                console.log('   ⚡ Chargement ultra-rapide activé');
                setVideoLoading(false);
                setVideoLoaded(true);
              }}
              onLoadStart={() => {
                console.log('🚀 Début chargement vidéo pour:', profile.name);
              }}
              onCanPlay={() => {
                console.log('✅ Vidéo prête à jouer pour:', profile.name);
              }}
              onError={(e) => {
                console.error('❌ Erreur chargement vidéo couverture:', e);
                setVideoLoading(false);
                // Fallback vers image par défaut
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <img
              src={finalCoverUrl}
              alt="Couverture"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Erreur chargement image couverture:', e);
                // Fallback vers gradient
                e.currentTarget.style.display = 'none';
              }}
            />
          )
        ) : null}

        {/* Overlay gradient pour lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Contrôles en bas à droite */}
        <div className="absolute bottom-4 right-4 z-10 flex gap-2">
          {/* Bouton contrôle du son pour les vidéos */}
          {profile.cover_photo_url && profile.cover_media_type === 'video' && !videoLoading && (
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleVideoSound}
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
              title={localVideoMuted ? "Activer le son" : "Couper le son"}
            >
              {localVideoMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Bouton d'édition pour le propriétaire */}
          {isOwnProfile && (
            <CoverPhotoEditor
              currentCover={profile.cover_photo_url}
              userId={profile.id}
              onCoverUpdate={onProfileUpdate || (() => {})}
              currentMediaType={profile.cover_media_type}
            />
          )}
        </div>

        {/* Indicateur de type de média et audio */}
        {profile.cover_photo_url && profile.cover_media_type === 'video' && (
          <div className="absolute top-4 left-4 z-10 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>Vidéo</span>
            {!localVideoMuted && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-1" title="Avec son"></div>
            )}
            {localVideoMuted && (
              <div className="w-2 h-2 bg-gray-500 rounded-full ml-1" title="Muette"></div>
            )}
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="relative px-6 pb-4">
        <div className="flex flex-col md:flex-row gap-4 -mt-20 md:-mt-16">
          {/* Profile Picture */}
          <div className="relative">
            {isOwnProfile ? (
              <AvatarEditor
                currentAvatar={profile.avatar_url}
                userName={profile.name}
                userId={profile.id}
                onAvatarUpdate={onProfileUpdate || (() => {})}
              />
            ) : (
              <Avatar className="h-40 w-40 border-4 border-background">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="text-4xl">{profile.name?.[0]}</AvatarFallback>
              </Avatar>
            )}
          </div>

          {/* Name and Actions */}
          <div className="flex-1 mt-16 md:mt-20">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">{profile.name}</h1>
                <p className="text-muted-foreground">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-sm mt-2 max-w-2xl">{profile.bio}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {friendsCount} ami{friendsCount !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="flex gap-2">
                  {friendshipStatus === 'none' && (
                    <Button onClick={handleSendFriendRequest} className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Ajouter
                    </Button>
                  )}
                  {friendshipStatus === 'pending_sent' && (
                    <Button variant="secondary" onClick={handleCancelRequest} className="gap-2">
                      <X className="h-4 w-4" />
                      Annuler la demande
                    </Button>
                  )}
                  {friendshipStatus === 'pending_received' && (
                    <>
                      <Button onClick={handleAcceptRequest} className="gap-2">
                        <Check className="h-4 w-4" />
                        Accepter
                      </Button>
                      <Button variant="secondary" onClick={handleCancelRequest}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {friendshipStatus === 'friends' && (
                    <>
                      <Button variant="secondary" className="gap-2">
                        <Check className="h-4 w-4" />
                        Amis
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="gap-2"
                        onClick={handleOpenChat}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </Button>
                    </>
                  )}
                  <FriendActions
                    targetUserId={profile.id}
                    targetUserName={profile.name}
                    friendshipStatus={friendshipStatus}
                    onFriendshipChange={onProfileUpdate || (() => {})}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
