const { Sequelize } = require('sequelize');
const config = require('../config/config.json')[process.env.NODE_ENV || 'development'];

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

async function fixDatabase() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Disable foreign key checks
    console.log('Disabling foreign key checks...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // Drop all tables
    console.log('Dropping all tables...');
    await sequelize.query('DROP TABLE IF EXISTS Messages;');
    await sequelize.query('DROP TABLE IF EXISTS Progress;');
    await sequelize.query('DROP TABLE IF EXISTS Settings;');
    await sequelize.query('DROP TABLE IF EXISTS usermetrics;');
    await sequelize.query('DROP TABLE IF EXISTS interactions;');
    await sequelize.query('DROP TABLE IF EXISTS goals;');
    await sequelize.query('DROP TABLE IF EXISTS vocabularies;');
    await sequelize.query('DROP TABLE IF EXISTS Users;');
    
    // Re-enable foreign key checks
    console.log('Re-enabling foreign key checks...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    
    console.log('Tables dropped successfully.');
    
    await sequelize.close();
    console.log('Database connection closed.');
    console.log('Database fixed! You can now run npm start.');
  } catch (error) {
    console.error('Error fixing database:', error);
    process.exit(1);
  }
}

// Run the fix if this file is executed directly
if (require.main === module) {
  fixDatabase();
}

module.exports = fixDatabase;