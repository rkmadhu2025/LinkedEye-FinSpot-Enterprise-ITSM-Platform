/**
 * LinkedEye-FinSpot Layout Components
 * Reusable sidebar, header, and layout functions
 */

const Layout = {
    /**
     * Initialize layout components
     */
    init() {
        this.renderSidebar();
        this.renderHeader();
        this.setupEventListeners();
        this.highlightActiveNav();
        this.loadUserData();
    },

    /**
     * Get sidebar HTML
     */
    getSidebarHTML(activeItem = '') {
        return `
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <i class="fas fa-eye"></i>
                </div>
                <div class="sidebar-brand">
                    <h1>LinkedEye</h1>
                    <span>FinSpot Enterprise</span>
                </div>
            </div>
            <nav class="sidebar-nav">
                <div class="nav-section">
                    <div class="nav-section-title">Main</div>
                    <a href="dashboard.html" class="nav-item ${activeItem === 'dashboard' ? 'active' : ''}">
                        <i class="fas fa-chart-line"></i>
                        <span>Dashboard</span>
                    </a>
                </div>
                <div class="nav-section">
                    <div class="nav-section-title">ITSM</div>
                    <a href="incidents.html" class="nav-item ${activeItem === 'incidents' ? 'active' : ''}">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Incidents</span>
                        <span class="nav-badge" id="sidebarIncidentBadge">0</span>
                    </a>
                    <a href="changes.html" class="nav-item ${activeItem === 'changes' ? 'active' : ''}">
                        <i class="fas fa-code-branch"></i>
                        <span>Changes</span>
                        <span class="nav-badge warning" id="sidebarChangeBadge">0</span>
                    </a>
                </div>
                <div class="nav-section">
                    <div class="nav-section-title">Infrastructure</div>
                    <a href="assets.html" class="nav-item ${activeItem === 'assets' ? 'active' : ''}">
                        <i class="fas fa-cubes"></i>
                        <span>Assets</span>
                    </a>
                    <a href="environments.html" class="nav-item ${activeItem === 'environments' ? 'active' : ''}">
                        <i class="fas fa-globe"></i>
                        <span>Environments</span>
                    </a>
                </div>
                <div class="nav-section">
                    <div class="nav-section-title">Analytics</div>
                    <a href="reports.html" class="nav-item ${activeItem === 'reports' ? 'active' : ''}">
                        <i class="fas fa-chart-bar"></i>
                        <span>Reports</span>
                    </a>
                </div>
                <div class="nav-section">
                    <div class="nav-section-title">Admin</div>
                    <a href="users.html" class="nav-item ${activeItem === 'users' ? 'active' : ''}">
                        <i class="fas fa-users"></i>
                        <span>Users</span>
                    </a>
                    <a href="groups.html" class="nav-item ${activeItem === 'groups' ? 'active' : ''}">
                        <i class="fas fa-user-friends"></i>
                        <span>Groups</span>
                    </a>
                    <a href="roles.html" class="nav-item ${activeItem === 'roles' ? 'active' : ''}">
                        <i class="fas fa-key"></i>
                        <span>Roles</span>
                    </a>
                    <a href="settings.html" class="nav-item ${activeItem === 'settings' ? 'active' : ''}">
                        <i class="fas fa-cog"></i>
                        <span>Settings</span>
                    </a>
                </div>
            </nav>
            <div class="sidebar-footer">
                <div class="env-selector" id="envSelector">
                    <div class="env-dot"></div>
                    <span id="currentEnvName">Default Environment</span>
                </div>
            </div>
        `;
    },

    /**
     * Get header HTML
     */
    getHeaderHTML(pageTitle = 'Dashboard') {
        return `
            <div class="header-left">
                <button class="sidebar-toggle" id="sidebarToggle">
                    <i class="fas fa-bars"></i>
                </button>
                <h1 class="page-title">${pageTitle}</h1>
                <div class="header-search">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Search incidents, assets, changes..." id="globalSearch">
                </div>
            </div>
            <div class="header-right">
                <div class="live-indicator">
                    <div class="live-dot"></div>
                    <span>Live</span>
                </div>
                <button class="header-btn" title="Refresh" id="refreshBtn">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <button class="header-btn" title="Notifications" id="notificationBtn">
                    <i class="fas fa-bell"></i>
                    <span class="badge" id="notificationBadge">0</span>
                </button>
                <button class="header-btn" title="Help">
                    <i class="fas fa-question-circle"></i>
                </button>
                <div class="user-menu" id="userMenu">
                    <div class="user-avatar" id="userAvatar">--</div>
                    <div class="user-info">
                        <div class="user-name" id="userName">Loading...</div>
                        <div class="user-role" id="userRole">--</div>
                    </div>
                    <div class="user-dropdown" id="userDropdown">
                        <a href="profile.html" class="user-dropdown-item">
                            <i class="fas fa-user"></i>
                            <span>My Profile</span>
                        </a>
                        <a href="settings.html" class="user-dropdown-item">
                            <i class="fas fa-cog"></i>
                            <span>Settings</span>
                        </a>
                        <div class="user-dropdown-divider"></div>
                        <div class="user-dropdown-item logout" id="logoutBtn">
                            <i class="fas fa-sign-out-alt"></i>
                            <span>Logout</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render sidebar
     */
    renderSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && !sidebar.innerHTML.trim()) {
            const activeItem = this.getActiveNavItem();
            sidebar.innerHTML = this.getSidebarHTML(activeItem);
        }
    },

    /**
     * Render header
     */
    renderHeader() {
        const header = document.querySelector('.header');
        if (header && !header.innerHTML.trim()) {
            const pageTitle = document.title.split('|')[0].trim();
            header.innerHTML = this.getHeaderHTML(pageTitle);
        }
    },

    /**
     * Get active navigation item based on current page
     */
    getActiveNavItem() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '');

        const pageMap = {
            'dashboard': 'dashboard',
            'incidents': 'incidents',
            'incident-detail': 'incidents',
            'incident-create': 'incidents',
            'changes': 'changes',
            'change-detail': 'changes',
            'change-create': 'changes',
            'assets': 'assets',
            'asset-detail': 'assets',
            'environments': 'environments',
            'reports': 'reports',
            'users': 'users',
            'groups': 'groups',
            'roles': 'roles',
            'settings': 'settings'
        };

        return pageMap[page] || 'dashboard';
    },

    /**
     * Highlight active navigation item
     */
    highlightActiveNav() {
        const activeItem = this.getActiveNavItem();
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href && href.includes(activeItem)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    /**
     * Load user data into header
     */
    loadUserData() {
        const user = API.getCurrentUser();
        if (user) {
            const userName = document.getElementById('userName');
            const userRole = document.getElementById('userRole');
            const userAvatar = document.getElementById('userAvatar');

            if (userName) userName.textContent = `${user.firstName} ${user.lastName}`;
            if (userRole) userRole.textContent = user.roles?.[0]?.name || 'User';
            if (userAvatar) {
                userAvatar.textContent = (user.firstName?.[0] || '') + (user.lastName?.[0] || '');
            }
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // User menu toggle
        const userMenu = document.getElementById('userMenu');
        const userDropdown = document.getElementById('userDropdown');

        if (userMenu && userDropdown) {
            userMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await API.auth.logout();
                } catch (e) {
                    console.error('Logout error:', e);
                }
                API.clearTokens();
                window.location.href = 'login.html';
            });
        }

        // Sidebar toggle (mobile)
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.sidebar');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Global search
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = globalSearch.value.trim();
                    if (query) {
                        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
                    }
                }
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const icon = refreshBtn.querySelector('i');
                icon.classList.add('fa-spin');

                // Dispatch custom event for page-specific refresh
                window.dispatchEvent(new CustomEvent('layout:refresh'));

                setTimeout(() => {
                    icon.classList.remove('fa-spin');
                }, 1000);
            });
        }

        // Live indicator animation
        setInterval(() => {
            const liveDot = document.querySelector('.live-dot');
            if (liveDot) {
                liveDot.style.opacity = liveDot.style.opacity === '0.5' ? '1' : '0.5';
            }
        }, 1000);
    },

    /**
     * Update badge counts
     */
    updateBadges(incidents = 0, changes = 0, notifications = 0) {
        const incidentBadge = document.getElementById('sidebarIncidentBadge');
        const changeBadge = document.getElementById('sidebarChangeBadge');
        const notificationBadge = document.getElementById('notificationBadge');

        if (incidentBadge) incidentBadge.textContent = incidents;
        if (changeBadge) changeBadge.textContent = changes;
        if (notificationBadge) notificationBadge.textContent = notifications;
    },

    /**
     * Show loading state
     */
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('hidden');
    },

    /**
     * Hide loading state
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('hidden');
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Format date for display
     */
    formatDate(dateStr, format = 'medium') {
        const date = new Date(dateStr);

        switch (format) {
            case 'short':
                return date.toLocaleDateString();
            case 'long':
                return date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            case 'time':
                return date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            case 'datetime':
                return date.toLocaleString();
            case 'relative':
                return this.formatTimeAgo(dateStr);
            default:
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
        }
    },

    /**
     * Format time ago
     */
    formatTimeAgo(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString();
    },

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Capitalize first letter
     */
    capitalizeFirst(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
    },

    /**
     * Format status for display
     */
    formatStatus(status) {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    },

    /**
     * Get status badge class
     */
    getStatusClass(status) {
        const map = {
            'open': 'warning',
            'new': 'info',
            'in_progress': 'info',
            'pending': 'warning',
            'on_hold': 'warning',
            'resolved': 'success',
            'closed': 'success',
            'cancelled': 'secondary',
            'critical': 'critical',
            'high': 'high',
            'medium': 'medium',
            'low': 'low'
        };
        return map[status] || 'info';
    },

    /**
     * Get priority badge class
     */
    getPriorityClass(priority) {
        const map = {
            'critical': 'critical',
            'high': 'high',
            'medium': 'medium',
            'low': 'low'
        };
        return map[priority] || 'medium';
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (typeof API !== 'undefined') {
        API.init();
        if (!API.isAuthenticated() && !window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
            window.location.href = 'login.html';
            return;
        }
    }

    Layout.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Layout;
}
