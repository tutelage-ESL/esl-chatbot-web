// Main Application Controller

class ESLChatbotApp {

  // Authentication
  setupAuth() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const logoutBtn = document.getElementById('logout-btn');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      await this.login(email, password);
    });

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      await this.signup(email, password);
    });

    logoutBtn.addEventListener('click', () => this.logout());

    showSignup.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form-container').style.display = 'none';
      document.getElementById('signup-form-container').style.display = 'block';
    });

    showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('signup-form-container').style.display = 'none';
      document.getElementById('login-form-container').style.display = 'block';
    });

    // Check for existing session
    this.checkSession();
  }

  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      this.currentUser = data.user;
      this.showApp();
    } catch (error) {
      alert(`Login failed: ${error.message}`);
    }
  }

  async signup(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      alert('Signup successful! Please check your email to verify your account.');
      // Optionally log them in directly or wait for verification
      // this.currentUser = data.user;
      // this.showApp();
    } catch (error) {
      alert(`Signup failed: ${error.message}`);
    }
  }

  async logout() {
    await supabase.auth.signOut();
    this.currentUser = null;
    this.showAuth();
  }

  async checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      this.currentUser = session.user;
      this.showApp();
    } else {
      this.showAuth();
    }
  }

  showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.querySelector('.app-container').style.display = 'flex';
    this.fetchProgress(); // Fetch progress now that user is logged in
  }

  showAuth() {
    document.getElementById('auth-container').style.display = 'block';
    document.querySelector('.app-container').style.display = 'none';
  }

  constructor() {
    this.currentUser = null;
    this.currentSection = 'chat';
    this.settings = this.loadSettings();
    this.init();
  }

  init() {
    this.setupAuth();
    this.setupNavigation();
    this.setupChat();
    this.setupVoice();
    this.setupProgress();
    this.setupSettings();
    this.checkServerConnection();
    this.updateConnectionStatus();
  }

  // Navigation System
  setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.section');

    navButtons.forEach(button => {
      button.addEventListener('click', () => {
        const sectionName = button.dataset.section;
        this.switchSection(sectionName);
      });
    });
  }

  switchSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    // Update sections
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');

    this.currentSection = sectionName;
  }

  // Chat Functionality
  setupChat() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const sendBtn = document.getElementById('send-btn');

    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;

      // Disable input while processing
      chatInput.disabled = true;
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<div class="loading"></div>';

      // Add user message
      this.addMessage(message, 'user');
      chatInput.value = '';

      try {
        const response = await this.sendChatMessage(message);
        this.addMessage(response, 'bot');
        
        // Auto-speak if enabled
        if (this.settings.autoSpeak) {
          this.speakText(response);
        }
      } catch (error) {
        this.addMessage('Sorry, I encountered an error. Please try again.', 'error');
        console.error('Chat error:', error);
      } finally {
        // Re-enable input
        chatInput.disabled = false;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
        chatInput.focus();
      }
    });
  }

  async sendChatMessage(message) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.response;
  }

  addMessage(text, type) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
      <div class="message-content">
        <strong>${type === 'user' ? 'You' : type === 'bot' ? 'ESL Assistant' : 'System'}:</strong> ${text}
      </div>
      <div class="message-time">${timeString}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Voice Functionality
  setupVoice() {
    const startBtn = document.getElementById('start-voice-btn');
    const stopBtn = document.getElementById('stop-voice-btn');
    const status = document.getElementById('voice-status');
    const transcript = document.getElementById('voice-transcript');
    const response = document.getElementById('voice-response');

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      status.textContent = 'Speech recognition not supported in this browser.';
      startBtn.disabled = true;
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    startBtn.addEventListener('click', () => {
      this.startVoiceRecognition();
    });

    stopBtn.addEventListener('click', () => {
      this.stopVoiceRecognition();
    });

    this.recognition.onstart = () => {
      status.textContent = '🎤 Listening... Speak now!';
      startBtn.disabled = true;
      stopBtn.disabled = false;
    };

    this.recognition.onresult = async (event) => {
      const spokenText = event.results[0][0].transcript;
      transcript.textContent = `You said: "${spokenText}"`;
      
      try {
        const botResponse = await this.sendChatMessage(spokenText);
        response.textContent = `Assistant: ${botResponse}`;
        this.speakText(botResponse);
      } catch (error) {
        response.textContent = 'Error processing your speech. Please try again.';
        console.error('Voice chat error:', error);
      }
    };

    this.recognition.onerror = (event) => {
      status.textContent = `Error: ${event.error}`;
      this.resetVoiceButtons();
    };

    this.recognition.onend = () => {
      status.textContent = 'Click "Start Speaking" to begin';
      this.resetVoiceButtons();
    };
  }

  startVoiceRecognition() {
    this.recognition.start();
  }

  stopVoiceRecognition() {
    this.recognition.stop();
  }

  resetVoiceButtons() {
    document.getElementById('start-voice-btn').disabled = false;
    document.getElementById('stop-voice-btn').disabled = true;
  }

  speakText(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.settings.voiceSpeed;
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    }
  }

  // Progress Functionality
  setupProgress() {
    this.loadProgress();
  }

  async loadProgress() {
    if (!this.currentUser) return;
    try {
      const response = await fetch(`/api/progress/${this.currentUser.id}`);
      const progressData = await response.json();
      
      this.displayProgress(progressData);
    } catch (error) {
      console.error('Error loading progress:', error);
      document.getElementById('progress-list').textContent = 'Error loading progress data.';
    }
  }

  displayProgress(progressData) {
    const progressFill = document.getElementById('overall-progress');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressList = document.getElementById('progress-list');

    if (progressData.length > 0) {
      const latestProgress = progressData[progressData.length - 1].progress;
      progressFill.style.width = `${latestProgress}%`;
      progressPercentage.textContent = `${latestProgress}%`;

      progressList.innerHTML = progressData.map(item => `
        <div class="progress-item">
          <span>Progress: ${item.progress}%</span>
          <span>${new Date(item.updated_at).toLocaleDateString()}</span>
        </div>
      `).join('');
    } else {
      progressPercentage.textContent = '0%';
      progressList.textContent = 'No progress data available yet. Start chatting to track your progress!';
    }
  }

  // Settings Functionality
  setupSettings() {
    const settingsForm = document.getElementById('settings-form');
    const languageSelect = document.getElementById('language-select');
    const voiceSpeedSlider = document.getElementById('voice-speed');
    const speedValue = document.getElementById('speed-value');
    const autoSpeakCheckbox = document.getElementById('auto-speak');

    // Load current settings
    languageSelect.value = this.settings.language;
    voiceSpeedSlider.value = this.settings.voiceSpeed;
    speedValue.textContent = `${this.settings.voiceSpeed}x`;
    autoSpeakCheckbox.checked = this.settings.autoSpeak;

    // Update speed display
    voiceSpeedSlider.addEventListener('input', (e) => {
      speedValue.textContent = `${e.target.value}x`;
    });

    // Save settings
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      this.settings = {
        language: languageSelect.value,
        voiceSpeed: parseFloat(voiceSpeedSlider.value),
        autoSpeak: autoSpeakCheckbox.checked
      };
      
      this.saveSettings();
      this.showNotification('Settings saved successfully!');
    });
  }

  loadSettings() {
    const defaultSettings = {
      language: 'en',
      voiceSpeed: 1.0,
      autoSpeak: false
    };
    
    try {
      const saved = localStorage.getItem('eslChatbotSettings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  }

  saveSettings() {
    localStorage.setItem('eslChatbotSettings', JSON.stringify(this.settings));
  }

  // Utility Functions
  getUserId() {
    let userId = localStorage.getItem('eslChatbotUserId');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('eslChatbotUserId', userId);
    }
    return userId;
  }

  async checkServerConnection() {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      this.updateConnectionStatus(true, data);
    } catch (error) {
      this.updateConnectionStatus(false);
    }
  }

  updateConnectionStatus(connected = true, healthData = null) {
    const statusElement = document.getElementById('connection-status');
    if (connected) {
      statusElement.innerHTML = '🟢 Connected';
      if (healthData) {
        console.log('Server health:', healthData);
      }
    } else {
      statusElement.innerHTML = '🔴 Disconnected';
    }
  }

  showNotification(message) {
    // Simple notification - could be enhanced with a proper notification system
    alert(message);
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.eslChatbotApp = new ESLChatbotApp();
});