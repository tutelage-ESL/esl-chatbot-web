'use strict';

// Re-export the sequelize instance from the models layer.
// Consumers can: const { sequelize } = require('../config/database');
const db = require('../../models');

module.exports = {
  sequelize: db.sequelize,
  Sequelize: db.Sequelize,
};
