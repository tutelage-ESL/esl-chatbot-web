document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const sendBtn = document.getElementById('send-chat-btn');

  socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
    socket.emit('load history');
  });

  socket.on('chat history', (history) => {
    history.forEach(msg => {
      addMessage(msg.content, msg.sender, msg.createdAt);
    });
  });

  socket.on('chat message', (data) => {
    // Remove loading indicator if present
    const loadingMessage = document.querySelector('.bot-message .loading-dots');
    if (loadingMessage) {
      loadingMessage.closest('.message').remove();
    }
    addMessage(data.bot, 'bot', new Date()); // Display bot message
  });

  socket.on('error', (msg) => {
    addMessage(msg, 'error');
  });

  chatForm.addEventListener('submit', sendMessage);

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  });

  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
  });

  function sendMessage(e) {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="loading"></div>';

    addMessage(message, 'user', new Date()); // Display user message immediately

    // Add a loading indicator for the bot's response
    const botLoadingMessageId = 'bot-loading-' + Date.now();
    addMessage('<div class="loading-dots"><span>.</span><span>.</span><span>.</span></div>', 'bot', new Date(), botLoadingMessageId);

    socket.emit('chat message', message);

    chatInput.value = '';
    chatInput.style.height = 'auto'; // Reset height after sending
    chatInput.disabled = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>'; // Restore icon
    chatInput.focus();
  }

  function addMessage(text, type, timestamp = new Date(), id = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    if (id) {
      messageDiv.id = id;
    }

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageDiv.innerHTML = `
      <div class="message-bubble">${text}</div>
      <div class="message-time">${timeString}</div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});