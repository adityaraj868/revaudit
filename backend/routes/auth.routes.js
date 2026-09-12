const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticateUser = require('../middleware/authenticateUser');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateUser, authController.getProfile);

module.exports = router;
