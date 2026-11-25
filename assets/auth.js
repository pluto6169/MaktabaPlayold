/**
 * MaktabaPlay Auth System with JWT (Node.js/SQLite Backend)
 * Updated to support JWT token-based authentication
 */

const SESSION_KEY = 'maktaba_session';
const TOKEN_KEY = 'authToken';

class AuthSystem {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
        this.token = localStorage.getItem(TOKEN_KEY) || null;
    }

    async register(username, email, password, passwordConfirm) {
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, passwordConfirm })
            });
            const data = await response.json();
            if (data.success) {
                // Auto login after successful registration
                return await this.login(username, password);
            }
            return data;
        } catch (error) {
            return { success: false, message: 'خطأ في الاتصال بالخادم' };
        }
    }

    async login(username, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (data.success) {
                // Store token and user data
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem(TOKEN_KEY, this.token);
                localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentUser));
                this.updateUI();
            }
            return data;
        } catch (error) {
            return { success: false, message: 'خطأ في الاتصال بالخادم' };
        }
    }

    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
        this.updateUI();
        if (window.location.pathname.includes('profile.html')) {
            window.location.href = 'index.html';
        }
    }

    getUserData() {
        return this.currentUser;
    }

    getToken() {
        return this.token;
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    isAuthenticated() {
        return !!this.token && !!this.currentUser;
    }

    async refreshUser() {
        if (!this.currentUser) return null;
        try {
            const response = await fetch('/api/user/' + this.currentUser.username);
            const data = await response.json();
            if (data.success) {
                this.currentUser = data.user;
                localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentUser));
            }
            return this.currentUser;
        } catch (e) {
            return this.currentUser;
        }
    }

    async updateScore(gameId, score) {
        if (!this.currentUser || !this.token) {
            this.showToast('يجب تسجيل الدخول أولاً', 'error');
            return;
        }

        try {
            const response = await fetch('/api/score', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ username: this.currentUser.username, gameId, score })
            });

            const data = await response.json();

            // Handle token expiration
            if (response.status === 401 || response.status === 403) {
                this.logout();
                this.showToast('انتهت صلاحية الجلسة. سجل الدخول مرة أخرى', 'error');
                window.showAuthModal('login');
                return;
            }

            if (data.success) {
                // Update local user data
                this.currentUser.stats.totalScore = data.totalScore;
                this.currentUser.stats.badges = data.badges;
                localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentUser));
                this.updateUI();
            } else {
                this.showToast(data.message || 'خطأ في تحديث النقاط', 'error');
            }
        } catch (e) {
            this.showToast('خطأ في الاتصال بالخادم', 'error');
        }
    }

    async getLeaderboard() {
        try {
            const response = await fetch('/api/leaderboard');
            const data = await response.json();
            return data.success ? data.leaderboard : [];
        } catch (e) {
            return [];
        }
    }

    updateUI() {
        const authLinks = document.getElementById('authLinks');
        if (authLinks) {
            if (this.isAuthenticated()) {
                authLinks.innerHTML = `
                    <div class="user-menu">
                        <div class="user-avatar">${this.currentUser.username.charAt(0).toUpperCase()}</div>
                        <span class="user-score">⭐ ${this.currentUser.stats ? this.currentUser.stats.totalScore : 0}</span>
                        <div class="user-dropdown">
                            <div class="dropdown-header">
                                <strong>${this.currentUser.username}</strong>
                            </div>
                            <a href="profile.html">👤 الملف الشخصي</a>
                            <a href="#" onclick="maktabaAuth.logout(); return false;" style="color: var(--danger);">🚪 تسجيل خروج</a>
                        </div>
                    </div>
                `;
            } else {
                authLinks.innerHTML = `
                    <button class="btn btn-ghost btn-sm" onclick="showAuthModal('login')">تسجيل الدخول</button>
                    <button class="btn btn-sm" onclick="showAuthModal('register')">حساب جديد</button>
                `;
            }
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `maktaba-toast ${type}`;
        toast.innerHTML = message;
        document.body.appendChild(toast);

        toast.offsetHeight;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

window.maktabaAuth = new AuthSystem();

document.addEventListener('DOMContentLoaded', () => {
    window.maktabaAuth.updateUI();
    injectAuthModal();
});

function injectAuthModal() {
    if (document.getElementById('authModal')) return;

    const modalHTML = `
        <div id="authModal" class="auth-modal-overlay">
            <div class="auth-modal">
                <button class="auth-close" onclick="closeAuthModal()">×</button>
                <div class="auth-tabs">
                    <button class="auth-tab active" id="tabLogin" onclick="switchAuthTab('login')">دخول</button>
                    <button class="auth-tab" id="tabRegister" onclick="switchAuthTab('register')">تسجيل</button>
                </div>
                
                <form id="loginForm" class="auth-form" onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label>اسم المستخدم</label>
                        <input type="text" id="loginUsername" required>
                    </div>
                    <div class="form-group">
                        <label>كلمة المرور</label>
                        <input type="password" id="loginPassword" required>
                    </div>
                    <button type="submit" class="btn" style="width: 100%">تسجيل الدخول</button>
                </form>
                
                <form id="registerForm" class="auth-form hidden" onsubmit="handleRegister(event)">
                    <div class="form-group">
                        <label>اسم المستخدم</label>
                        <input type="text" id="regUsername" placeholder="3-20 أحرف وأرقام فقط" required>
                    </div>
                    <div class="form-group">
                        <label>البريد الإلكتروني</label>
                        <input type="email" id="regEmail" required>
                    </div>
                    <div class="form-group">
                        <label>كلمة المرور</label>
                        <input type="password" id="regPassword" placeholder="8+ أحرف، حروف وأرقام وأحرف خاصة" required>
                    </div>
                    <div class="form-group">
                        <label>تأكيد كلمة المرور</label>
                        <input type="password" id="regPasswordConfirm" required>
                    </div>
                    <button type="submit" class="btn" style="width: 100%">إنشاء حساب</button>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.showAuthModal = function (type) {
    document.getElementById('authModal').classList.add('show');
    switchAuthTab(type);
};

window.closeAuthModal = function () {
    document.getElementById('authModal').classList.remove('show');
};

window.switchAuthTab = function (type) {
    document.getElementById('tabLogin').classList.toggle('active', type === 'login');
    document.getElementById('tabRegister').classList.toggle('active', type === 'register');

    document.getElementById('loginForm').classList.toggle('hidden', type !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', type !== 'register');
};

window.handleLogin = async function (e) {
    e.preventDefault();
    const res = await maktabaAuth.login(
        document.getElementById('loginUsername').value,
        document.getElementById('loginPassword').value
    );
    if (res.success) {
        closeAuthModal();
        maktabaAuth.showToast(res.message, 'success');
        // Refresh page or update UI
        setTimeout(() => location.reload(), 500);
    } else {
        maktabaAuth.showToast(res.message, 'error');
    }
};

window.handleRegister = async function (e) {
    e.preventDefault();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;

    if (password !== passwordConfirm) {
        maktabaAuth.showToast('كلمات المرور غير متطابقة', 'error');
        return;
    }

    const res = await maktabaAuth.register(
        document.getElementById('regUsername').value,
        document.getElementById('regEmail').value,
        password,
        passwordConfirm
    );
    if (res.success) {
        closeAuthModal();
        maktabaAuth.showToast(res.message, 'success');
    } else {
        maktabaAuth.showToast(res.message, 'error');
    }
};
