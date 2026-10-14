const { query } = require('../config/db');

async function getDashboardAnalytics(req, res) {
    try {
        if (req.user.role === 'OWNER') {
            const propertiesCount = await query('SELECT COUNT(*) as count FROM properties WHERE owner_id = ?', [req.user.id]);
            const buildingsCount = await query('SELECT COUNT(*) as count FROM buildings b JOIN properties p ON b.property_id = p.id WHERE p.owner_id = ?', [req.user.id]);
            const unitsCount = await query('SELECT COUNT(*) as count FROM units u JOIN floors f ON u.floor_id = f.id JOIN buildings b ON f.building_id = b.id JOIN properties p ON b.property_id = p.id WHERE p.owner_id = ?', [req.user.id]);
            const occupiedUnits = await query("SELECT COUNT(*) as count FROM units u JOIN floors f ON u.floor_id = f.id JOIN buildings b ON f.building_id = b.id JOIN properties p ON b.property_id = p.id WHERE p.owner_id = ? AND u.status = 'OCCUPIED'", [req.user.id]);
            const tenantsCount = await query("SELECT COUNT(*) as count FROM tenants WHERE owner_id = ? AND status = 'ACTIVE'", [req.user.id]);
            const rentCollected = await query("SELECT COALESCE(SUM(amount_paid), 0) as total FROM rent_payments WHERE owner_id = ? AND status = 'VERIFIED'", [req.user.id]);

            // Calculate total outstanding across all obligations
            const obligations = await query('SELECT id, total_due, due_date FROM rent_obligations WHERE owner_id = ?', [req.user.id]);
            let outstandingRent = 0;
            for (const ob of obligations) {
                const paid = await query("SELECT COALESCE(SUM(amount_paid), 0) as paid FROM rent_payments WHERE obligation_id = ? AND status = 'VERIFIED'", [ob.id]);
                outstandingRent += Math.max(0, Number(ob.total_due) - Number(paid[0].paid));
            }

            const pendingMaintenance = await query("SELECT COUNT(*) as count FROM maintenance_requests WHERE owner_id = ? AND status IN ('REPORTED', 'IN_PROGRESS')", [req.user.id]);

            const upcomingExpirations = await query(`
                SELECT ag.*, u.unit_number, usr.full_name as tenant_name
                FROM rental_agreements ag
                JOIN units u ON ag.unit_id = u.id
                JOIN tenants t ON ag.tenant_id = t.id
                JOIN users usr ON t.user_id = usr.id
                WHERE ag.owner_id = ? AND ag.agreement_status = 'ACTIVE'
                ORDER BY ag.end_date ASC LIMIT 5
            `, [req.user.id]);

            const recentPayments = await query(`
                SELECT rp.*, usr.full_name as tenant_name, u.unit_number
                FROM rent_payments rp
                JOIN tenants t ON rp.tenant_id = t.id
                JOIN users usr ON t.user_id = usr.id
                JOIN units u ON t.unit_id = u.id
                WHERE rp.owner_id = ?
                ORDER BY rp.payment_date DESC LIMIT 5
            `, [req.user.id]);

            return res.json({
                success: true,
                analytics: {
                    total_properties: Number(propertiesCount[0].count),
                    total_buildings: Number(buildingsCount[0].count),
                    total_units: Number(unitsCount[0].count),
                    occupied_units: Number(occupiedUnits[0].count),
                    vacant_units: Number(unitsCount[0].count) - Number(occupiedUnits[0].count),
                    total_tenants: Number(tenantsCount[0].count),
                    rent_collected: Number(rentCollected[0].total),
                    outstanding_rent: outstandingRent,
                    pending_maintenance: Number(pendingMaintenance[0].count),
                    upcoming_expirations: upcomingExpirations,
                    recent_payments: recentPayments
                }
            });
        } else {
            // Tenant Analytics
            const tenantRows = await query(`
                SELECT t.id, t.unit_id, t.owner_id, u.unit_number, u.monthly_rent,
                       u.security_deposit, u.rent_due_day, p.name as property_name
                FROM tenants t
                JOIN units u ON t.unit_id = u.id
                JOIN floors f ON u.floor_id = f.id
                JOIN buildings b ON f.building_id = b.id
                JOIN properties p ON b.property_id = p.id
                WHERE t.user_id = ? AND t.status = 'ACTIVE'
            `, [req.user.id]);

            if (tenantRows.length === 0) {
                return res.json({ success: true, analytics: { has_assigned_unit: false } });
            }

            const tInfo = tenantRows[0];

            const obligations = await query('SELECT * FROM rent_obligations WHERE tenant_id = ? ORDER BY period_month DESC', [tInfo.id]);
            let totalPaid = 0;
            let outstanding = 0;
            let nextDueDate = null;

            for (const ob of obligations) {
                const paidRes = await query("SELECT COALESCE(SUM(amount_paid), 0) as paid FROM rent_payments WHERE obligation_id = ? AND status = 'VERIFIED'", [ob.id]);
                const p = Number(paidRes[0].paid);
                totalPaid += p;
                const rem = Math.max(0, Number(ob.total_due) - p);
                outstanding += rem;

                if (rem > 0 && !nextDueDate) {
                    nextDueDate = ob.due_date;
                }
            }

            const agreement = await query("SELECT * FROM rental_agreements WHERE tenant_id = ? AND agreement_status = 'ACTIVE'", [tInfo.id]);
            const maintenance = await query('SELECT * FROM maintenance_requests WHERE tenant_id = ? ORDER BY reported_date DESC LIMIT 5', [tInfo.id]);
            const recentPayments = await query(`
                SELECT rp.*, ro.period_month
                FROM rent_payments rp
                JOIN rent_obligations ro ON rp.obligation_id = ro.id
                WHERE rp.tenant_id = ?
                ORDER BY rp.payment_date DESC LIMIT 5
            `, [tInfo.id]);

            // Calculate next due date from rent_due_day if no overdue obligation
            if (!nextDueDate) {
                const today = new Date();
                const dueDayStr = String(tInfo.rent_due_day || 5).padStart(2, '0');
                nextDueDate = `${today.toISOString().slice(0, 7)}-${dueDayStr}`;
            }

            return res.json({
                success: true,
                analytics: {
                    has_assigned_unit: true,
                    property_name: tInfo.property_name,
                    unit_number: tInfo.unit_number,
                    monthly_rent: Number(tInfo.monthly_rent),
                    security_deposit: Number(tInfo.security_deposit),
                    total_paid: totalPaid,
                    outstanding_amount: outstanding,
                    next_due_date: nextDueDate,
                    agreement: agreement.length > 0 ? agreement[0] : null,
                    maintenance_summary: {
                        total: maintenance.length,
                        open: maintenance.filter(m => m.status === 'REPORTED' || m.status === 'IN_PROGRESS').length
                    },
                    recent_payments: recentPayments
                }
            });
        }
    } catch (err) {
        console.error('getDashboardAnalytics error:', err);
        return res.status(500).json({ success: false, message: 'Failed to generate analytics.' });
    }
}

module.exports = { getDashboardAnalytics };
