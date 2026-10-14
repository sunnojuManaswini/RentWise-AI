const { GoogleGenerativeAI } = require('@google/generative-ai');
const { query } = require('../config/db');

// RAG Retrieval Engine with Strict RBAC Isolation
async function retrieveUserContext(user) {
    const context = {
        user: {
            name: user.full_name,
            email: user.email,
            role: user.role
        },
        properties: [],
        units: [],
        tenants: [],
        agreements: [],
        obligations: [],
        payments: [],
        maintenance: [],
        deposits: [],
        documents: []
    };

    if (user.role === 'OWNER') {
        // Owner Data Retrieval
        context.properties = await query('SELECT id, name, property_type, city, state, bedrooms, bathrooms, area_sqft FROM properties WHERE owner_id = ?', [user.id]);
        context.units = await query(`
            SELECT u.id, u.unit_number, u.monthly_rent, u.maintenance_charge, u.security_deposit, u.rent_due_day, u.status, p.name as property_name
            FROM units u JOIN floors f ON u.floor_id = f.id JOIN buildings b ON f.building_id = b.id JOIN properties p ON b.property_id = p.id
            WHERE p.owner_id = ?
        `, [user.id]);
        context.tenants = await query(`
            SELECT t.id, t.status, t.move_in_date, usr.full_name as tenant_name, usr.phone as tenant_phone, u.unit_number
            FROM tenants t JOIN users usr ON t.user_id = usr.id JOIN units u ON t.unit_id = u.id
            WHERE t.owner_id = ?
        `, [user.id]);
        context.agreements = await query('SELECT start_date, end_date, monthly_rent, security_deposit, notice_period_days, agreement_status, extracted_terms_json FROM rental_agreements WHERE owner_id = ?', [user.id]);
        context.obligations = await query(`
            SELECT ro.period_month, ro.due_date, ro.rent_amount, ro.total_due, ro.status, u.unit_number, usr.full_name as tenant_name
            FROM rent_obligations ro JOIN units u ON ro.unit_id = u.id JOIN tenants t ON ro.tenant_id = t.id JOIN users usr ON t.user_id = usr.id
            WHERE ro.owner_id = ? ORDER BY ro.period_month DESC LIMIT 20
        `, [user.id]);
        context.payments = await query(`
            SELECT rp.amount_paid, rp.payment_date, rp.payment_method, rp.transaction_id, rp.status, rp.receipt_url, ro.period_month
            FROM rent_payments rp JOIN rent_obligations ro ON rp.obligation_id = ro.id WHERE rp.owner_id = ? ORDER BY rp.payment_date DESC LIMIT 20
        `, [user.id]);
        context.maintenance = await query(`
            SELECT m.title, m.description, m.category, m.priority, m.status, m.reported_date, u.unit_number, usr.full_name as tenant_name
            FROM maintenance_requests m JOIN units u ON m.unit_id = u.id JOIN tenants t ON m.tenant_id = t.id JOIN users usr ON t.user_id = usr.id
            WHERE m.owner_id = ? ORDER BY m.reported_date DESC LIMIT 15
        `, [user.id]);
        context.deposits = await query('SELECT * FROM deposit_transactions WHERE owner_id = ?', [user.id]);
    } else {
        // Tenant Data Retrieval (Strictly scoped to user's assigned rental)
        const tenantRows = await query('SELECT id, unit_id, owner_id, move_in_date FROM tenants WHERE user_id = ? AND status = \'ACTIVE\'', [user.id]);
        if (tenantRows.length > 0) {
            const tenantInfo = tenantRows[0];
            context.units = await query(`
                SELECT u.unit_number, u.monthly_rent, u.maintenance_charge, u.security_deposit, u.rent_due_day, p.name as property_name, p.city, p.state, usr.full_name as owner_name, usr.phone as owner_phone
                FROM units u JOIN floors f ON u.floor_id = f.id JOIN buildings b ON f.building_id = b.id JOIN properties p ON b.property_id = p.id JOIN users usr ON p.owner_id = usr.id
                WHERE u.id = ?
            `, [tenantInfo.unit_id]);
            context.agreements = await query('SELECT start_date, end_date, monthly_rent, security_deposit, notice_period_days, agreement_status, extracted_terms_json FROM rental_agreements WHERE tenant_id = ?', [tenantInfo.id]);
            context.obligations = await query('SELECT period_month, due_date, rent_amount, total_due, status FROM rent_obligations WHERE tenant_id = ? ORDER BY period_month DESC', [tenantInfo.id]);
            context.payments = await query('SELECT rp.amount_paid, rp.payment_date, rp.payment_method, rp.transaction_id, rp.status, rp.receipt_url, ro.period_month FROM rent_payments rp JOIN rent_obligations ro ON rp.obligation_id = ro.id WHERE rp.tenant_id = ? ORDER BY rp.payment_date DESC', [tenantInfo.id]);
            context.maintenance = await query('SELECT title, description, category, priority, status, reported_date, resolution_date FROM maintenance_requests WHERE tenant_id = ? ORDER BY reported_date DESC', [tenantInfo.id]);
            context.deposits = await query('SELECT * FROM deposit_transactions WHERE tenant_id = ?', [tenantInfo.id]);
        }
    }

    return context;
}

// Generates response using Gemini API or Smart Intelligent Fallback Engine
async function generateAiAssistantResponse(prompt, language = 'en', user) {
    const context = await retrieveUserContext(user);
    const apiKey = process.env.GEMINI_API_KEY;

    const systemInstruction = `You are RentWise AI Rental & Tenant Assistant.
You MUST ONLY answer questions using the provided authorized database records and agreement terms.
Role of user: ${user.role} (${user.full_name}).
Selected response language code: ${language} (en=English, te=Telugu, hi=Hindi).

RETIREVED AUTHORIZED RENTAL CONTEXT:
${JSON.stringify(context, null, 2)}

Strict Guidelines:
1. Always keep responses polite, precise, and structured.
2. If asked about rent due, payments, agreement expiry, maintenance, or deposits, quote exact numbers/dates from retrieved context.
3. If language is 'te' (Telugu), answer in natural Telugu script. If 'hi' (Hindi), answer in Devanagari Hindi script.
4. Include legal disclaimer when discussing lease terms: "Note: Provided information is based on stored agreements and is not legal advice."`;

    if (apiKey && apiKey.trim().length > 10) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const result = await model.generateContent(`${systemInstruction}\n\nUser Question: ${prompt}`);
            const responseText = result.response.text();
            return { text: responseText, context_used: context };
        } catch (err) {
            console.warn('Gemini API call failed, using intelligent context fallback:', err.message);
        }
    }

    // Smart Local Rule & Context Fallback AI Engine
    const textLower = prompt.toLowerCase();
    let reply = '';

    const langObj = {
        en: {
            dueRent: (amount, month, date) => `Your rent for ${month} is ₹${amount.toLocaleString('en-IN')}, due on ${date}.`,
            noDue: "You currently have no pending rent obligations!",
            paidStatus: (month, paid, status) => `For ${month}, you have paid ₹${paid.toLocaleString('en-IN')} (Status: ${status}).`,
            agreement: (start, end, notice, rent) => `Your agreement runs from ${start} to ${end}. Monthly rent is ₹${rent.toLocaleString('en-IN')} with a ${notice}-day notice period.`,
            noAgreement: "No active agreement records found for your account.",
            maintHistory: (count, list) => `You have ${count} maintenance request(s). Details:\n${list}`,
            depositInfo: (dep, refund) => `Your registered security deposit is ₹${dep.toLocaleString('en-IN')}. Estimated net refund after deductions: ₹${refund.toLocaleString('en-IN')}.`,
            disclaimer: "\n\n*Disclaimer: Based on your uploaded RentWise records. Not a substitute for professional legal counsel.*"
        },
        te: {
            dueRent: (amount, month, date) => `మీ ${month} నెల అద్దె ₹${amount.toLocaleString('en-IN')}, చివరి తేదీ ${date}.`,
            noDue: "మీరు ప్రస్తుతం ఏ అద్దె బకాయిలు లేరు!",
            paidStatus: (month, paid, status) => `${month} నెలకు సంబంధించి మీరు ₹${paid.toLocaleString('en-IN')} చెల్లించారు (స్థితి: ${status}).`,
            agreement: (start, end, notice, rent) => `మీ అద్దె ఒప్పందం ${start} నుండి ${end} వరకు అమలులో ఉంది. నెలవారి అద్దె ₹${rent.toLocaleString('en-IN')}, నోటీసు వ్యవధి ${notice} రోజులు.`,
            noAgreement: "సక్రియ అద్దె ఒప్పంద వివరాలు లభించలేదు.",
            maintHistory: (count, list) => `మీకు ${count} నిర్వహణ అభ్యర్థన(లు) ఉన్నాయి:\n${list}`,
            depositInfo: (dep, refund) => `మీ భద్రతా డిపాజిట్ ₹${dep.toLocaleString('en-IN')}. సర్దుబాటు తరువాత వాపసు మొత్తం: ₹${refund.toLocaleString('en-IN')}.`,
            disclaimer: "\n\n*గమనిక: ఈ సమాచారం అప్‌లోడ్ చేసిన రికార్డులపై ఆధారపడి ఉంటుంది.*"
        },
        hi: {
            dueRent: (amount, month, date) => `आपका ${month} का किराया ₹${amount.toLocaleString('en-IN')} है, जिसकी देय तिथि ${date} है।`,
            noDue: "आपके पास वर्तमान में कोई बकाया किराया नहीं है!",
            paidStatus: (month, paid, status) => `${month} के लिए आपने ₹${paid.toLocaleString('en-IN')} का भुगतान किया है (स्थिति: ${status})।`,
            agreement: (start, end, notice, rent) => `आपका किराया समझौता ${start} से ${end} तक वैध है। मासिक किराया ₹${rent.toLocaleString('en-IN')} है और नोटिस अवधि ${notice} दिन है।`,
            noAgreement: "कोई सक्रिय किराया समझौता रिकॉर्ड नहीं मिला।",
            maintHistory: (count, list) => `आपके पास ${count} रखरखाव अनुरोध (Maintenance requests) हैं:\n${list}`,
            depositInfo: (dep, refund) => `आपकी सुरक्षा जमा (Security Deposit) ₹${dep.toLocaleString('en-IN')} है। कटौती के बाद अनुमानित रिफंड: ₹${refund.toLocaleString('en-IN')}।`,
            disclaimer: "\n\n*अस्वीकरण: उपलब्ध RentWise रिकॉर्ड के आधार पर। कानूनी सलाह का विकल्प नहीं।*"
        }
    };

    const l = langObj[language] || langObj['en'];

    if (textLower.includes('due') || textLower.includes('pending') || textLower.includes('అద్దె') || textLower.includes('किराया')) {
        const pending = context.obligations.find(o => o.status === 'PENDING' || o.status === 'PARTIAL' || o.status === 'OVERDUE');
        if (pending) {
            reply = l.dueRent(pending.total_due, pending.period_month, pending.due_date);
        } else {
            reply = l.noDue;
        }
    } else if (textLower.includes('paid') || textLower.includes('payment') || textLower.includes('receipt') || textLower.includes('రసీదు') || textLower.includes('भुगतान')) {
        if (context.obligations.length > 0) {
            const last = context.obligations[0];
            const paidAmt = (context.payments && context.payments.length > 0) ? context.payments[0].amount_paid : 0;
            reply = l.paidStatus(last.period_month, paidAmt, last.status);
        } else {
            reply = "No payment records found.";
        }
    } else if (textLower.includes('agreement') || textLower.includes('expire') || textLower.includes('notice') || textLower.includes('ఒప్పందం') || textLower.includes('समझौता')) {
        if (context.agreements.length > 0) {
            const ag = context.agreements[0];
            reply = l.agreement(ag.start_date, ag.end_date, ag.notice_period_days, ag.monthly_rent);
        } else {
            reply = l.noAgreement;
        }
    } else if (textLower.includes('maintenance') || textLower.includes('repair') || textLower.includes('leak') || textLower.includes('నిర్వహణ') || textLower.includes('मरम्मत')) {
        if (context.maintenance.length > 0) {
            const listStr = context.maintenance.map(m => `- ${m.title} [Status: ${m.status}, Date: ${m.reported_date}]`).join('\n');
            reply = l.maintHistory(context.maintenance.length, listStr);
        } else {
            reply = "No maintenance tickets reported.";
        }
    } else if (textLower.includes('deposit') || textLower.includes('refund') || textLower.includes('డిపాజిట్') || textLower.includes('जमा')) {
        const depAmt = context.units.length > 0 ? context.units[0].security_deposit : 30000;
        const refundAmt = context.deposits.length > 0 ? context.deposits[0].final_refund_amount : depAmt;
        reply = l.depositInfo(depAmt, refundAmt);
    } else {
        reply = `RentWise Assistant Summary for ${user.full_name}:\n` +
                `- Property: ${context.properties.length > 0 ? context.properties[0].name : (context.units.length > 0 ? context.units[0].property_name : 'Assigned Unit')}\n` +
                `- Registered Obligations: ${context.obligations.length} month(s)\n` +
                `- Open Maintenance Tickets: ${context.maintenance.filter(m => m.status !== 'CLOSED' && m.status !== 'RESOLVED').length}`;
    }

    reply += l.disclaimer;
    return { text: reply, context_used: context };
}

module.exports = {
    retrieveUserContext,
    generateAiAssistantResponse
};
