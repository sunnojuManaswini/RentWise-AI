const { formatWhatsAppMessage } = require('../utils/whatsappUtils');

async function generateWhatsAppMessage(req, res) {
    try {
        const { type, data } = req.body;

        if (!type || !data) {
            return res.status(400).json({ success: false, message: 'Message type and data payload are required.' });
        }

        const result = formatWhatsAppMessage(type, data);
        return res.json({
            success: true,
            message_type: type,
            text: result.text,
            whatsapp_url: result.whatsappUrl
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to generate WhatsApp message.' });
    }
}

module.exports = { generateWhatsAppMessage };
