-- Activer REPLICA IDENTITY FULL pour les mises à jour en temps réel
ALTER TABLE live_streams REPLICA IDENTITY FULL;

-- Fonction pour nettoyer automatiquement les anciens streams terminés (après 24h)
CREATE OR REPLACE FUNCTION cleanup_old_ended_streams()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM live_streams
  WHERE status = 'ended'
    AND ended_at < NOW() - INTERVAL '24 hours';
END;
$$;