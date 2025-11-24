
-- ==============================================
-- MIGRATION DE SÉCURITÉ CRITIQUE - SIMPLIFIÉE
-- Correction des 5 problèmes de sécurité
-- ==============================================

-- 1. Créer un schéma dédié pour les extensions (bonne pratique)
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Créer une table pour le rate limiting (100 req/min/user)
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_endpoint_window UNIQUE(user_id, endpoint, window_start)
);

-- Index pour performance du rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint_window 
ON public.rate_limits(user_id, endpoint, window_start);

-- Index pour cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
ON public.rate_limits(window_start);

-- Activer RLS sur rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres limites
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.rate_limits;
CREATE POLICY "Users can view own rate limits"
ON public.rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Seul le service peut insérer/update
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
USING (auth.role() = 'service_role');

-- Fonction pour vérifier et incrémenter le rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_endpoint TEXT,
    p_max_requests INTEGER DEFAULT 100
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_count INTEGER;
    v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculer le début de la fenêtre actuelle (1 minute)
    v_window_start := date_trunc('minute', NOW());
    
    -- Essayer d'insérer ou récupérer le compteur
    INSERT INTO rate_limits (user_id, endpoint, window_start, request_count)
    VALUES (p_user_id, p_endpoint, v_window_start, 1)
    ON CONFLICT (user_id, endpoint, window_start)
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING request_count INTO v_current_count;
    
    -- Nettoyer les anciennes entrées (>5 minutes) en batch
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '5 minutes'
    AND id IN (
      SELECT id FROM rate_limits 
      WHERE window_start < NOW() - INTERVAL '5 minutes'
      LIMIT 1000
    );
    
    -- Retourner true si sous la limite
    RETURN v_current_count <= p_max_requests;
END;
$$;

-- 3. Ajouter des contraintes de sécurité sur les contenus
-- Limiter la taille pour éviter les attaques DoS
DO $$ 
BEGIN
    -- Posts
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_content_length' AND conrelid = 'posts'::regclass
    ) THEN
        ALTER TABLE posts 
            ADD CONSTRAINT check_content_length 
            CHECK (char_length(content) <= 10000);
    END IF;

    -- Messages
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_message_length' AND conrelid = 'messages'::regclass
    ) THEN
        ALTER TABLE messages 
            ADD CONSTRAINT check_message_length 
            CHECK (char_length(content) <= 5000);
    END IF;

    -- Comments
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_comment_length' AND conrelid = 'comments'::regclass
    ) THEN
        ALTER TABLE comments 
            ADD CONSTRAINT check_comment_length 
            CHECK (char_length(text) <= 2000);
    END IF;
END $$;

-- 4. Ajouter des indexes pour améliorer les performances des requêtes de sécurité
CREATE INDEX IF NOT EXISTS idx_posts_user_created 
ON posts(user_id, created_at DESC) WHERE privacy = 'public';

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_likes_created 
ON likes(created_at DESC);

-- 5. Fonction pour valider les inputs (anti-XSS basique)
CREATE OR REPLACE FUNCTION public.sanitize_text(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Retirer les balises HTML basiques et scripts
    RETURN regexp_replace(
        regexp_replace(
            regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi'),
            '<iframe[^>]*>.*?</iframe>', '', 'gi'
        ),
        '<[^>]+>', '', 'g'
    );
END;
$$;

-- 6. Fonction pour cleanup automatique des rate limits (à scheduler)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM rate_limits
    WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;

-- Comments
COMMENT ON FUNCTION sanitize_text IS 'Sanitize user input by removing HTML tags and scripts';
COMMENT ON FUNCTION check_rate_limit IS 'Check and enforce rate limiting: 100 requests per minute per user per endpoint';
COMMENT ON FUNCTION cleanup_rate_limits IS 'Cleanup old rate limit entries (should be called periodically)';
COMMENT ON TABLE rate_limits IS 'Track API rate limits per user and endpoint to prevent abuse';
COMMENT ON COLUMN rate_limits.window_start IS 'Start of the 1-minute window for rate limiting';
COMMENT ON COLUMN rate_limits.request_count IS 'Number of requests in this window';

-- Log success
DO $$ 
BEGIN
    RAISE NOTICE 'Migration de sécurité appliquée avec succès';
    RAISE NOTICE '1. Schema extensions créé';
    RAISE NOTICE '2. Table rate_limits créée avec RLS';
    RAISE NOTICE '3. Contraintes de longueur ajoutées';
    RAISE NOTICE '4. Indexes de performance ajoutés';
    RAISE NOTICE '5. Fonctions de sanitization créées';
END $$;
