/**
 * Authentication Routes
 * Handles login, register, password reset, and token management
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, rules, body } = require('../middleware/validate');
const apiResponse = require('../utils/apiResponse');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register',
    validate([
        rules.email(),
        rules.password(),
        rules.string('firstName', { min: 1, max: 100 }),
        rules.string('lastName', { min: 1, max: 100 }),
        rules.enum('organizationType', ['join', 'create']),
        rules.uuidOptional('organizationId'),
        rules.string('organizationCode', { required: false, max: 50 }),
        rules.string('organizationName', { required: false, max: 255 }),
    ]),
    asyncHandler(async (req, res) => {
        const result = await authService.register(req.body);
        return apiResponse.created(res, result, 'Registration successful');
    })
);

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login',
    validate([
        rules.email(),
        body('password').notEmpty().withMessage('Password is required'),
    ]),
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;
        const deviceInfo = {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        };

        const result = await authService.login(email, password, deviceInfo);
        return apiResponse.success(res, result, 'Login successful');
    })
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh',
    validate([
        body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    ]),
    asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;
        const tokens = await authService.refreshToken(refreshToken);
        return apiResponse.success(res, tokens, 'Token refreshed');
    })
);

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout',
    authenticate,
    asyncHandler(async (req, res) => {
        const refreshToken = req.body.refreshToken;
        await authService.logout(req.user.id, refreshToken);
        return apiResponse.success(res, null, 'Logged out successfully');
    })
);

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
router.post('/logout-all',
    authenticate,
    asyncHandler(async (req, res) => {
        await authService.logoutAll(req.user.id);
        return apiResponse.success(res, null, 'Logged out from all devices');
    })
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me',
    authenticate,
    asyncHandler(async (req, res) => {
        const profile = await authService.getProfile(req.user.id);
        return apiResponse.success(res, profile);
    })
);

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password',
    authenticate,
    validate([
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        rules.password('newPassword'),
    ]),
    asyncHandler(async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        await authService.changePassword(req.user.id, currentPassword, newPassword);
        return apiResponse.success(res, null, 'Password changed successfully');
    })
);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password',
    validate([
        rules.email(),
    ]),
    asyncHandler(async (req, res) => {
        await authService.requestPasswordReset(req.body.email);
        // Always return success to prevent email enumeration
        return apiResponse.success(res, null, 'If an account exists with this email, a password reset link will be sent');
    })
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password',
    validate([
        body('token').notEmpty().withMessage('Reset token is required'),
        rules.password('newPassword'),
    ]),
    asyncHandler(async (req, res) => {
        const { token, newPassword } = req.body;
        await authService.resetPassword(token, newPassword);
        return apiResponse.success(res, null, 'Password reset successful');
    })
);

/**
 * POST /api/auth/verify-email
 * Verify user email (placeholder)
 */
router.post('/verify-email',
    validate([
        body('token').notEmpty().withMessage('Verification token is required'),
    ]),
    asyncHandler(async (req, res) => {
        // Email verification logic would go here
        return apiResponse.success(res, null, 'Email verified successfully');
    })
);

module.exports = router;
