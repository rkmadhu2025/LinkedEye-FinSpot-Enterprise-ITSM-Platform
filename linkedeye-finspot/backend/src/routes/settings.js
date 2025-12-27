/**
 * Settings Routes
 * System settings and configuration endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize, requireRole } = require('../middleware/auth');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { validate, rules, body } = require('../middleware/validate');
const apiResponse = require('../utils/apiResponse');

/**
 * GET /api/settings
 * Get all settings for organization
 */
router.get('/',
    authenticate,
    authorize('settings:read'),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT setting_key, setting_value, description, updated_at
             FROM system_settings
             WHERE organization_id = $1 OR organization_id IS NULL
             ORDER BY setting_key`,
            [req.user.organizationId]
        );

        // Convert to object
        const settings = {};
        result.rows.forEach(row => {
            settings[row.setting_key] = {
                value: row.setting_value,
                description: row.description,
                updatedAt: row.updated_at
            };
        });

        return apiResponse.success(res, settings);
    })
);

/**
 * GET /api/settings/:key
 * Get specific setting
 */
router.get('/:key',
    authenticate,
    authorize('settings:read'),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT setting_key, setting_value, description, updated_at
             FROM system_settings
             WHERE setting_key = $1 AND (organization_id = $2 OR organization_id IS NULL)`,
            [req.params.key, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Setting not found');
        }

        return apiResponse.success(res, result.rows[0]);
    })
);

/**
 * PUT /api/settings/:key
 * Update setting
 */
router.put('/:key',
    authenticate,
    requireRole('admin'),
    validate([
        body('value').notEmpty().withMessage('Value is required'),
        rules.text('description', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { value, description } = req.body;

        const result = await db.query(
            `INSERT INTO system_settings (organization_id, setting_key, setting_value, description, updated_by)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (organization_id, setting_key)
             DO UPDATE SET setting_value = $3, description = COALESCE($4, system_settings.description),
                           updated_by = $5, updated_at = CURRENT_TIMESTAMP
             RETURNING setting_key, setting_value, description, updated_at`,
            [req.user.organizationId, req.params.key, JSON.stringify(value), description, req.user.id]
        );

        return apiResponse.success(res, result.rows[0], 'Setting updated');
    })
);

/**
 * DELETE /api/settings/:key
 * Delete setting (reset to default)
 */
router.delete('/:key',
    authenticate,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `DELETE FROM system_settings
             WHERE setting_key = $1 AND organization_id = $2
             RETURNING id`,
            [req.params.key, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Setting not found');
        }

        return apiResponse.success(res, null, 'Setting reset to default');
    })
);

/**
 * GET /api/settings/sla/definitions
 * Get SLA definitions
 */
router.get('/sla/definitions',
    authenticate,
    authorize('settings:read'),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT id, name, code, priority, response_time_minutes, resolution_time_minutes,
                    business_hours_only, is_active, created_at, updated_at
             FROM sla_definitions
             WHERE organization_id = $1
             ORDER BY
                CASE priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END`,
            [req.user.organizationId]
        );

        return apiResponse.success(res, result.rows);
    })
);

/**
 * PUT /api/settings/sla/definitions/:id
 * Update SLA definition
 */
router.put('/sla/definitions/:id',
    authenticate,
    requireRole('admin'),
    validate([
        rules.uuid('id'),
        rules.string('name', { min: 1, max: 200, required: false }),
        rules.integer('responseTimeMinutes', { required: false, min: 1 }),
        rules.integer('resolutionTimeMinutes', { required: false, min: 1 }),
        rules.boolean('businessHoursOnly', { required: false }),
        rules.boolean('isActive', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updates = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = {
            name: 'name',
            responseTimeMinutes: 'response_time_minutes',
            resolutionTimeMinutes: 'resolution_time_minutes',
            businessHoursOnly: 'business_hours_only',
            isActive: 'is_active'
        };

        for (const [key, dbField] of Object.entries(allowedFields)) {
            if (req.body[key] !== undefined) {
                updates.push(`${dbField} = $${paramIndex++}`);
                values.push(req.body[key]);
            }
        }

        if (updates.length === 0) {
            return apiResponse.badRequest(res, 'No fields to update');
        }

        values.push(id, req.user.organizationId);

        const result = await db.query(
            `UPDATE sla_definitions SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('SLA definition not found');
        }

        return apiResponse.success(res, result.rows[0], 'SLA definition updated');
    })
);

/**
 * GET /api/settings/organization
 * Get organization settings
 */
router.get('/organization/info',
    authenticate,
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT id, name, code, domain, logo_url, settings, is_active, created_at
             FROM organizations
             WHERE id = $1`,
            [req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Organization not found');
        }

        return apiResponse.success(res, result.rows[0]);
    })
);

/**
 * PUT /api/settings/organization
 * Update organization settings
 */
router.put('/organization/info',
    authenticate,
    requireRole('admin'),
    validate([
        rules.string('name', { min: 1, max: 255, required: false }),
        rules.string('domain', { required: false, max: 255 }),
        rules.string('logoUrl', { required: false, max: 500 }),
    ]),
    asyncHandler(async (req, res) => {
        const { name, domain, logoUrl, settings } = req.body;

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (domain !== undefined) {
            updates.push(`domain = $${paramIndex++}`);
            values.push(domain);
        }
        if (logoUrl !== undefined) {
            updates.push(`logo_url = $${paramIndex++}`);
            values.push(logoUrl);
        }
        if (settings !== undefined) {
            updates.push(`settings = $${paramIndex++}`);
            values.push(JSON.stringify(settings));
        }

        if (updates.length === 0) {
            return apiResponse.badRequest(res, 'No fields to update');
        }

        values.push(req.user.organizationId);

        const result = await db.query(
            `UPDATE organizations SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramIndex}
             RETURNING id, name, code, domain, logo_url, settings`,
            values
        );

        return apiResponse.success(res, result.rows[0], 'Organization updated');
    })
);

/**
 * GET /api/settings/notifications
 * Get notification settings
 */
router.get('/notifications/config',
    authenticate,
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT setting_value FROM system_settings
             WHERE organization_id = $1 AND setting_key = 'notification_channels'`,
            [req.user.organizationId]
        );

        const defaults = {
            email: true,
            sms: false,
            push: true,
            inApp: true
        };

        const config = result.rows.length > 0 ? result.rows[0].setting_value : defaults;

        return apiResponse.success(res, config);
    })
);

/**
 * PUT /api/settings/notifications
 * Update notification settings
 */
router.put('/notifications/config',
    authenticate,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
        const config = req.body;

        await db.query(
            `INSERT INTO system_settings (organization_id, setting_key, setting_value, updated_by)
             VALUES ($1, 'notification_channels', $2, $3)
             ON CONFLICT (organization_id, setting_key)
             DO UPDATE SET setting_value = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP`,
            [req.user.organizationId, JSON.stringify(config), req.user.id]
        );

        return apiResponse.success(res, config, 'Notification settings updated');
    })
);

/**
 * GET /api/settings/audit-log
 * Get audit log
 */
router.get('/audit-log',
    authenticate,
    requireRole('admin'),
    validate([
        ...rules.pagination(),
        rules.search(),
    ]),
    asyncHandler(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const countResult = await db.query(
            'SELECT COUNT(*) FROM audit_logs WHERE organization_id = $1',
            [req.user.organizationId]
        );
        const total = parseInt(countResult.rows[0].count);

        const result = await db.query(
            `SELECT
                al.id, al.action, al.entity_type, al.entity_id,
                al.old_values, al.new_values, al.ip_address,
                al.created_at,
                u.first_name || ' ' || u.last_name as user_name,
                u.email as user_email
             FROM audit_logs al
             LEFT JOIN users u ON al.user_id = u.id
             WHERE al.organization_id = $1
             ORDER BY al.created_at DESC
             LIMIT $2 OFFSET $3`,
            [req.user.organizationId, limit, offset]
        );

        return apiResponse.paginated(res, result.rows, { page, limit, total });
    })
);

module.exports = router;
