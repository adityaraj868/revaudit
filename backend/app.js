const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const presentationRoutes = require('./routes/presentation.routes');
const fileRoutes = require('./routes/file.routes');
const auditRoutes = require('./routes/audit.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Base Gateway Health
app.get('/api/health', (req, res) => {
  res.json({
    service: 'revaudit-backend-gateway',
    status: 'healthy',
    version: '1.0.0',
    port: process.env.PORT || 4000,
    academic_advisory: 'Dr. Sukhpal Singh (TIET)',
    team: 'Team ArchCoders'
  });
});

// Mounted Routes
app.use('/api/auth', authRoutes);
app.use('/api/presentations', presentationRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/audit', auditRoutes);

// Error Handling
app.use(errorHandler);

module.exports = app;
