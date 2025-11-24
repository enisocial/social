-- 1. Supprimer le profil "User" de l'admin
DELETE FROM profiles WHERE id = '55d1b349-f39d-4c7d-b55c-e870006f1da9';

-- 2. Créer un profil système minimal pour l'admin (nécessaire pour RLS)
INSERT INTO profiles (id, username, name, bio)
VALUES (
  '55d1b349-f39d-4c7d-b55c-e870006f1da9',
  'system_admin',
  'Système',
  'Compte administrateur'
);

-- 3. Ajouter une fonction pour filtrer les admins des résultats utilisateur
CREATE OR REPLACE FUNCTION is_admin_user(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  )
$$;

-- 4. Mettre à jour la fonction get_smart_feed pour exclure les admins
-- (déjà fait, elle exclut admin_moderator_users)

-- 5. Mettre à jour get_friend_suggestions pour exclure les admins 
-- (déjà fait, elle exclut admin_moderator_users)

-- 6. Mettre à jour get_smart_friend_suggestions pour exclure les admins
-- (déjà fait, elle exclut admin_moderator_users)