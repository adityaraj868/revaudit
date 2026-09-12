const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const File = sequelize.define('File', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  original_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mime_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  size_bytes: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  storage_path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  storage_driver: {
    type: DataTypes.ENUM('local', 's3'),
    defaultValue: 'local'
  },
  uploaded_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true,
  underscored: true
});

module.exports = File;
