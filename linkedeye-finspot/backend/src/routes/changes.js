/**
 * Change Routes
 * Change management endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { validate, rules, body, query } = require('../middleware/validate');
const apiResponse = require('../utils/apiResponse');
const { parsePagination, parseSort } = require('../utils/helpers');

/**
 * Get next change number
 */
const getNextChangeNumber = async (organizationId) => {
    const result = await db.query(
        'SELECT get_next_sequence($1, $2) as number',
        [organizationId, 'change']
    );
    return result.rows[0].number;
};

/**
 * GET /api/changes
 * List change requests
 */
router.get('/',
    authenticate,
    authorize('changes:read'),
    validate([
        ...rules.pagination(),
        ...rules.sort(['created_at', 'scheduled_start', 'status', 'risk', 'change_type']),
        rules.search(),
        query('status').optional().trim(),
        query('changeType').optional().trim(),
        query('risk').optional().trim(),
    ]),
    asyncHandler(async (req, res) => {
        const { page, limit, offset } = parsePagination(req.query);
        const { sortBy, sortOrder } = parseSort(req.query, ['created_at', 'scheduled_start', 'status', 'risk', 'change_type'], 'scheduled_start');

        let conditions = ['c.organization_id = $1'];
        const params = [req.user.organizationId];
        let paramIndex = 2;

        if (req.query.status) {
            const statuses = req.query.status.split(',');
            conditions.push(`c.status = ANY($${paramIndex++})`);
            params.push(statuses);
        }

        if (req.query.changeType) {
            conditions.push(`c.change_type = $${paramIndex++}`);
            params.push(req.query.changeType);
        }

        if (req.query.risk) {
            conditions.push(`c.risk = $${paramIndex++}`);
            params.push(req.query.risk);
        }

        if (req.query.search) {
            conditions.push(`(c.title ILIKE $${paramIndex} OR c.change_number ILIKE $${paramIndex})`);
            params.push(`%${req.query.search}%`);
            paramIndex++;
        }

        const whereClause = conditions.join(' AND ');

        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) FROM change_requests c WHERE ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        // Get changes
        const result = await db.query(
            `SELECT
                c.id, c.change_number, c.title, c.status, c.change_type,
                c.risk, c.category, c.priority, c.scheduled_start, c.scheduled_end,
                c.downtime_required, c.cab_required, c.created_at,
                r.first_name || ' ' || r.last_name as requester_name,
                a.first_name || ' ' || a.last_name as assignee_name,
                e.name as environment_name
            FROM change_requests c
            LEFT JOIN users r ON c.requested_by = r.id
            LEFT JOIN users a ON c.assigned_to = a.id
            LEFT JOIN environments e ON c.environment_id = e.id
            WHERE ${whereClause}
            ORDER BY c.${sortBy} ${sortOrder}
            LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            [...params, limit, offset]
        );

        return apiResponse.paginated(res, result.rows, { page, limit, total });
    })
);

/**
 * GET /api/changes/calendar
 * Get changes for calendar view
 */
router.get('/calendar',
    authenticate,
    authorize('changes:read'),
    validate([
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
    ]),
    asyncHandler(async (req, res) => {
        const startDate = req.query.startDate || new Date().toISOString().split('T')[0];
        const endDate = req.query.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const changes = await db.query(
            `SELECT
                c.id, c.change_number, c.title, c.status, c.change_type,
                c.risk, c.scheduled_start, c.scheduled_end, c.downtime_required,
                e.name as environment_name, e.type as environment_type
            FROM change_requests c
            LEFT JOIN environments e ON c.environment_id = e.id
            WHERE c.organization_id = $1
            AND c.scheduled_start >= $2
            AND c.scheduled_start <= $3
            AND c.status NOT IN ('cancelled', 'failed')
            ORDER BY c.scheduled_start`,
            [req.user.organizationId, startDate, endDate]
        );

        // Get blackout periods
        const blackouts = await db.query(
            `SELECT id, title, description, start_date, end_date, is_recurring
            FROM change_blackouts
            WHERE organization_id = $1
            AND is_active = true
            AND start_date <= $3
            AND end_date >= $2`,
            [req.user.organizationId, startDate, endDate]
        );

        return apiResponse.success(res, {
            changes: changes.rows,
            blackouts: blackouts.rows
        });
    })
);

/**
 * GET /api/changes/:id
 * Get change by ID
 */
router.get('/:id',
    authenticate,
    authorize('changes:read'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT
                c.*,
                r.first_name || ' ' || r.last_name as requester_name,
                r.email as requester_email,
                a.first_name || ' ' || a.last_name as assignee_name,
                a.email as assignee_email,
                g.name as group_name,
                e.name as environment_name,
                e.type as environment_type,
                cab.first_name || ' ' || cab.last_name as cab_decision_by_name
            FROM change_requests c
            LEFT JOIN users r ON c.requested_by = r.id
            LEFT JOIN users a ON c.assigned_to = a.id
            LEFT JOIN groups g ON c.assigned_group_id = g.id
            LEFT JOIN environments e ON c.environment_id = e.id
            LEFT JOIN users cab ON c.cab_decision_by = cab.id
            WHERE c.id = $1 AND c.organization_id = $2`,
            [req.params.id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Change request not found');
        }

        const change = result.rows[0];

        // Get affected assets
        const assets = await db.query(
            `SELECT a.id, a.asset_tag, a.name, caa.impact_description
            FROM change_affected_assets caa
            JOIN assets a ON caa.asset_id = a.id
            WHERE caa.change_id = $1`,
            [req.params.id]
        );
        change.affectedAssets = assets.rows;

        // Get approvals
        const approvals = await db.query(
            `SELECT
                ca.*,
                u.first_name || ' ' || u.last_name as approver_name,
                u.email as approver_email
            FROM change_approvals ca
            JOIN users u ON ca.approver_id = u.id
            WHERE ca.change_id = $1
            ORDER BY ca.created_at`,
            [req.params.id]
        );
        change.approvals = approvals.rows;

        // Get activities
        const activities = await db.query(
            `SELECT
                ca.*,
                u.first_name || ' ' || u.last_name as user_name
            FROM change_activities ca
            LEFT JOIN users u ON ca.user_id = u.id
            WHERE ca.change_id = $1
            ORDER BY ca.created_at DESC
            LIMIT 50`,
            [req.params.id]
        );
        change.activities = activities.rows;

        return apiResponse.success(res, change);
    })
);

/**
 * POST /api/changes
 * Create a new change request
 */
router.post('/',
    authenticate,
    authorize('changes:create'),
    validate([
        rules.string('title', { min: 1, max: 500 }),
        rules.text('description', { required: false }),
        rules.text('justification', { required: false }),
        rules.enum('changeType', ['standard', 'normal', 'emergency'], { required: false }),
        rules.enum('risk', ['critical', 'high', 'medium', 'low'], { required: false }),
        rules.enum('category', ['infrastructure', 'application', 'database', 'network', 'security', 'hardware', 'other'], { required: false }),
        rules.enum('priority', ['critical', 'high', 'medium', 'low'], { required: false }),
        rules.uuidOptional('environmentId'),
        rules.text('implementationPlan', { required: false }),
        rules.text('rollbackPlan', { required: false }),
        rules.text('testPlan', { required: false }),
        rules.date('scheduledStart', { required: false }),
        rules.date('scheduledEnd', { required: false }),
        rules.boolean('downtimeRequired', { required: false }),
        rules.integer('downtimeMinutes', { required: false, min: 0 }),
        rules.uuidOptional('assignedTo'),
        rules.uuidOptional('assignedGroupId'),
        rules.array('affectedAssetIds', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const changeNumber = await getNextChangeNumber(req.user.organizationId);

        const {
            title, description, justification, changeType, risk, category, priority,
            environmentId, implementationPlan, rollbackPlan, testPlan,
            scheduledStart, scheduledEnd, downtimeRequired, downtimeMinutes,
            assignedTo, assignedGroupId, affectedAssetIds
        } = req.body;

        // Determine if CAB approval is required
        const cabRequired = changeType !== 'standard';

        const result = await db.query(
            `INSERT INTO change_requests (
                organization_id, change_number, title, description, justification,
                status, change_type, risk, category, priority, environment_id,
                implementation_plan, rollback_plan, test_plan,
                scheduled_start, scheduled_end, downtime_required, downtime_minutes,
                requested_by, assigned_to, assigned_group_id, cab_required
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING *`,
            [
                req.user.organizationId, changeNumber, title, description, justification,
                'draft', changeType || 'normal', risk || 'medium', category || 'other', priority || 'medium',
                environmentId, implementationPlan, rollbackPlan, testPlan,
                scheduledStart, scheduledEnd, downtimeRequired || false, downtimeMinutes || 0,
                req.user.id, assignedTo, assignedGroupId, cabRequired
            ]
        );

        const change = result.rows[0];

        // Add affected assets
        if (affectedAssetIds && affectedAssetIds.length > 0) {
            for (const assetId of affectedAssetIds) {
                await db.query(
                    'INSERT INTO change_affected_assets (change_id, asset_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [change.id, assetId]
                );
            }
        }

        // Log activity
        await db.query(
            'INSERT INTO change_activities (change_id, user_id, activity_type, comment) VALUES ($1, $2, $3, $4)',
            [change.id, req.user.id, 'created', 'Change request created']
        );

        return apiResponse.created(res, change, 'Change request created successfully');
    })
);

/**
 * PUT /api/changes/:id
 * Update change request
 */
router.put('/:id',
    authenticate,
    authorize('changes:update'),
    validate([
        rules.uuid('id'),
        rules.string('title', { min: 1, max: 500, required: false }),
        rules.text('description', { required: false }),
        rules.text('justification', { required: false }),
        rules.text('implementationPlan', { required: false }),
        rules.text('rollbackPlan', { required: false }),
        rules.text('testPlan', { required: false }),
        rules.date('scheduledStart', { required: false }),
        rules.date('scheduledEnd', { required: false }),
        rules.boolean('downtimeRequired', { required: false }),
        rules.integer('downtimeMinutes', { required: false, min: 0 }),
        rules.uuidOptional('assignedTo'),
        rules.uuidOptional('assignedGroupId'),
    ]),
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const updates = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = {
            title: 'title', description: 'description', justification: 'justification',
            implementationPlan: 'implementation_plan', rollbackPlan: 'rollback_plan',
            testPlan: 'test_plan', scheduledStart: 'scheduled_start', scheduledEnd: 'scheduled_end',
            downtimeRequired: 'downtime_required', downtimeMinutes: 'downtime_minutes',
            assignedTo: 'assigned_to', assignedGroupId: 'assigned_group_id'
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
            `UPDATE change_requests SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Change request not found');
        }

        return apiResponse.success(res, result.rows[0], 'Change request updated');
    })
);

/**
 * POST /api/changes/:id/submit
 * Submit change for approval
 */
router.post('/:id/submit',
    authenticate,
    authorize('changes:update'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `UPDATE change_requests
             SET status = 'submitted', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND organization_id = $2 AND status = 'draft'
             RETURNING *`,
            [req.params.id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Change request not found or cannot be submitted');
        }

        await db.query(
            'INSERT INTO change_activities (change_id, user_id, activity_type, comment) VALUES ($1, $2, $3, $4)',
            [req.params.id, req.user.id, 'submitted', 'Change request submitted for approval']
        );

        return apiResponse.success(res, result.rows[0], 'Change request submitted');
    })
);

/**
 * POST /api/changes/:id/approve
 * Approve change request
 */
router.post('/:id/approve',
    authenticate,
    authorize('changes:approve'),
    validate([
        rules.uuid('id'),
        rules.text('comments', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { comments } = req.body;

        // Record approval
        await db.query(
            `INSERT INTO change_approvals (change_id, approver_id, decision, comments, decided_at)
             VALUES ($1, $2, 'approved', $3, CURRENT_TIMESTAMP)`,
            [req.params.id, req.user.id, comments]
        );

        // Update status
        const result = await db.query(
            `UPDATE change_requests
             SET status = 'approved', cab_decision = 'approved',
                 cab_decision_by = $1, cab_decision_at = CURRENT_TIMESTAMP,
                 cab_notes = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND organization_id = $4
             RETURNING *`,
            [req.user.id, comments, req.params.id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Change request not found');
        }

        await db.query(
            'INSERT INTO change_activities (change_id, user_id, activity_type, comment) VALUES ($1, $2, $3, $4)',
            [req.params.id, req.user.id, 'approved', comments || 'Change request approved']
        );

        return apiResponse.success(res, result.rows[0], 'Change request approved');
    })
);

/**
 * POST /api/changes/:id/reject
 * Reject change request
 */
router.post('/:id/reject',
    authenticate,
    authorize('changes:approve'),
    validate([
        rules.uuid('id'),
        rules.text('reason', { required: true }),
    ]),
    asyncHandler(async (req, res) => {
        const { reason } = req.body;

        await db.query(
            `INSERT INTO change_approvals (change_id, approver_id, decision, comments, decided_at)
             VALUES ($1, $2, 'rejected', $3, CURRENT_TIMESTAMP)`,
            [req.params.id, req.user.id, reason]
        );

        const result = await db.query(
            `UPDATE change_requests
             SET status = 'rejected', cab_decision = 'rejected',
                 cab_decision_by = $1, cab_decision_at = CURRENT_TIMESTAMP,
                 cab_notes = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND organization_id = $4
             RETURNING *`,
            [req.user.id, reason, req.params.id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Change request not found');
        }

        await db.query(
            'INSERT INTO change_activities (change_id, user_id, activity_type, comment) VALUES ($1, $2, $3, $4)',
            [req.params.id, req.user.id, 'rejected', reason]
        );

        return apiResponse.success(res, result.rows[0], 'Change request rejected');
    })
);

/**
 * POST /api/changes/:id/implement
 * Start implementation
 */
router.post('/:id/implement',
    authenticate,
    authorize('changes:update'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `UPDATE change_requests
             SET status = 'implementing', actual_start = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND organization_id = $2 AND status IN ('approved', 'scheduled')
             RETURNING *`,
            [req.params.id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Change request not found or cannot be implemented');
        }

        await db.query(
            'INSERT INTO change_activities (change_id, user_id, activity_type, comment) VALUES ($1, $2, $3, $4)',
            [req.params.id, req.user.id, 'implementing', 'Implementation started']
        );

        return apiResponse.success(res, result.rows[0], 'Implementation started');
    })
);

/**
 * POST /api/changes/:id/complete
 * Complete change
 */
router.post('/:id/complete',
    authenticate,
    authorize('changes:update'),
    validate([
        rules.uuid('id'),
        rules.text('completionNotes', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { completionNotes } = req.body;

        const result = await db.query(
            `UPDATE change_requests
             SET status = 'completed', actual_end = CURRENT_TIMESTAMP,
                 completion_notes = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND organization_id = $3 AND status = 'implementing'
             RETURNING *`,
            [completionNotes, req.params.id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Change request not found or cannot be completed');
        }

        await db.query(
            'INSERT INTO change_activities (change_id, user_id, activity_type, comment) VALUES ($1, $2, $3, $4)',
            [req.params.id, req.user.id, 'completed', completionNotes || 'Change completed successfully']
        );

        return apiResponse.success(res, result.rows[0], 'Change completed successfully');
    })
);

module.exports = router;
