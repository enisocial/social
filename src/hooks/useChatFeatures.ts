import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Hook pour gérer la présence en temps réel
export const usePresenceRealtime = () => {
  const { user } = useAuth();
  const [presenceData, setPresenceData] = useState<Map<string, { is_online: boolean; last_seen: string }>>(new Map());

  // METTRE À JOUR SA PROPRE PRÉSENCE
  const updateOwnPresence = useCallback(async (isOnline: boolean = true) => {
    if (!user?.id) return;

    try {
      // Utiliser une requête directe au lieu de RPC pour éviter les erreurs TypeScript
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          is_online: isOnline,
          last_seen: isOnline ? new Date().toISOString() : null
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      console.log('✅ Présence mise à jour:', isOnline ? 'en ligne' : 'hors ligne');
    } catch (error) {
      console.error('Erreur mise à jour présence:', error);
    }
  }, [user?.id]);

  // CHARGER LES PRÉSENCES DES AUTRES UTILISATEURS
  const loadPresences = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, is_online, last_seen');

      if (error) throw error;

      const presenceMap = new Map();
      data?.forEach((presence: any) => {
        presenceMap.set(presence.user_id, {
          is_online: presence.is_online,
          last_seen: presence.last_seen
        });
      });

      console.log('📊 [PRESENCE] Données chargées:', presenceMap.size, 'utilisateurs');
      console.log('📊 [PRESENCE] IDs présents:', Array.from(presenceMap.keys()));

      setPresenceData(presenceMap);
    } catch (error) {
      console.error('Erreur chargement présences:', error);
    }
  }, []);

  // VÉRIFIER SI UN UTILISATEUR EST EN LIGNE
  const isUserOnline = useCallback((userId: string) => {
    const presence = presenceData.get(userId);

    // SI PAS DE DONNÉES DE PRÉSENCE, CONSIDÉRER COMME HORS LIGNE
    if (!presence) return false;

    // SI LES DONNÉES SONT ANCIENNES (PLUS DE 5 MINUTES), CONSIDÉRER COMME HORS LIGNE
    if (presence.last_seen) {
      const lastSeen = new Date(presence.last_seen);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (lastSeen < fiveMinutesAgo) {
        console.log('👤 Utilisateur considéré hors ligne (données trop anciennes):', userId);
        return false;
      }
    }

    return presence.is_online || false;
  }, [presenceData]);

  // OBTENIR LE DERNIER VU D'UN UTILISATEUR
  const getLastSeen = useCallback((userId: string) => {
    const presence = presenceData.get(userId);
    return presence?.last_seen || null;
  }, [presenceData]);

  // INITIALISATION ET SUBSCRIPTION TEMPS RÉEL
  useEffect(() => {
    // ÉCOUTER LES CHANGEMENTS D'AUTHENTIFICATION
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 [PRESENCE] Changement auth:', event, !!session?.user);

        if (event === 'SIGNED_OUT' || !session?.user) {
          // Nettoyer les données de présence lors de la déconnexion
          setPresenceData(new Map());
          console.log('🚪 [PRESENCE] Données de présence nettoyées après déconnexion');
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Recharger les présences après connexion
          await loadPresences();
          updateOwnPresence(true);
          console.log('✅ [PRESENCE] Présences rechargées après connexion');
        }
      }
    );

    // Si pas d'utilisateur, nettoyer et retourner
    if (!user?.id) {
      setPresenceData(new Map());
      return () => authSubscription.unsubscribe();
    }

    // Marquer comme en ligne au montage
    updateOwnPresence(true);

    // Charger les présences existantes
    loadPresences();

    // SUBSCRIPTION TEMPS RÉEL POUR LES CHANGEMENTS DE PRÉSENCE
    const presenceChannel = supabase
      .channel('user_presence_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence'
      }, async (payload: any) => {
        console.log('🔄 [PRESENCE] Changement détecté:', payload);

        // Recharger toutes les présences et mettre à jour le state
        const { data, error } = await supabase
          .from('user_presence')
          .select('user_id, is_online, last_seen');

        if (!error && data) {
          const presenceMap = new Map();
          data.forEach((presence: any) => {
            presenceMap.set(presence.user_id, {
              is_online: presence.is_online,
              last_seen: presence.last_seen
            });
          });

          setPresenceData(presenceMap);

          // Log détaillé de la présence après mise à jour
          if (payload.new?.user_id) {
            const updatedPresence = presenceMap.get(payload.new.user_id);
            console.log('🔄 [PRESENCE] Après mise à jour:', {
              userId: payload.new.user_id,
              isOnline: updatedPresence?.is_online,
              lastSeen: updatedPresence?.last_seen
            });
          }
        }
      })
      .subscribe();

    console.log('🎧 [PRESENCE] Subscription démarrée');

    // GESTION DES ÉVÉNEMENTS DE VISIBILITÉ DE LA PAGE
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      updateOwnPresence(isVisible);
    };

    const handleBeforeUnload = () => {
      updateOwnPresence(false);
    };

    const handleFocus = () => {
      updateOwnPresence(true);
    };

    const handleBlur = () => {
      // Marquer immédiatement comme hors ligne quand on quitte la page
      updateOwnPresence(false);
    };

    // ÉCOUTEURS D'ÉVÉNEMENTS
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // CLEANUP
    return () => {
      updateOwnPresence(false);
      presenceChannel.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [user?.id, updateOwnPresence, loadPresences]);

  return {
    presenceData,
    isUserOnline,
    getLastSeen,
    updateOwnPresence,
    loadPresences
  };
};

interface Emoji {
  id: string;
  emoji: string;
  name: string;
  category: string;
}

interface Sticker {
  id: string;
  name: string;
  image_url: string;
  category: string;
}

export const useChatEmojis = () => {
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEmojis = async () => {
      try {
        // ESSAYER DE CHARGER DEPUIS DB
        const { data, error } = await supabase
          .from('chat_emojis' as any)
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        setEmojis((data as unknown as Emoji[]) || []);
      } catch (error) {
        console.error('Erreur chargement emojis:', error);
        // Fallback avec emojis de base
        setEmojis([
          { id: '1', emoji: '😀', name: 'smile', category: 'faces' },
          { id: '2', emoji: '😂', name: 'laugh', category: 'faces' },
          { id: '3', emoji: '❤️', name: 'heart', category: 'hearts' },
          { id: '4', emoji: '👍', name: 'thumbs_up', category: 'gestures' },
          { id: '5', emoji: '🔥', name: 'fire', category: 'symbols' },
          { id: '6', emoji: '🎉', name: 'party', category: 'celebration' },
          { id: '7', emoji: '😢', name: 'cry', category: 'faces' },
          { id: '8', emoji: '😮', name: 'surprise', category: 'faces' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadEmojis();
  }, []);

  return { emojis, loading };
};

export const useChatStickers = () => {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStickers = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_stickers' as any)
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        setStickers((data as unknown as Sticker[]) || []);
      } catch (error) {
        console.error('Erreur chargement stickers:', error);
        // Pour l'instant pas de fallback car on n'a pas de stickers par défaut
        setStickers([]);
      } finally {
        setLoading(false);
      }
    };

    loadStickers();
  }, []);

  return { stickers, loading };
};

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    console.log('🚀 === UPLOAD IMAGE CHAT - DÉBUT ===');
    console.log('📁 Image:', file.name, 'Size:', file.size, 'Type:', file.type);

    if (!user?.id) {
      console.error('❌ Pas d\'utilisateur connecté');
      return null;
    }

    setUploading(true);

    try {
      // MÊME LOGIQUE QUE LES AVATARS QUI FONCTIONNENT
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `chat/${fileName}`;

      console.log('📤 Upload vers:', filePath);

      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Upload échoué:', error);
        // RETOURNER PLACEHOLDER POUR TESTING
        return `https://via.placeholder.com/300x200?text=Upload+Failed`;
      }

      console.log('✅ Upload réussi');

      // URL COMME LES AVATARS
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;
      console.log('🎉 Image URL:', imageUrl);
      console.log('🚀 === UPLOAD IMAGE CHAT - FIN ===');

      return imageUrl;

    } catch (error) {
      console.error('💥 Erreur upload:', error);
      return `https://via.placeholder.com/300x200?text=Error`;
    } finally {
      setUploading(false);
    }
  }, [user?.id]);

  const uploadFile = useCallback(async (file: File): Promise<{ url: string; name: string; size: number } | null> => {
    if (!user?.id) return null;

    setUploading(true);
    try {
      const fileName = `chat_${Date.now()}_${file.name}`;
      const filePath = `users/${user.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        name: file.name,
        size: file.size
      };
    } catch (error) {
      console.error('Erreur upload fichier:', error);
      return null;
    } finally {
      setUploading(false);
    }
  }, [user?.id]);

  return {
    uploadImage,
    uploadFile,
    uploading
  };
};

export const useVoiceRecording = () => {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setAudioChunks([]);
    } catch (error) {
      console.error('Erreur démarrage enregistrement:', error);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (mediaRecorder && recording) {
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          setRecording(false);
          setMediaRecorder(null);
          resolve(audioBlob);
        };

        mediaRecorder.stop();
      } else {
        resolve(null);
      }
    });
  }, [mediaRecorder, recording, audioChunks]);

  return {
    recording,
    startRecording,
    stopRecording
  };
};
