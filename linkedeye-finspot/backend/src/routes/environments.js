/**
 * Environment Routes
 * Environment management endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { validate, rules } = require('../middleware/validate');
const apiResponse = require('../utils/apiResponse');

/**
 * GET /api/environments
 * List all environments
 */
router.get('/',
    authenticate,
    authorize('environments:read'),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT
                e.id, e.name, e.code, e.type, e.status, e.description,
                e.health_metrics, e.is_active, e.created_at,
                COUNT(DISTINCT a.id) FILTER (WHERE a.is_active = true) as asset_count,
                COUNT(DISTINCT i.id) FILTER (WHERE i.status NOT IN ('closed', 'resolved')) as open_incidents
            FROM environments e
            LEFT JOIN assets a ON e.id = a.environment_id
            LEFT JOIN incidents i ON e.id = i.environment_id
            WHERE e.organization_id = $1 AND e.is_active = true
            GROUP BY e.id
            ORDER BY
                CASE e.type
                    WHEN 'production' THEN 1
                    WHEN 'staging' THEN 2
                    WHEN 'qa' THEN 3
                    WHEN 'development' THEN 4
                    ELSE 5
                END`,
            [req.user.organizationId]
        );

        return apiResponse.success(res, result.rows);
    })
);

/**
 * GET /api/environments/:id
 * Get environment by ID
 */
router.get('/:id',
    authenticate,
    authorize('environments:read'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT
                e.*,
                COUNT(DISTINCT a.id) FILTER (WHERE a.is_active = true) as asset_count,
                COUNT(DISTINCT i.id) FILTER (WHERE i.status NOT IN ('closed', 'resolved')) as open_incidents
            FROM environments e
            LEFT JOIN assets a ON e.id = a.environment_id
            LEFT JOIN incidents i ON e.id = i.environment_id
            WHERE e.id = $1 AND e.organization_id = $2
            GROUP BY e.id`,
            [req.params.id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Environment not found');
        }

        return apiResponse.success(res, result.rows[0]);
    })
);

/**
 * POST /api/environments
 * Create environment
 */
router.post('/',
    authenticate,
    authorize('environments:create'),
    validate([
        rules.string('name', { min: 1, max: 100 }),
        rules.string('code', { min: 1, max: 50 }),
        rules.enum('type', ['production', 'staging', 'development', 'qa', 'dr']),
        rules.text('description', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { name, code, type, description } = req.body;

        const result = await db.query(
            `INSERT INTO environments (organization_id, name, code, type, description, status)
             VALUES ($1, $2, $3, $4, $5, 'unknown')
             RETURNING *`,
            [req.user.organizationId, name, code.toLowerCase(), type, description]
        );

        return apiResponse.created(res, result.rows[0], 'Environment created');
    })
);

/**
 * PUT /api/environments/:id
 * Update environment
 */
router.put('/:id',
    authenticate,
    authorize('environments:update'),
    validate([
        rules.uuid('id'),
        rules.string('name', { min: 1, max: 100, required: false }),
        rules.enum('status', ['healthy', 'warning', 'critical', 'unknown'], { required: false }),
        rules.text('description', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (req.body.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(req.body.name);
        }
        if (req.body.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(req.body.status);
        }
        if (req.body.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(req.body.description);
        }

        if (updates.length === 0) {
            return apiResponse.badRequest(res, 'No fields to update');
        }

        values.push(req.params.id, req.user.organizationId);

        const result = await db.query(
            `UPDATE environments SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Environment not found');
        }

        return apiResponse.success(res, result.rows[0], 'Environment updated');
    })
);

/**
 * PUT /api/environments/:id/health
 * Update environment health metrics
 */
router.put('/:id/health',
    authenticate,
    authorize('environments:update'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const { healthMetrics, status } = req.body;

        const result = await db.query(
            `UPDATE environments
             SET health_metrics = $1, status = COALESCE($2, status), updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND organization_id = $4
             RETURNING *`,
            [JSON.stringify(healthMetrics), status, req.params.id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Environment not found');
        }

        return apiResponse.success(res, result.rows[0], 'Health metrics updated');
    })
);

module.exports = router;
