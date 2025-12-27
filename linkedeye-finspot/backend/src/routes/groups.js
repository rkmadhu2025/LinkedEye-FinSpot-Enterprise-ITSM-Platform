/**
 * Group Routes
 * Support group management endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { validate, rules, body } = require('../middleware/validate');
const apiResponse = require('../utils/apiResponse');
const { parsePagination, parseSort } = require('../utils/helpers');

/**
 * GET /api/groups
 * List all groups in organization
 */
router.get('/',
    authenticate,
    authorize('groups:read'),
    validate([
        ...rules.pagination(),
        ...rules.sort(['name', 'created_at', 'group_type']),
    ]),
    asyncHandler(async (req, res) => {
        const { page, limit, offset } = parsePagination(req.query);
        const { sortBy, sortOrder } = parseSort(req.query, ['name', 'created_at', 'group_type']);

        const countResult = await db.query(
            'SELECT COUNT(*) FROM groups WHERE organization_id = $1',
            [req.user.organizationId]
        );
        const total = parseInt(countResult.rows[0].count);

        const result = await db.query(
            `SELECT
                g.id, g.name, g.code, g.description, g.group_type, g.email,
                g.is_active, g.created_at,
                u.id as manager_id, u.first_name || ' ' || u.last_name as manager_name,
                COUNT(DISTINCT gm.user_id) as member_count
            FROM groups g
            LEFT JOIN users u ON g.manager_id = u.id
            LEFT JOIN group_members gm ON g.id = gm.group_id
            WHERE g.organization_id = $1
            GROUP BY g.id, u.id
            ORDER BY ${sortBy} ${sortOrder}
            LIMIT $2 OFFSET $3`,
            [req.user.organizationId, limit, offset]
        );

        return apiResponse.paginated(res, result.rows, { page, limit, total });
    })
);

/**
 * GET /api/groups/:id
 * Get group by ID with members
 */
router.get('/:id',
    authenticate,
    authorize('groups:read'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        // Get group info
        const groupResult = await db.query(
            `SELECT
                g.id, g.name, g.code, g.description, g.group_type, g.email,
                g.settings, g.is_active, g.created_at, g.updated_at,
                u.id as manager_id, u.first_name || ' ' || u.last_name as manager_name,
                u.email as manager_email
            FROM groups g
            LEFT JOIN users u ON g.manager_id = u.id
            WHERE g.id = $1 AND g.organization_id = $2`,
            [req.params.id, req.user.organizationId]
        );

        if (groupResult.rows.length === 0) {
            throw new NotFoundError('Group not found');
        }

        const group = groupResult.rows[0];

        // Get members
        const membersResult = await db.query(
            `SELECT
                u.id, u.first_name, u.last_name, u.display_name, u.email,
                u.avatar_url, u.job_title,
                gm.role, gm.is_on_call, gm.joined_at
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = $1 AND u.deleted_at IS NULL
            ORDER BY gm.role DESC, u.first_name, u.last_name`,
            [req.params.id]
        );

        group.members = membersResult.rows;

        return apiResponse.success(res, group);
    })
);

/**
 * POST /api/groups
 * Create a new group
 */
router.post('/',
    authenticate,
    authorize('groups:create'),
    validate([
        rules.string('name', { min: 1, max: 200 }),
        rules.string('code', { min: 1, max: 50 }),
        rules.text('description', { required: false }),
        rules.enum('groupType', ['support', 'approval', 'operations', 'development'], { required: false }),
        rules.uuidOptional('managerId'),
        rules.string('email', { required: false, max: 255 }),
    ]),
    asyncHandler(async (req, res) => {
        const { name, code, description, groupType, managerId, email } = req.body;

        // Check if code exists
        const existing = await db.query(
            'SELECT id FROM groups WHERE code = $1 AND organization_id = $2',
            [code.toLowerCase(), req.user.organizationId]
        );

        if (existing.rows.length > 0) {
            return apiResponse.conflict(res, 'Group with this code already exists');
        }

        const result = await db.query(
            `INSERT INTO groups (
                organization_id, name, code, description, group_type,
                manager_id, email, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, code, description, group_type, email, is_active, created_at`,
            [
                req.user.organizationId,
                name,
                code.toLowerCase(),
                description,
                groupType || 'support',
                managerId,
                email,
                req.user.id
            ]
        );

        return apiResponse.created(res, result.rows[0], 'Group created successfully');
    })
);

/**
 * PUT /api/groups/:id
 * Update group
 */
router.put('/:id',
    authenticate,
    authorize('groups:update'),
    validate([
        rules.uuid('id'),
        rules.string('name', { min: 1, max: 200, required: false }),
        rules.text('description', { required: false }),
        rules.enum('groupType', ['support', 'approval', 'operations', 'development'], { required: false }),
        rules.uuidOptional('managerId'),
        rules.string('email', { required: false, max: 255 }),
        rules.boolean('isActive', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name, description, groupType, managerId, email, isActive } = req.body;

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
        if (groupType !== undefined) {
            updates.push(`group_type = $${paramIndex++}`);
            values.push(groupType);
        }
        if (managerId !== undefined) {
            updates.push(`manager_id = $${paramIndex++}`);
            values.push(managerId);
        }
        if (email !== undefined) {
            updates.push(`email = $${paramIndex++}`);
            values.push(email);
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
            `UPDATE groups SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
             RETURNING id, name, code, description, group_type, email, is_active, updated_at`,
            values
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Group not found');
        }

        return apiResponse.success(res, result.rows[0], 'Group updated successfully');
    })
);

/**
 * DELETE /api/groups/:id
 * Delete group
 */
router.delete('/:id',
    authenticate,
    authorize('groups:delete'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await db.query(
            `DELETE FROM groups WHERE id = $1 AND organization_id = $2 RETURNING id`,
            [id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Group not found');
        }

        return apiResponse.success(res, null, 'Group deleted successfully');
    })
);

/**
 * POST /api/groups/:id/members
 * Add member to group
 */
router.post('/:id/members',
    authenticate,
    authorize('groups:update'),
    validate([
        rules.uuid('id'),
        rules.uuid('userId', 'body'),
        rules.enum('role', ['member', 'lead'], { required: false }),
        rules.boolean('isOnCall', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { userId, role, isOnCall } = req.body;

        // Verify group exists
        const group = await db.query(
            'SELECT id FROM groups WHERE id = $1 AND organization_id = $2',
            [id, req.user.organizationId]
        );

        if (group.rows.length === 0) {
            throw new NotFoundError('Group not found');
        }

        // Add member
        await db.query(
            `INSERT INTO group_members (group_id, user_id, role, is_on_call)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (group_id, user_id) DO UPDATE SET role = $3, is_on_call = $4`,
            [id, userId, role || 'member', isOnCall || false]
        );

        return apiResponse.success(res, null, 'Member added to group');
    })
);

/**
 * DELETE /api/groups/:id/members/:userId
 * Remove member from group
 */
router.delete('/:id/members/:userId',
    authenticate,
    authorize('groups:update'),
    validate([
        rules.uuid('id'),
        rules.uuid('userId'),
    ]),
    asyncHandler(async (req, res) => {
        const { id, userId } = req.params;

        const result = await db.query(
            `DELETE FROM group_members
             WHERE group_id = $1 AND user_id = $2
             AND EXISTS (SELECT 1 FROM groups WHERE id = $1 AND organization_id = $3)
             RETURNING id`,
            [id, userId, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Member not found in group');
        }

        return apiResponse.success(res, null, 'Member removed from group');
    })
);

/**
 * GET /api/groups/:id/on-call
 * Get current on-call member for group
 */
router.get('/:id/on-call',
    authenticate,
    authorize('groups:read'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT
                u.id, u.first_name, u.last_name, u.display_name, u.email,
                u.avatar_url, u.phone,
                ocs.start_time, ocs.end_time, ocs.is_primary
            FROM on_call_schedules ocs
            JOIN users u ON ocs.user_id = u.id
            WHERE ocs.group_id = $1
            AND ocs.start_time <= CURRENT_TIMESTAMP
            AND ocs.end_time > CURRENT_TIMESTAMP
            ORDER BY ocs.is_primary DESC
            LIMIT 1`,
            [req.params.id]
        );

        return apiResponse.success(res, result.rows[0] || null);
    })
);

module.exports = router;
