'use strict';
const db = require('../../../models');
const { Op } = require('sequelize');
async function findByUser(userId, opts = {}) { return db.Vocabulary.findAndCountAll({ where: { userId }, ...opts }); }
async function findById(id) { return db.Vocabulary.findByPk(id); }
async function create(data) { return db.Vocabulary.create(data); }
async function update(id, data) { return db.Vocabulary.update(data, { where: { id } }); }
async function remove(id) { return db.Vocabulary.destroy({ where: { id } }); }
async function getDueCards(userId, limit = 20) {
  return db.Vocabulary.findAll({ where: { userId, srsDue: { [Op.lte]: new Date() } }, limit, order: [['srsDue', 'ASC']] });
}
module.exports = { findByUser, findById, create, update, remove, getDueCards };
