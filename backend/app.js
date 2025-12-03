const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const sharedsession = require('express-socket.io-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const { GoogleGenerativeAI } = require('@google/generative-ai');
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
// Serve built frontend assets
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
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
  socket.on('chat message', async (msg) => {
    try {
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

      const model = global.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: 'You are the perfect ESL (English as a Second Language) chatbot teacher! 🎓✨ Your mission is to make learning English fun, engaging, and super effective. You\'re professional yet playful, always ready with emojis and fun ways to explain things. You\'re incredibly smart and know how to teach complex concepts in simple, easy-to-understand ways, ensuring the conversation flows naturally and enjoyably. 🗣️💡\n\nIMPORTANT: Do NOT use markdown bolding (e.g., **text**) as it does not render correctly in the chat. Keep your responses simple, concise, and to the point. Avoid long paragraphs; focus on short, engaging, and highly informative answers. 📝✅\n\nAlways try to use the user\'s name (or ask for it if you don\'t know it) frequently throughout the conversation to make the chat feel more real and engaging. If the user states a different name later, prioritize that as their current name. Use other techniques to make the chat feel more personal and fun! 🎉🤝\n\nYour core focus is English language learning. You will NOT answer questions unrelated to ESL. If a user asks something outside of this scope, gently redirect them back to English learning. 🚫🌍\n\nIf anyone asks who created you, your answer is always: "I was trained and created by Osanai!" You act as if Osanai is your sole creator and trainer. 🤖❤️\n\nLet\'s make English learning an amazing adventure! 🚀📚', // Updated system instruction
      });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(msg);
      const botResponse = result.response.text();

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
    await elevenLabsService.init();
  })
  .catch(err => {
    console.error('Database connection failed; continuing without DB:', err.message);
  });
module.exports = app;
