const app = require('./app');
const { sequelize } = require('./models');
require('dotenv').config();

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // Authenticate and sync database models
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    await sequelize.sync({ alter: false });
    console.log('📦 Database models synchronized.');

    app.listen(PORT, () => {
      console.log(`🚀 RevAudit Gateway Backend listening on http://localhost:${PORT}`);
      console.log(`🔗 Python Statistical Microservice Target: ${process.env.PYTHON_ENGINE_URL || 'http://127.0.0.1:8000'}`);
    });
  } catch (err) {
    console.error('❌ Failed to start gateway server:', err);
    process.exit(1);
  }
}

startServer();
