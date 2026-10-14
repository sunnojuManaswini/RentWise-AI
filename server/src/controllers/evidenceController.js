const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');

async function getEvidence(req, res) {
    try {
        const { maintenance_id, payment_id } = req.query;
        let sql = 'SELECT e.*, usr.full_name as uploaded_by FROM evidence e JOIN users usr ON e.user_id = usr.id WHERE 1=1';
        const params = [];

        if (maintenance_id) {
            sql += ' AND e.maintenance_id = ?';
            params.push(maintenance_id);
        }
        if (payment_id) {
            sql += ' AND e.payment_id = ?';
            params.push(payment_id);
        }

        sql += ' ORDER BY e.created_at DESC';
        const items = await query(sql, params);
        return res.json({ success: true, evidence: items });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to retrieve evidence items.' });
    }
}

async function uploadEvidence(req, res) {
    try {
        const { maintenance_id, payment_id, title, description } = req.body;
        const file = req.file;

        if (!title || !file) {
            return res.status(400).json({ success: false, message: 'Title and File evidence are required.' });
        }

        const evId = 'ev-' + uuidv4().substring(0, 8);
        const fileUrl = `/uploads/evidence/${file.filename}`;
        const fileType = file.mimetype.startsWith('image/') ? 'IMAGE' : 'DOCUMENT';

        await query(`
            INSERT INTO evidence (id, maintenance_id, payment_id, user_id, title, description, file_url, file_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            evId, maintenance_id || null, payment_id || null, req.user.id,
            title, description || '', fileUrl, fileType
        ]);

        return res.status(201).json({
            success: true,
            message: 'Evidence added to Evidence Locker successfully.',
            evidence_id: evId,
            file_url: fileUrl
        });
    } catch (err) {
        console.error('uploadEvidence error:', err);
        return res.status(500).json({ success: false, message: 'Failed to upload evidence.' });
    }
}

module.exports = { getEvidence, uploadEvidence };
