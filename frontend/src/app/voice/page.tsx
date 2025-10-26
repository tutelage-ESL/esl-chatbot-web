'use client';

import { useState, useEffect, useRef } from 'react';
import TTSStatusIndicator from '@/components/TTSStatusIndicator';
import { useOptimizedRouter } from '@/lib/routing';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

interface VoiceSettings {
  autoSpeak: boolean;
  speechSpeed: number;
}

export default function VoicePage() {
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

  const getStatusClass = () => {
    if (isListening) return 'listening';
    if (isProcessing) return 'processing';
    if (voiceStatus.includes('Error')) return 'error';
    return 'ready';
  };

  const getStatusIcon = () => {
    if (isListening) return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    );
    if (isProcessing) return (
      <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
    if (voiceStatus.includes('Error')) return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    );
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--background-secondary)] p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-full">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-[var(--text-primary)]">Voice Practice</h1>
            </div>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Practice your English speaking with AI-powered feedback and pronunciation analysis
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Badge variant="primary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                AI-Powered
              </Badge>
              <Badge variant="accent">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Real-time Feedback
              </Badge>
            </div>
          </div>

          {/* Voice Status Section */}
          <Card>
            <CardBody>
              <div className="flex items-center space-x-4 mb-6">
                <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Voice Status</h2>
              </div>
              <div className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                getStatusClass() === 'listening' ? 'border-[var(--success)] bg-[var(--success-light)]' :
                getStatusClass() === 'processing' ? 'border-[var(--warning)] bg-[var(--warning-light)]' :
                getStatusClass() === 'error' ? 'border-[var(--error)] bg-[var(--error-light)]' :
                'border-[var(--primary)] bg-[var(--primary-light)]'
              }`}>
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${
                    getStatusClass() === 'listening' ? 'bg-[var(--success)]' :
                    getStatusClass() === 'processing' ? 'bg-[var(--warning)]' :
                    getStatusClass() === 'error' ? 'bg-[var(--error)]' :
                    'bg-[var(--primary)]'
                  } text-white`}>
                    {getStatusIcon()}
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-[var(--text-primary)]">{voiceStatus}</div>
                    <div className="text-[var(--text-secondary)]">Current Status</div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Voice Controls Section */}
          <Card>
            <CardBody>
              <div className="flex items-center space-x-4 mb-6">
                <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Voice Controls</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardBody>
                    <div className="text-center space-y-4">
                      <div className="p-4 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Start Speaking</h3>
                        <p className="text-[var(--text-secondary)]">Begin voice recognition and practice</p>
                      </div>
                      <Button
                        onClick={startRecognition}
                        disabled={isListening || isProcessing}
                        variant="primary"
                        className="w-full"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        {isListening ? 'Listening...' : 'Start Speaking'}
                      </Button>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div className="text-center space-y-4">
                      <div className="p-4 bg-gradient-to-r from-[var(--secondary)] to-[var(--secondary-hover)] rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Stop Speaking</h3>
                        <p className="text-[var(--text-secondary)]">End current voice session</p>
                      </div>
                      <Button
                        onClick={stopRecognition}
                        disabled={!isListening}
                        variant="secondary"
                        className="w-full"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                        </svg>
                        Stop Speaking
                      </Button>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div className="text-center space-y-4">
                      <div className="p-4 bg-gradient-to-r from-[var(--warning)] to-[var(--warning-hover)] rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Test API</h3>
                        <p className="text-[var(--text-secondary)]">Verify system connectivity</p>
                      </div>
                      <Button
                        onClick={testAPI}
                        variant="accent"
                        className="w-full"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Test API
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Voice Settings Section */}
            <Card>
              <CardBody>
                <div className="flex items-center space-x-4 mb-6">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Voice Settings</h2>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-[var(--background-secondary)] rounded-lg">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      <div>
                        <h4 className="font-semibold text-[var(--text-primary)]">Auto-speak AI Responses</h4>
                        <p className="text-sm text-[var(--text-secondary)]">Automatically play AI responses aloud</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.autoSpeak}
                          onChange={(e) => updateSettings('autoSpeak', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-light)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                      </label>
                      <Badge variant={settings.autoSpeak ? 'success' : 'neutral'}>
                        {settings.autoSpeak ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 bg-[var(--background-secondary)] rounded-lg">
                    <div className="flex items-center space-x-3 mb-4">
                      <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div>
                        <h4 className="font-semibold text-[var(--text-primary)]">Speech Speed</h4>
                        <p className="text-sm text-[var(--text-secondary)]">Adjust playback speed: {settings.speechSpeed.toFixed(1)}x</p>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.speechSpeed}
                      onChange={(e) => updateSettings('speechSpeed', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>

                  <div className="p-4 bg-[var(--background-secondary)] rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        <div>
                          <h4 className="font-semibold text-[var(--text-primary)]">Voice Test</h4>
                          <p className="text-sm text-[var(--text-secondary)]">Test the text-to-speech system</p>
                        </div>
                      </div>
                      <Button onClick={testVoice} variant="outline">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        Test Voice
                      </Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Conversation Section */}
            <Card>
              <CardBody>
                <div className="flex items-center space-x-4 mb-6">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Conversation</h2>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--primary-light)] rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-[var(--primary)] rounded-full">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-[var(--text-primary)]">You said:</h4>
                    </div>
                    <p className="text-[var(--text-primary)]">{recognizedText}</p>
                  </div>

                  <div className="p-4 bg-[var(--accent-light)] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-[var(--accent)] rounded-full">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-[var(--text-primary)]">Assistant:</h4>
                      </div>
                      {hasResponse && (
                        <Button
                          onClick={() => speakText(assistantResponse)}
                          variant="outline"
                          size="sm"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15a2 2 0 002-2V9a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293L10.293 4.293A1 1 0 009.586 4H8a2 2 0 00-2 2v5a2 2 0 002 2z" />
                          </svg>
                          Play
                        </Button>
                      )}
                    </div>
                    <p className="text-[var(--text-primary)]">{assistantResponse}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Tips Section */}
          <Card>
            <CardBody>
              <div className="flex items-center space-x-4 mb-6">
                <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Tips for Better Voice Recognition</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center space-y-3">
                  <div className="p-4 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-[var(--text-primary)]">Speak Clearly</h4>
                  <p className="text-sm text-[var(--text-secondary)]">Use a normal pace and clear pronunciation</p>
                </div>

                <div className="text-center space-y-3">
                  <div className="p-4 bg-gradient-to-r from-[var(--secondary)] to-[var(--secondary-hover)] rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2-2-2M19 9.5a4.5 4.5 0 000 5" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-[var(--text-primary)]">Quiet Environment</h4>
                  <p className="text-sm text-[var(--text-secondary)]">Minimize background noise for better recognition</p>
                </div>

                <div className="text-center space-y-3">
                  <div className="p-4 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-[var(--text-primary)]">Microphone Access</h4>
                  <p className="text-sm text-[var(--text-secondary)]">Allow browser microphone permissions</p>
                </div>

                <div className="text-center space-y-3">
                  <div className="p-4 bg-gradient-to-r from-[var(--warning)] to-[var(--warning-hover)] rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-[var(--text-primary)]">Wait for Status</h4>
                  <p className="text-sm text-[var(--text-secondary)]">Look for "Listening..." before speaking</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Layout>
  );
}