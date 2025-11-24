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
import { ArrowLeft, Users, Settings, UserPlus, MessageSquare } from "lucide-react";
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

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={group.avatar_url || ""} />
                <AvatarFallback>{group.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">{group.name}</h1>
                    <p className="text-muted-foreground mt-2">{group.description}</p>
                    <div className="flex items-center gap-4 mt-4">
                      <Badge variant={group.privacy === 'public' ? 'default' : 'secondary'}>
                        {group.privacy === 'public' ? 'Public' : 'Privé'}
                      </Badge>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {group.member_count} membre{group.member_count > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isMember && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Rejoindre
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
          </CardContent>
        </Card>

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
