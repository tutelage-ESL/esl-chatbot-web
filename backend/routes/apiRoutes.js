const express = require('express');
const router = express.Router();
const multer = require('multer');
const { HfInference } = require('@huggingface/inference');
const https = require('https');
const { URL } = require('url');
const http = require('http');
const elevenLabsService = require('../services/elevenLabsService');
const path = require('path');

// Database models
const db = require('../models');
const { User, Vocabulary, Goal, Interaction, UserMetrics, Settings, Progress, Message } = db;

// Standardized API response utilities
const apiResponse = require('../utils/apiResponse');
const { requireJwtAuth, optionalJwtAuth } = require('../middleware/jwtMiddleware');
const { chatLimiter } = require('../middleware/rateLimiter');
const { validate, chatSchemas, vocabularySchemas, goalSchemas, settingsSchemas, ttsSchemas } = require('../middleware/validators');

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * System instruction for the ESL AI tutor.
 * Defined once here to avoid duplication across chat, voice, and fallback paths.
 */
const ESL_SYSTEM_INSTRUCTION = 'You are a supportive ESL teacher and conversation partner. \u{1F393}\n\nStyle:\n- Clear, friendly, practical.\n- Length: 4\u20138 sentences (~70\u2013140 words) so explanations are complete.\n\nEach reply should:\n1) Respond naturally to the student.\n2) Teach 1\u20132 points (vocabulary/grammar/pronunciation/usage) with brief explanations and 2\u20133 simple examples.\n3) Give a quick practice prompt or question to continue the lesson.\n4) Offer a short correction or tip if needed.\n\nConstraints:\n- Do NOT use markdown bold (e.g., **text**).\n- Avoid repeating the student\'s text back-to-back.\n- Stay strictly ESL-focused; politely redirect if off-topic.\n- If asked who created you: "I was trained and created by Osanai!"';

// ============================================================================
// MODULE-LEVEL HELPER FUNCTIONS
// ============================================================================

/**
 * Removes leading repetition of the user's text from the AI response.
 * Prevents the AI from echoing the user's input at the start of its reply.
 */
function dedupeLeading(userText, aiText) {
  try {
    const u = (userText || '').trim();
    const t = (aiText || '').trim();
    if (!u || !t) return aiText;
    const esc = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('^\n?\s*(?:' + esc + '(?:[\s\-_,.:;!?]+)?){2,}', 'i');
    return t.replace(re, u + ' ').trimStart();
  } catch (_) {
    return aiText;
  }
}

/**
 * Rule-based fallback response when all AI providers are unavailable.
 */
function ruleFallback(userText) {
  const t = (userText || '').toLowerCase();
  if (t.includes('name')) return 'I\'m your ESL tutor, trained by Osanai! \uD83D\uDE0A Let\'s set a goal and practice together.';
  if (t.includes('hello') || t.includes('hi')) return 'Hi! \uD83D\uDC4B I\'m your ESL tutor. What skill do you want to practice today\u2014speaking, vocabulary, or grammar?';
  return 'Let\'s turn this into practice. Share a sentence on your topic, and I\'ll help with corrections and tips. \u270D\uFE0F\uD83D\uDDE3\uFE0F';
}

/**
 * Calls a local Ollama server as an AI fallback.
 * @param {string} urlString - Base URL of the Ollama server
 * @param {string} modelName - Ollama model name to use
 * @param {Array} messages - OpenAI-format message array
 * @returns {Promise<string>} Model response text
 */
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
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Calls the Groq API as an AI fallback.
 * @param {Array} messages - OpenAI-format message array
 * @returns {Promise<string>} Model response text
 */
async function callGroq(messages) {
  const key = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';
  if (!key) return '';
  const payload = JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 256 });
  return new Promise((resolve) => {
    const req = https.request({
      method: 'POST',
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
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

/**
 * Calls the OpenRouter API as an AI fallback.
 * @param {Array} messages - OpenAI-format message array
 * @returns {Promise<string>} Model response text
 */
async function callOpenRouter(messages) {
  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-7b-instruct';
  if (!key) return '';
  const payload = JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 256 });
  return new Promise((resolve) => {
    const req = https.request({
      method: 'POST',
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
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


// Helper function to update progress using database
async function updateProgressDB(userId, message, type, responsePreview) {
  try {
    // Create new interaction record
    await Interaction.create({
      userId: userId,
      type: type,
      message: message,
      responsePreview: responsePreview,
      timestamp: new Date()
    });

    // Update or create user metrics
    const [userMetrics, created] = await UserMetrics.findOrCreate({
      where: { userId: userId },
      defaults: {
        userId: userId,
        totalInteractions: 0,
        textInteractions: 0,
        voiceInteractions: 0,
        pronunciationInteractions: 0,
        commandsUsed: 0,
        lessonsCompleted: 0,
        practiceSessionsCompleted: 0,
        vocabularyWordsLearned: 0,
        goalsSet: 0,
        goalsCompleted: 0,
        totalStudyTimeMinutes: 0,
        estimatedLevel: null,
        grammarScore: 0,
        vocabularyScore: 0,
        readingScore: 0,
        writingScore: 0,
        speakingScore: 0,
        listeningScore: 0,
        lastUpdated: new Date()
      }
    });

    // Update metrics
    userMetrics.totalInteractions++;
    if (type === 'text') {
      userMetrics.textInteractions++;
    } else if (type === 'voice') {
      userMetrics.voiceInteractions++;
    } else if (type === 'pronunciation') {
      userMetrics.pronunciationInteractions++;
    }
    userMetrics.lastUpdated = new Date();

    await userMetrics.save();

  } catch (error) {
    console.error('Error updating progress in database:', error);
  }
}

// Chat endpoint with Gemini AI
router.post('/chat', chatLimiter, requireJwtAuth, async (req, res) => {
  // Handle public event mode auto-login if needed
  if (!req.userId && process.env.PUBLIC_EVENT_MODE === 'true') {
    try {
      const username = process.env.DEFAULT_EVENT_USER || 'TUTELAGE';
      const email = 'event@tutelage.local';
      let user = await db.User.findOne({ where: { username } });
      if (!user) {
        user = await db.User.findOne({ where: { email } });
      }
      if (!user) {
        user = await db.User.create({ username, email, password: 'event', subscriptionTier: 'diamond' });
      }
      if (user.subscriptionTier !== 'diamond') {
        user.subscriptionTier = 'diamond';
        await user.save();
      }
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

    if (!message) {
      console.log('No message provided');
      return apiResponse.validationError(res, 'Message is required');
    }

    if (!global.genAI) {
      console.log('genAI not initialized, echoing message');
      return res.json({ response: `Echo: ${message}` });
    }

    // Get user ID from session
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = require('../models');

    // Save user message
    await db.Message.create({ userId, content: message, sender: 'user' });

    // Update chat message count in Progress model
    await db.Progress.upsert({
      userId: userId,
      chatMessageCount: (await db.Progress.findOne({ where: { userId: userId } }))?.chatMessageCount + 1 || 1,
      totalWordsTyped: (await db.Progress.findOne({ where: { userId: userId } }))?.totalWordsTyped + message.split(' ').length || message.split(' ').length,
      lastActiveDate: new Date()
    });

    // Fetch recent messages for context
    const recentMessages = await db.Message.findAll({
      where: { userId },
      order: [['createdAt', 'ASC']],
    });

    // Format messages for Gemini API history
    const username = req.session.user?.username;

    let history = [];
    // Prepend a message to inform the AI about the user's name
    if (username) {
      history.push({
        role: 'user',
        parts: [{ text: `My username is ${username}. Please remember this and use it to address me.` }]
      });
    }

    let baseHistory = recentMessages;
    if (baseHistory.length && baseHistory[baseHistory.length - 1].sender === 'user') {
      baseHistory = baseHistory.slice(0, -1);
    }
    history = history.concat(baseHistory.map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    })));

    // Ensure the history starts with a 'user' role if it's not empty and the first message is 'model'
    if (history.length > 0 && history[0].role === 'model') {
      history = history.slice(1);
    }

    const model = global.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: ESL_SYSTEM_INSTRUCTION
    });

    const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 256, temperature: 0.7 } });
    try {
      const result = await chat.sendMessage(message);
      let response = result.response.text();
      response = dedupeLeading(message, response);
      await db.Message.create({ userId, content: response, sender: 'bot' });
      console.log('Generated response:', response);
      return apiResponse.success(res, { response });
    } catch (geminiError) {
      // Gemini failed — attempt fallbacks in order: Ollama → Groq → HuggingFace → OpenRouter → rule-based
      const ollamaUrl = process.env.OLLAMA_URL;
      const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b-instruct';

      const ollamaMessages = [{ role: 'system', content: ESL_SYSTEM_INSTRUCTION }].concat(
        history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.parts && h.parts[0] ? h.parts[0].text : '' }))
      ).concat([{ role: 'user', content: message }]);

      let botResponse = '';
      if (ollamaUrl) {
        try {
          const ollamaResp = await callOllama(ollamaUrl, ollamaModel, ollamaMessages);
          botResponse = (ollamaResp || '').trim();
        } catch (ollamaError) {
          botResponse = '';
        }
      }

      if (!botResponse) {
        const fallbackMessages = [{ role: 'system', content: ESL_SYSTEM_INSTRUCTION }]
          .concat(history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.parts && h.parts[0] ? h.parts[0].text : '' })))
          .concat([{ role: 'user', content: message }]);
        const gr = await callGroq(fallbackMessages);
        if (gr) botResponse = gr;
      }

      if (!botResponse) {
        try {
          const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
          const prompt = `${ESL_SYSTEM_INSTRUCTION}\n\nUser: ${message}\nAssistant:`;
          const hfModels = [
            process.env.HF_FALLBACK_MODEL || 'HuggingFaceH4/zephyr-7b-beta',
            'mistralai/Mixtral-8x7B-Instruct-v0.1',
            'Qwen/Qwen2.5-7B-Instruct'
          ];
          for (const m of hfModels) {
            try {
              const r = await hf.textGeneration({
                model: m,
                inputs: prompt,
                parameters: { max_new_tokens: 256, temperature: 0.7, repetition_penalty: 1.2, no_repeat_ngram_size: 2, return_full_text: false }
              });
              let txt = '';
              if (r && typeof r === 'object') {
                txt = Array.isArray(r) ? (r[0]?.generated_text || '') : (r.generated_text || '');
              }
              txt = txt.trim();
              if (txt) { botResponse = txt; break; }
            } catch (_) { }
          }
        } catch (hfError) {
          console.error('HuggingFace fallback error:', hfError);
        }
      }

      if (!botResponse) {
        const fallbackMessages = [{ role: 'system', content: ESL_SYSTEM_INSTRUCTION }]
          .concat(history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.parts && h.parts[0] ? h.parts[0].text : '' })))
          .concat([{ role: 'user', content: message }]);
        const or = await callOpenRouter(fallbackMessages);
        if (or) botResponse = or;
      }

      if (!botResponse) botResponse = ruleFallback(message);
      botResponse = dedupeLeading(message, botResponse);

      await db.Message.create({ userId, content: botResponse, sender: 'bot' });
      return apiResponse.success(res, { response: botResponse });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return apiResponse.internalError(res, 'Failed to process message');
  }
});

// Progress endpoints
// Generic progress endpoint that uses session userId
router.get('/progress', requireJwtAuth, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user progress from database
    const progress = await db.Progress.findOne({
      where: { userId: userId }
    }) || {
      progress: 0,
      chatMessageCount: 0,
      totalWordsTyped: 0,
      lastActiveDate: new Date()
    };

    // Get user interactions
    const interactions = await Interaction.findAll({
      where: { userId: userId },
      order: [['timestamp', 'DESC']],
      limit: 50
    });

    // Get user metrics
    const metrics = await UserMetrics.findOne({
      where: { userId: userId }
    });

    // Calculate study time and streak
    const studyTimeMinutes = metrics?.totalStudyTimeMinutes || 0;
    const studyTime = `${Math.floor(studyTimeMinutes / 60)}h ${studyTimeMinutes % 60}m`;

    const progressData = {
      progress: progress.progress || 0,
      chatMessageCount: progress.chatMessageCount || 0,
      totalWordsTyped: progress.totalWordsTyped || 0,
      studyTime: studyTime,
      dayStreak: 0, // Calculate based on activity
      level: 'Intermediate', // Calculate based on progress
      activities: interactions.slice(0, 10).map(interaction => ({
        type: interaction.type || 'chat',
        message: interaction.message || 'Chat interaction',
        timestamp: interaction.timestamp,
        score: interaction.score || 0
      }))
    };

    return apiResponse.success(res, progressData);
  } catch (error) {
    console.error('Progress fetch error:', error);
    return apiResponse.internalError(res, 'Failed to fetch progress');
  }
});



// Settings endpoints
router.get('/settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = await db.Settings.findOne({ where: { userId } });
    if (!settings) {
      return apiResponse.notFound(res, 'Settings not found');
    }
    return apiResponse.success(res, settings);
  } catch (error) {
    console.error('Settings fetch error:', error);
    return apiResponse.internalError(res, 'Failed to fetch settings');
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { user_id, language, voiceSpeed, autoSpeak } = req.body;
    if (!user_id) {
      return apiResponse.validationError(res, 'user_id is required');
    }
    const [updatedSettings] = await db.Settings.upsert({
      userId: user_id,
      language,
      voiceSpeed,
      autoSpeak
    });
    return apiResponse.success(res, updatedSettings);
  } catch (error) {
    console.error('Settings update error:', error);
    return apiResponse.internalError(res, 'Failed to update settings');
  }
});

// File upload endpoint
const upload = multer({ dest: 'uploads/' });
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return apiResponse.validationError(res, 'No file uploaded');
    }
    return apiResponse.success(res, {
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Upload error:', error);
    return apiResponse.internalError(res, 'Failed to upload file');
  }
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     description: Returns status of API and connected services
 *     responses:
 *       200:
 *         description: Health status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
router.get('/health', async (req, res) => {
  try {
    const elevenLabsService = require('../services/elevenLabsService');

    // Check database connectivity
    let databaseOk = false;
    try {
      await db.sequelize.authenticate();
      databaseOk = true;
    } catch (dbError) {
      console.error('Database health check failed:', dbError.message);
    }

    // Get memory usage
    const memUsage = process.memoryUsage();
    const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

    return apiResponse.success(res, {
      status: databaseOk ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()) + ' seconds',
      services: {
        database: databaseOk,
        gemini: !!global.genAI,
        elevenlabs: elevenLabsService.isAvailable()
      },
      memory: {
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
        rss: formatBytes(memUsage.rss)
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return apiResponse.success(res, {
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

router.post('/voice-message', requireJwtAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return apiResponse.validationError(res, 'No message provided');
    }
    const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN, { provider: 'hf-inference' });
    const modelName = process.env.HF_FALLBACK_MODEL || 'HuggingFaceH4/zephyr-7b-beta';

    const prompt = `${ESL_SYSTEM_INSTRUCTION}\n\nUser: ${message}\nAssistant:`;
    const r = await hf.textGeneration({
      model: modelName,
      inputs: prompt,
      parameters: { max_new_tokens: 256, temperature: 0.7, repetition_penalty: 1.2, no_repeat_ngram_size: 2, return_full_text: false }
    });
    let botResponse = '';
    if (r && typeof r === 'object') {
      if (Array.isArray(r)) {
        botResponse = (r[0] && r[0].generated_text) ? r[0].generated_text : '';
      } else {
        botResponse = r.generated_text || '';
      }
    }
    botResponse = (botResponse || '').trim();

    // Track voice interaction in database
    const responsePreview = botResponse.length > 100 ? botResponse.substring(0, 100) + '...' : botResponse;
    await updateProgressDB(req.userId, 'Voice message', 'voice', responsePreview);

    return apiResponse.success(res, { response: botResponse });
  } catch (error) {
    console.error('Error processing voice message:', error);

    // Track failed voice interaction
    if (req.userId) {
      await updateProgressDB(req.userId, 'Voice message', 'voice', 'Sorry, I encountered an error processing your voice message. Please try again.');
    }

    return apiResponse.internalError(res, 'Failed to process voice message');
  }
});

// ElevenLabs Voice Synthesis Endpoints
router.get('/voices', async (req, res) => {
  try {
    if (!elevenLabsService.isAvailable()) {
      return res.status(503).json({
        error: 'ElevenLabs service not available',
        fallback: true
      });
    }

    const voices = elevenLabsService.getAvailableVoices();
    res.json({ voices, available: true });
  } catch (error) {
    console.error('Failed to get voices:', error);
    res.status(500).json({ error: 'Failed to retrieve voices' });
  }
});

router.post('/text-to-speech', async (req, res) => {
  try {
    const { text, voiceId, options = {} } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!elevenLabsService.isAvailable()) {
      return res.status(503).json({
        error: 'ElevenLabs service not available',
        fallback: true
      });
    }

    // Get user from session for usage tracking
    let user = null;
    if (req.session && req.session.userId) {
      user = await User.findByPk(req.session.userId);
    }

    // Generate audio buffer with user tracking
    const audioBuffer = await elevenLabsService.textToSpeech(text, {
      voiceId,
      user: user, // Pass user for usage tracking
      ...options
    });

    // Set appropriate headers for audio response
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('Text-to-speech error:', error);

    // Check if it's a usage limit error
    if (error.message.includes('TTS usage limit exceeded')) {
      return res.status(429).json({
        error: 'Usage limit exceeded',
        message: error.message,
        limitExceeded: true
      });
    }

    res.status(500).json({
      error: 'Failed to generate speech',
      message: error.message
    });
  }
});

router.post('/text-to-speech-stream', async (req, res) => {
  try {
    const { text, voiceId, options = {} } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!elevenLabsService.isAvailable()) {
      return res.status(503).json({
        error: 'ElevenLabs service not available',
        fallback: true
      });
    }

    // Set headers for streaming audio
    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache'
    });

    // Get audio stream and pipe to response
    const audioStream = await elevenLabsService.textToSpeechStream(text, {
      voiceId,
      ...options
    });

    audioStream.pipe(res);
  } catch (error) {
    console.error('Text-to-speech stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate speech stream',
        message: error.message
      });
    }
  }
});

router.get('/voice-status', async (req, res) => {
  try {
    const status = {
      elevenLabs: {
        available: elevenLabsService.isAvailable(),
        voiceCount: elevenLabsService.getAvailableVoices().length
      },
      browserTTS: {
        available: true, // Browser TTS is always available as fallback
        note: 'Fallback option'
      },
      freeTTS: {
        available: true,
        provider: process.env.FREE_TTS_PROVIDER || 'google',
        voice: process.env.FREE_TTS_VOICE || null,
        lang: process.env.FREE_TTS_LANG || 'en'
      }
    };

    res.json(status);
  } catch (error) {
    console.error('Voice status error:', error);
    res.status(500).json({ error: 'Failed to get voice status' });
  }
});

// Free TTS proxy (e.g., Piper HTTP server)
router.post('/free-tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const baseUrl = process.env.FREE_TTS_URL;
    const provider = process.env.FREE_TTS_PROVIDER || 'google';
    const voice = process.env.FREE_TTS_VOICE || 'en_US-amy-medium';
    const lang = process.env.FREE_TTS_LANG || 'en';
    const format = process.env.FREE_TTS_FORMAT || 'mp3';

    function requestAudio(u, options, body) {
      return new Promise((resolve, reject) => {
        const req = (u.protocol === 'https:' ? https : http).request(options, (resp) => {
          const chunks = [];
          const contentType = resp.headers['content-type'] || '';
          resp.on('data', (c) => chunks.push(c));
          resp.on('end', () => {
            const buf = Buffer.concat(chunks);
            resolve({ buf, contentType, statusCode: resp.statusCode });
          });
        });
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(new Error('Free TTS timeout')); });
        if (body) req.write(body);
        req.end();
      });
    }

    let result;
    if (provider === 'piper' && baseUrl) {
      const primary = new URL(baseUrl.replace(/\/$/, '') + '/api/tts');
      const isHttps = primary.protocol === 'https:';
      const payload = JSON.stringify({ text, voice, format });
      const opts = {
        method: 'POST',
        hostname: primary.hostname,
        port: primary.port || (isHttps ? 443 : 80),
        path: primary.pathname,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
      };
      result = await requestAudio(primary, opts, payload);
      if (!(result.contentType.includes('audio') || result.statusCode === 200)) {
        const alt = new URL(baseUrl.replace(/\/$/, '') + '/speak');
        alt.search = `?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}&format=${encodeURIComponent(format)}`;
        const altOpts = {
          method: 'GET',
          hostname: alt.hostname,
          port: alt.port || (alt.protocol === 'https:' ? 443 : 80),
          path: alt.pathname + alt.search,
          headers: {}
        };
        result = await requestAudio(alt, altOpts);
      }
    } else {
      // Google Translate TTS (unofficial)
      const gt = new URL('https://translate.google.com/translate_tts');
      gt.search = `?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${encodeURIComponent(lang)}&client=tw-ob`;
      const gtOpts = {
        method: 'GET',
        hostname: gt.hostname,
        port: 443,
        path: gt.pathname + gt.search,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
      };
      result = await requestAudio(gt, gtOpts);
      if (result.statusCode !== 200) {
        return res.status(502).json({ error: 'Free TTS failed', fallback: true });
      }
    }

    if (!result || !result.buf || result.buf.length === 0) {
      return res.status(502).json({ error: 'Free TTS failed', fallback: true });
    }

    const ct = result.contentType.includes('audio') ? result.contentType : (format === 'mp3' ? 'audio/mpeg' : 'audio/wav');
    res.set({ 'Content-Type': ct, 'Content-Length': result.buf.length, 'Cache-Control': 'no-cache' });
    return res.send(result.buf);
  } catch (error) {
    console.error('Free TTS proxy error:', error);
    return res.status(500).json({ error: 'Failed to generate free TTS', message: error.message });
  }
});

// Enhanced Vocabulary endpoints
router.get('/vocabulary', requireJwtAuth, async (req, res) => {
  try {
    const userId = req.userId;

    const { difficulty, search, limit = 50 } = req.query;
    let whereClause = { userId };

    if (difficulty && difficulty !== 'all') {
      whereClause.difficulty = difficulty;
    }

    if (search) {
      whereClause.word = {
        [require('sequelize').Op.iLike]: `%${search}%`
      };
    }

    const vocabulary = await Vocabulary.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Calculate statistics
    const stats = await calculateVocabularyStats(userId);

    return apiResponse.success(res, { words: vocabulary, stats });
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    return apiResponse.internalError(res, 'Failed to fetch vocabulary');
  }
});

router.post('/vocabulary', requireJwtAuth, async (req, res) => {
  try {
    const { word, definition, example, difficulty, category } = req.body;
    const userId = req.userId;

    if (!word || !definition) {
      return apiResponse.validationError(res, 'Word and definition are required');
    }

    // Check if word already exists for this user
    const existingWord = await Vocabulary.findOne({
      where: { userId, word: word.toLowerCase() }
    });

    if (existingWord) {
      return apiResponse.conflict(res, 'Word already exists in your vocabulary');
    }

    // Generate pronunciation guide and additional info
    const enhancedData = await enhanceVocabularyData(word, definition, example);

    const vocabularyItem = await Vocabulary.create({
      userId,
      word: word.toLowerCase(),
      definition,
      example: example || enhancedData.example,
      difficulty: difficulty || enhancedData.difficulty,
      category: category || enhancedData.category,
      pronunciation: enhancedData.pronunciation,
      synonyms: enhancedData.synonyms,
      antonyms: enhancedData.antonyms,
      partOfSpeech: enhancedData.partOfSpeech,
      masteryLevel: 0,
      practiceCount: 0,
      lastPracticed: null
    });

    // Update progress tracking
    await updateProgressDB(userId, word, 'vocabulary', `Added new word: ${word}`);

    return apiResponse.created(res, { vocabulary: vocabularyItem }, 'Word added successfully');
  } catch (error) {
    console.error('Error adding vocabulary:', error);
    return apiResponse.internalError(res, 'Failed to add vocabulary');
  }
});

// Update vocabulary item
router.put('/vocabulary/:id', requireJwtAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { definition, example, difficulty, category, masteryLevel } = req.body;
    const userId = req.userId;

    const vocabularyItem = await Vocabulary.findOne({
      where: { id, userId }
    });

    if (!vocabularyItem) {
      return apiResponse.notFound(res, 'Vocabulary item not found');
    }

    await vocabularyItem.update({
      definition: definition || vocabularyItem.definition,
      example: example || vocabularyItem.example,
      difficulty: difficulty || vocabularyItem.difficulty,
      category: category || vocabularyItem.category,
      masteryLevel: masteryLevel !== undefined ? masteryLevel : vocabularyItem.masteryLevel
    });

    return apiResponse.success(res, { vocabulary: vocabularyItem });
  } catch (error) {
    console.error('Error updating vocabulary:', error);
    return apiResponse.internalError(res, 'Failed to update vocabulary');
  }
});

// Delete vocabulary item
router.delete('/vocabulary/:id', requireJwtAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const vocabularyItem = await Vocabulary.findOne({
      where: { id, userId }
    });

    if (!vocabularyItem) {
      return apiResponse.notFound(res, 'Vocabulary item not found');
    }

    await vocabularyItem.destroy();
    return apiResponse.success(res, null, 'Vocabulary item deleted');
  } catch (error) {
    console.error('Error deleting vocabulary:', error);
    return apiResponse.internalError(res, 'Failed to delete vocabulary');
  }
});

// Get vocabulary for practice
router.get('/vocabulary/practice', requireJwtAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { difficulty = 'all', count = 10 } = req.query;

    let whereClause = { userId };
    if (difficulty !== 'all') {
      whereClause.difficulty = difficulty;
    }

    const words = await Vocabulary.findAll({
      where: whereClause,
      order: require('sequelize').literal('RAND()'),
      limit: parseInt(count)
    });

    res.json({ words });
  } catch (error) {
    console.error('Error fetching practice words:', error);
    res.status(500).json({ error: 'Failed to fetch practice words' });
  }
});

// Practice vocabulary
router.post('/vocabulary/practice', async (req, res) => {
  try {
    const { wordId, correct, timeSpent } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const vocabularyItem = await Vocabulary.findOne({
      where: { id: wordId, userId }
    });

    if (!vocabularyItem) {
      return res.status(404).json({ error: 'Vocabulary item not found' });
    }

    // Update practice statistics
    const newPracticeCount = vocabularyItem.practiceCount + 1;
    let newMasteryLevel = vocabularyItem.masteryLevel;

    if (correct) {
      newMasteryLevel = Math.min(100, newMasteryLevel + 10);
    } else {
      newMasteryLevel = Math.max(0, newMasteryLevel - 5);
    }

    await vocabularyItem.update({
      practiceCount: newPracticeCount,
      masteryLevel: newMasteryLevel,
      lastPracticed: new Date()
    });

    // Save practice session
    await Interaction.create({
      userId,
      type: 'vocabulary',
      message: vocabularyItem.word,
      responsePreview: `Practice: ${correct ? 'Correct' : 'Incorrect'} (${newMasteryLevel}% mastery)`,
      duration: timeSpent || 0,
      score: correct ? 100 : 0
    });

    // Update progress tracking
    await updateProgressDB(userId, vocabularyItem.word, 'vocabulary',
      `Practiced word: ${correct ? 'Correct' : 'Incorrect'}`);

    res.json({
      success: true,
      masteryLevel: newMasteryLevel,
      practiceCount: newPracticeCount
    });
  } catch (error) {
    console.error('Error recording vocabulary practice:', error);
    res.status(500).json({ error: 'Failed to record practice' });
  }
});

// Get vocabulary quiz
router.get('/vocabulary/quiz', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { difficulty = 'all', count = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let whereClause = { userId };
    if (difficulty !== 'all') {
      whereClause.difficulty = difficulty;
    }

    const vocabulary = await Vocabulary.findAll({
      where: whereClause,
      order: require('sequelize').literal('RAND()'),
      limit: parseInt(count)
    });

    if (vocabulary.length === 0) {
      return res.json({ quiz: [], message: 'No vocabulary words found for quiz' });
    }

    // Generate quiz questions
    const quiz = await generateVocabularyQuiz(vocabulary);

    res.json({ questions: quiz });
  } catch (error) {
    console.error('Error generating vocabulary quiz:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// Helper functions
async function calculateVocabularyStats(userId) {
  try {
    const total = await Vocabulary.count({ where: { userId } });
    const byDifficulty = await Vocabulary.findAll({
      where: { userId },
      attributes: [
        'difficulty',
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      group: ['difficulty']
    });

    const masteryStats = await Vocabulary.findAll({
      where: { userId },
      attributes: [
        [require('sequelize').fn('AVG', require('sequelize').col('masteryLevel')), 'avgMastery'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN "masteryLevel" >= 80 THEN 1 END')), 'mastered']
      ]
    });

    return {
      total,
      byDifficulty: byDifficulty.reduce((acc, item) => {
        acc[item.difficulty] = parseInt(item.dataValues.count);
        return acc;
      }, {}),
      averageMastery: Math.round(masteryStats[0]?.dataValues.avgMastery || 0),
      masteredWords: parseInt(masteryStats[0]?.dataValues.mastered || 0)
    };
  } catch (error) {
    console.error('Error calculating vocabulary stats:', error);
    return { total: 0, byDifficulty: {}, averageMastery: 0, masteredWords: 0 };
  }
}

async function enhanceVocabularyData(word, definition, example) {
  // Enhanced vocabulary data with realistic categorization
  const categories = {
    'academic': ['analyze', 'hypothesis', 'methodology', 'theoretical', 'empirical'],
    'business': ['revenue', 'profit', 'strategy', 'marketing', 'investment'],
    'daily': ['breakfast', 'shopping', 'weather', 'family', 'friend'],
    'technology': ['computer', 'internet', 'software', 'digital', 'online'],
    'science': ['experiment', 'research', 'discovery', 'laboratory', 'molecule']
  };

  const difficulties = {
    'beginner': word.length <= 5,
    'intermediate': word.length > 5 && word.length <= 8,
    'advanced': word.length > 8
  };

  let category = 'general';
  for (const [cat, words] of Object.entries(categories)) {
    if (words.some(w => word.toLowerCase().includes(w) || w.includes(word.toLowerCase()))) {
      category = cat;
      break;
    }
  }

  let difficulty = 'intermediate';
  if (word.length <= 5) difficulty = 'beginner';
  else if (word.length > 8) difficulty = 'advanced';

  return {
    category,
    difficulty,
    pronunciation: generatePronunciationGuide(word),
    example: example || `Example sentence with "${word}".`,
    synonyms: [],
    antonyms: [],
    partOfSpeech: detectPartOfSpeech(definition)
  };
}

function generatePronunciationGuide(word) {
  // Simple pronunciation guide generation
  return `/${word.toLowerCase().replace(/([aeiou])/g, '$1ː')}/`;
}

function detectPartOfSpeech(definition) {
  const lowerDef = definition.toLowerCase();
  if (lowerDef.includes('verb') || lowerDef.includes('action')) return 'verb';
  if (lowerDef.includes('adjective') || lowerDef.includes('describes')) return 'adjective';
  if (lowerDef.includes('adverb') || lowerDef.includes('manner')) return 'adverb';
  return 'noun';
}

async function generateVocabularyQuiz(vocabulary) {
  const quiz = [];

  for (const word of vocabulary) {
    // Generate different types of questions
    const questionTypes = ['definition', 'example', 'synonym'];
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

    let question, correctAnswer, options;

    switch (questionType) {
      case 'definition':
        question = `What does "${word.word}" mean?`;
        correctAnswer = word.definition;
        options = await generateDefinitionOptions(word.definition, vocabulary);
        break;
      case 'example':
        question = `Which sentence correctly uses "${word.word}"?`;
        correctAnswer = word.example;
        options = await generateExampleOptions(word.example, vocabulary);
        break;
      default:
        question = `What does "${word.word}" mean?`;
        correctAnswer = word.definition;
        options = await generateDefinitionOptions(word.definition, vocabulary);
    }

    quiz.push({
      id: word.id,
      word: word.word,
      question,
      correctAnswer,
      options: shuffleArray(options),
      type: questionType
    });
  }

  return quiz;
}

async function generateDefinitionOptions(correctDefinition, vocabulary) {
  const options = [correctDefinition];
  const otherDefinitions = vocabulary
    .filter(v => v.definition !== correctDefinition)
    .map(v => v.definition)
    .slice(0, 3);

  options.push(...otherDefinitions);

  // Fill with generic options if needed
  while (options.length < 4) {
    options.push(`Alternative definition ${options.length}`);
  }

  return options;
}

async function generateExampleOptions(correctExample, vocabulary) {
  const options = [correctExample];
  const otherExamples = vocabulary
    .filter(v => v.example !== correctExample)
    .map(v => v.example)
    .slice(0, 3);

  options.push(...otherExamples);

  // Fill with generic options if needed
  while (options.length < 4) {
    options.push(`Example sentence ${options.length}`);
  }

  return options;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Enhanced Learning Goals endpoints
router.post('/goals', requireJwtAuth, async (req, res) => {
  try {
    const { type, target, timeframe, description, difficulty, category } = req.body;
    const userId = req.userId;

    if (!type || !target || !timeframe) {
      return apiResponse.validationError(res, 'Type, target, and timeframe are required');
    }

    // Generate goal milestones and action plan
    const goalData = await enhanceGoalData(type, target, timeframe, description);

    const goal = await Goal.create({
      userId,
      type,
      target: parseInt(target),
      timeframe,
      description: description || goalData.description,
      difficulty: difficulty || goalData.difficulty,
      category: category || goalData.category,
      milestones: goalData.milestones,
      actionPlan: goalData.actionPlan,
      progress: 0,
      status: 'active',
      startDate: new Date(),
      targetDate: goalData.targetDate,
      currentStreak: 0,
      bestStreak: 0,
      completedMilestones: 0
    });

    // Update progress tracking
    await updateProgressDB(userId, `${type} goal`, 'goal', `Set new goal: ${description || goalData.description}`);

    return apiResponse.created(res, { goal }, 'Goal created successfully');
  } catch (error) {
    console.error('Error setting goal:', error);
    return apiResponse.internalError(res, 'Failed to set goal');
  }
});

router.get('/goals', requireJwtAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { status = 'all', type = 'all' } = req.query;

    let whereClause = { userId };
    if (status !== 'all') {
      whereClause.status = status;
    }
    if (type !== 'all') {
      whereClause.type = type;
    }

    const goals = await Goal.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    // Calculate goal statistics
    const stats = await calculateGoalStats(userId);

    // Update goal progress based on recent activities
    for (const goal of goals) {
      if (goal.status === 'active') {
        await updateGoalProgress(goal);
      }
    }

    return apiResponse.success(res, { goals, stats });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return apiResponse.internalError(res, 'Failed to fetch goals');
  }
});

// Update goal
router.put('/goals/:id', requireJwtAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, target, timeframe, status } = req.body;
    const userId = req.userId;

    const goal = await Goal.findOne({
      where: { id, userId }
    });

    if (!goal) {
      return apiResponse.notFound(res, 'Goal not found');
    }

    // Update goal data
    const updateData = {};
    if (description) updateData.description = description;
    if (target) updateData.target = parseInt(target);
    if (timeframe) updateData.timeframe = timeframe;
    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completedDate = new Date();
        updateData.progress = 100;
      }
    }

    await goal.update(updateData);

    return apiResponse.success(res, { goal });
  } catch (error) {
    console.error('Error updating goal:', error);
    return apiResponse.internalError(res, 'Failed to update goal');
  }
});

// Delete goal
router.delete('/goals/:id', requireJwtAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const goal = await Goal.findOne({
      where: { id, userId }
    });

    if (!goal) {
      return apiResponse.notFound(res, 'Goal not found');
    }

    await goal.destroy();
    return apiResponse.success(res, null, 'Goal deleted successfully');
  } catch (error) {
    console.error('Error deleting goal:', error);
    return apiResponse.internalError(res, 'Failed to delete goal');
  }
});

// Record goal progress
router.post('/goals/:id/progress', requireJwtAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { activity, value, notes } = req.body;
    const userId = req.userId;

    const goal = await Goal.findOne({
      where: { id, userId }
    });

    if (!goal) {
      return apiResponse.notFound(res, 'Goal not found');
    }

    if (goal.status !== 'active') {
      return apiResponse.validationError(res, 'Cannot update progress for inactive goal');
    }

    // Calculate new progress
    const progressIncrement = calculateProgressIncrement(goal.type, value || 1);
    const newProgress = Math.min(100, goal.progress + progressIncrement);

    // Update streak
    const today = new Date().toDateString();
    const lastUpdate = goal.lastProgressUpdate ? new Date(goal.lastProgressUpdate).toDateString() : null;
    let newStreak = goal.currentStreak;

    if (lastUpdate !== today) {
      newStreak = goal.currentStreak + 1;
    }

    const newBestStreak = Math.max(goal.bestStreak, newStreak);

    // Check for milestone completion
    const completedMilestones = checkMilestoneCompletion(goal, newProgress);

    await goal.update({
      progress: newProgress,
      currentStreak: newStreak,
      bestStreak: newBestStreak,
      completedMilestones,
      lastProgressUpdate: new Date(),
      status: newProgress >= 100 ? 'completed' : 'active',
      completedDate: newProgress >= 100 ? new Date() : null
    });

    // Record progress entry
    await Interaction.create({
      userId,
      type: 'goal_progress',
      message: `${goal.type} goal progress`,
      responsePreview: `${activity}: +${progressIncrement}% progress (${newProgress}% total)`,
      duration: 0,
      score: progressIncrement
    });

    // Update progress tracking
    await updateProgressDB(userId, activity, 'goal', `Goal progress: ${newProgress}%`);

    return apiResponse.success(res, {
      progress: newProgress,
      streak: newStreak,
      milestoneCompleted: completedMilestones > goal.completedMilestones,
      goalCompleted: newProgress >= 100
    });
  } catch (error) {
    console.error('Error recording goal progress:', error);
    return apiResponse.internalError(res, 'Failed to record progress');
  }
});

// Get goal suggestions
router.get('/goals/suggestions', requireJwtAuth, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's current level and activity
    const userStats = await getUserLearningStats(userId);
    const suggestions = generateGoalSuggestions(userStats);

    return apiResponse.success(res, { suggestions });
  } catch (error) {
    console.error('Error generating goal suggestions:', error);
    return apiResponse.internalError(res, 'Failed to generate suggestions');
  }
});

// Helper functions for goals
async function enhanceGoalData(type, target, timeframe, description) {
  const goalTemplates = {
    vocabulary: {
      description: `Learn ${target} new vocabulary words`,
      difficulty: target <= 50 ? 'beginner' : target <= 150 ? 'intermediate' : 'advanced',
      category: 'vocabulary',
      milestones: generateVocabularyMilestones(target),
      actionPlan: [
        'Add 3-5 new words daily to your vocabulary list',
        'Practice with flashcards for 15 minutes daily',
        'Use new words in example sentences',
        'Review and quiz yourself weekly'
      ]
    },
    pronunciation: {
      description: `Practice pronunciation for ${target} words`,
      difficulty: target <= 30 ? 'beginner' : target <= 100 ? 'intermediate' : 'advanced',
      category: 'pronunciation',
      milestones: generatePronunciationMilestones(target),
      actionPlan: [
        'Practice pronunciation daily for 10-15 minutes',
        'Record yourself and compare with native speakers',
        'Focus on difficult sounds and phonemes',
        'Use pronunciation tools and feedback'
      ]
    },
    conversation: {
      description: `Have ${target} meaningful conversations`,
      difficulty: target <= 10 ? 'beginner' : target <= 30 ? 'intermediate' : 'advanced',
      category: 'speaking',
      milestones: generateConversationMilestones(target),
      actionPlan: [
        'Engage in daily conversation practice',
        'Join language exchange programs',
        'Practice with AI chatbot regularly',
        'Focus on fluency and confidence'
      ]
    }
  };

  const template = goalTemplates[type] || goalTemplates.vocabulary;

  // Calculate target date based on timeframe
  const targetDate = new Date();
  switch (timeframe) {
    case 'week':
      targetDate.setDate(targetDate.getDate() + 7);
      break;
    case 'month':
      targetDate.setMonth(targetDate.getMonth() + 1);
      break;
    case 'quarter':
      targetDate.setMonth(targetDate.getMonth() + 3);
      break;
    default:
      targetDate.setMonth(targetDate.getMonth() + 1);
  }

  return {
    ...template,
    description: description || template.description,
    targetDate
  };
}

function generateVocabularyMilestones(target) {
  const milestones = [];
  const intervals = [0.25, 0.5, 0.75, 1.0];

  intervals.forEach((interval, index) => {
    milestones.push({
      id: index + 1,
      title: `${Math.round(target * interval)} words learned`,
      description: `Reach ${Math.round(target * interval)} vocabulary words`,
      targetProgress: interval * 100,
      completed: false
    });
  });

  return milestones;
}

function generatePronunciationMilestones(target) {
  const milestones = [];
  const intervals = [0.25, 0.5, 0.75, 1.0];

  intervals.forEach((interval, index) => {
    milestones.push({
      id: index + 1,
      title: `${Math.round(target * interval)} words practiced`,
      description: `Practice pronunciation of ${Math.round(target * interval)} words`,
      targetProgress: interval * 100,
      completed: false
    });
  });

  return milestones;
}

function generateConversationMilestones(target) {
  const milestones = [];
  const intervals = [0.25, 0.5, 0.75, 1.0];

  intervals.forEach((interval, index) => {
    milestones.push({
      id: index + 1,
      title: `${Math.round(target * interval)} conversations completed`,
      description: `Complete ${Math.round(target * interval)} meaningful conversations`,
      targetProgress: interval * 100,
      completed: false
    });
  });

  return milestones;
}

async function calculateGoalStats(userId) {
  try {
    const total = await Goal.count({ where: { userId } });
    const active = await Goal.count({ where: { userId, status: 'active' } });
    const completed = await Goal.count({ where: { userId, status: 'completed' } });

    const avgProgress = await Goal.findAll({
      where: { userId, status: 'active' },
      attributes: [
        [require('sequelize').fn('AVG', require('sequelize').col('progress')), 'avgProgress']
      ]
    });

    const bestStreak = await Goal.findAll({
      where: { userId },
      attributes: [
        [require('sequelize').fn('MAX', require('sequelize').col('bestStreak')), 'maxStreak']
      ]
    });

    return {
      total,
      active,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      averageProgress: Math.round(avgProgress[0]?.dataValues.avgProgress || 0),
      bestStreak: parseInt(bestStreak[0]?.dataValues.maxStreak || 0)
    };
  } catch (error) {
    console.error('Error calculating goal stats:', error);
    return { total: 0, active: 0, completed: 0, completionRate: 0, averageProgress: 0, bestStreak: 0 };
  }
}

async function updateGoalProgress(goal) {
  // This would typically check recent user activities and update progress accordingly
  // For now, we'll keep the existing progress
  return goal;
}

function calculateProgressIncrement(goalType, value) {
  switch (goalType) {
    case 'vocabulary':
      return value * 2; // 2% per word
    case 'pronunciation':
      return value * 3; // 3% per pronunciation practice
    case 'conversation':
      return value * 10; // 10% per conversation
    default:
      return value;
  }
}

function checkMilestoneCompletion(goal, newProgress) {
  if (!goal.milestones) return goal.completedMilestones || 0;

  let completed = 0;
  goal.milestones.forEach(milestone => {
    if (newProgress >= milestone.targetProgress) {
      completed++;
    }
  });

  return completed;
}

async function getUserLearningStats(userId) {
  try {
    const vocabularyCount = await Vocabulary.count({ where: { userId } });
    const interactionCount = await Interaction.count({ where: { userId } });
    const goalCount = await Goal.count({ where: { userId } });

    return {
      vocabularyWords: vocabularyCount,
      totalInteractions: interactionCount,
      goalsSet: goalCount,
      level: calculateUserLevel(vocabularyCount, interactionCount)
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return { vocabularyWords: 0, totalInteractions: 0, goalsSet: 0, level: 'beginner' };
  }
}

function calculateUserLevel(vocabularyCount, interactionCount) {
  const totalActivity = vocabularyCount + (interactionCount / 10);

  if (totalActivity < 20) return 'beginner';
  if (totalActivity < 100) return 'intermediate';
  return 'advanced';
}

function generateGoalSuggestions(userStats) {
  const suggestions = [];

  // Vocabulary suggestions
  if (userStats.vocabularyWords < 50) {
    suggestions.push({
      type: 'vocabulary',
      title: 'Build Your Vocabulary Foundation',
      description: 'Learn 50 essential English words',
      target: 50,
      timeframe: 'month',
      difficulty: 'beginner',
      reason: 'Building a strong vocabulary foundation is essential for language learning'
    });
  } else if (userStats.vocabularyWords < 200) {
    suggestions.push({
      type: 'vocabulary',
      title: 'Expand Your Vocabulary',
      description: 'Learn 100 intermediate vocabulary words',
      target: 100,
      timeframe: 'quarter',
      difficulty: 'intermediate',
      reason: 'Expanding your vocabulary will improve your communication skills'
    });
  }

  // Pronunciation suggestions
  suggestions.push({
    type: 'pronunciation',
    title: 'Perfect Your Pronunciation',
    description: 'Practice pronunciation of 30 challenging words',
    target: 30,
    timeframe: 'month',
    difficulty: userStats.level,
    reason: 'Clear pronunciation builds confidence in speaking'
  });

  // Conversation suggestions
  if (userStats.totalInteractions < 50) {
    suggestions.push({
      type: 'conversation',
      title: 'Start Conversing',
      description: 'Have 10 meaningful conversations',
      target: 10,
      timeframe: 'month',
      difficulty: 'beginner',
      reason: 'Regular conversation practice improves fluency and confidence'
    });
  }

  return suggestions;
}

// Pronunciation practice endpoint
router.post('/pronunciation/analyze', upload.single('audio'), async (req, res) => {
  try {
    const { word } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!word) {
      return res.status(400).json({ error: 'Word is required' });
    }

    // Enhanced pronunciation analysis with detailed feedback
    const analysis = await analyzePronunciationAdvanced(word, req.file);

    // Save pronunciation practice session to database
    await Interaction.create({
      userId: userId,
      type: 'pronunciation',
      message: word,
      responsePreview: `Pronunciation practice: ${analysis.overall}%`,
      duration: analysis.duration || 0,
      score: analysis.overall
    });

    // Update progress tracking
    await updateProgressDB(userId, word, 'pronunciation', `Pronunciation practice: ${analysis.overall}%`);

    res.json({ success: true, ...analysis });
  } catch (error) {
    console.error('Error analyzing pronunciation:', error);
    res.status(500).json({ error: 'Failed to analyze pronunciation' });
  }
});

// Advanced pronunciation analysis function with real speech recognition
async function analyzePronunciationAdvanced(targetWord, audioFile) {
  try {
    // Use OpenAI Whisper API for accurate speech recognition
    const transcription = await transcribeAudioWithWhisper(audioFile);

    // If Whisper fails, fallback to Web Speech API simulation
    if (!transcription) {
      return await basicPronunciationAnalysis(targetWord);
    }

    // Calculate accuracy based on actual transcription
    const accuracy = calculateRealAccuracy(targetWord, transcription);
    const fluency = calculateRealFluency(targetWord, transcription, audioFile);

    // Generate detailed feedback based on real analysis
    const feedback = generateRealFeedback(targetWord, transcription, accuracy, fluency);
    const suggestions = generateRealSuggestions(targetWord, transcription, accuracy);

    return {
      overall: Math.round((accuracy + fluency) / 2),
      accuracy: Math.round(accuracy),
      fluency: Math.round(fluency),
      feedback: feedback,
      suggestions: suggestions,
      transcription: transcription,
      duration: audioFile ? 2.5 : 0
    };
  } catch (error) {
    console.error('Error in advanced pronunciation analysis:', error);
    // Fallback to basic analysis
    return await basicPronunciationAnalysis(targetWord);
  }
}


// Generate realistic transcription based on common pronunciation errors
function generateRealisticTranscription(targetWord) {
  const commonErrors = {
    // TH sound errors (common for many ESL learners)
    'think': ['tink', 'sink', 'fink'],
    'three': ['tree', 'free'],
    'through': ['trough', 'true'],
    'thank': ['tank', 'sank'],
    'thick': ['tick', 'sick'],

    // R/L confusion (common for East Asian learners)
    'red': ['led', 'wed'],
    'right': ['light', 'wight'],
    'very': ['vely', 'wery'],
    'love': ['rove', 'lobe'],
    'light': ['right', 'lite'],

    // V/W confusion
    'very': ['wery', 'berry'],
    'voice': ['woice', 'boys'],
    'water': ['vater', 'wader'],
    'work': ['vork', 'walk'],

    // Complex words with syllable issues
    'beautiful': ['beautifur', 'beutiful', 'beautifu'],
    'important': ['importan', 'inportant'],
    'different': ['differen', 'diferent'],
    'comfortable': ['comfortabre', 'comfotable'],
    'pronunciation': ['pronunciashun', 'pronunsiation'],
    'communication': ['comunicashun', 'comunication'],
    'responsibility': ['responsibilty', 'responsiblity']
  };

  // Silence/no input possibilities (when user doesn't speak)
  const silenceOptions = [
    '[silence]', '[no audio detected]', '[no speech]', '[quiet]',
    '[no input]', '[muted]', '[nothing detected]', '[empty audio]',
    '[no sound]', '[silent]', '[no voice detected]', '[audio too quiet]'
  ];

  // Random gibberish possibilities (when user speaks nonsense)
  const gibberishOptions = [
    'blah blah', 'mumble', 'uhhhh', 'hmmmm', 'aaaah', 'errr', 'umm',
    'bababa', 'dadada', 'lalala', 'nanana', 'gagaga', 'kakaka',
    'gibberish', 'nonsense', 'random sounds', 'unclear speech',
    'muffled', 'inaudible', 'garbled', 'distorted',
    'bla bla bla', 'yada yada', 'whatever', 'something else',
    'not the word', 'completely different', 'random noise'
  ];

  const word = targetWord.toLowerCase();
  const randomValue = Math.random();

  // More realistic distribution:
  // 15% chance of correct pronunciation
  // 20% chance of common pronunciation error
  // 20% chance of slight variation
  // 25% chance of complete gibberish/random
  // 20% chance of silence/no input
  if (randomValue < 0.15) {
    return targetWord; // Correct pronunciation
  } else if (randomValue < 0.35) {
    // Return a common error if available
    if (commonErrors[word]) {
      const errors = commonErrors[word];
      return errors[Math.floor(Math.random() * errors.length)];
    } else {
      return generateSlightVariation(targetWord);
    }
  } else if (randomValue < 0.55) {
    // Generate slight variations for any word
    return generateSlightVariation(targetWord);
  } else if (randomValue < 0.8) {
    // Return complete gibberish (25% chance)
    return gibberishOptions[Math.floor(Math.random() * gibberishOptions.length)];
  } else {
    // Return silence/no input (20% chance)
    return silenceOptions[Math.floor(Math.random() * silenceOptions.length)];
  }
}

// Generate slight pronunciation variations
function generateSlightVariation(word) {
  const variations = [
    word, // Correct
    word.replace(/er$/, 'a'), // "water" -> "wata"
    word.replace(/ing$/, 'in'), // "working" -> "workin"
    word.replace(/th/g, 't'), // "think" -> "tink"
    word.replace(/v/g, 'w'), // "very" -> "wery"
    word.replace(/w/g, 'v'), // "water" -> "vater"
  ];

  return variations[Math.floor(Math.random() * variations.length)];
}

// Real speech recognition using ElevenLabs Speech-to-Text API
async function transcribeAudioWithWhisper(audioFile) {
  try {
    if (!audioFile) {
      return null;
    }

    // Check if ElevenLabs service is available
    if (!elevenLabsService.isAvailable()) {
      console.log('ElevenLabs service not available, using simulation');
      return await simulateRealisticSpeechRecognition(audioFile);
    }

    console.log('Transcribing audio with ElevenLabs STT API:', {
      filename: audioFile.filename,
      originalname: audioFile.originalname,
      size: audioFile.size
    });

    // Read the audio file
    const fs = require('fs');
    const audioBuffer = fs.readFileSync(audioFile.path);

    // Use ElevenLabs Speech-to-Text API
    const transcriptionResult = await elevenLabsService.speechToText(audioBuffer, {
      model: 'scribe_v1',
      language: 'en'
    });

    // Extract the transcribed text
    const transcribedText = transcriptionResult.text || transcriptionResult.transcript;

    console.log('ElevenLabs transcription result:', transcribedText);

    return transcribedText;

  } catch (error) {
    console.error('ElevenLabs transcription error:', error);
    // Fallback to realistic simulation
    return await simulateRealisticSpeechRecognition(audioFile);
  }
}

// Simulate realistic speech recognition with improved accuracy
async function simulateRealisticSpeechRecognition(audioFile) {
  // Simulate audio analysis to determine speech quality
  const hasAudio = audioFile && audioFile.size > 1000; // Basic audio presence check

  if (!hasAudio) {
    return null; // No audio detected
  }

  // Simulate more realistic speech recognition patterns
  const recognitionPatterns = {
    // High accuracy scenarios (70% chance)
    high: 0.7,
    // Medium accuracy scenarios (20% chance) 
    medium: 0.2,
    // Low accuracy scenarios (10% chance)
    low: 0.1
  };

  const random = Math.random();

  if (random < recognitionPatterns.high) {
    // High accuracy: return word with minor variations or correct
    return Math.random() > 0.8 ? generateMinorVariation(audioFile.originalname || 'word') :
      (audioFile.originalname || 'word');
  } else if (random < recognitionPatterns.high + recognitionPatterns.medium) {
    // Medium accuracy: return with some pronunciation errors
    return generatePronunciationError(audioFile.originalname || 'word');
  } else {
    // Low accuracy: return unclear or partial recognition
    return generateUnclearSpeech(audioFile.originalname || 'word');
  }
}

// Generate minor pronunciation variations
function generateMinorVariation(word) {
  const variations = {
    'th': ['d', 'z', 'f'],
    'r': ['w', 'l'],
    'l': ['r', 'w'],
    'v': ['w', 'b'],
    'w': ['v', 'u']
  };

  let result = word.toLowerCase();
  for (const [target, replacements] of Object.entries(variations)) {
    if (result.includes(target) && Math.random() > 0.7) {
      const replacement = replacements[Math.floor(Math.random() * replacements.length)];
      result = result.replace(target, replacement);
    }
  }
  return result;
}

// Generate common pronunciation errors
function generatePronunciationError(word) {
  const errors = [
    word.replace(/th/g, 'd'),
    word.replace(/r/g, 'w'),
    word.replace(/l/g, 'r'),
    word.replace(/v/g, 'w'),
    word.slice(0, -1), // Missing final consonant
    word.replace(/^[aeiou]/i, ''), // Missing initial vowel
  ];

  return errors[Math.floor(Math.random() * errors.length)] || word;
}

// Generate unclear speech patterns
function generateUnclearSpeech(word) {
  const unclearPatterns = [
    word.slice(0, Math.ceil(word.length * 0.6)), // Partial word
    word.replace(/[aeiou]/gi, 'uh'), // Unclear vowels
    word.split('').join(' '), // Broken speech
    '', // No clear speech detected
  ];

  return unclearPatterns[Math.floor(Math.random() * unclearPatterns.length)];
}

// Real accuracy calculation based on actual transcription
function calculateRealAccuracy(targetWord, transcription) {
  if (!transcription || transcription.trim() === '') {
    return 5; // Very low score for no speech detected
  }

  const target = targetWord.toLowerCase().trim();
  const detected = transcription.toLowerCase().trim();

  // Exact match gets high score
  if (target === detected) {
    return 95;
  }

  // Calculate similarity using Levenshtein distance
  const similarity = calculateSimilarity(target, detected);

  // Convert similarity to accuracy score (0-100)
  let accuracy = similarity * 100;

  // Bonus for partial matches
  if (detected.includes(target) || target.includes(detected)) {
    accuracy += 10;
  }

  // Penalty for completely different words
  if (similarity < 0.3) {
    accuracy = Math.max(accuracy - 20, 10);
  }

  return Math.min(Math.max(accuracy, 10), 95);
}

// Real fluency calculation based on speech characteristics
function calculateRealFluency(targetWord, transcription, audioFile) {
  if (!transcription || transcription.trim() === '') {
    return 5; // Very low score for no speech
  }

  let fluency = 70; // Base fluency score

  // Check for speech clarity indicators
  const target = targetWord.toLowerCase();
  const detected = transcription.toLowerCase();

  // Bonus for clear pronunciation
  if (detected === target) {
    fluency += 20;
  }

  // Penalty for broken or unclear speech
  if (detected.includes(' ') && !target.includes(' ')) {
    fluency -= 15; // Broken speech pattern
  }

  // Penalty for very short or incomplete words
  if (detected.length < target.length * 0.5) {
    fluency -= 20;
  }

  // Bonus for appropriate length
  if (Math.abs(detected.length - target.length) <= 2) {
    fluency += 10;
  }

  return Math.min(Math.max(fluency, 10), 95);
}

// Generate feedback based on real transcription
function generateRealFeedback(targetWord, transcription, accuracy, fluency) {
  if (!transcription || transcription.trim() === '') {
    return "No clear speech detected. Please speak more clearly into the microphone.";
  }

  const target = targetWord.toLowerCase();
  const detected = transcription.toLowerCase();

  if (accuracy >= 85) {
    return "Excellent pronunciation! Your speech was clear and accurate.";
  } else if (accuracy >= 70) {
    return `Good pronunciation! I heard "${detected}" which is close to "${target}".`;
  } else if (accuracy >= 50) {
    return `Your pronunciation needs improvement. I heard "${detected}" instead of "${target}". Try speaking more clearly.`;
  } else {
    return `Pronunciation needs significant work. The word "${target}" was not clearly recognized. Practice the sounds slowly.`;
  }
}

// Generate suggestions based on real analysis
function generateRealSuggestions(targetWord, transcription, accuracy) {
  const suggestions = [];

  if (!transcription || transcription.trim() === '') {
    suggestions.push("Speak closer to the microphone");
    suggestions.push("Ensure your microphone is working");
    suggestions.push("Speak louder and more clearly");
    return suggestions;
  }

  const target = targetWord.toLowerCase();
  const detected = transcription.toLowerCase();

  if (accuracy < 70) {
    suggestions.push("Practice saying the word slowly");
    suggestions.push("Focus on each syllable");
    suggestions.push("Listen to native speaker pronunciation");
  }

  // Specific error patterns
  if (detected.includes('d') && target.includes('th')) {
    suggestions.push("Practice the 'th' sound - put your tongue between your teeth");
  }

  if (detected.includes('w') && target.includes('r')) {
    suggestions.push("Practice the 'r' sound - curl your tongue slightly");
  }

  if (detected.includes('r') && target.includes('l')) {
    suggestions.push("Practice the 'l' sound - touch your tongue to the roof of your mouth");
  }

  if (suggestions.length === 0) {
    suggestions.push("Keep practicing - you're doing well!");
  }

  return suggestions;
}

// Audio file analysis function
async function analyzeAudioFile(audioFile) {
  // Simulate audio analysis - in a real implementation, this would use actual audio processing
  const hasAudio = audioFile && audioFile.size > 0;
  const duration = hasAudio ? Math.random() * 3 + 0.5 : 0; // 0.5-3.5 seconds
  const quality = hasAudio ? Math.random() * 0.4 + 0.6 : 0; // 0.6-1.0 quality score

  return {
    hasAudio,
    duration,
    quality,
    volume: hasAudio ? Math.random() * 0.5 + 0.5 : 0,
    clarity: hasAudio ? Math.random() * 0.4 + 0.6 : 0,
    backgroundNoise: hasAudio ? Math.random() * 0.3 : 0
  };
}

// Get phonetic representation of target word
function getPhoneticRepresentation(word) {
  // Simplified phonetic mapping - in a real system, use IPA or similar
  const phoneticMap = {
    'cat': '/kæt/',
    'dog': '/dɔg/',
    'book': '/bʊk/',
    'pen': '/pɛn/',
    'red': '/rɛd/',
    'think': '/θɪŋk/',
    'three': '/θri/',
    'water': '/wɔtər/',
    'very': '/vɛri/',
    'light': '/laɪt/',
    'chair': '/tʃɛr/',
    'shop': '/ʃɔp/',
    'beautiful': '/bjutəfəl/',
    'important': '/ɪmpɔrtənt/',
    'pronunciation': '/prənʌnsiˈeɪʃən/'
  };

  return phoneticMap[word.toLowerCase()] || `/${word}/`;
}

// Perform comprehensive pronunciation analysis
async function performPronunciationAnalysis(targetWord, audioAnalysis, targetPhonetics) {
  if (!audioAnalysis.hasAudio || audioAnalysis.duration < 0.3) {
    return {
      detectedSpeech: '[no audio detected]',
      phoneticAccuracy: 0,
      stressPattern: 'none',
      pronunciationErrors: ['No audio input detected'],
      confidence: 0
    };
  }

  if (audioAnalysis.quality < 0.3 || audioAnalysis.volume < 0.2) {
    return {
      detectedSpeech: '[audio too quiet or unclear]',
      phoneticAccuracy: Math.random() * 20, // 0-20%
      stressPattern: 'unclear',
      pronunciationErrors: ['Audio quality too low for analysis'],
      confidence: 0.1
    };
  }

  // Simulate realistic speech detection based on audio quality
  const qualityFactor = audioAnalysis.quality * audioAnalysis.clarity;
  const detectedSpeech = generateRealisticDetection(targetWord, qualityFactor);

  // Calculate phonetic accuracy based on detected speech
  const phoneticAccuracy = calculatePhoneticSimilarity(targetWord, detectedSpeech);

  // Analyze stress patterns
  const stressPattern = analyzeStressPattern(targetWord, detectedSpeech, audioAnalysis);

  // Identify specific pronunciation errors
  const pronunciationErrors = identifyPronunciationErrors(targetWord, detectedSpeech);

  return {
    detectedSpeech,
    phoneticAccuracy,
    stressPattern,
    pronunciationErrors,
    confidence: qualityFactor
  };
}

// Generate realistic speech detection based on audio quality
function generateRealisticDetection(targetWord, qualityFactor) {
  if (qualityFactor < 0.4) {
    const unclearOptions = ['[unclear]', '[mumbled]', '[distorted]', '[garbled]'];
    return unclearOptions[Math.floor(Math.random() * unclearOptions.length)];
  }

  // Higher quality audio = more accurate detection
  if (qualityFactor > 0.8) {
    // 70% chance of correct detection with high quality
    if (Math.random() < 0.7) return targetWord;
  } else if (qualityFactor > 0.6) {
    // 40% chance of correct detection with medium quality
    if (Math.random() < 0.4) return targetWord;
  } else {
    // 15% chance of correct detection with low quality
    if (Math.random() < 0.15) return targetWord;
  }

  // Generate pronunciation errors based on common ESL mistakes
  const commonErrors = {
    'th': 'd', 'r': 'l', 'l': 'r', 'v': 'w', 'w': 'v',
    'p': 'b', 'b': 'p', 'f': 'p', 'ch': 'sh', 'sh': 'ch'
  };

  let result = targetWord;
  for (const [correct, error] of Object.entries(commonErrors)) {
    if (result.includes(correct) && Math.random() < 0.3) {
      result = result.replace(correct, error);
    }
  }

  return result;
}

// Calculate phonetic similarity between target and detected speech
function calculatePhoneticSimilarity(target, detected) {
  if (detected.startsWith('[') && detected.endsWith(']')) {
    return 0; // No speech detected
  }

  const similarity = calculateSimilarity(target.toLowerCase(), detected.toLowerCase());
  return Math.round(similarity * 100);
}

// Analyze stress patterns in pronunciation
function analyzeStressPattern(targetWord, detectedSpeech, audioAnalysis) {
  if (detectedSpeech.startsWith('[') && detectedSpeech.endsWith(']')) {
    return 'none';
  }

  // Simulate stress pattern analysis based on audio characteristics
  const patterns = ['correct', 'weak', 'misplaced', 'unclear'];
  const qualityFactor = audioAnalysis.quality * audioAnalysis.clarity;

  if (qualityFactor > 0.8) {
    return Math.random() < 0.6 ? 'correct' : 'weak';
  } else if (qualityFactor > 0.5) {
    return patterns[Math.floor(Math.random() * 3)];
  } else {
    return 'unclear';
  }
}

// Identify specific pronunciation errors
function identifyPronunciationErrors(targetWord, detectedSpeech) {
  const errors = [];

  if (detectedSpeech.startsWith('[') && detectedSpeech.endsWith(']')) {
    errors.push('No clear speech detected');
    return errors;
  }

  // Check for common pronunciation issues
  if (targetWord.includes('th') && !detectedSpeech.includes('th')) {
    errors.push('TH sound not pronounced correctly');
  }

  if (targetWord.includes('r') && detectedSpeech.includes('l')) {
    errors.push('R/L confusion detected');
  }

  if (targetWord.includes('v') && detectedSpeech.includes('w')) {
    errors.push('V/W confusion detected');
  }

  if (targetWord.length !== detectedSpeech.length) {
    errors.push('Word length mismatch');
  }

  if (errors.length === 0) {
    errors.push('Minor pronunciation variations detected');
  }

  return errors;
}

// Advanced accuracy calculation based on pronunciation analysis
function calculateAdvancedAccuracy(targetWord, pronunciationAnalysis, difficulty) {
  const { detectedSpeech, phoneticAccuracy, confidence } = pronunciationAnalysis;

  // Base score from phonetic accuracy
  let score = phoneticAccuracy;

  // Adjust based on confidence level
  score = score * confidence;

  // Difficulty adjustments
  const difficultyMultipliers = {
    'beginner': 1.1,
    'intermediate': 1.0,
    'advanced': 0.9
  };

  score = score * (difficultyMultipliers[difficulty] || 1.0);

  // Ensure score is within bounds
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Advanced fluency calculation based on pronunciation analysis
function calculateAdvancedFluency(targetWord, pronunciationAnalysis, difficulty) {
  const { detectedSpeech, stressPattern, confidence, phoneticAccuracy } = pronunciationAnalysis;

  // Base fluency from phonetic accuracy and stress pattern
  let fluency = phoneticAccuracy * 0.7;

  // Stress pattern contribution
  const stressScores = {
    'correct': 30,
    'weak': 20,
    'misplaced': 10,
    'unclear': 5,
    'none': 0
  };

  fluency += stressScores[stressPattern] || 0;

  // Confidence factor
  fluency = fluency * confidence;

  // Difficulty adjustments
  const difficultyMultipliers = {
    'beginner': 1.1,
    'intermediate': 1.0,
    'advanced': 0.9
  };

  fluency = fluency * (difficultyMultipliers[difficulty] || 1.0);

  // Ensure fluency is within bounds
  return Math.max(0, Math.min(100, Math.round(fluency)));
}

// Generate advanced feedback based on pronunciation analysis
function generateAdvancedFeedback(targetWord, pronunciationAnalysis, accuracy, fluency, difficulty) {
  const { detectedSpeech, pronunciationErrors, stressPattern, confidence } = pronunciationAnalysis;

  let feedback = [];

  // Audio quality feedback
  if (confidence < 0.3) {
    feedback.push('Audio quality is too low for accurate analysis. Please speak closer to the microphone.');
    return feedback.join(' ');
  }

  // No speech detected
  if (detectedSpeech.startsWith('[') && detectedSpeech.endsWith(']')) {
    feedback.push('No clear speech was detected. Please make sure to speak the word clearly.');
    return feedback.join(' ');
  }

  // Accuracy feedback
  if (accuracy >= 90) {
    feedback.push('Excellent pronunciation!');
  } else if (accuracy >= 70) {
    feedback.push('Good pronunciation with minor issues.');
  } else if (accuracy >= 50) {
    feedback.push('Fair pronunciation, but needs improvement.');
  } else {
    feedback.push('Pronunciation needs significant work.');
  }

  // Specific error feedback
  if (pronunciationErrors.length > 0) {
    feedback.push('Issues detected: ' + pronunciationErrors.join(', '));
  }

  // Stress pattern feedback
  if (stressPattern === 'correct') {
    feedback.push('Word stress is correct.');
  } else if (stressPattern === 'weak') {
    feedback.push('Try to emphasize the stressed syllables more.');
  } else if (stressPattern === 'misplaced') {
    feedback.push('Check the stress pattern - emphasis is on the wrong syllable.');
  }

  return feedback.join(' ');
}

// Generate advanced suggestions based on pronunciation analysis
function generateAdvancedSuggestions(targetWord, pronunciationAnalysis, accuracy, fluency) {
  const { pronunciationErrors, stressPattern } = pronunciationAnalysis;
  const suggestions = [];

  // Error-specific suggestions
  pronunciationErrors.forEach(error => {
    if (error.includes('TH sound')) {
      suggestions.push('Practice the TH sound by placing your tongue between your teeth.');
    } else if (error.includes('R/L confusion')) {
      suggestions.push('Focus on the difference between R and L sounds. R is made with the tongue curled back.');
    } else if (error.includes('V/W confusion')) {
      suggestions.push('For V sounds, bite your lower lip lightly. For W sounds, round your lips.');
    }
  });

  // Stress pattern suggestions
  if (stressPattern === 'weak' || stressPattern === 'misplaced') {
    suggestions.push('Listen to native speakers and practice the word stress pattern.');
  }

  // General suggestions based on scores
  if (accuracy < 70) {
    suggestions.push('Break the word into syllables and practice each part slowly.');
  }

  if (fluency < 70) {
    suggestions.push('Practice speaking the word at a natural pace with proper rhythm.');
  }

  return suggestions;
}

// Get advanced phonetic tips based on pronunciation analysis
function getAdvancedPhoneticTips(targetWord, pronunciationAnalysis) {
  const { pronunciationErrors } = pronunciationAnalysis;
  const tips = [];

  // Word-specific phonetic tips
  const phoneticTips = {
    'think': 'Place tongue between teeth for /θ/ sound',
    'three': 'Start with /θ/ then glide to /r/',
    'water': 'Tap the tongue for American /t/ or use clear /t/ for British',
    'very': 'Light bite on lower lip for /v/',
    'light': 'Tongue tip touches roof of mouth for /l/',
    'beautiful': 'Stress on first syllable: BEAU-ti-ful',
    'pronunciation': 'Five syllables: pro-nun-ci-A-tion'
  };

  if (phoneticTips[targetWord.toLowerCase()]) {
    tips.push(phoneticTips[targetWord.toLowerCase()]);
  }

  // Error-specific tips
  pronunciationErrors.forEach(error => {
    if (error.includes('TH sound')) {
      tips.push('Tongue position is key for TH sounds');
    } else if (error.includes('R/L')) {
      tips.push('R: tongue curled back, L: tongue tip up');
    }
  });

  return tips;
}

// Fallback basic pronunciation analysis
async function basicPronunciationAnalysis(targetWord) {
  // Simple fallback when advanced analysis fails
  const transcription = generateRealisticTranscription(targetWord);
  const accuracy = Math.random() * 40 + 30; // 30-70%
  const fluency = Math.random() * 40 + 30; // 30-70%

  return {
    accuracy: Math.round(accuracy),
    fluency: Math.round(fluency),
    overall: Math.round((accuracy + fluency) / 2),
    feedback: 'Basic analysis mode - audio processing unavailable',
    difficulty: 'intermediate',
    transcription,
    targetWord,
    suggestions: ['Please try again with better audio quality'],
    phoneticTips: ['Ensure clear pronunciation'],
    duration: 1,
    audioQuality: 'low',
    phoneticAccuracy: Math.round(accuracy),
    stressPattern: 'unclear'
  };
}

// Calculate pronunciation accuracy based on transcription similarity
function calculatePronunciationAccuracy(target, transcription, difficulty) {
  const targetLower = target.toLowerCase();
  const transcriptionLower = transcription.toLowerCase();

  // Check for silence/no input patterns first
  const silencePatterns = [
    '[silence]', '[no audio detected]', '[no speech]', '[quiet]',
    '[no input]', '[muted]', '[nothing detected]', '[empty audio]',
    '[no sound]', '[silent]', '[no voice detected]', '[audio too quiet]'
  ];

  // If transcription indicates silence/no input, give extremely low score
  const isSilence = silencePatterns.some(pattern =>
    transcriptionLower.includes(pattern)
  );

  if (isSilence) {
    return Math.floor(Math.random() * 10) + 0; // 0-10% for silence/no input
  }

  // Check for gibberish/nonsense patterns
  const gibberishPatterns = [
    'blah', 'mumble', 'uhhhh', 'hmmmm', 'aaaah', 'errr', 'umm',
    'bababa', 'dadada', 'lalala', 'nanana', 'gagaga', 'kakaka',
    'gibberish', 'nonsense', 'random sounds', 'unclear speech',
    'muffled', 'inaudible', 'garbled', 'distorted',
    'bla bla', 'yada yada', 'whatever', 'something else',
    'not the word', 'completely different', 'random noise'
  ];

  // If transcription contains gibberish patterns, give very low score
  const isGibberish = gibberishPatterns.some(pattern =>
    transcriptionLower.includes(pattern)
  );

  if (isGibberish) {
    return Math.floor(Math.random() * 15) + 5; // 5-20% for gibberish
  }

  // Perfect match
  if (targetLower === transcriptionLower) {
    return difficulty === 'beginner' ? 95 + Math.floor(Math.random() * 5) :
      difficulty === 'intermediate' ? 90 + Math.floor(Math.random() * 8) :
        85 + Math.floor(Math.random() * 10);
  }

  // Calculate similarity using Levenshtein distance
  const similarity = calculateSimilarity(targetLower, transcriptionLower);

  // If similarity is very low (less than 0.3), it's likely gibberish
  if (similarity < 0.3) {
    return Math.floor(Math.random() * 25) + 10; // 10-35% for very poor attempts
  }

  // Base score on similarity
  let baseScore = Math.round(similarity * 100);

  // Adjust for difficulty
  if (difficulty === 'beginner') {
    baseScore = Math.max(40, baseScore); // Lower minimum for more realistic feedback
  } else if (difficulty === 'advanced') {
    baseScore = Math.max(30, baseScore - 10); // Harder scoring for advanced
  }

  return Math.min(100, Math.max(15, baseScore));
}

// Calculate fluency score
function calculateFluencyScore(target, transcription, difficulty) {
  const targetLower = target.toLowerCase();
  const transcriptionLower = transcription.toLowerCase();

  // Check for silence/no input patterns first
  const silencePatterns = [
    '[silence]', '[no audio detected]', '[no speech]', '[quiet]',
    '[no input]', '[muted]', '[nothing detected]', '[empty audio]',
    '[no sound]', '[silent]', '[no voice detected]', '[audio too quiet]'
  ];

  // If transcription indicates silence/no input, give extremely low score
  const isSilence = silencePatterns.some(pattern =>
    transcriptionLower.includes(pattern)
  );

  if (isSilence) {
    return Math.floor(Math.random() * 10) + 0; // 0-10% for silence/no input
  }

  // Check for gibberish/nonsense patterns
  const gibberishPatterns = [
    'blah', 'mumble', 'uhhhh', 'hmmmm', 'aaaah', 'errr', 'umm',
    'bababa', 'dadada', 'lalala', 'nanana', 'gagaga', 'kakaka',
    'gibberish', 'nonsense', 'random sounds', 'unclear speech',
    'muffled', 'inaudible', 'garbled', 'distorted',
    'bla bla', 'yada yada', 'whatever', 'something else',
    'not the word', 'completely different', 'random noise'
  ];

  // If transcription contains gibberish patterns, give very low score
  const isGibberish = gibberishPatterns.some(pattern =>
    transcriptionLower.includes(pattern)
  );

  if (isGibberish) {
    return Math.floor(Math.random() * 20) + 5; // 5-25% for gibberish
  }

  // Check similarity for very poor attempts
  const similarity = calculateSimilarity(targetLower, transcriptionLower);
  if (similarity < 0.3) {
    return Math.floor(Math.random() * 30) + 10; // 10-40% for very poor attempts
  }

  // Base fluency score
  let fluencyScore = 75 + Math.floor(Math.random() * 20);

  // Adjust based on word length and complexity
  if (target.length > 8) {
    fluencyScore -= Math.floor(Math.random() * 10);
  }

  // Adjust for difficulty
  if (difficulty === 'beginner') {
    fluencyScore += 10;
  } else if (difficulty === 'advanced') {
    fluencyScore -= 15;
  }

  // Perfect pronunciation gets bonus
  if (targetLower === transcriptionLower) {
    fluencyScore += 10;
  }

  return Math.min(100, Math.max(20, fluencyScore));
}

// Calculate string similarity (simplified Levenshtein)
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Levenshtein distance calculation
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Generate detailed feedback based on pronunciation analysis
function generateDetailedFeedback(word, accuracy, fluency, difficulty, transcription) {
  const targetLower = word.toLowerCase();
  const transcriptionLower = transcription.toLowerCase();

  // Calculate overall score from accuracy and fluency
  const overall = Math.round((accuracy + fluency) / 2);

  // Check if pronunciation was perfect
  const isPerfect = targetLower === transcriptionLower;

  // Generate specific feedback based on transcription
  let specificFeedback = '';
  if (isPerfect) {
    const perfectTemplates = [
      `Perfect! You pronounced "${word}" exactly right.`,
      `Excellent! Your pronunciation of "${word}" is spot-on.`,
      `Outstanding! You nailed the pronunciation of "${word}".`
    ];
    specificFeedback = perfectTemplates[Math.floor(Math.random() * perfectTemplates.length)];
  } else {
    // Provide specific feedback based on what was heard vs. what was expected
    specificFeedback = `I heard "${transcription}" but you were trying to say "${word}". `;

    // Add specific pronunciation tips based on the error
    const errorTips = generateErrorSpecificTips(word, transcription);
    if (errorTips) {
      specificFeedback += errorTips;
    }
  }

  // Add general feedback based on overall score
  let generalFeedback = '';
  if (overall >= 90) {
    generalFeedback = ' Your pronunciation is excellent!';
  } else if (overall >= 75) {
    generalFeedback = ' Good pronunciation with minor areas for improvement.';
  } else if (overall >= 60) {
    generalFeedback = ' Keep practicing - you\'re making good progress!';
  } else {
    generalFeedback = ' This is a challenging word. Break it down syllable by syllable.';
  }

  return specificFeedback + generalFeedback;
}

// Generate error-specific pronunciation tips
function generateErrorSpecificTips(target, transcription) {
  const targetLower = target.toLowerCase();
  const transcriptionLower = transcription.toLowerCase();

  // Common error patterns and their tips
  const errorPatterns = {
    // TH sound errors
    'th_to_t': {
      pattern: /th/g,
      replacement: 't',
      tip: 'Try placing your tongue between your teeth for the "th" sound.'
    },
    'th_to_s': {
      pattern: /th/g,
      replacement: 's',
      tip: 'For "th", put your tongue between your teeth, not behind them like "s".'
    },
    'th_to_f': {
      pattern: /th/g,
      replacement: 'f',
      tip: 'The "th" sound uses your tongue, not your lips like "f".'
    },

    // R/L confusion
    'r_to_l': {
      pattern: /r/g,
      replacement: 'l',
      tip: 'For "r", curl your tongue back without touching the roof of your mouth.'
    },
    'l_to_r': {
      pattern: /l/g,
      replacement: 'r',
      tip: 'For "l", touch the tip of your tongue to the roof of your mouth.'
    },

    // V/W confusion
    'v_to_w': {
      pattern: /v/g,
      replacement: 'w',
      tip: 'For "v", bite your lower lip gently with your upper teeth.'
    },
    'w_to_v': {
      pattern: /w/g,
      replacement: 'v',
      tip: 'For "w", round your lips without touching your teeth.'
    }
  };

  // Check for specific error patterns
  for (const [errorType, config] of Object.entries(errorPatterns)) {
    const expectedWithError = targetLower.replace(config.pattern, config.replacement);
    if (expectedWithError === transcriptionLower) {
      return config.tip;
    }
  }

  // Check for missing syllables
  if (transcriptionLower.length < targetLower.length * 0.7) {
    return 'Try to pronounce each syllable clearly. Don\'t rush through the word.';
  }

  // Check for extra syllables
  if (transcriptionLower.length > targetLower.length * 1.3) {
    return 'Try to blend the syllables more smoothly together.';
  }

  // Generic tip for other errors
  return 'Listen carefully to the target pronunciation and try to match the sounds.';
}

// Generate improvement suggestions
function generateImprovementSuggestions(word, accuracy, fluency, transcription) {
  const suggestions = [];
  const targetLower = word.toLowerCase();
  const transcriptionLower = transcription.toLowerCase();

  // Perfect pronunciation gets encouragement
  if (targetLower === transcriptionLower) {
    suggestions.push('Excellent work! Keep practicing to maintain this level');
    suggestions.push('Try practicing this word in different sentences');
    return suggestions;
  }

  // Accuracy-based suggestions
  if (accuracy < 70) {
    suggestions.push(`Practice the individual sounds in "${word}" slowly`);
    suggestions.push('Use a mirror to watch your mouth movements');
  }

  // Fluency-based suggestions
  if (fluency < 70) {
    suggestions.push('Try speaking more slowly and clearly');
    suggestions.push('Practice the word in different sentences');
  }

  // Specific error-based suggestions
  if (hasThError(word, transcription)) {
    suggestions.push('Practice the "th" sound by placing your tongue between your teeth');
  }

  if (hasRLConfusion(word, transcription)) {
    suggestions.push('For "r": curl your tongue back; for "l": touch tongue to roof of mouth');
  }

  if (hasVWConfusion(word, transcription)) {
    suggestions.push('For "v": bite lower lip; for "w": round lips without touching teeth');
  }

  // Length-based suggestions
  if (transcriptionLower.length < targetLower.length * 0.7) {
    suggestions.push('Don\'t skip syllables - pronounce each part clearly');
  }

  if (transcriptionLower.length > targetLower.length * 1.3) {
    suggestions.push('Try to blend syllables more smoothly together');
  }

  // Word complexity suggestions
  if (word.length > 6) {
    suggestions.push('Break the word into syllables and practice each part');
  }

  // Always include at least one general suggestion if we don't have enough
  if (suggestions.length < 2) {
    const generalSuggestions = [
      'Listen to native speakers pronounce this word',
      'Record yourself and compare with native pronunciation',
      'Practice this word in context with example sentences'
    ];
    suggestions.push(generalSuggestions[Math.floor(Math.random() * generalSuggestions.length)]);
  }

  return suggestions.slice(0, 3); // Return max 3 suggestions
}

// Helper functions for error detection
function hasThError(target, transcription) {
  return target.toLowerCase().includes('th') &&
    !transcription.toLowerCase().includes('th');
}

function hasRLConfusion(target, transcription) {
  const targetLower = target.toLowerCase();
  const transcriptionLower = transcription.toLowerCase();
  return (targetLower.includes('r') && transcriptionLower.includes('l')) ||
    (targetLower.includes('l') && transcriptionLower.includes('r'));
}

function hasVWConfusion(target, transcription) {
  const targetLower = target.toLowerCase();
  const transcriptionLower = transcription.toLowerCase();
  return (targetLower.includes('v') && transcriptionLower.includes('w')) ||
    (targetLower.includes('w') && transcriptionLower.includes('v'));
}

// Get phonetic tips for specific sounds
function getPhoneticTips(word) {
  const tips = [];
  const lowerWord = word.toLowerCase();

  if (lowerWord.includes('th')) {
    tips.push('For "th" sounds: Place your tongue between your teeth and blow air gently');
  }
  if (lowerWord.includes('r')) {
    tips.push('For "r" sounds: Curl your tongue back without touching the roof of your mouth');
  }
  if (lowerWord.includes('l')) {
    tips.push('For "l" sounds: Touch the tip of your tongue to the roof of your mouth');
  }
  if (lowerWord.includes('v')) {
    tips.push('For "v" sounds: Gently bite your lower lip and vibrate your vocal cords');
  }

  return tips;
}

// ===== SUBSCRIPTION TIER MANAGEMENT ENDPOINTS =====

// Get user's current subscription tier and usage
router.get('/subscription/status', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if monthly usage needs to be reset
    if (user.shouldResetUsage()) {
      await user.resetMonthlyUsage();
    }

    const tierLimits = user.getTierLimits();
    const remainingUsage = user.getRemainingUsage();
    const usagePercentage = (user.monthlyTtsUsage / tierLimits) * 100;

    res.json({
      subscriptionTier: user.subscriptionTier,
      monthlyLimit: tierLimits,
      monthlyUsage: user.monthlyTtsUsage,
      remainingUsage: remainingUsage,
      usagePercentage: Math.round(usagePercentage),
      lastReset: user.lastUsageReset,
      warningThreshold: tierLimits * 0.8, // 80% warning
      nearLimit: usagePercentage >= 80
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Update user's subscription tier
router.post('/subscription/tier', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { tier } = req.body;
    const validTiersDisplay = ['Standard', 'Gold', 'Diamond'];
    const validTiers = ['standard', 'gold', 'diamond'];
    const normalizedTier = (tier || '').toLowerCase();

    if (!normalizedTier || !validTiers.includes(normalizedTier)) {
      return res.status(400).json({
        error: 'Invalid tier',
        validTiers: validTiersDisplay
      });
    }

    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldTier = user.subscriptionTier;
    user.subscriptionTier = normalizedTier;
    await user.save();

    // Log tier change
    console.log(`User ${user.id} tier changed from ${oldTier} to ${normalizedTier}`);

    const limitsMap = { standard: 20 * 60, gold: 60 * 60, diamond: 120 * 60 };
    const newLimit = user.getTierLimits();
    const oldLimit = limitsMap[oldTier] || limitsMap.standard;
    const remainingUsage = user.getRemainingUsage();

    res.json({
      message: 'Subscription tier updated successfully',
      subscriptionTier: user.subscriptionTier,
      monthlyLimit: newLimit,
      remainingUsage: remainingUsage,
      upgraded: newLimit > oldLimit
    });
  } catch (error) {
    console.error('Error updating subscription tier:', error);
    res.status(500).json({ error: 'Failed to update subscription tier' });
  }
});

// Get usage history and statistics
router.get('/subscription/usage-history', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For now, return current month's data
    // In a full implementation, you'd store historical usage data
    const tierLimits = user.getTierLimits(); // seconds
    const usagePercentage = (user.monthlyTtsUsage / tierLimits) * 100;

    res.json({
      currentMonth: {
        usage: user.monthlyTtsUsage,
        limit: tierLimits,
        percentage: Math.round(usagePercentage),
        tier: user.subscriptionTier
      },
      resetDate: user.lastUsageReset,
      nextResetDate: new Date(user.lastUsageReset.getFullYear(), user.lastUsageReset.getMonth() + 1, 1)
    });
  } catch (error) {
    console.error('Error fetching usage history:', error);
    res.status(500).json({ error: 'Failed to fetch usage history' });
  }
});

// Reset monthly usage (admin endpoint or for testing)
router.post('/subscription/reset-usage', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.resetMonthlyUsage();

    res.json({
      message: 'Monthly usage reset successfully',
      monthlyUsage: user.monthlyTtsUsage,
      lastReset: user.lastUsageReset
    });
  } catch (error) {
    console.error('Error resetting usage:', error);
    res.status(500).json({ error: 'Failed to reset usage' });
  }
});

// ============================================================================
// DASHBOARD, USAGE & HEALTH ROUTES
// (Previously defined inline in server.js — moved here for consistency)
// ============================================================================

// Dashboard statistics endpoint
router.get('/dashboard/stats', requireJwtAuth, async (req, res) => {
  try {
    // Mock stats for now — replace with real DB queries when analytics are implemented
    const stats = {
      lessonsCompleted: 12,
      studyTime: '24h',
      wordsLearned: 156,
      streakDays: 7
    };
    return apiResponse.success(res, stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return apiResponse.internalError(res, 'Failed to fetch stats');
  }
});

// User TTS usage endpoint
router.get('/usage', requireJwtAuth, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.userId);
    if (!user) {
      return apiResponse.notFound(res, 'User not found');
    }

    const remainingUsage = user.getRemainingUsage();
    const tierLimits = user.getTierLimits();
    const usagePercentage = ((tierLimits.ttsMinutes * 60 - remainingUsage) / (tierLimits.ttsMinutes * 60)) * 100;

    return apiResponse.success(res, {
      remainingUsage,
      usagePercentage: Math.round(usagePercentage),
      tierLimits
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    return apiResponse.internalError(res, 'Failed to fetch usage');
  }
});

// Detailed health check endpoint (overrides the simpler one in server.js)
router.get('/health', async (req, res) => {
  try {
    let databaseOk = false;
    try {
      await db.sequelize.authenticate();
      databaseOk = true;
    } catch (dbError) {
      console.error('Database health check failed:', dbError.message);
    }

    const memUsage = process.memoryUsage();
    const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

    return apiResponse.success(res, {
      status: databaseOk ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()) + ' seconds',
      services: {
        database: databaseOk,
        gemini: !!global.genAI,
        elevenlabs: elevenLabsService.isAvailable()
      },
      memory: {
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
        rss: formatBytes(memUsage.rss)
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return apiResponse.success(res, {
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
