import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('🔔 Fonction count-unread-messages chargée')

Deno.serve(async (req: Request) => {
  // Gestion CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Créer le client Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Récupérer l'utilisateur connecté
    const authHeader = req.headers.get('Authorization')!
    if (!authHeader) {
      throw new Error('Authorization header manquant')
    }

    // Compter les messages non lus pour l'utilisateur
    const { data: conversations, error: convError } = await supabaseClient
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', authHeader) // TODO: Extraire user_id depuis JWT

    if (convError) throw convError

    let totalUnread = 0
    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map((c: any) => c.conversation_id)

      const { count, error: countError } = await supabaseClient
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('read', false)
        .neq('sender_id', authHeader) // TODO: Extraire user_id depuis JWT

      if (countError) throw countError
      totalUnread = count || 0
    }

    return new Response(
      JSON.stringify({
        success: true,
        unreadCount: totalUnread
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error: unknown) {
    console.error('❌ Erreur count-unread-messages:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
