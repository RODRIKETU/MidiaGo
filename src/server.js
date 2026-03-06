require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const authRoutes = require('./routes/authRoutes');
const mediaRoutes = require('./routes/mediaRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (Frontend and uploads)
app.use(express.static(path.join(__dirname, '../public')));
// Note: We don't expose uploads natively because we want to block direct download.
// The /api/media/stream route will enforce token checking or partial content streaming.

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "MidiaGo API Docs"
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);

// Database initialization check/connection info 
// (Handled by config/db.js pool creation, no explicit start required)

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});
