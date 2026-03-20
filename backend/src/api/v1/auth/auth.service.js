'use strict';
const bcrypt = require('bcryptjs');
const db = require('../../../models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../../utils/tokenHelper');
const sessionStore = require('../../../services/sessionStore');

async function registerUser({ username, email, password, role }) {
  const allowedRoles = ['student', 'tutor', 'admin'];
  const selectedRole = allowedRoles.includes(role) ? role : 'student';
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await db.User.create({ username, email, password: hashedPassword, role: selectedRole });
  return { id: user.id, username: user.username, email: user.email, role: user.role };
}

async function verifyCredentials({ email, password }) {
  const user = await db.User.findOne({ where: { email } });
  if (!user) return null;
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return null;
  return { id: user.id, username: user.username, email: user.email, role: user.role };
}

function issueTokens(userPayload) {
  const accessToken  = generateAccessToken(userPayload);
  const refreshToken = generateRefreshToken(userPayload);
  sessionStore.setSession(userPayload.id, refreshToken);
  return { accessToken, refreshToken };
}

async function refreshTokens(refreshToken) {
  const result = verifyRefreshToken(refreshToken);
  if (!result.valid) return null;
  const { userId } = result.decoded;
  if (!sessionStore.isValidSession(userId, refreshToken)) {
    sessionStore.removeSession(userId);
    return null;
  }
  const user = await db.User.findByPk(userId);
  if (!user) { sessionStore.removeSession(userId); return null; }
  const userPayload = { id: user.id, username: user.username, email: user.email, role: user.role };
  const newAccessToken  = generateAccessToken(userPayload);
  const newRefreshToken = generateRefreshToken(userPayload);
  sessionStore.setSession(userId, newRefreshToken);
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

function revokeToken(refreshToken) {
  const result = verifyRefreshToken(refreshToken);
  if (result.valid) sessionStore.removeSession(result.decoded.userId);
}

async function getUserById(userId) {
  return db.User.findByPk(userId, {
    attributes: ['id', 'username', 'displayName', 'email', 'role', 'phone', 'nativeLanguage', 'createdAt']
  });
}

module.exports = { registerUser, verifyCredentials, issueTokens, refreshTokens, revokeToken, getUserById };
