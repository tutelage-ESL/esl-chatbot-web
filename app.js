const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const sharedsession = require('express-socket.io-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const { GoogleGenerativeAI } = require('@google/generative-ai');
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
      const model = global.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(msg);
      const botResponse = result.response.text();
      await db.Message.create({ userId, content: botResponse, sender: 'bot' });
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
db.sequelize.sync().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
module.exports = app;