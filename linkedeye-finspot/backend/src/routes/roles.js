/**
 * Role Routes
 * Role management endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, NotFoundError, BadRequestError } = require('../middleware/errorHandler');
const { validate, rules, body } = require('../middleware/validate');
const apiResponse = require('../utils/apiResponse');

/**
 * GET /api/roles
 * List all roles in organization
 */
router.get('/',
    authenticate,
    authorize('roles:read'),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT
                r.id, r.name, r.code, r.description, r.permissions,
                r.is_system, r.is_active, r.created_at,
                COUNT(ur.user_id) as user_count
            FROM roles r
            LEFT JOIN user_roles ur ON r.id = ur.role_id
            WHERE r.organization_id = $1
            GROUP BY r.id
            ORDER BY r.is_system DESC, r.name ASC`,
            [req.user.organizationId]
        );

        return apiResponse.success(res, result.rows);
    })
);

/**
 * GET /api/roles/:id
 * Get role by ID
 */
router.get('/:id',
    authenticate,
    authorize('roles:read'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT
                r.id, r.name, r.code, r.description, r.permissions,
                r.is_system, r.is_active, r.created_at, r.updated_at,
                COUNT(ur.user_id) as user_count
            FROM roles r
            LEFT JOIN user_roles ur ON r.id = ur.role_id
            WHERE r.id = $1 AND r.organization_id = $2
            GROUP BY r.id`,
            [req.params.id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Role not found');
        }

        return apiResponse.success(res, result.rows[0]);
    })
);

/**
 * POST /api/roles
 * Create a new role
 */
router.post('/',
    authenticate,
    authorize('roles:create'),
    validate([
        rules.string('name', { min: 1, max: 100 }),
        rules.string('code', { min: 1, max: 50 }),
        rules.text('description', { required: false }),
        body('permissions').isArray().withMessage('Permissions must be an array'),
    ]),
    asyncHandler(async (req, res) => {
        const { name, code, description, permissions } = req.body;

        // Check if code exists
        const existing = await db.query(
            'SELECT id FROM roles WHERE code = $1 AND organization_id = $2',
            [code.toLowerCase(), req.user.organizationId]
        );

        if (existing.rows.length > 0) {
            return apiResponse.conflict(res, 'Role with this code already exists');
        }

        const result = await db.query(
            `INSERT INTO roles (organization_id, name, code, description, permissions)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, code, description, permissions, is_system, is_active, created_at`,
            [req.user.organizationId, name, code.toLowerCase(), description, JSON.stringify(permissions)]
        );

        return apiResponse.created(res, result.rows[0], 'Role created successfully');
    })
);

/**
 * PUT /api/roles/:id
 * Update role
 */
router.put('/:id',
    authenticate,
    authorize('roles:update'),
    validate([
        rules.uuid('id'),
        rules.string('name', { min: 1, max: 100, required: false }),
        rules.text('description', { required: false }),
        body('permissions').optional().isArray().withMessage('Permissions must be an array'),
        rules.boolean('isActive', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Check if role exists and is not system role
        const existing = await db.query(
            'SELECT id, is_system FROM roles WHERE id = $1 AND organization_id = $2',
            [id, req.user.organizationId]
        );

        if (existing.rows.length === 0) {
            throw new NotFoundError('Role not found');
        }

        if (existing.rows[0].is_system) {
            throw new BadRequestError('Cannot modify system roles');
        }

        const { name, description, permissions, isActive } = req.body;

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(description);
        }
        if (permissions !== undefined) {
            updates.push(`permissions = $${paramIndex++}`);
            values.push(JSON.stringify(permissions));
        }
        if (isActive !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(isActive);
        }

        if (updates.length === 0) {
            return apiResponse.badRequest(res, 'No fields to update');
        }

        values.push(id, req.user.organizationId);

        const result = await db.query(
            `UPDATE roles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
             RETURNING id, name, code, description, permissions, is_system, is_active, updated_at`,
            values
        );

        return apiResponse.success(res, result.rows[0], 'Role updated successfully');
    })
);

/**
 * DELETE /api/roles/:id
 * Delete role
 */
router.delete('/:id',
    authenticate,
    authorize('roles:delete'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Check if role exists and is not system role
        const existing = await db.query(
            'SELECT id, is_system FROM roles WHERE id = $1 AND organization_id = $2',
            [id, req.user.organizationId]
        );

        if (existing.rows.length === 0) {
            throw new NotFoundError('Role not found');
        }

        if (existing.rows[0].is_system) {
            throw new BadRequestError('Cannot delete system roles');
        }

        // Check if role is assigned to users
        const userCount = await db.query(
            'SELECT COUNT(*) FROM user_roles WHERE role_id = $1',
            [id]
        );

        if (parseInt(userCount.rows[0].count) > 0) {
            throw new BadRequestError('Cannot delete role that is assigned to users');
        }

        await db.query('DELETE FROM roles WHERE id = $1', [id]);

        return apiResponse.success(res, null, 'Role deleted successfully');
    })
);

/**
 * GET /api/roles/:id/users
 * Get users with this role
 */
router.get('/:id/users',
    authenticate,
    authorize('roles:read'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.display_name, u.avatar_url
             FROM users u
             JOIN user_roles ur ON u.id = ur.user_id
             WHERE ur.role_id = $1 AND u.organization_id = $2 AND u.deleted_at IS NULL
             ORDER BY u.first_name, u.last_name`,
            [req.params.id, req.user.organizationId]
        );

        return apiResponse.success(res, result.rows);
    })
);

module.exports = router;
