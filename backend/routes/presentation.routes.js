const express = require('express');
const router = express.Router();
const presentationController = require('../controllers/presentation.controller');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRole = require('../middleware/authorizeRole');

router.get('/', presentationController.getAllPresentations);
router.get('/:id', presentationController.getPresentationById);
router.post('/', authenticateUser, authorizeRole('admin', 'auditor', 'maintainer'), presentationController.createPresentation);
router.put('/:id', authenticateUser, authorizeRole('admin', 'auditor', 'maintainer'), presentationController.updatePresentation);
router.delete('/:id', authenticateUser, authorizeRole('admin', 'auditor'), presentationController.deletePresentation);

module.exports = router;
