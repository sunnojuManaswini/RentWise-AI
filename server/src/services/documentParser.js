// AI and Smart Parser for Rental Agreements and Documents

function parseRentalAgreementText(text) {
    const extracted = {
        monthly_rent: null,
        security_deposit: null,
        notice_period_days: 30,
        lock_in_months: null,
        late_fee_percentage: null,
        utility_responsibility: 'Tenant pays electricity and water unless specified',
        maintenance_rules: 'Minor repairs under ₹1,000 borne by Tenant. Major structural repairs borne by Owner.',
        pet_policy: 'Subject to written owner consent',
        key_clauses: []
    };

    if (!text) return extracted;

    const rentMatch = text.match(/(?:rent|monthly rent|amount|₹|rs\.?)\s*:?\s*(\d{4,6})/i);
    if (rentMatch) extracted.monthly_rent = parseInt(rentMatch[1], 10);

    const depositMatch = text.match(/(?:deposit|security deposit|advance)\s*:?\s*(\d{4,6})/i);
    if (depositMatch) extracted.security_deposit = parseInt(depositMatch[1], 10);

    const noticeMatch = text.match(/(\d{1,2})\s*(?:day|days|month|months)\s*(?:notice|notice period)/i);
    if (noticeMatch) {
        let val = parseInt(noticeMatch[1], 10);
        if (text.toLowerCase().includes('month') && val < 6) val = val * 30;
        extracted.notice_period_days = val;
    }

    if (text.toLowerCase().includes('pet')) {
        if (text.toLowerCase().includes('no pets') || text.toLowerCase().includes('pets not allowed')) {
            extracted.pet_policy = 'Strictly No Pets Allowed';
        } else {
            extracted.pet_policy = 'Pets Allowed';
        }
    }

    extracted.key_clauses.push('Standard 11-month agreement format');
    extracted.key_clauses.push(`Notice period: ${extracted.notice_period_days} days`);

    return extracted;
}

module.exports = {
    parseRentalAgreementText
};
