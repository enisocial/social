import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Heart, ThumbsUp, Smile, Sparkles } from "lucide-react";
import { useLiveChat } from "@/hooks/useLiveChat";
import { motion, AnimatePresence } from "framer-motion";
import { triggerReaction } from "./FloatingReactions";

interface TikTokLiveChatOverlayProps {
  streamId: string;
  onReaction: (type: string) => void;
}

export const TikTokLiveChatOverlay = ({ streamId, onReaction }: TikTokLiveChatOverlayProps) => {
  const [message, setMessage] = useState("");
  const { messages, sendMessage } = useLiveChat(streamId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleMessages, setVisibleMessages] = useState<any[]>([]);

  useEffect(() => {
    // Keep only last 5 messages visible
    if (messages) {
      setVisibleMessages(messages.slice(-5));
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    await sendMessage.mutateAsync(message);
    setMessage("");
  };

  const handleReaction = (emoji: string, type: string) => {
    triggerReaction(emoji);
    onReaction(type);
  };

  return (
    <>
      {/* Messages Overlay - Bottom Left */}
      <div className="absolute bottom-32 left-4 right-4 md:right-auto md:w-80 max-h-[40vh] pointer-events-none">
        <div ref={scrollRef} className="space-y-2 overflow-hidden">
          <AnimatePresence>
            {visibleMessages?.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, x: -20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex gap-2 items-start bg-black/40 backdrop-blur-md p-2 rounded-lg pointer-events-auto"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={msg.profiles.avatar_url} />
                  <AvatarFallback>{msg.profiles.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs text-white leading-tight">
                    {msg.profiles.name}
                  </p>
                  <p className="text-sm text-white/90 break-words">{msg.message}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Reactions Bar - Right Side */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleReaction('❤️', 'love')}
          className="bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full h-12 w-12 border border-white/20"
        >
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleReaction('👍', 'like')}
          className="bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full h-12 w-12 border border-white/20"
        >
          <ThumbsUp className="w-6 h-6 text-blue-500 fill-blue-500" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleReaction('😮', 'wow')}
          className="bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full h-12 w-12 border border-white/20"
        >
          <Smile className="w-6 h-6 text-yellow-500" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleReaction('✨', 'clap')}
          className="bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full h-12 w-12 border border-white/20"
        >
          <Sparkles className="w-6 h-6 text-purple-500" />
        </Button>
      </div>

      {/* Message Input - Bottom */}
      <div className="absolute bottom-6 left-4 right-4 md:right-auto md:w-80">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="flex-1 bg-black/40 backdrop-blur-md border-white/20 text-white placeholder:text-white/60"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!message.trim()}
            className="bg-primary hover:bg-primary/90 rounded-full h-10 w-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </>
  );
};
