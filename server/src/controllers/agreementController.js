const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { parseRentalAgreementText } = require('../services/documentParser');

async function getAgreements(req, res) {
    try {
        if (req.user.role === 'OWNER') {
            const agreements = await query(`
                SELECT ag.*, u.unit_number, p.name as property_name, b.name as building_name,
                       usr.full_name as tenant_name, usr.email as tenant_email, usr.phone as tenant_phone
                FROM rental_agreements ag
                JOIN units u ON ag.unit_id = u.id
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                JOIN tenants t ON ag.tenant_id = t.id
                JOIN users usr ON t.user_id = usr.id
                WHERE ag.owner_id = ?
                ORDER BY ag.end_date ASC
            `, [req.user.id]);
            return res.json({ success: true, agreements });
        } else {
            const agreements = await query(`
                SELECT ag.*, u.unit_number, p.name as property_name, b.name as building_name,
                       usr.full_name as owner_name, usr.email as owner_email, usr.phone as owner_phone
                FROM rental_agreements ag
                JOIN units u ON ag.unit_id = u.id
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                JOIN tenants t ON ag.tenant_id = t.id
                JOIN users usr ON ag.owner_id = usr.id
                WHERE t.user_id = ?
                ORDER BY ag.end_date ASC
            `, [req.user.id]);
            return res.json({ success: true, agreements });
        }
    } catch (err) {
        console.error('getAgreements error:', err);
        return res.status(500).json({ success: false, message: 'Failed to retrieve agreements.' });
    }
}

async function uploadAgreement(req, res) {
    try {
        const { unit_id, tenant_id, start_date, end_date, monthly_rent, security_deposit, notice_period_days, agreement_text } = req.body;
        const file = req.file;

        if (!unit_id || !tenant_id) {
            return res.status(400).json({ success: false, message: 'Unit ID and Tenant ID are required.' });
        }

        const docUrl = file ? `/uploads/agreements/${file.filename}` : (req.body.document_url || null);
        const parsed = parseRentalAgreementText(agreement_text || '');

        const rent = monthly_rent ? Number(monthly_rent) : (parsed.monthly_rent || 15000);
        const deposit = security_deposit ? Number(security_deposit) : (parsed.security_deposit || 30000);
        const notice = notice_period_days ? Number(notice_period_days) : (parsed.notice_period_days || 30);

        const agId = 'ag-' + uuidv4().substring(0, 8);
        const extractedTerms = {
            ...parsed,
            monthly_rent: rent,
            security_deposit: deposit,
            notice_period_days: notice,
            document_uploaded_at: new Date().toISOString()
        };

        await query(`
            INSERT INTO rental_agreements (
                id, unit_id, tenant_id, owner_id, start_date, end_date, monthly_rent,
                security_deposit, notice_period_days, agreement_status, document_url, extracted_terms_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
        `, [
            agId, unit_id, tenant_id, req.user.id,
            start_date || new Date().toISOString().slice(0, 10),
            end_date || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
            rent, deposit, notice, docUrl, JSON.stringify(extractedTerms)
        ]);

        return res.status(201).json({
            success: true,
            message: 'Rental agreement uploaded and terms extracted successfully.',
            agreement_id: agId,
            extracted_terms: extractedTerms
        });
    } catch (err) {
        console.error('uploadAgreement error:', err);
        return res.status(500).json({ success: false, message: 'Failed to upload agreement.' });
    }
}

module.exports = { getAgreements, uploadAgreement };
