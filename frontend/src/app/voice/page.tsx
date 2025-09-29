'use client';

import { useState, useEffect, useRef } from 'react';
import TTSStatusIndicator from '@/components/TTSStatusIndicator';
import { ThemedComponent, useTheme } from '@/components/ThemeProvider';
import { useOptimizedRouter } from '@/lib/routing';
import AppLayout from '@/components/AppLayout';
import api from '@/lib/api';

interface VoiceSettings {
  autoSpeak: boolean;
  speechSpeed: number;
}

export default function VoicePage() {
  const { theme } = useTheme();
  const router = useOptimizedRouter();
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('Your speech will appear here...');
  const [assistantResponse, setAssistantResponse] = useState('AI response will appear here...');
  const [voiceStatus, setVoiceStatus] = useState('Ready to listen');
  const [settings, setSettings] = useState<VoiceSettings>({
    autoSpeak: true,
    speechSpeed: 1.0
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasResponse, setHasResponse] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Prefetch likely routes
  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/chat');
    router.prefetch('/pronunciation');
  }, [router]);

  useEffect(() => {
    // Initialize speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Initialize speech recognition
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setVoiceStatus('Listening...');
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setRecognizedText(transcript);
        handleSpeechInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setVoiceStatus(`Error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (!isProcessing) {
          setVoiceStatus('Ready to listen');
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [isProcessing]);

  const startRecognition = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        setVoiceStatus('Error starting recognition');
      }
    }
  };

  const stopRecognition = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleSpeechInput = async (text: string) => {
    setIsProcessing(true);
    setVoiceStatus('Processing...');

    try {
      const response = await api.post('/api/chat/voice', {
        message: text,
        context: 'voice_learning'
      });

      const aiResponse = response.data.response || response.data.message || 'I understand what you said!';
      setAssistantResponse(aiResponse);
      setHasResponse(true);

      if (settings.autoSpeak) {
        speakText(aiResponse);
      }

      setVoiceStatus('Ready to listen');
    } catch (error) {
      console.error('Error processing speech:', error);
      const fallbackResponse = generateFallbackResponse(text);
      setAssistantResponse(fallbackResponse);
      setHasResponse(true);
      
      if (settings.autoSpeak) {
        speakText(fallbackResponse);
      }
      
      setVoiceStatus('Ready to listen');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateFallbackResponse = (userText: string): string => {
    const responses = [
      `I heard you say "${userText}". That's great practice! Can you tell me more about that topic?`,
      `Thank you for sharing "${userText}". Your pronunciation sounds good! What else would you like to discuss?`,
      `I understand you said "${userText}". That's excellent English! Would you like to practice more conversation?`,
      `You mentioned "${userText}". That's very interesting! Can you elaborate on that?`,
      `I caught "${userText}" - your speaking is improving! Let's continue our conversation.`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const speakText = async (text: string) => {
    try {
      const { smartTTS } = await import('@/lib/smartTTS');
      const result = await smartTTS.speak(text);
      
      if (result.success) {
        // Log which service was used for user awareness
        if (result.usedElevenLabs) {
          console.log('✅ Used ElevenLabs TTS');
        } else {
          console.log('🔊 Used Enhanced Free TTS');
        }
      } else {
        console.error('TTS failed:', result.error);
        
        // Ultimate fallback to basic browser TTS
        if (synthRef.current) {
          synthRef.current.cancel();
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = settings.speechSpeed;
          utterance.pitch = 1;
          utterance.volume = 1;
          
          // Try to use a more natural voice
          const voices = synthRef.current.getVoices();
          const englishVoice = voices.find(voice => 
            voice.lang.startsWith('en') && voice.name.includes('Google')
          ) || voices.find(voice => voice.lang.startsWith('en'));
          
          if (englishVoice) {
            utterance.voice = englishVoice;
          }

          synthRef.current.speak(utterance);
        }
      }
    } catch (error) {
      console.error('Smart TTS service failed:', error);
      
      // Ultimate fallback to basic browser TTS
      if (synthRef.current) {
        synthRef.current.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = settings.speechSpeed;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Try to use a more natural voice
        const voices = synthRef.current.getVoices();
        const englishVoice = voices.find(voice => 
          voice.lang.startsWith('en') && voice.name.includes('Google')
        ) || voices.find(voice => voice.lang.startsWith('en'));
        
        if (englishVoice) {
          utterance.voice = englishVoice;
        }

        synthRef.current.speak(utterance);
      }
    }
  };

  const testVoice = () => {
    speakText('Hello! This is a test of the text-to-speech system. How does this sound?');
  };

  const testAPI = async () => {
    setVoiceStatus('Testing API...');
    try {
      const response = await api.get('/api/test');
      setAssistantResponse(`API Test Result: ${JSON.stringify(response.data)}`);
      setVoiceStatus('API test completed');
    } catch (error) {
      console.error('API test failed:', error);
      setAssistantResponse('API test failed. Using offline mode.');
      setVoiceStatus('API test failed');
    }
  };

  const updateSettings = (key: keyof VoiceSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const navigateToPage = (path: string) => {
    router.navigate(path);
  };

  const getStatusClass = () => {
    if (isListening) return 'listening';
    if (isProcessing) return 'processing';
    if (voiceStatus.includes('Error')) return 'error';
    return 'ready';
  };

  return (
    <ThemedComponent>
      <AppLayout>
        <div className="app-container">
        <header className="auth-header">
          <div className="academy-brand">
            <div className="academy-logo">🎓</div>
            <h1>ESL Academy</h1>
            <div className="academy-tagline">Excellence in English Learning</div>
          </div>
          <nav className="app-nav">
            <button onClick={() => navigateToPage('/dashboard')} className="btn btn-nav">
              <i className="fas fa-home"></i>
              <span>Dashboard</span>
            </button>
            <button onClick={() => navigateToPage('/chat')} className="btn btn-nav">
              <i className="fas fa-comments"></i>
              <span>Chat</span>
            </button>
            <button onClick={() => navigateToPage('/pronunciation')} className="btn btn-nav">
              <i className="fas fa-microphone-alt"></i>
              <span>Pronunciation</span>
            </button>
            <button className="btn btn-nav active">
              <i className="fas fa-microphone"></i>
              <span>Voice</span>
            </button>
          </nav>
        </header>

        <main className="app-main">
          <div className="voice-container">
            <div className="voice-header">
              <div className="voice-title-section">
                <h2><i className="fas fa-microphone"></i> Voice Learning Assistant</h2>
                <TTSStatusIndicator className="ml-4" showDetails={false} />
              </div>
              <p className="voice-description">
                Practice your English speaking skills with our AI tutor. Click "Start Speaking" and have a natural conversation!
              </p>
            </div>

            <div className="voice-status-container">
              <div className={`voice-status ${getStatusClass()}`}>
                {voiceStatus}
              </div>
            </div>

            <div className="voice-controls">
              <button 
                className="voice-btn primary"
                onClick={startRecognition}
                disabled={isListening || isProcessing}
              >
                <i className="fas fa-microphone"></i> Start Speaking
              </button>
              <button 
                className="voice-btn secondary"
                onClick={stopRecognition}
                disabled={!isListening}
              >
                <i className="fas fa-stop"></i> Stop Speaking
              </button>
              <button 
                className="btn btn-warning"
                onClick={testAPI}
                style={{ marginLeft: '10px' }}
              >
                <i className="fas fa-flask"></i> Test API
              </button>
            </div>

            <div className="voice-settings">
              <h5><i className="fas fa-cog"></i> Voice Settings</h5>
              <div className="form-check">
                <input 
                  className="form-check-input"
                  type="checkbox"
                  id="auto-speak"
                  checked={settings.autoSpeak}
                  onChange={(e) => updateSettings('autoSpeak', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="auto-speak">
                  <i className="fas fa-volume-up"></i> Auto-speak AI responses
                  <small className={`text-${settings.autoSpeak ? 'success' : 'muted'}`}>
                    {settings.autoSpeak ? ' (Enabled)' : ' (Disabled)'}
                  </small>
                </label>
              </div>
              <div className="form-group">
                <label htmlFor="voice-speed">Speech Speed:</label>
                <input 
                  type="range"
                  id="voice-speed"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.speechSpeed}
                  onChange={(e) => updateSettings('speechSpeed', parseFloat(e.target.value))}
                  className="form-control-range"
                />
                <small className="form-text text-muted">
                  Speed: <span>{settings.speechSpeed.toFixed(1)}</span>x
                </small>
              </div>
              <div className="form-group">
                <button 
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={testVoice}
                >
                  <i className="fas fa-volume-up"></i> Test Voice
                </button>
              </div>
            </div>

            <div className="voice-output">
              <div className="voice-section">
                <div className="section-header">
                  <i className="fas fa-user"></i>
                  <h3>You said:</h3>
                </div>
                <div className="text-display user-text">
                  <p className="voice-text">{recognizedText}</p>
                </div>
              </div>

              <div className="voice-section">
                <div className="section-header">
                  <i className="fas fa-robot"></i>
                  <h3>Assistant:</h3>
                  {hasResponse && (
                    <button 
                      className="speak-btn"
                      onClick={() => speakText(assistantResponse)}
                    >
                      <i className="fas fa-volume-up"></i> Speak Response
                    </button>
                  )}
                </div>
                <div className="text-display assistant-text">
                  <p className="voice-text">{assistantResponse}</p>
                </div>
              </div>
            </div>

            <div className="voice-tips">
              <h4><i className="fas fa-lightbulb"></i> Tips for better voice recognition:</h4>
              <ul>
                <li>Speak clearly and at a normal pace</li>
                <li>Ensure you're in a quiet environment</li>
                <li>Allow microphone access when prompted</li>
                <li>Wait for the "Listening..." status before speaking</li>
                <li>Speak for at least 2-3 seconds to avoid detection issues</li>
                <li>If you get "No speech detected", try speaking louder or closer to the microphone</li>
                <li>Make sure no other applications are using your microphone</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  </ThemedComponent>
  );
}