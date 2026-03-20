'use strict';
const db = require('../../../models');
async function findByUser(userId) { return db.Goal.findAll({ where: { userId }, order: [['createdAt', 'DESC']] }); }
async function findById(id) { return db.Goal.findByPk(id); }
async function create(data) { return db.Goal.create(data); }
async function update(id, data) { const [n] = await db.Goal.update(data, { where: { id } }); return n > 0 ? findById(id) : null; }
async function remove(id) { return db.Goal.destroy({ where: { id } }); }
module.exports = { findByUser, findById, create, update, remove };
