'use strict';

const { HfInference } = require('@huggingface/inference');
const https = require('https');
const http  = require('http');
const { URL } = require('url');
const db = require('../../../../models');
const apiResponse = require('../../../../utils/apiResponse');

// ─── Constants ────────────────────────────────────────────────────────────────
const ESL_SYSTEM_INSTRUCTION = 'You are a supportive ESL teacher and conversation partner. 🎓\n\nStyle:\n- Clear, friendly, practical.\n- Length: 4–8 sentences (~70–140 words) so explanations are complete.\n\nEach reply should:\n1) Respond naturally to the student.\n2) Teach 1–2 points (vocabulary/grammar/pronunciation/usage) with brief explanations and 2–3 simple examples.\n3) Give a quick practice prompt or question to continue the lesson.\n4) Offer a short correction or tip if needed.\n\nConstraints:\n- Do NOT use markdown bold (e.g., **text**).\n- Avoid repeating the student\'s text back-to-back.\n- Stay strictly ESL-focused; politely redirect if off-topic.\n- If asked who created you: "I was trained and created by Osanai!"';

// ─── Helper functions ─────────────────────────────────────────────────────────

function dedupeLeading(userText, aiText) {
  try {
    const u = (userText || '').trim();
    const t = (aiText || '').trim();
    if (!u || !t) return aiText;
    const esc = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('^\\n?\\s*(?:' + esc + '(?:[\\s\\-_,.:;!?]+)?){2,}', 'i');
    return t.replace(re, u + ' ').trimStart();
  } catch (_) {
    return aiText;
  }
}

function ruleFallback(userText) {
  const t = (userText || '').toLowerCase();
  if (t.includes('name')) return 'I\'m your ESL tutor, trained by Osanai! 😊 Let\'s set a goal and practice together.';
  if (t.includes('hello') || t.includes('hi')) return 'Hi! 👋 I\'m your ESL tutor. What skill do you want to practice today—speaking, vocabulary, or grammar?';
  return 'Let\'s turn this into practice. Share a sentence on your topic, and I\'ll help with corrections and tips. ✍️🗣️';
}

async function callOllama(urlString, modelName, messages) {
  const u = new URL(urlString + '/api/chat');
  const isHttps = u.protocol === 'https:';
  const payload = JSON.stringify({ model: modelName, messages, stream: false, options: { temperature: 0.7, num_predict: 256, repeat_penalty: 1.2 } });
  const opts = {
    method: 'POST',
    hostname: u.hostname,
    port: u.port || (isHttps ? 443 : 80),
    path: u.pathname,
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  };
  return new Promise((resolve, reject) => {
    const req = (isHttps ? https : http).request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.message && json.message.content ? json.message.content : '');
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function callGroq(messages) {
  const key = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';
  if (!key) return '';
  const payload = JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 256 });
  return new Promise((resolve) => {
    const req = https.request({
      method: 'POST', hostname: 'api.groq.com', path: '/openai/v1/chat/completions',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          const c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
          resolve((c || '').trim());
        } catch { resolve(''); }
      });
    });
    req.on('error', () => resolve(''));
    req.write(payload);
    req.end();
  });
}

async function callOpenRouter(messages) {
  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-7b-instruct';
  if (!key) return '';
  const payload = JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 256 });
  return new Promise((resolve) => {
    const req = https.request({
      method: 'POST', hostname: 'openrouter.ai', path: '/api/v1/chat/completions',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          const c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
          resolve((c || '').trim());
        } catch { resolve(''); }
      });
    });
    req.on('error', () => resolve(''));
    req.write(payload);
    req.end();
  });
}

async function updateProgressDB(userId, message, type, responsePreview) {
  try {
    await db.Interaction.create({ userId, type, message, responsePreview, timestamp: new Date() });
    const [userMetrics] = await db.UserMetrics.findOrCreate({
      where: { userId },
      defaults: {
        userId, totalInteractions: 0, textInteractions: 0, voiceInteractions: 0,
        pronunciationInteractions: 0, commandsUsed: 0, lessonsCompleted: 0,
        practiceSessionsCompleted: 0, vocabularyWordsLearned: 0, goalsSet: 0,
        goalsCompleted: 0, totalStudyTimeMinutes: 0, estimatedLevel: null,
        grammarScore: 0, vocabularyScore: 0, readingScore: 0, writingScore: 0,
        speakingScore: 0, listeningScore: 0, lastUpdated: new Date()
      }
    });
    userMetrics.totalInteractions++;
    if (type === 'text') userMetrics.textInteractions++;
    else if (type === 'voice') userMetrics.voiceInteractions++;
    else if (type === 'pronunciation') userMetrics.pronunciationInteractions++;
    userMetrics.lastUpdated = new Date();
    await userMetrics.save();
  } catch (error) {
    console.error('Error updating progress in database:', error);
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  // Handle public event mode auto-login if needed
  if (!req.userId && process.env.PUBLIC_EVENT_MODE === 'true') {
    try {
      const username = process.env.DEFAULT_EVENT_USER || 'TUTELAGE';
      const email = 'event@tutelage.local';
      let user = await db.User.findOne({ where: { username } });
      if (!user) user = await db.User.findOne({ where: { email } });
      if (!user) user = await db.User.create({ username, email, password: 'event', subscriptionTier: 'diamond' });
      if (user.subscriptionTier !== 'diamond') { user.subscriptionTier = 'diamond'; await user.save(); }
      req.session.userId = user.id;
      req.session.user = { id: user.id, username: user.username };
      req.userId = user.id;
    } catch (e) {
      console.error('Event auto-login failed:', e);
      return apiResponse.unauthorized(res, 'Authentication required');
    }
  }

  try {
    console.log('Received chat request with message:', req.body.message);
    const { message } = req.body;
    if (!message) return apiResponse.validationError(res, 'Message is required');
    if (!global.genAI) return res.json({ response: `Echo: ${message}` });

    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    await db.Message.create({ userId, content: message, sender: 'user' });
    await db.Progress.upsert({
      userId,
      chatMessageCount: (await db.Progress.findOne({ where: { userId } }))?.chatMessageCount + 1 || 1,
      totalWordsTyped: (await db.Progress.findOne({ where: { userId } }))?.totalWordsTyped + message.split(' ').length || message.split(' ').length,
      lastActiveDate: new Date()
    });

    const recentMessages = await db.Message.findAll({ where: { userId }, order: [['createdAt', 'ASC']] });
    const username = req.session.user?.username;

    let history = [];
    if (username) history.push({ role: 'user', parts: [{ text: `My username is ${username}. Please remember this and use it to address me.` }] });

    let baseHistory = recentMessages;
    if (baseHistory.length && baseHistory[baseHistory.length - 1].sender === 'user') {
      baseHistory = baseHistory.slice(0, -1);
    }
    history = history.concat(baseHistory.map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    })));
    if (history.length > 0 && history[0].role === 'model') history = history.slice(1);

    const model = global.genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: ESL_SYSTEM_INSTRUCTION });
    const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 256, temperature: 0.7 } });

    try {
      const result = await chat.sendMessage(message);
      let response = result.response.text();
      response = dedupeLeading(message, response);
      await db.Message.create({ userId, content: response, sender: 'bot' });
      console.log('Generated response:', response);
      return apiResponse.success(res, { response });
    } catch (geminiError) {
      // Fallback chain: Ollama → Groq → HuggingFace → OpenRouter → rule-based
      const ollamaUrl   = process.env.OLLAMA_URL;
      const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b-instruct';
      const toOAIMessages = (h, msg) => [{ role: 'system', content: ESL_SYSTEM_INSTRUCTION }]
        .concat(h.map(x => ({ role: x.role === 'user' ? 'user' : 'assistant', content: x.parts && x.parts[0] ? x.parts[0].text : '' })))
        .concat([{ role: 'user', content: msg }]);

      let botResponse = '';
      if (ollamaUrl) {
        try { botResponse = (await callOllama(ollamaUrl, ollamaModel, toOAIMessages(history, message))).trim(); } catch (_) {}
      }
      if (!botResponse) { const gr = await callGroq(toOAIMessages(history, message)); if (gr) botResponse = gr; }
      if (!botResponse) {
        try {
          const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
          const prompt = `${ESL_SYSTEM_INSTRUCTION}\n\nUser: ${message}\nAssistant:`;
          for (const m of [process.env.HF_FALLBACK_MODEL || 'HuggingFaceH4/zephyr-7b-beta', 'mistralai/Mixtral-8x7B-Instruct-v0.1', 'Qwen/Qwen2.5-7B-Instruct']) {
            try {
              const r = await hf.textGeneration({ model: m, inputs: prompt, parameters: { max_new_tokens: 256, temperature: 0.7, repetition_penalty: 1.2, no_repeat_ngram_size: 2, return_full_text: false } });
              let txt = Array.isArray(r) ? (r[0]?.generated_text || '') : (r.generated_text || '');
              if ((txt = txt.trim())) { botResponse = txt; break; }
            } catch (_) {}
          }
        } catch (hfErr) { console.error('HuggingFace fallback error:', hfErr); }
      }
      if (!botResponse) { const or = await callOpenRouter(toOAIMessages(history, message)); if (or) botResponse = or; }
      if (!botResponse) botResponse = ruleFallback(message);
      botResponse = dedupeLeading(message, botResponse);
      await db.Message.create({ userId, content: botResponse, sender: 'bot' });
      return apiResponse.success(res, { response: botResponse });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return apiResponse.internalError(res, 'Failed to process message');
  }
};

// Export helpers for reuse (e.g. voice controller also uses updateProgressDB)
exports.updateProgressDB = updateProgressDB;
exports.ESL_SYSTEM_INSTRUCTION = ESL_SYSTEM_INSTRUCTION;
