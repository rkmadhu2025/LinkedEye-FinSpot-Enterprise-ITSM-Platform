/**
 * User Routes
 * User management endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { validate, rules, body, param } = require('../middleware/validate');
const apiResponse = require('../utils/apiResponse');
const { parsePagination, parseSort, parseFilters, buildWhereClause } = require('../utils/helpers');

/**
 * GET /api/users
 * List all users in organization
 */
router.get('/',
    authenticate,
    authorize('users:read'),
    validate([
        ...rules.pagination(),
        ...rules.sort(['first_name', 'last_name', 'email', 'created_at', 'status']),
        rules.search(),
    ]),
    asyncHandler(async (req, res) => {
        const { page, limit, offset } = parsePagination(req.query);
        const { sortBy, sortOrder } = parseSort(req.query, ['first_name', 'last_name', 'email', 'created_at', 'status']);
        const filters = parseFilters(req.query, ['status', 'department']);

        // Add organization filter
        filters.organization_id = req.user.organizationId;

        const { clause, params } = buildWhereClause(filters);

        // Add search if provided
        let searchClause = '';
        if (req.query.search) {
            const searchTerm = `%${req.query.search}%`;
            searchClause = ` AND (first_name ILIKE $${params.length + 1} OR last_name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
            params.push(searchTerm);
        }

        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) FROM users WHERE ${clause} AND deleted_at IS NULL${searchClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        // Get users
        const result = await db.query(
            `SELECT
                u.id, u.email, u.first_name, u.last_name, u.display_name,
                u.avatar_url, u.job_title, u.department, u.status,
                u.last_login_at, u.created_at,
                array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE ${clause} AND u.deleted_at IS NULL${searchClause}
            GROUP BY u.id
            ORDER BY ${sortBy} ${sortOrder}
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, limit, offset]
        );

        return apiResponse.paginated(res, result.rows, { page, limit, total });
    })
);

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id',
    authenticate,
    authorize('users:read'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT
                u.id, u.email, u.first_name, u.last_name, u.display_name,
                u.phone, u.avatar_url, u.job_title, u.department, u.location,
                u.timezone, u.status, u.email_verified, u.last_login_at,
                u.created_at, u.updated_at,
                array_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name, 'code', r.code))
                    FILTER (WHERE r.id IS NOT NULL) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.id = $1 AND u.organization_id = $2 AND u.deleted_at IS NULL
            GROUP BY u.id`,
            [req.params.id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('User not found');
        }

        return apiResponse.success(res, result.rows[0]);
    })
);

/**
 * POST /api/users
 * Create a new user
 */
router.post('/',
    authenticate,
    authorize('users:create'),
    validate([
        rules.email(),
        rules.string('firstName', { min: 1, max: 100 }),
        rules.string('lastName', { min: 1, max: 100 }),
        rules.string('phone', { required: false, max: 50 }),
        rules.string('jobTitle', { required: false, max: 200 }),
        rules.string('department', { required: false, max: 200 }),
        rules.enum('status', ['active', 'inactive', 'pending'], { required: false }),
        rules.array('roleIds', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { email, firstName, lastName, phone, jobTitle, department, status, roleIds } = req.body;

        // Check if email exists
        const existing = await db.query(
            'SELECT id FROM users WHERE email = $1 AND organization_id = $2',
            [email.toLowerCase(), req.user.organizationId]
        );

        if (existing.rows.length > 0) {
            return apiResponse.conflict(res, 'User with this email already exists');
        }

        // Create user (without password - they'll need to set it via invite)
        const result = await db.query(
            `INSERT INTO users (
                organization_id, email, first_name, last_name, display_name,
                phone, job_title, department, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, email, first_name, last_name, display_name, status, created_at`,
            [
                req.user.organizationId,
                email.toLowerCase(),
                firstName,
                lastName,
                `${firstName} ${lastName}`,
                phone,
                jobTitle,
                department,
                status || 'pending'
            ]
        );

        const user = result.rows[0];

        // Assign roles if provided
        if (roleIds && roleIds.length > 0) {
            for (const roleId of roleIds) {
                await db.query(
                    'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                    [user.id, roleId, req.user.id]
                );
            }
        }

        return apiResponse.created(res, user, 'User created successfully');
    })
);

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id',
    authenticate,
    authorize('users:update'),
    validate([
        rules.uuid('id'),
        rules.string('firstName', { min: 1, max: 100, required: false }),
        rules.string('lastName', { min: 1, max: 100, required: false }),
        rules.string('phone', { required: false, max: 50 }),
        rules.string('jobTitle', { required: false, max: 200 }),
        rules.string('department', { required: false, max: 200 }),
        rules.string('location', { required: false, max: 200 }),
        rules.string('timezone', { required: false, max: 100 }),
        rules.enum('status', ['active', 'inactive', 'suspended'], { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updates = req.body;

        // Build update query dynamically
        const fields = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = ['first_name', 'last_name', 'phone', 'job_title', 'department', 'location', 'timezone', 'status'];
        const fieldMapping = {
            firstName: 'first_name',
            lastName: 'last_name',
            jobTitle: 'job_title',
        };

        for (const [key, value] of Object.entries(updates)) {
            const dbField = fieldMapping[key] || key;
            if (allowedFields.includes(dbField) && value !== undefined) {
                fields.push(`${dbField} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            return apiResponse.badRequest(res, 'No valid fields to update');
        }

        // Update display_name if first or last name changed
        if (updates.firstName || updates.lastName) {
            fields.push(`display_name = COALESCE($${paramIndex}, first_name) || ' ' || COALESCE($${paramIndex + 1}, last_name)`);
            values.push(updates.firstName || null, updates.lastName || null);
            paramIndex += 2;
        }

        values.push(id, req.user.organizationId);

        const result = await db.query(
            `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1} AND deleted_at IS NULL
             RETURNING id, email, first_name, last_name, display_name, status, updated_at`,
            values
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('User not found');
        }

        return apiResponse.success(res, result.rows[0], 'User updated successfully');
    })
);

/**
 * DELETE /api/users/:id
 * Soft delete user
 */
router.delete('/:id',
    authenticate,
    authorize('users:delete'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Prevent self-deletion
        if (id === req.user.id) {
            return apiResponse.badRequest(res, 'Cannot delete your own account');
        }

        const result = await db.query(
            `UPDATE users SET deleted_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
             RETURNING id`,
            [id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('User not found');
        }

        return apiResponse.success(res, null, 'User deleted successfully');
    })
);

/**
 * PUT /api/users/:id/roles
 * Update user roles
 */
router.put('/:id/roles',
    authenticate,
    authorize('users:update'),
    validate([
        rules.uuid('id'),
        body('roleIds').isArray().withMessage('roleIds must be an array'),
    ]),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { roleIds } = req.body;

        // Verify user exists
        const user = await db.query(
            'SELECT id FROM users WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
            [id, req.user.organizationId]
        );

        if (user.rows.length === 0) {
            throw new NotFoundError('User not found');
        }

        // Remove existing roles
        await db.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

        // Add new roles
        for (const roleId of roleIds) {
            await db.query(
                'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [id, roleId, req.user.id]
            );
        }

        // Get updated roles
        const result = await db.query(
            `SELECT r.id, r.name, r.code FROM roles r
             JOIN user_roles ur ON r.id = ur.role_id
             WHERE ur.user_id = $1`,
            [id]
        );

        return apiResponse.success(res, { roles: result.rows }, 'User roles updated');
    })
);

module.exports = router;
