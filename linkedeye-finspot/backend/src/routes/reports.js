/**
 * Report Routes
 * Reporting and analytics endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, rules, query } = require('../middleware/validate');
const apiResponse = require('../utils/apiResponse');

/**
 * GET /api/reports/incidents/summary
 * Incident summary report
 */
router.get('/incidents/summary',
    authenticate,
    authorize('reports:read'),
    validate([
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
        query('environmentId').optional().isUUID(4),
    ]),
    asyncHandler(async (req, res) => {
        const orgId = req.user.organizationId;
        const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = req.query.endDate || new Date().toISOString();
        const environmentId = req.query.environmentId;

        let envCondition = '';
        const params = [orgId, startDate, endDate];

        if (environmentId) {
            envCondition = 'AND environment_id = $4';
            params.push(environmentId);
        }

        const summary = await db.query(
            `SELECT
                COUNT(*) as total_incidents,
                COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'closed') as resolved,
                COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed')) as open,
                COUNT(*) FILTER (WHERE priority = 'critical') as critical,
                COUNT(*) FILTER (WHERE priority = 'high') as high,
                COUNT(*) FILTER (WHERE priority = 'medium') as medium,
                COUNT(*) FILTER (WHERE priority = 'low') as low,
                COUNT(*) FILTER (WHERE resolved_at <= sla_resolution_due) as met_sla,
                COUNT(*) FILTER (WHERE resolved_at > sla_resolution_due) as breached_sla,
                ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::numeric, 2) as avg_resolution_hours,
                ROUND(AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60)::numeric, 2) as avg_response_minutes
            FROM incidents
            WHERE organization_id = $1
            AND created_at BETWEEN $2 AND $3
            ${envCondition}`,
            params
        );

        // Get by category
        const byCategory = await db.query(
            `SELECT category, COUNT(*) as count
            FROM incidents
            WHERE organization_id = $1 AND created_at BETWEEN $2 AND $3 ${envCondition}
            GROUP BY category
            ORDER BY count DESC`,
            params
        );

        // Get by status
        const byStatus = await db.query(
            `SELECT status, COUNT(*) as count
            FROM incidents
            WHERE organization_id = $1 AND created_at BETWEEN $2 AND $3 ${envCondition}
            GROUP BY status
            ORDER BY count DESC`,
            params
        );

        // Get daily trend
        const dailyTrend = await db.query(
            `SELECT
                date_trunc('day', created_at)::date as date,
                COUNT(*) as created,
                COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND date_trunc('day', resolved_at) = date_trunc('day', created_at)) as resolved_same_day
            FROM incidents
            WHERE organization_id = $1 AND created_at BETWEEN $2 AND $3 ${envCondition}
            GROUP BY date_trunc('day', created_at)
            ORDER BY date`,
            params
        );

        return apiResponse.success(res, {
            summary: summary.rows[0],
            byCategory: byCategory.rows,
            byStatus: byStatus.rows,
            dailyTrend: dailyTrend.rows,
            period: { startDate, endDate }
        });
    })
);

/**
 * GET /api/reports/incidents/by-assignee
 * Incidents by assignee report
 */
router.get('/incidents/by-assignee',
    authenticate,
    authorize('reports:read'),
    validate([
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
    ]),
    asyncHandler(async (req, res) => {
        const orgId = req.user.organizationId;
        const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = req.query.endDate || new Date().toISOString();

        const result = await db.query(
            `SELECT
                u.id as user_id,
                u.first_name || ' ' || u.last_name as name,
                u.avatar_url,
                COUNT(*) as total_assigned,
                COUNT(*) FILTER (WHERE i.status = 'resolved' OR i.status = 'closed') as resolved,
                COUNT(*) FILTER (WHERE i.status NOT IN ('resolved', 'closed')) as open,
                ROUND(AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 3600)::numeric, 2) as avg_resolution_hours,
                COUNT(*) FILTER (WHERE i.resolved_at <= i.sla_resolution_due) as met_sla,
                COUNT(*) FILTER (WHERE i.resolved_at > i.sla_resolution_due) as breached_sla
            FROM incidents i
            JOIN users u ON i.assigned_to = u.id
            WHERE i.organization_id = $1 AND i.created_at BETWEEN $2 AND $3
            GROUP BY u.id
            ORDER BY total_assigned DESC`,
            [orgId, startDate, endDate]
        );

        return apiResponse.success(res, {
            data: result.rows,
            period: { startDate, endDate }
        });
    })
);

/**
 * GET /api/reports/incidents/by-group
 * Incidents by group report
 */
router.get('/incidents/by-group',
    authenticate,
    authorize('reports:read'),
    validate([
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
    ]),
    asyncHandler(async (req, res) => {
        const orgId = req.user.organizationId;
        const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = req.query.endDate || new Date().toISOString();

        const result = await db.query(
            `SELECT
                g.id as group_id,
                g.name as group_name,
                COUNT(*) as total_assigned,
                COUNT(*) FILTER (WHERE i.status = 'resolved' OR i.status = 'closed') as resolved,
                COUNT(*) FILTER (WHERE i.status NOT IN ('resolved', 'closed')) as open,
                ROUND(AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 3600)::numeric, 2) as avg_resolution_hours
            FROM incidents i
            JOIN groups g ON i.assigned_group_id = g.id
            WHERE i.organization_id = $1 AND i.created_at BETWEEN $2 AND $3
            GROUP BY g.id
            ORDER BY total_assigned DESC`,
            [orgId, startDate, endDate]
        );

        return apiResponse.success(res, {
            data: result.rows,
            period: { startDate, endDate }
        });
    })
);

/**
 * GET /api/reports/changes/summary
 * Change summary report
 */
router.get('/changes/summary',
    authenticate,
    authorize('reports:read'),
    validate([
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
    ]),
    asyncHandler(async (req, res) => {
        const orgId = req.user.organizationId;
        const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = req.query.endDate || new Date().toISOString();

        const summary = await db.query(
            `SELECT
                COUNT(*) as total_changes,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
                COUNT(*) FILTER (WHERE change_type = 'standard') as standard,
                COUNT(*) FILTER (WHERE change_type = 'normal') as normal,
                COUNT(*) FILTER (WHERE change_type = 'emergency') as emergency,
                COUNT(*) FILTER (WHERE risk = 'critical') as critical_risk,
                COUNT(*) FILTER (WHERE risk = 'high') as high_risk,
                COUNT(*) FILTER (WHERE downtime_required = true) as with_downtime,
                SUM(downtime_minutes) FILTER (WHERE status = 'completed') as total_downtime_minutes
            FROM change_requests
            WHERE organization_id = $1
            AND created_at BETWEEN $2 AND $3`,
            [orgId, startDate, endDate]
        );

        // Get by category
        const byCategory = await db.query(
            `SELECT category, COUNT(*) as count
            FROM change_requests
            WHERE organization_id = $1 AND created_at BETWEEN $2 AND $3
            GROUP BY category
            ORDER BY count DESC`,
            [orgId, startDate, endDate]
        );

        // Get weekly trend
        const weeklyTrend = await db.query(
            `SELECT
                date_trunc('week', created_at)::date as week,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
            FROM change_requests
            WHERE organization_id = $1 AND created_at BETWEEN $2 AND $3
            GROUP BY date_trunc('week', created_at)
            ORDER BY week`,
            [orgId, startDate, endDate]
        );

        return apiResponse.success(res, {
            summary: summary.rows[0],
            byCategory: byCategory.rows,
            weeklyTrend: weeklyTrend.rows,
            period: { startDate, endDate }
        });
    })
);

/**
 * GET /api/reports/sla/performance
 * SLA performance report
 */
router.get('/sla/performance',
    authenticate,
    authorize('reports:read'),
    validate([
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
    ]),
    asyncHandler(async (req, res) => {
        const orgId = req.user.organizationId;
        const startDate = req.query.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = req.query.endDate || new Date().toISOString();

        // Overall SLA performance
        const overall = await db.query(
            `SELECT
                priority,
                COUNT(*) as total_resolved,
                COUNT(*) FILTER (WHERE resolved_at <= sla_resolution_due) as met_sla,
                COUNT(*) FILTER (WHERE resolved_at > sla_resolution_due) as breached_sla,
                ROUND((COUNT(*) FILTER (WHERE resolved_at <= sla_resolution_due)::numeric /
                       NULLIF(COUNT(*), 0) * 100)::numeric, 2) as compliance_rate,
                ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::numeric, 2) as avg_resolution_hours
            FROM incidents
            WHERE organization_id = $1
            AND resolved_at IS NOT NULL
            AND created_at BETWEEN $2 AND $3
            GROUP BY priority
            ORDER BY
                CASE priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END`,
            [orgId, startDate, endDate]
        );

        // Weekly trend
        const weeklyTrend = await db.query(
            `SELECT
                date_trunc('week', created_at)::date as week,
                COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as total_resolved,
                COUNT(*) FILTER (WHERE resolved_at <= sla_resolution_due) as met_sla,
                ROUND((COUNT(*) FILTER (WHERE resolved_at <= sla_resolution_due)::numeric /
                       NULLIF(COUNT(*) FILTER (WHERE resolved_at IS NOT NULL), 0) * 100)::numeric, 2) as compliance_rate
            FROM incidents
            WHERE organization_id = $1
            AND created_at BETWEEN $2 AND $3
            GROUP BY date_trunc('week', created_at)
            ORDER BY week`,
            [orgId, startDate, endDate]
        );

        return apiResponse.success(res, {
            byPriority: overall.rows,
            weeklyTrend: weeklyTrend.rows,
            period: { startDate, endDate }
        });
    })
);

/**
 * GET /api/reports/assets/inventory
 * Asset inventory report
 */
router.get('/assets/inventory',
    authenticate,
    authorize('reports:read'),
    asyncHandler(async (req, res) => {
        const orgId = req.user.organizationId;

        // By type
        const byType = await db.query(
            `SELECT
                asset_type,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance,
                COUNT(*) FILTER (WHERE status = 'inactive') as inactive
            FROM assets
            WHERE organization_id = $1 AND is_active = true
            GROUP BY asset_type
            ORDER BY total DESC`,
            [orgId]
        );

        // By environment
        const byEnvironment = await db.query(
            `SELECT
                e.name as environment_name,
                e.type as environment_type,
                COUNT(a.id) as total_assets
            FROM environments e
            LEFT JOIN assets a ON e.id = a.environment_id AND a.is_active = true
            WHERE e.organization_id = $1 AND e.is_active = true
            GROUP BY e.id
            ORDER BY total_assets DESC`,
            [orgId]
        );

        // By criticality
        const byCriticality = await db.query(
            `SELECT
                criticality,
                COUNT(*) as count
            FROM assets
            WHERE organization_id = $1 AND is_active = true
            GROUP BY criticality
            ORDER BY
                CASE criticality
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END`,
            [orgId]
        );

        // Summary
        const summary = await db.query(
            `SELECT
                COUNT(*) as total_assets,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE warranty_expiry < CURRENT_DATE) as expired_warranty,
                COUNT(*) FILTER (WHERE warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_warranty
            FROM assets
            WHERE organization_id = $1 AND is_active = true`,
            [orgId]
        );

        return apiResponse.success(res, {
            summary: summary.rows[0],
            byType: byType.rows,
            byEnvironment: byEnvironment.rows,
            byCriticality: byCriticality.rows
        });
    })
);

module.exports = router;
