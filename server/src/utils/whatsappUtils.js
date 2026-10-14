function formatWhatsAppMessage(type, data) {
    let text = '';

    switch (type) {
        case 'PAYMENT_CONFIRMATION':
            text = `🏠 *RentWise – Payment Receipt Confirmation*\n\n` +
                   `Dear *${data.tenant_name || 'Tenant'}*,\n` +
                   `We have received your payment for *${data.property_name || 'Property'} (${data.unit_number || 'Unit'})*.\n\n` +
                   `💵 *Amount Paid:* ₹${Number(data.amount_paid || 0).toLocaleString('en-IN')}\n` +
                   `📅 *Payment Date:* ${data.payment_date || 'N/A'}\n` +
                   `💳 *Payment Method:* ${data.payment_method || 'UPI'}\n` +
                   `🏷️ *Transaction ID:* ${data.transaction_id || 'N/A'}\n` +
                   `📊 *Status:* ${data.status || 'VERIFIED'}\n\n` +
                   `Thank you for using RentWise!`;
            break;

        case 'PENDING_REMINDER':
            text = `🏠 *RentWise – Rent Due Reminder*\n\n` +
                   `Dear *${data.tenant_name || 'Tenant'}*,\n` +
                   `This is a friendly reminder for rent obligation of *${data.property_name || 'Property'} (${data.unit_number || 'Unit'})*.\n\n` +
                   `🗓️ *Period:* ${data.period_month || 'Current Month'}\n` +
                   `💰 *Total Due:* ₹${Number(data.total_due || 0).toLocaleString('en-IN')}\n` +
                   `💵 *Paid Amount:* ₹${Number(data.total_paid || 0).toLocaleString('en-IN')}\n` +
                   `⚠️ *Remaining Balance:* ₹${Number(data.remaining_balance || 0).toLocaleString('en-IN')}\n` +
                   `⏰ *Due Date:* ${data.due_date || 'Immediate'}\n\n` +
                   `Please clear the balance to avoid late charges. Thank you!`;
            break;

        case 'MONTHLY_SUMMARY':
            text = `🏠 *RentWise – Monthly Rent Summary*\n\n` +
                   `*Property:* ${data.property_name || 'RentWise Residence'}\n` +
                   `*Unit:* ${data.unit_number || 'N/A'}\n` +
                   `*Tenant:* ${data.tenant_name || 'Tenant'}\n\n` +
                   `*Rent Amount:* ₹${Number(data.rent_amount || 0).toLocaleString('en-IN')}\n` +
                   `*Maintenance:* ₹${Number(data.maintenance_charge || 0).toLocaleString('en-IN')}\n` +
                   `*Total Paid:* ₹${Number(data.total_paid || 0).toLocaleString('en-IN')}\n` +
                   `*Balance:* ₹${Number(data.remaining_balance || 0).toLocaleString('en-IN')}\n` +
                   `*Status:* ${data.status || 'PENDING'}\n` +
                   `*Due Date:* ${data.due_date || 'N/A'}\n\n` +
                   `Generated via RentWise AI Rental Assistant.`;
            break;

        case 'MAINTENANCE_UPDATE':
            text = `🏠 *RentWise – Maintenance Ticket Update*\n\n` +
                   `*Property:* ${data.property_name || 'Property'}\n` +
                   `*Unit:* ${data.unit_number || 'N/A'}\n` +
                   `*Issue:* ${data.title || 'Maintenance Request'}\n\n` +
                   `🔄 *Current Status:* ${data.status || 'REPORTED'}\n` +
                   `📅 *Reported Date:* ${data.reported_date || 'N/A'}\n` +
                   `⚡ *Priority:* ${data.priority || 'MEDIUM'}\n\n` +
                   `Thank you for your patience while our team works on this.`;
            break;

        case 'DEPOSIT_SETTLEMENT':
            text = `🏠 *RentWise – Security Deposit Move-out Settlement*\n\n` +
                   `*Property:* ${data.property_name || 'Property'}\n` +
                   `*Tenant:* ${data.tenant_name || 'Tenant'}\n\n` +
                   `💰 *Original Deposit:* ₹${Number(data.original_deposit || 0).toLocaleString('en-IN')}\n` +
                   `🛠️ *Wall Repair Deductions:* ₹${Number(data.wall_repair_deduction || 0).toLocaleString('en-IN')}\n` +
                   `📋 *Outstanding Rent Deductions:* ₹${Number(data.outstanding_rent_deduction || 0).toLocaleString('en-IN')}\n` +
                   `🧹 *Other Deductions:* ₹${Number(data.other_deductions || 0).toLocaleString('en-IN')}\n` +
                   `💵 *Final Refundable Amount:* ₹${Number(data.final_refund_amount || 0).toLocaleString('en-IN')}\n\n` +
                   `*Deduction Reason:* ${data.deduction_reasons || 'N/A'}\n\n` +
                   `Status: ${data.settlement_status || 'PENDING'}`;
            break;

        default:
            text = `🏠 RentWise Assistant Update for ${data.property_name || 'Property'}`;
    }

    const encoded = encodeURIComponent(text);
    const phoneClean = data.phone ? data.phone.replace(/[^0-9]/g, '') : '';
    const whatsappUrl = phoneClean ? `https://wa.me/${phoneClean}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

    return { text, whatsappUrl };
}

module.exports = { formatWhatsAppMessage };
