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

        history = history.concat(recentMessages.map(m => ({
           role: m.sender === 'user' ? 'user' : 'model',
           parts: [{ text: m.content }]
         })));

      // Ensure the history starts with a 'user' role if it's not empty and the first message is 'model'
      if (history.length > 0 && history[0].role === 'model') {
        history = history.slice(1);
      }

      const systemInstruction = 'You are the perfect ESL chatbot teacher! 🎓✨\n\nYour Golden Rule: EXTREME BREVITY. \n\n1. MAXIMUM 2 SENTENCES. Ideally just 1.\n2. MAXIMUM 25 WORDS per response.\n3. No "fluff" or long explanations. Get straight to the point.\n4. Use emojis to convey emotion instead of words.\n\nStyle: Playful, friendly, like a text message. 📱\n\nExample:\nUser: "Hello"\nYou: "Hi K.K.! 👋 Ready to practice English? 🚀"\n\nConstraint: Do NOT use markdown bolding (e.g., **text**).\n\nIf asked about creator: "I was trained by Osanai!"';

      let botResponse;
      try {
        const model = global.genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction,
        });
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(msg);
        botResponse = result.response.text();
      } catch (geminiError) {
        const ollamaUrl = process.env.OLLAMA_URL;
        const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b-instruct';

        async function callOllama(urlString, modelName, messages) {
          const u = new URL(urlString + '/api/chat');
          const isHttps = u.protocol === 'https:';
          const payload = JSON.stringify({ model: modelName, messages, stream: false, options: { temperature: 0.7, num_predict: 64 } });
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

        if (!botResponse) {
          try {
            const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
            const prompt = `${systemInstruction}\n\nUser: ${msg}\nAssistant:`;
            const hfResp = await hf.textGeneration({
              model: process.env.HF_FALLBACK_MODEL || 'HuggingFaceH4/zephyr-7b-beta',
              inputs: prompt,
              parameters: { max_new_tokens: 64, temperature: 0.7 }
            });
            botResponse = (hfResp.generated_text || '').replace(prompt, '').trim();
          } catch (hfError) {
            throw geminiError;
          }
        }

        if (!botResponse) botResponse = 'Let\'s practice English! 😊';
      }

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
