const { Sequelize } = require('sequelize');

/**
 * Database migration script to add subscription tier functionality to existing users
 * This script adds the new columns to the users table and sets default values
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if columns already exist before adding them
      const tableDescription = await queryInterface.describeTable('users');
      
      // Add subscriptionTier column if it doesn't exist
      if (!tableDescription.subscriptionTier) {
        await queryInterface.addColumn('users', 'subscriptionTier', {
          type: Sequelize.ENUM('standard', 'gold', 'diamond'),
          allowNull: false,
          defaultValue: 'standard'
        });
        console.log('✅ Added subscriptionTier column');
      } else {
        console.log('ℹ️ subscriptionTier column already exists');
      }

      // Add monthlyTtsUsage column if it doesn't exist
      if (!tableDescription.monthlyTtsUsage) {
        await queryInterface.addColumn('users', 'monthlyTtsUsage', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        });
        console.log('✅ Added monthlyTtsUsage column');
      } else {
        console.log('ℹ️ monthlyTtsUsage column already exists');
      }

      // Add lastUsageReset column if it doesn't exist
      if (!tableDescription.lastUsageReset) {
        await queryInterface.addColumn('users', 'lastUsageReset', {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: null
        });
        console.log('✅ Added lastUsageReset column');
      } else {
        console.log('ℹ️ lastUsageReset column already exists');
      }

      console.log('✅ Successfully added subscription tier columns to users table');

      // Update existing users with default values
      await queryInterface.bulkUpdate('users', {
        subscriptionTier: 'standard',
        monthlyTtsUsage: 0,
        lastUsageReset: new Date()
      }, {
        lastUsageReset: null
      });

      // Now make lastUsageReset NOT NULL after setting values
      if (!tableDescription.lastUsageReset || tableDescription.lastUsageReset.allowNull) {
        await queryInterface.changeColumn('users', 'lastUsageReset', {
          type: Sequelize.DATE,
          allowNull: false
        });
        console.log('✅ Made lastUsageReset NOT NULL');
      }

      console.log('✅ Successfully updated existing users with default subscription tier values');

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove the added columns
      await queryInterface.removeColumn('users', 'subscriptionTier');
      await queryInterface.removeColumn('users', 'monthlyTtsUsage');
      await queryInterface.removeColumn('users', 'lastUsageReset');

      console.log('✅ Successfully removed subscription tier columns from users table');

    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};