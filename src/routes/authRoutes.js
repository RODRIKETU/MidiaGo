const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and User Profile management
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in to the application
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new client account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Missing fields
 *       409:
 *         description: Username already in use
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/subscribe:
 *   post:
 *     summary: Upgrade the current logged in user from 'cliente' to 'usuario'
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription activated
 *       400:
 *         description: User is not eligible for this upgrade
 */
router.post('/subscribe', verifyToken, authController.subscribe);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current logged in user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', verifyToken, authController.getProfile);

/**
 * @swagger
 * /api/auth/profile/update:
 *   post:
 *     summary: Update current logged in user profile details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               cep:
 *                 type: string
 *               address:
 *                 type: string
 *               document_type:
 *                 type: string
 *                 enum: [CPF, CNPJ]
 *               document_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
router.post('/profile/update', verifyToken, upload, authController.updateProfile);

/**
 * @swagger
 * /api/auth/generate-token:
 *   post:
 *     summary: Generate a new personal API token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token generated successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/generate-token', verifyToken, authController.generateToken);

module.exports = router;
