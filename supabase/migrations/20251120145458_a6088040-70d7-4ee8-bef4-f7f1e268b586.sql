-- Nettoyer les triggers en conflit sur la table messages
DROP TRIGGER IF EXISTS trigger_update_unread ON messages;
DROP TRIGGER IF EXISTS trigger_update_unread_count ON messages;
DROP TRIGGER IF EXISTS on_message_insert_notify ON messages;

-- Supprimer les anciennes fonctions en conflit
DROP FUNCTION IF EXISTS update_unread_count() CASCADE;
DROP FUNCTION IF EXISTS update_unread_count_on_insert() CASCADE;
DROP FUNCTION IF EXISTS notify_new_message() CASCADE;

-- Vérifier que les bons triggers existent
-- Le trigger message_insert_increment_unread devrait gérer l'incrémentation
-- Le trigger message_status_update_unread_count devrait gérer la décrémentation