import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';



class ESLChatbotApp {

  // Authentication
  setupAuth() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        await this.login(email, password);
      });
    }

    if (signupForm) {
      console.log('Signup form element found, attaching event listener.');
      signupForm.addEventListener('submit', async (e) => {
    console.log('Signup form submitted.');
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        await this.signup(username, email, password);
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
        });

        if (response.ok) {
          console.log('Logout successful');
          window.location.href = '/login';
        } else {
          console.error('Logout failed');
          alert('Logout failed!');
        }
      });
    }
  }

  async login(email, password) {
    console.log('Attempting login for:', email);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Login successful:', data);
        alert('Login successful!');
        if (data.redirect) {
          window.location.href = data.redirect;
        } else {
          window.location.href = '/dashboard'; // Fallback
        }
      } else {
        console.error('Login failed:', data);
        alert(`Login failed: ${data.message || data.error}`);
      }
    } catch (error) {
      alert(`Login failed: ${error.message}`);
      console.error('Login error:', error);
    }
  }

  async signup(username, email, password) {
    console.log('Attempting signup for:', email);
    try {
      console.log('Attempting to send signup data to backend API...');
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Signup successful:', data);
        alert('Signup successful! Please log in.');
        if (data.redirect) {
          window.location.href = data.redirect;
        } else {
          window.location.href = '/login'; // Fallback
        }
      } else {
        console.error('Signup failed:', data);
        alert(`Signup failed: ${data.message || data.error}`);
      }
    } catch (error) {
      alert(`Signup failed: ${error.message}`);
      console.error('Signup error:', error);
    }
  }

  async logout() {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });

    if (response.ok) {
      console.log('Logout successful');
      window.location.href = '/login';
    } else {
      console.error('Logout failed');
      alert('Logout failed!');
    }
  }


  constructor() {
    this.currentUser = null;
    this.currentSection = 'chat';
    this.settings = this.loadSettings();
    document.addEventListener('DOMContentLoaded', () => this.init());
  }

  init() {
    this.setupAuth();
    this.setupNavigation();
    this.setupChat();
    this.setupVoice();
    this.setupProgress();
    this.setupSettings();
  }

  // Navigation System
  setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');

    navButtons.forEach(button => {
      button.addEventListener('click', () => {
        const route = button.dataset.route;
        if (route) {
          window.location.href = `/${route}`;
        }
      });
    });
  }

  // Chat Functionality
  setupChat() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const sendBtn = document.getElementById('send-btn');

    if (chatForm) {
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
    if (!chatMessages) return; // Ensure chatMessages element exists

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

    if (!startBtn) return; // Ensure voice elements exist

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
    // Only attempt to load progress if on the progress page
    if (window.location.pathname !== '/progress') return;

    // Fetch current user session to get user ID
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session || !session.user) {
      console.error('No active session found for progress tracking:', sessionError);
      document.getElementById('progress-list').textContent = 'Please log in to view your progress.';
      return;
    }
    this.currentUser = session.user;

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

    if (!progressFill || !progressPercentage || !progressList) return; // Ensure elements exist

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

    if (!settingsForm) return; // Ensure settings elements exist

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
  showNotification(message) {
    // Simple notification - could be enhanced with a proper notification system
    alert(message);
  }


}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.eslChatbotApp = new ESLChatbotApp();
});