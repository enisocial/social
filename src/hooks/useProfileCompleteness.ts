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

    console.log('🎯 HOOK FETCH COMPLETENESS:', { userId });

    try {
      // Get the actual profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('🎯 PROFILE FETCH ERROR:', profileError);
        throw profileError;
      }

      console.log('🎯 ACTUAL PROFILE DATA:', profileData);

      // Calculate completeness using the same weighted system as CompleteProfile.tsx
      const fieldWeights: Record<string, number> = {
        bio: 15,
        work: 10,
        education: 10,
        current_city: 8,
        hometown: 8,
        relationship_status: 7,
        birthdate: 7,
        website: 5,
        phone: 5,
        avatar_url: 20,
        cover_photo_url: 15
      };

      let totalWeight = 0;
      let completedWeight = 0;
      const missingFields: string[] = [];

      // Calculate total weight (all fields + avatar + cover)
      Object.keys(fieldWeights).forEach(field => {
        totalWeight += fieldWeights[field];
      });

      // Calculate completed weight
      Object.keys(fieldWeights).forEach(field => {
        const value = profileData[field];
        const hasValue = value && typeof value === 'string' && value.trim() !== '';

        if (hasValue) {
          completedWeight += fieldWeights[field];
        } else {
          missingFields.push(field);
        }
      });

      const score = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

      const completenessData = {
        score,
        missingFields: missingFields.map((field: string) => fieldLabels[field] || field)
      };

      console.log('🎯 CALCULATED COMPLETENESS (WEIGHTED):', completenessData);
      console.log('🎯 MISSING FIELDS:', missingFields);
      console.log('🎯 SCORES - Total:', totalWeight, 'Completed:', completedWeight);

      setCompleteness(completenessData);

    } catch (error) {
      console.error('Error fetching profile completeness:', error);
    } finally {
      setLoading(false);
    }
  };

  return { completeness, loading, refresh: fetchCompleteness };
};
