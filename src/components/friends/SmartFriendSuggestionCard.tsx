import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, MapPin, Sparkles, MoreHorizontal, UserPlus, X, Eye, Clock, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SmartFriendSuggestion } from '@/hooks/useSmartFriendSuggestions';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface SmartFriendSuggestionCardProps {
  suggestion: SmartFriendSuggestion;
  onHide: (userId: string) => void;
  variant?: 'compact' | 'full';
}

export function SmartFriendSuggestionCard({ 
  suggestion, 
  onHide,
  variant = 'full' 
}: SmartFriendSuggestionCardProps) {
  const { user } = useAuth();
  const { sendFriendRequest, getFriendshipStatus } = useFriendRequests(user?.id);
  const [localStatus, setLocalStatus] = useState<'none' | 'pending' | 'sent'>('none');

  // Check current friendship status
  const currentStatus = getFriendshipStatus(suggestion.id);
  
  useEffect(() => {
    if (currentStatus === 'pending_sent') {
      setLocalStatus('sent');
    } else if (currentStatus === 'friends') {
      setLocalStatus('sent'); // Hide the button if already friends
    } else {
      setLocalStatus('none');
    }
  }, [currentStatus]);

  const handleAddFriend = async () => {
    if (!user?.id) {
      toast.error('Vous devez être connecté');
      return;
    }

    console.log('[SmartSuggestion] Sending friend request to:', suggestion.id);
    setLocalStatus('pending');

    try {
      const success = await sendFriendRequest(suggestion.id);
      if (success) {
        setLocalStatus('sent');
        toast.success(`Demande envoyée à ${suggestion.name}`);
      } else {
        setLocalStatus('none');
      }
    } catch (error) {
      console.error('[SmartSuggestion] Error:', error);
      setLocalStatus('none');
      toast.error('Erreur lors de l\'envoi de la demande');
    }
  };

  const getLocationText = () => {
    if (suggestion.city) return suggestion.city;
    if (suggestion.region) return suggestion.region;
    if (suggestion.country) return suggestion.country;
    return null;
  };

  const location = getLocationText();

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
      >
        <Link to={`/profile/${suggestion.username}`}>
          <Avatar className="w-12 h-12 border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
            <AvatarImage src={suggestion.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {suggestion.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <Link to={`/profile/${suggestion.username}`}>
            <p className="font-medium text-sm hover:text-primary transition-colors cursor-pointer truncate">
              {suggestion.name}
            </p>
          </Link>
          
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {suggestion.mutual_friends_count > 0 && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Users className="w-3 h-3" />
                {suggestion.mutual_friends_count} ami{suggestion.mutual_friends_count > 1 ? 's' : ''}
              </Badge>
            )}
            {suggestion.same_location && location && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {location}
              </Badge>
            )}
            {suggestion.is_new_user && (
              <Badge variant="default" className="text-xs flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Nouveau
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button 
            size="sm" 
            onClick={handleAddFriend} 
            className="gap-1"
            disabled={localStatus !== 'none'}
          >
            {localStatus === 'pending' && <Clock className="w-4 h-4 animate-spin" />}
            {localStatus === 'sent' && <Check className="w-4 h-4" />}
            {localStatus === 'none' && <UserPlus className="w-4 h-4" />}
            {localStatus === 'none' ? 'Ajouter' : 'Envoyée'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onHide(suggestion.id)}>
                <X className="w-4 h-4 mr-2" />
                Masquer
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/profile/${suggestion.username}`}>
                  <Eye className="w-4 h-4 mr-2" />
                  Voir le profil
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
        <div className="relative">
          {/* Cover/Background gradient */}
          <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
          
          {/* Avatar */}
          <Link to={`/profile/${suggestion.username}`}>
            <Avatar className="absolute top-12 left-1/2 -translate-x-1/2 w-20 h-20 border-4 border-card hover:border-primary/40 transition-colors cursor-pointer">
              <AvatarImage src={suggestion.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {suggestion.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>

        <div className="p-4 pt-12 space-y-3">
          {/* Name and badges */}
          <div className="text-center space-y-2">
            <Link to={`/profile/${suggestion.username}`}>
              <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer">
                {suggestion.name}
              </h3>
            </Link>
            
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {suggestion.mutual_friends_count > 0 && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {suggestion.mutual_friends_count} ami{suggestion.mutual_friends_count > 1 ? 's' : ''} en commun
                </Badge>
              )}
              {suggestion.is_new_user && (
                <Badge variant="default" className="text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Nouveau
                </Badge>
              )}
            </div>

            {suggestion.same_location && location && (
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{location}</span>
              </div>
            )}
          </div>

          {/* Bio preview */}
          {suggestion.bio && (
            <p className="text-xs text-muted-foreground text-center line-clamp-2">
              {suggestion.bio}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={handleAddFriend} 
              className="flex-1 gap-2"
              disabled={localStatus !== 'none'}
            >
              {localStatus === 'pending' && <Clock className="w-4 h-4 animate-spin" />}
              {localStatus === 'sent' && <Check className="w-4 h-4" />}
              {localStatus === 'none' && <UserPlus className="w-4 h-4" />}
              {localStatus === 'none' ? 'Ajouter' : 'Demande envoyée'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onHide(suggestion.id)}>
                  <X className="w-4 h-4 mr-2" />
                  Masquer cette suggestion
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/profile/${suggestion.username}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    Voir le profil
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
