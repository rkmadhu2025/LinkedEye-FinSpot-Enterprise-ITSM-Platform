/**
 * Asset Routes
 * CMDB asset management endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { validate, rules, query } = require('../middleware/validate');
const apiResponse = require('../utils/apiResponse');
const { parsePagination, parseSort } = require('../utils/helpers');

/**
 * Get next asset tag
 */
const getNextAssetTag = async (organizationId) => {
    const result = await db.query(
        'SELECT get_next_sequence($1, $2) as number',
        [organizationId, 'asset']
    );
    return result.rows[0].number;
};

/**
 * GET /api/assets
 * List assets with filters
 */
router.get('/',
    authenticate,
    authorize('assets:read'),
    validate([
        ...rules.pagination(),
        ...rules.sort(['name', 'asset_tag', 'asset_type', 'status', 'criticality', 'created_at']),
        rules.search(),
        query('assetType').optional().trim(),
        query('status').optional().trim(),
        query('criticality').optional().trim(),
        query('environmentId').optional().isUUID(4),
    ]),
    asyncHandler(async (req, res) => {
        const { page, limit, offset } = parsePagination(req.query);
        const { sortBy, sortOrder } = parseSort(req.query, ['name', 'asset_tag', 'asset_type', 'status', 'criticality', 'created_at']);

        let conditions = ['a.organization_id = $1', 'a.is_active = true'];
        const params = [req.user.organizationId];
        let paramIndex = 2;

        if (req.query.assetType) {
            conditions.push(`a.asset_type = $${paramIndex++}`);
            params.push(req.query.assetType);
        }

        if (req.query.status) {
            conditions.push(`a.status = $${paramIndex++}`);
            params.push(req.query.status);
        }

        if (req.query.criticality) {
            conditions.push(`a.criticality = $${paramIndex++}`);
            params.push(req.query.criticality);
        }

        if (req.query.environmentId) {
            conditions.push(`a.environment_id = $${paramIndex++}`);
            params.push(req.query.environmentId);
        }

        if (req.query.search) {
            conditions.push(`(a.name ILIKE $${paramIndex} OR a.asset_tag ILIKE $${paramIndex} OR a.ip_address ILIKE $${paramIndex})`);
            params.push(`%${req.query.search}%`);
            paramIndex++;
        }

        const whereClause = conditions.join(' AND ');

        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) FROM assets a WHERE ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        // Get assets
        const result = await db.query(
            `SELECT
                a.id, a.asset_tag, a.name, a.description, a.asset_type,
                a.status, a.criticality, a.location, a.ip_address,
                a.manufacturer, a.model, a.os_type, a.os_version,
                a.created_at, a.updated_at,
                e.name as environment_name,
                e.type as environment_type,
                o.first_name || ' ' || o.last_name as owner_name,
                g.name as managed_by_group
            FROM assets a
            LEFT JOIN environments e ON a.environment_id = e.id
            LEFT JOIN users o ON a.owner_id = o.id
            LEFT JOIN groups g ON a.managed_by_group_id = g.id
            WHERE ${whereClause}
            ORDER BY a.${sortBy} ${sortOrder}
            LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            [...params, limit, offset]
        );

        return apiResponse.paginated(res, result.rows, { page, limit, total });
    })
);

/**
 * GET /api/assets/types
 * Get asset type statistics
 */
router.get('/types',
    authenticate,
    authorize('assets:read'),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT
                asset_type,
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE status = 'active') as active_count
            FROM assets
            WHERE organization_id = $1 AND is_active = true
            GROUP BY asset_type
            ORDER BY count DESC`,
            [req.user.organizationId]
        );

        return apiResponse.success(res, result.rows);
    })
);

/**
 * GET /api/assets/:id
 * Get asset by ID
 */
router.get('/:id',
    authenticate,
    authorize('assets:read'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT
                a.*,
                e.name as environment_name,
                e.type as environment_type,
                o.first_name || ' ' || o.last_name as owner_name,
                o.email as owner_email,
                g.name as managed_by_group,
                p.name as parent_asset_name,
                p.asset_tag as parent_asset_tag
            FROM assets a
            LEFT JOIN environments e ON a.environment_id = e.id
            LEFT JOIN users o ON a.owner_id = o.id
            LEFT JOIN groups g ON a.managed_by_group_id = g.id
            LEFT JOIN assets p ON a.parent_asset_id = p.id
            WHERE a.id = $1 AND a.organization_id = $2`,
            [req.params.id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Asset not found');
        }

        const asset = result.rows[0];

        // Get relationships
        const relationships = await db.query(
            `SELECT
                ar.id, ar.relationship_type, ar.description,
                CASE
                    WHEN ar.source_asset_id = $1 THEN 'outgoing'
                    ELSE 'incoming'
                END as direction,
                CASE
                    WHEN ar.source_asset_id = $1 THEN ar.target_asset_id
                    ELSE ar.source_asset_id
                END as related_asset_id,
                CASE
                    WHEN ar.source_asset_id = $1 THEN ta.name
                    ELSE sa.name
                END as related_asset_name,
                CASE
                    WHEN ar.source_asset_id = $1 THEN ta.asset_tag
                    ELSE sa.asset_tag
                END as related_asset_tag
            FROM asset_relationships ar
            LEFT JOIN assets sa ON ar.source_asset_id = sa.id
            LEFT JOIN assets ta ON ar.target_asset_id = ta.id
            WHERE ar.source_asset_id = $1 OR ar.target_asset_id = $1`,
            [req.params.id]
        );
        asset.relationships = relationships.rows;

        // Get child assets
        const children = await db.query(
            `SELECT id, asset_tag, name, asset_type, status
            FROM assets
            WHERE parent_asset_id = $1 AND is_active = true`,
            [req.params.id]
        );
        asset.children = children.rows;

        // Get recent incidents
        const incidents = await db.query(
            `SELECT id, incident_number, title, status, priority, created_at
            FROM incidents
            WHERE affected_asset_id = $1
            ORDER BY created_at DESC
            LIMIT 5`,
            [req.params.id]
        );
        asset.recentIncidents = incidents.rows;

        // Get recent changes
        const changes = await db.query(
            `SELECT c.id, c.change_number, c.title, c.status, c.scheduled_start
            FROM change_requests c
            JOIN change_affected_assets caa ON c.id = caa.change_id
            WHERE caa.asset_id = $1
            ORDER BY c.created_at DESC
            LIMIT 5`,
            [req.params.id]
        );
        asset.recentChanges = changes.rows;

        return apiResponse.success(res, asset);
    })
);

/**
 * POST /api/assets
 * Create a new asset
 */
router.post('/',
    authenticate,
    authorize('assets:create'),
    validate([
        rules.string('name', { min: 1, max: 255 }),
        rules.text('description', { required: false }),
        rules.enum('assetType', ['server', 'workstation', 'laptop', 'network_device', 'storage', 'virtual_machine', 'application', 'database', 'service', 'other']),
        rules.enum('status', ['active', 'inactive', 'maintenance', 'retired', 'disposed'], { required: false }),
        rules.enum('criticality', ['critical', 'high', 'medium', 'low'], { required: false }),
        rules.uuidOptional('environmentId'),
        rules.string('location', { required: false, max: 255 }),
        rules.string('ipAddress', { required: false, max: 45 }),
        rules.string('macAddress', { required: false, max: 17 }),
        rules.string('serialNumber', { required: false, max: 100 }),
        rules.string('manufacturer', { required: false, max: 200 }),
        rules.string('model', { required: false, max: 200 }),
        rules.string('osType', { required: false, max: 100 }),
        rules.string('osVersion', { required: false, max: 100 }),
        rules.uuidOptional('ownerId'),
        rules.uuidOptional('managedByGroupId'),
        rules.uuidOptional('parentAssetId'),
        rules.array('tags', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const assetTag = await getNextAssetTag(req.user.organizationId);

        const result = await db.query(
            `INSERT INTO assets (
                organization_id, asset_tag, name, description, asset_type,
                status, criticality, environment_id, location, ip_address,
                mac_address, serial_number, manufacturer, model,
                os_type, os_version, owner_id, managed_by_group_id,
                parent_asset_id, tags, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            RETURNING *`,
            [
                req.user.organizationId, assetTag, req.body.name, req.body.description,
                req.body.assetType, req.body.status || 'active', req.body.criticality || 'medium',
                req.body.environmentId, req.body.location, req.body.ipAddress,
                req.body.macAddress, req.body.serialNumber, req.body.manufacturer,
                req.body.model, req.body.osType, req.body.osVersion,
                req.body.ownerId, req.body.managedByGroupId, req.body.parentAssetId,
                req.body.tags || [], req.user.id
            ]
        );

        return apiResponse.created(res, result.rows[0], 'Asset created successfully');
    })
);

/**
 * PUT /api/assets/:id
 * Update asset
 */
router.put('/:id',
    authenticate,
    authorize('assets:update'),
    validate([
        rules.uuid('id'),
        rules.string('name', { min: 1, max: 255, required: false }),
        rules.text('description', { required: false }),
        rules.enum('status', ['active', 'inactive', 'maintenance', 'retired', 'disposed'], { required: false }),
        rules.enum('criticality', ['critical', 'high', 'medium', 'low'], { required: false }),
        rules.uuidOptional('environmentId'),
        rules.string('location', { required: false, max: 255 }),
        rules.string('ipAddress', { required: false, max: 45 }),
        rules.uuidOptional('ownerId'),
        rules.uuidOptional('managedByGroupId'),
        rules.array('tags', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const updates = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = {
            name: 'name', description: 'description', status: 'status',
            criticality: 'criticality', environmentId: 'environment_id',
            location: 'location', ipAddress: 'ip_address',
            ownerId: 'owner_id', managedByGroupId: 'managed_by_group_id',
            tags: 'tags'
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
            `UPDATE assets SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Asset not found');
        }

        return apiResponse.success(res, result.rows[0], 'Asset updated successfully');
    })
);

/**
 * DELETE /api/assets/:id
 * Soft delete asset
 */
router.delete('/:id',
    authenticate,
    authorize('assets:delete'),
    validate([rules.uuid('id')]),
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `UPDATE assets SET is_active = false, status = 'disposed', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND organization_id = $2
             RETURNING id`,
            [req.params.id, req.user.organizationId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Asset not found');
        }

        return apiResponse.success(res, null, 'Asset deleted successfully');
    })
);

/**
 * POST /api/assets/:id/relationships
 * Add asset relationship
 */
router.post('/:id/relationships',
    authenticate,
    authorize('assets:update'),
    validate([
        rules.uuid('id'),
        rules.uuid('targetAssetId', 'body'),
        rules.string('relationshipType', { max: 100 }),
        rules.text('description', { required: false }),
    ]),
    asyncHandler(async (req, res) => {
        const { targetAssetId, relationshipType, description } = req.body;

        await db.query(
            `INSERT INTO asset_relationships (source_asset_id, target_asset_id, relationship_type, description)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (source_asset_id, target_asset_id, relationship_type) DO UPDATE SET description = $4`,
            [req.params.id, targetAssetId, relationshipType, description]
        );

        return apiResponse.success(res, null, 'Relationship added successfully');
    })
);

module.exports = router;
