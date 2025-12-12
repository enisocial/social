-- Création d'un post vocal de test pour vérifier la récupération
-- Ce post sera visible dans le feed si le système fonctionne

INSERT INTO voice_posts (
  user_id,
  title,
  audio_url,
  audio_duration,
  audio_size_bytes,
  waveform_data
) VALUES (
  '7fe83822-f921-46db-9915-654e84c3f58f', -- L'ID utilisateur de l'utilisateur actuel
  'Post vocal de test - Bonjour le monde !',
  'https://ttgpbtndxwmlxbkxjyyw.supabase.co/storage/v1/object/public/voice-posts/7fe83822-f921-46db-9915-654e84c3f58f/test-audio.mp3',
  5, -- 5 secondes
  102400, -- 100KB
  '[0.1, 0.3, 0.8, 0.6, 0.4, 0.2, 0.1, 0.0, 0.1, 0.2]'::jsonb
) ON CONFLICT DO NOTHING;

-- Création d'un deuxième post vocal de test
INSERT INTO voice_posts (
  user_id,
  title,
  audio_url,
  audio_duration,
  audio_size_bytes,
  waveform_data,
  created_at
) VALUES (
  '7fe83822-f921-46db-9915-654e84c3f58f',
  'Deuxième message vocal - Système opérationnel !',
  'https://ttgpbtndxwmlxbkxjyyw.supabase.co/storage/v1/object/public/voice-posts/7fe83822-f921-46db-9915-654e84c3f58f/test-audio2.mp3',
  8, -- 8 secondes
  153600, -- 150KB
  '[0.2, 0.4, 0.9, 0.7, 0.5, 0.3, 0.2, 0.1, 0.0, 0.2, 0.3, 0.4]'::jsonb,
  NOW() - INTERVAL '2 hours' -- Post plus ancien
) ON CONFLICT DO NOTHING;

-- Création de stats pour les posts de test
INSERT INTO voice_post_likes (voice_post_id, user_id)
SELECT vp.id, '7fe83822-f921-46db-9915-654e84c3f58f'
FROM voice_posts vp
WHERE vp.title LIKE '%test%'
ON CONFLICT (voice_post_id, user_id) DO NOTHING;

INSERT INTO voice_post_listens (voice_post_id, user_id, listen_duration, completed)
SELECT vp.id, '7fe83822-f921-46db-9915-654e84c3f58f', vp.audio_duration, true
FROM voice_posts vp
WHERE vp.title LIKE '%test%'
ON CONFLICT (voice_post_id, user_id) DO NOTHING;

DO $$
DECLARE
  post_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO post_count FROM voice_posts WHERE title LIKE '%test%';
  RAISE NOTICE '✅ Créé % posts vocaux de test', post_count;
  RAISE NOTICE 'Ils devraient maintenant apparaître dans le feed unifié';
END $$;
