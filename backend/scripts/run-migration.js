const { Sequelize } = require('sequelize');
const config = require('../config/config.json');
const migration = require('../migrations/add-subscription-tiers');

// Database configuration
const sequelize = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  {
    host: config.development.host,
    dialect: config.development.dialect,
    logging: console.log
  }
);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration for subscription tiers...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');

    // Create QueryInterface
    const queryInterface = sequelize.getQueryInterface();

    // Run the migration
    await migration.up(queryInterface, Sequelize);

    console.log('🎉 Migration completed successfully!');
    console.log('📊 All existing users now have subscription tier functionality');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };