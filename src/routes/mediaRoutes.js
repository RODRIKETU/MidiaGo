const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const upload = require('../middlewares/uploadMiddleware');
const { verifyToken, optionalVerifyToken } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Media
 *   description: Media streaming and management
 */

/**
 * @swagger
 * /api/media/upload:
 *   post:
 *     summary: Upload a new media video
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *               cover:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [public, private]
 *     responses:
 *       201:
 *         description: Media uploaded successfully
 *       400:
 *         description: Invalid input or missing file
 */
router.post('/upload', verifyToken, upload, mediaController.uploadMedia);

/**
 * @swagger
 * /api/media/list:
 *   get:
 *     summary: Retrieve media catalog (paginated)
 *     tags: [Media]
 *     responses:
 *       200:
 *         description: List of media retrieved
 *       500:
 *         description: Server error
 */
router.get('/list', verifyToken, mediaController.listMedia);

/**
 * @swagger
 * /api/media/{id}:
 *   put:
 *     summary: Update media details
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [public, private]
 *     responses:
 *       200:
 *         description: Media updated
 *       403:
 *         description: Not owner or superadmin
 * 
 *   delete:
 *     summary: Delete a media file
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media deleted
 *       403:
 *         description: Not owner or superadmin
 */
router.put('/:id', verifyToken, mediaController.updateMedia);
router.delete('/:id', verifyToken, mediaController.deleteMedia);

/**
 * @swagger
 * /api/media/stream/{id}:
 *   get:
 *     summary: Stream video content
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the media
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Auth token (required if media is private)
 *     responses:
 *       200:
 *         description: Full content retrieved
 *       206:
 *         description: Partial content streamed
 *       403:
 *         description: Forbidden (private media without token)
 *       404:
 *         description: Media not found
 */
router.get('/stream/:id', optionalVerifyToken, mediaController.streamMedia);

/**
 * @swagger
 * /api/media/stream/cover/{id}:
 *   get:
 *     summary: Retrieve cover image
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cover retrieved
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Cover not found
 */
router.get('/stream/cover/:id', optionalVerifyToken, mediaController.streamCover);

module.exports = router;
