-- ==========================================
-- Daily Review Platform - Database Schema
-- Backend: Supabase (PostgreSQL)
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLE: profiles
-- Extended user profiles with admin flag
-- ==========================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_admin ON profiles(is_admin) WHERE is_admin = true;

-- ==========================================
-- TABLE: reviews
-- Daily review content (one per date)
-- ==========================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  intro JSONB,  -- {heading: string, content: string}
  people JSONB NOT NULL,  -- Array of {name, emoji, role, content: []}
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_reviews_date ON reviews(date DESC);
CREATE INDEX idx_reviews_author ON reviews(author_id);

-- ==========================================
-- TABLE: likes
-- User likes on person cards
-- ==========================================
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_date DATE NOT NULL,
  person_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_like UNIQUE(user_id, review_date, person_name)
);

CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_likes_review ON likes(review_date, person_name);
CREATE INDEX idx_likes_date ON likes(created_at DESC);

-- ==========================================
-- TABLE: comments
-- Comments on person cards
-- ==========================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_date DATE NOT NULL,
  person_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_review ON comments(review_date, person_name, created_at DESC);
CREATE INDEX idx_comments_user ON comments(user_id, created_at DESC);

-- ==========================================
-- TABLE: favorites
-- User favorites for person cards
-- ==========================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_date DATE NOT NULL,
  person_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_favorite UNIQUE(user_id, review_date, person_name)
);

CREATE INDEX idx_favorites_user ON favorites(user_id, created_at DESC);
CREATE INDEX idx_favorites_review ON favorites(review_date, person_name);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Profiles: Public read, own write
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Reviews: Everyone can read, only admins can write
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update reviews"
  ON reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete reviews"
  ON reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Likes: Users can view all, manage own
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON likes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own likes"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);

-- Comments: Everyone can view, authenticated users can write, own edit/delete
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- Favorites: Users can view own, manage own
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on reviews
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on comments
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    COALESCE(NEW.raw_user_meta_data->>'bio', NULL)
  );
  RETURN NEW;
END;
$$LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- HELPER VIEWS
-- ==========================================

-- View: Person card statistics
CREATE OR REPLACE VIEW person_card_stats AS
SELECT 
  review_date,
  person_name,
  COUNT(DISTINCT l.user_id) as like_count,
  COUNT(DISTINCT c.id) as comment_count,
  COUNT(DISTINCT f.user_id) as favorite_count
FROM reviews r
CROSS JOIN LATERAL jsonb_array_elements(r.people) AS person
LEFT JOIN likes l ON l.review_date = r.date AND l.person_name = (person->>'name')
LEFT JOIN comments c ON c.review_date = r.date AND c.person_name = (person->>'name')
LEFT JOIN favorites f ON f.review_date = r.date AND f.person_name = (person->>'name')
WHERE person->>'name' IS NOT NULL
GROUP BY review_date, person_name;

-- View: User interaction summary
CREATE OR REPLACE VIEW user_interaction_stats AS
SELECT 
  u.id as user_id,
  p.username,
  COUNT(DISTINCT l.id) as total_likes,
  COUNT(DISTINCT c.id) as total_comments,
  COUNT(DISTINCT f.id) as total_favorites
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN likes l ON l.user_id = u.id
LEFT JOIN comments c ON c.user_id = u.id
LEFT JOIN favorites f ON f.user_id = u.id
GROUP BY u.id, p.username;

-- ==========================================
-- INITIAL DATA (Optional - run after setup)
-- ==========================================

-- Create first admin user (replace with your email)
-- Run this AFTER you've signed up with your email
-- UPDATE profiles SET is_admin = true WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- ==========================================
-- COMPLETE!
-- ==========================================
-- Run this entire script in Supabase SQL Editor
-- Then configure your frontend with the Supabase URL and anon key
