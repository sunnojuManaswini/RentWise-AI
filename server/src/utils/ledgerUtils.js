function calculateObligationStatus(totalDue, totalPaid, dueDateStr) {
    const due = Number(totalDue);
    const paid = Number(totalPaid);
    const today = new Date().toISOString().slice(0, 10);

    if (paid >= due) {
        if (paid > due) return 'ADVANCE';
        return 'PAID';
    } else if (paid > 0) {
        return 'PARTIAL';
    } else {
        if (dueDateStr < today) return 'OVERDUE';
        return 'PENDING';
    }
}

module.exports = { calculateObligationStatus };
