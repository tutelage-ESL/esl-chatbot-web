'use strict';
const db = require('../../../models');
const { Op } = require('sequelize');

const SAFE_ATTRS = ['id', 'username', 'displayName', 'email', 'role', 'phone', 'nativeLanguage', 'tutorId', 'adminId', 'createdAt'];

async function findById(id) { return db.User.findByPk(id, { attributes: SAFE_ATTRS }); }
async function findByEmail(email) { return db.User.findOne({ where: { email } }); }
async function findAll(where = {}, opts = {}) {
  return db.User.findAndCountAll({ where, attributes: SAFE_ATTRS, ...opts });
}
async function create(data) { return db.User.create(data); }
async function update(id, data) {
  const [affected] = await db.User.update(data, { where: { id } });
  return affected > 0 ? findById(id) : null;
}
async function remove(id) { return db.User.destroy({ where: { id } }); }

module.exports = { findById, findByEmail, findAll, create, update, remove };
