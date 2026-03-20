'use strict';
const userRepo = require('./user.repository');
const ApiError = require('../../../utils/ApiError');
const ROLES = require('../../../constants/roles');

async function getStudentsByTutor(tutorId) {
  const { rows, count } = await userRepo.findAll({ role: ROLES.STUDENT, tutorId });
  return { students: rows, count };
}
async function getTutorsByAdmin(adminId) {
  const { rows, count } = await userRepo.findAll({ role: ROLES.TUTOR, adminId });
  return { tutors: rows, count };
}
async function getUserProfile(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}
async function updateUser(userId, data) {
  const user = await userRepo.update(userId, data);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

module.exports = { getStudentsByTutor, getTutorsByAdmin, getUserProfile, updateUser };
