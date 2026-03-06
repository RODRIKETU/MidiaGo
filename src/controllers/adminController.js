const pool = require('../config/db');

exports.getUsersList = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, u.username, u.role, u.email, u.phone, u.created_at, u.video_quota,
                COUNT(DISTINCT m.id) as upload_count,
                COUNT(DISTINCT v.id) as total_views
            FROM users u
            LEFT JOIN media m ON u.id = m.uploaded_by
            LEFT JOIN media_views v ON m.id = v.media_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `;
        const [users] = await pool.query(query);

        res.json({ success: true, users });
    } catch (error) {
        console.error("Admin user list error:", error);
        res.status(500).json({ success: false, message: 'Failed to retrieve users list.' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, video_quota } = req.body;

        // Ensure at least one superadmin remains (cannot demote yourself if you are the last admin)
        if (role && role !== 'superadmin') {
            const [adminCheck] = await pool.query("SELECT COUNT(*) as adminCount FROM users WHERE role = 'superadmin'");
            const [targetUser] = await pool.query("SELECT role FROM users WHERE id = ?", [id]);
            
            if (targetUser[0].role === 'superadmin' && adminCheck[0].adminCount <= 1) {
                return res.status(400).json({ success: false, message: 'Cannot demote the last superadmin.' });
            }
        }

        const updates = [];
        const params = [];

        if (role) { updates.push('role = ?'); params.push(role); }
        if (video_quota !== undefined) { updates.push('video_quota = ?'); params.push(parseInt(video_quota)); }

        if (updates.length > 0) {
            params.push(id);
            await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
            res.json({ success: true, message: 'User updated successfully' });
        } else {
            res.status(400).json({ success: false, message: 'No valid fields to update.' });
        }

    } catch (error) {
        console.error("Admin user update error:", error);
        res.status(500).json({ success: false, message: 'Failed to update user.' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (req.user.id == id) {
            return res.status(400).json({ success: false, message: 'You cannot delete yourself.' });
        }

        // Deleting user will cascade delete media DB links
        // We also need to purge actual files (video and covers)
        const [mediaFiles] = await pool.query('SELECT filename, cover_filename FROM media WHERE uploaded_by = ?', [id]);
        
        const fs = require('fs');
        const path = require('path');

        for (const file of mediaFiles) {
            if (file.filename) {
                const vidPath = path.join(__dirname, '../../uploads', file.filename);
                if (fs.existsSync(vidPath)) fs.unlinkSync(vidPath);
            }
            if (file.cover_filename) {
                const coverPath = path.join(__dirname, '../../uploads', file.cover_filename);
                if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
            }
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);

        res.json({ success: true, message: 'User and associated media deeply deleted.' });
    } catch (error) {
        console.error("Admin user delete error:", error);
        res.status(500).json({ success: false, message: 'Failed to delete user.' });
    }
};
