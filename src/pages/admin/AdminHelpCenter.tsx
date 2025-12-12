import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminNavbar } from '@/components/AdminNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  HelpCircle,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Send,
  User as UserIcon,
  Calendar,
  Filter,
  Search,
  Eye,
  Reply,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useAdmin } from '@/hooks/useAdmin';
import type { User } from '@supabase/supabase-js';

interface SupportMessage {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category: string;
  admin_response?: string;
  admin_response_at?: string;
  responded_by?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
    username: string;
    email?: string;
  };
}

export default function AdminHelpCenter() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useRole();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  const [responseText, setResponseText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Use same logic as AdminDashboardNew
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      } finally {
        setUserLoading(false);
      }
    };
    getCurrentUser();
  }, []);

  const isSystemAdmin = currentUser?.email === 'admin@binkaa.com';
  const hasAccess = isAdmin || isSystemAdmin;

  useEffect(() => {
    if (!roleLoading && !userLoading && !hasAccess) {
      console.log('AdminHelpCenter: Access denied');
      navigate('/');
    } else if (!roleLoading && !userLoading && hasAccess) {
      fetchMessages();
    }
  }, [roleLoading, userLoading, hasAccess, navigate]);

  if (roleLoading || userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground font-medium">Chargement du centre d'aide...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Accès refusé</h1>
            <p className="text-muted-foreground mt-2">Vous n'avez pas les permissions nécessaires.</p>
          </div>
        </main>
      </div>
    );
  }

  const fetchMessages = async () => {
    try {
      setLoading(true);

      console.log('Loading real support messages from database...');

      // Fetch support messages with user profiles
      const { data: supportMessages, error } = await (supabase as any)
        .from('support_messages')
        .select(`
          id,
          user_id,
          subject,
          message,
          status,
          priority,
          category,
          admin_response,
          admin_response_at,
          responded_by,
          created_at,
          updated_at,
          profiles:user_id (
            name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching support messages:', error);
        setMessages([]);
        // Don't show error toast to avoid annoying notifications - just log to console
        return;
      }

      console.log('Loaded support messages:', supportMessages?.length || 0);
      setMessages(supportMessages || []);

    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  const updateMessageStatus = async (messageId: string, status: string, response?: string) => {
    try {
      const updateData: any = { status };
      if (response) {
        updateData.admin_response = response;
        updateData.admin_response_at = new Date().toISOString();
        updateData.responded_by = currentUser?.id;
      }

      const { error } = await (supabase as any)
        .from('support_messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) throw error;

      await fetchMessages();
      toast.success('Message mis à jour avec succès');
      setSelectedMessage(null);
      setResponseText('');
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">En attente</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">En cours</Badge>;
      case 'resolved':
        return <Badge variant="default" className="bg-green-500">Résolu</Badge>;
      case 'closed':
        return <Badge variant="outline">Fermé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" className="bg-red-600">Urgent</Badge>;
      case 'high':
        return <Badge variant="destructive">Élevé</Badge>;
      case 'normal':
        return <Badge variant="secondary">Normal</Badge>;
      case 'low':
        return <Badge variant="outline">Faible</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesStatus = statusFilter === 'all' || message.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || message.priority === priorityFilter;
    const matchesSearch = searchTerm === '' ||
      message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.profiles?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.profiles?.username.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  const stats = {
    total: messages.length,
    pending: messages.filter(m => m.status === 'pending').length,
    inProgress: messages.filter(m => m.status === 'in_progress').length,
    resolved: messages.filter(m => m.status === 'resolved').length,
    urgent: messages.filter(m => m.priority === 'urgent').length
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground font-medium ml-4">Chargement du centre d'aide...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Accès refusé</h1>
            <p className="text-muted-foreground mt-2">Vous n'avez pas les permissions nécessaires.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin-dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au tableau de bord
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl shadow-lg">
              <HelpCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Centre d'Aide
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Gestion des demandes de support utilisateur
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-blue-600 dark:text-blue-400">Total</p>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {stats.total}
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-orange-600 dark:text-orange-400">En attente</p>
                  <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                    {stats.pending}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">En cours</p>
                  <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                    {stats.inProgress}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-green-600 dark:text-green-400">Résolus</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {stats.resolved}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-red-600 dark:text-red-400">Urgents</p>
                  <p className="text-2xl font-bold text-red-800 dark:text-red-200">
                    {stats.urgent}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="text-sm font-medium mb-2 block">
                  Recherche
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Rechercher dans les messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Statut</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="resolved">Résolu</SelectItem>
                    <SelectItem value="closed">Fermé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Priorité</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">Élevé</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={fetchMessages} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Actualiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground font-medium">Chargement des messages...</p>
              </div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <HelpCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun message trouvé</h3>
                <p className="text-muted-foreground">
                  Aucun message de support ne correspond à vos critères de recherche.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredMessages.map((message) => (
              <Card key={message.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{message.subject}</h3>
                        <div className="flex gap-2">
                          {getStatusBadge(message.status)}
                          {getPriorityBadge(message.priority)}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-4 w-4" />
                          {message.profiles?.name} (@{message.profiles?.username})
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(message.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>

                      <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                        {message.message}
                      </p>

                      {message.admin_response && (
                        <div className="bg-green-50 dark:bg-green-950/50 p-3 rounded-lg border-l-4 border-green-500">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                            Réponse de l'administrateur:
                          </p>
                          <p className="text-green-700 dark:text-green-300 text-sm">
                            {message.admin_response}
                          </p>
                          {message.admin_response_at && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Répondu le {new Date(message.admin_response_at).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedMessage(message)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Voir
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{message.subject}</DialogTitle>
                            <DialogDescription>
                              De {message.profiles?.name} (@{message.profiles?.username}) • {new Date(message.created_at).toLocaleDateString('fr-FR')}
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-6">
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Message de l'utilisateur:</Label>
                              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border">
                                <p className="whitespace-pre-wrap">{message.message}</p>
                              </div>
                            </div>

                            {message.admin_response && (
                              <div>
                                <Label className="text-sm font-medium mb-2 block">Votre réponse:</Label>
                                <div className="bg-green-50 dark:bg-green-950/50 p-4 rounded-lg border border-green-200 dark:border-green-800">
                                  <p className="whitespace-pre-wrap">{message.admin_response}</p>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium mb-2 block">Statut actuel:</Label>
                                {getStatusBadge(message.status)}
                              </div>
                              <div>
                                <Label className="text-sm font-medium mb-2 block">Priorité:</Label>
                                {getPriorityBadge(message.priority)}
                              </div>
                            </div>

                            {!message.admin_response && (
                              <div>
                                <Label htmlFor="response" className="text-sm font-medium mb-2 block">
                                  Répondre au message:
                                </Label>
                                <Textarea
                                  id="response"
                                  placeholder="Tapez votre réponse ici..."
                                  value={responseText}
                                  onChange={(e) => setResponseText(e.target.value)}
                                  rows={4}
                                />
                                <div className="flex gap-2 mt-4">
                                  <Button
                                    onClick={() => updateMessageStatus(message.id, 'resolved', responseText)}
                                    disabled={!responseText.trim()}
                                    className="gap-2"
                                  >
                                    <Send className="h-4 w-4" />
                                    Envoyer la réponse
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => updateMessageStatus(message.id, 'in_progress')}
                                  >
                                    Marquer en cours
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => updateMessageStatus(message.id, 'closed')}
                                  >
                                    Fermer
                                  </Button>
                                </div>
                              </div>
                            )}

                            {message.admin_response && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => updateMessageStatus(message.id, 'closed')}
                                >
                                  Fermer le ticket
                                </Button>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
