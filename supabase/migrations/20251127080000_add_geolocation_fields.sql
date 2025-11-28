-- Migration pour ajouter les champs de géolocalisation à la table profiles
-- Cela permettra de stocker la vraie position GPS des utilisateurs

-- Ajouter les colonnes de géolocalisation
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION;

-- Index pour les requêtes de proximité géographique
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles USING GIST (point(longitude, latitude));
CREATE INDEX IF NOT EXISTS idx_profiles_last_location_update ON profiles(last_location_update);

-- Fonction pour calculer la distance entre deux points GPS (en kilomètres)
CREATE OR REPLACE FUNCTION calculate_distance(lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION, lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    dlat DOUBLE PRECISION;
    dlon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
    earth_radius DOUBLE PRECISION := 6371; -- Rayon de la Terre en km
BEGIN
    -- Vérifier les valeurs NULL
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;

    -- Convertir les degrés en radians
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);

    -- Formule de Haversine
    a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));

    RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour trouver les utilisateurs proches (dans un rayon donné en km)
CREATE OR REPLACE FUNCTION find_nearby_users(
    user_lat DOUBLE PRECISION,
    user_lon DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 50,
    exclude_user_id UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    username TEXT,
    avatar_url TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance DOUBLE PRECISION,
    last_location_update TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.username,
        p.avatar_url,
        p.latitude,
        p.longitude,
        calculate_distance(user_lat, user_lon, p.latitude, p.longitude) as distance,
        p.last_location_update
    FROM profiles p
    WHERE
        p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
        AND p.last_location_update IS NOT NULL
        AND (exclude_user_id IS NULL OR p.id != exclude_user_id)
        AND calculate_distance(user_lat, user_lon, p.latitude, p.longitude) <= radius_km
    ORDER BY calculate_distance(user_lat, user_lon, p.latitude, p.longitude) ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Mettre à jour les politiques RLS pour la géolocalisation
-- Les utilisateurs peuvent voir la localisation des autres utilisateurs (pour les suggestions d'amis)
-- Mais ils ne peuvent modifier que leur propre localisation

-- Politique pour permettre aux utilisateurs de voir la localisation des autres
DROP POLICY IF EXISTS "Users can view others location" ON profiles;
CREATE POLICY "Users can view others location"
ON profiles FOR SELECT
USING (true);

-- Politique pour permettre aux utilisateurs de mettre à jour leur propre localisation
DROP POLICY IF EXISTS "Users can update own location" ON profiles;
CREATE POLICY "Users can update own location"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ajouter des commentaires
COMMENT ON COLUMN profiles.latitude IS 'Latitude GPS de l''utilisateur';
COMMENT ON COLUMN profiles.longitude IS 'Longitude GPS de l''utilisateur';
COMMENT ON COLUMN profiles.last_location_update IS 'Dernière mise à jour de la position GPS';
COMMENT ON COLUMN profiles.location_accuracy IS 'Précision de la position GPS en mètres';

COMMENT ON FUNCTION calculate_distance(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) IS 'Calcule la distance en km entre deux points GPS';
COMMENT ON FUNCTION find_nearby_users(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, INTEGER) IS 'Trouve les utilisateurs dans un rayon donné';

-- Remplacer l'ancienne fonction get_location_score pour utiliser la vraie géolocalisation
CREATE OR REPLACE FUNCTION get_location_score(p_candidate_id UUID, p_user_id UUID)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    candidate_lat DOUBLE PRECISION;
    candidate_lon DOUBLE PRECISION;
    user_lat DOUBLE PRECISION;
    user_lon DOUBLE PRECISION;
    distance DOUBLE PRECISION;
    score DOUBLE PRECISION := 0;
BEGIN
    -- Récupérer les coordonnées GPS des deux utilisateurs
    SELECT latitude, longitude INTO user_lat, user_lon
    FROM profiles WHERE id = p_user_id;

    SELECT latitude, longitude INTO candidate_lat, candidate_lon
    FROM profiles WHERE id = p_candidate_id;

    -- Si l'un des deux n'a pas de coordonnées GPS, retourner 0
    IF user_lat IS NULL OR user_lon IS NULL OR candidate_lat IS NULL OR candidate_lon IS NULL THEN
        RETURN 0;
    END IF;

    -- Calculer la distance
    distance := calculate_distance(user_lat, user_lon, candidate_lat, candidate_lon);

    -- Système de scoring basé sur la distance
    -- Plus la distance est faible, plus le score est élevé
    IF distance <= 1 THEN
        -- Même ville (score maximum)
        score := 1.0;
    ELSIF distance <= 5 THEN
        -- Même région (score élevé)
        score := 0.8;
    ELSIF distance <= 25 THEN
        -- Même pays/province (score moyen)
        score := 0.6;
    ELSIF distance <= 100 THEN
        -- Distance raisonnable (score faible)
        score := 0.3;
    ELSIF distance <= 500 THEN
        -- Distance lointaine (score très faible)
        score := 0.1;
    ELSE
        -- Trop loin (score nul)
        score := 0;
    END IF;

    RETURN score;
END;
$$ LANGUAGE plpgsql STABLE;

-- Mettre à jour la fonction get_advanced_friend_suggestions pour utiliser la vraie géolocalisation
-- Cette fonction utilise maintenant les vraies coordonnées GPS au lieu des données textuelles simulées
CREATE OR REPLACE FUNCTION get_advanced_friend_suggestions(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    w_mutual_friends DOUBLE PRECISION DEFAULT 0.30,
    w_interactions DOUBLE PRECISION DEFAULT 0.20,
    w_location DOUBLE PRECISION DEFAULT 0.15,
    w_common_groups DOUBLE PRECISION DEFAULT 0.15,
    w_interests DOUBLE PRECISION DEFAULT 0.20
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    name TEXT,
    avatar_url TEXT,
    bio TEXT,
    city TEXT,
    region TEXT,
    country TEXT,
    mutual_friends_count INTEGER,
    interaction_score DOUBLE PRECISION,
    location_score DOUBLE PRECISION,
    common_groups_count INTEGER,
    interest_similarity DOUBLE PRECISION,
    final_score DOUBLE PRECISION,
    suggestion_reasons JSON
) AS $$
BEGIN
    RETURN QUERY
    WITH user_data AS (
        -- Récupérer les données de l'utilisateur connecté
        SELECT
            p.id,
            p.latitude,
            p.longitude,
            array_agg(DISTINCT i.interest) FILTER (WHERE i.interest IS NOT NULL) as interests
        FROM profiles p
        LEFT JOIN user_interests i ON p.id = i.user_id
        WHERE p.id = p_user_id
        GROUP BY p.id, p.latitude, p.longitude
    ),
    candidates AS (
        -- Sélectionner les candidats potentiels (non amis, pas soi-même)
        SELECT DISTINCT
            p.id,
            p.username,
            p.name,
            p.avatar_url,
            p.bio,
            p.city,
            p.region,
            p.country,
            p.latitude,
            p.longitude,
            array_agg(DISTINCT i.interest) FILTER (WHERE i.interest IS NOT NULL) as interests
        FROM profiles p
        LEFT JOIN user_interests i ON p.id = i.user_id
        WHERE
            p.id != p_user_id
            AND NOT EXISTS (
                SELECT 1 FROM friend_requests fr
                WHERE (fr.sender_id = p_user_id AND fr.receiver_id = p.id)
                   OR (fr.sender_id = p.id AND fr.receiver_id = p_user_id)
                   OR (fr.status = 'accepted')
            )
            AND NOT EXISTS (
                SELECT 1 FROM hidden_friend_suggestions hfs
                WHERE hfs.user_id = p_user_id AND hfs.hidden_user_id = p.id
            )
        GROUP BY p.id, p.username, p.name, p.avatar_url, p.bio, p.city, p.region, p.country, p.latitude, p.longitude
    ),
    scored_candidates AS (
        SELECT
            c.id,
            c.username,
            c.name,
            c.avatar_url,
            c.bio,
            c.city,
            c.region,
            c.country,

            -- Score d'amis mutuels
            COALESCE(get_mutual_friends_count(c.id, p_user_id), 0)::INTEGER as mutual_friends_count,

            -- Score d'interactions
            COALESCE(get_interaction_score(c.id, p_user_id), 0) as interaction_score,

            -- Score de localisation (vraie géolocalisation GPS)
            COALESCE(get_location_score(c.id, p_user_id), 0) as location_score,

            -- Score de groupes communs
            COALESCE(get_common_groups_count(c.id, p_user_id), 0)::INTEGER as common_groups_count,

            -- Score de similarité d'intérêts
            COALESCE(get_interest_similarity(c.id, p_user_id), 0) as interest_similarity,

            -- Intérêts pour les raisons de suggestion
            c.interests

        FROM candidates c
        CROSS JOIN user_data u
    ),
    final_scoring AS (
        SELECT
            sc.*,
            -- Score final pondéré
            (
                w_mutual_friends * (sc.mutual_friends_count::DOUBLE PRECISION / GREATEST(1, sc.mutual_friends_count)) +
                w_interactions * sc.interaction_score +
                w_location * sc.location_score +
                w_common_groups * (sc.common_groups_count::DOUBLE PRECISION / GREATEST(1, sc.common_groups_count)) +
                w_interests * sc.interest_similarity
            ) as final_score,

            -- Raisons de suggestion (pour debug/affichage)
            json_build_object(
                'mutual_friends', sc.mutual_friends_count > 0,
                'recent_interactions', sc.interaction_score > 0.1,
                'same_location', sc.location_score > 0.5,
                'common_groups', sc.common_groups_count > 0,
                'similar_interests', sc.interest_similarity > 0.3
            ) as suggestion_reasons

        FROM scored_candidates sc
        WHERE
            -- Au moins un critère de matching
            sc.mutual_friends_count > 0 OR
            sc.interaction_score > 0.1 OR
            sc.location_score > 0.3 OR
            sc.common_groups_count > 0 OR
            sc.interest_similarity > 0.2
    )
    SELECT
        fs.id::UUID,
        fs.username::TEXT,
        fs.name::TEXT,
        fs.avatar_url::TEXT,
        fs.bio::TEXT,
        fs.city::TEXT,
        fs.region::TEXT,
        fs.country::TEXT,
        fs.mutual_friends_count::INTEGER,
        fs.interaction_score::DOUBLE PRECISION,
        fs.location_score::DOUBLE PRECISION,
        fs.common_groups_count::INTEGER,
        fs.interest_similarity::DOUBLE PRECISION,
        fs.final_score::DOUBLE PRECISION,
        fs.suggestion_reasons::JSON
    FROM final_scoring fs
    ORDER BY fs.final_score DESC, fs.mutual_friends_count DESC, fs.interaction_score DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
