/**
 * Authentication Service
 * Handles user authentication, registration, and token management
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/database');
const logger = require('../utils/logger');
const { generateToken, hashString } = require('../utils/helpers');
const { UnauthorizedError, ConflictError, BadRequestError, NotFoundError } = require('../middleware/errorHandler');

/**
 * Register a new user
 */
const register = async (userData) => {
    const { email, password, firstName, lastName, organizationId, organizationCode, organizationType } = userData;

    // Check if user already exists
    const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
        throw new ConflictError('User with this email already exists');
    }

    // Handle organization
    let orgId = organizationId;

    if (organizationType === 'create' && organizationCode) {
        // Check if organization code exists
        const existingOrg = await db.query(
            'SELECT id FROM organizations WHERE code = $1',
            [organizationCode.toLowerCase()]
        );

        if (existingOrg.rows.length > 0) {
            throw new ConflictError('Organization code already exists');
        }

        // Create new organization
        const orgResult = await db.query(
            `INSERT INTO organizations (name, code, settings)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [userData.organizationName || organizationCode, organizationCode.toLowerCase(), JSON.stringify({})]
        );

        orgId = orgResult.rows[0].id;

        // Create default roles for new organization
        await createDefaultRoles(orgId);
    } else if (organizationType === 'join' && organizationId) {
        // Verify organization exists
        const org = await db.query('SELECT id FROM organizations WHERE id = $1', [organizationId]);
        if (org.rows.length === 0) {
            throw new BadRequestError('Organization not found');
        }
        orgId = organizationId;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.bcrypt.rounds);

    // Create user
    const result = await db.query(
        `INSERT INTO users (
            organization_id, email, password_hash, first_name, last_name,
            display_name, status, auth_provider, password_changed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING id, organization_id, email, first_name, last_name, display_name, status`,
        [
            orgId,
            email.toLowerCase(),
            passwordHash,
            firstName,
            lastName,
            `${firstName} ${lastName}`,
            'active',
            'local'
        ]
    );

    const user = result.rows[0];

    // Assign default role
    const defaultRole = await db.query(
        `SELECT id FROM roles WHERE organization_id = $1 AND code = $2`,
        [orgId, organizationType === 'create' ? 'admin' : 'end_user']
    );

    if (defaultRole.rows.length > 0) {
        await db.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
            [user.id, defaultRole.rows[0].id]
        );
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Store refresh token
    await storeRefreshToken(user.id, tokens.refreshToken);

    logger.info('User registered', { userId: user.id, email: user.email });

    return {
        user: formatUserResponse(user),
        ...tokens
    };
};

/**
 * Login user
 */
const login = async (email, password, deviceInfo = {}) => {
    // Find user
    const result = await db.query(
        `SELECT
            u.id, u.organization_id, u.email, u.password_hash, u.first_name, u.last_name,
            u.display_name, u.status, u.avatar_url, u.job_title, u.department,
            u.failed_login_attempts, u.locked_until,
            array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.email = $1 AND u.deleted_at IS NULL
        GROUP BY u.id`,
        [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
        throw new UnauthorizedError('Invalid email or password');
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
        throw new UnauthorizedError('Account is temporarily locked. Please try again later.');
    }

    // Check user status
    if (user.status !== 'active') {
        throw new UnauthorizedError('Account is not active');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
        // Increment failed attempts
        await db.query(
            `UPDATE users SET
                failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE WHEN failed_login_attempts >= 4 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE locked_until END
            WHERE id = $1`,
            [user.id]
        );

        throw new UnauthorizedError('Invalid email or password');
    }

    // Reset failed attempts and update last login
    await db.query(
        `UPDATE users SET
            failed_login_attempts = 0,
            locked_until = NULL,
            last_login_at = CURRENT_TIMESTAMP,
            last_login_ip = $2
        WHERE id = $1`,
        [user.id, deviceInfo.ip || null]
    );

    // Generate tokens
    const tokens = generateTokens(user);

    // Store refresh token
    await storeRefreshToken(user.id, tokens.refreshToken, deviceInfo);

    logger.info('User logged in', { userId: user.id, email: user.email });

    return {
        user: formatUserResponse(user),
        ...tokens
    };
};

/**
 * Refresh access token
 */
const refreshToken = async (token) => {
    try {
        // Verify refresh token
        const decoded = jwt.verify(token, config.jwt.refreshSecret);

        // Check if token exists in database
        const tokenHash = hashString(token);
        const result = await db.query(
            `SELECT rt.*, u.status FROM refresh_tokens rt
             JOIN users u ON rt.user_id = u.id
             WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > CURRENT_TIMESTAMP`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            throw new UnauthorizedError('Invalid refresh token');
        }

        const storedToken = result.rows[0];

        if (storedToken.status !== 'active') {
            throw new UnauthorizedError('User account is not active');
        }

        // Get user info
        const userResult = await db.query(
            `SELECT id, organization_id, email, first_name, last_name, display_name, status
             FROM users WHERE id = $1`,
            [storedToken.user_id]
        );

        const user = userResult.rows[0];

        // Generate new tokens
        const tokens = generateTokens(user);

        // Revoke old refresh token and store new one
        await db.query('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1', [storedToken.id]);
        await storeRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new UnauthorizedError('Refresh token expired');
        }
        throw error;
    }
};

/**
 * Logout user
 */
const logout = async (userId, refreshToken) => {
    if (refreshToken) {
        const tokenHash = hashString(refreshToken);
        await db.query(
            'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1',
            [tokenHash]
        );
    }

    logger.info('User logged out', { userId });
};

/**
 * Logout from all devices
 */
const logoutAll = async (userId) => {
    await db.query(
        'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL',
        [userId]
    );

    logger.info('User logged out from all devices', { userId });
};

/**
 * Change password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
    // Get user
    const result = await db.query(
        'SELECT id, password_hash FROM users WHERE id = $1',
        [userId]
    );

    if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
    }

    const user = result.rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
        throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.rounds);

    // Update password
    await db.query(
        `UPDATE users SET
            password_hash = $1,
            password_changed_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
        [passwordHash, userId]
    );

    // Revoke all refresh tokens
    await logoutAll(userId);

    logger.info('Password changed', { userId });
};

/**
 * Request password reset
 */
const requestPasswordReset = async (email) => {
    const result = await db.query(
        'SELECT id, email, first_name FROM users WHERE email = $1 AND deleted_at IS NULL',
        [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
        // Don't reveal if email exists
        return;
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = generateToken(32);
    const resetTokenHash = hashString(resetToken);
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token (using sessions table for simplicity)
    await db.query(
        `INSERT INTO sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (token_hash) DO UPDATE SET expires_at = $3`,
        [user.id, resetTokenHash, expiresAt]
    );

    // In production, send email with reset link
    logger.info('Password reset requested', { userId: user.id, email: user.email });

    // Return token for testing (remove in production)
    return { resetToken, expiresAt };
};

/**
 * Reset password with token
 */
const resetPassword = async (token, newPassword) => {
    const tokenHash = hashString(token);

    const result = await db.query(
        `SELECT s.user_id, s.expires_at FROM sessions s
         WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
        [tokenHash]
    );

    if (result.rows.length === 0) {
        throw new BadRequestError('Invalid or expired reset token');
    }

    const { user_id: userId } = result.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.rounds);

    // Update password
    await db.query(
        `UPDATE users SET
            password_hash = $1,
            password_changed_at = CURRENT_TIMESTAMP,
            failed_login_attempts = 0,
            locked_until = NULL
        WHERE id = $2`,
        [passwordHash, userId]
    );

    // Delete reset token
    await db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);

    // Revoke all refresh tokens
    await logoutAll(userId);

    logger.info('Password reset completed', { userId });
};

/**
 * Get current user profile
 */
const getProfile = async (userId) => {
    const result = await db.query(
        `SELECT
            u.id, u.organization_id, u.email, u.first_name, u.last_name,
            u.display_name, u.phone, u.avatar_url, u.job_title, u.department,
            u.location, u.timezone, u.status, u.email_verified, u.preferences,
            u.last_login_at, u.created_at,
            o.name as organization_name, o.code as organization_code,
            array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL) as roles,
            array_agg(DISTINCT r.permissions) FILTER (WHERE r.permissions IS NOT NULL) as permissions
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1 AND u.deleted_at IS NULL
        GROUP BY u.id, o.id`,
        [userId]
    );

    if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
    }

    const user = result.rows[0];

    // Flatten permissions
    const flatPermissions = [];
    if (user.permissions) {
        user.permissions.forEach((permArray) => {
            if (Array.isArray(permArray)) {
                flatPermissions.push(...permArray);
            }
        });
    }

    return {
        id: user.id,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        organizationCode: user.organization_code,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        displayName: user.display_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        jobTitle: user.job_title,
        department: user.department,
        location: user.location,
        timezone: user.timezone,
        status: user.status,
        emailVerified: user.email_verified,
        preferences: user.preferences,
        roles: user.roles || [],
        permissions: [...new Set(flatPermissions)],
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
    };
};

// Helper functions

const generateTokens = (user) => {
    const accessToken = jwt.sign(
        {
            userId: user.id,
            organizationId: user.organization_id,
            email: user.email,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
        { userId: user.id },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, token, deviceInfo = {}) => {
    const tokenHash = hashString(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, tokenHash, JSON.stringify(deviceInfo), deviceInfo.ip, expiresAt]
    );
};

const formatUserResponse = (user) => ({
    id: user.id,
    organizationId: user.organization_id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    displayName: user.display_name,
    status: user.status,
    roles: user.roles || [],
});

const createDefaultRoles = async (orgId) => {
    const defaultRoles = [
        { name: 'Administrator', code: 'admin', permissions: ['*'], isSystem: true },
        { name: 'Manager', code: 'manager', permissions: ['incidents:*', 'changes:*', 'assets:read', 'reports:*'], isSystem: true },
        { name: 'Technician', code: 'technician', permissions: ['incidents:*', 'changes:read', 'assets:read'], isSystem: true },
        { name: 'End User', code: 'end_user', permissions: ['incidents:create', 'incidents:read:own'], isSystem: true },
    ];

    for (const role of defaultRoles) {
        await db.query(
            `INSERT INTO roles (organization_id, name, code, permissions, is_system)
             VALUES ($1, $2, $3, $4, $5)`,
            [orgId, role.name, role.code, JSON.stringify(role.permissions), role.isSystem]
        );
    }
};

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    logoutAll,
    changePassword,
    requestPasswordReset,
    resetPassword,
    getProfile,
};
