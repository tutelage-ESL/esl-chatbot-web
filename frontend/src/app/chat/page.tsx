'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useOptimizedRouter } from '@/lib/routing';
import TTSStatusIndicator from '@/components/TTSStatusIndicator';
import { ThemedComponent, useTheme } from '@/components/ThemeProvider';
import AppLayout from '@/components/AppLayout';
import socketService from '@/lib/socket';

interface ChatMessage {
  user?: string;
  bot?: string;
  timestamp?: string;
}

interface TTSUsage {
  remaining: string;
  percentage: number;
}

export default function ChatPage() {
  const router = useOptimizedRouter();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ttsUsage, setTtsUsage] = useState<TTSUsage>({ remaining: 'Loading...', percentage: 0 });
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const socket = socketService.connect();
    
    socket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      socket.emit('load history');
      loadTTSUsage();
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socket.on('chat message', (data: ChatMessage) => {
      setMessages(prev => [...prev, data]);
      if (autoSpeak && data.bot) {
        speakText(data.bot);
      }
    });

    socket.on('chat history', (history: ChatMessage[]) => {
      setMessages(history);
    });

    socket.on('error', (error: string) => {
      console.error('Socket error:', error);
      alert('Error: ' + error);
    });

    return () => {
      socketService.disconnect();
    };
  }, [autoSpeak]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTTSUsage = async () => {
    try {
      const response = await api.get('/api/usage');
      if (response.data) {
        const { remainingUsage, usagePercentage } = response.data;
        const minutes = Math.floor(remainingUsage / 60);
        const seconds = remainingUsage % 60;
        setTtsUsage({
          remaining: `${minutes}m ${seconds}s`,
          percentage: usagePercentage
        });
      }
    } catch (error) {
      console.error('Failed to load TTS usage:', error);
    }
  };

  const speakText = async (text: string) => {
    try {
      const { smartTTS } = await import('@/lib/smartTTS');
      const result = await smartTTS.speak(text);
      
      if (result.success) {
        // Refresh TTS usage after successful TTS
        loadTTSUsage();
        
        // Log which service was used for user awareness
        if (result.usedElevenLabs) {
          console.log('✅ Used ElevenLabs TTS');
        } else {
          console.log('🔊 Used Enhanced Free TTS');
        }
      } else {
        console.error('TTS failed:', result.error);
        
        // Ultimate fallback to basic browser TTS
        if ('speechSynthesis' in window) {
          speechSynthesis.cancel();
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = voiceSpeed;
          utterance.pitch = 1;
          utterance.volume = 1;
          
          speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      console.error('Smart TTS service failed:', error);
      
      // Ultimate fallback to basic browser TTS
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = voiceSpeed;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        speechSynthesis.speak(utterance);
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !isConnected) return;

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('chat message', inputMessage.trim());
      setInputMessage('');
      setIsLoading(true);
      
      // Stop loading after a reasonable time
      setTimeout(() => setIsLoading(false), 5000);
    }
  };

  const clearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('clear chat');
      }
    }
  };

  const testVoice = () => {
    speakText('Hello! This is a test of the text-to-speech feature.');
  };

  return (
    <ThemedComponent>
      <AppLayout>
        <div className="page-container">
        {/* Chat Header Card */}
        <div className="card">
          <div className="card-header">
            <div className="chat-avatar">
              <div className="avatar-icon">🤖</div>
              <div className="chat-info">
                <h3 className="card-title">AI English Tutor</h3>
                <div className="chat-status">
                  <span className={`status-indicator ${isConnected ? 'online' : 'offline'}`}></span>
                  <span className="card-subtitle">
                    {isConnected ? 'Online & Ready to Help' : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="chat-controls">
              {/* TTS Status Indicator */}
              <TTSStatusIndicator className="mr-4" showDetails={false} />
              
              {/* TTS Usage Display */}
              <div className="tts-usage">
                <span className="tts-icon">🔊</span>
                <div className="tts-info">
                  <span className="tts-remaining">{ttsUsage.remaining}</span>
                  <small className="tts-label">TTS remaining</small>
                </div>
              </div>
              
              {/* Voice Settings Button */}
              <button
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                className="btn btn-secondary"
                title="Voice Settings"
              >
                ⚙️ Settings
              </button>
              
              {/* Clear Chat Button */}
              <button
                onClick={clearChat}
                className="btn btn-warning"
                title="Clear Chat"
              >
                🗑️ Clear
              </button>
            </div>
          </div>

          {/* Voice Settings Panel */}
          {showVoiceSettings && (
            <div className="card-body">
              <div className="voice-settings-panel">
                <h4 className="settings-title">Voice Settings</h4>
                
                <div className="settings-grid">
                  <div className="setting-item">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={autoSpeak}
                        onChange={(e) => setAutoSpeak(e.target.checked)}
                        className="form-checkbox"
                      />
                      <span className="checkmark"></span>
                      Auto-speak responses
                    </label>
                  </div>
                  
                  <div className="setting-item">
                    <label className="form-label">Speech Speed: {voiceSpeed}x</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={voiceSpeed}
                      onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                      className="form-range"
                    />
                  </div>
                  
                  <button
                    onClick={testVoice}
                    className="btn btn-primary"
                  >
                    🔊 Test Voice
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Messages Card */}
        <div className="card chat-card">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">👋</div>
                <h3 className="empty-title">Welcome to AI English Tutor!</h3>
                <p className="empty-text">Start a conversation to practice your English skills. Ask questions, practice grammar, or have a casual chat!</p>
                <div className="empty-suggestions">
                  <button 
                    onClick={() => setInputMessage("Hello! Can you help me practice English?")}
                    className="btn btn-secondary btn-sm"
                  >
                    Start with greeting
                  </button>
                  <button 
                    onClick={() => setInputMessage("Can you explain the difference between 'affect' and 'effect'?")}
                    className="btn btn-secondary btn-sm"
                  >
                    Ask grammar question
                  </button>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div key={index} className="message-group">
                {message.user && (
                  <div className="message-wrapper user-message">
                    <div className="message-bubble user-bubble">
                      <div className="message-content">{message.user}</div>
                      <div className="message-time">
                        {message.timestamp && new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="message-avatar user-avatar">👤</div>
                  </div>
                )}
                {message.bot && (
                  <div className="message-wrapper bot-message">
                    <div className="message-avatar bot-avatar">🤖</div>
                    <div className="message-bubble bot-bubble">
                      <div className="message-content">{message.bot}</div>
                      <div className="message-actions">
                        <button
                          onClick={() => speakText(message.bot!)}
                          className="btn btn-icon"
                          title="Speak this message"
                        >
                          🔊
                        </button>
                        <div className="message-time">
                          {message.timestamp && new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="message-wrapper bot-message">
                <div className="message-avatar bot-avatar">🤖</div>
                <div className="message-bubble bot-bubble loading-message">
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <span>AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="card-footer">
            <form onSubmit={handleSendMessage} className="chat-form">
              <div className="input-group">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message here... Ask questions, practice grammar, or have a conversation!"
                  className="form-input chat-input"
                  disabled={!isConnected}
                />
                <button
                  type="submit"
                  disabled={!isConnected || !inputMessage.trim()}
                  className="btn btn-primary send-btn"
                >
                  {isLoading ? '⏳' : '📤'} Send
                </button>
              </div>
              {!isConnected && (
                <div className="connection-status">
                  <span className="status-indicator offline"></span>
                  Connecting to chat server...
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  </ThemedComponent>
  );
}