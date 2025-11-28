import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { Calendar, MapPin, Users, Plus, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Events() {
  const { user } = useAuth();

  // Données temporaires pour les événements (à remplacer par de vraies données)
  const events = [
    {
      id: 1,
      title: 'Réunion communautaire',
      description: 'Venez discuter des dernières actualités de notre plateforme',
      date: '2024-12-15',
      time: '19:00',
      location: 'Salle communautaire',
      attendees: 45,
      maxAttendees: 100,
      type: 'Communauté'
    },
    {
      id: 2,
      title: 'Atelier Photo',
      description: 'Apprenez les bases de la photographie mobile',
      date: '2024-12-20',
      time: '14:00',
      location: 'Centre culturel',
      attendees: 12,
      maxAttendees: 20,
      type: 'Atelier'
    }
  ];

  const upcomingEvents = events.filter(event => new Date(event.date) >= new Date());

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Événements</h1>
              <p className="text-muted-foreground">Découvrez et participez aux événements communautaires</p>
            </div>
          </div>

          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Créer un événement
          </Button>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{upcomingEvents.length}</p>
                  <p className="text-sm text-muted-foreground">Événements à venir</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {events.reduce((sum, event) => sum + event.attendees, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Participants totaux</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <MapPin className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">2</p>
                  <p className="text-sm text-muted-foreground">Lieux différents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Événements à venir */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Événements à venir
          </h2>

          {upcomingEvents.length > 0 ? (
            <div className="grid gap-4">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{event.type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.date).toLocaleDateString('fr-FR')} à {event.time}
                          </span>
                        </div>
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        <p className="text-muted-foreground mt-2">{event.description}</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {event.attendees}/{event.maxAttendees} participants
                        </div>
                      </div>

                      <Button>S'inscrire</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucun événement à venir</h3>
                <p className="text-muted-foreground mb-4">
                  Soyez le premier à créer un événement !
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer le premier événement
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Section pour les événements passés (optionnel) */}
        {events.length > upcomingEvents.length && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">Événements passés</h2>
            <div className="grid gap-4">
              {events
                .filter(event => new Date(event.date) < new Date())
                .map((event) => (
                  <Card key={event.id} className="opacity-75">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Terminé</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(event.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                    </CardHeader>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
