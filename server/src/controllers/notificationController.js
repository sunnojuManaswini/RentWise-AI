const { query } = require('../config/db');

async function getNotifications(req, res) {
    try {
        const notifications = await query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.user.id]);
        return res.json({ success: true, notifications });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
    }
}

async function markNotificationAsRead(req, res) {
    try {
        const { id } = req.params;
        await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
        return res.json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to update notification.' });
    }
}

module.exports = { getNotifications, markNotificationAsRead };
