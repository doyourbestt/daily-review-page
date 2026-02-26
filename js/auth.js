// =========================================
// Authentication System
// =========================================

class AuthSystem {
  constructor() {
    this.currentUser = null;
    this.currentProfile = null;
    this.isAdmin = false;
    this.authListeners = [];
    
    this.init();
  }

  async init() {
    // Check for existing session
    await this.checkSession();
    
    // Setup auth state listener
    if (window.supabaseClient.initialized) {
      window.supabaseClient.onAuthStateChange((event, session) => {
        this.handleAuthChange(event, session);
      });
    }

    // Setup UI event listeners
    this.setupEventListeners();
  }

  async checkSession() {
    if (!window.supabaseClient.initialized) {
      this.currentUser = null;
      this.updateUI();
      return;
    }

    try {
      const session = await window.supabaseClient.getSession();
      if (session && session.user) {
        this.currentUser = session.user;
        await this.loadUserProfile();
        this.updateUI();
      }
    } catch (error) {
      console.error('Check session error:', error);
    }
  }

  async loadUserProfile() {
    if (!this.currentUser) return;

    try {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', this.currentUser.id)
        .single();

      if (error) throw error;
      
      this.currentProfile = data;
      this.isAdmin = data.is_admin || false;
    } catch (error) {
      console.error('Load profile error:', error);
    }
  }

  async handleAuthChange(event, session) {
    console.log('Auth event:', event);
    
    if (event === 'SIGNED_IN') {
      this.currentUser = session.user;
      await this.loadUserProfile();
      this.updateUI();
      this.notifyListeners('signed_in');
      this.showToast('登录成功！欢迎回来 👋');
    } else if (event === 'SIGNED_OUT') {
      this.currentUser = null;
      this.currentProfile = null;
      this.isAdmin = false;
      this.updateUI();
      this.notifyListeners('signed_out');
      this.showToast('已退出登录');
    } else if (event === 'USER_UPDATED') {
      await this.loadUserProfile();
      this.updateUI();
    }
  }

  setupEventListeners() {
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.showAuthModal('login'));
    }

    // Close modal
    const closeBtn = document.getElementById('authModalClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideAuthModal());
    }

    // Close on overlay click
    const overlay = document.getElementById('authModalOverlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.hideAuthModal();
        }
      });
    }

    // Tab switching
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    
    if (loginTab) {
      loginTab.addEventListener('click', () => this.switchTab('login'));
    }
    if (registerTab) {
      registerTab.addEventListener('click', () => this.switchTab('register'));
    }

    // Form submissions
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // User menu toggle
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
      userAvatar.addEventListener('click', () => this.toggleUserMenu());
    }
  }

  showAuthModal(tab = 'login') {
    const modal = document.getElementById('authModalOverlay');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      this.switchTab(tab);
    }
  }

  hideAuthModal() {
    const modal = document.getElementById('authModalOverlay');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      this.clearAuthError();
    }
  }

  switchTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (tab === 'login') {
      loginTab?.classList.add('active');
      registerTab?.classList.remove('active');
      loginForm?.classList.remove('hidden');
      registerForm?.classList.add('hidden');
    } else {
      loginTab?.classList.remove('active');
      registerTab?.classList.add('active');
      loginForm?.classList.add('hidden');
      registerForm?.classList.remove('hidden');
    }

    this.clearAuthError();
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = '登录中...';

    try {
      await window.supabaseClient.signIn(email, password);
      this.hideAuthModal();
      form.reset();
    } catch (error) {
      console.error('Login error:', error);
      this.showAuthError(this.getErrorMessage(error));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '登录';
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    
    const form = e.target;
    const username = form.querySelector('input[name="username"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    // Validate password
    if (password.length < 6) {
      this.showAuthError('密码至少需要6个字符');
      return;
    }

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = '注册中...';

    try {
      await window.supabaseClient.signUp(email, password, username);
      this.showToast('注册成功！请查收邮箱验证邮件 📧');
      this.switchTab('login');
      form.reset();
    } catch (error) {
      console.error('Register error:', error);
      this.showAuthError(this.getErrorMessage(error));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '注册';
    }
  }

  async handleLogout() {
    try {
      await window.supabaseClient.signOut();
      this.hideUserMenu();
    } catch (error) {
      console.error('Logout error:', error);
      this.showToast('退出失败，请重试');
    }
  }

  toggleUserMenu() {
    const menu = document.getElementById('userDropdown');
    if (menu) {
      menu.classList.toggle('hidden');
    }
  }

  hideUserMenu() {
    const menu = document.getElementById('userDropdown');
    if (menu) {
      menu.classList.add('hidden');
    }
  }

  updateUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userNameEl = document.getElementById('userName');
    const userAvatarImg = document.getElementById('userAvatarImg');
    const adminCreateBtn = document.getElementById('adminCreateBtn');

    if (this.currentUser) {
      // Show user menu, hide login button
      if (loginBtn) loginBtn.classList.add('hidden');
      if (userMenu) userMenu.classList.remove('hidden');
      
      // Update user info
      const displayName = this.currentProfile?.display_name || 
                          this.currentProfile?.username || 
                          this.currentUser.email.split('@')[0];
      if (userNameEl) userNameEl.textContent = displayName;
      
      // Update avatar
      if (userAvatarImg) {
        const avatarUrl = this.currentProfile?.avatar_url || 
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FF2442&color=fff`;
        userAvatarImg.src = avatarUrl;
      }

      // Show admin button if admin
      if (adminCreateBtn) {
        if (this.isAdmin) {
          adminCreateBtn.classList.remove('hidden');
        } else {
          adminCreateBtn.classList.add('hidden');
        }
      }
    } else {
      // Show login button, hide user menu
      if (loginBtn) loginBtn.classList.remove('hidden');
      if (userMenu) userMenu.classList.add('hidden');
      if (adminCreateBtn) adminCreateBtn.classList.add('hidden');
    }
  }

  showAuthError(message) {
    const errorEl = document.getElementById('authError');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  clearAuthError() {
    const errorEl = document.getElementById('authError');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
  }

  getErrorMessage(error) {
    const errorMessages = {
      'Invalid login credentials': '邮箱或密码错误',
      'Email not confirmed': '请先验证邮箱',
      'User already registered': '该邮箱已被注册',
      'Password should be at least 6 characters': '密码至少需要6个字符'
    };

    return errorMessages[error.message] || error.message || '操作失败，请重试';
  }

  showToast(message) {
    if (window.showToast) {
      window.showToast(message);
    }
  }

  // Subscribe to auth events
  onAuthEvent(callback) {
    this.authListeners.push(callback);
  }

  notifyListeners(event) {
    this.authListeners.forEach(callback => {
      try {
        callback(event, this.currentUser);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  // Helper: Check if user is logged in
  isAuthenticated() {
    return !!this.currentUser;
  }

  // Helper: Check if user is admin
  isUserAdmin() {
    return this.isAdmin;
  }
}

// Initialize auth system
window.authSystem = new AuthSystem();
