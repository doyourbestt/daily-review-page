// =========================================
// Interactions System
// Likes, Comments, Favorites with Supabase
// =========================================

class InteractionsSystem {
  constructor() {
    this.likeCache = new Map();
    this.commentCache = new Map();
    this.favoriteCache = new Set();
    this.pendingOperations = new Set();
    
    this.init();
  }

  async init() {
    // Load user's interactions if logged in
    if (window.authSystem && window.authSystem.isAuthenticated()) {
      await this.loadUserInteractions();
    }

    // Listen to auth changes
    if (window.authSystem) {
      window.authSystem.onAuthEvent(async (event) => {
        if (event === 'signed_in') {
          await this.loadUserInteractions();
        } else if (event === 'signed_out') {
          this.clearCache();
        }
      });
    }

    // Add double-tap to like functionality
    this.initDoubleTapLike();
  }

  // Initialize double-tap to like on cards
  initDoubleTapLike() {
    let lastTap = 0;
    document.addEventListener('dblclick', (e) => {
      const card = e.target.closest('.person-card');
      if (!card) return;

      const reviewDate = card.dataset.reviewDate;
      const personName = card.dataset.personName;

      if (!reviewDate || !personName) return;

      // Toggle like
      this.toggleLike(reviewDate, personName);
    });
  }

  async loadUserInteractions() {
    if (!window.supabaseClient.initialized) return;

    try {
      const userId = window.authSystem.currentUser?.id;
      if (!userId) return;

      // Load likes
      const { data: likes } = await window.supabaseClient
        .from('likes')
        .select('review_date, person_name')
        .eq('user_id', userId);

      if (likes) {
        likes.forEach(like => {
          const key = `${like.review_date}:${like.person_name}`;
          this.likeCache.set(key, true);
        });
      }

      // Load favorites
      const { data: favorites } = await window.supabaseClient
        .from('favorites')
        .select('review_date, person_name')
        .eq('user_id', userId);

      if (favorites) {
        favorites.forEach(fav => {
          const key = `${fav.review_date}:${fav.person_name}`;
          this.favoriteCache.add(key);
        });
      }

      console.log('✅ Loaded user interactions');
    } catch (error) {
      console.error('Failed to load user interactions:', error);
    }
  }

  clearCache() {
    this.likeCache.clear();
    this.commentCache.clear();
    this.favoriteCache.clear();
  }

  // ===== LIKE SYSTEM =====

  async toggleLike(reviewDate, personName, buttonEl) {
    // Check authentication
    if (!window.authSystem.isAuthenticated()) {
      window.authSystem.showAuthModal('login');
      this.showToast('请先登录后再点赞');
      return;
    }

    const key = `${reviewDate}:${personName}`;
    const isLiked = this.likeCache.get(key) || false;
    const operationKey = `like_${key}`;

    // Prevent duplicate operations
    if (this.pendingOperations.has(operationKey)) return;
    this.pendingOperations.add(operationKey);

    // Optimistic UI update
    const newState = !isLiked;
    this.likeCache.set(key, newState);
    this.updateLikeUI(buttonEl, newState);

    try {
      if (newState) {
        // Add like
        const { error } = await window.supabaseClient
          .from('likes')
          .insert({
            user_id: window.authSystem.currentUser.id,
            review_date: reviewDate,
            person_name: personName
          });

        if (error) throw error;
        this.showToast('点赞成功 ❤️');
      } else {
        // Remove like
        const { error } = await window.supabaseClient
          .from('likes')
          .delete()
          .eq('user_id', window.authSystem.currentUser.id)
          .eq('review_date', reviewDate)
          .eq('person_name', personName);

        if (error) throw error;
        this.showToast('取消点赞');
      }

      // Update count
      await this.updateLikeCount(reviewDate, personName);

    } catch (error) {
      console.error('Toggle like error:', error);
      // Rollback on error
      this.likeCache.set(key, isLiked);
      this.updateLikeUI(buttonEl, isLiked);
      this.showToast('操作失败，请重试');
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  updateLikeUI(buttonEl, isLiked) {
    if (!buttonEl) return;

    if (isLiked) {
      buttonEl.classList.add('liked');
      // Create particle effects
      this.createLikeParticles(buttonEl);
    } else {
      buttonEl.classList.remove('liked');
    }

    // Animate
    buttonEl.style.transform = 'scale(1.2)';
    setTimeout(() => {
      buttonEl.style.transform = '';
    }, 200);
  }

  // Create floating particles for like animation
  createLikeParticles(buttonEl) {
    const rect = buttonEl.getBoundingClientRect();
    const particleCount = 5;
    const emojis = ['❤️', '💖', '💗', '✨', '🧡'];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('span');
      particle.className = 'like-particle';
      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      particle.style.left = `${rect.left + rect.width / 2 + (Math.random() - 0.5) * 40}px`;
      particle.style.top = `${rect.top + rect.height / 2}px`;
      document.body.appendChild(particle);

      // Random animation delay
      particle.style.animationDelay = `${Math.random() * 0.2}s`;

      // Remove after animation
      setTimeout(() => {
        particle.remove();
      }, 1000);
    }
  }

  async updateLikeCount(reviewDate, personName) {
    try {
      const { count, error } = await window.supabaseClient
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('review_date', reviewDate)
        .eq('person_name', personName);

      if (error) throw error;

      // Update UI
      const card = document.querySelector(`[data-review-date="${reviewDate}"][data-person-name="${personName}"]`);
      if (card) {
        const countEl = card.querySelector('.like-count');
        if (countEl) {
          countEl.textContent = count || 0;
        }
      }
    } catch (error) {
      console.error('Update like count error:', error);
    }
  }

  isLiked(reviewDate, personName) {
    const key = `${reviewDate}:${personName}`;
    return this.likeCache.get(key) || false;
  }

  // ===== COMMENT SYSTEM =====

  async loadComments(reviewDate, personName) {
    const key = `${reviewDate}:${personName}`;

    // Check cache
    if (this.commentCache.has(key)) {
      return this.commentCache.get(key);
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('comments')
        .select(`
          *,
          profiles:user_id (username, display_name, avatar_url)
        `)
        .eq('review_date', reviewDate)
        .eq('person_name', personName)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Cache comments
      this.commentCache.set(key, data || []);
      return data || [];

    } catch (error) {
      console.error('Load comments error:', error);
      return [];
    }
  }

  async addComment(reviewDate, personName, content, cardEl) {
    // Check authentication
    if (!window.authSystem.isAuthenticated()) {
      window.authSystem.showAuthModal('login');
      this.showToast('请先登录后再评论');
      return false;
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      this.showToast('请输入评论内容');
      return false;
    }

    if (content.length > 1000) {
      this.showToast('评论内容不能超过1000字');
      return false;
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('comments')
        .insert({
          user_id: window.authSystem.currentUser.id,
          review_date: reviewDate,
          person_name: personName,
          content: content.trim()
        })
        .select(`
          *,
          profiles:user_id (username, display_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Update cache
      const key = `${reviewDate}:${personName}`;
      const comments = this.commentCache.get(key) || [];
      comments.unshift(data);
      this.commentCache.set(key, comments);

      // Update UI
      this.renderComments(cardEl, comments);
      await this.updateCommentCount(reviewDate, personName);

      this.showToast('评论成功 💬');
      return true;

    } catch (error) {
      console.error('Add comment error:', error);
      this.showToast('评论失败，请重试');
      return false;
    }
  }

  async deleteComment(commentId, reviewDate, personName, cardEl) {
    try {
      const { error } = await window.supabaseClient
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      // Update cache
      const key = `${reviewDate}:${personName}`;
      let comments = this.commentCache.get(key) || [];
      comments = comments.filter(c => c.id !== commentId);
      this.commentCache.set(key, comments);

      // Update UI
      this.renderComments(cardEl, comments);
      await this.updateCommentCount(reviewDate, personName);

      this.showToast('评论已删除');

    } catch (error) {
      console.error('Delete comment error:', error);
      this.showToast('删除失败，请重试');
    }
  }

  renderComments(cardEl, comments) {
    const commentsList = cardEl.querySelector('.comments-list');
    if (!commentsList) return;

    if (comments.length === 0) {
      commentsList.innerHTML = `
        <div class="comments-empty">
          还没有评论，来说点什么吧～
        </div>
      `;
      return;
    }

    commentsList.innerHTML = comments.map(comment => {
      const profile = comment.profiles || {};
      const displayName = profile.display_name || profile.username || '匿名用户';
      const avatarUrl = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FF2442&color=fff`;
      const timeAgo = this.getTimeAgo(comment.created_at);
      const isOwner = window.authSystem.currentUser?.id === comment.user_id;

      return `
        <div class="comment-item" data-comment-id="${comment.id}">
          <div class="comment-header">
            <img src="${avatarUrl}" alt="${displayName}" class="comment-avatar">
            <span class="comment-author">${displayName}</span>
            <span class="comment-time">${timeAgo}</span>
          </div>
          <div class="comment-text">${this.escapeHtml(comment.content)}</div>
          ${isOwner ? `
            <div class="comment-actions">
              <button class="comment-action-btn delete-comment-btn" data-comment-id="${comment.id}">删除</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Attach delete handlers
    commentsList.querySelectorAll('.delete-comment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const commentId = btn.dataset.commentId;
        const reviewDate = cardEl.dataset.reviewDate;
        const personName = cardEl.dataset.personName;
        this.deleteComment(commentId, reviewDate, personName, cardEl);
      });
    });
  }

  async updateCommentCount(reviewDate, personName) {
    try {
      const { count, error } = await window.supabaseClient
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('review_date', reviewDate)
        .eq('person_name', personName);

      if (error) throw error;

      // Update UI
      const card = document.querySelector(`[data-review-date="${reviewDate}"][data-person-name="${personName}"]`);
      if (card) {
        const countEl = card.querySelector('.comment-count');
        if (countEl) {
          countEl.textContent = count || 0;
        }
      }
    } catch (error) {
      console.error('Update comment count error:', error);
    }
  }

  // ===== FAVORITE SYSTEM =====

  async toggleFavorite(reviewDate, personName, buttonEl) {
    // Check authentication
    if (!window.authSystem.isAuthenticated()) {
      window.authSystem.showAuthModal('login');
      this.showToast('请先登录后再收藏');
      return;
    }

    const key = `${reviewDate}:${personName}`;
    const isFavorited = this.favoriteCache.has(key);
    const operationKey = `favorite_${key}`;

    // Prevent duplicate operations
    if (this.pendingOperations.has(operationKey)) return;
    this.pendingOperations.add(operationKey);

    // Optimistic UI update
    const newState = !isFavorited;
    if (newState) {
      this.favoriteCache.add(key);
    } else {
      this.favoriteCache.delete(key);
    }
    this.updateFavoriteUI(buttonEl, newState);

    try {
      if (newState) {
        // Add favorite
        const { error } = await window.supabaseClient
          .from('favorites')
          .insert({
            user_id: window.authSystem.currentUser.id,
            review_date: reviewDate,
            person_name: personName
          });

        if (error) throw error;
        this.showToast('收藏成功 ⭐');
      } else {
        // Remove favorite
        const { error } = await window.supabaseClient
          .from('favorites')
          .delete()
          .eq('user_id', window.authSystem.currentUser.id)
          .eq('review_date', reviewDate)
          .eq('person_name', personName);

        if (error) throw error;
        this.showToast('取消收藏');
      }

    } catch (error) {
      console.error('Toggle favorite error:', error);
      // Rollback on error
      if (isFavorited) {
        this.favoriteCache.add(key);
      } else {
        this.favoriteCache.delete(key);
      }
      this.updateFavoriteUI(buttonEl, isFavorited);
      this.showToast('操作失败，请重试');
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  updateFavoriteUI(buttonEl, isFavorited) {
    if (!buttonEl) return;

    if (isFavorited) {
      buttonEl.classList.add('favorited');
      // Create star particles
      this.createFavoriteParticles(buttonEl);
    } else {
      buttonEl.classList.remove('favorited');
    }

    // Animate
    buttonEl.style.transform = 'scale(1.2)';
    setTimeout(() => {
      buttonEl.style.transform = '';
    }, 200);
  }

  // Create floating particles for favorite animation
  createFavoriteParticles(buttonEl) {
    const rect = buttonEl.getBoundingClientRect();
    const particleCount = 4;
    const emojis = ['⭐', '🌟', '✨', '💫'];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('span');
      particle.className = 'like-particle';
      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      particle.style.left = `${rect.left + rect.width / 2 + (Math.random() - 0.5) * 30}px`;
      particle.style.top = `${rect.top + rect.height / 2}px`;
      document.body.appendChild(particle);

      particle.style.animationDelay = `${Math.random() * 0.15}s`;

      setTimeout(() => {
        particle.remove();
      }, 1000);
    }
  }

  isFavorited(reviewDate, personName) {
    const key = `${reviewDate}:${personName}`;
    return this.favoriteCache.has(key);
  }

  // ===== HELPERS =====

  getTimeAgo(timestamp) {
    if (typeof dayjs !== 'undefined') {
      return dayjs(timestamp).fromNow();
    }

    // Fallback
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return '刚刚';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}天前`;
    return new Date(timestamp).toLocaleDateString('zh-CN');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showToast(message) {
    if (window.showToast) {
      window.showToast(message);
    }
  }
}

// Initialize interactions system
window.interactionsSystem = new InteractionsSystem();
