const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const path = require('path');
const fs = require('fs');

async function getDocuments(req, res) {
    try {
        let documents = [];
        if (req.user.role === 'OWNER') {
            documents = await query(`
                SELECT d.*, u.unit_number, p.name as property_name, usr.full_name as uploaded_by
                FROM documents d
                LEFT JOIN units u ON d.unit_id = u.id
                LEFT JOIN properties p ON d.property_id = p.id
                JOIN users usr ON d.user_id = usr.id
                WHERE d.user_id = ? OR d.unit_id IN (
                    SELECT u2.id FROM units u2 JOIN floors f ON u2.floor_id = f.id JOIN buildings b ON f.building_id = b.id JOIN properties p2 ON b.property_id = p2.id WHERE p2.owner_id = ?
                )
                ORDER BY d.created_at DESC
            `, [req.user.id, req.user.id]);
        } else {
            documents = await query(`
                SELECT d.*, u.unit_number, p.name as property_name, usr.full_name as uploaded_by
                FROM documents d
                LEFT JOIN units u ON d.unit_id = u.id
                LEFT JOIN properties p ON d.property_id = p.id
                JOIN users usr ON d.user_id = usr.id
                WHERE d.user_id = ? OR d.tenant_id IN (
                    SELECT t.id FROM tenants t WHERE t.user_id = ?
                )
                ORDER BY d.created_at DESC
            `, [req.user.id, req.user.id]);
        }

        return res.json({ success: true, documents });
    } catch (err) {
        console.error('getDocuments error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch documents.' });
    }
}

async function uploadDocument(req, res) {
    try {
        const { title, doc_type, property_id, unit_id, tenant_id } = req.body;
        const file = req.file;

        if (!title || !file) {
            return res.status(400).json({ success: false, message: 'Title and File are required.' });
        }

        const docId = 'doc-' + uuidv4().substring(0, 8);
        const folder = req.originalUrl.includes('agreement') ? 'agreements' : (req.originalUrl.includes('receipt') ? 'receipts' : 'documents');
        const fileUrl = `/uploads/${folder}/${file.filename}`;

        await query(`
            INSERT INTO documents (
                id, user_id, property_id, unit_id, tenant_id, title, doc_type,
                file_url, file_size, mime_type, extracted_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            docId, req.user.id, property_id || null, unit_id || null, tenant_id || null,
            title, doc_type || 'OTHER', fileUrl, file.size, file.mimetype, ''
        ]);

        return res.status(201).json({
            success: true,
            message: 'Document uploaded successfully.',
            document_id: docId,
            file_url: fileUrl
        });
    } catch (err) {
        console.error('uploadDocument error:', err);
        return res.status(500).json({ success: false, message: 'Failed to upload document.' });
    }
}

async function deleteDocument(req, res) {
    try {
        const { id } = req.params;
        const docs = await query('SELECT * FROM documents WHERE id = ? AND user_id = ?', [id, req.user.id]);
        if (docs.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found or unauthorized.' });
        }

        await query('DELETE FROM documents WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Document deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete document.' });
    }
}

module.exports = { getDocuments, uploadDocument, deleteDocument };
