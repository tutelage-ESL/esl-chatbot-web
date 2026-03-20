'use strict';
const db = require('../../../models');

async function createSession(data) { return db.ConversationSession.create(data); }
async function findSessionById(id) { return db.ConversationSession.findByPk(id); }
async function getUserSessions(userId, limit = 20) {
  return db.ConversationSession.findAll({ where: { userId }, order: [['startedAt', 'DESC']], limit });
}
async function createMessage(data) { return db.Message.create(data); }
async function getSessionMessages(sessionId, limit = 50) {
  return db.Message.findAll({ where: { sessionId }, order: [['createdAt', 'ASC']], limit });
}
async function updateSession(id, data) { return db.ConversationSession.update(data, { where: { id } }); }

module.exports = { createSession, findSessionById, getUserSessions, createMessage, getSessionMessages, updateSession };
