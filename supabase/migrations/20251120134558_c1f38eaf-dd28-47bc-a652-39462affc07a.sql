-- Créer une fonction pour nettoyer automatiquement les statuts online sans session active
CREATE OR REPLACE FUNCTION cleanup_orphaned_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mettre offline tous les utilisateurs qui n'ont pas de session active
  UPDATE user_presence up
  SET online = false,
      last_seen = now(),
      updated_at = now()
  WHERE up.online = true
  AND NOT EXISTS (
    SELECT 1 
    FROM auth.sessions s 
    WHERE s.user_id = up.user_id
    AND s.not_after > now()
  );
END;
$$;