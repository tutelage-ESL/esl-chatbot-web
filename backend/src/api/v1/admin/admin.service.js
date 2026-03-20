'use strict';
const db = require('../../../models');
const bcrypt = require('bcryptjs');
const ROLES = require('../../../constants/roles');
const ApiError = require('../../../utils/ApiError');

async function getAllTutors(adminId) {
  return db.User.findAll({ where: { role: ROLES.TUTOR, adminId }, attributes: ['id', 'username', 'email', 'createdAt'] });
}
async function registerTutor(adminId, { username, email, password }) {
  const existing = await db.User.findOne({ where: { email } });
  if (existing) throw ApiError.conflict('Email already in use');
  const hashedPassword = await bcrypt.hash(password, 10);
  return db.User.create({ username, email, password: hashedPassword, role: ROLES.TUTOR, adminId });
}
async function getOverview() {
  const [totalStudents, totalTutors, totalAdmins] = await Promise.all([
    db.User.count({ where: { role: ROLES.STUDENT } }),
    db.User.count({ where: { role: ROLES.TUTOR } }),
    db.User.count({ where: { role: ROLES.ADMIN } }),
  ]);
  return { totalStudents, totalTutors, totalAdmins };
}
module.exports = { getAllTutors, registerTutor, getOverview };
