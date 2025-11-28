// Script de test complet pour vérifier que la géolocalisation GPS fonctionne
// À exécuter dans Node.js avec les credentials Supabase

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase (à remplacer par vos vraies valeurs)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ttgpbtndxwmlxbkxjyyw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testGeolocationSystem() {
  console.log('🧪 TEST COMPLET DU SYSTÈME DE GÉOLOCALISATION GPS\n');

  try {
    // ==========================================
    // TEST 1: Vérifier les colonnes GPS
    // ==========================================
    console.log('1️⃣ Test des colonnes GPS...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'profiles')
      .in('column_name', ['latitude', 'longitude', 'last_location_update', 'location_accuracy']);

    if (columnsError) {
      console.error('❌ Erreur colonnes:', columnsError);
      return;
    }

    const expectedColumns = ['latitude', 'longitude', 'last_location_update', 'location_accuracy'];
    const foundColumns = columns.map(col => col.column_name);

    expectedColumns.forEach(col => {
      if (foundColumns.includes(col)) {
        console.log(`✅ Colonne ${col} trouvée`);
      } else {
        console.log(`❌ Colonne ${col} manquante`);
      }
    });

    // ==========================================
    // TEST 2: Vérifier les fonctions SQL
    // ==========================================
    console.log('\n2️⃣ Test des fonctions SQL...');

    // Test calculate_distance
    const { data: distanceResult, error: distanceError } = await supabase
      .rpc('calculate_distance', {
        lat1: 48.8566, // Paris
        lon1: 2.3522,
        lat2: 45.7640, // Lyon
        lon2: 4.8357
      });

    if (distanceError) {
      console.error('❌ Erreur calculate_distance:', distanceError);
    } else {
      console.log(`✅ Distance Paris-Lyon: ${distanceResult.toFixed(1)} km`);
    }

    // ==========================================
    // TEST 3: Vérifier les utilisateurs avec GPS
    // ==========================================
    console.log('\n3️⃣ Recherche d\'utilisateurs avec coordonnées GPS...');

    const { data: usersWithGPS, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, name, latitude, longitude, city, region, country, last_location_update')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(5);

    if (usersError) {
      console.error('❌ Erreur récupération utilisateurs:', usersError);
    } else {
      console.log(`✅ ${usersWithGPS.length} utilisateurs avec coordonnées GPS trouvés:`);
      usersWithGPS.forEach(user => {
        console.log(`   - ${user.username}: ${user.latitude?.toFixed(4)}, ${user.longitude?.toFixed(4)} (${user.city}, ${user.country})`);
      });
    }

    // ==========================================
    // TEST 4: Tester find_nearby_users si des utilisateurs existent
    // ==========================================
    if (usersWithGPS && usersWithGPS.length > 0) {
      console.log('\n4️⃣ Test de find_nearby_users...');

      const firstUser = usersWithGPS[0];
      const { data: nearbyUsers, error: nearbyError } = await supabase
        .rpc('find_nearby_users', {
          user_lat: firstUser.latitude,
          user_lon: firstUser.longitude,
          radius_km: 100,
          exclude_user_id: firstUser.id,
          limit_count: 10
        });

      if (nearbyError) {
        console.error('❌ Erreur find_nearby_users:', nearbyError);
      } else {
        console.log(`✅ Utilisateurs proches de ${firstUser.username}: ${nearbyUsers.length} trouvés`);
        nearbyUsers.forEach(user => {
          console.log(`   - ${user.name}: ${user.distance?.toFixed(1)} km`);
        });
      }

      // ==========================================
      // TEST 5: Tester get_location_score entre deux utilisateurs
      // ==========================================
      if (usersWithGPS.length >= 2) {
        console.log('\n5️⃣ Test de get_location_score...');

        const user1 = usersWithGPS[0];
        const user2 = usersWithGPS[1];

        const { data: locationScore, error: scoreError } = await supabase
          .rpc('get_location_score', {
            p_candidate_id: user2.id,
            p_user_id: user1.id
          });

        if (scoreError) {
          console.error('❌ Erreur get_location_score:', scoreError);
        } else {
          console.log(`✅ Score de localisation entre ${user1.username} et ${user2.username}: ${locationScore}`);
        }
      }
    }

    // ==========================================
    // TEST 6: Tester get_advanced_friend_suggestions
    // ==========================================
    console.log('\n6️⃣ Test des suggestions d\'amis avec géolocalisation...');

    // Récupérer un utilisateur pour tester
    const { data: testUser, error: userError } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1)
      .single();

    if (!userError && testUser) {
      const { data: suggestions, error: suggestionsError } = await supabase
        .rpc('get_advanced_friend_suggestions', {
          p_user_id: testUser.id,
          p_limit: 3,
          p_offset: 0
        });

      if (suggestionsError) {
        console.error('❌ Erreur suggestions d\'amis:', suggestionsError);
      } else {
        console.log(`✅ ${suggestions.length} suggestions d\'amis pour ${testUser.username}:`);
        suggestions.forEach(suggestion => {
          console.log(`   - ${suggestion.name} (score: ${suggestion.final_score?.toFixed(3)}, location: ${suggestion.location_score?.toFixed(3)})`);
        });
      }
    }

    // ==========================================
    // RÉSUMÉ FINAL
    // ==========================================
    console.log('\n🎉 RÉSULTATS DU TEST:');
    console.log('========================');

    const results = {
      colonnesGPS: foundColumns.length === expectedColumns.length,
      fonctionDistance: !distanceError,
      utilisateursGPS: usersWithGPS && usersWithGPS.length > 0,
      fonctionNearby: nearbyUsers !== undefined,
      fonctionScore: locationScore !== undefined,
      suggestionsAmis: suggestions && suggestions.length > 0
    };

    Object.entries(results).forEach(([test, success]) => {
      const status = success ? '✅' : '❌';
      console.log(`${status} ${test}: ${success ? 'OK' : 'ÉCHEC'}`);
    });

    const successCount = Object.values(results).filter(Boolean).length;
    console.log(`\n📊 Score global: ${successCount}/${Object.keys(results).length} tests réussis`);

    if (successCount === Object.keys(results).length) {
      console.log('\n🎊 FÉLICITATIONS ! Le système de géolocalisation GPS fonctionne parfaitement !');
    } else {
      console.log('\n⚠️ Certains tests ont échoué. Vérifiez les commandes SQL exécutées.');
    }

  } catch (error) {
    console.error('💥 Erreur générale du test:', error);
  }
}

// Exécuter le test
testGeolocationSystem();
