const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/db');

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    try {
        const decoded = verifyToken(token);
        const users = await query('SELECT id, full_name, email, role, phone, avatar_url FROM users WHERE id = ?', [decoded.id]);
        
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'User account no longer exists.' });
        }

        req.user = users[0];
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired authentication token.' });
    }
}

function requireRole(roles) {
    const roleList = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }
        if (!roleList.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: `Access denied. Requires one of roles: ${roleList.join(', ')}` });
        }
        next();
    };
}

module.exports = {
    authenticateToken,
    requireRole
};
