// =========================================
// Supabase Configuration
// =========================================
// Auto-configured by OpenClaw Agent
// Date: 2026-03-06
// =========================================

window.SUPABASE_CONFIG = {
  SUPABASE_URL: 'https://mbdkrmpiiwcdlxrdurun.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iZGtybXBpaXdjZGx4cmR1cnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3OTQxMjIsImV4cCI6MjA4NjM3MDEyMn0.o1imsdSss5pjhqZjINuMTI6hL5nRDfpyeDIOe9urBQs'
};

// Check if configuration is valid
window.isSupabaseConfigured = function() {
  return (
    window.SUPABASE_CONFIG.SUPABASE_URL && 
    window.SUPABASE_CONFIG.SUPABASE_ANON_KEY &&
    window.SUPABASE_CONFIG.SUPABASE_URL.startsWith('https://')
  );
};

// Fallback mode flag (when Supabase not configured)
window.FALLBACK_MODE = !window.isSupabaseConfigured();

if (window.FALLBACK_MODE) {
  console.warn('⚠️ Supabase not configured. Running in LocalStorage mode.');
} else {
  console.log('✅ Supabase configured. Full social features enabled.');
}
