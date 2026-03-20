'use strict';
const db = require('../../../models');
const { Op } = require('sequelize');
async function getProgressHistory(userId, { startDate, endDate } = {}) {
  const where = { userId };
  if (startDate) where.date = { [Op.gte]: startDate };
  if (endDate) where.date = { ...where.date, [Op.lte]: endDate };
  return db.Progress.findAll({ where, order: [['date', 'ASC']] });
}
module.exports = { getProgressHistory };
