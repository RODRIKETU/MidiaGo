const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const verifyToken = async (req, res, next) => {
    let token = req.headers['authorization'];
    
    // Also support token from query parameter for <video> tags
    if (!token && req.query.token) {
        token = `Bearer ${req.query.token}`;
    }

    // Support personal token in headers
    const personalToken = req.headers['x-personal-token'];

    if (personalToken) {
        const [users] = await pool.query('SELECT * FROM users WHERE personal_token = ?', [personalToken]);
        if (users.length > 0) {
            req.user = { id: users[0].id, role: users[0].role, username: users[0].username };
            return next();
        }
        return res.status(403).json({ success: false, message: 'Invalid Personal Token' });
    }

    if (!token) {
        return res.status(403).json({ success: false, message: 'No token provided' });
    }

    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Unauthorized / Invalid Token' });
    }
};

const verifyRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions' });
        }
        next();
    };
};

const optionalVerifyToken = async (req, res, next) => {
    let token = req.headers['authorization'];
    
    if (!token && req.query.token) {
        token = `Bearer ${req.query.token}`;
    }

    const personalToken = req.headers['x-personal-token'];

    if (personalToken) {
        const [users] = await pool.query('SELECT * FROM users WHERE personal_token = ?', [personalToken]);
        if (users.length > 0) {
            req.user = { id: users[0].id, role: users[0].role, username: users[0].username };
            return next();
        }
    }

    if (!token) {
        return next();
    }

    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded;
    } catch (err) {
        // Ignored
    }
    
    next();
};

module.exports = { verifyToken, verifyRole, optionalVerifyToken };
