-- ============================================================
-- FILE 0003 - GLOBAL FUNCTIONS
-- Fonctions utilitaires partagées par toute l'application
-- ============================================================

------------------------------------------------------------
-- 1. Updated_at automatique
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS
$$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

------------------------------------------------------------
-- 2. Génération slug simple (optionnel mais utile)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_slug(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS
$$
BEGIN
    RETURN lower(
        regexp_replace(
            regexp_replace(input_text, '[^a-zA-Z0-9\s]', '', 'g'),
            '\s+', '-', 'g'
        )
    );
END;
$$;

------------------------------------------------------------
-- 3. Timestamp actuel (wrapper propre)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.now_utc()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS
$$
    SELECT timezone('utc', now());
$$;

------------------------------------------------------------
-- 4. Vérification utilisateur connecté (helper RLS)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS
$$
    SELECT auth.uid() IS NOT NULL;
$$;

------------------------------------------------------------
-- 5. Vérifier propriété d'une ligne générique
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_owner(row_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS
$$
    SELECT auth.uid() = row_user_id;
$$;

------------------------------------------------------------
-- 6. Générateur de nom de fichier storage sécurisé
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_file_key(prefix TEXT, extension TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS
$$
BEGIN
    RETURN prefix || '/' || gen_random_uuid() || '.' || extension;
END;
$$;

------------------------------------------------------------
-- 7. Journalisation simple (option future logs)
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT,
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.log_event(
    p_level TEXT,
    p_message TEXT,
    p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS
$$
BEGIN
    INSERT INTO public.system_logs(level, message, metadata)
    VALUES (p_level, p_message, p_metadata);
END;
$$;

------------------------------------------------------------
-- 8. Fonction de comptage sécurisé (anti NULL)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.safe_increment(value INT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS
$$
    SELECT COALESCE(value, 0) + 1;
$$;

CREATE OR REPLACE FUNCTION public.safe_decrement(value INT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS
$$
    SELECT GREATEST(COALESCE(value, 0) - 1, 0);
$$;

------------------------------------------------------------
-- END
------------------------------------------------------------