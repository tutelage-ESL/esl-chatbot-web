'use strict';
const config = require('../config');
const logger = require('../config/logger');

// ESL system prompt used across all AI providers
const ESL_SYSTEM_PROMPT = `You are a friendly and encouraging English as a Second Language (ESL) tutor.
Help students practice conversational English, correct grammar errors gently,
explain vocabulary in context, and keep responses concise and educational.`;

async function callGemini(message, history = []) {
  if (!config.geminiApiKey || !global.genAI) throw new Error('Gemini not available');
  const model = global.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(message);
  return result.response.text();
}

async function callOllama(message) {
  if (!config.ollamaUrl) throw new Error('Ollama not configured');
  const response = await fetch(`${config.ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.ollamaModel, prompt: `${ESL_SYSTEM_PROMPT}\nUser: ${message}\nAssistant:`, stream: false })
  });
  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
  const data = await response.json();
  return data.response;
}

async function getAIResponse(message, history = []) {
  const providers = [
    { name: 'Gemini',    fn: () => callGemini(message, history) },
    { name: 'Ollama',    fn: () => callOllama(message) },
  ];
  for (const provider of providers) {
    try {
      const response = await provider.fn();
      logger.info(`AI response from ${provider.name}`);
      return { response, provider: provider.name };
    } catch (err) {
      logger.warn(`${provider.name} failed: ${err.message}`);
    }
  }
  // Rule-based fallback
  return { response: "I understand. Can you tell me more about that? I'm here to help you practice English.", provider: 'fallback' };
}

module.exports = { getAIResponse, ESL_SYSTEM_PROMPT };
