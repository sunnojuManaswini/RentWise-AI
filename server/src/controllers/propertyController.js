const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');

async function getProperties(req, res) {
    try {
        if (req.user.role === 'OWNER') {
            const properties = await query(`
                SELECT p.*, 
                    (SELECT COUNT(*) FROM buildings b WHERE b.property_id = p.id) as building_count,
                    (SELECT COUNT(*) FROM units u JOIN floors f ON u.floor_id = f.id JOIN buildings b ON f.building_id = b.id WHERE b.property_id = p.id) as total_units,
                    (SELECT COUNT(*) FROM units u JOIN floors f ON u.floor_id = f.id JOIN buildings b ON f.building_id = b.id WHERE b.property_id = p.id AND u.status = 'OCCUPIED') as occupied_units
                FROM properties p 
                WHERE p.owner_id = ?
                ORDER BY p.created_at DESC
            `, [req.user.id]);
            return res.json({ success: true, properties });
        } else {
            // Tenant view
            const properties = await query(`
                SELECT p.*, u.unit_number, f.name as floor_name, b.name as building_name
                FROM properties p
                JOIN buildings b ON b.property_id = p.id
                JOIN floors f ON f.building_id = b.id
                JOIN units u ON u.floor_id = f.id
                JOIN tenants t ON t.unit_id = u.id
                WHERE t.user_id = ? AND t.status = 'ACTIVE'
            `, [req.user.id]);
            return res.json({ success: true, properties });
        }
    } catch (err) {
        console.error('getProperties error:', err);
        return res.status(500).json({ success: false, message: 'Failed to retrieve properties.' });
    }
}

async function getPropertyTree(req, res) {
    try {
        const { id } = req.params;
        
        // Authorization check
        if (req.user.role === 'OWNER') {
            const prop = await query('SELECT * FROM properties WHERE id = ? AND owner_id = ?', [id, req.user.id]);
            if (prop.length === 0) {
                return res.status(404).json({ success: false, message: 'Property not found or unauthorized.' });
            }
        }

        const propertyRows = await query('SELECT * FROM properties WHERE id = ?', [id]);
        if (propertyRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Property not found.' });
        }
        const property = propertyRows[0];

        const buildings = await query('SELECT * FROM buildings WHERE property_id = ?', [id]);

        for (const building of buildings) {
            const floors = await query('SELECT * FROM floors WHERE building_id = ? ORDER BY floor_number ASC', [building.id]);
            for (const floor of floors) {
                const units = await query(`
                    SELECT u.*, t.id as tenant_mapping_id, t.user_id as tenant_user_id, usr.full_name as tenant_name, usr.email as tenant_email, usr.phone as tenant_phone
                    FROM units u
                    LEFT JOIN tenants t ON t.unit_id = u.id AND t.status = 'ACTIVE'
                    LEFT JOIN users usr ON t.user_id = usr.id
                    WHERE u.floor_id = ?
                    ORDER BY u.unit_number ASC
                `, [floor.id]);
                floor.units = units;
            }
            building.floors = floors;
        }

        property.buildings = buildings;
        return res.json({ success: true, property });
    } catch (err) {
        console.error('getPropertyTree error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch property details.' });
    }
}

async function createProperty(req, res) {
    try {
        const {
            name, property_type, house_flat_no, block, street, road, locality,
            city, state, country, pin_code, latitude, longitude, bedrooms, bathrooms,
            area_sqft, parking_available, elevator_available, furnishing_status
        } = req.body;

        if (!name || !city || !state) {
            return res.status(400).json({ success: false, message: 'Property Name, City, and State are required.' });
        }

        const propId = 'p-' + uuidv4().substring(0, 8);

        await query(`
            INSERT INTO properties (
                id, owner_id, name, property_type, house_flat_no, block, street, road, locality,
                city, state, country, pin_code, latitude, longitude, bedrooms, bathrooms,
                area_sqft, parking_available, elevator_available, furnishing_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            propId, req.user.id, name, property_type || 'APARTMENT', house_flat_no || null, block || null,
            street || null, road || null, locality || null, city, state, country || 'India', pin_code || null,
            latitude || null, longitude || null, bedrooms || 1, bathrooms || 1, area_sqft || 500,
            parking_available ? 1 : 0, elevator_available ? 1 : 0, furnishing_status || 'SEMI_FURNISHED'
        ]);

        return res.status(201).json({ success: true, message: 'Property added successfully.', property_id: propId });
    } catch (err) {
        console.error('createProperty error:', err);
        return res.status(500).json({ success: false, message: 'Failed to create property.' });
    }
}

async function updateProperty(req, res) {
    try {
        const { id } = req.params;
        const check = await query('SELECT id FROM properties WHERE id = ? AND owner_id = ?', [id, req.user.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Property not found or unauthorized.' });
        }

        const fields = [];
        const values = [];
        const allowedKeys = [
            'name', 'property_type', 'house_flat_no', 'block', 'street', 'road', 'locality',
            'city', 'state', 'country', 'pin_code', 'latitude', 'longitude', 'bedrooms',
            'bathrooms', 'area_sqft', 'parking_available', 'elevator_available', 'furnishing_status'
        ];

        for (const key of allowedKeys) {
            if (req.body[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(req.body[key]);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
        }

        values.push(id);
        await query(`UPDATE properties SET ${fields.join(', ')} WHERE id = ?`, values);
        return res.json({ success: true, message: 'Property updated successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to update property.' });
    }
}

async function deleteProperty(req, res) {
    try {
        const { id } = req.params;
        const check = await query('SELECT id FROM properties WHERE id = ? AND owner_id = ?', [id, req.user.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Property not found or unauthorized.' });
        }

        await query('DELETE FROM properties WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Property deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete property.' });
    }
}

module.exports = {
    getProperties,
    getPropertyTree,
    createProperty,
    updateProperty,
    deleteProperty
};
