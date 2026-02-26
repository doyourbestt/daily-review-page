# Social Platform Transformation Specification
## Xiaohongshu-Inspired Daily Review Platform

**Project Name**: 元气复盘局 Social Platform  
**Version**: 2.0.0 (Full-Stack Transformation)  
**Date**: 2026-02-11  
**Author**: Matrix Agent

---

## 🎯 Project Vision

Transform the static daily review page into a vibrant social platform inspired by Xiaohongshu (Little Red Book), featuring:
- **Real Authentication**: User login/registration with Supabase Auth
- **Network Interactions**: Cloud-synced likes, comments, favorites
- **Admin System**: Content management for authorized users
- **Real-time Updates**: Live interaction updates across all users
- **Modern UX**: Xiaohongshu-inspired clean, friendly interface

---

## 🎨 Design System

### Color Palette (Xiaohongshu-Inspired)

**PRIMARY CONSTRAINT**: **NO BLUE OR PURPLE HUES**

```css
/* Primary Brand Colors */
--xhs-red: #FF2442;              /* Xiaohongshu signature red */
--xhs-red-hover: #E61E3C;        /* Darker hover state */
--xhs-red-light: #FFE5EA;        /* Light background tint */

/* Background Colors */
--xhs-bg: #FFFFFF;               /* Main background */
--xhs-bg-secondary: #F8F8F8;     /* Secondary background */
--xhs-card: #FFFFFF;             /* Card background */
--xhs-overlay: rgba(0,0,0,0.6);  /* Modal overlay */

/* Text Colors */
--xhs-text: #333333;             /* Primary text */
--xhs-text-secondary: #666666;   /* Secondary text */
--xhs-text-light: #999999;       /* Light text */
--xhs-text-disabled: #CCCCCC;    /* Disabled text */

/* Border & Divider */
--xhs-border: #EEEEEE;           /* Light border */
--xhs-divider: #F0F0F0;          /* Divider line */

/* Status Colors (Warm Palette) */
--success: #52C41A;              /* Success green */
--warning: #FAAD14;              /* Warning amber */
--error: #F5222D;                /* Error red */
--info: #FA8C16;                 /* Info orange */

/* Shadows */
--shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
--shadow-md: 0 4px 16px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
--shadow-card-hover: 0 6px 20px rgba(255,36,66,0.1);
```

### Typography

```css
/* Font Family */
--font-primary: 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
--font-mono: 'SF Mono', 'Monaco', 'Consolas', monospace;

/* Font Sizes (Mobile-First) */
--text-xs: 12px;     /* Labels, meta info */
--text-sm: 14px;     /* Body text, comments */
--text-base: 16px;   /* Standard text */
--text-lg: 18px;     /* Subheadings */
--text-xl: 20px;     /* Card titles */
--text-2xl: 24px;    /* Section titles */
--text-3xl: 32px;    /* Page headings */

/* Line Heights */
--leading-tight: 1.2;
--leading-normal: 1.5;
--leading-relaxed: 1.75;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing & Layout

```css
/* Spacing Scale (4px base) */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;

/* Container */
--container-max: 1200px;
--container-padding: 16px;

/* Border Radius */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-full: 9999px;

/* Z-index Layers */
--z-base: 1;
--z-dropdown: 100;
--z-sticky: 200;
--z-modal: 1000;
--z-toast: 2000;
```

---

## 🏗️ Architecture

### Technology Stack

**Frontend**:
- Pure HTML5, CSS3, Vanilla JavaScript (no framework needed)
- GSAP for animations
- Day.js for time formatting

**Backend**:
- Supabase (PostgreSQL + Auth + Realtime + Storage)
- Row Level Security (RLS) for data protection

**CDN Dependencies**:
```html
<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Day.js -->
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/plugin/relativeTime.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/plugin/updateLocale.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/locale/zh-cn.js"></script>

<!-- GSAP (already included) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
```

### File Structure

```
daily-review-page/
├── index.html                    # Main application
├── setup.html                    # Supabase setup wizard
├── config.js                     # Supabase config (user-generated)
├── spec.md                       # This document
├── README.md                     # Setup instructions
├── supabase/
│   ├── schema.sql               # Database schema + RLS
│   └── seed.sql                 # Optional seed data
├── css/
│   ├── xhs-base.css            # Base styles + design system
│   ├── xhs-components.css      # Component styles
│   ├── xhs-auth.css            # Authentication UI
│   └── xhs-admin.css           # Admin panel
├── js/
│   ├── config-template.js      # Config template
│   ├── supabase-client.js      # Supabase initialization
│   ├── auth.js                 # Authentication logic
│   ├── data.js                 # Data fetching/mutations
│   ├── interactions.js         # Like/comment/favorite
│   ├── admin.js                # Admin panel
│   ├── realtime.js             # Real-time subscriptions
│   └── app.js                  # Main app logic
├── data/
│   └── reviews.json            # Initial data (for migration)
└── images/
    └── (existing images)
```

---

## 🗄️ Database Schema

### Tables

#### 1. `reviews`
Stores daily review content.

```sql
CREATE TABLE reviews (
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

CREATE INDEX idx_reviews_date ON reviews(date DESC);
CREATE INDEX idx_reviews_author ON reviews(author_id);
```

#### 2. `likes`
Stores user likes on specific person cards.

```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_date DATE NOT NULL,
  person_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, review_date, person_name)
);

CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_likes_review ON likes(review_date, person_name);
```

#### 3. `comments`
Stores user comments on person cards.

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_date DATE NOT NULL,
  person_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_review ON comments(review_date, person_name);
CREATE INDEX idx_comments_created ON comments(created_at DESC);
```

#### 4. `favorites`
Stores user favorites (saved cards).

```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_date DATE NOT NULL,
  person_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, review_date, person_name)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
```

#### 5. `profiles`
User profile information (extends auth.users).

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Reviews: Everyone can read, only admins can write
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Admins can insert reviews" ON reviews FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can update reviews" ON reviews FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can delete reviews" ON reviews FOR DELETE 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Likes: Users can read all, create/delete their own
CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own likes" ON likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON likes FOR DELETE 
  USING (auth.uid() = user_id);

-- Comments: Users can read all, create their own, update/delete own
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own comments" ON comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE 
  USING (auth.uid() = user_id);

-- Favorites: Users can read all, create/delete their own
CREATE POLICY "Anyone can view favorites" ON favorites FOR SELECT USING (true);
CREATE POLICY "Users can insert their own favorites" ON favorites FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorites" ON favorites FOR DELETE 
  USING (auth.uid() = user_id);

-- Profiles: Everyone can read, users can update their own
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE 
  USING (auth.uid() = id);
```

---

## 🔐 Authentication System

### User Flow

1. **Guest Mode** (Default)
   - Can view all content
   - Cannot interact (like/comment/favorite)
   - "登录" button in header

2. **Login/Register**
   - Click "登录" → Modal appears
   - Tab switch: 登录 ↔ 注册
   - Email/password authentication
   - Optional: Social login (Google)

3. **Authenticated State**
   - Header shows: Avatar + Username
   - Can interact with all features
   - Dropdown menu: Profile, Settings, Logout

4. **Admin State**
   - All authenticated features +
   - "发布复盘" button in header
   - Edit/delete buttons on reviews

### Auth UI Components

**Login Modal**:
```html
<div class="auth-modal-overlay">
  <div class="auth-modal">
    <button class="auth-modal-close">×</button>
    
    <div class="auth-tabs">
      <button class="auth-tab active" data-tab="login">登录</button>
      <button class="auth-tab" data-tab="register">注册</button>
    </div>
    
    <!-- Login Form -->
    <form class="auth-form" id="loginForm">
      <h2>欢迎回来</h2>
      <input type="email" placeholder="邮箱" required>
      <input type="password" placeholder="密码" required>
      <label class="checkbox-label">
        <input type="checkbox" name="remember"> 记住我
      </label>
      <button type="submit" class="auth-submit">登录</button>
    </form>
    
    <!-- Register Form -->
    <form class="auth-form hidden" id="registerForm">
      <h2>加入我们</h2>
      <input type="text" placeholder="用户名" required>
      <input type="email" placeholder="邮箱" required>
      <input type="password" placeholder="密码 (至少6位)" required>
      <button type="submit" class="auth-submit">注册</button>
    </form>
    
    <div class="auth-error hidden"></div>
  </div>
</div>
```

**User Header**:
```html
<!-- Logged out -->
<button class="login-btn">登录</button>

<!-- Logged in -->
<div class="user-menu">
  <button class="user-avatar">
    <img src="avatar.jpg" alt="User">
    <span>Username</span>
  </button>
  <div class="user-dropdown hidden">
    <a href="#profile">个人主页</a>
    <a href="#settings">设置</a>
    <button class="logout-btn">退出登录</button>
  </div>
</div>

<!-- Admin -->
<button class="admin-create-btn">➕ 发布复盘</button>
```

---

## 🎴 Card Design (Xiaohongshu Style)

### Person Card Structure

```html
<div class="person-card" data-review-date="2026-02-11" data-person-name="喵喵">
  <!-- Card Header -->
  <div class="card-header">
    <div class="card-avatar">
      <div class="avatar-emoji">🐱</div>
    </div>
    <div class="card-meta">
      <h3 class="card-name">喵喵</h3>
      <span class="card-role">宝藏分享官</span>
    </div>
    <button class="card-favorite" aria-label="收藏">
      <svg>...</svg>
    </button>
  </div>
  
  <!-- Card Content -->
  <div class="card-content">
    <ul>
      <li>历史小彩蛋：杭州雷峰塔...</li>
      <li>安利时间：强推历史剧...</li>
    </ul>
  </div>
  
  <!-- Card Footer -->
  <div class="card-footer">
    <div class="card-actions">
      <button class="action-like">
        <svg>❤️</svg>
        <span class="like-count">12</span>
      </button>
      <button class="action-comment">
        <svg>💬</svg>
        <span class="comment-count">5</span>
      </button>
      <button class="action-share">
        <svg>↗</svg>
      </button>
    </div>
  </div>
  
  <!-- Comment Section (expandable) -->
  <div class="card-comments hidden">
    <div class="comments-list">
      <!-- Comment items -->
    </div>
    <form class="comment-form">
      <input type="text" placeholder="写下你的想法...">
      <button type="submit">发送</button>
    </form>
  </div>
</div>
```

### Card Interactions

- **Like**: Click heart → Toggle liked state → Update count → POST to Supabase
- **Comment**: Click comment icon → Expand comment section → Show existing comments → Add new comment
- **Favorite**: Click star → Toggle favorite → Update user's favorites list
- **Share**: Click share → Copy link or open share sheet

---

## 👑 Admin Panel

### Admin Editor Modal

```html
<div class="admin-editor-modal">
  <div class="editor-container">
    <header class="editor-header">
      <h2>发布新复盘</h2>
      <button class="editor-close">×</button>
    </header>
    
    <form class="editor-form">
      <!-- Basic Info -->
      <div class="form-section">
        <label>日期 *</label>
        <input type="date" name="date" required>
      </div>
      
      <div class="form-section">
        <label>标题 *</label>
        <input type="text" name="title" placeholder="元气复盘局｜干货炸场" required>
      </div>
      
      <div class="form-section">
        <label>副标题</label>
        <input type="text" name="subtitle" placeholder="每一天都在发光发热 ✨">
      </div>
      
      <!-- Intro Section -->
      <div class="form-section">
        <label>开场白</label>
        <input type="text" name="intro-heading" placeholder="标题">
        <textarea name="intro-content" placeholder="内容"></textarea>
      </div>
      
      <!-- People Editor -->
      <div class="form-section">
        <label>成员分享 *</label>
        <div class="people-editor">
          <div class="person-editor-item">
            <input type="text" placeholder="姓名" name="person-name">
            <input type="text" placeholder="Emoji (如: 🐱)" name="person-emoji">
            <input type="text" placeholder="角色" name="person-role">
            <textarea placeholder="分享内容 (每行一条)" name="person-content"></textarea>
            <button type="button" class="remove-person">删除</button>
          </div>
        </div>
        <button type="button" class="add-person">+ 添加成员</button>
      </div>
      
      <!-- Summary -->
      <div class="form-section">
        <label>总结</label>
        <textarea name="summary" placeholder="今天的复盘总结..."></textarea>
      </div>
      
      <!-- Actions -->
      <div class="editor-actions">
        <button type="button" class="preview-btn">预览</button>
        <button type="submit" class="publish-btn">发布</button>
      </div>
    </form>
  </div>
</div>
```

### Admin Capabilities

- Create new reviews
- Edit existing reviews (own or all if super-admin)
- Delete reviews (with confirmation)
- Preview before publishing
- Auto-save drafts (localStorage fallback)

---

## 🔄 Real-time Features

### Supabase Realtime Subscriptions

```javascript
// Subscribe to new comments
supabase
  .channel('comments')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'comments' },
    (payload) => {
      // Add new comment to UI
      addCommentToUI(payload.new);
    }
  )
  .subscribe();

// Subscribe to likes
supabase
  .channel('likes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'likes' },
    (payload) => {
      // Update like counts
      updateLikeCounts();
    }
  )
  .subscribe();
```

### Optimistic UI Updates

```javascript
async function toggleLike(reviewDate, personName) {
  // 1. Optimistic UI update
  updateLikeUIImmediately();
  
  try {
    // 2. API call
    const { data, error } = await supabase
      .from('likes')
      .insert({ review_date: reviewDate, person_name: personName });
    
    if (error) throw error;
    
  } catch (error) {
    // 3. Rollback on error
    revertLikeUI();
    showToast('操作失败，请重试');
  }
}
```

---

## 🚀 Setup Wizard

### First-Time User Experience

**Step 1: Welcome**
- Explain the platform features
- Show "Quick Setup" or "Use Demo Mode" options

**Step 2: Supabase Account**
- Link to Supabase signup
- Instructions for creating a project

**Step 3: Database Setup**
- Copy-paste SQL schema
- Run in Supabase SQL Editor
- Visual progress indicators

**Step 4: Configuration**
- Input: Supabase URL
- Input: Anon Key
- Validate connection
- Save to `config.js`

**Step 5: Done!**
- Success message
- "Start Using" button → Redirect to index.html
- Optional: Create admin account

---

## 📱 Mobile Optimization

### Responsive Breakpoints

```css
/* Mobile First */
@media (max-width: 640px) {
  /* Mobile styles (default) */
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  /* 2-column grid */
}

/* Desktop */
@media (min-width: 1025px) {
  /* 3-column grid */
}
```

### Touch Interactions

- Minimum touch target: 44x44px
- Haptic feedback (vibration) on interactions
- Swipe gestures for navigation (optional)
- Pull-to-refresh (optional)
- Bottom sheet modals on mobile

---

## ⚡ Performance Optimizations

### Loading Strategy

1. **Critical CSS**: Inline above-the-fold styles
2. **Lazy Load**: Images, videos, and non-critical scripts
3. **Code Splitting**: Load admin JS only for admins
4. **Caching**: Service worker for offline support (future)

### Data Fetching

```javascript
// Pagination for comments
async function loadComments(reviewDate, personName, page = 1) {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('review_date', reviewDate)
    .eq('person_name', personName)
    .order('created_at', { ascending: false })
    .range((page - 1) * 10, page * 10 - 1);
  
  return data;
}

// Aggregate counts (avoid N+1)
async function getLikeCounts(reviewDate) {
  const { data } = await supabase
    .from('likes')
    .select('person_name, count')
    .eq('review_date', reviewDate);
  
  return data;
}
```

---

## 🛡️ Security Considerations

### Client-Side

- Validate all user input
- Sanitize HTML in comments (XSS prevention)
- Rate limiting: Debounce like/comment actions
- HTTPS only (enforced by Supabase)

### Server-Side (Supabase RLS)

- All tables have RLS enabled
- Users can only modify their own data
- Admin role checked via `profiles.is_admin`
- API keys rotated regularly

---

## 🎯 Success Metrics

### MVP Completion Checklist

- [ ] Supabase setup wizard functional
- [ ] User can register and login
- [ ] User can like/comment/favorite
- [ ] Real-time updates work
- [ ] Admin can create/edit/delete reviews
- [ ] Mobile responsive
- [ ] LocalStorage migration works
- [ ] Deployed and accessible

### Future Enhancements (v2.1+)

- [ ] User profiles with bio and stats
- [ ] Follow system (follow other users)
- [ ] Notifications (new comments, likes)
- [ ] Search and filter reviews
- [ ] Rich text editor for comments
- [ ] Image uploads for comments
- [ ] PWA support (offline mode)
- [ ] Multi-language support

---

## 📚 Implementation Priority

### Phase 1: Foundation (Core Infrastructure)
1. Create Supabase SQL schema file
2. Create config template
3. Build Supabase client wrapper
4. Implement setup wizard

### Phase 2: Authentication
1. Build auth UI (modal)
2. Implement login/register logic
3. Session management
4. User header component

### Phase 3: Data Layer
1. Migrate reviews.json to Supabase
2. Fetch reviews from API
3. Display with new card design
4. Pagination support

### Phase 4: Interactions
1. Like system (optimistic updates)
2. Comment system (real-time)
3. Favorite system
4. Toast notifications

### Phase 5: Admin Panel
1. Admin detection
2. Create review editor
3. Edit existing reviews
4. Delete with confirmation

### Phase 6: Polish & Deploy
1. Mobile optimization
2. Performance testing
3. Error handling
4. Documentation
5. Deploy

---

## 🔗 External References

- **Supabase Docs**: https://supabase.com/docs
- **Xiaohongshu Design**: https://www.xiaohongshu.com
- **GSAP Docs**: https://greensock.com/docs/
- **Day.js Docs**: https://day.js.org/

---

**End of Specification**

This document serves as the single source of truth for the transformation project. All implementation must adhere to these specifications unless explicitly updated.
