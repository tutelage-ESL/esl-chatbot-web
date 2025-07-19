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
    addMessage(data.user, 'user');
    addMessage(data.bot, 'bot');
  });

  socket.on('error', (msg) => {
    addMessage(msg, 'error');
  });

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    chatInput.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="loading"></div>';
    socket.emit('chat message', message);
    chatInput.value = '';
    chatInput.disabled = false;
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
    chatInput.focus();
  });

  function addMessage(text, type, timestamp = new Date()) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageDiv.innerHTML = `
      <div class="message-content">
        <strong>${type === 'user' ? 'You' : type === 'bot' ? 'ESL Assistant' : 'System'}:</strong> ${text}
      </div>
      <div class="message-time">${timeString}</div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});