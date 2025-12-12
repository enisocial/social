import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Users, X, Check } from "lucide-react";
import { useLiveDuo } from "@/hooks/useLiveDuo";
import { useAuth } from "@/hooks/useAuth";

interface DuoInviteNotificationProps {
  streamId: string;
}

export const DuoInviteNotification = ({ streamId }: DuoInviteNotificationProps) => {
  const { user } = useAuth();
  const { duoInvitation, respondToDuo } = useLiveDuo(streamId);

  // Only show if user is the guest and invitation is pending
  if (!duoInvitation || duoInvitation.guest_id !== user?.id || duoInvitation.status !== 'pending') {
    return null;
  }

  const handleAccept = () => {
    respondToDuo.mutate({ invitationId: duoInvitation.id, accept: true });
  };

  const handleDecline = () => {
    respondToDuo.mutate({ invitationId: duoInvitation.id, accept: false });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="absolute top-20 left-4 right-4 z-30"
      >
        <Card className="bg-gradient-to-r from-blue-500 to-purple-500 border-0 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={duoInvitation.host.avatar_url} />
                  <AvatarFallback>{duoInvitation.host.name[0]}</AvatarFallback>
                </Avatar>
                <p className="text-white font-bold text-sm">{duoInvitation.host.name}</p>
              </div>
              <p className="text-white/90 text-xs">vous invite en Live Duo</p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={respondToDuo.isPending}
                className="bg-white text-green-600 hover:bg-white/90 rounded-full h-10 w-10 p-0"
              >
                <Check className="w-5 h-5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDecline}
                disabled={respondToDuo.isPending}
                className="text-white hover:bg-white/20 rounded-full h-10 w-10 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
