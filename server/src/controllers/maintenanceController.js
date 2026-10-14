const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');

async function getMaintenanceRequests(req, res) {
    try {
        let requests = [];

        if (req.user.role === 'OWNER') {
            requests = await query(`
                SELECT m.*, u.unit_number, p.name as property_name, b.name as building_name,
                       usr.full_name as tenant_name, usr.email as tenant_email, usr.phone as tenant_phone
                FROM maintenance_requests m
                JOIN units u ON m.unit_id = u.id
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                JOIN tenants t ON m.tenant_id = t.id
                JOIN users usr ON t.user_id = usr.id
                WHERE m.owner_id = ?
                ORDER BY m.created_at DESC
            `, [req.user.id]);
        } else {
            requests = await query(`
                SELECT m.*, u.unit_number, p.name as property_name, b.name as building_name,
                       usr.full_name as owner_name, usr.email as owner_email, usr.phone as owner_phone
                FROM maintenance_requests m
                JOIN units u ON m.unit_id = u.id
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                JOIN tenants t ON m.tenant_id = t.id
                JOIN users usr ON m.owner_id = usr.id
                WHERE t.user_id = ?
                ORDER BY m.created_at DESC
            `, [req.user.id]);
        }

        // Fetch evidence per request separately — cross-DB safe (no MySQL-only JSON_ARRAYAGG)
        const formatted = await Promise.all(requests.map(async (r) => {
            try {
                const evidenceRows = await query(
                    'SELECT id, title, file_url, file_type FROM evidence WHERE maintenance_id = ?',
                    [r.id]
                );
                return { ...r, evidence_files: Array.isArray(evidenceRows) ? evidenceRows : [] };
            } catch {
                return { ...r, evidence_files: [] };
            }
        }));

        return res.json({ success: true, maintenance_requests: formatted });
    } catch (err) {
        console.error('getMaintenanceRequests error:', err);
        return res.status(500).json({ success: false, message: 'Failed to retrieve maintenance requests.' });
    }
}

async function createMaintenanceRequest(req, res) {
    try {
        const { unit_id, title, description, category, priority } = req.body;
        const file = req.file;

        if (!title || !description) {
            return res.status(400).json({ success: false, message: 'Title and Description are required.' });
        }

        let targetUnitId = unit_id;
        let ownerId = null;
        let tenantMappingId = null;

        if (req.user.role === 'TENANT') {
            const tenantRows = await query('SELECT * FROM tenants WHERE user_id = ? AND status = \'ACTIVE\'', [req.user.id]);
            if (tenantRows.length === 0) {
                return res.status(400).json({ success: false, message: 'Tenant has no active unit assigned.' });
            }
            targetUnitId = tenantRows[0].unit_id;
            ownerId = tenantRows[0].owner_id;
            tenantMappingId = tenantRows[0].id;
        } else {
            if (!unit_id) return res.status(400).json({ success: false, message: 'Unit ID is required for owner creation.' });
            const unitRows = await query(`
                SELECT u.id, p.owner_id, t.id as tenant_id
                FROM units u
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                LEFT JOIN tenants t ON t.unit_id = u.id AND t.status = 'ACTIVE'
                WHERE u.id = ?
            `, [unit_id]);
            if (unitRows.length === 0) return res.status(404).json({ success: false, message: 'Unit not found.' });
            ownerId = unitRows[0].owner_id;
            tenantMappingId = unitRows[0].tenant_id;
        }

        const maintId = 'maint-' + uuidv4().substring(0, 8);
        const reportedDate = new Date().toISOString().slice(0, 10);

        await query(`
            INSERT INTO maintenance_requests (
                id, unit_id, tenant_id, owner_id, title, description, category, priority, status, reported_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'REPORTED', ?)
        `, [
            maintId, targetUnitId, tenantMappingId, ownerId, title, description,
            category || 'OTHER', priority || 'MEDIUM', reportedDate
        ]);

        // If evidence photo uploaded
        if (file) {
            const evId = 'ev-' + uuidv4().substring(0, 8);
            const fileUrl = `/uploads/evidence/${file.filename}`;
            await query(`
                INSERT INTO evidence (id, maintenance_id, payment_id, user_id, title, description, file_url, file_type)
                VALUES (?, ?, NULL, ?, ?, ?, ?, 'IMAGE')
            `, [evId, maintId, req.user.id, `Evidence for ${title}`, 'Initial reported photo', fileUrl]);
        }

        // Send notification to Owner
        if (ownerId) {
            const notifId = 'notif-' + uuidv4().substring(0, 8);
            await query(`
                INSERT INTO notifications (id, user_id, title, message, type)
                VALUES (?, ?, ?, ?, 'MAINTENANCE_UPDATE')
            `, [notifId, ownerId, 'New Maintenance Request', `${req.user.full_name} reported issue: "${title}"`]);
        }

        return res.status(201).json({
            success: true,
            message: 'Maintenance request reported successfully.',
            maintenance_id: maintId
        });
    } catch (err) {
        console.error('createMaintenanceRequest error:', err);
        return res.status(500).json({ success: false, message: 'Failed to create maintenance request.' });
    }
}

async function updateMaintenanceStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, resolution_date } = req.body;

        const allowedStatuses = ['REPORTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Valid status required (REPORTED, IN_PROGRESS, RESOLVED, CLOSED).' });
        }

        const resDate = (status === 'RESOLVED' || status === 'CLOSED')
            ? (resolution_date || new Date().toISOString().slice(0, 10))
            : null;

        if (resDate) {
            await query('UPDATE maintenance_requests SET status = ?, resolution_date = ? WHERE id = ?', [status, resDate, id]);
        } else {
            await query('UPDATE maintenance_requests SET status = ? WHERE id = ?', [status, id]);
        }

        // Notify tenant
        try {
            const maintRows = await query(`
                SELECT m.title, t.user_id
                FROM maintenance_requests m
                JOIN tenants t ON m.tenant_id = t.id
                WHERE m.id = ?
            `, [id]);
            if (maintRows.length > 0) {
                const notifId = 'notif-' + uuidv4().substring(0, 8);
                await query(
                    'INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, \'MAINTENANCE_UPDATE\')',
                    [notifId, maintRows[0].user_id, 'Maintenance Status Updated', `Your ticket "${maintRows[0].title}" status was updated to ${status}.`]
                );
            }
        } catch (notifErr) {
            console.warn('Could not send maintenance status notification:', notifErr.message);
        }

        return res.json({ success: true, message: `Maintenance request status updated to ${status}.` });
    } catch (err) {
        console.error('updateMaintenanceStatus error:', err);
        return res.status(500).json({ success: false, message: 'Failed to update maintenance status.' });
    }
}

module.exports = {
    getMaintenanceRequests,
    createMaintenanceRequest,
    updateMaintenanceStatus
};
