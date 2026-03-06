const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

exports.uploadMedia = async (req, res) => {
    try {
        if (!req.files || !req.files.video) {
            return res.status(400).json({ success: false, message: 'No media video provided.' });
        }

        const videoFile = req.files.video[0];
        const coverFile = req.files.cover ? req.files.cover[0] : null;

        const { title, description, status } = req.body;
        const uploaderId = req.user.id;

        // Simulate backend processing time (e.g. standardizing formatting, encoding, etc.)
        // This takes ~3 seconds to allow frontend to show 'Processing' state explicitly.
        await new Promise(resolve => setTimeout(resolve, 3000));

        const mediaData = {
            title: title || videoFile.originalname,
            description: description || '',
            filename: videoFile.filename,
            original_name: videoFile.originalname,
            cover_filename: coverFile ? coverFile.filename : null,
            mimetype: videoFile.mimetype,
            size: videoFile.size,
            status: status || 'private',
            uploaded_by: uploaderId
        };

        const [result] = await pool.query(
            `INSERT INTO media (title, description, filename, original_name, cover_filename, mimetype, size, status, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                mediaData.title,
                mediaData.description,
                mediaData.filename,
                mediaData.original_name,
                mediaData.cover_filename,
                mediaData.mimetype,
                mediaData.size,
                mediaData.status,
                mediaData.uploaded_by
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Media uploaded successfully',
            mediaId: result.insertId
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ success: false, message: 'Failed to upload media.' });
    }
};

exports.listMedia = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        let queryStr = `
            SELECT m.id, m.title, m.description, m.status, m.cover_filename, m.created_at, m.uploaded_by, u.username as uploader 
            FROM media m 
            LEFT JOIN users u ON m.uploaded_by = u.id
        `;
        let queryParams = [];

        // Role-based filtering
        if (req.user.role === 'cliente') {
            queryStr += ` WHERE m.status = 'public'`;
        } else if (req.user.role === 'usuario') {
            queryStr += ` WHERE m.status = 'public' OR m.uploaded_by = ?`;
            queryParams.push(req.user.id);
        }
        // superadmin sees all, no WHERE clause

        queryStr += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);

        const [mediaItems] = await pool.query(queryStr, queryParams);

        let countQueryStr = 'SELECT COUNT(*) as total FROM media m';
        let countParams = [];

        if (req.user.role === 'cliente') {
            countQueryStr += ` WHERE m.status = 'public'`;
        } else if (req.user.role === 'usuario') {
            countQueryStr += ` WHERE m.status = 'public' OR m.uploaded_by = ?`;
            countParams.push(req.user.id);
        }

        const [countResult] = await pool.query(countQueryStr, countParams);
        const totalItems = countResult[0].total;

        res.json({
            success: true,
            data: mediaItems,
            pagination: {
                totalItems,
                currentPage: page,
                totalPages: Math.ceil(totalItems / limit),
                itemsPerPage: limit
            }
        });

    } catch (error) {
        console.error("List media error:", error);
        res.status(500).json({ success: false, message: 'Failed to retrieve media.' });
    }
};

exports.streamMedia = async (req, res) => {
    try {
        const mediaId = req.params.id;
        const [mediaRows] = await pool.query('SELECT * FROM media WHERE id = ?', [mediaId]);

        if (mediaRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Media not found.' });
        }

        const media = mediaRows[0];

        // Access control check
        if (media.status === 'private') {
            // Re-verify auth just for this specific route if private
            // Because this might be called directly via a <video src> tag without headers,
            // the auth middleware handles token from query `?token=...`
            if (!req.user) {
                return res.status(403).json({ success: false, message: 'Private media requires authentication token.' });
            }
        }

        const videoPath = path.join(__dirname, '../../uploads', media.filename);

        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({ success: false, message: 'Video file missing on server.' });
        }

        const videoStat = fs.statSync(videoPath);
        const fileSize = videoStat.size;
        const videoRange = req.headers.range;

        if (videoRange) {
            const parts = videoRange.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            if (start >= fileSize || end >= fileSize) {
                res.status(416).send('Requested range not satisfiable\n' + start + '-' + end);
                return;
            }

            const file = fs.createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': media.mimetype,
                // Add headers to discourage caching/downloading
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            };

            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': media.mimetype,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }

    } catch (error) {
        console.error("Stream error:", error);
        res.status(500).json({ success: false, message: 'Error streaming video.' });
    }
};

exports.updateMedia = async (req, res) => {
    try {
        const mediaId = req.params.id;
        const { title, description, status } = req.body;

        const [mediaRows] = await pool.query('SELECT * FROM media WHERE id = ?', [mediaId]);
        if (mediaRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Media not found.' });
        }

        const media = mediaRows[0];

        // Access control: Only owner or superadmin can edit
        if (req.user.role !== 'superadmin' && media.uploaded_by !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You do not have permission to edit this media.' });
        }

        await pool.query(
            'UPDATE media SET title=?, description=?, status=? WHERE id=?',
            [title, description, status, mediaId]
        );

        res.json({ success: true, message: 'Media updated successfully' });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ success: false, message: 'Failed to update media.' });
    }
};

exports.deleteMedia = async (req, res) => {
    try {
        const mediaId = req.params.id;
        
        const [mediaRows] = await pool.query('SELECT * FROM media WHERE id = ?', [mediaId]);
        if (mediaRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Media not found.' });
        }

        const media = mediaRows[0];

        // Access control: Only owner or superadmin can delete
        if (req.user.role !== 'superadmin' && media.uploaded_by !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You do not have permission to delete this media.' });
        }

        // Delete files from disk
        const videoPath = path.join(__dirname, '../../uploads', media.filename);
        try { fs.unlinkSync(videoPath); } catch (e) { console.error("Could not delete video file", e); }

        if (media.cover_filename) {
            const coverPath = path.join(__dirname, '../../uploads', media.cover_filename);
            try { fs.unlinkSync(coverPath); } catch (e) { console.error("Could not delete cover file", e); }
        }

        // Delete from DB
        await pool.query('DELETE FROM media WHERE id = ?', [mediaId]);

        res.json({ success: true, message: 'Media deleted successfully' });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ success: false, message: 'Failed to delete media.' });
    }
};

exports.streamCover = async (req, res) => {
    try {
        const mediaId = req.params.id;
        const [mediaRows] = await pool.query('SELECT cover_filename, status FROM media WHERE id = ?', [mediaId]);

        if (mediaRows.length === 0 || !mediaRows[0].cover_filename) {
            return res.status(404).json({ success: false, message: 'Cover not found.' });
        }

        const media = mediaRows[0];

        // Access control check for cover mirroring video logic
        if (media.status === 'private') {
            if (!req.user) {
                return res.status(403).json({ success: false, message: 'Private cover requires authentication token.' });
            }
        }

        const coverPath = path.join(__dirname, '../../uploads', media.cover_filename);

        if (!fs.existsSync(coverPath)) {
            return res.status(404).json({ success: false, message: 'Cover file missing on server.' });
        }

        res.sendFile(coverPath);
    } catch (error) {
        console.error("Cover fetch error:", error);
        res.status(500).json({ success: false, message: 'Error fetching cover.' });
    }
};
