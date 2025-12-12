import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Liste de mots interdits
const BANNED_WORDS = [
  'spam', 'scam', 'idiot', 'stupide', 'connard', 'merde',
  // Ajoutez plus de mots selon vos besoins
];

// Détection de spam (messages répétitifs)
const recentMessages = new Map<string, string[]>();

function cleanupOldMessages() {
  const now = Date.now();
  for (const [userId, messages] of recentMessages.entries()) {
    if (messages.length === 0) {
      recentMessages.delete(userId);
    }
  }
}

function isSpam(userId: string, message: string): boolean {
  const userMessages = recentMessages.get(userId) || [];
  const similarCount = userMessages.filter(msg => msg === message).length;
  
  if (similarCount >= 3) {
    return true;
  }
  
  userMessages.push(message);
  if (userMessages.length > 10) {
    userMessages.shift();
  }
  recentMessages.set(userId, userMessages);
  
  return false;
}

function containsBannedWords(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return BANNED_WORDS.some(word => lowerMessage.includes(word));
}

function isSuspiciousLink(message: string): boolean {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = message.match(urlPattern);
  
  if (!urls) return false;
  
  // Vérifier si le message contient plusieurs liens
  if (urls.length > 2) return true;
  
  // Vérifier si ce sont des domaines suspects
  const suspiciousDomains = ['bit.ly', 't.co', 'tinyurl.com'];
  return urls.some(url => 
    suspiciousDomains.some(domain => url.includes(domain))
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, streamId } = await req.json();

    console.log('Moderating message:', { message, userId, streamId });

    // Vérifications de modération
    const violations: string[] = [];

    // 1. Vérifier les mots interdits
    if (containsBannedWords(message)) {
      violations.push('banned_words');
    }

    // 2. Vérifier le spam
    if (isSpam(userId, message)) {
      violations.push('spam');
    }

    // 3. Vérifier les liens suspects
    if (isSuspiciousLink(message)) {
      violations.push('suspicious_link');
    }

    // 4. Vérifier la longueur excessive
    if (message.length > 500) {
      violations.push('too_long');
    }

    // 5. Vérifier les majuscules excessives
    const upperCaseCount = (message.match(/[A-Z]/g) || []).length;
    if (upperCaseCount > message.length * 0.7 && message.length > 10) {
      violations.push('excessive_caps');
    }

    cleanupOldMessages();

    const isApproved = violations.length === 0;

    // Si le message est rejeté, on peut bannir temporairement l'utilisateur
    if (!isApproved && violations.length > 2) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Créer une entrée dans la moderation_queue
      await supabase.from('moderation_queue').insert({
        content_id: userId,
        content_type: 'live_chat_message',
        status: 'flagged',
        reason: violations.join(', '),
        priority: 'high',
        metadata: {
          stream_id: streamId,
          message: message,
          violations: violations
        }
      });
    }

    return new Response(
      JSON.stringify({ 
        approved: isApproved,
        violations: violations,
        message: isApproved ? 'Message approved' : 'Message rejected'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in moderate-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});