import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Minus, Send, Paperclip, Pin, MessageCircle, Wifi, WifiOff } from 'lucide-react';
import { useMessenger as useMessengerHook, Message } from '@/hooks/useMessenger';
import { useMessenger } from '@/contexts/MessengerContext';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { playNotificationSound } from '@/utils/notification-sound';
import { MessageReactions } from './MessageReactions';
import { MessageActions } from './MessageActions';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { debounce } from '@/utils/performance';
import { checkRateLimit } from '@/utils/rate-limit.utils';
import { OptimizedMediaWithCache } from '@/components/ui/OptimizedMediaWithCache';

interface ChatBubbleProps {
  conversationId: string;
  otherUser: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
  isMinimized: boolean;
  position: number;
}

export const ChatBubble = ({ conversationId, otherUser, isMinimized, position }: ChatBubbleProps) => {
  // ✅ Use messenger hook directly here
  const messenger = useMessengerHook(conversationId);
  const { messages, loading, sending, otherUserPresence, sendMessage, markAsRead, setTyping, editMessage, deleteMessage, pinMessage } = messenger;

  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);
  const chatBubbleRef = useRef<HTMLDivElement>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isSwipeClosing, setIsSwipeClosing] = useState(false);

  const { user } = useAuth();
  const { closeBubble } = useMessenger() || {};
  const isMobile = useIsMobile();

  // Fallback functions for missing context methods
  const safeToggleMinimize = useCallback((id: string) => {
    // Use FacebookMessenger manager
    const { toggleConversation } = require('./FacebookMessenger').useMessengerManager();
    toggleConversation(id, {});
  }, []);

  const safeClearUnread = useCallback((id: string) => {
    // Clear unread using instant messaging hook
    const { markConversationAsRead } = require('@/hooks/useInstantMessaging')();
    markConversationAsRead(id);
  }, []);

  // Optimized typing handler
  const debouncedSetTyping = useMemo(() => debounce((isTyping: boolean) => setTyping(isTyping), 500), [setTyping]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!scrollRef.current || isMinimized) return;

    if (messages.length > previousMessageCountRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        requestAnimationFrame(() => { viewport.scrollTop = viewport.scrollHeight; });
      }

      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.sender_id !== user?.id) {
        playNotificationSound();
      }
    }

    previousMessageCountRef.current = messages.length;
  }, [messages, isMinimized, user]);

  // Reset unread immediately when chat opens
  useEffect(() => {
    if (isMinimized) return;

    if (!loading && messages.length > 0) {
      const unreadMessages = messages.filter(m => m.sender_id !== user?.id && !m.read).map(m => m.id);
      if (unreadMessages.length > 0) {
        const timer = setTimeout(() => { markAsRead(unreadMessages); }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [conversationId, messages, loading, isMinimized, user, markAsRead]);

  // Send / Edit message handler
  const handleSendMessage = useCallback(async () => {
    console.log('🎯 [CHATBUBBLE] handleSendMessage called with:', {
      messageText,
      hasFile: !!selectedFile,
      sending
    });

    const textToSend = messageText.trim();

    // Vérification plus souple - permettre l'envoi si on a du texte OU un fichier
    if (!textToSend && !selectedFile) {
      console.log('🚫 [CHATBUBBLE] No content to send, returning');
      return;
    }
    if (sending) {
      console.log('⏳ [CHATBUBBLE] Already sending, returning');
      return;
    }

    if (editingMessage) {
      await editMessage(editingMessage.id, textToSend);
      setEditingMessage(null);
      setMessageText('');
      debouncedSetTyping(false);
      return;
    }

    let attachmentData;
    if (selectedFile) {
      if (!checkRateLimit('upload')) {
        toast.error('Limite d\'envoi de fichiers atteinte. Veuillez patienter.');
        return;
      }
      setUploading(true);
      try {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, selectedFile);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
        attachmentData = { url: publicUrl, type: selectedFile.type, name: selectedFile.name };
      } catch (error) {
        console.error('File upload error:', error);
        toast.error('Erreur lors de l\'envoi du fichier');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // Nettoyer l'état avant envoi
    const textToSendFinal = textToSend;
    const attachmentToSend = attachmentData;
    const replyToId = replyingTo?.id;

    setMessageText('');
    setSelectedFile(null);
    setReplyingTo(null);
    debouncedSetTyping(false);

    try {
      await sendMessage(textToSendFinal || `📎 ${selectedFile?.name}`, attachmentToSend, replyToId);
    } catch (err) {
      console.error('Erreur envoi message:', err);
      // Restaurer l'état en cas d'erreur
      setMessageText(textToSendFinal);
      if (selectedFile) setSelectedFile(selectedFile);
      if (replyToId) setReplyingTo(messages.find(m => m.id === replyToId) || null);
    }
  }, [messageText, selectedFile, sending, editingMessage, user, sendMessage, replyingTo, editMessage, debouncedSetTyping, messages, conversationId]);

  const handleTextChange = useCallback((value: string) => {
    setMessageText(value);
    debouncedSetTyping(value.trim() !== '');
  }, [debouncedSetTyping]);

  // Handle mobile keyboard
  useEffect(() => {
    if (!isMobile) return;
    const handleResize = () => {
      const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) setTimeout(() => { viewport.scrollTop = viewport.scrollHeight; }, 100);
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Mobile swipe to close functionality
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    setTouchStartY(e.touches[0].clientY);
    setTouchStartX(e.touches[0].clientX);
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || touchStartY === null || touchStartX === null) return;

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - touchStartY;
    const deltaX = Math.abs(currentX - touchStartX);

    // Only handle vertical swipes (down to close)
    if (deltaY > 50 && deltaX < 30) {
      setIsSwipeClosing(true);
    }
  }, [isMobile, touchStartY, touchStartX]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !isSwipeClosing) return;

    // Close the chat bubble on swipe down
    closeBubble?.(conversationId);
    setIsSwipeClosing(false);
    setTouchStartY(null);
    setTouchStartX(null);
  }, [isMobile, isSwipeClosing, closeBubble, conversationId]);

  const bubbleStyle = useMemo(() => isMobile ? {
    position: 'fixed' as const,
    inset: 0,
    width: '100%',
    height: '100dvh',
    maxHeight: '100dvh',
    borderRadius: 0,
    display: isMinimized ? 'none' : 'flex',
    flexDirection: 'column' as const,
    zIndex: 9999
  } : isMinimized ? {
    right: `${20 + position * 70}px`,
    bottom: '20px',
    width: '60px',
    height: 'auto'
  } : {
    right: `${20 + position * 360}px`,
    bottom: '20px',
    height: '500px',
    display: 'flex',
    flexDirection: 'column' as const
  }, [isMobile, isMinimized, position]);

  // Minimized button (desktop)
  if (isMinimized && !isMobile) {
    return (
      <button
        onClick={() => safeToggleMinimize(conversationId)}
        className="w-[60px] h-[60px] bg-card border-2 border-primary shadow-lg rounded-full overflow-hidden hover:scale-105 transition-transform fixed z-50"
        style={{ right: `${20 + position * 70}px`, bottom: '20px' }}
      >
        <div className="relative w-full h-full">
          <Avatar className="w-full h-full">
            <AvatarImage src={otherUser.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">{otherUser.name[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          {otherUserPresence.online && (
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-card rounded-full" />
          )}
          <div className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            <X className="h-3 w-3" onClick={e => { e.stopPropagation(); closeBubble(conversationId); }} />
          </div>
        </div>
      </button>
    );
  }

  // Main ChatBubble render - DESIGN AFRICAIN ULTRA VISIBLE
  return (
    <div
      ref={chatBubbleRef}
      className={`bg-gradient-to-br from-red-300 via-amber-300 to-yellow-300 dark:from-red-950 dark:via-amber-950 dark:to-yellow-950 border-8 border-red-500/80 dark:border-red-600/80 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-500 backdrop-blur-md ${
        isMobile ? 'w-full h-full rounded-none fixed inset-0 border-0' : 'w-[420px] rounded-3xl fixed border-red-600/60 dark:border-red-500/60'
      }`}
      style={{
        ...bubbleStyle,
        backgroundImage: `
          radial-gradient(circle at 15% 85%, rgba(239, 68, 68, 0.25) 0%, transparent 45%),
          radial-gradient(circle at 85% 15%, rgba(16, 185, 129, 0.25) 0%, transparent 45%),
          radial-gradient(circle at 70% 30%, rgba(245, 158, 11, 0.20) 0%, transparent 50%),
          radial-gradient(circle at 30% 70%, rgba(120, 53, 15, 0.20) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(31, 41, 55, 0.12) 0%, transparent 65%)
        `,
        boxShadow: `
          0 40px 70px -12px rgba(239, 68, 68, 0.35),
          0 25px 35px -5px rgba(16, 185, 129, 0.15),
          0 0 0 4px rgba(239, 68, 68, 0.4),
          inset 0 3px 0 rgba(255, 255, 255, 0.25),
          0 0 40px rgba(239, 68, 68, 0.20)
        `
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* BANDEAU AFRICAIN ULTRA VISIBLE */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-r from-red-600 via-amber-600 to-yellow-600 flex items-center justify-center">
        <span className="text-white font-bold text-xs tracking-wider">🇨🇮 DESIGN AFRICAIN AUTHENTIQUE 🇨🇮</span>
      </div>
      {/* HEADER AFRICAIN MODERNE */}
      <div className={`flex items-center justify-between border-b border-amber-200/30 dark:border-amber-800/30 bg-gradient-to-r from-emerald-600/10 via-amber-500/10 to-orange-600/10 backdrop-blur-md ${
        isMobile ? 'p-5 min-h-[72px]' : 'p-4'
      }`}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative">
            {/* Avatar avec design africain */}
            <div className={`relative ${isMobile ? 'w-12 h-12' : 'w-10 h-10'}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full opacity-20 animate-pulse"></div>
              <Avatar className={`w-full h-full border-3 border-white/80 dark:border-gray-800/80 shadow-lg ${isMobile ? 'w-12 h-12' : 'w-10 h-10'}`}>
                <AvatarImage src={otherUser.avatar_url || ''} alt={otherUser.name} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-lg shadow-inner">
                  {otherUser.name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Indicateur de statut africain */}
              {otherUserPresence.online && (
                <div className={`absolute -bottom-1 -right-1 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full border-3 border-white dark:border-gray-900 shadow-lg animate-pulse ${
                  isMobile ? 'w-5 h-5' : 'w-4 h-4'
                }`}>
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <Wifi className={`${isMobile ? 'w-2.5 h-2.5' : 'w-2 h-2'} text-emerald-600`} />
                  </div>
                </div>
              )}
              {!otherUserPresence.online && (
                <div className={`absolute -bottom-1 -right-1 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full border-3 border-white dark:border-gray-900 shadow-lg ${
                  isMobile ? 'w-5 h-5' : 'w-4 h-4'
                }`}>
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <WifiOff className={`${isMobile ? 'w-2.5 h-2.5' : 'w-2 h-2'} text-gray-600`} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-gray-800 dark:text-gray-100 truncate ${isMobile ? 'text-lg' : 'text-base'}`}>
              {otherUser.name}
            </p>
            <p className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-xs'} font-medium`}>
              {otherUserPresence.typing ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse flex items-center gap-1">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  Écrit...
                </span>
              ) : otherUserPresence.online ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  En ligne
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  Hors ligne
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-all duration-200 rounded-full"
              onClick={() => safeToggleMinimize(conversationId)}
            >
              <Minus className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-all duration-200 rounded-full"
            onClick={() => closeBubble(conversationId)}
          >
            <X className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-red-600 dark:text-red-400`} />
          </Button>
        </div>
      </div>

      {/* Messages & Input */}
      {!isMinimized && (
        <>
          {/* ZONE MESSAGES AVEC DESIGN AFRICAIN MODERNE */}
          <ScrollArea className="flex-1 overflow-y-auto overscroll-contain" ref={scrollRef}>
            <div className={`${isMobile ? 'p-5 space-y-4 pb-3' : 'p-4 space-y-3 pb-3'}`}>
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 space-y-3">
                  <div className="w-12 h-12 border-4 border-amber-200 dark:border-amber-800 border-t-emerald-500 rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Chargement des messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 space-y-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-900 dark:to-amber-900 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-center text-gray-600 dark:text-gray-400 font-medium">
                    Aucun message encore.<br />
                    <span className="text-sm text-gray-500 dark:text-gray-500">Commencez la conversation !</span>
                  </p>
                </div>
              ) : messages.map(message => {
                const isOwn = message.sender_id === user?.id;
                const replyToMessage = message.reply_to ? messages.find(m => m.id === message.reply_to) : null;
                return (
                  <div key={message.id} id={`msg-${message.id}`} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} w-full ${isMobile ? 'px-3' : 'px-2'}`}>
                    <div className={`group flex flex-col ${isOwn ? `max-w-[${isMobile ? '280' : '240'}px] items-end` : `max-w-[${isMobile ? '280' : '240'}px] items-start`}`}>

                      {/* MESSAGE DE RÉPONSE - DESIGN AFRICAIN */}
                      {replyToMessage && (
                        <div className={`mb-2 px-3 py-2 rounded-xl border-l-4 max-w-full shadow-sm ${
                          isOwn
                            ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 ml-4'
                            : 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 mr-4'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${isOwn ? 'bg-blue-400' : 'bg-amber-400'}`}></div>
                            <p className={`text-xs font-semibold ${isOwn ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'}`}>
                              Réponse à {replyToMessage.sender?.name}
                            </p>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-full">
                            {replyToMessage.content}
                          </p>
                        </div>
                      )}

                      {/* BULLE DE MESSAGE AVEC COULEURS AFRICAINES AUTHENTIQUES */}
                      <div className={`relative inline-block max-w-full shadow-xl transform transition-all duration-300 hover:scale-[1.02] ${
                        isOwn
                          ? 'bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white rounded-3xl rounded-br-lg border-2 border-red-500/30'
                          : 'bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 dark:from-amber-900 dark:via-yellow-950 dark:to-orange-900 text-gray-900 dark:text-gray-100 rounded-3xl rounded-bl-lg border-2 border-amber-300/60 dark:border-amber-600/60'
                      } ${isMobile ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm'}`}>
                        {/* MOTIF AFRICAIN SUBTIL */}
                        <div className={`absolute inset-0 rounded-3xl ${isOwn ? 'rounded-br-lg' : 'rounded-bl-lg'} opacity-5 ${
                          isOwn
                            ? 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500'
                            : 'bg-gradient-to-br from-red-400 via-red-500 to-red-600'
                        }`}></div>

                        {/* CONTENU DU MESSAGE */}
                        {message.attachment_url && (
                          <div className="mb-3">
                            {message.attachment_type?.startsWith('image/') ? (
                              <div className="relative group">
                                <OptimizedMediaWithCache
                                  src={message.attachment_url}
                                  alt={message.attachment_name || 'Image partagée'}
                                  type="image"
                                  aspectRatio="auto"
                                  quality="low"
                                  className={`rounded-2xl max-w-[${isMobile ? '200' : '160'}px] max-h-32 cursor-pointer shadow-md transition-transform duration-200 group-hover:scale-105`}
                                  onClick={() => window.open(message.attachment_url, '_blank')}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                              </div>
                            ) : message.attachment_type?.startsWith('video/') ? (
                              <OptimizedMediaWithCache
                                src={message.attachment_url}
                                alt={message.attachment_name || 'Vidéo partagée'}
                                type="video"
                                aspectRatio="video"
                                showControls={false}
                                muted={true}
                                autoPlay={false}
                                className={`rounded-2xl max-w-[${isMobile ? '200' : '160'}px] max-h-32 shadow-md`}
                              />
                            ) : (
                              <div className={`flex items-center gap-2 p-3 rounded-xl ${
                                isOwn ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-900/50'
                              }`}>
                                <Paperclip className={`w-4 h-4 ${isOwn ? 'text-blue-200' : 'text-amber-600'}`} />
                                <a
                                  href={message.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-sm underline truncate max-w-[${isMobile ? '150' : '120'}px] ${
                                    isOwn ? 'text-blue-100' : 'text-amber-700 dark:text-amber-300'
                                  }`}
                                >
                                  {message.attachment_name}
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TEXTE DU MESSAGE */}
                        <p className="break-words leading-relaxed font-medium">
                          {message.content}
                          {message.edited && (
                            <span className={`text-xs ml-2 opacity-70 italic ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>
                              (modifié)
                            </span>
                          )}
                        </p>

                        {/* TIMESTAMP ET ACTIONS */}
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <p className={`text-xs font-medium ${
                            isOwn ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: false,
                              locale: fr
                            })}
                          </p>
                          <MessageActions
                            messageId={message.id}
                            isOwnMessage={isOwn}
                            isPinned={!!message.pinned_at}
                            onReply={() => setReplyingTo(message)}
                            onEdit={() => { setEditingMessage(message); setMessageText(message.content); }}
                            onDelete={() => deleteMessage(message.id)}
                            onPin={() => pinMessage(message.id, !!message.pinned_at)}
                          />
                        </div>
                      </div>

                      {/* RÉACTIONS AVEC DESIGN AFRICAIN */}
                      <MessageReactions messageId={message.id} currentUserId={user?.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* ZONE INPUT AVEC DESIGN AFRICAIN MODERNE */}
          <div className={`border-t border-amber-200/30 dark:border-amber-800/30 bg-gradient-to-t from-emerald-50/50 to-amber-50/30 dark:from-emerald-950/20 dark:to-amber-950/10 backdrop-blur-sm flex-shrink-0 ${isMobile ? 'p-5 pb-safe-or-4' : 'p-4'}`}>

            {/* PRÉVISUALISATIONS AVEC DESIGN AFRICAIN */}
            {(replyingTo || editingMessage || selectedFile) && (
              <div className="max-h-24 overflow-y-auto mb-4 space-y-2">
                {replyingTo && (
                  <div className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                        Réponse à {replyingTo.sender?.name}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded-full"
                        onClick={() => setReplyingTo(null)}
                      >
                        <X className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      </Button>
                    </div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 truncate">
                      {replyingTo.content}
                    </p>
                  </div>
                )}

                {editingMessage && (
                  <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                        ✏️ Modification du message
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto hover:bg-amber-200/50 dark:hover:bg-amber-800/50 rounded-full"
                        onClick={() => { setEditingMessage(null); setMessageText(''); }}
                      >
                        <X className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      </Button>
                    </div>
                  </div>
                )}

                {selectedFile && (
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 border border-purple-200 dark:border-purple-800 rounded-2xl p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      {selectedFile.type.startsWith('image/') && (
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(selectedFile)}
                            alt="Aperçu"
                            className="w-10 h-10 object-cover rounded-xl border-2 border-white dark:border-gray-800 shadow-md"
                          />
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                            📷
                          </div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-purple-800 dark:text-purple-200 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          {(selectedFile.size / 1024 / 1024).toFixed(1)} MB • {selectedFile.type.split('/')[0]}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-purple-200/50 dark:hover:bg-purple-800/50 rounded-full"
                        onClick={() => setSelectedFile(null)}
                      >
                        <X className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BARRE D'INPUT AVEC DESIGN AFRICAIN */}
            <div className={`flex items-end ${isMobile ? 'gap-4' : 'gap-3'}`}>
              {/* BOUTON ATTACHMENT AVEC COULEURS AFRICAINES AUTHENTIQUES */}
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) setSelectedFile(file); }} />
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-2xl transition-all duration-200 active:scale-95 flex-shrink-0 ${
                  isMobile ? 'h-12 w-12' : 'h-10 w-10'
                } ${
                  uploading || sending
                    ? 'bg-gradient-to-br from-stone-400 to-stone-500 text-stone-300 cursor-not-allowed'
                    : 'bg-gradient-to-br from-amber-600 via-yellow-600 to-orange-600 hover:from-amber-700 hover:via-yellow-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl hover:scale-105 border-2 border-amber-500/30'
                }`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || sending}
              >
                <Paperclip className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} transition-transform duration-200 ${uploading || sending ? '' : 'group-hover:rotate-12'}`} />
              </Button>

              {/* ZONE DE SAISIE AVEC DESIGN AFRICAIN */}
              <div className="flex-1 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-100/50 via-orange-100/50 to-yellow-100/50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 rounded-3xl blur-sm"></div>
                <textarea
                  value={messageText}
                  onChange={e => handleTextChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Écrivez votre message..."
                  className={`relative w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-2 border-amber-200/60 dark:border-amber-800/60 rounded-3xl focus:outline-none focus:ring-4 focus:ring-emerald-400/30 focus:border-emerald-400 dark:focus:ring-emerald-600/30 dark:focus:border-emerald-600 resize-none shadow-lg transition-all duration-200 ${
                    isMobile ? 'px-5 py-4 text-base min-h-[52px] max-h-[140px]' : 'px-4 py-3 text-sm min-h-[40px] max-h-[100px]'
                  } ${uploading || sending ? 'opacity-60' : 'hover:shadow-xl'}`}
                  disabled={uploading || sending}
                  rows={1}
                  style={{
                    height: 'auto',
                    minHeight: isMobile ? '52px' : '40px'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, isMobile ? 140 : 100) + 'px';
                  }}
                />

                {/* EFFETS VISUELS AFRICAINS */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${messageText.trim() ? 'bg-emerald-400 animate-pulse' : 'bg-gray-300'}`}></div>
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${messageText.trim() ? 'bg-amber-400 animate-pulse' : 'bg-gray-300'}`} style={{ animationDelay: '100ms' }}></div>
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${messageText.trim() ? 'bg-teal-400 animate-pulse' : 'bg-gray-300'}`} style={{ animationDelay: '200ms' }}></div>
                </div>
              </div>

              {/* BOUTON ENVOI AVEC COULEURS AFRICAINES AUTHENTIQUES */}
              <Button
                size={isMobile ? "default" : "icon"}
                className={`rounded-3xl flex-shrink-0 transition-all duration-200 active:scale-95 shadow-lg border-2 ${
                  isMobile
                    ? 'h-14 px-8 bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white font-bold text-lg shadow-xl hover:shadow-2xl border-red-500/50'
                    : 'h-10 w-10 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl border-red-500/30'
                } ${
                  (!messageText.trim() && !selectedFile) || uploading || sending
                    ? 'opacity-50 cursor-not-allowed from-stone-500 to-stone-600 border-stone-400/30'
                    : 'hover:scale-110 animate-pulse'
                }`}
                onClick={handleSendMessage}
                disabled={(!messageText.trim() && !selectedFile) || uploading || sending}
              >
                {isMobile ? (
                  <div className="flex items-center gap-2">
                    <Send className="h-6 w-6 transition-transform duration-200 group-hover:translate-x-1" />
                    <span className="font-bold">ENVOYER</span>
                  </div>
                ) : (
                  <Send className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                )}
              </Button>
            </div>

            {/* INDICATEUR DE STATUT AFRICAIN */}
            <div className="flex items-center justify-center mt-3 gap-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                uploading
                  ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                  : sending
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : otherUserPresence.typing
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>
                {uploading && (
                  <>
                    <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Upload en cours...</span>
                  </>
                )}
                {sending && !uploading && (
                  <>
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Envoi en cours...</span>
                  </>
                )}
                {otherUserPresence.typing && !sending && !uploading && (
                  <>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>{otherUser.name} écrit...</span>
                  </>
                )}
                {!uploading && !sending && !otherUserPresence.typing && (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span>Prêt à envoyer</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
