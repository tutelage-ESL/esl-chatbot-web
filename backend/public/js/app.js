document.addEventListener('DOMContentLoaded', () => {
  if (window.appInitialized) return;
  window.appInitialized = true;

  const socket = io();

  const chatInputContainer = document.getElementById('chat-input-container');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const chatContainer = document.querySelector('.chat-container');
  const sendBtn = document.getElementById('send-btn');
  // Quick actions
  const suggestionBtns = document.querySelectorAll('.suggestion-btn');
  const clearChatBtn = document.getElementById('clear-chat');
  const downloadChatBtn = document.getElementById('download-chat');
  
  // Voice elements
  const voiceInputBtn = document.getElementById('voice-btn');
  const voiceStatusMini = document.getElementById('voice-status-mini');
  const voiceSettingsBtn = document.getElementById('voice-settings-btn');
  const voiceSettingsPanel = document.getElementById('voice-settings-panel');
  const autoSpeakChat = document.getElementById('auto-speak-chat');
  const voiceSpeedChat = document.getElementById('voice-speed-chat');
  const speedValueChat = document.getElementById('speed-value-chat');
  const autoSpeakIndicatorChat = document.getElementById('auto-speak-indicator-chat');
  const testVoiceChat = document.getElementById('test-voice-chat');
  

  
  let isConnected = false;
  let messageCount = 0;
  let lastMessageType = null;
  let lastUserMessageEl = null;
  
  // Voice variables
  let recognition;
  let isRecognizing = false;
  let currentUtterance = null;
  let voicesLoaded = false;
  
  // Load voices when available
  function loadVoices() {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesLoaded = true;
      console.log('Voices loaded:', voices.length);
    }
  }
  
  // Load voices on page load and when they change
  if ('speechSynthesis' in window) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Connection status handling
  socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
    isConnected = true;
    updateConnectionStatus(true);
    socket.emit('load history');
    showWelcomeMessage();
    loadTTSUsage(); // Load TTS usage when connected
    ensureInputVisible();
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    isConnected = false;
    updateConnectionStatus(false);
  });

  socket.on('reconnect', () => {
    console.log('Reconnected to server');
    isConnected = true;
    updateConnectionStatus(true);
    addSystemMessage('Reconnected to server! 🎉');
  });

  socket.on('chat history', (history) => {
    if (history && history.length > 0) {
      // Clear existing messages to prevent duplicates on reconnect
      const statusElement = document.getElementById('connection-status');
      chatMessages.innerHTML = ''; 
      if (statusElement) chatMessages.appendChild(statusElement);
      messageCount = 0;

      history.forEach(msg => {
        addMessage(msg.content, msg.sender, msg.createdAt);
        messageCount++;
      });
      // After rendering history, keep input bar in view
      ensureInputVisible();
    }
  });

  socket.on('chat message', (data) => {
    // Remove typing indicator if present
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
    addMessage(data.bot, 'bot', new Date());
    // Mark the most recent user message as delivered when a bot reply arrives
    markLastUserMessageDelivered();
    messageCount++;
    
    // Auto-speak AI response if enabled
    if (autoSpeakChat && autoSpeakChat.checked && data.bot) {
      setTimeout(() => {
        speakText(data.bot);
      }, 500); // Small delay to ensure message is displayed
    }
  });

  socket.on('error', (msg) => {
    // Remove typing indicator if present
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
    addMessage(msg, 'error');
    enableInput();
  });

  sendBtn.addEventListener('click', sendMessage);
  // Quick suggestion chips → populate input
  if (suggestionBtns && suggestionBtns.length) {
    suggestionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const text = e.currentTarget?.dataset?.text || e.currentTarget.textContent.trim();
        if (!text) return;
        chatInput.value = text;
        autoResizeTextarea();
        updateSendButtonState();
        chatInput.focus();
      });
    });
  }

  // Clear chat messages (client-side)
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', () => {
      try {
        const confirmed = window.confirm('Clear chat messages? This won\'t delete server history.');
        if (!confirmed) return;
        if (chatMessages) {
          chatMessages.innerHTML = '';
          messageCount = 0;
          addSystemMessage('Chat cleared.');
          ensureInputVisible();
        }
      } catch (err) {
        console.warn('Clear chat failed:', err);
      }
    });
  }

  // Download transcript as text file
  if (downloadChatBtn) {
    downloadChatBtn.addEventListener('click', () => {
      try {
        if (!chatMessages) return;
        const rows = Array.from(chatMessages.querySelectorAll('.message'))
          .filter(row => !row.classList.contains('typing-indicator'));

        const lines = [];
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const ymd = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
        const hms = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        lines.push(`AI English Tutor — Transcript`);
        lines.push(`Date: ${ymd} ${hms}`);
        lines.push('');

        rows.forEach(row => {
          const isUser = row.classList.contains('user-message');
          const isBot = row.classList.contains('bot-message');
          const isSystem = row.classList.contains('system-message');
          const isError = row.classList.contains('error');
          const role = isUser ? 'User' : isBot ? 'Tutor' : isSystem ? 'System' : isError ? 'Error' : 'Message';
          const textEl = row.querySelector('.message-bubble') || row.querySelector('.system-content');
          const text = (textEl ? textEl.textContent : row.textContent || '').trim();
          const timeEl = row.querySelector('.message-time');
          const time = timeEl ? timeEl.textContent.trim() : '';
          lines.push(`${time ? '['+time+'] ' : ''}${role}: ${text}`);
        });

        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-transcript-${ts}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.warn('Download transcript failed:', err);
      }
    });
  }

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  });

  chatInput.addEventListener('input', () => {
    autoResizeTextarea();
    updateSendButtonState();
  });

  chatInput.addEventListener('focus', () => {
    chatInput.parentElement.classList.add('focused');
  });

  chatInput.addEventListener('blur', () => {
    chatInput.parentElement.classList.remove('focused');
  });

  let isSending = false;

  function sendMessage(e) {
    if (e) e.preventDefault();
    if (isSending) return;
    
    const message = chatInput.value.trim();
    if (!message || !isConnected) return;

    isSending = true;
    disableInput();
    addMessage(message, 'user', new Date());
    messageCount++;

    // Add typing indicator
    const typingId = 'typing-' + Date.now();
    addTypingIndicator(typingId);

    // Generate unique ID for deduplication
    const messageId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    socket.emit('chat message', { content: message, id: messageId });
    clearInput();
    
    // Reset flag after short delay or when input enabled
    setTimeout(() => { isSending = false; }, 500);
  }

  function addMessage(text, type, timestamp = new Date(), id = null) {
    const messageDiv = document.createElement('div');
    // Align user messages to the right; compact consecutive messages
    const isContinued = lastMessageType === type;
    messageDiv.className = `message ${type}-message flex items-start gap-3 ${type === 'user' ? 'ml-auto' : ''} ${isContinued ? 'message-continued' : ''}`;
    if (id) {
      messageDiv.id = id;
    }

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let avatarIcon = '';
    if (type === 'user') {
      avatarIcon = '<i class="fas fa-user"></i>';
    } else if (type === 'bot') {
      avatarIcon = '<i class="fas fa-robot"></i>';
    } else if (type === 'error') {
      avatarIcon = '<i class="fas fa-exclamation-triangle"></i>';
    }

    const avatarClasses =
      type === 'user'
        ? 'message-avatar w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground'
        : type === 'bot'
        ? 'message-avatar w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground'
        : 'message-avatar w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white';

    const contentClasses =
      type === 'user'
        ? 'message-content flex flex-col items-end max-w-[75%]'
        : 'message-content flex flex-col max-w-[75%]';

    const bubbleClasses =
      type === 'user'
        ? 'message-bubble bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-br-none shadow-sm'
        : type === 'bot'
        ? 'message-bubble bg-muted text-foreground px-4 py-2 rounded-2xl rounded-bl-none shadow-sm border border-border'
        : 'message-bubble bg-red-100 text-red-700 px-4 py-2 rounded-2xl shadow-sm';

    const timeClasses = `message-time text-xs text-muted-foreground mt-1 ${type === 'user' ? 'text-right' : ''}`;
    const metaHtml = `
      <div class="message-meta">
        <div class="${timeClasses}">${timeString}</div>
        ${type === 'user' ? '<div class="message-status" aria-live="polite"><i class="fas fa-check"></i> Sent</div>' : ''}
      </div>
    `;

    messageDiv.innerHTML = `
      <div class="${avatarClasses}">${avatarIcon}</div>
      <div class="${contentClasses}">
        <div class="${bubbleClasses}">${text}</div>
        ${metaHtml}
      </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    smoothScrollToBottom();
    
    // Add entrance animation
    setTimeout(() => {
      messageDiv.classList.add('message-entered');
    }, 10);

    // Track last sender and last user message for status updates
    lastMessageType = type;
    if (type === 'user') {
      lastUserMessageEl = messageDiv;
    }
  }

  function addTypingIndicator(id) {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator flex items-start gap-3';
    typingDiv.id = id;
    
    typingDiv.innerHTML = `
      <div class="message-avatar w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground"><i class="fas fa-robot"></i></div>
      <div class="message-content flex flex-col max-w-[75%]">
        <div class="message-bubble bg-muted text-foreground px-4 py-2 rounded-2xl rounded-bl-none shadow-sm border border-border">
          <div class="typing-animation flex items-center space-x-1">
            <span class="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></span>
            <span class="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150"></span>
            <span class="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-300"></span>
          </div>
          <span class="typing-text text-muted-foreground text-sm ml-2">AI is thinking...</span>
        </div>
      </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    smoothScrollToBottom();
    
    setTimeout(() => {
      typingDiv.classList.add('message-entered');
    }, 10);
  }

  function addSystemMessage(text) {
    const systemDiv = document.createElement('div');
    systemDiv.className = 'message system-message flex justify-center';
    
    systemDiv.innerHTML = `
      <div class="system-content bg-primary/10 text-primary px-3 py-2 rounded-md text-sm flex items-center gap-2 border border-primary/20">
        <i class="fas fa-info-circle"></i>
        <span>${text}</span>
      </div>
    `;

    chatMessages.appendChild(systemDiv);
    smoothScrollToBottom();
  }

  function markLastUserMessageDelivered() {
    try {
      if (!lastUserMessageEl) return;
      const statusEl = lastUserMessageEl.querySelector('.message-status');
      if (!statusEl) return;
      statusEl.innerHTML = '<i class="fas fa-check-double"></i> Delivered';
      lastUserMessageEl.classList.add('delivered');
    } catch (e) {
      console.warn('Failed to mark delivered:', e);
    }
  }

  function showWelcomeMessage() {
    if (messageCount === 0) {
      setTimeout(() => {
        addSystemMessage('Welcome to your ESL Learning Assistant! 👋 Start a conversation to practice your English!');
      }, 500);
    }
  }

  function disableInput() {
    chatInput.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="loading"></div>';
    chatInputContainer.classList.add('sending');
  }

  function enableInput() {
    chatInput.disabled = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    chatInputContainer.classList.remove('sending');
    chatInput.focus();
    updateSendButtonState();
    isSending = false;
  }

  function clearInput() {
    chatInput.value = '';
    autoResizeTextarea();
    enableInput();
  }

  function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  }

  function updateSendButtonState() {
    const hasText = chatInput.value.trim().length > 0;
    sendBtn.classList.toggle('has-text', hasText && isConnected);
  }

  function updateConnectionStatus(connected) {
    const statusIndicator = document.querySelector('.connection-status') || createConnectionStatus();
    statusIndicator.className = `connection-status ${connected ? 'connected' : 'disconnected'} text-center text-gray-500 text-sm`;
    statusIndicator.innerHTML = connected 
      ? '<i class="fas fa-wifi text-green-500"></i> Connected' 
      : '<i class="fas fa-wifi text-red-500"></i> Disconnected';
  }

  function createConnectionStatus() {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'connection-status text-center text-gray-500 text-sm';
    statusDiv.id = 'connection-status';
    chatMessages.appendChild(statusDiv);
    return statusDiv;
  }

  function smoothScrollToBottom() {
    const target = chatContainer || chatMessages;
    target.scrollTo({
      top: target.scrollHeight,
      behavior: 'smooth'
    });
  }

  // Ensure input bar is visible and focused
  function ensureInputVisible() {
    try {
      if (chatInput) {
        chatInput.focus({ preventScroll: false });
      }
      if (chatInputContainer && typeof chatInputContainer.scrollIntoView === 'function') {
        chatInputContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
      // Nudge the chat container to bottom as well
      setTimeout(() => smoothScrollToBottom(), 50);
    } catch (e) {
      console.warn('ensureInputVisible failed:', e);
    }
  }

  // Voice functionality
  function initializeVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported');
      if (voiceInputBtn) voiceInputBtn.style.display = 'none';
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isRecognizing = true;
      updateVoiceStatus('Listening...', 'listening');
      if (voiceInputBtn) {
        voiceInputBtn.innerHTML = '<i class="fas fa-stop"></i>';
        voiceInputBtn.classList.add('listening');
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice input:', transcript);
      chatInput.value = transcript;
      updateSendButtonState();
      updateVoiceStatus('Voice input received', 'success');
      setTimeout(() => updateVoiceStatus('Ready', 'ready'), 2000);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      let errorMessage = 'Voice input error';
      if (event.error === 'no-speech') {
        errorMessage = 'No speech detected';
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Microphone access denied';
      }
      updateVoiceStatus(errorMessage, 'error');
      setTimeout(() => updateVoiceStatus('Ready', 'ready'), 3000);
    };

    recognition.onend = () => {
      isRecognizing = false;
      if (voiceInputBtn) {
        voiceInputBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceInputBtn.classList.remove('listening');
      }
    };
  }

  function updateVoiceStatus(message, type) {
    if (voiceStatusMini) {
      voiceStatusMini.textContent = message;
      voiceStatusMini.className = `voice-status-mini ${type}`;
    }
  }

  // ElevenLabs Voice Service
  let elevenLabsAvailable = false;
  let elevenLabsVoices = [];
  let selectedVoiceId = null;

  async function checkElevenLabsStatus() {
    try {
      const response = await fetch('/api/voice-status');
      const status = await response.json();
      elevenLabsAvailable = status.elevenLabs.available;
      
      if (elevenLabsAvailable) {
        console.log('ElevenLabs service available with', status.elevenLabs.voiceCount, 'voices');
        await loadElevenLabsVoices();
      } else {
        console.log('ElevenLabs service not available, using browser TTS fallback');
      }
    } catch (error) {
      console.error('Failed to check ElevenLabs status:', error);
      elevenLabsAvailable = false;
    }
  }

  async function loadElevenLabsVoices() {
    try {
      const response = await fetch('/api/voices');
      const data = await response.json();
      
      if (data.available && data.voices) {
        elevenLabsVoices = data.voices;
        // Select the first available voice as default
        selectedVoiceId = elevenLabsVoices[0]?.id || null;
        console.log('Loaded ElevenLabs voices:', elevenLabsVoices.length);
      }
    } catch (error) {
      console.error('Failed to load ElevenLabs voices:', error);
    }
  }

  async function ensureElevenLabsReady() {
    if (!elevenLabsAvailable) {
      await checkElevenLabsStatus();
      await new Promise(r => setTimeout(r, 50));
    }
    if (!selectedVoiceId) {
      await loadElevenLabsVoices();
      await new Promise(r => setTimeout(r, 50));
    }
    return elevenLabsAvailable && !!selectedVoiceId;
  }

  async function speakWithElevenLabs(text) {
    try {
      const speed = voiceSpeedChat ? parseFloat(voiceSpeedChat.value) : 1.0;
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          voiceId: selectedVoiceId,
          options: {
            stability: 0.5,
            similarityBoost: 0.8,
            style: 0.0,
            useSpeakerBoost: true
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.fallback) {
          console.log('ElevenLabs not available, falling back to browser TTS');
          return false; // Signal to use fallback
        }
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const audioBuffer = await response.arrayBuffer();
      
      // Use Web Audio API for better compatibility
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const decodedAudio = await audioContext.decodeAudioData(audioBuffer.slice());
        
        // Create audio source
        const source = audioContext.createBufferSource();
        source.buffer = decodedAudio;
        
        // Apply speed setting
        source.playbackRate.value = speed;
        
        // Connect to output
        source.connect(audioContext.destination);
        
        console.log('ElevenLabs AI speaking...');
        
        // Play audio
        source.start(0);
        
        // Wait for audio to finish
        await new Promise((resolve) => {
          source.onended = () => {
            console.log('ElevenLabs AI finished speaking');
            resolve();
          };
        });
        
      } catch (webAudioError) {
        console.warn('Web Audio API failed, trying HTML5 Audio:', webAudioError);
        
        // Fallback to HTML5 Audio with base64 encoding
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
        const audioSrc = `data:audio/mpeg;base64,${base64Audio}`;
        
        const audio = new Audio(audioSrc);
        audio.playbackRate = speed;
        
        audio.onplay = () => {
          console.log('ElevenLabs AI speaking (HTML5 fallback)...');
        };
        
        audio.onended = () => {
          console.log('ElevenLabs AI finished speaking');
        };
        
        audio.onerror = (error) => {
          console.error('HTML5 Audio playback error:', error);
          throw error;
        };
        
        await audio.play();
      }
      return true;
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      return false; // Signal to use fallback
    }
  }

  function getBestVoice() {
    const voices = speechSynthesis.getVoices();
    
    if (!voicesLoaded || !voices.length) {
      console.log('Voices not loaded yet');
      return null;
    }
    
    // Priority order for better quality voices
    const preferredVoices = [
      // High-quality English voices (usually local/system voices)
      'Microsoft Zira - English (United States)',
      'Microsoft David - English (United States)', 
      'Microsoft Mark - English (United States)',
      'Google US English',
      'Google UK English Female',
      'Google UK English Male',
      'Alex', // macOS
      'Samantha', // macOS
      'Karen', // macOS
      'Daniel', // macOS
      // Fallback to any English voice
      voices.find(v => v.lang === 'en-US' && v.localService),
      voices.find(v => v.lang === 'en-GB' && v.localService),
      voices.find(v => v.lang.startsWith('en-') && v.localService),
      voices.find(v => v.lang === 'en-US'),
      voices.find(v => v.lang === 'en-GB'),
      voices.find(v => v.lang.startsWith('en-'))
    ];
    
    for (const preferred of preferredVoices) {
      if (typeof preferred === 'string') {
        const voice = voices.find(v => v.name === preferred);
        if (voice) {
          console.log('Selected high-quality voice:', voice.name);
          return voice;
        }
      } else if (preferred) {
        console.log('Selected voice:', preferred.name);
        return preferred;
      }
    }
    
    console.log('Using default voice');
    return null;
  }

  function speakWithBrowserTTS(text) {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }

    console.log('Using browser TTS fallback...');
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const speed = voiceSpeedChat ? parseFloat(voiceSpeedChat.value) : 1.0;
    utterance.rate = speed;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    // Use the best available voice
    const bestVoice = getBestVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
      console.log('Using high-quality voice:', bestVoice.name, '- Local:', bestVoice.localService);
    }

    currentUtterance = utterance;

    utterance.onstart = () => {
      console.log('Browser TTS speaking...');
    };

    utterance.onend = () => {
      currentUtterance = null;
      console.log('Browser TTS finished speaking');
    };

    utterance.onerror = (event) => {
      currentUtterance = null;
      console.error('Speech synthesis error:', event.error);
    };

    console.log(`Speaking text at ${speed}x speed with ${bestVoice ? bestVoice.name : 'default voice'}: "${text.substring(0, 50)}..."`); 
    
    if (!voicesLoaded) {
      console.log('Voices not loaded yet, attempting to load...');
      loadVoices();
      setTimeout(() => {
        speechSynthesis.speak(currentUtterance);
      }, 100);
    } else {
      speechSynthesis.speak(currentUtterance);
    }
  }

  async function speakText(text) {
    console.log('Starting speech synthesis...');
    
    // Try ElevenLabs first if available and ready
    if (await ensureElevenLabsReady()) {
      const success = await speakWithElevenLabs(text);
      if (success) {
        return; // Successfully used ElevenLabs
      }
    }
    
    // Fallback to browser TTS
    speakWithBrowserTTS(text);
  }

  // Voice event listeners
  if (voiceInputBtn) {
    voiceInputBtn.addEventListener('click', () => {
      if (isRecognizing) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  }

  if (voiceSettingsBtn && voiceSettingsPanel) {
    voiceSettingsBtn.addEventListener('click', () => {
      const isVisible = voiceSettingsPanel.style.display !== 'none';
      voiceSettingsPanel.style.display = isVisible ? 'none' : 'block';
      voiceSettingsBtn.setAttribute('aria-expanded', (!isVisible).toString());
    });
  }

  if (voiceSpeedChat && speedValueChat) {
    voiceSpeedChat.addEventListener('input', () => {
      speedValueChat.textContent = voiceSpeedChat.value;
    });
  }

  if (autoSpeakChat && autoSpeakIndicatorChat) {
    autoSpeakChat.addEventListener('change', () => {
      const isEnabled = autoSpeakChat.checked;
      if (isEnabled) {
        autoSpeakIndicatorChat.textContent = ' (Enabled)';
        autoSpeakIndicatorChat.className = 'text-success';
      } else {
        autoSpeakIndicatorChat.textContent = ' (Disabled)';
        autoSpeakIndicatorChat.className = 'text-muted';
      }
    });
  }

  if (testVoiceChat) {
    testVoiceChat.addEventListener('click', () => {
      const testMessage = 'Hello! This is a test of the voice synthesis system in chat.';
      speakText(testMessage);
    });
  }

  // Initialize
  updateSendButtonState();
  initializeVoiceRecognition();
  checkElevenLabsStatus();
  ensureInputVisible();
  
  // TTS Usage Loading Function
  async function loadTTSUsage() {
    try {
      const response = await fetch('/api/subscription/status');
      if (response.ok) {
        const data = await response.json();
        console.log('TTS Usage data received:', data); // Debug log
        
        const ttsRemainingElement = document.getElementById('tts-remaining');
        if (ttsRemainingElement) {
          // Convert seconds to minutes for display
          const remainingMinutes = Math.floor(data.remainingUsage / 60);
          const totalMinutes = Math.floor(data.monthlyLimit / 60);
          
          ttsRemainingElement.textContent = `${remainingMinutes}/${totalMinutes} min`;
          
          // Add warning styling if usage is high
          const usageDisplay = document.getElementById('tts-usage-display');
          if (usageDisplay) {
            // Clear existing classes
            usageDisplay.classList.remove('usage-warning', 'usage-caution');
            
            if (data.remainingUsage <= 600) { // 10 minutes or less
              usageDisplay.classList.add('usage-warning');
            } else if (data.remainingUsage <= 3000) { // 50 minutes or less
              usageDisplay.classList.add('usage-caution');
            }
          }
        }
      } else {
        console.error('Failed to load TTS usage, status:', response.status);
        const ttsRemainingElement = document.getElementById('tts-remaining');
        if (ttsRemainingElement) {
          ttsRemainingElement.textContent = 'Error';
        }
      }
    } catch (error) {
      console.error('Error loading TTS usage:', error);
      const ttsRemainingElement = document.getElementById('tts-remaining');
      if (ttsRemainingElement) {
        ttsRemainingElement.textContent = 'Error';
      }
    }
  }
  
  // Update TTS usage after each TTS request
  socket.on('tts response', (data) => {
    if (data.audio) {
      loadTTSUsage(); // Refresh usage after TTS
    }
  });
});
