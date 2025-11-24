
-- Fixer les warnings de sécurité sur search_path

-- Les fonctions sont déjà SET search_path = public, mais recréons-les explicitement
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_conversations_updated_at() IS 
  'Trigger pour mise à jour automatique du timestamp conversations.updated_at';
