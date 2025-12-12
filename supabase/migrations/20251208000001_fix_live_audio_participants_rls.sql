-- Fix Live Audio Participants RLS Policies
-- Corrige les politiques de sécurité pour permettre aux participants de voir les autres participants de la salle

-- ===========================================
-- CORRECTION DES POLITIQUES RLS POUR PARTICIPANTS
-- ===========================================

-- Supprimer l'ancienne politique unifiée
DROP POLICY IF EXISTS "live_audio_participants_policy" ON live_audio_participants;

-- Politique de lecture : participants peuvent voir tous les participants de leur salle
DROP POLICY IF EXISTS "live_audio_participants_select_policy" ON live_audio_participants;
CREATE POLICY "live_audio_participants_select_policy" ON live_audio_participants
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM live_audio_participants lap2
      WHERE lap2.room_id = live_audio_participants.room_id
      AND lap2.user_id = auth.uid()
    )
  );

-- Politique d'insertion : seuls les utilisateurs authentifiés peuvent s'insérer
DROP POLICY IF EXISTS "live_audio_participants_insert_policy" ON live_audio_participants;
CREATE POLICY "live_audio_participants_insert_policy" ON live_audio_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politique de mise à jour : seuls les propriétaires peuvent modifier
DROP POLICY IF EXISTS "live_audio_participants_update_policy" ON live_audio_participants;
CREATE POLICY "live_audio_participants_update_policy" ON live_audio_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Politique de suppression : seuls les propriétaires peuvent supprimer
DROP POLICY IF EXISTS "live_audio_participants_delete_policy" ON live_audio_participants;
CREATE POLICY "live_audio_participants_delete_policy" ON live_audio_participants
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- LOG DE FIN DE MIGRATION
-- ===========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Correction RLS Live Audio Participants appliquée';
  RAISE NOTICE 'Les participants peuvent maintenant voir les autres participants de leur salle';
END $$;
