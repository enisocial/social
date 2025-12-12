-- SUPPRESSION DE LA SALLE DE TEST
-- Pour permettre la création de vrais Live Audio

DELETE FROM live_audio_participants
WHERE room_id = '550e8400-e29b-41d4-a716-446655440000';

DELETE FROM live_rooms
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Vérification
SELECT
    'NETTOYAGE TERMINÉ' as status,
    (SELECT COUNT(*) FROM live_rooms) as salles_restantes,
    (SELECT COUNT(*) FROM live_audio_participants) as participants_restants,
    NOW() as date_nettoyage;
