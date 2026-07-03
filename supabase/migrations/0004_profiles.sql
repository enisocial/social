-- =====================================================
-- 000004_create_profiles.sql
-- Profils utilisateurs
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    username TEXT UNIQUE NOT NULL,
    name TEXT,

    bio TEXT,
    avatar_url TEXT,
    cover_url TEXT,

    website TEXT,
    location TEXT,

    verified BOOLEAN DEFAULT FALSE,

    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

---------------------------------------------------------
-- Trigger updated_at
---------------------------------------------------------

DROP TRIGGER IF EXISTS update_profiles_updated_at
ON public.profiles;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

---------------------------------------------------------
-- Index
---------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_username
ON public.profiles(username);

---------------------------------------------------------
-- RLS
---------------------------------------------------------

ALTER TABLE public.profiles
ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- Lecture publique
---------------------------------------------------------

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

---------------------------------------------------------
-- L'utilisateur peut créer son profil
---------------------------------------------------------

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

---------------------------------------------------------
-- L'utilisateur peut modifier son profil
---------------------------------------------------------

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

---------------------------------------------------------
-- L'utilisateur peut supprimer son profil
---------------------------------------------------------

CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);