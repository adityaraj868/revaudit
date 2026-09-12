const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');

/**
 * Audit Endpoints bridged to Python Statistical Engine (Port 8000)
 */

// POST /api/audit/repo - On-demand repository statistical audit
router.post('/repo', auditController.auditRepo);

// GET /api/audit/benchmark-suite - Multi-repo empirical benchmark
router.get('/benchmark-suite', auditController.getBenchmarkSuite);

// GET /api/audit/health - Check health of Node gateway + Python microservice
router.get('/health', auditController.getEngineHealth);

module.exports = router;
