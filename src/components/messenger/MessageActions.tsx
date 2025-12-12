import { Button } from '@/components/ui/button';
import { MoreVertical, Reply, Edit, Trash2, Pin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageActionsProps {
  messageId: string;
  isOwnMessage: boolean;
  isPinned: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
}

export const MessageActions = ({
  isOwnMessage,
  isPinned,
  onReply,
  onEdit,
  onDelete,
  onPin
}: MessageActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onReply}>
          <Reply className="h-4 w-4 mr-2" />
          Répondre
        </DropdownMenuItem>
        {isOwnMessage && (
          <>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={onPin}>
          <Pin className="h-4 w-4 mr-2" />
          {isPinned ? 'Désépingler' : 'Épingler'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
