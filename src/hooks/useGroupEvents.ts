import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GroupEvent {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  created_by: string;
  created_at: string;
  attendee_count?: number;
  user_status?: 'going' | 'maybe' | 'not_going' | null;
}

export const useGroupEvents = (groupId: string) => {
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ['group-events', groupId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('group_events')
        .select('*')
        .eq('group_id', groupId)
        .order('start_date', { ascending: true });

      if (error) throw error;

      const eventsWithDetails = await Promise.all(
        data.map(async (event) => {
          const { count } = await supabase
            .from('group_event_attendees')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'going');

          const { data: userAttendee } = await supabase
            .from('group_event_attendees')
            .select('status')
            .eq('event_id', event.id)
            .eq('user_id', user.id)
            .maybeSingle();

          return {
            ...event,
            attendee_count: count || 0,
            user_status: userAttendee?.status || null
          };
        })
      );

      return eventsWithDetails as GroupEvent[];
    },
    enabled: !!groupId
  });

  const createEvent = useMutation({
    mutationFn: async (eventData: {
      title: string;
      description?: string;
      location?: string;
      start_date: string;
      end_date?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('group_events')
        .insert({
          ...eventData,
          group_id: groupId,
          created_by: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-events', groupId] });
      toast.success('Événement créé');
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    }
  });

  const updateEvent = useMutation({
    mutationFn: async ({ eventId, updates }: {
      eventId: string;
      updates: Partial<Omit<GroupEvent, 'id' | 'group_id' | 'created_by' | 'created_at'>>;
    }) => {
      const { error } = await supabase
        .from('group_events')
        .update(updates)
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-events', groupId] });
      toast.success('Événement mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('group_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-events', groupId] });
      toast.success('Événement supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  const rsvpEvent = useMutation({
    mutationFn: async ({ eventId, status }: {
      eventId: string;
      status: 'going' | 'maybe' | 'not_going';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('group_event_attendees')
        .upsert({
          event_id: eventId,
          user_id: user.id,
          status
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-events', groupId] });
      toast.success('Réponse enregistrée');
    },
    onError: () => {
      toast.error('Erreur lors de la réponse');
    }
  });

  return {
    events,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    rsvpEvent
  };
};
