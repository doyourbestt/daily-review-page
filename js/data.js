// =========================================
// Data Management System
// Fetching and managing reviews data
// =========================================

class DataSystem {
  constructor() {
    this.reviews = {};
    this.currentDate = null;
    this.loading = false;
    this.fallbackMode = window.FALLBACK_MODE || !window.supabaseClient.initialized;
  }

  async init() {
    if (this.fallbackMode) {
      // Fallback to local JSON
      await this.loadFromJSON();
    } else {
      // Load from Supabase
      await this.loadFromSupabase();
    }
  }

  // Load from local JSON file (fallback mode)
  async loadFromJSON() {
    try {
      const response = await fetch('./data/reviews.json');
      if (!response.ok) throw new Error('Failed to fetch reviews.json');
      
      this.reviews = await response.json();
      console.log('✅ Loaded reviews from JSON (fallback mode)');
      return this.reviews;
    } catch (error) {
      console.error('Failed to load reviews from JSON:', error);
      return {};
    }
  }

  // Load from Supabase
  async loadFromSupabase() {
    try {
      const { data, error } = await window.supabaseClient
        .from('reviews')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      // Convert array to object keyed by date
      this.reviews = {};
      data.forEach(review => {
        this.reviews[review.date] = {
          title: review.title,
          subtitle: review.subtitle,
          intro: review.intro,
          people: review.people,
          summary: review.summary
        };
      });

      console.log('✅ Loaded reviews from Supabase');
      return this.reviews;
    } catch (error) {
      console.error('Failed to load reviews from Supabase:', error);
      // Fallback to JSON
      return await this.loadFromJSON();
    }
  }

  // Get all review dates
  getDates() {
    return Object.keys(this.reviews).sort().reverse();
  }

  // Get review by date
  getReview(date) {
    return this.reviews[date] || null;
  }

  // Get latest review
  getLatestReview() {
    const dates = this.getDates();
    if (dates.length === 0) return null;
    return { date: dates[0], ...this.reviews[dates[0]] };
  }

  // Create new review (admin only)
  async createReview(reviewData) {
    if (this.fallbackMode) {
      throw new Error('Cannot create reviews in fallback mode. Please configure Supabase.');
    }

    if (!window.authSystem.isUserAdmin()) {
      throw new Error('Only admins can create reviews');
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('reviews')
        .insert({
          date: reviewData.date,
          title: reviewData.title,
          subtitle: reviewData.subtitle,
          intro: reviewData.intro,
          people: reviewData.people,
          summary: reviewData.summary,
          author_id: window.authSystem.currentUser.id
        })
        .select()
        .single();

      if (error) throw error;

      // Update local cache
      this.reviews[data.date] = {
        title: data.title,
        subtitle: data.subtitle,
        intro: data.intro,
        people: data.people,
        summary: data.summary
      };

      console.log('✅ Created review:', data.date);
      return data;
    } catch (error) {
      console.error('Create review error:', error);
      throw error;
    }
  }

  // Update review (admin only)
  async updateReview(date, reviewData) {
    if (this.fallbackMode) {
      throw new Error('Cannot update reviews in fallback mode. Please configure Supabase.');
    }

    if (!window.authSystem.isUserAdmin()) {
      throw new Error('Only admins can update reviews');
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('reviews')
        .update({
          title: reviewData.title,
          subtitle: reviewData.subtitle,
          intro: reviewData.intro,
          people: reviewData.people,
          summary: reviewData.summary
        })
        .eq('date', date)
        .select()
        .single();

      if (error) throw error;

      // Update local cache
      this.reviews[date] = {
        title: data.title,
        subtitle: data.subtitle,
        intro: data.intro,
        people: data.people,
        summary: data.summary
      };

      console.log('✅ Updated review:', date);
      return data;
    } catch (error) {
      console.error('Update review error:', error);
      throw error;
    }
  }

  // Delete review (admin only)
  async deleteReview(date) {
    if (this.fallbackMode) {
      throw new Error('Cannot delete reviews in fallback mode. Please configure Supabase.');
    }

    if (!window.authSystem.isUserAdmin()) {
      throw new Error('Only admins can delete reviews');
    }

    try {
      const { error } = await window.supabaseClient
        .from('reviews')
        .delete()
        .eq('date', date);

      if (error) throw error;

      // Update local cache
      delete this.reviews[date];

      console.log('✅ Deleted review:', date);
      return true;
    } catch (error) {
      console.error('Delete review error:', error);
      throw error;
    }
  }

  // Migrate data from JSON to Supabase (one-time operation)
  async migrateToSupabase() {
    if (!window.authSystem.isUserAdmin()) {
      throw new Error('Only admins can migrate data');
    }

    try {
      // Load JSON data
      await this.loadFromJSON();
      
      // Prepare batch insert
      const reviewsArray = Object.entries(this.reviews).map(([date, review]) => ({
        date,
        title: review.title,
        subtitle: review.subtitle,
        intro: review.intro,
        people: review.people,
        summary: review.summary,
        author_id: window.authSystem.currentUser.id
      }));

      // Insert all reviews
      const { data, error } = await window.supabaseClient
        .from('reviews')
        .insert(reviewsArray)
        .select();

      if (error) throw error;

      console.log(`✅ Migrated ${data.length} reviews to Supabase`);
      return data;
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  }

  // Get aggregate stats
  async getStats(reviewDate) {
    if (this.fallbackMode) {
      return {
        totalLikes: 0,
        totalComments: 0,
        totalFavorites: 0
      };
    }

    try {
      const [likesResult, commentsResult, favoritesResult] = await Promise.all([
        window.supabaseClient
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('review_date', reviewDate),
        window.supabaseClient
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('review_date', reviewDate),
        window.supabaseClient
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('review_date', reviewDate)
      ]);

      return {
        totalLikes: likesResult.count || 0,
        totalComments: commentsResult.count || 0,
        totalFavorites: favoritesResult.count || 0
      };
    } catch (error) {
      console.error('Get stats error:', error);
      return {
        totalLikes: 0,
        totalComments: 0,
        totalFavorites: 0
      };
    }
  }

  // Get counts for a specific person card
  async getCardCounts(reviewDate, personName) {
    if (this.fallbackMode) {
      return { likes: 0, comments: 0 };
    }

    try {
      const [likesResult, commentsResult] = await Promise.all([
        window.supabaseClient
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('review_date', reviewDate)
          .eq('person_name', personName),
        window.supabaseClient
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('review_date', reviewDate)
          .eq('person_name', personName)
      ]);

      return {
        likes: likesResult.count || 0,
        comments: commentsResult.count || 0
      };
    } catch (error) {
      console.error('Get card counts error:', error);
      return { likes: 0, comments: 0 };
    }
  }
}

// Initialize data system
window.dataSystem = new DataSystem();
