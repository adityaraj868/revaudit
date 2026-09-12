const sequelize = require('../config/database');
const User = require('./user.model');
const Presentation = require('./presentation.model');
const File = require('./file.model');
const AuditLog = require('./auditLog.model');

// Associations
User.hasMany(Presentation, { foreignKey: 'created_by_user_id', as: 'presentations' });
Presentation.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'author' });

User.hasMany(File, { foreignKey: 'uploaded_by_user_id', as: 'files' });
File.belongsTo(User, { foreignKey: 'uploaded_by_user_id', as: 'uploader' });

User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Presentation,
  File,
  AuditLog
};
