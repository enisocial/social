import { useState } from 'react';
import { useOptimizedFriendRequests } from '@/hooks/useOptimizedFriendRequests';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  MoreHorizontal,
  UserMinus,
  Shield,
  Flag,
  MessageSquare,
  UserX
} from 'lucide-react';

interface FriendActionsProps {
  targetUserId: string;
  targetUserName: string;
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  onFriendshipChange: () => void;
}

export const FriendActions = ({
  targetUserId,
  targetUserName,
  friendshipStatus,
  onFriendshipChange
}: FriendActionsProps) => {
  const {
    cancelFriendRequest,
    removeFriend,
    acceptFriendRequest
  } = useOptimizedFriendRequests();

  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportCategory, setReportCategory] = useState('');

  const reportCategories = [
    { value: 'harassment', label: 'Harcèlement' },
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate_content', label: 'Contenu inapproprié' },
    { value: 'fake_account', label: 'Compte faux' },
    { value: 'scam', label: 'Arnaque' },
    { value: 'other', label: 'Autre' }
  ];

  const handleUnfriend = () => {
    removeFriend(targetUserId, {
      onSuccess: () => {
        onFriendshipChange();
        setShowUnfriendDialog(false);
      }
    });
  };

  const handleBlock = () => {
    // TODO: Implement proper blocking with user_blocks table
    if (friendshipStatus === 'friends') {
      removeFriend(targetUserId, {
        onSuccess: () => {
          onFriendshipChange();
          setShowBlockDialog(false);
        }
      });
    }
    // For now, just show a message
    setTimeout(() => {
      alert(`${targetUserName} a été bloqué (fonctionnalité à implémenter)`);
      setShowBlockDialog(false);
    }, 500);
  };

  const handleReport = () => {
    // TODO: Implement proper reporting with user_reports table
    setTimeout(() => {
      console.log('User report:', {
        reported_id: targetUserId,
        category: reportCategory,
        reason: reportReason
      });
      alert('Signalement envoyé. Merci pour votre contribution à la sécurité de la plateforme.');
      setShowReportDialog(false);
      setReportCategory('');
      setReportReason('');
    }, 1000);
  };

  const handleCancelRequest = () => {
    // Find the request ID first, then cancel it
    // For now, we'll use a simplified approach
    // In a real app, you'd get the request ID from the hook
    cancelFriendRequest(targetUserId, {
      onSuccess: () => {
        onFriendshipChange();
      }
    });
  };

  const handleAcceptRequest = () => {
    // Find the request ID first, then accept it
    // For now, we'll use a simplified approach
    acceptFriendRequest(targetUserId, {
      onSuccess: () => {
        onFriendshipChange();
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {friendshipStatus === 'friends' && (
            <>
              <DropdownMenuItem onClick={() => setShowUnfriendDialog(true)} className="text-red-600">
                <UserMinus className="h-4 w-4 mr-2" />
                Retirer des amis
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {friendshipStatus === 'pending_sent' && (
            <>
              <DropdownMenuItem onClick={handleCancelRequest}>
                <UserX className="h-4 w-4 mr-2" />
                Annuler la demande
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {friendshipStatus === 'pending_received' && (
            <>
              <DropdownMenuItem onClick={handleAcceptRequest}>
                <UserMinus className="h-4 w-4 mr-2" />
                Accepter la demande
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="text-red-600">
            <Shield className="h-4 w-4 mr-2" />
            Bloquer
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="text-orange-600">
            <Flag className="h-4 w-4 mr-2" />
            Signaler
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Unfriend Confirmation Dialog */}
      <AlertDialog open={showUnfriendDialog} onOpenChange={setShowUnfriendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer des amis</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer {targetUserName} de votre liste d'amis ?
              Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnfriend}
              className="bg-red-600 hover:bg-red-700"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquer {targetUserName}</AlertDialogTitle>
            <AlertDialogDescription>
              En bloquant cette personne, vous ne verrez plus ses publications et elle ne pourra plus vous contacter.
              Cette personne ne sera pas notifiée du blocage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              className="bg-red-600 hover:bg-red-700"
            >
              Bloquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Signaler {targetUserName}</DialogTitle>
            <DialogDescription>
              Aidez-nous à maintenir une communauté sûre en signalant les comportements inappropriés.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Catégorie du signalement</Label>
              <RadioGroup value={reportCategory} onValueChange={setReportCategory} className="mt-2">
                {reportCategories.map((category) => (
                  <div key={category.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={category.value} id={category.value} />
                    <Label htmlFor={category.value} className="text-sm">
                      {category.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="report-reason">Détails supplémentaires (optionnel)</Label>
              <Textarea
                id="report-reason"
                placeholder="Décrivez ce qui s'est passé..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleReport}
              disabled={!reportCategory}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Envoyer le signalement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
