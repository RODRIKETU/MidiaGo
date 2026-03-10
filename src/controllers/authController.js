const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const crypto = require('crypto');
const fs = require('fs');

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

exports.register = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    try {
        // Check if username already exists
        const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(409).json({ success: false, message: 'Usuário já existe. Escolha outro nome.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // New users default to 'cliente' role
        const [result] = await pool.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, 'cliente']
        );

        // Auto login after register
        const token = jwt.sign(
            { id: result.insertId, username, role: 'cliente' },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: result.insertId,
                username: username,
                role: 'cliente'
            }
        });

    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ success: false, message: 'Erro interno durante o cadastro.' });
    }
};

exports.subscribe = async (req, res) => {
    try {
        if (req.user.role !== 'cliente') {
            return res.status(400).json({ success: false, message: 'Apenas clientes podem assinar o plano.' });
        }

        // Upgrade Role
        await pool.query('UPDATE users SET role = ? WHERE id = ?', ['usuario', req.user.id]);
        
        // Generate new token with updated role privileges
        const newToken = jwt.sign(
            { id: req.user.id, username: req.user.username, role: 'usuario' },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({ 
            success: true, 
            message: 'Assinatura Premium ativada! Você agora pode fazer uploads.',
            token: newToken,
            user: {
                id: req.user.id,
                username: req.user.username,
                role: 'usuario'
            }
        });
    } catch (error) {
        console.error("Subscribe error:", error);
        res.status(500).json({ success: false, message: 'Erro ao processar assinatura.' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, role, avatar, email, phone, cep, address, address_number, neighborhood, city, state, document_type, document_number, personal_token, created_at FROM users WHERE id = ?', [req.user.id]);
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

exports.updateProfile = async (req, res) => {
    try {
        const { email, phone, cep, address, address_number, neighborhood, city, state, document_type, document_number } = req.body;
        
        let updateQuery = 'UPDATE users SET email=?, phone=?, cep=?, address=?, address_number=?, neighborhood=?, city=?, state=?, document_type=?, document_number=?';
        let queryParams = [
            email || null, 
            phone || null, 
            cep || null, 
            address || null, 
            address_number || null, 
            neighborhood || null, 
            city || null, 
            state || null, 
            document_type || null, 
            document_number || null
        ];

        // Handle avatar upload if present
        if (req.files && req.files.avatar) {
            let base64Avatar;
            try {
                const avatarFile = req.files.avatar[0];
                const bitmap = fs.readFileSync(avatarFile.path);
                base64Avatar = 'data:' + avatarFile.mimetype + ';base64,' + bitmap.toString('base64');
                try { fs.unlinkSync(avatarFile.path); } catch (e) { console.error("Could not delete temp avatar", e); }
            } catch (e) {
                console.error("Error reading file", e);
            }

            if (base64Avatar) {
                updateQuery += ', avatar=?';
                queryParams.push(base64Avatar);
            }
        }

        updateQuery += ' WHERE id=?';
        queryParams.push(req.user.id);

        await pool.query(updateQuery, queryParams);
        
        // Fetch updated user to return
        const [users] = await pool.query('SELECT id, username, role, avatar, email, phone, cep, address, address_number, neighborhood, city, state, document_type, document_number, personal_token, created_at FROM users WHERE id = ?', [req.user.id]);
        
        res.json({ success: true, message: 'Profile updated successfully', user: users[0] });

    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ success: false, message: 'Error updating profile' });
    }
};
