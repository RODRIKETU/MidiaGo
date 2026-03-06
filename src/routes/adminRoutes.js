const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireSuperadmin } = require('../middlewares/authMiddleware');

// All admin routes are strictly protected by verifyToken AND requireSuperadmin middlewares
router.use(verifyToken);
router.use(requireSuperadmin);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Retrieve a full list of users with statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved
 *       403:
 *         description: Forbidden (Not a superadmin)
 */
router.get('/users', adminController.getUsersList);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update a user's role or quota
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [superadmin, usuario, cliente]
 *               video_quota:
 *                 type: integer
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/users/:id', adminController.updateUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Permanently delete a user and their media
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
