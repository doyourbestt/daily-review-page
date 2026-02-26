# Supabase Setup Guide
## Daily Review Platform - Full-Stack Configuration

This guide will walk you through setting up the Supabase backend for the Daily Review Platform.

---

## Prerequisites

- A Supabase account (free tier works fine)
- Basic understanding of SQL
- Your existing daily review data (optional - can migrate later)

---

## Step 1: Create Supabase Project

1. **Go to Supabase:**  
   Visit [https://supabase.com](https://supabase.com) and sign in (or create an account)

2. **Create New Project:**
   - Click "New Project"
   - Fill in project details:
     - **Name:** `daily-review-platform` (or your preferred name)
     - **Database Password:** Choose a strong password (save it!)
     - **Region:** Select closest to your users
     - **Pricing Plan:** Free tier is sufficient for starting

3. **Wait for Setup:**  
   Project creation takes ~2 minutes. Grab a coffee ☕

---

## Step 2: Run Database Migrations

1. **Open SQL Editor:**
   - In your Supabase project dashboard
   - Navigate to: **SQL Editor** (left sidebar)

2. **Create New Query:**
   - Click "+ New Query"

3. **Copy Schema:**
   - Open `docs/schema.sql` from this repository
   - Copy the entire contents

4. **Paste and Run:**
   - Paste into the SQL Editor
   - Click **RUN** (or press Ctrl/Cmd + Enter)
   - ✅ You should see "Success. No rows returned"

5. **Verify Tables:**
   - Navigate to **Table Editor** (left sidebar)
   - You should see tables: `profiles`, `reviews`, `likes`, `comments`, `favorites`

---

## Step 3: Get API Credentials

1. **Go to Project Settings:**
   - Click the ⚙️ **Settings** icon (left sidebar)
   - Select **API**

2. **Copy Configuration:**
   You need two values:
   
   - **Project URL**  
     Example: `https://xxxxx.supabase.co`
   
   - **anon public key**  
     Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   
   ⚠️ **Do NOT use the `service_role` key** - that's for server-side only!

3. **Save These Values:**  
   You'll need them in the next step

---

## Step 4: Configure Frontend

1. **Copy Config Template:**
   ```bash
   cp config.example.js config.js
   ```

2. **Edit config.js:**
   ```javascript
   const SUPABASE_CONFIG = {
     url: 'https://xxxxx.supabase.co',  // Your Project URL
     anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // Your anon key
   };
   ```

3. **Add to .gitignore:**
   ```bash
   echo "config.js" >> .gitignore
   ```
   This prevents accidentally committing your keys to git.

---

## Step 5: Create First Admin User

1. **Sign Up via Frontend:**
   - Open `index.html` in your browser
   - Click "Register" and create an account
   - Use your real email (you'll need to verify it)

2. **Verify Email:**
   - Check your inbox for Supabase verification email
   - Click the verification link

3. **Grant Admin Privileges:**
   - Go back to Supabase SQL Editor
   - Run this query (replace with your email):
   ```sql
   UPDATE profiles 
   SET is_admin = true 
   WHERE id = (
     SELECT id FROM auth.users 
     WHERE email = 'your-email@example.com'
   );
   ```

4. **Verify Admin Access:**
   - Refresh your frontend page
   - You should now see "➕ 发布新复盘" button

---

## Step 6: Seed Initial Data (Optional)

If you want to migrate your existing reviews from `data/reviews.json`:

1. **Open SQL Editor**

2. **Insert Review (Example):**
   ```sql
   INSERT INTO reviews (date, title, subtitle, intro, people, summary)
   VALUES (
     '2026-02-11',
     '元气复盘局｜干货炸场',
     '每一天都在发光发热 ✨',
     '{"heading": "🌟 干货炸场！", "content": "哈喽宝子们～ ..."}',
     '[
       {
         "name": "喵喵",
         "emoji": "��",
         "role": "宝藏分享官",
         "content": ["历史小彩蛋：...", "安利时间：..."]
       }
     ]',
     '这场复盘会...'
   );
   ```

3. **Or Use Bulk Import:**
   - Convert `reviews.json` to SQL INSERT statements
   - Use a tool like [JSON to SQL converter](https://www.convertjson.com/json-to-sql.htm)

---

## Step 7: Test Everything

### Test Authentication
1. Open your site
2. Click "Register" → Fill form → Submit
3. ✅ Should receive email verification
4. Login with credentials
5. ✅ Should see your profile info

### Test Interactions (as regular user)
1. Browse a review
2. Click ❤️ on a person card
3. ✅ Like count should increment
4. Add a comment
5. ✅ Comment should appear
6. Click ⭐ to favorite
7. ✅ Star should fill

### Test Admin Features (as admin)
1. Login with admin account
2. ✅ Should see "➕ 发布新复盘" button
3. Click it → Fill form → Publish
4. ✅ New review should appear

### Test Realtime Updates
1. Open site in two browser windows
2. Login as different users (use incognito for second)
3. Like/comment in one window
4. ✅ Should update in other window instantly

---

## Step 8: Configure Authentication Providers (Optional)

Want Google/GitHub login? Here's how:

### Google OAuth
1. **Supabase Dashboard:**  
   Settings → Authentication → Providers → Google

2. **Enable Google:**  
   Toggle ON

3. **Get Google OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 Client ID
   - Authorized redirect URIs: `https://xxxxx.supabase.co/auth/v1/callback`

4. **Add to Supabase:**
   - Paste Client ID and Secret
   - Save

5. **Update Frontend:**
   - Add Google button to `auth.js`

### GitHub OAuth
Similar process:
1. Enable in Supabase
2. Create GitHub OAuth App
3. Add credentials to Supabase

---

## Step 9: Configure Email Settings (Optional)

By default, Supabase uses their email service. For production, use your own SMTP:

1. **Go to:** Settings → Authentication → Email Auth

2. **Configure SMTP:**
   - SMTP Host: `smtp.gmail.com` (or your provider)
   - SMTP Port: `587`
   - SMTP User: Your email
   - SMTP Password: App-specific password

3. **Customize Email Templates:**
   - Confirmation email
   - Password reset email
   - Magic link email

---

## Step 10: Enable Realtime (Default ON)

Realtime should be enabled by default, but verify:

1. **Go to:** Settings → API → Realtime

2. **Check Status:**  
   ✅ Realtime should be enabled

3. **Configure Channels (if needed):**
   - By default, all tables are replicatable
   - You can restrict in: Database → Replication

---

## Troubleshooting

### Issue: "Invalid API key"
**Solution:**  
- Check you're using the `anon` key, not `service_role`
- Verify no extra spaces in `config.js`

### Issue: "Row Level Security policy violation"
**Solution:**  
- Make sure you ran the full `schema.sql`
- Check that RLS policies are created:
  ```sql
  SELECT * FROM pg_policies WHERE schemaname = 'public';
  ```

### Issue: "Profile not created on signup"
**Solution:**  
- Check if the `on_auth_user_created` trigger exists:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  ```
- If missing, re-run the schema.sql

### Issue: "Realtime not working"
**Solution:**  
- Check browser console for connection errors
- Verify Realtime is enabled in Settings
- Check if user is subscribed to channel (see `realtime.js`)

### Issue: "Admin button not showing"
**Solution:**  
- Verify user has `is_admin = true` in profiles table
- Check auth state in browser console: `supabase.auth.getUser()`
- Clear browser cache and re-login

---

## Security Checklist

Before going to production:

- [ ] Changed default Supabase database password
- [ ] `config.js` is in `.gitignore`
- [ ] All RLS policies are enabled
- [ ] Verified non-admin users can't modify reviews
- [ ] Verified users can only edit their own comments
- [ ] Rate limiting enabled (Supabase default: 30 req/sec)
- [ ] Email verification required for new signups
- [ ] Tested all policies with multiple user accounts

---

## Performance Tips

### Database Indexes
Already created by `schema.sql`, but verify:
```sql
SELECT * FROM pg_indexes WHERE schemaname = 'public';
```

### Query Optimization
- Use `select()` to fetch only needed columns
- Paginate comments (limit 10-20 per page)
- Cache like/comment counts on frontend

### Realtime Optimization
- Only subscribe to channels for current date
- Unsubscribe when navigating away
- Use throttling/debouncing for rapid actions

---

## Cost Estimation (Supabase Free Tier)

**Limits:**
- Database: 500 MB
- Storage: 1 GB
- Bandwidth: 2 GB
- Realtime: 200 concurrent connections

**Estimated Usage (100 daily active users):**
- Database: ~50 MB (thousands of reviews)
- Storage: 0 MB (no file uploads yet)
- Bandwidth: ~500 MB/month
- Realtime: ~20 concurrent

**Verdict:** Free tier is sufficient for initial launch! 🎉

---

## Next Steps

1. ✅ Supabase configured and running
2. → Test all features locally
3. → Deploy frontend to Netlify/Vercel
4. → Invite users and collect feedback
5. → Monitor usage in Supabase dashboard

---

## Support

- **Supabase Docs:** https://supabase.com/docs
- **Discord Community:** https://discord.supabase.com
- **GitHub Issues:** [Report bugs here]

---

**Setup complete! Time to build something amazing! 🚀**
