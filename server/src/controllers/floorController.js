const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');

async function createFloor(req, res) {
    try {
        const { building_id, floor_number, name } = req.body;
        if (!building_id || name === undefined) {
            return res.status(400).json({ success: false, message: 'Building ID and Floor Name are required.' });
        }

        const floorId = 'f-' + uuidv4().substring(0, 8);
        await query('INSERT INTO floors (id, building_id, floor_number, name) VALUES (?, ?, ?, ?)', [
            floorId, building_id, floor_number !== undefined ? Number(floor_number) : 0, name
        ]);

        return res.status(201).json({ success: true, message: 'Floor added successfully.', floor_id: floorId });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to create floor.' });
    }
}

async function deleteFloor(req, res) {
    try {
        const { id } = req.params;
        await query('DELETE FROM floors WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Floor deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete floor.' });
    }
}

module.exports = { createFloor, deleteFloor };
