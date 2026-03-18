'use strict';

/**
 * Socket.IO chat event handlers.
 * Called once during app startup with the `io` instance.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../../models');

const ESL_SYSTEM_INSTRUCTION = 'You are a supportive ESL teacher and conversation partner. 🎓\n\nStyle:\n- Clear, friendly, practical.\n- Length: 4–8 sentences (~70–140 words) so explanations are complete.\n\nEach reply should:\n1) Respond naturally to the student.\n2) Teach 1–2 points (vocabulary/grammar/pronunciation/usage) with brief explanations and 2–3 simple examples.\n3) Give a quick practice prompt or question to continue the lesson.\n4) Offer a short correction or tip if needed.\n\nConstraints:\n- Do NOT use markdown bold (e.g., **text**).\n- Avoid repeating the student\'s text back-to-back.\n- Stay strictly ESL-focused; politely redirect if off-topic.\n- If asked who created you: "I was trained and created by Osanai!"';

function registerChatSocket(io) {
  io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('load history', async () => {
      try {
        if (!socket.handshake.session.userId) {
          socket.emit('error', 'Not authenticated');
          return;
        }

        const messages = await db.Message.findAll({
          where: { userId: socket.handshake.session.userId },
          order: [['createdAt', 'ASC']],
          limit: 50
        });

        const chatHistory = [];
        for (let i = 0; i < messages.length; i += 2) {
          const userMsg = messages[i];
          const botMsg = messages[i + 1];
          if (userMsg && botMsg) {
            chatHistory.push({
              user: userMsg.content,
              bot: botMsg.content,
              timestamp: userMsg.createdAt
            });
          }
        }

        socket.emit('chat history', chatHistory);
      } catch (error) {
        console.error('Error loading chat history:', error);
        socket.emit('error', 'Failed to load chat history');
      }
    });

    socket.on('chat message', async (msg) => {
      try {
        if (!socket.handshake.session.userId) {
          socket.emit('error', 'Not authenticated');
          return;
        }

        const userId = socket.handshake.session.userId;

        // Save user message
        await db.Message.create({ userId, content: msg, sender: 'user' });

        // Update chat message count in Progress model
        await db.Progress.upsert({
          userId: socket.handshake.session.userId,
          chatMessageCount: (await db.Progress.findOne({ where: { userId: socket.handshake.session.userId } }))?.chatMessageCount + 1 || 1,
          totalWordsTyped: (await db.Progress.findOne({ where: { userId: socket.handshake.session.userId } }))?.totalWordsTyped + msg.split(' ').length || msg.split(' ').length,
          lastActiveDate: new Date()
        });

        // Fetch recent messages for context
        const recentMessages = await db.Message.findAll({
          where: { userId },
          order: [['createdAt', 'ASC']],
        });

        const username = socket.handshake.session.user?.username;

        let history = [];
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

        if (history.length > 0 && history[0].role === 'model') {
          history = history.slice(1);
        }

        const model = global.genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: ESL_SYSTEM_INSTRUCTION,
        });
        const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 256, temperature: 0.7 } });
        const result = await chat.sendMessage(msg);
        const botResponse = result.response.text();

        // Save bot response
        await db.Message.create({ userId, content: botResponse, sender: 'bot' });

        socket.emit('chat message', { user: msg, bot: botResponse });
      } catch (error) {
        console.error('Error processing message:', error);
        socket.emit('error', 'Failed to process message');
      }
    });

    socket.on('clear chat', async () => {
      try {
        if (!socket.handshake.session.userId) {
          socket.emit('error', 'Not authenticated');
          return;
        }

        await db.Message.destroy({
          where: { userId: socket.handshake.session.userId }
        });

        socket.emit('chat cleared');
      } catch (error) {
        console.error('Error clearing chat:', error);
        socket.emit('error', 'Failed to clear chat');
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
}

module.exports = { registerChatSocket };
