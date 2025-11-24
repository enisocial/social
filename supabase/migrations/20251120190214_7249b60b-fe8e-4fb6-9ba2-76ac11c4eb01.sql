-- Optimisation performance: Ajout d'index critiques pour accélérer les requêtes

-- Index pour messages (chargement rapide par conversation)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

-- Index pour conversation_participants (requêtes d'amis en ligne)
CREATE INDEX IF NOT EXISTS idx_conv_participants_user 
ON conversation_participants(user_id, conversation_id);

-- Index pour message_status (marquage rapide comme lu)
CREATE INDEX IF NOT EXISTS idx_message_status_user_message 
ON message_status(user_id, message_id, read_at);

-- Index pour user_presence (vérification statut en ligne)
CREATE INDEX IF NOT EXISTS idx_user_presence_online 
ON user_presence(user_id, online, last_seen DESC);

-- Index pour friend_requests (récupération rapide des amis)
CREATE INDEX IF NOT EXISTS idx_friend_requests_users_status 
ON friend_requests(sender_id, receiver_id, status);

-- Index pour typing_status (indicateur de frappe)
CREATE INDEX IF NOT EXISTS idx_typing_status_conv 
ON typing_status(conversation_id, user_id, updated_at DESC);

-- Fonction optimisée pour récupérer les derniers messages d'une conversation
CREATE OR REPLACE FUNCTION get_conversation_messages_optimized(
  p_conversation_id UUID,
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  read BOOLEAN,
  attachment_url TEXT,
  attachment_type TEXT,
  attachment_name TEXT,
  reply_to UUID,
  edited BOOLEAN,
  reactions JSONB,
  pinned_by UUID,
  pinned_at TIMESTAMPTZ,
  sender_name TEXT,
  sender_username TEXT,
  sender_avatar_url TEXT,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.created_at,
    m.read,
    m.attachment_url,
    m.attachment_type,
    m.attachment_name,
    m.reply_to,
    m.edited,
    m.reactions,
    m.pinned_by,
    m.pinned_at,
    p.name as sender_name,
    p.username as sender_username,
    p.avatar_url as sender_avatar_url,
    ms.delivered_at,
    ms.read_at
  FROM messages m
  INNER JOIN profiles p ON p.id = m.sender_id
  LEFT JOIN message_status ms ON ms.message_id = m.id AND ms.user_id = p_user_id
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;