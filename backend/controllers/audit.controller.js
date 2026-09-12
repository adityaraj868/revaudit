const axios = require('axios');
const { AuditLog } = require('../models');
require('dotenv').config();

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || 'http://127.0.0.1:8000';

/**
 * Proxy On-Demand Repository Audit to Python Statistical Engine
 */
exports.auditRepo = async (req, res, next) => {
  try {
    const { repo_url, repo } = req.body;
    const target = repo_url || repo;

    if (!target) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing repository identifier. Provide { "repo_url": "https://github.com/owner/repo" }.'
      });
    }

    try {
      // Forward to Python Data-Science Microservice
      const engineResponse = await axios.post(
        `${PYTHON_ENGINE_URL}/api/audit/repo`,
        { repo_url: target },
        { timeout: 15000 }
      );

      // Async log to AuditLog (non-blocking)
      AuditLog.create({
        action: 'AUDIT_REPO_ANALYSIS',
        target_resource: target,
        details: {
          repo_name: engineResponse.data.repo_name,
          total_prs: engineResponse.data.total_prs_analyzed,
          r_squared: engineResponse.data.repo_internal_baseline?.r_squared,
          status: engineResponse.data.status
        },
        user_id: req.user?.id || null,
        ip_address: req.ip || req.connection?.remoteAddress
      }).catch(err => console.error('[AuditLog Error]', err.message));

      return res.json(engineResponse.data);

    } catch (engineErr) {
      console.warn(`[Audit Controller] Python engine at ${PYTHON_ENGINE_URL} unreachable or errored:`, engineErr.message);
      
      // Fallback deterministic baseline to ensure zero demo failure if microservice is restarting
      return res.status(503).json({
        error: 'Statistical Engine Unavailable',
        message: `The statistical engine at ${PYTHON_ENGINE_URL} did not respond. Ensure 'uvicorn api.main:app --port 8000' is running.`,
        details: engineErr.message
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Proxy Benchmark Suite Request to Python Statistical Engine
 */
exports.getBenchmarkSuite = async (req, res, next) => {
  try {
    const engineResponse = await axios.get(
      `${PYTHON_ENGINE_URL}/api/benchmark-suite`,
      { timeout: 15000 }
    );
    return res.json(engineResponse.data);
  } catch (engineErr) {
    return res.status(503).json({
      error: 'Statistical Engine Unavailable',
      message: `Failed to fetch benchmark suite from Python microservice at ${PYTHON_ENGINE_URL}.`,
      details: engineErr.message
    });
  }
};

/**
 * Proxy Healthcheck Request to Python Statistical Engine
 */
exports.getEngineHealth = async (req, res, next) => {
  try {
    const engineResponse = await axios.get(
      `${PYTHON_ENGINE_URL}/api/health`,
      { timeout: 5000 }
    );
    return res.json({
      gateway: 'Node.js Express Gateway (Port 4000)',
      statistical_microservice: engineResponse.data
    });
  } catch (engineErr) {
    return res.json({
      gateway: 'Node.js Express Gateway (Port 4000)',
      statistical_microservice: {
        status: 'offline',
        error: engineErr.message,
        expected_url: PYTHON_ENGINE_URL
      }
    });
  }
};
