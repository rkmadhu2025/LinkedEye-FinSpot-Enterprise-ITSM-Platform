/**
 * LinkedEye-FinSpot API Service
 * Handles all API communication with the backend
 */

const API = {
    baseUrl: 'http://localhost:3000/api',
    token: null,
    refreshToken: null,

    /**
     * Initialize API with stored tokens
     */
    init() {
        this.token = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
    },

    /**
     * Set authentication tokens
     */
    setTokens(accessToken, refreshToken) {
        this.token = accessToken;
        this.refreshToken = refreshToken;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
    },

    /**
     * Clear authentication tokens
     */
    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.token;
    },

    /**
     * Get current user from storage
     */
    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    /**
     * Set current user in storage
     */
    setCurrentUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },

    /**
     * Make API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            // Handle token expiration
            if (response.status === 401 && data.message === 'Token expired') {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // Retry request with new token
                    headers['Authorization'] = `Bearer ${this.token}`;
                    const retryResponse = await fetch(url, { ...config, headers });
                    return await retryResponse.json();
                } else {
                    // Redirect to login
                    this.clearTokens();
                    window.location.href = '/login.html';
                    return null;
                }
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    /**
     * Refresh access token
     */
    async refreshAccessToken() {
        if (!this.refreshToken) return false;

        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            const data = await response.json();

            if (data.success) {
                this.setTokens(data.data.accessToken, data.data.refreshToken);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    },

    // ============================================
    // AUTH ENDPOINTS
    // ============================================

    auth: {
        async login(email, password) {
            return API.request('/auth/login', {
                method: 'POST',
                body: { email, password }
            });
        },

        async register(data) {
            return API.request('/auth/register', {
                method: 'POST',
                body: data
            });
        },

        async logout() {
            const result = await API.request('/auth/logout', {
                method: 'POST',
                body: { refreshToken: API.refreshToken }
            });
            API.clearTokens();
            return result;
        },

        async me() {
            return API.request('/auth/me');
        },

        async changePassword(currentPassword, newPassword) {
            return API.request('/auth/change-password', {
                method: 'POST',
                body: { currentPassword, newPassword }
            });
        },

        async forgotPassword(email) {
            return API.request('/auth/forgot-password', {
                method: 'POST',
                body: { email }
            });
        },

        async resetPassword(token, newPassword) {
            return API.request('/auth/reset-password', {
                method: 'POST',
                body: { token, newPassword }
            });
        }
    },

    // ============================================
    // USER ENDPOINTS
    // ============================================

    users: {
        async list(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/users?${query}`);
        },

        async get(id) {
            return API.request(`/users/${id}`);
        },

        async create(data) {
            return API.request('/users', {
                method: 'POST',
                body: data
            });
        },

        async update(id, data) {
            return API.request(`/users/${id}`, {
                method: 'PUT',
                body: data
            });
        },

        async delete(id) {
            return API.request(`/users/${id}`, {
                method: 'DELETE'
            });
        },

        async updateRoles(id, roleIds) {
            return API.request(`/users/${id}/roles`, {
                method: 'PUT',
                body: { roleIds }
            });
        }
    },

    // ============================================
    // ROLE ENDPOINTS
    // ============================================

    roles: {
        async list() {
            return API.request('/roles');
        },

        async get(id) {
            return API.request(`/roles/${id}`);
        },

        async create(data) {
            return API.request('/roles', {
                method: 'POST',
                body: data
            });
        },

        async update(id, data) {
            return API.request(`/roles/${id}`, {
                method: 'PUT',
                body: data
            });
        },

        async delete(id) {
            return API.request(`/roles/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // ============================================
    // GROUP ENDPOINTS
    // ============================================

    groups: {
        async list(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/groups?${query}`);
        },

        async get(id) {
            return API.request(`/groups/${id}`);
        },

        async create(data) {
            return API.request('/groups', {
                method: 'POST',
                body: data
            });
        },

        async update(id, data) {
            return API.request(`/groups/${id}`, {
                method: 'PUT',
                body: data
            });
        },

        async delete(id) {
            return API.request(`/groups/${id}`, {
                method: 'DELETE'
            });
        },

        async addMember(groupId, userId, role = 'member') {
            return API.request(`/groups/${groupId}/members`, {
                method: 'POST',
                body: { userId, role }
            });
        },

        async removeMember(groupId, userId) {
            return API.request(`/groups/${groupId}/members/${userId}`, {
                method: 'DELETE'
            });
        }
    },

    // ============================================
    // INCIDENT ENDPOINTS
    // ============================================

    incidents: {
        async list(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/incidents?${query}`);
        },

        async get(id) {
            return API.request(`/incidents/${id}`);
        },

        async create(data) {
            return API.request('/incidents', {
                method: 'POST',
                body: data
            });
        },

        async update(id, data) {
            return API.request(`/incidents/${id}`, {
                method: 'PUT',
                body: data
            });
        },

        async updateStatus(id, status, comment = null) {
            return API.request(`/incidents/${id}/status`, {
                method: 'PATCH',
                body: { status, comment }
            });
        },

        async assign(id, assignedTo, assignedGroupId) {
            return API.request(`/incidents/${id}/assign`, {
                method: 'PATCH',
                body: { assignedTo, assignedGroupId }
            });
        },

        async addComment(id, comment, isPublic = true) {
            return API.request(`/incidents/${id}/comments`, {
                method: 'POST',
                body: { comment, isPublic }
            });
        },

        async resolve(id, resolutionNotes, rootCause = null) {
            return API.request(`/incidents/${id}/resolve`, {
                method: 'POST',
                body: { resolutionNotes, rootCause }
            });
        },

        async reopen(id, reason) {
            return API.request(`/incidents/${id}/reopen`, {
                method: 'POST',
                body: { reason }
            });
        },

        async getStatistics(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/incidents/statistics?${query}`);
        }
    },

    // ============================================
    // CHANGE ENDPOINTS
    // ============================================

    changes: {
        async list(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/changes?${query}`);
        },

        async get(id) {
            return API.request(`/changes/${id}`);
        },

        async create(data) {
            return API.request('/changes', {
                method: 'POST',
                body: data
            });
        },

        async update(id, data) {
            return API.request(`/changes/${id}`, {
                method: 'PUT',
                body: data
            });
        },

        async submit(id) {
            return API.request(`/changes/${id}/submit`, {
                method: 'POST'
            });
        },

        async approve(id, comments = null) {
            return API.request(`/changes/${id}/approve`, {
                method: 'POST',
                body: { comments }
            });
        },

        async reject(id, reason) {
            return API.request(`/changes/${id}/reject`, {
                method: 'POST',
                body: { reason }
            });
        },

        async implement(id) {
            return API.request(`/changes/${id}/implement`, {
                method: 'POST'
            });
        },

        async complete(id, completionNotes = null) {
            return API.request(`/changes/${id}/complete`, {
                method: 'POST',
                body: { completionNotes }
            });
        },

        async getCalendar(startDate, endDate) {
            return API.request(`/changes/calendar?startDate=${startDate}&endDate=${endDate}`);
        }
    },

    // ============================================
    // ASSET ENDPOINTS
    // ============================================

    assets: {
        async list(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/assets?${query}`);
        },

        async get(id) {
            return API.request(`/assets/${id}`);
        },

        async create(data) {
            return API.request('/assets', {
                method: 'POST',
                body: data
            });
        },

        async update(id, data) {
            return API.request(`/assets/${id}`, {
                method: 'PUT',
                body: data
            });
        },

        async delete(id) {
            return API.request(`/assets/${id}`, {
                method: 'DELETE'
            });
        },

        async getTypes() {
            return API.request('/assets/types');
        },

        async addRelationship(assetId, targetAssetId, relationshipType, description = null) {
            return API.request(`/assets/${assetId}/relationships`, {
                method: 'POST',
                body: { targetAssetId, relationshipType, description }
            });
        }
    },

    // ============================================
    // ENVIRONMENT ENDPOINTS
    // ============================================

    environments: {
        async list() {
            return API.request('/environments');
        },

        async get(id) {
            return API.request(`/environments/${id}`);
        },

        async create(data) {
            return API.request('/environments', {
                method: 'POST',
                body: data
            });
        },

        async update(id, data) {
            return API.request(`/environments/${id}`, {
                method: 'PUT',
                body: data
            });
        },

        async updateHealth(id, healthMetrics, status = null) {
            return API.request(`/environments/${id}/health`, {
                method: 'PUT',
                body: { healthMetrics, status }
            });
        }
    },

    // ============================================
    // DASHBOARD ENDPOINTS
    // ============================================

    dashboard: {
        async get() {
            return API.request('/dashboard');
        },

        async getMetrics() {
            return API.request('/dashboard/metrics');
        },

        async getIncidentCharts(days = 30) {
            return API.request(`/dashboard/charts/incidents?days=${days}`);
        },

        async getSLACharts() {
            return API.request('/dashboard/charts/sla');
        },

        async getAIInsights() {
            return API.request('/dashboard/ai-insights');
        }
    },

    // ============================================
    // REPORT ENDPOINTS
    // ============================================

    reports: {
        async incidentSummary(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/reports/incidents/summary?${query}`);
        },

        async incidentsByAssignee(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/reports/incidents/by-assignee?${query}`);
        },

        async incidentsByGroup(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/reports/incidents/by-group?${query}`);
        },

        async changeSummary(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/reports/changes/summary?${query}`);
        },

        async slaPerformance(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/reports/sla/performance?${query}`);
        },

        async assetInventory() {
            return API.request('/reports/assets/inventory');
        }
    },

    // ============================================
    // SETTINGS ENDPOINTS
    // ============================================

    settings: {
        async getAll() {
            return API.request('/settings');
        },

        async get(key) {
            return API.request(`/settings/${key}`);
        },

        async update(key, value, description = null) {
            return API.request(`/settings/${key}`, {
                method: 'PUT',
                body: { value, description }
            });
        },

        async getSLADefinitions() {
            return API.request('/settings/sla/definitions');
        },

        async updateSLADefinition(id, data) {
            return API.request(`/settings/sla/definitions/${id}`, {
                method: 'PUT',
                body: data
            });
        },

        async getOrganization() {
            return API.request('/settings/organization/info');
        },

        async updateOrganization(data) {
            return API.request('/settings/organization/info', {
                method: 'PUT',
                body: data
            });
        },

        async getNotificationConfig() {
            return API.request('/settings/notifications/config');
        },

        async updateNotificationConfig(config) {
            return API.request('/settings/notifications/config', {
                method: 'PUT',
                body: config
            });
        },

        async getAuditLog(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.request(`/settings/audit-log?${query}`);
        }
    }
};

// Initialize on load
API.init();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
