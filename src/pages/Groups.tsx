import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useGroups } from "@/hooks/useGroups";
import { Plus, Search, Users, Lock, ArrowLeft, Home, Sparkles, TrendingUp, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

export default function Groups() {
  const { groups, isLoading, createGroup } = useGroups();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    privacy: "public" as 'public' | 'private'
  });
  const navigate = useNavigate();

  const filteredGroups = groups?.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateGroup = async () => {
    console.log('Creating group with data:', newGroup);
    try {
      const createdGroup = await createGroup.mutateAsync(newGroup);
      console.log('Group created successfully:', createdGroup);
      setIsCreateOpen(false);
      setNewGroup({ name: "", description: "", privacy: "public" });
      // Redirection automatique vers le groupe créé
      navigate(`/groups/${createdGroup.id}`);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 p-8 mb-8 border border-white/50 dark:border-gray-800/50">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-200/30 to-purple-200/30 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-200/30 to-pink-200/30 rounded-full blur-3xl translate-y-24 -translate-x-24"></div>

          <div className="relative">
            <div className="flex gap-2 mb-6">
              <Button variant="ghost" onClick={() => navigate('/feed')} className="gap-2 hover:bg-white/50 dark:hover:bg-gray-800/50">
                <Home className="h-4 w-4" />
                Accueil
              </Button>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      Groupes & Communautés
                    </h1>
                    <p className="text-lg text-muted-foreground mt-1">
                      Connectez-vous avec des personnes partageant vos intérêts
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border border-white/50 dark:border-gray-700/50 backdrop-blur-sm">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Communautés actives</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border border-white/50 dark:border-gray-700/50 backdrop-blur-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-medium">En croissance</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border border-white/50 dark:border-gray-700/50 backdrop-blur-sm">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Découvertes</span>
                  </div>
                </div>
              </div>

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5">
                    <Plus className="h-5 w-5" />
                    Créer un groupe
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer un nouveau groupe</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nom du groupe</Label>
                      <Input
                        id="name"
                        value={newGroup.name}
                        onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                        placeholder="Ex: Club de lecture"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newGroup.description}
                        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                        placeholder="Décrivez votre groupe..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="privacy">Confidentialité</Label>
                      <Select
                        value={newGroup.privacy}
                        onValueChange={(value: 'public' | 'private') => setNewGroup({ ...newGroup, privacy: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Privé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateGroup} className="w-full" disabled={!newGroup.name}>
                      Créer le groupe
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl" />
          <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/50 dark:border-gray-700/50 rounded-2xl shadow-lg">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Search className="h-5 w-5 text-blue-500" />
            </div>
            <Input
              placeholder="Rechercher des groupes par nom ou description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg border-0 bg-transparent placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse border-0 shadow-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-16 w-16 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredGroups?.map((group) => (
              <Card
                key={group.id}
                className="group relative overflow-hidden border-0 shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 ring-2 ring-white/50 dark:ring-gray-700/50 shadow-md">
                        <AvatarImage src={group.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                          {group.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      {group.privacy === 'private' && (
                        <div className="absolute -top-1 -right-1 p-1 bg-gray-900 dark:bg-gray-100 rounded-full">
                          <Lock className="h-3 w-3 text-white dark:text-gray-900" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {group.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                          <Users className="h-3 w-3 text-blue-500" />
                          <span className="font-medium text-blue-700 dark:text-blue-300">
                            {group.member_count} membres
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {group.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4 leading-relaxed">
                      {group.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    {group.user_role && (
                      <Badge
                        variant="secondary"
                        className={`text-xs font-medium px-3 py-1 ${
                          group.user_role === 'admin'
                            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                            : group.user_role === 'moderator'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                            : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                        }`}
                      >
                        {group.user_role === 'admin' ? 'Administrateur' :
                         group.user_role === 'moderator' ? 'Modérateur' : 'Membre'}
                      </Badge>
                    )}

                    <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Voir le groupe</span>
                      <ArrowLeft className="h-3 w-3 rotate-180" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredGroups?.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? 'Aucun groupe trouvé' : 'Aucun groupe pour le moment'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
