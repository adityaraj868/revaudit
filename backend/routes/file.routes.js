const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fileController = require('../controllers/file.controller');
const authenticateUser = require('../middleware/authenticateUser');
const { uploadDir } = require('../config/storage');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post('/upload', authenticateUser, upload.single('file'), fileController.uploadFile);
router.get('/:id', fileController.getFileById);

module.exports = router;
