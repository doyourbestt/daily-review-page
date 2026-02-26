// =========================================
// Supabase Client Wrapper
// =========================================

class SupabaseClient {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.init();
  }

  init() {
    if (!window.isSupabaseConfigured || !window.isSupabaseConfigured()) {
      console.warn('Supabase not configured, running in fallback mode');
      this.initialized = false;
      return;
    }

    try {
      const { createClient } = supabase;
      this.client = createClient(
        window.SUPABASE_CONFIG.SUPABASE_URL,
        window.SUPABASE_CONFIG.SUPABASE_ANON_KEY
      );
      this.initialized = true;
      console.log('✅ Supabase client initialized');
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      this.initialized = false;
    }
  }

  // Get current session
  async getSession() {
    if (!this.initialized) return null;
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  // Get current user
  async getUser() {
    if (!this.initialized) return null;
    try {
      const { data, error } = await this.client.auth.getUser();
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  // Sign up
  async signUp(email, password, username) {
    if (!this.initialized) {
      throw new Error('Supabase not configured');
    }
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: username
          }
        }
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // Sign in
  async signIn(email, password) {
    if (!this.initialized) {
      throw new Error('Supabase not configured');
    }
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Sign out
  async signOut() {
    if (!this.initialized) return;
    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Listen to auth changes
  onAuthStateChange(callback) {
    if (!this.initialized) return () => {};
    return this.client.auth.onAuthStateChange(callback);
  }

  // Database queries
  from(table) {
    if (!this.initialized) {
      throw new Error('Supabase not configured');
    }
    return this.client.from(table);
  }

  // Realtime channel
  channel(name) {
    if (!this.initialized) {
      throw new Error('Supabase not configured');
    }
    return this.client.channel(name);
  }
}

// Create singleton instance
window.supabaseClient = new SupabaseClient();
