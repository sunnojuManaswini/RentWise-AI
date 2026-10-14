const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');

async function getDepositSettlements(req, res) {
    try {
        let settlements = [];
        if (req.user.role === 'OWNER') {
            settlements = await query(`
                SELECT dt.*, u.unit_number, p.name as property_name, b.name as building_name,
                       usr.full_name as tenant_name, usr.email as tenant_email, usr.phone as tenant_phone
                FROM deposit_transactions dt
                JOIN units u ON dt.unit_id = u.id
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                JOIN tenants t ON dt.tenant_id = t.id
                JOIN users usr ON t.user_id = usr.id
                WHERE dt.owner_id = ?
                ORDER BY dt.created_at DESC
            `, [req.user.id]);
        } else {
            settlements = await query(`
                SELECT dt.*, u.unit_number, p.name as property_name, b.name as building_name,
                       usr.full_name as owner_name, usr.email as owner_email, usr.phone as owner_phone
                FROM deposit_transactions dt
                JOIN units u ON dt.unit_id = u.id
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                JOIN tenants t ON dt.tenant_id = t.id
                JOIN users usr ON dt.owner_id = usr.id
                WHERE t.user_id = ?
                ORDER BY dt.created_at DESC
            `, [req.user.id]);
        }

        return res.json({ success: true, settlements });
    } catch (err) {
        console.error('getDepositSettlements error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch security deposit records.' });
    }
}

async function createOrUpdateSettlement(req, res) {
    try {
        const {
            unit_id, tenant_id, original_deposit, wall_repair_deduction,
            outstanding_rent_deduction, other_deductions, deduction_reasons, settlement_status
        } = req.body;

        if (!unit_id || !tenant_id || original_deposit === undefined) {
            return res.status(400).json({ success: false, message: 'Unit, Tenant, and Original Deposit amount are required.' });
        }

        const origDep = Number(original_deposit);
        const wallDeduct = Number(wall_repair_deduction || 0);
        const rentDeduct = Number(outstanding_rent_deduction || 0);
        const otherDeduct = Number(other_deductions || 0);

        const totalDeductions = wallDeduct + rentDeduct + otherDeduct;
        const finalRefund = Math.max(0, origDep - totalDeductions);
        const status = settlement_status || 'PENDING';
        const settlementDate = status === 'SETTLED' ? new Date().toISOString().slice(0, 10) : null;

        // Check if settlement record already exists
        const existing = await query('SELECT id FROM deposit_transactions WHERE unit_id = ? AND tenant_id = ?', [unit_id, tenant_id]);

        if (existing.length > 0) {
            const id = existing[0].id;
            // Build update conditionally to avoid MySQL-only COALESCE(?, field) syntax
            const updateParams = [origDep, wallDeduct, rentDeduct, otherDeduct, deduction_reasons || '', finalRefund, status];
            let updateSql = `UPDATE deposit_transactions SET
                    original_deposit = ?, wall_repair_deduction = ?, outstanding_rent_deduction = ?,
                    other_deductions = ?, deduction_reasons = ?, final_refund_amount = ?,
                    settlement_status = ?`;
            if (settlementDate) {
                updateSql += ', settlement_date = ?';
                updateParams.push(settlementDate);
            }
            updateSql += ' WHERE id = ?';
            updateParams.push(id);
            await query(updateSql, updateParams);

            return res.json({
                success: true,
                message: 'Move-out settlement updated.',
                settlement_id: id,
                total_deductions: totalDeductions,
                final_refund_amount: finalRefund
            });
        } else {
            const depId = 'dep-' + uuidv4().substring(0, 8);
            await query(`
                INSERT INTO deposit_transactions (
                    id, unit_id, tenant_id, owner_id, original_deposit, wall_repair_deduction,
                    outstanding_rent_deduction, other_deductions, deduction_reasons,
                    final_refund_amount, settlement_status, settlement_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                depId, unit_id, tenant_id, req.user.id, origDep, wallDeduct,
                rentDeduct, otherDeduct, deduction_reasons || '', finalRefund, status, settlementDate
            ]);

            return res.status(201).json({
                success: true,
                message: 'Move-out settlement created.',
                settlement_id: depId,
                total_deductions: totalDeductions,
                final_refund_amount: finalRefund
            });
        }
    } catch (err) {
        console.error('createOrUpdateSettlement error:', err);
        return res.status(500).json({ success: false, message: 'Failed to process security deposit settlement.' });
    }
}

module.exports = { getDepositSettlements, createOrUpdateSettlement };
