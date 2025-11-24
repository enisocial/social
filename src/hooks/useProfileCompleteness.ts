import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileCompleteness {
  score: number;
  missingFields: string[];
}

const fieldLabels: Record<string, string> = {
  avatar_url: 'Photo de profil',
  cover_photo_url: 'Photo de couverture',
  bio: 'Biographie',
  work: 'Emploi',
  education: 'Formation',
  current_city: 'Ville actuelle',
  hometown: 'Ville natale',
  relationship_status: 'Statut relationnel',
  birthdate: 'Date de naissance',
  website: 'Site web',
  phone: 'Téléphone'
};

export const useProfileCompleteness = (userId?: string) => {
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchCompleteness();
  }, [userId]);

  const fetchCompleteness = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .rpc('get_profile_completeness', { user_id_param: userId });

      if (error) throw error;

      if (data && data.length > 0) {
        setCompleteness({
          score: data[0].completeness_score,
          missingFields: data[0].missing_fields.map((field: string) => fieldLabels[field] || field)
        });
      }
    } catch (error) {
      console.error('Error fetching profile completeness:', error);
    } finally {
      setLoading(false);
    }
  };

  return { completeness, loading, refresh: fetchCompleteness };
};
