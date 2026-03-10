const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Public route to get settings (useful for login page and pre-auth)
router.get('/', settingsController.getSettings);

// Protected superadmin route to update settings
// We use upload middleware configured to accept 'favicon' and 'background'
router.put('/', verifyToken, upload, settingsController.updateSettings);

module.exports = router;
