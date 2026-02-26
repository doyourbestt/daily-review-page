/**
 * Supabase Configuration Template
 * 
 * Instructions:
 * 1. Copy this file to config.js
 * 2. Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY with your actual values
 * 3. DO NOT commit config.js to git (it's in .gitignore)
 * 
 * Get your credentials from:
 * https://app.supabase.com/project/YOUR_PROJECT/settings/api
 */

const SUPABASE_CONFIG = {
  // Your Supabase project URL
  // Example: https://xxxxx.supabase.co
  url: 'YOUR_SUPABASE_URL',
  
  // Your Supabase anon/public key (safe to expose in frontend)
  // Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  anonKey: 'YOUR_SUPABASE_ANON_KEY'
};

// Export for use in other files
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = SUPABASE_CONFIG;
}
