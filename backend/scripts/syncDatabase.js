const { sequelize } = require('../models');

async function syncDatabase() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    console.log('Syncing database tables...');
    await sequelize.sync({ force: false, alter: true });
    console.log('Database tables synced successfully.');
    
    await sequelize.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error syncing database:', error);
    process.exit(1);
  }
}

// Run the sync if this file is executed directly
if (require.main === module) {
  syncDatabase();
}

module.exports = syncDatabase;