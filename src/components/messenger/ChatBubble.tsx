import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Minus, Send, Paperclip, Pin } from 'lucide-react';
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

  const { user } = useAuth();
  const { closeBubble, toggleMinimize, clearUnread } = useMessenger();
  const isMobile = useIsMobile();

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
    clearUnread(conversationId);

    if (!loading && messages.length > 0) {
      const unreadMessages = messages.filter(m => m.sender_id !== user?.id && !m.read).map(m => m.id);
      if (unreadMessages.length > 0) {
        const timer = setTimeout(() => { markAsRead(unreadMessages); }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [conversationId, messages, loading, isMinimized, user, clearUnread, markAsRead]);

  // Send / Edit message handler
  const handleSendMessage = useCallback(async () => {
    const textToSend = messageText.trim();
    if ((!textToSend && !selectedFile) || sending) return;

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

    setMessageText('');
    setSelectedFile(null);
    setReplyingTo(null);
    debouncedSetTyping(false);

    try {
      await sendMessage(textToSend || `📎 ${selectedFile?.name}`, attachmentData, replyingTo?.id);
    } catch (err) {
      setMessageText(textToSend);
      if (selectedFile) setSelectedFile(selectedFile);
    }
  }, [messageText, selectedFile, sending, editingMessage, user, sendMessage, replyingTo, editMessage, debouncedSetTyping]);

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

  const bubbleStyle = useMemo(() => isMobile ? {
    position: 'fixed' as const,
    inset: 0,
    width: '100%',
    height: '100dvh',
    maxHeight: '100dvh',
    borderRadius: 0,
    display: isMinimized ? 'none' : 'flex',
    flexDirection: 'column' as const
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
        onClick={() => toggleMinimize(conversationId)}
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

  // Main ChatBubble render
  return (
    <div className={`bg-card border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200 ${
      isMobile ? 'w-full h-full rounded-none fixed inset-0 border-0' : 'w-[340px] rounded-xl fixed border-border'
    }`} style={bubbleStyle}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-border bg-gradient-to-r from-accent/30 to-accent/50 backdrop-blur-sm ${
        isMobile ? 'p-4 min-h-[64px]' : 'p-3'
      }`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative">
            <Avatar className={isMobile ? "w-10 h-10 border-2 border-primary/30" : "w-8 h-8 border-2 border-primary/20"}>
              <AvatarImage src={otherUser.avatar_url || ''} alt={otherUser.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{otherUser.name[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            {otherUserPresence.online && (
              <div className={`absolute bottom-0 right-0 bg-green-500 rounded-full border-2 border-card ${
                isMobile ? 'w-3.5 h-3.5' : 'w-3 h-3'
              }`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-foreground truncate ${isMobile ? 'text-base' : 'text-sm'}`}>{otherUser.name}</p>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-xs'}`}>
              {otherUserPresence.typing ? <span className="text-primary font-medium animate-pulse">En train d'écrire...</span>
              : otherUserPresence.online ? <span className="text-green-600 dark:text-green-400 font-medium">En ligne</span>
              : 'Hors ligne'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isMobile && <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/60 transition-colors" onClick={() => toggleMinimize(conversationId)}><Minus className="h-4 w-4" /></Button>}
          <Button variant="ghost" size="icon" className={`hover:bg-destructive/10 hover:text-destructive transition-colors ${isMobile ? 'h-9 w-9' : 'h-8 w-8'}`} onClick={() => closeBubble(conversationId)}><X className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} /></Button>
        </div>
      </div>

      {/* Messages & Input */}
      {!isMinimized && (
        <>
          <ScrollArea className="flex-1 overflow-y-auto overscroll-contain" ref={scrollRef}>
            <div className={isMobile ? 'p-4 space-y-4 pb-2' : 'p-3 space-y-2 pb-2'}>
              {loading ? <div className="flex items-center justify-center h-40"><p className="text-sm text-muted-foreground">Chargement...</p></div>
              : messages.length === 0 ? <div className="flex items-center justify-center h-40"><p className="text-sm text-muted-foreground">Aucun message</p></div>
              : messages.map(message => {
                const isOwn = message.sender_id === user?.id;
                const replyToMessage = message.reply_to ? messages.find(m => m.id === message.reply_to) : null;
                return (
                  <div key={message.id} id={`msg-${message.id}`} className={`flex ${isOwn ? 'justify-end pr-2' : 'justify-start pl-2'} w-full`}>
                    <div className={`group flex flex-col ${isOwn ? 'max-w-[220px] items-end' : 'max-w-[240px] items-start'}`}>
                      {replyToMessage && <div className={`text-xs mb-1 pl-2 border-l-2 ${isOwn ? 'border-primary' : 'border-accent'} opacity-70 max-w-full`}><p className="truncate">↩ {replyToMessage.content}</p></div>}
                      <div className={`rounded-2xl px-2.5 py-1.5 inline-block max-w-full ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>
                        {message.attachment_url && <div className="mb-1">
                          {message.attachment_type?.startsWith('image/') ? <img src={message.attachment_url} alt={message.attachment_name || ''} className="rounded max-w-[140px] h-auto max-h-24 object-cover cursor-pointer block" onClick={() => window.open(message.attachment_url, '_blank')} />
                          : message.attachment_type?.startsWith('video/') ? <video src={message.attachment_url} controls className="rounded max-w-[140px] max-h-24 block" />
                          : <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs underline flex items-center gap-1"><Paperclip className="h-3 w-3 flex-shrink-0" /><span className="truncate max-w-[100px]">{message.attachment_name}</span></a>}
                        </div>}
                        <p className="text-sm break-words">{message.content}{message.edited && <span className="text-xs opacity-50 ml-1">(modifié)</span>}</p>
                        <div className="flex items-center justify-between mt-1 gap-2">
                          <div className="flex items-center gap-1">
                            <p className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: fr })}</p>
                          </div>
                          <MessageActions messageId={message.id} isOwnMessage={isOwn} isPinned={!!message.pinned_at} onReply={() => setReplyingTo(message)} onEdit={() => { setEditingMessage(message); setMessageText(message.content); }} onDelete={() => deleteMessage(message.id)} onPin={() => pinMessage(message.id, !!message.pinned_at)} />
                        </div>
                      </div>
                      <MessageReactions messageId={message.id} currentUserId={user?.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className={`border-t border-border bg-card flex-shrink-0 ${isMobile ? 'p-3 pb-safe' : 'p-2'}`}>
            {/* Preview for reply/edit/file */}
            {(replyingTo || editingMessage || selectedFile) && <div className={`max-h-20 overflow-y-auto ${isMobile ? 'mb-3' : 'mb-2'}`}>
              {replyingTo && <div className="mb-1 p-1.5 bg-accent rounded text-xs flex items-center gap-2"><div className="flex-1 min-w-0"><p className="font-medium truncate text-[10px]">↩ {replyingTo.sender?.name}</p><p className="truncate opacity-70">{replyingTo.content}</p></div><Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={() => setReplyingTo(null)}><X className="h-3 w-3" /></Button></div>}
              {editingMessage && <div className="mb-1 p-1.5 bg-accent rounded text-xs flex items-center gap-2"><p className="flex-1 font-medium truncate text-[10px]">✏️ Modifier</p><Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={() => { setEditingMessage(null); setMessageText(''); }}><X className="h-3 w-3" /></Button></div>}
              {selectedFile && <div className="mb-1 p-1 bg-accent rounded flex items-center gap-1.5">{selectedFile.type.startsWith('image/') && <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="h-8 w-8 object-cover rounded flex-shrink-0" />}<span className="text-[10px] truncate flex-1 max-w-[150px]">{selectedFile.name}</span><Button variant="ghost" size="icon" className="h-4 w-4 flex-shrink-0" onClick={() => setSelectedFile(null)}><X className="h-2.5 w-2.5" /></Button></div>}
            </div>}
            <div className={`flex ${isMobile ? 'gap-3' : 'gap-1.5'}`}>
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) setSelectedFile(file); }} />
              <Button variant="ghost" size="icon" className={isMobile ? 'h-10 w-10 flex-shrink-0' : 'h-8 w-8 flex-shrink-0'} onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}><Paperclip className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} /></Button>
              <input type="text" value={messageText} onChange={e => handleTextChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Aa" className={`flex-1 bg-background border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary ${isMobile ? 'px-4 py-3 text-base' : 'px-3 py-1.5 text-sm'}`} disabled={uploading || sending} />
              <Button size="icon" className={`rounded-full flex-shrink-0 ${isMobile ? 'h-10 w-10' : 'h-8 w-8'}`} onClick={handleSendMessage} disabled={(!messageText.trim() && !selectedFile) || uploading || sending}><Send className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} /></Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
