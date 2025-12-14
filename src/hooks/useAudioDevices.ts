import { useState, useEffect, useCallback } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  isDefault: boolean;
  isExternal: boolean; // Casque, micro externe, etc.
  priority: number; // Score de priorité (plus élevé = mieux)
}

export const useAudioDevices = () => {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Fonction pour déterminer si un périphérique est externe
  const isExternalDevice = useCallback((label: string): boolean => {
    const externalKeywords = [
      'headset', 'headphone', 'earphone', 'earbuds', 'casque', 'microphone',
      'usb', 'bluetooth', 'wireless', 'external', 'gaming', 'pro', 'studio',
      'audio-technica', 'sennheiser', 'bose', 'sony', 'jabra', 'plantronics',
      'logitech', 'razer', 'steelseries', 'hyperx', 'corsair'
    ];

    const lowerLabel = label.toLowerCase();
    return externalKeywords.some(keyword => lowerLabel.includes(keyword));
  }, []);

  // Fonction pour calculer la priorité d'un périphérique
  const calculatePriority = useCallback((device: MediaDeviceInfo): number => {
    let priority = 0;
    const label = device.label.toLowerCase();

    // Priorité maximale pour les périphériques externes
    if (isExternalDevice(device.label)) {
      priority += 100;
    }

    // Priorité pour les périphériques par défaut
    if (device.deviceId === 'default') {
      priority += 50;
    }

    // Pénalité pour les micros internes
    if (label.includes('built-in') || label.includes('internal') ||
        label.includes('microphone (realtek') || label.includes('conexant') ||
        label.includes('intel') || label.includes('high definition')) {
      priority -= 50;
    }

    // Bonus pour les périphériques de qualité
    if (label.includes('usb') || label.includes('audio interface')) {
      priority += 25;
    }

    return priority;
  }, [isExternalDevice]);

  // Charger les périphériques audio
  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 DÉBUT DÉTECTION MICRO RÉELLE...');

      // Demander l'autorisation d'accès aux médias pour pouvoir énumérer les périphériques
      console.log('📡 Demande d\'autorisation micro...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      console.log('✅ Autorisation accordée, fermeture du stream test...');
      stream.getTracks().forEach(track => track.stop()); // Arrêter immédiatement

      // Énumérer TOUS les périphériques disponibles sur l'appareil
      console.log('📋 Énumération de tous les périphériques...');
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      console.log('📊 Périphériques bruts détectés:', allDevices.length);

      // Log détaillé de tous les périphériques
      allDevices.forEach((device, index) => {
        console.log(`🔍 Périphérique ${index + 1}:`, {
          deviceId: device.deviceId,
          kind: device.kind,
          label: device.label,
          groupId: device.groupId
        });
      });

      // Filtrer UNIQUEMENT les périphériques audio d'entrée (microphones)
      const audioInputDevices = allDevices
        .filter(device => device.kind === 'audioinput')
        .map((device): AudioDevice => {
          const isExternal = isExternalDevice(device.label);
          const priority = calculatePriority(device);

          console.log(`🎤 MICROPHONE TROUVÉ:`, {
            id: device.deviceId.slice(0, 8) + '...',
            label: device.label,
            externe: isExternal,
            priorite: priority,
            defaut: device.deviceId === 'default'
          });

          return {
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
            kind: device.kind as 'audioinput',
            isDefault: device.deviceId === 'default',
            isExternal: isExternal,
            priority: priority
          };
        })
        .sort((a, b) => b.priority - a.priority); // Trier par priorité décroissante

      console.log('📈 MICROPHONES CLASSÉS PAR PRIORITÉ:');
      audioInputDevices.forEach((device, index) => {
        console.log(`  ${index + 1}. ${device.label} (Priorité: ${device.priority}, Externe: ${device.isExternal})`);
      });

      setDevices(audioInputDevices);

      // Sélectionner automatiquement le périphérique avec la plus haute priorité
      if (audioInputDevices.length > 0) {
        const bestDevice = audioInputDevices[0];
        setSelectedDeviceId(bestDevice.deviceId);
        console.log('🎯 SÉLECTION RÉELLE DU MEILLEUR MICRO:', {
          nom: bestDevice.label,
          externe: bestDevice.isExternal,
          priorite: bestDevice.priority,
          id: bestDevice.deviceId.slice(0, 8) + '...'
        });

        // Notification pour confirmer la détection réelle
        if (bestDevice.isExternal) {
          console.log('🎉 MICRO EXTERNE RÉELLEMENT DÉTECTÉ ET SÉLECTIONNÉ !');
        } else {
          console.log('📱 MICRO INTERNE SÉLECTIONNÉ (aucun externe trouvé)');
        }
      } else {
        console.log('❌ AUCUN MICROPHONE DÉTECTÉ SUR L\'APPAREIL !');
      }

    } catch (err) {
      console.error('❌ Erreur lors du chargement des périphériques audio:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');

      // Afficher les détails de l'erreur pour debug
      if (err instanceof Error) {
        console.error('Détails erreur:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isExternalDevice, calculatePriority]);

  // Fonction pour obtenir un stream avec le micro sélectionné
  const getAudioStream = useCallback(async (deviceId?: string): Promise<MediaStream> => {
    const targetDeviceId = deviceId || selectedDeviceId;

    console.log('🎤 GET AUDIO STREAM - DÉBUT');
    console.log('📍 DeviceId demandé:', targetDeviceId);
    console.log('📍 DeviceId sélectionné:', selectedDeviceId);

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
        sampleRate: 44100,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };

    console.log('🔧 Contraintes utilisées:', JSON.stringify(constraints, null, 2));

    try {
      console.log('📡 Appel getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ getUserMedia réussi');

      // Vérifier que nous avons bien accès au bon périphérique
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        const settings = track.getSettings();

        console.log('🎤 TRACK OBTENU:', {
          label: track.label,
          deviceId: settings.deviceId,
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression
        });

        // Vérifier si c'est le bon device
        const isCorrectDevice = targetDeviceId && settings.deviceId === targetDeviceId;
        console.log('🔍 Device demandé VS obtenu:', {
          demande: targetDeviceId,
          obtenu: settings.deviceId,
          correct: isCorrectDevice
        });

        if (!isCorrectDevice && targetDeviceId) {
          console.log('❌ ERREUR: Le mauvais micro a été sélectionné !');
        } else {
          console.log('✅ Bon micro sélectionné');
        }

        // Vérifier si c'est externe
        const isExternalUsed = /headset|headphone|earphone|earbuds|casque|microphone|usb|bluetooth|wireless|external|gaming|pro|studio|audio-technica|sennheiser|bose|sony|jabra|plantronics|logitech|razer|steelseries|hyperx|corsair/.test(track.label.toLowerCase());
        console.log('🔌 Micro externe utilisé ?', isExternalUsed);
      }

      return stream;
    } catch (err) {
      console.error('❌ Erreur lors de l\'obtention du stream audio:', err);

      // Fallback: essayer sans deviceId spécifique
      if (targetDeviceId) {
        console.log('⚠️ Tentative de fallback sans deviceId spécifique...');
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: 44100,
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          console.log('✅ Fallback réussi');
          return fallbackStream;
        } catch (fallbackErr) {
          console.error('❌ Fallback aussi échoué:', fallbackErr);
        }
      }

      throw err;
    }
  }, [selectedDeviceId]);

  // Fonction pour obtenir le meilleur micro automatiquement
  const getBestMicrophone = useCallback((): AudioDevice | null => {
    if (devices.length === 0) return null;
    return devices[0]; // Déjà trié par priorité
  }, [devices]);

  // Écouter les changements de périphériques
  useEffect(() => {
    loadDevices();

    // Écouter les changements de périphériques connectés/déconnectés
    const handleDeviceChange = () => {
      console.log('🔄 Changement de périphériques détecté, rechargement...');
      loadDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [loadDevices]);

  return {
    devices,
    loading,
    error,
    selectedDeviceId,
    setSelectedDeviceId,
    getAudioStream,
    getBestMicrophone,
    reloadDevices: loadDevices
  };
};
