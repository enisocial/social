// Hook pour gérer la géolocalisation réelle en temps réel
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
}

export interface GeolocationState {
  position: GeolocationData | null;
  loading: boolean;
  error: string | null;
  permission: 'granted' | 'denied' | 'prompt' | null;
}

export const useGeolocation = () => {
  const { user } = useAuth();
  const [state, setState] = useState<GeolocationState>({
    position: null,
    loading: false,
    error: null,
    permission: null
  });

  // VÉRIFIER LA PERMISSION DE GÉOLOCALISATION
  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) return null;

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setState(prev => ({ ...prev, permission: result.state as any }));

      result.addEventListener('change', () => {
        setState(prev => ({ ...prev, permission: result.state as any }));
      });

      return result.state;
    } catch (error) {
      console.error('Erreur vérification permission:', error);
      return null;
    }
  }, []);

  // OBTENIR LA POSITION ACTUELLE
  const getCurrentPosition = useCallback((): Promise<GeolocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('La géolocalisation n\'est pas supportée par ce navigateur'));
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const geoData: GeolocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };

          // ESSAYER D'OBTENIR L'ADRESSE VIA NOMINATIM (OpenStreetMap)
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${geoData.latitude}&lon=${geoData.longitude}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'SocialApp/1.0'
                }
              }
            );

            if (response.ok) {
              const addressData = await response.json();
              if (addressData && addressData.address) {
                geoData.address = addressData.display_name;
                geoData.city = addressData.address.city || addressData.address.town || addressData.address.village;
                geoData.region = addressData.address.state || addressData.address.region;
                geoData.country = addressData.address.country;
              }
            }
          } catch (error) {
            console.warn('Impossible d\'obtenir l\'adresse:', error);
          }

          // SAUVEGARDER EN BASE DE DONNÉES
          if (user?.id) {
            try {
              await (supabase as any)
                .from('profiles')
                .update({
                  latitude: geoData.latitude,
                  longitude: geoData.longitude,
                  city: geoData.city || null,
                  region: geoData.region || null,
                  country: geoData.country || null,
                  last_location_update: new Date().toISOString()
                })
                .eq('id', user.id);

              console.log('📍 Position GPS sauvegardée:', geoData);
            } catch (dbError) {
              console.error('Erreur sauvegarde position:', dbError);
            }
          }

          setState(prev => ({
            ...prev,
            position: geoData,
            loading: false
          }));

          resolve(geoData);
        },
        (error) => {
          let errorMessage = 'Erreur de géolocalisation';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permission de géolocalisation refusée';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Position indisponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Timeout de géolocalisation';
              break;
          }

          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage
          }));

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }, [user?.id]);

  // SUIVRE LA POSITION EN TEMPS RÉEL
  const watchPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'La géolocalisation n\'est pas supportée par ce navigateur'
      }));
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const geoData: GeolocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };

        // MÊME LOGIQUE QUE getCurrentPosition POUR L'ADRESSE
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${geoData.latitude}&lon=${geoData.longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'SocialApp/1.0'
              }
            }
          );

          if (response.ok) {
            const addressData = await response.json();
            if (addressData && addressData.address) {
              geoData.address = addressData.display_name;
              geoData.city = addressData.address.city || addressData.address.town || addressData.address.village;
              geoData.region = addressData.address.state || addressData.address.region;
              geoData.country = addressData.address.country;
            }
          }
        } catch (error) {
          console.warn('Impossible d\'obtenir l\'adresse:', error);
        }

        // SAUVEGARDER UNIQUEMENT SI CHANGEMENT SIGNIFICATIF (>100m)
        if (user?.id && state.position) {
          const distance = getDistance(
            state.position.latitude,
            state.position.longitude,
            geoData.latitude,
            geoData.longitude
          );

          if (distance > 100) { // Plus de 100 mètres
            try {
              await (supabase as any)
                .from('profiles')
                .update({
                  latitude: geoData.latitude,
                  longitude: geoData.longitude,
                  city: geoData.city || null,
                  region: geoData.region || null,
                  country: geoData.country || null,
                  last_location_update: new Date().toISOString()
                })
                .eq('id', user.id);

              console.log('📍 Position GPS mise à jour:', geoData, `(déplacement: ${distance.toFixed(0)}m)`);
            } catch (dbError) {
              console.error('Erreur mise à jour position:', dbError);
            }
          }
        }

        setState(prev => ({
          ...prev,
          position: geoData,
          loading: false
        }));
      },
      (error) => {
        let errorMessage = 'Erreur de géolocalisation';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permission de géolocalisation refusée';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position indisponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Timeout de géolocalisation';
            break;
        }

        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000 // 30 secondes
      }
    );

    return watchId;
  }, [user?.id, state.position]);

  // CALCULER LA DISTANCE ENTRE DEUX POINTS GPS
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance en mètres
  };

  // CHARGER LA DERNIÈRE POSITION CONNUE AU MONTAGE
  useEffect(() => {
    const loadLastPosition = async () => {
      if (!user?.id) return;

    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('latitude, longitude, city, region, country, last_location_update')
        .eq('id', user.id)
        .single();

        if (!error && data && data.latitude && data.longitude) {
          const address = [data.city, data.region, data.country].filter(Boolean).join(', ');
          setState(prev => ({
            ...prev,
            position: {
              latitude: data.latitude,
              longitude: data.longitude,
              timestamp: new Date(data.last_location_update || Date.now()).getTime(),
              address: address || undefined,
              city: data.city,
              region: data.region,
              country: data.country
            }
          }));

          console.log('📍 Dernière position chargée:', data);
        }
      } catch (error) {
        console.warn('Impossible de charger la dernière position:', error);
      }
    };

    loadLastPosition();
    checkPermission();
  }, [user?.id, checkPermission]);

  // DEMANDER LA PERMISSION AU MONTAGE SI PAS DÉJÀ FAIT
  useEffect(() => {
    if (state.permission === null) {
      checkPermission();
    }
  }, [state.permission, checkPermission]);

  return {
    ...state,
    getCurrentPosition,
    watchPosition,
    checkPermission,
    getDistance
  };
};

// Hook pour calculer la proximité géographique
export const useLocationProximity = (userId1: string, userId2: string) => {
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateProximity = useCallback(async () => {
    if (!userId1 || !userId2 || userId1 === userId2) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('latitude, longitude')
        .in('id', [userId1, userId2]);

      if (error) throw error;

      if (data && data.length === 2) {
        const user1 = data.find(u => u.id === userId1);
        const user2 = data.find(u => u.id === userId2);

        if (user1?.latitude && user1?.longitude && user2?.latitude && user2?.longitude) {
          const dist = getDistanceFromLatLonInKm(
            user1.latitude,
            user1.longitude,
            user2.latitude,
            user2.longitude
          );

          setDistance(dist);
        }
      }
    } catch (error) {
      console.error('Erreur calcul proximité:', error);
    } finally {
      setLoading(false);
    }
  }, [userId1, userId2]);

  useEffect(() => {
    calculateProximity();
  }, [calculateProximity]);

  return { distance, loading, calculateProximity };
};

// Fonction utilitaire pour calculer la distance
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance en km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
