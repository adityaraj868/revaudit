const path = require('path');
const fs = require('fs');
const { File, AuditLog } = require('../models');
const { driver, uploadDir } = require('../config/storage');

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const savedFile = await File.create({
      filename: req.file.filename,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      storage_path: req.file.path,
      storage_driver: driver,
      uploaded_by_user_id: req.user?.id || null
    });

    AuditLog.create({
      action: 'FILE_UPLOAD',
      target_resource: `File:${savedFile.id}`,
      user_id: req.user?.id || null,
      details: { original_name: req.file.originalname, size: req.file.size }
    }).catch(() => {});

    return res.status(201).json({
      message: 'File uploaded successfully',
      file: savedFile
    });
  } catch (err) {
    next(err);
  }
};

exports.getFileById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await File.findByPk(id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (file.storage_driver === 'local') {
      if (!fs.existsSync(file.storage_path)) {
        return res.status(404).json({ error: 'File data missing on disk' });
      }
      return res.download(file.storage_path, file.original_name);
    }

    return res.json({ file });
  } catch (err) {
    next(err);
  }
};
