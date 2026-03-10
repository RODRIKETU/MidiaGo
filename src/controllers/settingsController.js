const pool = require('../config/db');

exports.getSettings = async (req, res) => {
    try {
        const [settingsRows] = await pool.query('SELECT favicon, background_image, lgpd_text, cookie_text, cookie_policy_link FROM settings WHERE id = 1');
        
        if (settingsRows.length === 0) {
            return res.json({ success: true, settings: {} });
        }
        
        res.json({ success: true, settings: settingsRows[0] });
    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        // Enforce superadmin role
        if (!req.user || req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Forbidden. Superadmin only.' });
        }

        const { lgpd_text, cookie_text, cookie_policy_link } = req.body;
        
        let updateQuery = 'UPDATE settings SET lgpd_text = ?, cookie_text = ?, cookie_policy_link = ? WHERE id = 1';
        let queryParams = [lgpd_text || null, cookie_text || null, cookie_policy_link || null];

        // Handle favicon upload if present
        let queryModifications = '';
        if (req.files && req.files.favicon) {
            const fs = require('fs');
            let base64Favicon;
            try {
                const faviconFile = req.files.favicon[0];
                const bitmap = fs.readFileSync(faviconFile.path);
                base64Favicon = 'data:' + faviconFile.mimetype + ';base64,' + bitmap.toString('base64');
                try { fs.unlinkSync(faviconFile.path); } catch (e) { console.error("Could not delete temp favicon", e); }
            } catch (e) {
                console.error("Error processing favicon", e);
            }

            if (base64Favicon) {
                queryModifications += ', favicon = ?';
                queryParams.push(base64Favicon);
            }
        }

        // Handle background upload if present
        if (req.files && req.files.background) {
            const fs = require('fs');
            let base64Background;
            try {
                const bgFile = req.files.background[0];
                const bitmap = fs.readFileSync(bgFile.path);
                base64Background = 'data:' + bgFile.mimetype + ';base64,' + bitmap.toString('base64');
                try { fs.unlinkSync(bgFile.path); } catch (e) { console.error("Could not delete temp background", e); }
            } catch (e) {
                console.error("Error processing background", e);
            }

            if (base64Background) {
                queryModifications += ', background_image = ?';
                queryParams.push(base64Background);
            }
        }
        
        if (queryModifications !== '') {
            updateQuery = `UPDATE settings SET lgpd_text = ?, cookie_text = ?, cookie_policy_link = ?${queryModifications} WHERE id = 1`;
        }

        await pool.query(updateQuery, queryParams);
        res.json({ success: true, message: 'Settings updated successfully' });

    } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({ success: false, message: 'Failed to update settings.' });
    }
};
