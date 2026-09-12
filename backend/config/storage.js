const path = require('path');
const fs = require('fs');
require('dotenv').config();

const storageDriver = process.env.STORAGE_DRIVER || 'local';
const uploadDir = path.join(__dirname, '..', 'uploads');

if (storageDriver === 'local' && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

module.exports = {
  driver: storageDriver,
  uploadDir,
  s3Bucket: process.env.AWS_S3_BUCKET || 'revaudit-presentations',
  s3Region: process.env.AWS_REGION || 'us-east-1'
};
