import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Users, Settings, UserPlus, MessageSquare, Globe, Lock } from "lucide-react";
import { useGroup } from "@/hooks/useGroups";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupPosts } from "@/hooks/useGroupPosts";
import { useGroupEvents } from "@/hooks/useGroupEvents";
import { useGroupJoinRequests } from "@/hooks/useGroupJoinRequests";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupSettings } from "@/components/GroupSettings";

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: group } = useGroup(groupId!);
  const { members, updateMemberRole, removeMember, addMember } = useGroupMembers(groupId!);
  const { posts, createPost, deletePost } = useGroupPosts(groupId!);
  const { events, createEvent, rsvpEvent } = useGroupEvents(groupId!);
  const { requests, approveRequest, rejectRequest, sendRequest } = useGroupJoinRequests(groupId!);

  const [postContent, setPostContent] = useState("");
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    location: "",
    start_date: "",
    end_date: ""
  });
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");

  const isAdmin = group?.user_role === 'admin';
  const isModerator = group?.user_role === 'moderator' || isAdmin;
  const isMember = !!group?.user_role;

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;
    await createPost.mutateAsync({ content: postContent });
    setPostContent("");
  };

  const handleCreateEvent = async () => {
    await createEvent.mutateAsync(eventForm);
    setIsEventDialogOpen(false);
    setEventForm({
      title: "",
      description: "",
      location: "",
      start_date: "",
      end_date: ""
    });
  };

  const handleJoinGroup = async () => {
    if (group?.privacy === 'private') {
      await sendRequest.mutateAsync({ groupId: groupId!, message: joinMessage });
      setJoinMessage("");
    } else {
      await addMember.mutateAsync({ userId: user!.id, role: 'member' });
    }
  };

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/groups")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux groupes
        </Button>

        {/* Hero Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 border border-white/50 dark:border-gray-800/50">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-200/20 to-purple-200/20 rounded-full blur-3xl -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-200/20 to-pink-200/20 rounded-full blur-3xl translate-y-32 -translate-x-32"></div>

          <div className="relative p-8">
            <div className="flex flex-col lg:flex-row items-start gap-8">
              <div className="relative">
                <Avatar className="h-32 w-32 ring-4 ring-white/50 dark:ring-gray-700/50 shadow-2xl">
                  <AvatarImage src={group.avatar_url || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-4xl font-bold">
                    {group.name[0]}
                  </AvatarFallback>
                </Avatar>
                {group.privacy === 'private' && (
                  <div className="absolute -top-2 -right-2 p-2 bg-gray-900 dark:bg-gray-100 rounded-full shadow-lg">
                    <Lock className="h-5 w-5 text-white dark:text-gray-900" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
                      {group.name}
                    </h1>
                    {group.description && (
                      <p className="text-lg text-muted-foreground leading-relaxed mb-4 max-w-2xl">
                        {group.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-6 text-sm">
                      <Badge
                        variant={group.privacy === 'public' ? 'default' : 'secondary'}
                        className={`px-4 py-2 text-sm font-medium ${
                          group.privacy === 'public'
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                            : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                        }`}
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        {group.privacy === 'public' ? 'Public' : 'Privé'}
                      </Badge>

                      <div className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border border-white/50 dark:border-gray-700/50 backdrop-blur-sm">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-blue-700 dark:text-blue-300">
                          {group.member_count} membre{group.member_count > 1 ? 's' : ''}
                        </span>
                      </div>

                      {isMember && (
                        <Badge className={`px-3 py-1 text-xs font-medium ${
                          group.user_role === 'admin'
                            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                            : group.user_role === 'moderator'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                            : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                        }`}>
                          {group.user_role === 'admin' ? 'Administrateur' :
                           group.user_role === 'moderator' ? 'Modérateur' : 'Membre'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {!isMember && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5">
                            <UserPlus className="mr-2 h-5 w-5" />
                            Rejoindre le groupe
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Rejoindre {group.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {group.privacy === 'private' && (
                              <div>
                                <Label>Message (optionnel)</Label>
                                <Textarea
                                  value={joinMessage}
                                  onChange={(e) => setJoinMessage(e.target.value)}
                                  placeholder="Pourquoi voulez-vous rejoindre ce groupe ?"
                                />
                              </div>
                            )}
                            <Button onClick={handleJoinGroup} className="w-full">
                              {group.privacy === 'private' ? 'Envoyer la demande' : 'Rejoindre'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isMember && (
          <Tabs defaultValue="posts" className="space-y-6">
            <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-3'}`}>
              <TabsTrigger value="posts">Publications</TabsTrigger>
              <TabsTrigger value="members">Membres</TabsTrigger>
              <TabsTrigger value="events">Événements</TabsTrigger>
              {isAdmin && <TabsTrigger value="requests">Demandes</TabsTrigger>}
              {isAdmin && <TabsTrigger value="settings">Paramètres</TabsTrigger>}
            </TabsList>

            <TabsContent value="posts" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Avatar>
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback>{user?.user_metadata?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-4">
                      <Textarea
                        placeholder="Quoi de neuf ?"
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                      />
                      <Button onClick={handleCreatePost} disabled={!postContent.trim()}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Publier
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {posts?.map((post) => (
                <Card key={post.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Avatar>
                        <AvatarImage src={post.profile.avatar_url || ""} />
                        <AvatarFallback>{post.profile.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{post.profile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(post.created_at), 'Pp', { locale: fr })}
                            </p>
                          </div>
                          {(post.user_id === user?.id || isAdmin) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deletePost.mutate(post.id)}
                            >
                              Supprimer
                            </Button>
                          )}
                        </div>
                        <p className="mt-4 whitespace-pre-wrap">{post.content}</p>
                        {post.media_url && (
                          <img
                            src={post.media_url}
                            alt="Media"
                            className="mt-4 rounded-lg max-h-96 object-cover"
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle>Membres ({members?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {members?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={member.profile.avatar_url || ""} />
                          <AvatarFallback>{member.profile.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{member.profile.name}</p>
                          <p className="text-sm text-muted-foreground">@{member.profile.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{member.role}</Badge>
                        {isAdmin && member.user_id !== user?.id && (
                          <>
                            <Select
                              value={member.role}
                              onValueChange={(role) =>
                                updateMemberRole.mutate({
                                  memberId: member.id,
                                  role: role as 'admin' | 'moderator' | 'member'
                                })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Membre</SelectItem>
                                <SelectItem value="moderator">Modérateur</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeMember.mutate(member.id)}
                            >
                              Retirer
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
              {isModerator && (
                <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Créer un événement</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nouvel événement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Titre</Label>
                        <Input
                          value={eventForm.title}
                          onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={eventForm.description}
                          onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Lieu</Label>
                        <Input
                          value={eventForm.location}
                          onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Date de début</Label>
                        <Input
                          type="datetime-local"
                          value={eventForm.start_date}
                          onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Date de fin</Label>
                        <Input
                          type="datetime-local"
                          value={eventForm.end_date}
                          onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleCreateEvent} className="w-full">
                        Créer
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {events?.map((event) => (
                <Card key={event.id}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    <p className="text-muted-foreground mt-2">{event.description}</p>
                    <div className="mt-4 space-y-2 text-sm">
                      <p>📍 {event.location}</p>
                      <p>📅 {format(new Date(event.start_date), 'PPp', { locale: fr })}</p>
                      <p>👥 {event.attendee_count} participant{event.attendee_count > 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant={event.user_status === 'going' ? 'default' : 'outline'}
                        onClick={() => rsvpEvent.mutate({ eventId: event.id, status: 'going' })}
                      >
                        J'y vais
                      </Button>
                      <Button
                        size="sm"
                        variant={event.user_status === 'maybe' ? 'default' : 'outline'}
                        onClick={() => rsvpEvent.mutate({ eventId: event.id, status: 'maybe' })}
                      >
                        Peut-être
                      </Button>
                      <Button
                        size="sm"
                        variant={event.user_status === 'not_going' ? 'default' : 'outline'}
                        onClick={() => rsvpEvent.mutate({ eventId: event.id, status: 'not_going' })}
                      >
                        Je n'y vais pas
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {isAdmin && (
              <TabsContent value="requests">
                <Card>
                  <CardHeader>
                    <CardTitle>Demandes d'adhésion ({requests?.length || 0})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {requests?.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={request.profile.avatar_url || ""} />
                            <AvatarFallback>{request.profile.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{request.profile.name}</p>
                            <p className="text-sm text-muted-foreground">@{request.profile.username}</p>
                            {request.message && (
                              <p className="text-sm mt-2">{request.message}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveRequest.mutate(request.id)}
                          >
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectRequest.mutate(request.id)}
                          >
                            Refuser
                          </Button>
                        </div>
                      </div>
                    ))}
                    {requests?.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Aucune demande en attente
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="settings">
                <GroupSettings group={group} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}
