-- FIX DES PERMISSIONS POUR LES CONVERSATIONS
-- Cette migration corrige les problèmes RLS qui empêchent la création de nouvelles conversations
-- et ajoute les colonnes manquantes à la table conversations

-- 0. AJOUTER LES COLONNES MANQUANTES À LA TABLE CONVERSATIONS
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'dm';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 1. SUPPRIMER LES ANCIENNES POLITIQUES PROBLÉMATIQUES
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone authenticated can create conversations" ON conversations;
DROP POLICY IF EXISTS "Create conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "View own participant records" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;
DROP POLICY IF EXISTS "Insert conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to new conversations" ON conversation_participants;

-- 2. RÉACTIVER RLS AVEC LES BONNES POLITIQUES
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Politiques pour conversations - POLITIQUES PLUS PERMISSIVES POUR LE DEBUG
CREATE POLICY "Users can view their conversations"
ON conversations
FOR SELECT
TO authenticated
USING (true);  -- Temporairement permissif pour debug

CREATE POLICY "Users can create conversations"
ON conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their conversations"
ON conversations
FOR UPDATE
TO authenticated
USING (true);  -- Temporairement permissif pour debug

-- Politiques pour conversation_participants
CREATE POLICY "Users can view participants of their conversations"
ON conversation_participants
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
);

CREATE POLICY "Users can add participants to conversations"
ON conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their participant records"
ON conversation_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 3. AJOUTER UNE POLITIQUE POUR LES CONVERSATIONS TYPE 'dm'
-- S'assurer que les conversations DM sont correctement gérées
CREATE POLICY "Users can view DM conversations they're in"
ON conversations
FOR SELECT
TO authenticated
USING (
    type = 'dm' AND EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = conversations.id
        AND user_id = auth.uid()
    )
);
