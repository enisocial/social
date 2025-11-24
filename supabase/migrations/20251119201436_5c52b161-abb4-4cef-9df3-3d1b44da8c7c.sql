-- Ajouter des colonnes pour les nouvelles fonctionnalités de posts
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS background_color TEXT,
ADD COLUMN IF NOT EXISTS feeling TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS link_preview JSONB,
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;

-- Table pour les médias multiples (plusieurs photos/vidéos par post)
CREATE TABLE IF NOT EXISTS post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'gif')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour les tags d'amis dans les posts
CREATE TABLE IF NOT EXISTS post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tagged_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, tagged_user_id)
);

-- Table pour les brouillons de posts
CREATE TABLE IF NOT EXISTS post_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_data JSONB,
  privacy TEXT DEFAULT 'public',
  background_color TEXT,
  feeling TEXT,
  location TEXT,
  tagged_users JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tagged_user ON post_tags(tagged_user_id);
CREATE INDEX IF NOT EXISTS idx_post_drafts_user ON post_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Enable RLS
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour post_media
CREATE POLICY "Post media viewable by everyone"
  ON post_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_media.post_id 
      AND (posts.privacy = 'public' OR posts.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can add media to their posts"
  ON post_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_media.post_id 
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their post media"
  ON post_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_media.post_id 
      AND posts.user_id = auth.uid()
    )
  );

-- RLS Policies pour post_tags
CREATE POLICY "Post tags viewable by everyone"
  ON post_tags FOR SELECT
  USING (true);

CREATE POLICY "Users can tag friends in posts"
  ON post_tags FOR INSERT
  WITH CHECK (auth.uid() = tagged_by);

CREATE POLICY "Users can remove tags"
  ON post_tags FOR DELETE
  USING (auth.uid() = tagged_by OR auth.uid() = tagged_user_id);

-- RLS Policies pour post_drafts
CREATE POLICY "Users can view their own drafts"
  ON post_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create drafts"
  ON post_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their drafts"
  ON post_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their drafts"
  ON post_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger pour auto-update updated_at sur post_drafts
CREATE OR REPLACE FUNCTION update_post_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_drafts_updated_at_trigger
  BEFORE UPDATE ON post_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_drafts_updated_at();

-- Fonction pour publier un post programmé
CREATE OR REPLACE FUNCTION publish_scheduled_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE posts
  SET scheduled_for = NULL
  WHERE scheduled_for IS NOT NULL
    AND scheduled_for <= now();
END;
$$;