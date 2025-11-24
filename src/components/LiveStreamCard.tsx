import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Video, Share2 } from "lucide-react";
import { LiveStream } from "@/hooks/useLiveStreams";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ShareDialog } from "./ShareDialog";

interface LiveStreamCardProps {
  stream: LiveStream;
}

export const LiveStreamCard = ({ stream }: LiveStreamCardProps) => {
  const navigate = useNavigate();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => navigate(`/live/${stream.id}`)}
      >
        <CardContent className="p-0">
          <div className="relative aspect-video bg-muted">
            {stream.thumbnail_url ? (
              <img 
                src={stream.thumbnail_url} 
                alt={stream.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            {stream.status === 'live' && (
              <Badge className="absolute top-2 left-2 bg-destructive">
                🔴 EN DIRECT
              </Badge>
            )}
          </div>
          
          <div className="p-4">
            <div className="flex gap-3">
              <Avatar>
                <AvatarImage src={stream.profiles.avatar_url} />
                <AvatarFallback>{stream.profiles.name[0]}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{stream.title}</h3>
                <p className="text-sm text-muted-foreground">{stream.profiles.name}</p>
                {stream.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {stream.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  {stream.status === 'live' && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      <span>{stream.viewer_count} spectateurs</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareDialogOpen(true);
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Partager
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        contentType="live"
        contentId={stream.id}
        contentData={{
          title: stream.title,
          content: stream.description,
          user_name: stream.profiles.name,
        }}
      />
    </>
  );
};
