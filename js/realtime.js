// =========================================
// Real-time Updates System
// Supabase Realtime Subscriptions
// =========================================

class RealtimeSystem {
  constructor() {
    this.channels = [];
    this.subscribed = false;
    this.currentDate = null;
  }

  init(reviewDate) {
    if (!window.supabaseClient.initialized) {
      console.warn('Realtime not available: Supabase not configured');
      return;
    }

    this.currentDate = reviewDate;
    this.subscribe();
  }

  subscribe() {
    if (this.subscribed) {
      this.unsubscribe();
    }

    // Subscribe to comments
    this.subscribeToComments();

    // Subscribe to likes
    this.subscribeToLikes();

    this.subscribed = true;
    console.log('✅ Real-time subscriptions active');
  }

  subscribeToComments() {
    const commentsChannel = window.supabaseClient
      .channel('comments-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `review_date=eq.${this.currentDate}`
        },
        (payload) => {
          console.log('New comment received:', payload);
          this.handleNewComment(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `review_date=eq.${this.currentDate}`
        },
        (payload) => {
          console.log('Comment deleted:', payload);
          this.handleDeletedComment(payload.old);
        }
      )
      .subscribe();

    this.channels.push(commentsChannel);
  }

  subscribeToLikes() {
    const likesChannel = window.supabaseClient
      .channel('likes-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `review_date=eq.${this.currentDate}`
        },
        (payload) => {
          console.log('Like change received:', payload);
          this.handleLikeChange(payload);
        }
      )
      .subscribe();

    this.channels.push(likesChannel);
  }

  async handleNewComment(comment) {
    // Don't show notification for own comments
    if (comment.user_id === window.authSystem?.currentUser?.id) {
      return;
    }

    // Find the card
    const card = document.querySelector(
      `[data-review-date="${comment.review_date}"][data-person-name="${comment.person_name}"]`
    );

    if (!card) return;

    // Update comment count
    const countEl = card.querySelector('.comment-count');
    if (countEl) {
      const currentCount = parseInt(countEl.textContent) || 0;
      countEl.textContent = currentCount + 1;
    }

    // If comment section is expanded, reload comments
    const commentSection = card.querySelector('.card-comments');
    if (commentSection && commentSection.classList.contains('expanded')) {
      await this.reloadComments(comment.review_date, comment.person_name, card);
    }

    // Show toast notification
    this.showToast('📬 新评论');
  }

  async handleDeletedComment(comment) {
    // Find the card
    const card = document.querySelector(
      `[data-review-date="${comment.review_date}"][data-person-name="${comment.person_name}"]`
    );

    if (!card) return;

    // Update comment count
    const countEl = card.querySelector('.comment-count');
    if (countEl) {
      const currentCount = parseInt(countEl.textContent) || 0;
      countEl.textContent = Math.max(0, currentCount - 1);
    }

    // If comment section is expanded, reload comments
    const commentSection = card.querySelector('.card-comments');
    if (commentSection && commentSection.classList.contains('expanded')) {
      await this.reloadComments(comment.review_date, comment.person_name, card);
    }
  }

  async handleLikeChange(payload) {
    const { event, new: newData, old: oldData } = payload;
    const likeData = newData || oldData;

    if (!likeData) return;

    // Don't update for own likes (already handled optimistically)
    if (likeData.user_id === window.authSystem?.currentUser?.id) {
      return;
    }

    // Find the card
    const card = document.querySelector(
      `[data-review-date="${likeData.review_date}"][data-person-name="${likeData.person_name}"]`
    );

    if (!card) return;

    // Update like count
    await window.interactionsSystem.updateLikeCount(
      likeData.review_date,
      likeData.person_name
    );
  }

  async reloadComments(reviewDate, personName, card) {
    // Clear cache to force reload
    const key = `${reviewDate}:${personName}`;
    window.interactionsSystem.commentCache.delete(key);

    // Reload comments
    const comments = await window.interactionsSystem.loadComments(reviewDate, personName);
    window.interactionsSystem.renderComments(card, comments);
  }

  unsubscribe() {
    this.channels.forEach(channel => {
      window.supabaseClient.client.removeChannel(channel);
    });
    this.channels = [];
    this.subscribed = false;
    console.log('✅ Real-time subscriptions removed');
  }

  changeDate(newDate) {
    this.currentDate = newDate;
    this.subscribe();
  }

  showToast(message) {
    if (window.showToast) {
      window.showToast(message);
    }
  }
}

// Initialize realtime system
window.realtimeSystem = new RealtimeSystem();
