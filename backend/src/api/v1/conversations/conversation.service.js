'use strict';
const conversationRepo = require('./conversation.repository');
const aiService = require('../../../services/ai.service');
const ApiError = require('../../../utils/ApiError');

async function sendMessage({ userId, message, sessionId }) {
  // Get or create session
  let session = sessionId ? await conversationRepo.findSessionById(sessionId) : null;
  if (!session) {
    session = await conversationRepo.createSession({ userId, mode: 'text', startedAt: new Date() });
  }

  // Save user message
  await conversationRepo.createMessage({ sessionId: session.id, role: 'user', content: message, inputMode: 'text' });

  // Get recent history for context
  const recentMessages = await conversationRepo.getSessionMessages(session.id, 10);
  const history = recentMessages.map(m => ({ role: m.role, parts: [{ text: m.content }] }));

  // Get AI response
  const { response } = await aiService.getAIResponse(message, history);

  // Save AI response
  await conversationRepo.createMessage({ sessionId: session.id, role: 'assistant', content: response, inputMode: 'text' });

  return { response, sessionId: session.id };
}

async function getHistory(userId) {
  return conversationRepo.getUserSessions(userId);
}

module.exports = { sendMessage, getHistory };
