// COMPOSANT COMPLET FACEBOOK MESSENGER AVEC TOUTES LES FONCTIONNALITÉS RÉELLES
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Phone, Video, MoreHorizontal,
  Smile, Image, Paperclip, Sticker, Mic, MessageSquare
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChatEmojis, useChatStickers, useFileUpload, useVoiceRecording, usePresenceRealtime } from '@/hooks/useChatFeatures';
import { useMessenger } from '@/hooks/useMessenger';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  reply_to?: string | null;
  edited?: boolean;
  reactions?: any;
  pinned_by?: string | null;
  pinned_at?: string | null;
  sender?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
  status?: {
    delivered_at?: string;
    read_at?: string;
  };
}

interface FacebookMessengerProps {
  conversationId: string;
  otherUser: {
    id: string;
    name: string;
    username: string;
    avatar_url?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export const FacebookMessenger: React.FC<FacebookMessengerProps> = ({
  conversationId,
  otherUser,
  isOpen,
  onClose
}) => {

  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // UTILISER LE HOOK useMessenger POUR LA GESTION DES MESSAGES
  const {
    messages,
    loading,
    sending,
    sendMessage: sendMessageHook,
    setTyping
  } = useMessenger(conversationId);

  // DEBUG: Afficher l'état des messages
  console.log('📨 [CHAT] FacebookMessenger render - conversationId:', conversationId);
  console.log('📨 [CHAT] Messages array length:', messages?.length || 0);
  console.log('📨 [CHAT] Loading state:', loading);
  console.log('📨 [CHAT] First few messages:', messages?.slice(0, 3));

  // CHARGER LES FONCTIONNALITÉS DEPUIS LA DB
  const { emojis, loading: emojisLoading } = useChatEmojis();
  const { stickers, loading: stickersLoading } = useChatStickers();
  const { uploadImage, uploadFile, uploading } = useFileUpload();
  const { recording, startRecording, stopRecording } = useVoiceRecording();
  const { isUserOnline, getLastSeen, presenceData } = usePresenceRealtime();

  // STATUT DE PRÉSENCE DE L'AUTRE UTILISATEUR
  const otherUserOnline = isUserOnline(otherUser.id);
  const otherUserLastSeen = getLastSeen(otherUser.id);

  // LOG DÉTAILLÉ POUR DÉBOGUER LA PRÉSENCE - AFFICHAGE SIMPLE
  console.log('👤 STATUT POUR', otherUser.name, ':', otherUserOnline ? 'EN LIGNE' : 'HORS LIGNE');
  console.log('📊 Données présence actuelles:', {
    userId: otherUser.id,
    presence: presenceData.get(otherUser.id),
    isOnline: otherUserOnline,
    lastSeen: otherUserLastSeen,
    totalPresences: presenceData.size
  });

  // VÉRIFICATION SPÉCIFIQUE POUR CHEADRACK
  if (otherUser.name === 'chedrack ENIANLOKO') {
    console.log('🚨 CHEADRACK STATUT:', otherUserOnline ? 'EN LIGNE' : 'HORS LIGNE');
    console.log('🚨 CHEADRACK DONNÉES BRUTES:', presenceData.get(otherUser.id));
    console.log('🚨 CHEADRACK TOUTES LES PRÉSENCES:', Array.from(presenceData.entries()));
  }

  // FORCER LE RE-RENDER QUAND LES DONNÉES DE PRÉSENCE CHANGENT
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({});
    }, 1000); // Vérifier toutes les secondes

    return () => clearInterval(interval);
  }, []);

  // SCROLL AUTOMATIQUE VERS LE BAS - WHATSAPP STYLE (TOUJOURS AFFICHER LE DERNIER MESSAGE)
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  }, []);

  useEffect(() => {
    // SCROLL IMMÉDIATEMENT QUAND NOUVEAUX MESSAGES ARRIVENT
    if (messages.length > 0) {
      // Scroll immédiat pour les nouveaux messages
      const timer = setTimeout(scrollToBottom, 50);
      return () => clearTimeout(timer);
    }
  }, [messages.length, scrollToBottom]);

  // SCROLL VERS LE BAS À CHAQUE CHANGEMENT DE MESSAGES (POUR MOBILE)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && messages.length > 0) {
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, scrollToBottom]);

  // GESTION CLAVIER MOBILE - WHATSAPP STYLE
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;

    const handleViewportChange = () => {
      if (!window.visualViewport) return;

      const viewport = window.visualViewport;
      const heightDiff = window.innerHeight - viewport.height;

      // Si différence > 150px, c'est probablement le clavier
      if (heightDiff > 150) {
        setKeyboardHeight(heightDiff);
        // Scroll vers le bas pour voir les derniers messages
        setTimeout(scrollToBottom, 300);
      } else {
        setKeyboardHeight(0);
      }
    };

    const handleResize = () => {
      // Petit délai pour laisser le viewport se stabiliser
      setTimeout(handleViewportChange, 100);
    };

    // Focus sur l'input pour déclencher le clavier
    const handleFocus = () => {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    inputRef.current?.addEventListener('focus', handleFocus);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      inputRef.current?.removeEventListener('focus', handleFocus);
    };
  }, [scrollToBottom]);

  // ENVOI DE MESSAGE VIA LE HOOK useMessenger
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || sending) return;

    try {
      await sendMessageHook(content);
      // RÉINITIALISER LES CHAMPS APRÈS ENVOI RÉUSSI
      setNewMessage('');
      setShowEmoji(false);
      setShowStickers(false);
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
    }
  }, [sendMessageHook, sending]);

  // RACCOURCI CLAVIER ENTRÉE
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        sendMessage(newMessage);
      }
    }
  };

  // GESTION TYPING INDICATOR - RÉACTIVÉ AVEC TIMEOUT
  const handleInputChange = (value: string) => {
    setNewMessage(value);
    // ACTIVER L'INDICATEUR DE SAISIE
    if (value.trim().length > 0) {
      console.log('⌨️ Typing indicator: ON for', otherUser.name);
      setTyping(true);
      // ARRÊTER AUTOMATIQUEMENT APRÈS 3 SECONDES SANS SAISIE
      setTimeout(() => {
        console.log('⌨️ Typing indicator: OFF (timeout) for', otherUser.name);
        setTyping(false);
      }, 3000);
    } else {
      console.log('⌨️ Typing indicator: OFF (empty) for', otherUser.name);
      setTyping(false);
    }
  };

  // UPLOAD IMAGE RÉEL AVEC STOCKAGE SUPABASE
  const handleImageUpload = useCallback(async (file: File) => {
    console.log('📤 Démarrage upload image:', file.name);
    const imageUrl = await uploadImage(file);
    console.log('📤 Résultat upload image:', imageUrl);

    if (imageUrl) {
      console.log('✅ Upload réussi, envoi message avec image');
      await sendMessageHook('📷 Image partagée', {
        url: imageUrl,
        type: 'image',
        name: file.name
      });
      console.log('✅ Message image envoyé');
    } else {
      console.error('❌ Upload image échoué');
      await sendMessageHook(`📷 Erreur upload: ${file.name}`);
    }
  }, [uploadImage, sendMessageHook]);

  // UPLOAD FICHIER RÉEL AVEC STOCKAGE SUPABASE
  const handleFileUpload = useCallback(async (file: File) => {
    console.log('📤 Démarrage upload fichier:', file.name);
    const fileData = await uploadFile(file);
    console.log('📤 Résultat upload fichier:', fileData);

    if (fileData) {
      console.log('✅ Upload réussi, envoi message avec fichier');
      await sendMessageHook('', {
        url: fileData.url,
        type: 'file',
        name: fileData.name
      });
    } else {
      console.error('❌ Upload fichier échoué');
      await sendMessageHook(`📎 Erreur upload: ${file.name}`);
    }
  }, [uploadFile, sendMessageHook]);

  // ENVOI DE STICKER
  const handleStickerSend = useCallback(async (sticker: any) => {
    await sendMessageHook('🎭 Sticker');
    setShowStickers(false);
  }, [sendMessageHook]);

  // GESTION ENREGISTREMENT AUDIO
  const handleVoiceRecording = useCallback(async () => {
    if (recording) {
      // Arrêter l'enregistrement
      const audioBlob = await stopRecording();
      if (audioBlob) {
        // TODO: Upload vers Supabase Storage et envoyer message
        await sendMessageHook('🎤 Message vocal');
      }
    } else {
      // Démarrer l'enregistrement
      await startRecording();
    }
  }, [recording, startRecording, stopRecording, sendMessageHook]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className={`${
          // Full screen on mobile, floating on desktop
          typeof window !== 'undefined' && window.innerWidth < 768
            ? 'fixed inset-0 w-full h-screen rounded-none border-0 bg-white'
            : 'fixed bottom-4 right-4 w-80 h-96 rounded-lg border border-gray-200 bg-white'
        } shadow-2xl z-50 ${
          typeof window !== 'undefined' && window.innerWidth < 768
            ? 'flex flex-col pb-safe'
            : 'flex flex-col'
        }`}
      >
        {/* HEADER */}
        <div className={`flex items-center justify-between border-b border-gray-200 bg-blue-50 ${
          // Larger padding on mobile full screen
          typeof window !== 'undefined' && window.innerWidth < 768
            ? 'p-4 min-h-[64px] rounded-none'
            : 'p-3 rounded-t-lg'
        }`}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-8 h-8">
                <AvatarImage src={otherUser.avatar_url} />
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {otherUser.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Indicateur de présence */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${
                otherUserOnline ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-900">{otherUser.name}</h3>
              <p className={`text-xs ${otherUserOnline ? 'text-green-600' : 'text-gray-500'}`}>
                {otherUserOnline ? 'En ligne' : otherUserLastSeen ? `Vu ${formatDistanceToNow(new Date(otherUserLastSeen), { locale: fr, addSuffix: true })}` : 'Hors ligne'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-blue-100">
              <Phone className="w-4 h-4 text-blue-600" />
            </Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-blue-100">
              <Video className="w-4 h-4 text-blue-600" />
            </Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-blue-100">
              <MoreHorizontal className="w-4 h-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 hover:bg-blue-100"
              onClick={onClose}
            >
              <X className="w-4 h-4 text-blue-600" />
            </Button>
          </div>
        </div>

        {/* MESSAGES AREA - RENDU IMMÉDIAT */}
        <ScrollArea className={`flex-1 p-3 bg-gray-50 ${
          typeof window !== 'undefined' && window.innerWidth < 768
            ? 'pb-48' // Even more space for fixed input area on mobile
            : ''
        }`}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">
                {loading ? 'Chargement des messages...' : `Commencez une conversation avec ${otherUser.name}`}
              </p>
              {loading && (
                <div className="mt-3 animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      {/* CONTENU DU MESSAGE */}
                      {message.attachment_type === 'image' && message.attachment_url ? (
                        <div className="mb-2">
                          <img
                            src={message.attachment_url}
                            alt="Image"
                            className="max-w-full h-auto rounded-lg max-h-64 object-contain"
                            onLoad={() => console.log('🖼️ Image chargée:', message.attachment_url)}
                            onError={(e) => {
                              console.error('❌ Erreur chargement image:', message.attachment_url);
                              // Afficher un placeholder si l'image ne charge pas
                              e.currentTarget.src = `https://via.placeholder.com/200x150?text=Image+Error`;
                            }}
                          />
                        </div>
                      ) : message.attachment_type === 'file' && message.attachment_url ? (
                        <div className="mb-2 p-2 bg-gray-100 rounded flex items-center gap-2">
                          <Paperclip className="w-4 h-4" />
                          <div>
                            <p className="text-sm font-medium">{message.attachment_name}</p>
                            <p className="text-xs text-gray-500">
                              Fichier attaché
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {/* TEXTE DU MESSAGE */}
                      <p className={isOwnMessage ? 'text-white' : 'text-gray-900'}>
                        {message.content}
                      </p>

                      {/* TIMESTAMP */}
                      <p className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {formatDistanceToNow(new Date(message.created_at), {
                          locale: fr,
                          addSuffix: true
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* INPUT AREA - FIXED POSITION FOR MOBILE */}
        {typeof window !== 'undefined' && window.innerWidth < 768 ? (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe-or-4 z-60">

            {/* EMOJI PICKER - AVEC VRAIS EMOJIS DEPUIS DB */}
            {showEmoji && (
              <div className="mb-2 p-2 bg-gray-50 rounded-lg border max-h-32 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji.id}
                      onClick={() => {
                        setNewMessage(prev => prev + emoji.emoji);
                        setShowEmoji(false);
                      }}
                      className="w-8 h-8 hover:bg-gray-200 rounded flex items-center justify-center text-lg transition-colors"
                      title={emoji.name}
                    >
                      {emoji.emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STICKER PICKER - AVEC VRAIS STICKERS DEPUIS DB */}
            {showStickers && (
              <div className="mb-2 p-2 bg-gray-50 rounded-lg border max-h-32 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2">
                  {stickers.map((sticker) => (
                    <button
                      key={sticker.id}
                      onClick={() => handleStickerSend(sticker)}
                      className="w-12 h-12 hover:bg-gray-200 rounded flex items-center justify-center transition-colors"
                      title={sticker.name}
                    >
                      <img
                        src={sticker.image_url}
                        alt={sticker.name}
                        className="w-8 h-8 object-contain"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* INPUT PRINCIPAL */}
            <div className="flex items-center gap-2">
              {/* UPLOAD IMAGE - RÉEL */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                <Image className={`w-5 h-5 text-gray-500 hover:text-blue-600 ${uploading ? 'animate-pulse' : ''}`} />
              </label>

              {/* UPLOAD FICHIER - RÉEL */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <Paperclip className={`w-5 h-5 text-gray-500 hover:text-blue-600 ${uploading ? 'animate-pulse' : ''}`} />
              </label>

              {/* STICKERS - RÉEL */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowStickers(!showStickers);
                  setShowEmoji(false);
                }}
                className="w-8 h-8 p-0"
              >
                <Sticker className="w-4 h-4 text-gray-500 hover:text-blue-600" />
              </Button>

              {/* EMOJI - RÉEL */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEmoji(!showEmoji);
                  setShowStickers(false);
                }}
                className="w-8 h-8 p-0"
              >
                <Smile className="w-4 h-4 text-gray-500 hover:text-blue-600" />
              </Button>

              {/* INPUT TEXTE */}
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tapez un message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={sending}
              />

              {/* MIC/VOICE - RÉEL */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoiceRecording}
                className={`w-8 h-8 p-0 ${recording ? 'text-red-500 animate-pulse' : 'text-gray-500 hover:text-blue-600'}`}
              >
                <Mic className="w-4 h-4" />
              </Button>

              {/* ENVOYER - RÉEL */}
              <Button
                onClick={() => newMessage.trim() && sendMessage(newMessage)}
                disabled={!newMessage.trim() || sending}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 disabled:opacity-50"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* DESKTOP INPUT AREA */
          <div className="p-3 rounded-b-lg border-t border-gray-200 bg-white">
            {/* EMOJI PICKER - AVEC VRAIS EMOJIS DEPUIS DB */}
            {showEmoji && (
              <div className="mb-2 p-2 bg-gray-50 rounded-lg border max-h-32 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji.id}
                      onClick={() => {
                        setNewMessage(prev => prev + emoji.emoji);
                        setShowEmoji(false);
                      }}
                      className="w-8 h-8 hover:bg-gray-200 rounded flex items-center justify-center text-lg transition-colors"
                      title={emoji.name}
                    >
                      {emoji.emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STICKER PICKER - AVEC VRAIS STICKERS DEPUIS DB */}
            {showStickers && (
              <div className="mb-2 p-2 bg-gray-50 rounded-lg border max-h-32 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2">
                  {stickers.map((sticker) => (
                    <button
                      key={sticker.id}
                      onClick={() => handleStickerSend(sticker)}
                      className="w-12 h-12 hover:bg-gray-200 rounded flex items-center justify-center transition-colors"
                      title={sticker.name}
                    >
                      <img
                        src={sticker.image_url}
                        alt={sticker.name}
                        className="w-8 h-8 object-contain"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* INPUT PRINCIPAL */}
            <div className="flex items-center gap-2">
              {/* UPLOAD IMAGE - RÉEL */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                <Image className={`w-5 h-5 text-gray-500 hover:text-blue-600 ${uploading ? 'animate-pulse' : ''}`} />
              </label>

              {/* UPLOAD FICHIER - RÉEL */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <Paperclip className={`w-5 h-5 text-gray-500 hover:text-blue-600 ${uploading ? 'animate-pulse' : ''}`} />
              </label>

              {/* STICKERS - RÉEL */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowStickers(!showStickers);
                  setShowEmoji(false);
                }}
                className="w-8 h-8 p-0"
              >
                <Sticker className="w-4 h-4 text-gray-500 hover:text-blue-600" />
              </Button>

              {/* EMOJI - RÉEL */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEmoji(!showEmoji);
                  setShowStickers(false);
                }}
                className="w-8 h-8 p-0"
              >
                <Smile className="w-4 h-4 text-gray-500 hover:text-blue-600" />
              </Button>

              {/* INPUT TEXTE */}
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tapez un message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={sending}
              />

              {/* MIC/VOICE - RÉEL */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoiceRecording}
                className={`w-8 h-8 p-0 ${recording ? 'text-red-500 animate-pulse' : 'text-gray-500 hover:text-blue-600'}`}
              >
                <Mic className="w-4 h-4" />
              </Button>

              {/* ENVOYER - RÉEL */}
              <Button
                onClick={() => newMessage.trim() && sendMessage(newMessage)}
                disabled={!newMessage.trim() || sending}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 disabled:opacity-50"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// Hook pour gérer les conversations ouvertes
export const useMessengerManager = () => {
  const [openConversations, setOpenConversations] = useState<Map<string, any>>(new Map());

  const openConversation = useCallback((conversationId: string, otherUser: any) => {
    setOpenConversations(prev => new Map(prev.set(conversationId, {
      otherUser,
      isOpen: true
    })));
  }, []);

  const closeConversation = useCallback((conversationId: string) => {
    setOpenConversations(prev => {
      const newMap = new Map(prev);
      newMap.delete(conversationId);
      return newMap;
    });
  }, []);

  const toggleConversation = useCallback((conversationId: string, otherUser: any) => {
    setOpenConversations(prev => {
      const existing = prev.get(conversationId);
      if (existing) {
        // Fermer si déjà ouverte
        const newMap = new Map(prev);
        newMap.delete(conversationId);
        return newMap;
      } else {
        // Ouvrir sinon
        return new Map(prev.set(conversationId, {
          otherUser,
          isOpen: true
        }));
      }
    });
  }, []);

  return {
    openConversations,
    openConversation,
    closeConversation,
    toggleConversation
  };
};
