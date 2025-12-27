/**
 * Incident Routes
 * Incident management endpoints
 */

const express = require('express');
const router = express.Router();
const incidentService = require('../services/incidentService');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, rules, body, query } = require('../middleware/validate');
const apiResponse = require('../utils/apiResponse');

/**
 * GET /api/incidents
 * List incidents with filters
 */
router.get('/',
    authenticate,
    authorize('incidents:read'),
    validate([
        ...rules.pagination(),
        ...rules.sort(['created_at', 'updated_at', 'priority', 'status', 'title', 'incident_number']),
        rules.search(),
        query('status').optional().trim(),
        query('priority').optional().trim(),
        query('category').optional().trim(),
        query('environmentId').optional().isUUID(4),
        query('assignedTo').optional().isUUID(4),
        query('assignedGroupId').optional().isUUID(4),
        query('reportedBy').optional().isUUID(4),
    ]),
    asyncHandler(async (req, res) => {
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            status: req.query.status ? req.query.status.split(',') : null,
            priority: req.query.priority ? req.query.priority.split(',') : null,
            category: req.query.category,
            environmentId: req.query.environmentId,
            assignedTo: req.query.assignedTo,
            assignedGroupId: req.query.assignedGroupId,
            reportedBy: req.query.reportedBy,
            search: req.query.search,
            sortBy: req.query.sort_by || req.query.sortBy,
            sortOrder: req.query.sort_order || req.query.sortOrder
        };

        const result = await incidentService.listIncidents(req.user.organizationId, options);

        return apiResponse.paginated(res, result.incidents, result.pagination);
    })
);

/**
 * GET /api/incidents/statistics
 * Get incident statistics
 */
router.get('/statistics',
    authenticate,
    authorize('incidents:read'),
    asyncHandler(async (req, res) => {
        const filters = {
            environmentId: req.query.environmentId,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo
        };

        const stats = await incidentService.getStatistics(req.user.organizationId, filters);

        return apiResponse.success(res, stats);
    })
);

/**
 * GET /api/incidents/:id
 * Get incident by ID
 */
router.get('/:id',
    authenticate,
    authorize('incidents:read'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const incident = await incidentService.getIncidentById(req.user.organizationId, req.params.id);
        return apiResponse.success(res, incident);
    })
);

/**
 * POST /api/incidents
 * Create a new incident
 */
router.post('/',
    authenticate,
    authorize('incidents:create'),
    validate([
        rules.string('title', { min: 1, max: 500 }),
        rules.text('description', { required: false }),
        rules.enum('priority', ['critical', 'high', 'medium', 'low'], { required: false }),
        rules.enum('category', ['hardware', 'software', 'network', 'security', 'access', 'database', 'other'], { required: false }),
        rules.enum('impact', ['critical', 'high', 'medium', 'low'], { required: false }),
        rules.enum('urgency', ['critical', 'high', 'medium', 'low'], { required: false }),
        rules.uuidOptional('environmentId'),
        rules.uuidOptional('affectedAssetId'),
        rules.uuidOptional('assignedTo'),
        rules.uuidOptional('assignedGroupId'),
        rules.array('tags', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const incident = await incidentService.createIncident(
            req.user.organizationId,
            req.user.id,
            req.body
        );

        return apiResponse.created(res, incident, 'Incident created successfully');
    })
);

/**
 * PUT /api/incidents/:id
 * Update incident
 */
router.put('/:id',
    authenticate,
    authorize('incidents:update'),
    validate([
        rules.uuid('id'),
        rules.string('title', { min: 1, max: 500, required: false }),
        rules.text('description', { required: false }),
        rules.enum('status', ['open', 'in_progress', 'pending', 'resolved', 'closed'], { required: false }),
        rules.enum('priority', ['critical', 'high', 'medium', 'low'], { required: false }),
        rules.enum('category', ['hardware', 'software', 'network', 'security', 'access', 'database', 'other'], { required: false }),
        rules.enum('impact', ['critical', 'high', 'medium', 'low'], { required: false }),
        rules.enum('urgency', ['critical', 'high', 'medium', 'low'], { required: false }),
        rules.uuidOptional('environmentId'),
        rules.uuidOptional('affectedAssetId'),
        rules.uuidOptional('assignedTo'),
        rules.uuidOptional('assignedGroupId'),
        rules.text('resolutionNotes', { required: false }),
        rules.text('rootCause', { required: false }),
        rules.text('workaround', { required: false }),
        rules.string('resolutionCode', { required: false, max: 100 }),
        rules.array('tags', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const incident = await incidentService.updateIncident(
            req.user.organizationId,
            req.params.id,
            req.user.id,
            req.body
        );

        return apiResponse.success(res, incident, 'Incident updated successfully');
    })
);

/**
 * PATCH /api/incidents/:id/status
 * Quick status update
 */
router.patch('/:id/status',
    authenticate,
    authorize('incidents:update'),
    validate([
        rules.uuid('id'),
        rules.enum('status', ['open', 'in_progress', 'pending', 'resolved', 'closed']),
        rules.text('comment', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { status, comment } = req.body;

        const incident = await incidentService.updateIncident(
            req.user.organizationId,
            req.params.id,
            req.user.id,
            { status }
        );

        if (comment) {
            await incidentService.addComment(
                req.user.organizationId,
                req.params.id,
                req.user.id,
                comment
            );
        }

        return apiResponse.success(res, incident, 'Status updated successfully');
    })
);

/**
 * PATCH /api/incidents/:id/assign
 * Assign incident
 */
router.patch('/:id/assign',
    authenticate,
    authorize('incidents:update'),
    validate([
        rules.uuid('id'),
        rules.uuidOptional('assignedTo'),
        rules.uuidOptional('assignedGroupId'),
    ]),
    asyncHandler(async (req, res) => {
        const { assignedTo, assignedGroupId } = req.body;

        const incident = await incidentService.updateIncident(
            req.user.organizationId,
            req.params.id,
            req.user.id,
            { assignedTo, assignedGroupId }
        );

        return apiResponse.success(res, incident, 'Assignment updated successfully');
    })
);

/**
 * POST /api/incidents/:id/comments
 * Add comment to incident
 */
router.post('/:id/comments',
    authenticate,
    authorize('incidents:update'),
    validate([
        rules.uuid('id'),
        rules.text('comment', { required: true, max: 10000 }),
        rules.boolean('isPublic', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { comment, isPublic = true } = req.body;

        await incidentService.addComment(
            req.user.organizationId,
            req.params.id,
            req.user.id,
            comment,
            isPublic
        );

        return apiResponse.success(res, null, 'Comment added successfully');
    })
);

/**
 * POST /api/incidents/:id/resolve
 * Resolve incident
 */
router.post('/:id/resolve',
    authenticate,
    authorize('incidents:update'),
    validate([
        rules.uuid('id'),
        rules.text('resolutionNotes', { required: true }),
        rules.text('rootCause', { required: false }),
        rules.string('resolutionCode', { required: false, max: 100 }),
    ]),
    asyncHandler(async (req, res) => {
        const { resolutionNotes, rootCause, resolutionCode } = req.body;

        const incident = await incidentService.updateIncident(
            req.user.organizationId,
            req.params.id,
            req.user.id,
            {
                status: 'resolved',
                resolutionNotes,
                rootCause,
                resolutionCode
            }
        );

        return apiResponse.success(res, incident, 'Incident resolved successfully');
    })
);

/**
 * POST /api/incidents/:id/reopen
 * Reopen resolved/closed incident
 */
router.post('/:id/reopen',
    authenticate,
    authorize('incidents:update'),
    validate([
        rules.uuid('id'),
        rules.text('reason', { required: true }),
    ]),
    asyncHandler(async (req, res) => {
        const { reason } = req.body;

        const incident = await incidentService.updateIncident(
            req.user.organizationId,
            req.params.id,
            req.user.id,
            { status: 'open' }
        );

        await incidentService.addComment(
            req.user.organizationId,
            req.params.id,
            req.user.id,
            `Incident reopened: ${reason}`
        );

        return apiResponse.success(res, incident, 'Incident reopened successfully');
    })
);

module.exports = router;
