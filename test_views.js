// Script pour tester le système de vues
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testViewsSystem() {
  console.log('🧪 Test du système de vues...');

  try {
    // 1. Vérifier si la table post_views existe
    console.log('1️⃣ Vérification de la table post_views...');
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'post_views');

    if (tableError) {
      console.error('❌ Erreur vérification table:', tableError);
      return;
    }

    if (!tables || tables.length === 0) {
      console.log('❌ Table post_views n\'existe pas');
      return;
    }

    console.log('✅ Table post_views existe');

    // 2. Récupérer un post existant
    console.log('2️⃣ Récupération d\'un post...');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, content')
      .limit(1);

    if (postsError) {
      console.error('❌ Erreur récupération posts:', postsError);
      return;
    }

    if (!posts || posts.length === 0) {
      console.log('❌ Aucun post trouvé');
      return;
    }

    const post = posts[0];
    console.log('✅ Post trouvé:', post.id);

    // 3. Tester l'insertion d'une vue
    console.log('3️⃣ Test insertion vue...');
    const sessionId = `test_session_${Date.now()}`;

    const { data: viewData, error: viewError } = await supabase
      .from('post_views')
      .insert({
        post_id: post.id,
        session_id: sessionId,
        viewed_at: new Date().toISOString()
      })
      .select();

    if (viewError) {
      console.error('❌ Erreur insertion vue:', viewError);
      return;
    }

    console.log('✅ Vue insérée:', viewData);

    // 4. Vérifier les statistiques de vues
    console.log('4️⃣ Vérification statistiques...');
    const { data: stats, error: statsError } = await supabase
      .from('post_view_stats')
      .select('*')
      .eq('post_id', post.id);

    if (statsError) {
      console.error('❌ Erreur récupération stats:', statsError);
      return;
    }

    console.log('✅ Statistiques de vues:', stats);

    // 5. Vérifier la mise à jour du compteur dans posts
    console.log('5️⃣ Vérification compteur posts...');
    const { data: updatedPost, error: postUpdateError } = await supabase
      .from('posts')
      .select('id, views_count')
      .eq('id', post.id)
      .single();

    if (postUpdateError) {
      console.error('❌ Erreur récupération post mis à jour:', postUpdateError);
      return;
    }

    console.log('✅ Post mis à jour:', updatedPost);

    console.log('🎉 Test du système de vues terminé avec succès!');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testViewsSystem();
