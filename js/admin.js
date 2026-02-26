// =========================================
// Admin Panel System
// Content Management (Create/Edit/Delete)
// =========================================

class AdminSystem {
  constructor() {
    this.editorMode = null; // 'create' or 'edit'
    this.editingDate = null;
    this.peopleCount = 0;
    
    this.init();
  }

  init() {
    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Admin create button
    const adminCreateBtn = document.getElementById('adminCreateBtn');
    if (adminCreateBtn) {
      adminCreateBtn.addEventListener('click', () => this.showEditor('create'));
    }

    // Editor close button
    const editorClose = document.getElementById('adminEditorClose');
    if (editorClose) {
      editorClose.addEventListener('click', () => this.hideEditor());
    }

    // Close on overlay click
    const editorOverlay = document.getElementById('adminEditorOverlay');
    if (editorOverlay) {
      editorOverlay.addEventListener('click', (e) => {
        if (e.target === editorOverlay) {
          this.hideEditor();
        }
      });
    }

    // Form submission
    const editorForm = document.getElementById('adminEditorForm');
    if (editorForm) {
      editorForm.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Add person button
    const addPersonBtn = document.getElementById('addPersonBtn');
    if (addPersonBtn) {
      addPersonBtn.addEventListener('click', () => this.addPersonField());
    }
  }

  showEditor(mode, date = null) {
    if (!window.authSystem.isUserAdmin()) {
      this.showToast('只有管理员可以编辑内容');
      return;
    }

    this.editorMode = mode;
    this.editingDate = date;

    const overlay = document.getElementById('adminEditorOverlay');
    const title = document.getElementById('adminEditorTitle');
    const form = document.getElementById('adminEditorForm');

    if (!overlay || !title || !form) return;

    // Set title
    title.textContent = mode === 'create' ? '发布新复盘' : '编辑复盘';

    // Clear form
    form.reset();
    this.clearPeopleFields();

    if (mode === 'edit' && date) {
      // Load existing data
      this.loadReviewData(date);
    } else {
      // Add one person field for create mode
      this.addPersonField();
    }

    // Show modal
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  hideEditor() {
    const overlay = document.getElementById('adminEditorOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
    this.clearEditorError();
  }

  loadReviewData(date) {
    const review = window.dataSystem.getReview(date);
    if (!review) return;

    const form = document.getElementById('adminEditorForm');
    if (!form) return;

    // Fill basic fields
    form.querySelector('[name="date"]').value = date;
    form.querySelector('[name="title"]').value = review.title || '';
    form.querySelector('[name="subtitle"]').value = review.subtitle || '';
    
    if (review.intro) {
      form.querySelector('[name="intro-heading"]').value = review.intro.heading || '';
      form.querySelector('[name="intro-content"]').value = review.intro.content || '';
    }

    form.querySelector('[name="summary"]').value = review.summary || '';

    // Fill people fields
    this.clearPeopleFields();
    if (review.people && Array.isArray(review.people)) {
      review.people.forEach(person => {
        this.addPersonField(person);
      });
    }
  }

  clearPeopleFields() {
    const container = document.getElementById('peopleContainer');
    if (container) {
      container.innerHTML = '';
      this.peopleCount = 0;
    }
  }

  addPersonField(personData = null) {
    const container = document.getElementById('peopleContainer');
    if (!container) return;

    this.peopleCount++;
    const index = this.peopleCount;

    const personDiv = document.createElement('div');
    personDiv.className = 'person-field';
    personDiv.dataset.index = index;

    personDiv.innerHTML = `
      <div class="person-field-header">
        <h4>成员 ${index}</h4>
        <button type="button" class="remove-person-btn" data-index="${index}">删除</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>姓名 *</label>
          <input type="text" name="person-${index}-name" value="${personData?.name || ''}" required>
        </div>
        <div class="form-group">
          <label>Emoji</label>
          <input type="text" name="person-${index}-emoji" value="${personData?.emoji || ''}">
        </div>
      </div>
      <div class="form-group">
        <label>角色</label>
        <input type="text" name="person-${index}-role" value="${personData?.role || ''}">
      </div>
      <div class="form-group">
        <label>分享内容 (每行一条) *</label>
        <textarea name="person-${index}-content" rows="5" required>${personData?.content ? (Array.isArray(personData.content) ? personData.content.join('\n') : personData.content) : ''}</textarea>
      </div>
    `;

    container.appendChild(personDiv);

    // Attach remove handler
    const removeBtn = personDiv.querySelector('.remove-person-btn');
    removeBtn.addEventListener('click', () => {
      personDiv.remove();
      this.updatePersonNumbers();
    });
  }

  updatePersonNumbers() {
    const container = document.getElementById('peopleContainer');
    if (!container) return;

    const personFields = container.querySelectorAll('.person-field');
    personFields.forEach((field, index) => {
      const header = field.querySelector('.person-field-header h4');
      if (header) {
        header.textContent = `成员 ${index + 1}`;
      }
    });
  }

  async handleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = '保存中...';

    try {
      // Collect form data
      const reviewData = this.collectFormData(form);

      // Validate
      if (!this.validateFormData(reviewData)) {
        throw new Error('请填写所有必填字段');
      }

      // Save to database
      if (this.editorMode === 'create') {
        await window.dataSystem.createReview(reviewData);
        this.showToast('发布成功 🎉');
      } else if (this.editorMode === 'edit') {
        await window.dataSystem.updateReview(this.editingDate, reviewData);
        this.showToast('更新成功 ✅');
      }

      // Reload page to show new/updated review
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Submit error:', error);
      this.showEditorError(error.message || '保存失败，请重试');
      submitBtn.disabled = false;
      submitBtn.textContent = '保存';
    }
  }

  collectFormData(form) {
    const formData = new FormData(form);

    // Basic fields
    const reviewData = {
      date: formData.get('date'),
      title: formData.get('title'),
      subtitle: formData.get('subtitle') || '',
      intro: {
        heading: formData.get('intro-heading') || '',
        content: formData.get('intro-content') || ''
      },
      summary: formData.get('summary') || '',
      people: []
    };

    // Collect people data
    const container = document.getElementById('peopleContainer');
    const personFields = container.querySelectorAll('.person-field');

    personFields.forEach((field) => {
      const index = field.dataset.index;
      const name = formData.get(`person-${index}-name`);
      const emoji = formData.get(`person-${index}-emoji`);
      const role = formData.get(`person-${index}-role`);
      const content = formData.get(`person-${index}-content`);

      if (name && content) {
        reviewData.people.push({
          name: name.trim(),
          emoji: emoji || '👤',
          role: role || '团队成员',
          content: content.split('\n').map(line => line.trim()).filter(line => line)
        });
      }
    });

    return reviewData;
  }

  validateFormData(data) {
    if (!data.date || !data.title) {
      return false;
    }

    if (!data.people || data.people.length === 0) {
      return false;
    }

    return true;
  }

  async deleteReview(date) {
    if (!window.authSystem.isUserAdmin()) {
      this.showToast('只有管理员可以删除内容');
      return;
    }

    const confirmed = confirm(`确定要删除 ${date} 的复盘吗？此操作不可恢复。`);
    if (!confirmed) return;

    try {
      await window.dataSystem.deleteReview(date);
      this.showToast('删除成功');
      
      // Reload page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Delete error:', error);
      this.showToast('删除失败，请重试');
    }
  }

  showEditorError(message) {
    const errorEl = document.getElementById('adminEditorError');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  clearEditorError() {
    const errorEl = document.getElementById('adminEditorError');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
  }

  showToast(message) {
    if (window.showToast) {
      window.showToast(message);
    }
  }

  // Add edit/delete buttons to reviews (call after rendering)
  addAdminControls() {
    if (!window.authSystem.isUserAdmin()) return;

    const dates = window.dataSystem.getDates();
    dates.forEach(date => {
      // Check if controls already exist
      const existingControls = document.querySelector(`[data-admin-controls="${date}"]`);
      if (existingControls) return;

      // Find the date navigation or section
      const dateSection = document.querySelector(`[data-date="${date}"]`);
      if (!dateSection) return;

      // Create controls
      const controls = document.createElement('div');
      controls.className = 'admin-controls';
      controls.dataset.adminControls = date;
      controls.innerHTML = `
        <button class="admin-control-btn edit-btn" data-date="${date}" title="编辑">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="admin-control-btn delete-btn" data-date="${date}" title="删除">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      `;

      dateSection.appendChild(controls);

      // Attach handlers
      controls.querySelector('.edit-btn').addEventListener('click', () => {
        this.showEditor('edit', date);
      });

      controls.querySelector('.delete-btn').addEventListener('click', () => {
        this.deleteReview(date);
      });
    });
  }
}

// Initialize admin system
window.adminSystem = new AdminSystem();
