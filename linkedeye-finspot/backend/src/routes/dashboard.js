/**
 * Dashboard Routes
 * Dashboard metrics and analytics endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const apiResponse = require('../utils/apiResponse');

/**
 * GET /api/dashboard
 * Get main dashboard data
 */
router.get('/',
    authenticate,
    asyncHandler(async (req, res) => {
        const orgId = req.user.organizationId;

        // Get incident statistics
        const incidentStats = await db.query(
            `SELECT
                COUNT(*) FILTER (WHERE status NOT IN ('closed', 'resolved')) as open_total,
                COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('closed', 'resolved')) as critical,
                COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('closed', 'resolved')) as high,
                COUNT(*) FILTER (WHERE priority = 'medium' AND status NOT IN ('closed', 'resolved')) as medium,
                COUNT(*) FILTER (WHERE priority = 'low' AND status NOT IN ('closed', 'resolved')) as low,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as created_today,
                COUNT(*) FILTER (WHERE resolved_at >= CURRENT_DATE) as resolved_today,
                COUNT(*) FILTER (WHERE sla_resolution_due < CURRENT_TIMESTAMP AND resolved_at IS NULL AND status NOT IN ('closed', 'resolved')) as sla_breached
            FROM incidents
            WHERE organization_id = $1`,
            [orgId]
        );

        // Get change statistics
        const changeStats = await db.query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'pending_approval') as pending_approval,
                COUNT(*) FILTER (WHERE status = 'approved') as approved,
                COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
                COUNT(*) FILTER (WHERE status = 'implementing') as implementing,
                COUNT(*) FILTER (WHERE scheduled_start >= CURRENT_DATE AND scheduled_start < CURRENT_DATE + INTERVAL '7 days') as upcoming_week
            FROM change_requests
            WHERE organization_id = $1`,
            [orgId]
        );

        // Get environment status
        const environments = await db.query(
            `SELECT
                e.id, e.name, e.type, e.status, e.health_metrics,
                COUNT(DISTINCT i.id) FILTER (WHERE i.status NOT IN ('closed', 'resolved')) as open_incidents
            FROM environments e
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
            [orgId]
        );

        // Get upcoming changes (next 7 days)
        const upcomingChanges = await db.query(
            `SELECT
                c.id, c.change_number, c.title, c.change_type, c.risk,
                c.scheduled_start, c.scheduled_end, c.downtime_required,
                e.name as environment_name
            FROM change_requests c
            LEFT JOIN environments e ON c.environment_id = e.id
            WHERE c.organization_id = $1
            AND c.status IN ('approved', 'scheduled')
            AND c.scheduled_start >= CURRENT_TIMESTAMP
            AND c.scheduled_start < CURRENT_TIMESTAMP + INTERVAL '7 days'
            ORDER BY c.scheduled_start
            LIMIT 5`,
            [orgId]
        );

        // Get on-call schedule
        const onCall = await db.query(
            `SELECT
                g.id as group_id, g.name as group_name,
                u.id as user_id, u.first_name, u.last_name, u.avatar_url,
                ocs.start_time, ocs.end_time
            FROM on_call_schedules ocs
            JOIN groups g ON ocs.group_id = g.id
            JOIN users u ON ocs.user_id = u.id
            WHERE ocs.organization_id = $1
            AND ocs.start_time <= CURRENT_TIMESTAMP
            AND ocs.end_time > CURRENT_TIMESTAMP
            AND ocs.is_primary = true`,
            [orgId]
        );

        // Get recent incidents
        const recentIncidents = await db.query(
            `SELECT
                i.id, i.incident_number, i.title, i.status, i.priority,
                i.created_at,
                u.first_name || ' ' || u.last_name as reporter_name
            FROM incidents i
            LEFT JOIN users u ON i.reported_by = u.id
            WHERE i.organization_id = $1
            ORDER BY i.created_at DESC
            LIMIT 5`,
            [orgId]
        );

        // Get incident trend (last 7 days)
        const incidentTrend = await db.query(
            `SELECT
                date_trunc('day', created_at)::date as date,
                COUNT(*) as created,
                COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND date_trunc('day', resolved_at) = date_trunc('day', created_at)) as resolved
            FROM incidents
            WHERE organization_id = $1
            AND created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY date_trunc('day', created_at)
            ORDER BY date`,
            [orgId]
        );

        // Get category distribution
        const categoryDistribution = await db.query(
            `SELECT
                category,
                COUNT(*) as count
            FROM incidents
            WHERE organization_id = $1
            AND status NOT IN ('closed', 'resolved')
            GROUP BY category
            ORDER BY count DESC`,
            [orgId]
        );

        return apiResponse.success(res, {
            incidents: {
                ...incidentStats.rows[0],
                trend: incidentTrend.rows,
                categoryDistribution: categoryDistribution.rows
            },
            changes: changeStats.rows[0],
            environments: environments.rows,
            upcomingChanges: upcomingChanges.rows,
            onCall: onCall.rows,
            recentIncidents: recentIncidents.rows
        });
    })
);

/**
 * GET /api/dashboard/metrics
 * Get key metrics for dashboard cards
 */
router.get('/metrics',
    authenticate,
    asyncHandler(async (req, res) => {
        const orgId = req.user.organizationId;

        const metrics = await db.query(
            `SELECT
                (SELECT COUNT(*) FROM incidents WHERE organization_id = $1 AND status NOT IN ('closed', 'resolved')) as open_incidents,
                (SELECT COUNT(*) FROM incidents WHERE organization_id = $1 AND priority = 'critical' AND status NOT IN ('closed', 'resolved')) as critical_incidents,
                (SELECT COUNT(*) FROM change_requests WHERE organization_id = $1 AND status = 'pending_approval') as pending_changes,
                (SELECT COUNT(*) FROM change_requests WHERE organization_id = $1 AND status = 'implementing') as implementing_changes,
                (SELECT COUNT(*) FROM assets WHERE organization_id = $1 AND is_active = true) as total_assets,
                (SELECT COUNT(*) FROM assets WHERE organization_id = $1 AND status = 'active' AND is_active = true) as active_assets,
                (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, CURRENT_TIMESTAMP) - created_at)) / 3600)::numeric, 1)
                 FROM incidents WHERE organization_id = $1 AND resolved_at IS NOT NULL AND created_at >= CURRENT_DATE - INTERVAL '30 days') as avg_resolution_hours,
                (SELECT ROUND((COUNT(*) FILTER (WHERE resolved_at <= sla_resolution_due)::numeric / NULLIF(COUNT(*) FILTER (WHERE resolved_at IS NOT NULL), 0) * 100)::numeric, 1)
                 FROM incidents WHERE organization_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days') as sla_compliance_rate`,
            [orgId]
        );

        return apiResponse.success(res, metrics.rows[0]);
    })
);

/**
 * GET /api/dashboard/charts/incidents
 * Get incident chart data
 */
router.get('/charts/incidents',
    authenticate,
    asyncHandler(async (req, res) => {
        const orgId = req.user.organizationId;
        const days = parseInt(req.query.days) || 30;

        const trend = await db.query(
            `SELECT
                date_trunc('day', created_at)::date as date,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE priority = 'critical') as critical,
                COUNT(*) FILTER (WHERE priority = 'high') as high,
                COUNT(*) FILTER (WHERE priority = 'medium') as medium,
                COUNT(*) FILTER (WHERE priority = 'low') as low
            FROM incidents
            WHERE organization_id = $1
            AND created_at >= CURRENT_DATE - $2 * INTERVAL '1 day'
            GROUP BY date_trunc('day', created_at)
            ORDER BY date`,
            [orgId, days]
        );

        return apiResponse.success(res, trend.rows);
    })
);

/**
 * GET /api/dashboard/charts/sla
 * Get SLA performance chart data
 */
router.get('/charts/sla',
    authenticate,
    asyncHandler(async (req, res) => {
        const orgId = req.user.organizationId;

        const sla = await db.query(
            `SELECT
                date_trunc('week', created_at)::date as week,
                COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as total_resolved,
                COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at <= sla_resolution_due) as met_sla,
                ROUND((COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at <= sla_resolution_due)::numeric /
                       NULLIF(COUNT(*) FILTER (WHERE resolved_at IS NOT NULL), 0) * 100)::numeric, 1) as compliance_rate
            FROM incidents
            WHERE organization_id = $1
            AND created_at >= CURRENT_DATE - INTERVAL '12 weeks'
            GROUP BY date_trunc('week', created_at)
            ORDER BY week`,
            [orgId]
        );

        return apiResponse.success(res, sla.rows);
    })
);

/**
 * GET /api/dashboard/ai-insights
 * Get AI-generated insights (placeholder for actual AI integration)
 */
router.get('/ai-insights',
    authenticate,
    asyncHandler(async (req, res) => {
        const orgId = req.user.organizationId;

        // Get data for insights
        const stats = await db.query(
            `SELECT
                COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('closed', 'resolved')) as critical_open,
                COUNT(*) FILTER (WHERE sla_resolution_due < CURRENT_TIMESTAMP AND resolved_at IS NULL AND status NOT IN ('closed', 'resolved')) as sla_breached,
                COUNT(*) FILTER (WHERE category = (SELECT category FROM incidents WHERE organization_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1)) as top_category_count,
                (SELECT category FROM incidents WHERE organization_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1) as top_category
            FROM incidents
            WHERE organization_id = $1
            AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
            [orgId]
        );

        const data = stats.rows[0];

        // Generate insights based on data
        const insights = [];

        if (parseInt(data.critical_open) > 0) {
            insights.push({
                type: 'warning',
                icon: 'alert-triangle',
                title: 'Critical Incidents',
                message: `There are ${data.critical_open} critical incidents requiring immediate attention.`,
                action: 'View Critical Incidents',
                actionUrl: '/incidents?priority=critical'
            });
        }

        if (parseInt(data.sla_breached) > 0) {
            insights.push({
                type: 'error',
                icon: 'clock',
                title: 'SLA Breaches',
                message: `${data.sla_breached} incidents have breached their SLA. Consider prioritizing these tickets.`,
                action: 'View Breached',
                actionUrl: '/incidents?sla=breached'
            });
        }

        if (data.top_category) {
            insights.push({
                type: 'info',
                icon: 'trending-up',
                title: 'Trending Category',
                message: `${data.top_category} incidents are trending this week with ${data.top_category_count} new tickets.`,
                action: 'View Trend',
                actionUrl: `/incidents?category=${data.top_category}`
            });
        }

        if (insights.length === 0) {
            insights.push({
                type: 'success',
                icon: 'check-circle',
                title: 'All Systems Healthy',
                message: 'No critical issues detected. Operations are running smoothly.',
                action: null,
                actionUrl: null
            });
        }

        return apiResponse.success(res, insights);
    })
);

module.exports = router;
