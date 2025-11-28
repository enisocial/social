// Composant de test pour la vraie géolocalisation GPS
import React, { useState } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export const GeolocationTest = () => {
  const {
    position,
    loading,
    error,
    permission,
    getCurrentPosition,
    watchPosition,
    checkPermission
  } = useGeolocation();

  const [watching, setWatching] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const handleGetPosition = async () => {
    try {
      await getCurrentPosition();
    } catch (err) {
      console.error('Erreur lors de l\'obtention de la position:', err);
    }
  };

  const handleWatchPosition = () => {
    if (watching && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatching(false);
      setWatchId(null);
    } else {
      const id = watchPosition();
      if (id) {
        setWatchId(id);
        setWatching(true);
      }
    }
  };

  const getPermissionColor = (perm: string | null) => {
    switch (perm) {
      case 'granted': return 'bg-green-500';
      case 'denied': return 'bg-red-500';
      case 'prompt': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getPermissionText = (perm: string | null) => {
    switch (perm) {
      case 'granted': return 'Autorisée';
      case 'denied': return 'Refusée';
      case 'prompt': return 'À demander';
      default: return 'Inconnue';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Test de Géolocalisation GPS Réelle
          </CardTitle>
          <CardDescription>
            Ce composant teste la vraie géolocalisation GPS du navigateur et la sauvegarde en base de données.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* STATUS DE LA PERMISSION */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Permission:</span>
            <Badge className={getPermissionColor(permission)}>
              {getPermissionText(permission)}
            </Badge>
          </div>

          {/* BOUTONS D'ACTION */}
          <div className="flex gap-2">
            <Button
              onClick={handleGetPosition}
              disabled={loading}
              variant="outline"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              Obtenir Position
            </Button>

            <Button
              onClick={handleWatchPosition}
              variant={watching ? "destructive" : "outline"}
            >
              {watching ? 'Arrêter le suivi' : 'Suivre en temps réel'}
            </Button>

            <Button
              onClick={checkPermission}
              variant="outline"
              size="sm"
            >
              Vérifier Permission
            </Button>
          </div>

          {/* ERREUR */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* POSITION ACTUELLE */}
          {position && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium text-green-700">Position obtenue !</span>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-600">Latitude</div>
                  <div className="text-lg font-mono">{position.latitude.toFixed(6)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Longitude</div>
                  <div className="text-lg font-mono">{position.longitude.toFixed(6)}</div>
                </div>
                {position.accuracy && (
                  <div>
                    <div className="text-sm font-medium text-gray-600">Précision</div>
                    <div className="text-lg">{position.accuracy.toFixed(0)}m</div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-600">Timestamp</div>
                  <div className="text-sm">{new Date(position.timestamp).toLocaleString()}</div>
                </div>
              </div>

              {/* ADRESSE */}
              {position.address && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-gray-600 mb-1">Adresse détectée:</div>
                  <div className="text-sm">{position.address}</div>
                </div>
              )}

              {/* DÉTAILS DE L'ADRESSE */}
              {(position.city || position.region || position.country) && (
                <div className="grid grid-cols-3 gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  {position.city && (
                    <div>
                      <div className="text-xs font-medium text-gray-600">Ville</div>
                      <div className="text-sm">{position.city}</div>
                    </div>
                  )}
                  {position.region && (
                    <div>
                      <div className="text-xs font-medium text-gray-600">Région</div>
                      <div className="text-sm">{position.region}</div>
                    </div>
                  )}
                  {position.country && (
                    <div>
                      <div className="text-xs font-medium text-gray-600">Pays</div>
                      <div className="text-sm">{position.country}</div>
                    </div>
                  )}
                </div>
              )}

              {/* STATUS DU SUIVI */}
              {watching && (
                <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-orange-700">Suivi GPS actif - mise à jour automatique</span>
                </div>
              )}
            </div>
          )}

          {/* INSTRUCTIONS */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium mb-2">Instructions:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Cliquez sur "Obtenir Position" pour une localisation unique</li>
              <li>• Cliquez sur "Suivre en temps réel" pour des mises à jour continues</li>
              <li>• La position est automatiquement sauvegardée dans votre profil</li>
              <li>• L'adresse est détectée via OpenStreetMap (Nominatim)</li>
              <li>• Les mises à jour se font uniquement si vous vous déplacez de plus de 100m</li>
              <li>• <strong>Note:</strong> Les nouvelles colonnes GPS ne sont pas encore en base (Docker requis)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* INFORMATIONS TECHNIQUES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informations Techniques</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-500 space-y-1">
          <div>• Géolocalisation HTML5 avec haute précision activée</div>
          <div>• Timeout: 10 secondes, âge maximum: 5 minutes</div>
          <div>• Suivi: timeout 10s, âge maximum 30s, seuil de déplacement 100m</div>
          <div>• Géocodage: Nominatim (OpenStreetMap) avec User-Agent personnalisé</div>
          <div>• Sauvegarde: latitude, longitude, adresse formatée, timestamp</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeolocationTest;
