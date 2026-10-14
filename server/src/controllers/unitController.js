const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');

async function getUnits(req, res) {
    try {
        if (req.user.role === 'OWNER') {
            const units = await query(`
                SELECT u.*, f.name as floor_name, b.name as building_name, p.name as property_name, p.id as property_id,
                       t.id as tenant_mapping_id, usr.full_name as tenant_name, usr.email as tenant_email, usr.phone as tenant_phone
                FROM units u
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                LEFT JOIN tenants t ON t.unit_id = u.id AND t.status = 'ACTIVE'
                LEFT JOIN users usr ON t.user_id = usr.id
                WHERE p.owner_id = ?
                ORDER BY p.name, b.name, f.floor_number, u.unit_number
            `, [req.user.id]);
            return res.json({ success: true, units });
        } else {
            const units = await query(`
                SELECT u.*, f.name as floor_name, b.name as building_name, p.name as property_name, p.id as property_id,
                       usr.full_name as owner_name, usr.email as owner_email, usr.phone as owner_phone
                FROM units u
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                JOIN tenants t ON t.unit_id = u.id
                JOIN users usr ON p.owner_id = usr.id
                WHERE t.user_id = ? AND t.status = 'ACTIVE'
            `, [req.user.id]);
            return res.json({ success: true, units });
        }
    } catch (err) {
        console.error('getUnits error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch units.' });
    }
}

async function createUnit(req, res) {
    try {
        const {
            floor_id, unit_number, bedrooms, bathrooms, area_sqft,
            monthly_rent, maintenance_charge, security_deposit, rent_due_day
        } = req.body;

        if (!floor_id || !unit_number || monthly_rent === undefined) {
            return res.status(400).json({ success: false, message: 'Floor ID, Unit Number, and Monthly Rent are required.' });
        }

        const unitId = 'u-' + uuidv4().substring(0, 8);
        await query(`
            INSERT INTO units (
                id, floor_id, unit_number, bedrooms, bathrooms, area_sqft,
                monthly_rent, maintenance_charge, security_deposit, rent_due_day, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VACANT')
        `, [
            unitId, floor_id, unit_number, bedrooms || 1, bathrooms || 1, area_sqft || 500,
            monthly_rent || 0, maintenance_charge || 0, security_deposit || 0, rent_due_day || 5
        ]);

        return res.status(201).json({ success: true, message: 'Unit created successfully.', unit_id: unitId });
    } catch (err) {
        console.error('createUnit error:', err);
        return res.status(500).json({ success: false, message: 'Failed to create unit.' });
    }
}

async function updateUnit(req, res) {
    try {
        const { id } = req.params;
        const fields = [];
        const values = [];
        const allowed = ['unit_number', 'bedrooms', 'bathrooms', 'area_sqft', 'monthly_rent', 'maintenance_charge', 'security_deposit', 'rent_due_day', 'status'];

        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(req.body[key]);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields provided for update.' });
        }

        values.push(id);
        await query(`UPDATE units SET ${fields.join(', ')} WHERE id = ?`, values);
        return res.json({ success: true, message: 'Unit updated successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to update unit.' });
    }
}

async function deleteUnit(req, res) {
    try {
        const { id } = req.params;
        await query('DELETE FROM units WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Unit deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete unit.' });
    }
}

module.exports = { getUnits, createUnit, updateUnit, deleteUnit };
