const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');

async function getTenants(req, res) {
    try {
        if (req.user.role === 'OWNER') {
            const tenants = await query(`
                SELECT t.*, u.unit_number, u.monthly_rent, u.security_deposit,
                       p.name as property_name, b.name as building_name,
                       usr.full_name as tenant_name, usr.email as tenant_email, usr.phone as tenant_phone,
                       ag.start_date as agreement_start, ag.end_date as agreement_end, ag.notice_period_days
                FROM tenants t
                JOIN units u ON t.unit_id = u.id
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                JOIN users usr ON t.user_id = usr.id
                LEFT JOIN rental_agreements ag ON ag.tenant_id = t.id AND ag.agreement_status = 'ACTIVE'
                WHERE t.owner_id = ?
                ORDER BY t.created_at DESC
            `, [req.user.id]);
            return res.json({ success: true, tenants });
        } else {
            const tenants = await query(`
                SELECT t.*, u.unit_number, u.monthly_rent, u.security_deposit,
                       p.name as property_name, b.name as building_name,
                       usr.full_name as owner_name, usr.email as owner_email, usr.phone as owner_phone
                FROM tenants t
                JOIN units u ON t.unit_id = u.id
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                JOIN users usr ON t.owner_id = usr.id
                WHERE t.user_id = ? AND t.status = 'ACTIVE'
            `, [req.user.id]);
            return res.json({ success: true, tenants });
        }
    } catch (err) {
        console.error('getTenants error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch tenants.' });
    }
}

async function assignTenant(req, res) {
    try {
        const { user_id, unit_id, move_in_date, start_date, end_date, monthly_rent, security_deposit, notice_period_days } = req.body;

        if (!user_id || !unit_id) {
            return res.status(400).json({ success: false, message: 'Tenant User ID and Unit ID are required.' });
        }

        // Check unit
        const unitRows = await query(`
            SELECT u.*, p.owner_id 
            FROM units u 
            JOIN floors f ON u.floor_id = f.id 
            JOIN buildings b ON f.building_id = b.id 
            JOIN properties p ON b.property_id = p.id 
            WHERE u.id = ?
        `, [unit_id]);

        if (unitRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Unit not found.' });
        }

        const unit = unitRows[0];
        if (unit.owner_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized property owner.' });
        }

        const tenantMappingId = 't-' + uuidv4().substring(0, 8);
        const moveIn = move_in_date || new Date().toISOString().slice(0, 10);

        // Deactivate previous active tenants for this unit
        await query("UPDATE tenants SET status = 'MOVED_OUT' WHERE unit_id = ? AND status = 'ACTIVE'", [unit_id]);

        // Insert Tenant assignment
        await query(`
            INSERT INTO tenants (id, user_id, unit_id, owner_id, status, move_in_date)
            VALUES (?, ?, ?, ?, 'ACTIVE', ?)
        `, [tenantMappingId, user_id, unit_id, req.user.id, moveIn]);

        // Update unit status to OCCUPIED
        await query("UPDATE units SET status = 'OCCUPIED' WHERE id = ?", [unit_id]);

        // Create initial Rental Agreement
        const agId = 'ag-' + uuidv4().substring(0, 8);
        const agStart = start_date || moveIn;
        const agEnd = end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const rent = monthly_rent !== undefined ? Number(monthly_rent) : Number(unit.monthly_rent);
        const deposit = security_deposit !== undefined ? Number(security_deposit) : Number(unit.security_deposit);
        const notice = notice_period_days !== undefined ? Number(notice_period_days) : 30;

        await query(`
            INSERT INTO rental_agreements (
                id, unit_id, tenant_id, owner_id, start_date, end_date, monthly_rent,
                security_deposit, notice_period_days, agreement_status, extracted_terms_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
        `, [
            agId, unit_id, tenantMappingId, req.user.id, agStart, agEnd, rent, deposit, notice,
            JSON.stringify({
                monthly_rent: rent,
                security_deposit: deposit,
                notice_period_days: notice,
                created_by: req.user.full_name
            })
        ]);

        // Create initial rent obligation for current month
        const today = new Date();
        const currentPeriod = today.toISOString().slice(0, 7); // YYYY-MM
        const dueDateStr = `${currentPeriod}-${String(unit.rent_due_day || 5).padStart(2, '0')}`;

        const obId = 'ro-' + uuidv4().substring(0, 8);
        const totalDue = rent + Number(unit.maintenance_charge || 0);

        await query(`
            INSERT INTO rent_obligations (
                id, unit_id, tenant_id, owner_id, period_month, due_date,
                rent_amount, maintenance_charge, total_due, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'Initial Monthly Rent Obligation')
        `, [
            obId, unit_id, tenantMappingId, req.user.id, currentPeriod, dueDateStr,
            rent, unit.maintenance_charge || 0, totalDue
        ]);

        return res.status(201).json({
            success: true,
            message: 'Tenant assigned successfully and agreement created.',
            tenant_id: tenantMappingId
        });
    } catch (err) {
        console.error('assignTenant error:', err);
        return res.status(500).json({ success: false, message: 'Failed to assign tenant.' });
    }
}

async function moveOutTenant(req, res) {
    try {
        const { tenant_id } = req.body;
        if (!tenant_id) {
            return res.status(400).json({ success: false, message: 'Tenant mapping ID required.' });
        }

        const tenants = await query('SELECT * FROM tenants WHERE id = ?', [tenant_id]);
        if (tenants.length === 0) {
            return res.status(404).json({ success: false, message: 'Tenant mapping not found.' });
        }

        const tenant = tenants[0];
        const moveOutDate = new Date().toISOString().slice(0, 10);

        await query("UPDATE tenants SET status = 'MOVED_OUT', move_out_date = ? WHERE id = ?", [moveOutDate, tenant_id]);
        await query("UPDATE units SET status = 'VACANT' WHERE id = ?", [tenant.unit_id]);
        await query("UPDATE rental_agreements SET agreement_status = 'TERMINATED' WHERE tenant_id = ?", [tenant_id]);

        return res.json({ success: true, message: 'Tenant moved out successfully. Unit is now vacant.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to complete tenant move out.' });
    }
}

module.exports = { getTenants, assignTenant, moveOutTenant };
