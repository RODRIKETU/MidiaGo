const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const crypto = require('crypto');

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, role, personal_token, created_at FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user: users[0] });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ success: false, message: 'Error fetching profile' });
    }
};

exports.generateToken = async (req, res) => {
    try {
        // Generate a new secure random string
        const newToken = crypto.randomBytes(32).toString('hex');
        
        await pool.query('UPDATE users SET personal_token = ? WHERE id = ?', [newToken, req.user.id]);
        
        res.json({ success: true, token: newToken, message: 'Personal token successfully generated.' });
    } catch (error) {
        console.error("Error generating token:", error);
        res.status(500).json({ success: false, message: 'Error generating personal token' });
    }
};
