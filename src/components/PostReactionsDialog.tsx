import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReactionType } from '@/hooks/usePostReactions';
import { getReactionEmoji } from './ReactionPicker';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface PostReactionsDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalCount: number;
}

interface ReactionWithProfile {
  id: string;
  reaction_type: ReactionType;
  created_at: string;
  profiles: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

export const PostReactionsDialog = ({ postId, open, onOpenChange, totalCount }: PostReactionsDialogProps) => {
  const { data: reactions, isLoading } = useQuery({
    queryKey: ['post-reactions-detail', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_reactions')
        .select(`
          id,
          reaction_type,
          created_at,
          profiles:user_id (
            id,
            name,
            username,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReactionWithProfile[];
    },
    enabled: open,
  });

  // Group reactions by type
  const reactionsByType = reactions?.reduce((acc, reaction) => {
    const type = reaction.reaction_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(reaction);
    return acc;
  }, {} as Record<ReactionType, ReactionWithProfile[]>) || {};

  const reactionTypes = Object.keys(reactionsByType) as ReactionType[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[600px]">
        <DialogHeader>
          <DialogTitle>Réactions ({totalCount})</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all" className="gap-1">
                Tous <span className="text-muted-foreground">{totalCount}</span>
              </TabsTrigger>
              {reactionTypes.map((type) => (
                <TabsTrigger key={type} value={type} className="gap-1">
                  {getReactionEmoji(type)}{' '}
                  <span className="text-muted-foreground">{reactionsByType[type].length}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-4 space-y-3 max-h-[400px] overflow-y-auto">
              {reactions?.map((reaction) => (
                <Link
                  key={reaction.id}
                  to={`/profile/${reaction.profiles.username}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => onOpenChange(false)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={reaction.profiles.avatar_url || ''} />
                    <AvatarFallback>{reaction.profiles.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{reaction.profiles.name}</p>
                    <p className="text-sm text-muted-foreground">@{reaction.profiles.username}</p>
                  </div>
                  <span className="text-2xl">{getReactionEmoji(reaction.reaction_type)}</span>
                </Link>
              ))}
            </TabsContent>

            {reactionTypes.map((type) => (
              <TabsContent
                key={type}
                value={type}
                className="mt-4 space-y-3 max-h-[400px] overflow-y-auto"
              >
                {reactionsByType[type].map((reaction) => (
                  <Link
                    key={reaction.id}
                    to={`/profile/${reaction.profiles.username}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                    onClick={() => onOpenChange(false)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reaction.profiles.avatar_url || ''} />
                      <AvatarFallback>{reaction.profiles.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{reaction.profiles.name}</p>
                      <p className="text-sm text-muted-foreground">@{reaction.profiles.username}</p>
                    </div>
                    <span className="text-2xl">{getReactionEmoji(type)}</span>
                  </Link>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
