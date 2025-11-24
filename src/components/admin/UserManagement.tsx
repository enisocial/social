import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Ban, UserX, Trash2, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserModeration } from '@/hooks/useUserModeration';

interface User {
  id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  status?: string;
  ban_reason?: string | null;
  ban_until?: string | null;
}

interface UserManagementProps {
  users: User[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onPromoteToAdmin: (userId: string) => void;
  onPromoteToModerator?: (userId: string) => void;
  onDelete: (userId: string) => void;
  onRefresh: () => void;
}

export const UserManagement = ({ 
  users, 
  searchQuery, 
  onSearchChange, 
  onPromoteToAdmin,
  onPromoteToModerator,
  onDelete,
  onRefresh 
}: UserManagementProps) => {
  const { banUser, unbanUser, suspendUser } = useUserModeration();
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<string>('permanent');
  const [customDays, setCustomDays] = useState('7');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBanClick = (user: User) => {
    setSelectedUser(user);
    setBanDialogOpen(true);
  };

  const handleBanSubmit = async () => {
    if (!selectedUser || !banReason.trim()) return;

    const days = banDuration === 'permanent' ? undefined : 
                 banDuration === 'custom' ? parseInt(customDays) : parseInt(banDuration);

    const success = await banUser(selectedUser.id, banReason, days);
    if (success) {
      setBanDialogOpen(false);
      setBanReason('');
      setSelectedUser(null);
      onRefresh();
    }
  };

  const handleUnban = async (userId: string) => {
    const success = await unbanUser(userId);
    if (success) onRefresh();
  };

  const handleSuspend = async (user: User) => {
    const success = await suspendUser(user.id, 'Violation des règles', 7);
    if (success) onRefresh();
  };

  const getStatusBadge = (user: User) => {
    if (user.status === 'banned') {
      return <Badge variant="destructive">Banni</Badge>;
    }
    if (user.status === 'suspended') {
      return <Badge variant="outline">Suspendu</Badge>;
    }
    return <Badge variant="secondary">Actif</Badge>;
  };

  return (
    <>
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des utilisateurs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatar_url || ''} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{user.name}</p>
                    {getStatusBadge(user)}
                  </div>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                  <p className="text-xs text-muted-foreground">
                    Membre depuis {formatDistanceToNow(new Date(user.created_at), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </p>
                  {user.ban_reason && (
                    <p className="text-xs text-red-500 mt-1">
                      Raison: {user.ban_reason}
                      {user.ban_until && ` (jusqu'au ${new Date(user.ban_until).toLocaleDateString()})`}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                {user.status === 'banned' ? (
                  <Button
                    onClick={() => handleUnban(user.id)}
                    variant="outline"
                    size="sm"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Débannir
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => onPromoteToAdmin(user.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                    {onPromoteToModerator && (
                      <Button
                        onClick={() => onPromoteToModerator(user.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Modérateur
                      </Button>
                    )}
                    <Button
                      onClick={() => handleSuspend(user)}
                      variant="outline"
                      size="sm"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Suspendre
                    </Button>
                    <Button
                      onClick={() => handleBanClick(user)}
                      variant="destructive"
                      size="sm"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Bannir
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => onDelete(user.id)}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bannir l'utilisateur</DialogTitle>
            <DialogDescription>
              Bannir {selectedUser?.name}. Cette action peut être annulée ultérieurement.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Durée du bannissement</label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 jour</SelectItem>
                  <SelectItem value="7">7 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {banDuration === 'custom' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Nombre de jours</label>
                <Input
                  type="number"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  min="1"
                  max="365"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Raison du bannissement *</label>
              <Textarea
                placeholder="Expliquez la raison du bannissement..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBanSubmit}
              disabled={!banReason.trim()}
            >
              Bannir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
