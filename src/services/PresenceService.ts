// Service de présence singleton - approche sans hooks pour éviter les conflits
import { supabase } from '@/integrations/supabase/client';

class PresenceService {
  private static instance: PresenceService;
  private currentUserId: string | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): PresenceService {
    if (!PresenceService.instance) {
      PresenceService.instance = new PresenceService();
    }
    return PresenceService.instance;
  }

  // Initialisation simple
  async initialize(userId: string) {
    if (this.isInitialized || !userId) return;

    this.currentUserId = userId;
    this.isInitialized = true;

    // Mise à jour initiale
    await this.updatePresence(true);
  }

  // Mise à jour de présence très basique
  async updatePresence(online: boolean) {
    if (!this.currentUserId) return;

    try {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: this.currentUserId,
          is_online: online,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      // Silent error - ne pas casser l'app
    }
  }

  // Nettoyage
  cleanup() {
    if (this.currentUserId) {
      this.updatePresence(false);
    }
    this.isInitialized = false;
    this.currentUserId = null;
  }

  // Vérifier si un utilisateur est en ligne
  async isUserOnline(userId: string): Promise<boolean> {
    if (!userId) return false;

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('is_online, last_seen')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) {
        return false;
      }

      return (data as any).is_online || false;
    } catch (error) {
      return false;
    }
  }

  // Obtenir la dernière connexion d'un utilisateur
  async getLastSeen(userId: string): Promise<string | null> {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('is_online, last_seen')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return (data as any).last_seen || null;
    } catch (error) {
      return null;
    }
  }
}

// Export singleton
export const presenceService = PresenceService.getInstance();
