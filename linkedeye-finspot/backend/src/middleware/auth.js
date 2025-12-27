/**
 * Authentication Middleware
 * JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const db = require('../config/database');

/**
 * Authenticate JWT token
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return apiResponse.unauthorized(res, 'No token provided');
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        // Get user from database
        const result = await db.query(
            `SELECT
                u.id, u.organization_id, u.email, u.first_name, u.last_name,
                u.display_name, u.status, u.avatar_url, u.job_title, u.department,
                u.timezone, u.preferences,
                array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL) as roles,
                array_agg(DISTINCT r.permissions) FILTER (WHERE r.permissions IS NOT NULL) as permissions
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.id = $1 AND u.deleted_at IS NULL
            GROUP BY u.id`,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return apiResponse.unauthorized(res, 'User not found');
        }

        const user = result.rows[0];

        // Check user status
        if (user.status !== 'active') {
            return apiResponse.unauthorized(res, 'Account is not active');
        }

        // Flatten permissions
        const flatPermissions = [];
        if (user.permissions) {
            user.permissions.forEach((permArray) => {
                if (Array.isArray(permArray)) {
                    flatPermissions.push(...permArray);
                }
            });
        }
        user.permissions = [...new Set(flatPermissions)];

        // Attach user to request
        req.user = {
            id: user.id,
            organizationId: user.organization_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            displayName: user.display_name || `${user.first_name} ${user.last_name}`,
            status: user.status,
            avatarUrl: user.avatar_url,
            jobTitle: user.job_title,
            department: user.department,
            timezone: user.timezone,
            preferences: user.preferences,
            roles: user.roles || [],
            permissions: user.permissions,
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return apiResponse.unauthorized(res, 'Token expired');
        }
        if (error.name === 'JsonWebTokenError') {
            return apiResponse.unauthorized(res, 'Invalid token');
        }
        logger.error('Authentication error', { error: error.message });
        return apiResponse.unauthorized(res, 'Authentication failed');
    }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    return authenticate(req, res, next);
};

/**
 * Check if user has required permission
 * @param {string|string[]} requiredPermissions - Required permission(s)
 */
const authorize = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return apiResponse.unauthorized(res, 'Authentication required');
        }

        const permissions = Array.isArray(requiredPermissions)
            ? requiredPermissions
            : [requiredPermissions];

        // Check for wildcard permission (admin)
        if (req.user.permissions.includes('*')) {
            return next();
        }

        // Check for required permissions
        const hasPermission = permissions.some((permission) => {
            // Check exact match
            if (req.user.permissions.includes(permission)) {
                return true;
            }

            // Check wildcard match (e.g., 'incidents:*' matches 'incidents:create')
            const [resource, action] = permission.split(':');
            if (req.user.permissions.includes(`${resource}:*`)) {
                return true;
            }

            return false;
        });

        if (!hasPermission) {
            logger.warn('Authorization failed', {
                userId: req.user.id,
                required: permissions,
                actual: req.user.permissions,
            });
            return apiResponse.forbidden(res, 'Insufficient permissions');
        }

        next();
    };
};

/**
 * Check if user has required role
 * @param {string|string[]} requiredRoles - Required role(s)
 */
const requireRole = (requiredRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return apiResponse.unauthorized(res, 'Authentication required');
        }

        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

        const hasRole = roles.some((role) => req.user.roles.includes(role));

        if (!hasRole) {
            logger.warn('Role check failed', {
                userId: req.user.id,
                required: roles,
                actual: req.user.roles,
            });
            return apiResponse.forbidden(res, 'Insufficient role');
        }

        next();
    };
};

/**
 * Check if user belongs to organization
 * @param {string} orgIdParam - Request param name for organization ID
 */
const requireOrganization = (orgIdParam = 'organizationId') => {
    return (req, res, next) => {
        if (!req.user) {
            return apiResponse.unauthorized(res, 'Authentication required');
        }

        const orgId = req.params[orgIdParam] || req.body[orgIdParam] || req.query[orgIdParam];

        if (orgId && orgId !== req.user.organizationId) {
            // Admin bypass
            if (!req.user.permissions.includes('*')) {
                return apiResponse.forbidden(res, 'Access denied to this organization');
            }
        }

        next();
    };
};

/**
 * Rate limit by user
 */
const userRateLimit = (maxRequests = 100, windowMs = 60000) => {
    const requests = new Map();

    return (req, res, next) => {
        if (!req.user) {
            return next();
        }

        const key = req.user.id;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Get user's requests
        let userRequests = requests.get(key) || [];
        userRequests = userRequests.filter((time) => time > windowStart);

        if (userRequests.length >= maxRequests) {
            logger.warn('User rate limit exceeded', { userId: req.user.id });
            return apiResponse.error(res, 'Too many requests', 429);
        }

        userRequests.push(now);
        requests.set(key, userRequests);

        // Cleanup old entries periodically
        if (Math.random() < 0.01) {
            for (const [k, v] of requests.entries()) {
                const filtered = v.filter((time) => time > windowStart);
                if (filtered.length === 0) {
                    requests.delete(k);
                } else {
                    requests.set(k, filtered);
                }
            }
        }

        next();
    };
};

module.exports = {
    authenticate,
    optionalAuth,
    authorize,
    requireRole,
    requireOrganization,
    userRateLimit,
};
