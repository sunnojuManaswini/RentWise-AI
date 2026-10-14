const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { generateAiAssistantResponse } = require('../services/aiService');

async function getConversations(req, res) {
    try {
        const conversations = await query('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC', [req.user.id]);
        return res.json({ success: true, conversations });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch conversations.' });
    }
}

async function getMessages(req, res) {
    try {
        const { conversation_id } = req.params;
        const messages = await query('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversation_id]);
        return res.json({ success: true, messages });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch chat messages.' });
    }
}

async function sendMessage(req, res) {
    try {
        const { conversation_id, text, language } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
        }

        let convId = conversation_id;
        const lang = language || 'en';

        // Create new conversation if none provided
        if (!convId) {
            convId = 'conv-' + uuidv4().substring(0, 8);
            const title = text.length > 30 ? text.substring(0, 30) + '...' : text;
            await query('INSERT INTO ai_conversations (id, user_id, title) VALUES (?, ?, ?)', [convId, req.user.id, title]);
        }

        // Save User Message
        const userMsgId = 'msg-' + uuidv4().substring(0, 8);
        await query('INSERT INTO ai_messages (id, conversation_id, sender, text, language) VALUES (?, ?, \'USER\', ?, ?)', [
            userMsgId, convId, text.trim(), lang
        ]);

        // Generate AI Response with RAG Context & RBAC authorization
        const aiResponse = await generateAiAssistantResponse(text, lang, req.user);

        // Save Assistant Message
        const botMsgId = 'msg-' + uuidv4().substring(0, 8);
        await query('INSERT INTO ai_messages (id, conversation_id, sender, text, language, context_used_json) VALUES (?, ?, \'ASSISTANT\', ?, ?, ?)', [
            botMsgId, convId, aiResponse.text, lang, JSON.stringify(aiResponse.context_used)
        ]);

        // Update conversation timestamp
        await query('UPDATE ai_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [convId]);

        return res.json({
            success: true,
            conversation_id: convId,
            reply: {
                id: botMsgId,
                sender: 'ASSISTANT',
                text: aiResponse.text,
                language: lang,
                created_at: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('sendMessage error:', err);
        return res.status(500).json({ success: false, message: 'AI processing failed.' });
    }
}

module.exports = {
    getConversations,
    getMessages,
    sendMessage
};
