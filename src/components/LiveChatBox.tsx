import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { useLiveChat } from "@/hooks/useLiveChat";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface LiveChatBoxProps {
  streamId: string;
}

export const LiveChatBox = ({ streamId }: LiveChatBoxProps) => {
  const [message, setMessage] = useState("");
  const { messages, sendMessage } = useLiveChat(streamId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    await sendMessage.mutateAsync(message);
    setMessage("");
  };

  return (
    <div className="flex flex-col h-full bg-card border rounded-lg">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Chat en direct</h3>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages?.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={msg.profiles.avatar_url} />
                <AvatarFallback>{msg.profiles.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{msg.profiles.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                  </span>
                </div>
                <p className="text-sm">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
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
            placeholder="Écrire un message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!message.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
