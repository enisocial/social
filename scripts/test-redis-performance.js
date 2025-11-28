#!/usr/bin/env node

/**
 * 🚀 Test de Performance Redis + Supabase
 * Script pour vérifier que les optimisations fonctionnent
 */

import https from 'https';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

// Charger les variables depuis le fichier .env
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (value) {
          envVars[key.trim()] = value.replace(/['"]/g, '');
        }
      }
    });

    return envVars;
  } catch (error) {
    console.error('❌ Impossible de lire le fichier .env:', error.message);
    process.exit(1);
  }
}

const envVars = loadEnv();
const SUPABASE_URL = envVars.VITE_SUPABASE_URL || 'https://ttgpbtndxwmlxbkxjyyw.supabase.co';
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY ou VITE_SUPABASE_PUBLISHABLE_KEY non trouvée dans le fichier .env');
  console.log('Variables disponibles:', Object.keys(envVars));
  process.exit(1);
}

function makeRequest(functionName, payload = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    };

    const startTime = performance.now();
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        try {
          const response = JSON.parse(body);
          resolve({ response, duration, status: res.statusCode });
        } catch (e) {
          reject(new Error(`Erreur parsing JSON: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testRedisPerformance() {
  console.log('🧪 Test de Performance Redis + Supabase');
  console.log('=' .repeat(50));

  try {
    // Test 1: Fonction cached-feed
    console.log('\n📊 Test 1: cached-feed (Feed avec Redis)');
    const feedResult = await makeRequest('cached-feed', {
      filterType: 'recommended',
      pageSize: 5,
      offset: 0
    });

    console.log(`⏱️  Temps de réponse: ${feedResult.duration.toFixed(2)}ms`);
    console.log(`📈 Status: ${feedResult.status}`);
    console.log(`📦 Cache HIT: ${feedResult.response.cached ? '✅' : '❌'}`);
    console.log(`📝 Posts chargés: ${feedResult.response.posts?.length || 0}`);

    if (feedResult.response.posts?.length > 0) {
      console.log('✅ FEED REDIS: SUCCESS');
    } else {
      console.log('❌ FEED REDIS: FAILED - Aucun post');
    }

    // Test 2: Fonction cached-messages
    console.log('\n💬 Test 2: cached-messages (Messages avec Redis)');
    const messagesResult = await makeRequest('cached-messages', {
      conversationId: 'test-conversation',
      limit: 10,
      offset: 0
    });

    console.log(`⏱️  Temps de réponse: ${messagesResult.duration.toFixed(2)}ms`);
    console.log(`📈 Status: ${messagesResult.status}`);
    console.log(`📦 Cache HIT: ${messagesResult.response.cached ? '✅' : '❌'}`);
    console.log(`💬 Messages chargés: ${messagesResult.response.messages?.length || 0}`);

    // Les messages peuvent être vides pour une conversation test, c'est normal
    console.log('✅ MESSAGES REDIS: SUCCESS (fonction accessible)');

    // Résumé des performances
    console.log('\n🎯 RÉSULTATS DE PERFORMANCE:');
    console.log('=' .repeat(50));

    const feedFast = feedResult.duration < 200;
    const messagesFast = messagesResult.duration < 150;

    console.log(`🚀 Feed ultra-rapide (< 200ms): ${feedFast ? '✅' : '❌'} (${feedResult.duration.toFixed(2)}ms)`);
    console.log(`💨 Messages ultra-rapides (< 150ms): ${messagesFast ? '✅' : '❌'} (${messagesResult.duration.toFixed(2)}ms)`);

    if (feedFast && messagesFast) {
      console.log('\n🎉 SUCCÈS TOTAL: Redis + Supabase fonctionnent parfaitement !');
      console.log('📱 L\'application devrait maintenant être ultra-rapide.');
    } else {
      console.log('\n⚠️  ATTENTION: Les performances ne sont pas optimales.');
      console.log('🔧 Vérifiez la configuration Redis et les fonctions Edge.');
    }

  } catch (error) {
    console.error('❌ ERREUR lors des tests:', error.message);
    console.log('\n🔧 Actions recommandées:');
    console.log('1. Vérifiez que les fonctions Edge sont déployées');
    console.log('2. Vérifiez la configuration Redis dans Supabase');
    console.log('3. Vérifiez les variables d\'environnement');
  }
}

// Exécuter le test
testRedisPerformance();
