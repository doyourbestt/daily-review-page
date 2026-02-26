-- ==========================================
-- 元气复盘局 Social Platform
-- Database Schema for Supabase
-- Version: 2.0.0
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES TABLE
-- ==========================================
-- Extends auth.users with additional profile information

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = TRUE;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 2. REVIEWS TABLE
-- ==========================================
-- Stores daily review content

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  intro JSONB,
  people JSONB NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(date DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_author ON reviews(author_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 3. LIKES TABLE
-- ==========================================
-- Stores user likes on specific person cards

CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_date DATE NOT NULL,
  person_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_like UNIQUE(user_id, review_date, person_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_review ON likes(review_date, person_name);
CREATE INDEX IF NOT EXISTS idx_likes_created ON likes(created_at DESC);

-- ==========================================
-- 4. COMMENTS TABLE
-- ==========================================
-- Stores user comments on person cards

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_date DATE NOT NULL,
  person_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_review ON comments(review_date, person_name);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 5. FAVORITES TABLE
-- ==========================================
-- Stores user favorites (saved cards)

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_date DATE NOT NULL,
  person_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_favorite UNIQUE(user_id, review_date, person_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_review ON favorites(review_date, person_name);
CREATE INDEX IF NOT EXISTS idx_favorites_created ON favorites(created_at DESC);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- ===== PROFILES POLICIES =====

-- Everyone can view all profiles
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Anyone can view profiles" 
  ON profiles FOR SELECT 
  USING (true);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (handled by trigger, but policy needed)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ===== REVIEWS POLICIES =====

-- Everyone (including anonymous) can read reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews" 
  ON reviews FOR SELECT 
  USING (true);

-- Only admins can insert reviews
DROP POLICY IF EXISTS "Admins can insert reviews" ON reviews;
CREATE POLICY "Admins can insert reviews" 
  ON reviews FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Only admins can update reviews
DROP POLICY IF EXISTS "Admins can update reviews" ON reviews;
CREATE POLICY "Admins can update reviews" 
  ON reviews FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Only admins can delete reviews
DROP POLICY IF EXISTS "Admins can delete reviews" ON reviews;
CREATE POLICY "Admins can delete reviews" 
  ON reviews FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- ===== LIKES POLICIES =====

-- Everyone can view likes (for counts)
DROP POLICY IF EXISTS "Anyone can view likes" ON likes;
CREATE POLICY "Anyone can view likes" 
  ON likes FOR SELECT 
  USING (true);

-- Users can insert their own likes
DROP POLICY IF EXISTS "Users can insert their own likes" ON likes;
CREATE POLICY "Users can insert their own likes" 
  ON likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;
CREATE POLICY "Users can delete their own likes" 
  ON likes FOR DELETE 
  USING (auth.uid() = user_id);

-- ===== COMMENTS POLICIES =====

-- Everyone can view comments
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
CREATE POLICY "Anyone can view comments" 
  ON comments FOR SELECT 
  USING (true);

-- Users can insert their own comments
DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;
CREATE POLICY "Users can insert their own comments" 
  ON comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
CREATE POLICY "Users can update their own comments" 
  ON comments FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
CREATE POLICY "Users can delete their own comments" 
  ON comments FOR DELETE 
  USING (auth.uid() = user_id);

-- ===== FAVORITES POLICIES =====

-- Everyone can view favorites (for public profile pages)
DROP POLICY IF EXISTS "Anyone can view favorites" ON favorites;
CREATE POLICY "Anyone can view favorites" 
  ON favorites FOR SELECT 
  USING (true);

-- Users can insert their own favorites
DROP POLICY IF EXISTS "Users can insert their own favorites" ON favorites;
CREATE POLICY "Users can insert their own favorites" 
  ON favorites FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
DROP POLICY IF EXISTS "Users can delete their own favorites" ON favorites;
CREATE POLICY "Users can delete their own favorites" 
  ON favorites FOR DELETE 
  USING (auth.uid() = user_id);

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to get like count for a person card
CREATE OR REPLACE FUNCTION get_like_count(p_review_date DATE, p_person_name TEXT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM likes 
  WHERE review_date = p_review_date 
  AND person_name = p_person_name;
$$ LANGUAGE SQL STABLE;

-- Function to get comment count for a person card
CREATE OR REPLACE FUNCTION get_comment_count(p_review_date DATE, p_person_name TEXT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM comments 
  WHERE review_date = p_review_date 
  AND person_name = p_person_name;
$$ LANGUAGE SQL STABLE;

-- Function to check if user has liked a card
CREATE OR REPLACE FUNCTION has_user_liked(p_user_id UUID, p_review_date DATE, p_person_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM likes 
    WHERE user_id = p_user_id 
    AND review_date = p_review_date 
    AND person_name = p_person_name
  );
$$ LANGUAGE SQL STABLE;

-- Function to check if user has favorited a card
CREATE OR REPLACE FUNCTION has_user_favorited(p_user_id UUID, p_review_date DATE, p_person_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM favorites 
    WHERE user_id = p_user_id 
    AND review_date = p_review_date 
    AND person_name = p_person_name
  );
$$ LANGUAGE SQL STABLE;

-- ==========================================
-- INITIAL DATA (Optional - for testing)
-- ==========================================

-- Note: You can manually create an admin user after signup:
-- UPDATE profiles SET is_admin = TRUE WHERE email = 'your-email@example.com';

-- ==========================================
-- REALTIME CONFIGURATION
-- ==========================================

-- Enable realtime for tables that need it
-- Note: This is done via Supabase Dashboard > Database > Replication
-- Or via SQL:

-- For comments (most important for real-time)
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- For likes (nice to have)
ALTER PUBLICATION supabase_realtime ADD TABLE likes;

-- For favorites (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE favorites;

-- ==========================================
-- END OF SCHEMA
-- ==========================================

-- To verify the schema, run:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- To check RLS policies:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- To make your first user an admin (replace with actual email):
-- UPDATE profiles SET is_admin = TRUE WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
