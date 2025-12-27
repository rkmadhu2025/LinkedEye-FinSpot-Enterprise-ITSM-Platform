/**
 * Incident Service
 * Handles incident management business logic
 */

const db = require('../config/database');
const logger = require('../utils/logger');
const { NotFoundError, BadRequestError } = require('../middleware/errorHandler');

/**
 * Get next incident number
 */
const getNextIncidentNumber = async (organizationId) => {
    const result = await db.query(
        'SELECT get_next_sequence($1, $2) as number',
        [organizationId, 'incident']
    );
    return result.rows[0].number;
};

/**
 * Create a new incident
 */
const createIncident = async (organizationId, userId, data) => {
    const incidentNumber = await getNextIncidentNumber(organizationId);

    // Calculate SLA due dates based on priority
    const slaResult = await db.query(
        'SELECT id, response_time_minutes, resolution_time_minutes FROM sla_definitions WHERE organization_id = $1 AND priority = $2 AND is_active = true',
        [organizationId, data.priority || 'medium']
    );

    let slaResponseDue = null;
    let slaResolutionDue = null;
    let slaId = null;

    if (slaResult.rows.length > 0) {
        const sla = slaResult.rows[0];
        slaId = sla.id;
        const now = new Date();
        slaResponseDue = new Date(now.getTime() + sla.response_time_minutes * 60000);
        slaResolutionDue = new Date(now.getTime() + sla.resolution_time_minutes * 60000);
    }

    const result = await db.query(
        `INSERT INTO incidents (
            organization_id, incident_number, title, description,
            status, priority, category, impact, urgency,
            environment_id, affected_asset_id, sla_id,
            reported_by, assigned_to, assigned_group_id,
            sla_response_due, sla_resolution_due, tags, custom_fields
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *`,
        [
            organizationId,
            incidentNumber,
            data.title,
            data.description,
            'open',
            data.priority || 'medium',
            data.category || 'other',
            data.impact || 'medium',
            data.urgency || 'medium',
            data.environmentId,
            data.affectedAssetId,
            slaId,
            userId,
            data.assignedTo,
            data.assignedGroupId,
            slaResponseDue,
            slaResolutionDue,
            data.tags || [],
            JSON.stringify(data.customFields || {})
        ]
    );

    const incident = result.rows[0];

    // Log activity
    await logActivity(incident.id, userId, 'created', null, null, null, 'Incident created');

    // If assigned, log assignment
    if (data.assignedTo || data.assignedGroupId) {
        await logActivity(incident.id, userId, 'assigned', 'assigned_to', null, data.assignedTo);
    }

    logger.info('Incident created', { incidentId: incident.id, number: incidentNumber });

    return getIncidentById(organizationId, incident.id);
};

/**
 * Get incident by ID with full details
 */
const getIncidentById = async (organizationId, incidentId) => {
    const result = await db.query(
        `SELECT
            i.*,
            r.first_name || ' ' || r.last_name as reporter_name,
            r.email as reporter_email,
            r.avatar_url as reporter_avatar,
            a.first_name || ' ' || a.last_name as assignee_name,
            a.email as assignee_email,
            a.avatar_url as assignee_avatar,
            g.name as group_name,
            g.code as group_code,
            e.name as environment_name,
            e.type as environment_type,
            ast.name as asset_name,
            ast.asset_tag as asset_tag,
            sla.name as sla_name,
            sla.response_time_minutes as sla_response_time,
            sla.resolution_time_minutes as sla_resolution_time
        FROM incidents i
        LEFT JOIN users r ON i.reported_by = r.id
        LEFT JOIN users a ON i.assigned_to = a.id
        LEFT JOIN groups g ON i.assigned_group_id = g.id
        LEFT JOIN environments e ON i.environment_id = e.id
        LEFT JOIN assets ast ON i.affected_asset_id = ast.id
        LEFT JOIN sla_definitions sla ON i.sla_id = sla.id
        WHERE i.id = $1 AND i.organization_id = $2`,
        [incidentId, organizationId]
    );

    if (result.rows.length === 0) {
        throw new NotFoundError('Incident not found');
    }

    const incident = result.rows[0];

    // Get activities
    const activities = await db.query(
        `SELECT
            ia.*,
            u.first_name || ' ' || u.last_name as user_name,
            u.avatar_url as user_avatar
        FROM incident_activities ia
        LEFT JOIN users u ON ia.user_id = u.id
        WHERE ia.incident_id = $1
        ORDER BY ia.created_at DESC
        LIMIT 50`,
        [incidentId]
    );

    incident.activities = activities.rows;

    // Get related incidents
    const related = await db.query(
        `SELECT
            i.id, i.incident_number, i.title, i.status, i.priority,
            ir.relationship_type
        FROM incident_related ir
        JOIN incidents i ON ir.related_incident_id = i.id
        WHERE ir.incident_id = $1`,
        [incidentId]
    );

    incident.relatedIncidents = related.rows;

    return formatIncidentResponse(incident);
};

/**
 * List incidents with filters and pagination
 */
const listIncidents = async (organizationId, options = {}) => {
    const {
        page = 1,
        limit = 20,
        status,
        priority,
        category,
        environmentId,
        assignedTo,
        assignedGroupId,
        reportedBy,
        search,
        sortBy = 'created_at',
        sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;
    const params = [organizationId];
    const conditions = ['i.organization_id = $1'];
    let paramIndex = 2;

    // Build conditions
    if (status) {
        if (Array.isArray(status)) {
            conditions.push(`i.status = ANY($${paramIndex++})`);
            params.push(status);
        } else {
            conditions.push(`i.status = $${paramIndex++}`);
            params.push(status);
        }
    }

    if (priority) {
        if (Array.isArray(priority)) {
            conditions.push(`i.priority = ANY($${paramIndex++})`);
            params.push(priority);
        } else {
            conditions.push(`i.priority = $${paramIndex++}`);
            params.push(priority);
        }
    }

    if (category) {
        conditions.push(`i.category = $${paramIndex++}`);
        params.push(category);
    }

    if (environmentId) {
        conditions.push(`i.environment_id = $${paramIndex++}`);
        params.push(environmentId);
    }

    if (assignedTo) {
        conditions.push(`i.assigned_to = $${paramIndex++}`);
        params.push(assignedTo);
    }

    if (assignedGroupId) {
        conditions.push(`i.assigned_group_id = $${paramIndex++}`);
        params.push(assignedGroupId);
    }

    if (reportedBy) {
        conditions.push(`i.reported_by = $${paramIndex++}`);
        params.push(reportedBy);
    }

    if (search) {
        conditions.push(`(i.title ILIKE $${paramIndex} OR i.incident_number ILIKE $${paramIndex} OR i.description ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Validate sort field
    const allowedSortFields = ['created_at', 'updated_at', 'priority', 'status', 'title', 'incident_number'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await db.query(
        `SELECT COUNT(*) FROM incidents i WHERE ${whereClause}`,
        params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get incidents
    const result = await db.query(
        `SELECT
            i.id, i.incident_number, i.title, i.status, i.priority,
            i.category, i.impact, i.urgency, i.created_at, i.updated_at,
            i.sla_response_due, i.sla_resolution_due, i.first_response_at, i.resolved_at,
            r.first_name || ' ' || r.last_name as reporter_name,
            r.avatar_url as reporter_avatar,
            a.first_name || ' ' || a.last_name as assignee_name,
            a.avatar_url as assignee_avatar,
            g.name as group_name,
            e.name as environment_name
        FROM incidents i
        LEFT JOIN users r ON i.reported_by = r.id
        LEFT JOIN users a ON i.assigned_to = a.id
        LEFT JOIN groups g ON i.assigned_group_id = g.id
        LEFT JOIN environments e ON i.environment_id = e.id
        WHERE ${whereClause}
        ORDER BY i.${sortField} ${order}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
    );

    const incidents = result.rows.map(formatIncidentListItem);

    return {
        incidents,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
        }
    };
};

/**
 * Update incident
 */
const updateIncident = async (organizationId, incidentId, userId, data) => {
    // Get current incident
    const current = await db.query(
        'SELECT * FROM incidents WHERE id = $1 AND organization_id = $2',
        [incidentId, organizationId]
    );

    if (current.rows.length === 0) {
        throw new NotFoundError('Incident not found');
    }

    const currentIncident = current.rows[0];

    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = {
        title: 'title',
        description: 'description',
        status: 'status',
        priority: 'priority',
        category: 'category',
        impact: 'impact',
        urgency: 'urgency',
        environmentId: 'environment_id',
        affectedAssetId: 'affected_asset_id',
        assignedTo: 'assigned_to',
        assignedGroupId: 'assigned_group_id',
        resolutionNotes: 'resolution_notes',
        rootCause: 'root_cause',
        workaround: 'workaround',
        resolutionCode: 'resolution_code',
        tags: 'tags'
    };

    for (const [key, dbField] of Object.entries(allowedFields)) {
        if (data[key] !== undefined) {
            const oldValue = currentIncident[dbField];
            const newValue = data[key];

            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                updates.push(`${dbField} = $${paramIndex++}`);
                values.push(key === 'tags' ? newValue : newValue);

                // Log field change
                await logActivity(incidentId, userId, 'field_change', dbField, String(oldValue), String(newValue));
            }
        }
    }

    // Handle status changes
    if (data.status && data.status !== currentIncident.status) {
        // First response
        if (!currentIncident.first_response_at && ['in_progress', 'pending'].includes(data.status)) {
            updates.push(`first_response_at = CURRENT_TIMESTAMP`);
        }

        // Resolved
        if (data.status === 'resolved' && !currentIncident.resolved_at) {
            updates.push(`resolved_at = CURRENT_TIMESTAMP`);
        }

        // Closed
        if (data.status === 'closed' && !currentIncident.closed_at) {
            updates.push(`closed_at = CURRENT_TIMESTAMP`);
        }

        // Reopened
        if (['open', 'in_progress'].includes(data.status) && ['resolved', 'closed'].includes(currentIncident.status)) {
            updates.push(`reopened_count = reopened_count + 1`);
            updates.push(`last_reopened_at = CURRENT_TIMESTAMP`);
            updates.push(`resolved_at = NULL`);
            updates.push(`closed_at = NULL`);
        }

        await logActivity(incidentId, userId, 'status_change', 'status', currentIncident.status, data.status);
    }

    if (updates.length === 0) {
        return getIncidentById(organizationId, incidentId);
    }

    values.push(incidentId, organizationId);

    await db.query(
        `UPDATE incidents SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}`,
        values
    );

    logger.info('Incident updated', { incidentId, userId });

    return getIncidentById(organizationId, incidentId);
};

/**
 * Add comment to incident
 */
const addComment = async (organizationId, incidentId, userId, comment, isPublic = true) => {
    // Verify incident exists
    const incident = await db.query(
        'SELECT id FROM incidents WHERE id = $1 AND organization_id = $2',
        [incidentId, organizationId]
    );

    if (incident.rows.length === 0) {
        throw new NotFoundError('Incident not found');
    }

    await logActivity(incidentId, userId, 'comment', null, null, null, comment, isPublic);

    logger.info('Comment added to incident', { incidentId, userId });

    return { success: true };
};

/**
 * Get incident statistics
 */
const getStatistics = async (organizationId, filters = {}) => {
    const { environmentId, dateFrom, dateTo } = filters;

    let conditions = ['organization_id = $1'];
    const params = [organizationId];
    let paramIndex = 2;

    if (environmentId) {
        conditions.push(`environment_id = $${paramIndex++}`);
        params.push(environmentId);
    }

    if (dateFrom) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(dateFrom);
    }

    if (dateTo) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(dateTo);
    }

    const whereClause = conditions.join(' AND ');

    const result = await db.query(
        `SELECT
            COUNT(*) FILTER (WHERE status NOT IN ('closed', 'resolved')) as open_count,
            COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('closed', 'resolved')) as critical_count,
            COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('closed', 'resolved')) as high_count,
            COUNT(*) FILTER (WHERE priority = 'medium' AND status NOT IN ('closed', 'resolved')) as medium_count,
            COUNT(*) FILTER (WHERE priority = 'low' AND status NOT IN ('closed', 'resolved')) as low_count,
            COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
            COUNT(*) FILTER (WHERE resolved_at >= CURRENT_DATE) as resolved_today,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as created_today,
            COUNT(*) FILTER (WHERE sla_resolution_due < CURRENT_TIMESTAMP AND resolved_at IS NULL AND status NOT IN ('closed', 'resolved')) as sla_breached,
            AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, CURRENT_TIMESTAMP) - created_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_hours
        FROM incidents
        WHERE ${whereClause}`,
        params
    );

    return result.rows[0];
};

// Helper functions

const logActivity = async (incidentId, userId, activityType, fieldName, oldValue, newValue, comment = null, isPublic = true) => {
    await db.query(
        `INSERT INTO incident_activities (incident_id, user_id, activity_type, field_name, old_value, new_value, comment, is_public)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [incidentId, userId, activityType, fieldName, oldValue, newValue, comment, isPublic]
    );
};

const formatIncidentResponse = (incident) => {
    return {
        id: incident.id,
        incidentNumber: incident.incident_number,
        title: incident.title,
        description: incident.description,
        status: incident.status,
        priority: incident.priority,
        category: incident.category,
        impact: incident.impact,
        urgency: incident.urgency,
        environment: incident.environment_id ? {
            id: incident.environment_id,
            name: incident.environment_name,
            type: incident.environment_type
        } : null,
        affectedAsset: incident.affected_asset_id ? {
            id: incident.affected_asset_id,
            name: incident.asset_name,
            assetTag: incident.asset_tag
        } : null,
        reporter: {
            id: incident.reported_by,
            name: incident.reporter_name,
            email: incident.reporter_email,
            avatarUrl: incident.reporter_avatar
        },
        assignee: incident.assigned_to ? {
            id: incident.assigned_to,
            name: incident.assignee_name,
            email: incident.assignee_email,
            avatarUrl: incident.assignee_avatar
        } : null,
        group: incident.assigned_group_id ? {
            id: incident.assigned_group_id,
            name: incident.group_name,
            code: incident.group_code
        } : null,
        sla: incident.sla_id ? {
            id: incident.sla_id,
            name: incident.sla_name,
            responseDue: incident.sla_response_due,
            resolutionDue: incident.sla_resolution_due,
            responseTime: incident.sla_response_time,
            resolutionTime: incident.sla_resolution_time
        } : null,
        resolutionNotes: incident.resolution_notes,
        rootCause: incident.root_cause,
        workaround: incident.workaround,
        resolutionCode: incident.resolution_code,
        firstResponseAt: incident.first_response_at,
        resolvedAt: incident.resolved_at,
        closedAt: incident.closed_at,
        reopenedCount: incident.reopened_count,
        tags: incident.tags,
        customFields: incident.custom_fields,
        activities: incident.activities || [],
        relatedIncidents: incident.relatedIncidents || [],
        createdAt: incident.created_at,
        updatedAt: incident.updated_at
    };
};

const formatIncidentListItem = (incident) => {
    return {
        id: incident.id,
        incidentNumber: incident.incident_number,
        title: incident.title,
        status: incident.status,
        priority: incident.priority,
        category: incident.category,
        impact: incident.impact,
        urgency: incident.urgency,
        reporter: {
            name: incident.reporter_name,
            avatarUrl: incident.reporter_avatar
        },
        assignee: incident.assignee_name ? {
            name: incident.assignee_name,
            avatarUrl: incident.assignee_avatar
        } : null,
        groupName: incident.group_name,
        environmentName: incident.environment_name,
        slaResponseDue: incident.sla_response_due,
        slaResolutionDue: incident.sla_resolution_due,
        firstResponseAt: incident.first_response_at,
        resolvedAt: incident.resolved_at,
        createdAt: incident.created_at,
        updatedAt: incident.updated_at
    };
};

module.exports = {
    createIncident,
    getIncidentById,
    listIncidents,
    updateIncident,
    addComment,
    getStatistics
};
