const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

exports.uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No media file provided.' });
        }

        const { title, description, status } = req.body;
        const uploaderId = req.user.id;

        const mediaData = {
            title: title || req.file.originalname,
            description: description || '',
            filename: req.file.filename,
            original_name: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            status: status || 'private',
            uploaded_by: uploaderId
        };

        const [result] = await pool.query(
            `INSERT INTO media (title, description, filename, original_name, mimetype, size, status, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                mediaData.title,
                mediaData.description,
                mediaData.filename,
                mediaData.original_name,
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

        const [mediaItems] = await pool.query(
            `SELECT m.id, m.title, m.description, m.status, m.created_at, u.username as uploader 
             FROM media m 
             LEFT JOIN users u ON m.uploaded_by = u.id 
             ORDER BY m.created_at DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM media');
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
