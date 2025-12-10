const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const socketIo = require('socket.io');
const sharedsession = require('express-socket.io-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { HfInference } = require('@huggingface/inference');
const fs = require('fs');
require('dotenv').config();
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
global.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
});
app.use(sessionMiddleware);
io.use(sharedsession(sessionMiddleware, { autoSave: true }));
app.use(cors());
// Auto-login middleware for public event mode
app.use(async (req, res, next) => {
  try {
    if (process.env.PUBLIC_EVENT_MODE === 'true') {
      if (!req.session.userId) {
        const dbLocal = require('./models');
        const username = process.env.DEFAULT_EVENT_USER || 'TUTELAGE';
        const email = 'event@tutelage.local';
        let user = await dbLocal.User.findOne({ where: { username } });
        if (!user) {
          user = await dbLocal.User.findOne({ where: { email } });
        }
        if (!user) {
          user = await dbLocal.User.create({ username, email, password: 'event', subscriptionTier: 'diamond' });
        }
        if (user.subscriptionTier !== 'diamond') {
          user.subscriptionTier = 'diamond';
          await user.save();
        }
        req.session.userId = user.id;
        req.session.user = { id: user.id, username: user.username };
      }
    }
  } catch (e) {
    console.error('Auto-login failed:', e);
  }
  next();
});
io.use(async (socket, next) => {
  try {
    if (process.env.PUBLIC_EVENT_MODE === 'true' && !socket.handshake.session.userId) {
      const dbLocal = require('./models');
      const username = process.env.DEFAULT_EVENT_USER || 'TUTELAGE';
      const email = 'event@tutelage.local';
      let user = await dbLocal.User.findOne({ where: { username } });
      if (!user) {
        user = await dbLocal.User.findOne({ where: { email } });
      }
      if (!user) {
        user = await dbLocal.User.create({ username, email, password: 'event', subscriptionTier: 'diamond' });
      }
      if (user.subscriptionTier !== 'diamond') {
        user.subscriptionTier = 'diamond';
        await user.save();
      }
      socket.handshake.session.userId = user.id;
      socket.handshake.session.user = { id: user.id, username: user.username };
      socket.handshake.session.save();
    }
  } catch (e) {
    console.error('Socket auto-login failed:', e);
  }
  next();
});
app.use(cors());
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
const mainRoutes = require('./routes/mainRoutes');
app.use('/', mainRoutes);
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
console.log('Applying auth routes middleware...');
app.use('/api/auth', authRoutes);
// Helper function to update progress.json file
function updateProgressJSON(userId, message, type, responsePreview) {
  try {
    const progressPath = path.join(__dirname, 'data/progress.json');
    let progressData = {};
    
    // Read existing progress data
    if (fs.existsSync(progressPath)) {
      const progressFile = fs.readFileSync(progressPath, 'utf8');
      progressData = JSON.parse(progressFile);
    }
    
    // Initialize user data if it doesn't exist
    if (!progressData[userId]) {
      progressData[userId] = {
        userId: userId,
        userName: 'Student',
        interactions: [],
        metrics: {
          totalInteractions: 0,
          textInteractions: 0,
          voiceInteractions: 0,
          commandsUsed: 0,
          lessonsCompleted: 0,
          practiceSessionsCompleted: 0,
          estimatedLevel: null,
          skillMetrics: {
            grammar: 0,
            vocabulary: 0,
            reading: 0,
            writing: 0,
            speaking: 0,
            listening: 0
          },
          lastUpdated: new Date().toISOString()
        }
      };
    }
    
    // Add new interaction
    const interaction = {
      timestamp: new Date().toISOString(),
      type: type,
      message: message,
      responsePreview: responsePreview
    };
    
    progressData[userId].interactions.unshift(interaction);
    
    // Update metrics
    progressData[userId].metrics.totalInteractions++;
    if (type === 'text') {
      progressData[userId].metrics.textInteractions++;
    } else if (type === 'voice') {
      progressData[userId].metrics.voiceInteractions++;
    }
    progressData[userId].metrics.lastUpdated = new Date().toISOString();
    
    // Keep only last 50 interactions to prevent file from growing too large
    if (progressData[userId].interactions.length > 50) {
      progressData[userId].interactions = progressData[userId].interactions.slice(0, 50);
    }
    
    // Write back to file
    fs.writeFileSync(progressPath, JSON.stringify(progressData, null, 2));
    
  } catch (error) {
    console.error('Error updating progress.json:', error);
  }
}

app.use('/api', apiRoutes);
io.on('connection', (socket) => {
  console.log('New client connected');
  const userId = socket.handshake.session.userId;
  if (!userId) {
    socket.disconnect();
    return;
  }
  socket.on('load history', async () => {
    try {
      const messages = await db.Message.findAll({
        where: { userId },
        order: [['createdAt', 'ASC']]
      });
      socket.emit('chat history', messages);
    } catch (error) {
      socket.emit('error', 'Failed to load chat history');
    }
  });
  const processedMessageIds = new Set();

  socket.on('chat message', async (data) => {
    try {
      const msg = typeof data === 'object' && data.content ? data.content : data;
      const msgId = typeof data === 'object' && data.id ? data.id : null;

      if (msgId) {
        if (processedMessageIds.has(msgId)) {
            console.log(`Duplicate message prevented: ${msgId}`);
            return;
        }
        processedMessageIds.add(msgId);
        // Clear from cache after 10 seconds
        setTimeout(() => processedMessageIds.delete(msgId), 10000);
      }

      await db.Message.create({ userId, content: msg, sender: 'user' });

      // Update chat message count in Progress model
      await db.Progress.upsert({
        userId: socket.handshake.session.userId,
        chatMessageCount: (await db.Progress.findOne({ where: { userId: socket.handshake.session.userId } }))?.chatMessageCount + 1 || 1,
        totalWordsTyped: (await db.Progress.findOne({ where: { userId: socket.handshake.session.userId } }))?.totalWordsTyped + msg.split(' ').length || msg.split(' ').length,
        lastActiveDate: new Date()
      });

      // Fetch recent messages for context (e.g., last 10 messages)
      const recentMessages = await db.Message.findAll({
        where: { userId },
        order: [['createdAt', 'ASC']],
        // No limit, fetch all messages for full context
      });

      // Format messages for Gemini API history
      const username = socket.handshake.session.user?.username; // Get the logged-in user's username, using optional chaining

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

      const systemInstruction = 'You are a friendly ESL teacher and conversation partner. 🎓\n\nStyle:\n- Keep replies short (2–4 sentences, ~35–60 words).\n- Make every turn a mini learning moment.\n\nIn each reply:\n1) Respond naturally to the student\'s message.\n2) Teach one small point (vocabulary/grammar/pronunciation) with 1–2 tiny examples.\n3) Ask a simple follow-up to keep the conversation going.\n\nConstraints:\n- Do NOT use markdown bold (e.g., **text**).\n- Don\'t repeat the user\'s text back-to-back.\n- Stay strictly ESL-focused; politely redirect if off-topic.\n- If asked who created you: "I was trained and created by Osanai!"';

      let botResponse;
      try {
        const model = global.genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction,
        });
        const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 128, temperature: 0.7 } });
        const result = await chat.sendMessage(msg);
        botResponse = result.response.text();
      } catch (geminiError) {
        const ollamaUrl = process.env.OLLAMA_URL;
        const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b-instruct';

        async function callOllama(urlString, modelName, messages) {
          const u = new URL(urlString + '/api/chat');
          const isHttps = u.protocol === 'https:';
          const payload = JSON.stringify({ model: modelName, messages, stream: false, options: { temperature: 0.7, num_predict: 128, repeat_penalty: 1.2 } });
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
            req.setTimeout(3000, () => { req.destroy(); });
            req.on('error', reject);
            req.write(payload);
            req.end();
          });
        }

        const ollamaMessages = [{ role: 'system', content: systemInstruction }].concat(
          history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.parts && h.parts[0] ? h.parts[0].text : '' }))
        ).concat([{ role: 'user', content: msg }]);

        if (ollamaUrl) {
          try {
            const ollamaResp = await callOllama(ollamaUrl, ollamaModel, ollamaMessages);
            botResponse = (ollamaResp || '').trim();
          } catch (ollamaError) {
            botResponse = '';
          }
        }

        

        async function callGroq(messages) {
          const key = process.env.GROQ_API_KEY;
          const model = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';
          if (!key) return '';
          const payload = JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 128 });
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

        async function callOpenRouter(messages) {
          const key = process.env.OPENROUTER_API_KEY;
          const model = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-7b-instruct';
          if (!key) return '';
          const payload = JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 128 });
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

        if (!botResponse) {
          const messages = [{ role: 'system', content: systemInstruction }]
            .concat(history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.parts && h.parts[0] ? h.parts[0].text : '' })))
            .concat([{ role: 'user', content: msg }]);
          const gr = await callGroq(messages);
          if (gr) botResponse = gr;
        }

        if (!botResponse) {
          try {
            const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
            const prompt = `${systemInstruction}\n\nUser: ${msg}\nAssistant:`;
            const models = [
              process.env.HF_FALLBACK_MODEL || 'HuggingFaceH4/zephyr-7b-beta',
              'mistralai/Mixtral-8x7B-Instruct-v0.1',
              'Qwen/Qwen2.5-7B-Instruct'
            ];
            for (const m of models) {
              try {
                const r = await hf.textGeneration({
                  model: m,
                  inputs: prompt,
                  parameters: { max_new_tokens: 128, temperature: 0.7, repetition_penalty: 1.2, no_repeat_ngram_size: 2, return_full_text: false }
                });
                let txt = '';
                if (r && typeof r === 'object') {
                  if (Array.isArray(r)) {
                    txt = (r[0] && r[0].generated_text) ? r[0].generated_text : '';
                  } else {
                    txt = r.generated_text || '';
                  }
                }
                txt = txt.trim();
                if (txt) { botResponse = txt; break; }
              } catch (_) {}
            }
          } catch (_) {
            botResponse = '';
          }
        }

        if (!botResponse) {
          const messages = [{ role: 'system', content: systemInstruction }]
            .concat(history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.parts && h.parts[0] ? h.parts[0].text : '' })))
            .concat([{ role: 'user', content: msg }]);
          const or = await callOpenRouter(messages);
          if (or) botResponse = or;
        }

        function ruleFallback(u) {
          const t = (u || '').toLowerCase();
          if (t.includes('name')) return 'I\'m your ESL tutor, trained by Osanai! 😊 Let\'s set a goal and practice together.';
          if (t.includes('hello') || t.includes('hi')) return 'Hi! 👋 I\'m your ESL tutor. What skill do you want to practice today—speaking, vocabulary, or grammar?';
          return 'Let\'s turn this into practice. Share a sentence on your topic, and I\'ll help with corrections and tips. ✍️🗣️';
        }

        if (!botResponse) botResponse = ruleFallback(msg);
      }

      function dedupeLeading(userText, aiText) {
        try {
          const u = (userText || '').trim();
          const t = (aiText || '').trim();
          if (!u || !t) return aiText;
          const esc = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp('^\n?\s*(?:' + esc + '(?:[\s\-_,.:;!?]+)?){2,}', 'i');
          const replaced = t.replace(re, u + ' ');
          return replaced.trimStart();
        } catch (_) { return aiText; }
      }
      botResponse = dedupeLeading(msg, botResponse);
      await db.Message.create({ userId, content: botResponse, sender: 'bot' });
      
      // Update progress tracking with bot response preview
      const responsePreview = botResponse.length > 100 ? botResponse.substring(0, 100) + '...' : botResponse;
      updateProgressJSON(userId, msg, 'text', responsePreview);
      
      socket.emit('chat message', { user: msg, bot: botResponse });
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('error', 'Failed to process message');
    }
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});
const db = require('./models');
const elevenLabsService = require('./services/elevenLabsService');

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
db.sequelize.authenticate()
  .then(async () => {
    console.log('Database connected successfully.');
    await db.sequelize.sync({ alter: false });
    console.log('Database synchronized successfully.');
  })
  .catch(err => {
    console.error('Database connection failed; continuing without DB:', err.message);
  });
module.exports = app;
