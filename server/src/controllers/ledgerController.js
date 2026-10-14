const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { calculateObligationStatus } = require('../utils/ledgerUtils');

async function getRentLedger(req, res) {
    try {
        let obligations = [];

        if (req.user.role === 'OWNER') {
            obligations = await query(`
                SELECT ro.*, u.unit_number, p.name as property_name, b.name as building_name,
                       usr.full_name as tenant_name, usr.email as tenant_email, usr.phone as tenant_phone
                FROM rent_obligations ro
                JOIN units u ON ro.unit_id = u.id
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                JOIN tenants t ON ro.tenant_id = t.id
                JOIN users usr ON t.user_id = usr.id
                WHERE ro.owner_id = ?
                ORDER BY ro.period_month DESC, ro.created_at DESC
            `, [req.user.id]);
        } else {
            obligations = await query(`
                SELECT ro.*, u.unit_number, p.name as property_name, b.name as building_name,
                       usr.full_name as owner_name, usr.email as owner_email, usr.phone as owner_phone
                FROM rent_obligations ro
                JOIN units u ON ro.unit_id = u.id
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                JOIN tenants t ON ro.tenant_id = t.id
                JOIN users usr ON ro.owner_id = usr.id
                WHERE t.user_id = ?
                ORDER BY ro.period_month DESC, ro.created_at DESC
            `, [req.user.id]);
        }

        // Fetch total_paid per obligation separately — cross-DB safe (no correlated subquery issues)
        const enriched = await Promise.all(obligations.map(async (ob) => {
            try {
                const sumRows = await query(
                    "SELECT SUM(amount_paid) as total_paid FROM rent_payments WHERE obligation_id = ? AND status = 'VERIFIED'",
                    [ob.id]
                );
                const totalPaid = Number(sumRows[0]?.total_paid || 0);
                const totalDue = Number(ob.total_due);
                const remainingBalance = Math.max(0, totalDue - totalPaid);
                const currentStatus = calculateObligationStatus(totalDue, totalPaid, ob.due_date);

                return {
                    ...ob,
                    total_due: totalDue,
                    total_paid: totalPaid,
                    remaining_balance: remainingBalance,
                    status: currentStatus
                };
            } catch {
                return { ...ob, total_paid: 0, remaining_balance: Number(ob.total_due), status: ob.status };
            }
        }));

        return res.json({ success: true, ledger: enriched });
    } catch (err) {
        console.error('getRentLedger error:', err);
        return res.status(500).json({ success: false, message: 'Failed to retrieve rent ledger.' });
    }
}

async function createRentObligation(req, res) {
    try {
        const { unit_id, tenant_id, period_month, due_date, rent_amount, maintenance_charge, notes } = req.body;

        if (!unit_id || !tenant_id || !period_month || !due_date || rent_amount === undefined) {
            return res.status(400).json({ success: false, message: 'Unit, Tenant, Month Period, Due Date, and Rent Amount are required.' });
        }

        const rent = Number(rent_amount);
        const maint = Number(maintenance_charge || 0);
        const totalDue = rent + maint;
        const obId = 'ro-' + uuidv4().substring(0, 8);

        await query(`
            INSERT INTO rent_obligations (
                id, unit_id, tenant_id, owner_id, period_month, due_date,
                rent_amount, maintenance_charge, total_due, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
        `, [
            obId, unit_id, tenant_id, req.user.id, period_month, due_date,
            rent, maint, totalDue, notes || ''
        ]);

        return res.status(201).json({ success: true, message: 'Rent obligation created successfully.', obligation_id: obId });
    } catch (err) {
        console.error('createRentObligation error:', err);
        return res.status(500).json({ success: false, message: 'Failed to create rent obligation.' });
    }
}

async function recordPayment(req, res) {
    try {
        const { obligation_id, amount_paid, payment_date, payment_method, transaction_id, notes } = req.body;
        const receiptFile = req.file;

        if (!obligation_id || !amount_paid) {
            return res.status(400).json({ success: false, message: 'Obligation ID and Payment Amount are required.' });
        }

        // Get obligation details
        const obRows = await query('SELECT * FROM rent_obligations WHERE id = ?', [obligation_id]);
        if (obRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Rent obligation not found.' });
        }
        const obligation = obRows[0];

        // Access check
        if (req.user.role === 'TENANT') {
            const tenantCheck = await query('SELECT id FROM tenants WHERE id = ? AND user_id = ?', [obligation.tenant_id, req.user.id]);
            if (tenantCheck.length === 0) {
                return res.status(403).json({ success: false, message: 'Unauthorized: This obligation does not belong to you.' });
            }
        } else if (req.user.role === 'OWNER' && obligation.owner_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized: Not your property obligation.' });
        }

        const pmtId = 'pmt-' + uuidv4().substring(0, 8);
        const receiptUrl = receiptFile ? `/uploads/receipts/${receiptFile.filename}` : (req.body.receipt_url || null);
        const pmtDate = payment_date || new Date().toISOString().slice(0, 10);
        const amount = Number(amount_paid);

        await query(`
            INSERT INTO rent_payments (
                id, obligation_id, tenant_id, owner_id, amount_paid, payment_date,
                payment_method, transaction_id, status, receipt_url, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?, ?)
        `, [
            pmtId, obligation_id, obligation.tenant_id, obligation.owner_id, amount,
            pmtDate, payment_method || 'UPI', transaction_id || null, receiptUrl, notes || ''
        ]);

        // Recalculate obligation status based on total paid
        const sumRows = await query(
            "SELECT SUM(amount_paid) as total_paid FROM rent_payments WHERE obligation_id = ? AND status = 'VERIFIED'",
            [obligation_id]
        );
        const totalPaid = Number(sumRows[0]?.total_paid || 0);
        const newStatus = calculateObligationStatus(Number(obligation.total_due), totalPaid, obligation.due_date);

        await query('UPDATE rent_obligations SET status = ? WHERE id = ?', [newStatus, obligation_id]);

        // Auto-save receipt as document record for traceability
        if (receiptUrl) {
            const docId = 'doc-' + uuidv4().substring(0, 8);
            try {
                await query(`
                    INSERT INTO documents (id, user_id, property_id, unit_id, tenant_id, title, doc_type, file_url)
                    VALUES (?, ?, NULL, ?, ?, ?, 'RECEIPT', ?)
                `, [docId, req.user.id, obligation.unit_id, obligation.tenant_id, `Payment Receipt — ${obligation.period_month} (₹${amount})`, receiptUrl]);
            } catch (docErr) {
                console.warn('Could not auto-save receipt document:', docErr.message);
            }
        }

        // Send notification to owner if tenant paid
        if (req.user.role === 'TENANT') {
            try {
                const notifId = 'notif-' + uuidv4().substring(0, 8);
                await query(
                    "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'GENERAL')",
                    [notifId, obligation.owner_id, 'Payment Received', `${req.user.full_name} paid ₹${amount.toLocaleString('en-IN')} for ${obligation.period_month}.`]
                );
            } catch {}
        }

        return res.status(201).json({
            success: true,
            message: 'Payment recorded successfully.',
            payment_id: pmtId,
            new_obligation_status: newStatus,
            total_paid: totalPaid,
            remaining_balance: Math.max(0, Number(obligation.total_due) - totalPaid)
        });
    } catch (err) {
        console.error('recordPayment error:', err);
        return res.status(500).json({ success: false, message: 'Failed to record payment.' });
    }
}

async function getObligationPayments(req, res) {
    try {
        const { obligation_id } = req.params;
        const payments = await query('SELECT * FROM rent_payments WHERE obligation_id = ? ORDER BY payment_date DESC', [obligation_id]);
        return res.json({ success: true, payments });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch payment history.' });
    }
}

module.exports = {
    getRentLedger,
    createRentObligation,
    recordPayment,
    getObligationPayments
};
