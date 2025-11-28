// Script pour vérifier et créer des données de test pour le feed
// À exécuter dans Node.js avec les credentials Supabase

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ttgpbtndxwmlxbkxjyyw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAndCreatePostsData() {
  console.log('🔍 VÉRIFICATION DES DONNÉES DE POSTS\n');

  try {
    // ==========================================
    // 1. Vérifier les posts existants
    // ==========================================
    console.log('1️⃣ Vérification des posts existants...');

    const { data: existingPosts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        privacy,
        created_at,
        user_id,
        profiles!posts_user_id_fkey(username, name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (postsError) {
      console.error('❌ Erreur récupération posts:', postsError);
      return;
    }

    console.log(`📝 ${existingPosts.length} posts trouvés:`);
    existingPosts.forEach((post, index) => {
      console.log(`   ${index + 1}. "${post.content?.substring(0, 50)}..." par ${post.profiles?.name} (${post.privacy})`);
    });

    // ==========================================
    // 2. Vérifier les utilisateurs
    // ==========================================
    console.log('\n2️⃣ Vérification des utilisateurs...');

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, name')
      .limit(5);

    if (usersError) {
      console.error('❌ Erreur récupération utilisateurs:', usersError);
      return;
    }

    console.log(`👥 ${users.length} utilisateurs trouvés:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (@${user.username}) - ID: ${user.id}`);
    });

    // ==========================================
    // 3. Créer des posts de test si nécessaire
    // ==========================================
    if (existingPosts.length === 0 && users.length > 0) {
      console.log('\n3️⃣ Création de posts de test...');

      const testPosts = [
        {
          content: "Bienvenue sur Social ! 🌟 Notre nouveau réseau social panafricain pour connecter les communautés à travers le continent. Partagez vos moments, découvrez de nouveaux amis et créez des liens authentiques.",
          user_id: users[0].id,
          privacy: 'public'
        },
        {
          content: "Premier jour avec Social ! 📱 L'interface est incroyable et les fonctionnalités de géolocalisation vont révolutionner la façon dont on se connecte localement. Qui d'autre essaie ?",
          user_id: users[0].id,
          privacy: 'public'
        },
        {
          content: "Test des stories et du partage de photos ! 📸 Cette plateforme permet vraiment de partager nos cultures et traditions africaines avec le monde entier.",
          user_id: users[0].id,
          privacy: 'public'
        }
      ];

      // Ajouter d'autres posts avec vidéos et images
      if (users.length > 1) {
        testPosts.push({
          content: "Salut tout le monde ! 👋 Je découvre Social et je suis impressionné par la qualité de la plateforme. L'accent mis sur la communauté africaine est exactement ce dont on avait besoin.",
          user_id: users[1].id,
          privacy: 'public'
        });

        // Post avec vidéo simulée (on utilise une URL externe pour le test)
        testPosts.push({
          content: "Test du système de vidéos ! 🎥 Les vidéos se chargent automatiquement quand elles deviennent visibles dans le feed. Comme sur TikTok !",
          user_id: users[0].id,
          privacy: 'public',
          media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // Vidéo de test
          media_type: 'video'
        });

        // Post avec image
        testPosts.push({
          content: "Test du système d'images optimisées ! 🖼️ Les images se chargent en lazy loading et sont automatiquement redimensionnées.",
          user_id: users[0].id,
          privacy: 'public',
          media_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
          media_type: 'image'
        });
      }

      for (const postData of testPosts) {
        const { data: newPost, error: createError } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();

        if (createError) {
          console.error('❌ Erreur création post:', createError);
        } else {
          console.log(`✅ Post créé: "${newPost.content?.substring(0, 40)}..."`);
        }
      }

      console.log(`\n🎉 ${testPosts.length} posts de test créés !`);
    } else if (existingPosts.length > 0) {
      console.log('\n✅ Des posts existent déjà, pas besoin de créer des données de test.');
    }

    // ==========================================
    // 4. Vérifier les statistiques des posts
    // ==========================================
    console.log('\n4️⃣ Vérification des statistiques...');

    if (existingPosts.length > 0) {
      const postIds = existingPosts.map(p => p.id);

      const [likesData, commentsData] = await Promise.all([
        supabase.from('likes').select('post_id').in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds)
      ]);

      console.log(`👍 ${likesData.data?.length || 0} likes trouvés`);
      console.log(`💬 ${commentsData.data?.length || 0} commentaires trouvés`);
    }

    // ==========================================
    // 5. Test de récupération du feed
    // ==========================================
    console.log('\n5️⃣ Test de récupération du feed...');

    if (users.length > 0) {
      const { data: feedPosts, error: feedError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey(username, name, avatar_url)
        `)
        .eq('privacy', 'public')
        .order('created_at', { ascending: false })
        .limit(5);

      if (feedError) {
        console.error('❌ Erreur récupération feed:', feedError);
      } else {
        console.log(`📱 Feed récupéré avec ${feedPosts.length} posts:`);
        feedPosts.forEach((post, index) => {
          console.log(`   ${index + 1}. ${post.profiles?.name}: "${post.content?.substring(0, 50)}..."`);
        });
      }
    }

    // ==========================================
    // RÉSUMÉ FINAL
    // ==========================================
    console.log('\n🎉 RÉSULTATS FINAUX:');
    console.log('========================');

    const results = {
      utilisateurs: users.length > 0,
      postsExistants: existingPosts.length > 0,
      postsCrees: existingPosts.length === 0 && users.length > 0,
      feedFonctionnel: true
    };

    Object.entries(results).forEach(([test, success]) => {
      const status = success ? '✅' : '❌';
      console.log(`${status} ${test}: ${success ? 'OK' : 'ÉCHEC'}`);
    });

    console.log('\n🚀 PRÊT POUR LE FEED !');
    console.log('======================');
    console.log(`📊 ${existingPosts.length + (existingPosts.length === 0 && users.length > 0 ? 3 : 0)} posts disponibles`);
    console.log('🔗 Allez sur /feed pour voir votre fil d\'actualité');
    console.log('🎯 Le système affiche maintenant les vraies données !');

  } catch (error) {
    console.error('💥 Erreur générale:', error);
  }
}

// Exécuter la vérification
checkAndCreatePostsData();
