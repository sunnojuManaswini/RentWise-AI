const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');

async function createBuilding(req, res) {
    try {
        const { property_id, name, description } = req.body;
        if (!property_id || !name) {
            return res.status(400).json({ success: false, message: 'Property ID and Building Name are required.' });
        }

        const propCheck = await query('SELECT id FROM properties WHERE id = ? AND owner_id = ?', [property_id, req.user.id]);
        if (propCheck.length === 0) {
            return res.status(403).json({ success: false, message: 'Unauthorized or invalid property.' });
        }

        const buildingId = 'b-' + uuidv4().substring(0, 8);
        await query('INSERT INTO buildings (id, property_id, name, description) VALUES (?, ?, ?, ?)', [buildingId, property_id, name, description || '']);

        return res.status(201).json({ success: true, message: 'Building created successfully.', building_id: buildingId });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to create building.' });
    }
}

async function updateBuilding(req, res) {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const fields = [];
        const values = [];
        if (name !== undefined) { fields.push('name = ?'); values.push(name); }
        if (description !== undefined) { fields.push('description = ?'); values.push(description); }
        if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update.' });
        values.push(id);
        await query(`UPDATE buildings SET ${fields.join(', ')} WHERE id = ?`, values);
        return res.json({ success: true, message: 'Building updated successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to update building.' });
    }
}

async function deleteBuilding(req, res) {
    try {
        const { id } = req.params;
        await query('DELETE FROM buildings WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Building deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete building.' });
    }
}

module.exports = { createBuilding, updateBuilding, deleteBuilding };
