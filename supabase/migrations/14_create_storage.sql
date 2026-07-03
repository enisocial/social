-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Posts
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Stories
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Messages
INSERT INTO storage.buckets (id, name, public)
VALUES ('messages', 'messages', false)
ON CONFLICT (id) DO NOTHING;

-- Groups
INSERT INTO storage.buckets (id, name, public)
VALUES ('groups', 'groups', true)
ON CONFLICT (id) DO NOTHING;

-- Pages
INSERT INTO storage.buckets (id, name, public)
VALUES ('pages', 'pages', true)
ON CONFLICT (id) DO NOTHING;

-- Events
INSERT INTO storage.buckets (id, name, public)
VALUES ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

-- Documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Voice posts
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-posts', 'voice-posts', true)
ON CONFLICT (id) DO NOTHING;

-- Chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;