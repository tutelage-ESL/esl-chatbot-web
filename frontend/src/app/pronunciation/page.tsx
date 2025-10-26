'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useOptimizedRouter } from '@/hooks/useOptimizedRouter';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

interface PronunciationResult {
  word: string;
  transcription: string;
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  feedback: string;
}

interface HistoryItem {
  id: string;
  word: string;
  date: string;
  difficulty: string;
  score: number;
}

export default function PronunciationPage() {
  const router = useOptimizedRouter();
  
  // State management
  const [currentWord, setCurrentWord] = useState<string>('');
  const [customWord, setCustomWord] = useState<string>('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string>('');
  const [phonetic, setPhonetic] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState<number>(0);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Prefetch routes
  useEffect(() => {
    router.prefetch('/chat');
    router.prefetch('/voice');
    router.prefetch('/vocabulary');
  }, [router]);

  // Load history and generate initial word
  useEffect(() => {
    loadHistory();
    generateRandomWord();
  }, []);

  const loadHistory = () => {
    // Mock history data for demo
    const mockHistory: HistoryItem[] = [
      { id: '1', word: 'pronunciation', date: new Date().toISOString(), difficulty: 'advanced', score: 85 },
      { id: '2', word: 'beautiful', date: new Date(Date.now() - 86400000).toISOString(), difficulty: 'intermediate', score: 92 },
      { id: '3', word: 'hello', date: new Date(Date.now() - 172800000).toISOString(), difficulty: 'beginner', score: 95 },
    ];
    setHistory(mockHistory);
  };

  const generateRandomWord = () => {
    const words = {
      beginner: ['hello', 'world', 'cat', 'dog', 'house', 'book', 'water', 'food'],
      intermediate: ['beautiful', 'important', 'different', 'interesting', 'comfortable', 'necessary'],
      advanced: ['pronunciation', 'extraordinary', 'sophisticated', 'philosophical', 'entrepreneurship', 'incomprehensible']
    };
    
    const wordList = words[difficulty];
    const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
    setCurrentWord(randomWord);
    setResult(null);
    setError('');
    
    // Mock phonetic for demo
    const phonetics: { [key: string]: string } = {
      'hello': '/həˈloʊ/',
      'world': '/wɜːrld/',
      'beautiful': '/ˈbjuːtɪfəl/',
      'pronunciation': '/prəˌnʌnsiˈeɪʃən/'
    };
    setPhonetic(phonetics[randomWord] || '');
  };

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        analyzePronunciation(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 10000);
      
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const analyzePronunciation = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('word', currentWord);
      formData.append('difficulty', difficulty);
      
      const response = await api.post('/pronunciation/analyze', formData);
      
      if (response.data) {
        setResult(response.data);
        
        // Add to history
        const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          word: currentWord,
          date: new Date().toISOString(),
          difficulty,
          score: response.data.overallScore
        };
        setHistory(prev => [newHistoryItem, ...prev]);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      
      // Mock result for demo
      const mockResult: PronunciationResult = {
        word: currentWord,
        transcription: currentWord.toLowerCase(),
        overallScore: Math.floor(Math.random() * 30) + 70,
        accuracyScore: Math.floor(Math.random() * 30) + 70,
        fluencyScore: Math.floor(Math.random() * 30) + 70,
        completenessScore: Math.floor(Math.random() * 30) + 70,
        feedback: 'Good pronunciation! Try to focus on the vowel sounds for better clarity.'
      };
      setResult(mockResult);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const practiceCustomWord = () => {
    if (customWord.trim()) {
      setCurrentWord(customWord.trim());
      setCustomWord('');
      setResult(null);
      setError('');
      setPhonetic('');
    }
  };

  const tryAgain = () => {
    setResult(null);
    setError('');
  };

  const navigateToPage = (path: string) => {
    router.push(path);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'success';
    if (score >= 80) return 'primary';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--background-secondary)]">
        <div className="container mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Pronunciation Practice</h1>
                <p className="text-[var(--text-secondary)] mt-1">Improve your English pronunciation with AI-powered feedback and analysis</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="default">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                AI-Powered
              </Badge>
              <Badge variant="secondary">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Real-time Analysis
              </Badge>
            </div>
          </div>

          {/* Practice Setup Section */}
          <Card className="mb-8">
            <CardBody>
              <div className="flex items-center gap-4 mb-6">
                <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Practice Setup</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Difficulty Selector */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    <label className="font-medium text-[var(--text-primary)]">Difficulty Level</label>
                  </div>
                  <select
                    value={difficulty}
                    onChange={(e) => {
                      setDifficulty(e.target.value as any);
                      generateRandomWord();
                    }}
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  >
                    <option value="beginner">Beginner - Simple words</option>
                    <option value="intermediate">Intermediate - Common words</option>
                    <option value="advanced">Advanced - Complex words</option>
                  </select>
                </div>

                {/* Custom Word Input */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <label className="font-medium text-[var(--text-primary)]">Custom Word</label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter a word to practice..."
                      value={customWord}
                      onChange={(e) => setCustomWord(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && practiceCustomWord()}
                      className="flex-1"
                    />
                    <Button 
                      variant="default"
                      onClick={practiceCustomWord}
                      disabled={!customWord.trim()}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15a2 2 0 002-2V9a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293L10.293 4.293A1 1 0 009.586 4H8a2 2 0 00-2 2v5a2 2 0 002 2z" />
                      </svg>
                      Practice
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center my-6">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-[var(--border)] flex-1 w-16"></div>
                  <span className="text-[var(--text-secondary)] text-sm">or</span>
                  <div className="h-px bg-[var(--border)] flex-1 w-16"></div>
                </div>
              </div>

              <div className="text-center">
                <Button 
                  variant="secondary"
                  onClick={generateRandomWord}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Generate Random Word
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Current Word Display */}
          {currentWord && (
            <Card className="mb-8">
              <CardBody>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Badge variant={difficulty === 'beginner' ? 'success' : difficulty === 'intermediate' ? 'warning' : 'error'}>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </Badge>
                  </div>
                  <div className="text-4xl font-bold text-[var(--text-primary)] mb-2">{currentWord}</div>
                  {phonetic && (
                    <div className="text-lg text-[var(--text-secondary)] font-mono">{phonetic}</div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Recording Section */}
          {currentWord && (
            <Card className="mb-8">
              <CardBody>
                <div className="text-center">
                  <div className="flex items-center gap-4 mb-6">
                    <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Record Your Pronunciation</h2>
                  </div>

                  <div className="mb-6">
                    <button
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isRecording 
                          ? 'bg-gradient-to-r from-[var(--error)] to-[var(--error-hover)] animate-pulse' 
                          : 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] hover:scale-105'
                      } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isAnalyzing}
                    >
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isRecording ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        )}
                      </svg>
                    </button>
                  </div>

                  <div className="text-[var(--text-primary)] font-medium mb-2">
                    {isRecording ? 'Recording...' : 'Click to start recording'}
                  </div>
                  
                  {isRecording && (
                    <div className="text-2xl font-mono text-[var(--primary)] mb-4">
                      {formatTime(recordingTime)}
                    </div>
                  )}
                  
                  {error && (
                    <div className="bg-[var(--error-light)] border border-[var(--error)] rounded-lg p-4 text-[var(--error)] flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      {error}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Analysis Loading */}
          {isAnalyzing && (
            <Card className="mb-8">
              <CardBody>
                <div className="text-center py-8">
                  <div className="w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[var(--text-primary)] font-medium">Analyzing your pronunciation...</p>
                  <p className="text-[var(--text-secondary)] text-sm mt-2">This may take a few seconds</p>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Analysis Results */}
          {result && (
            <Card className="mb-8">
              <CardBody>
                <div className="flex items-center gap-4 mb-6">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Pronunciation Analysis</h2>
                </div>
                
                {/* Transcription */}
                <div className="bg-[var(--background-secondary)] rounded-lg p-4 mb-6">
                  <div className="text-sm text-[var(--text-secondary)] mb-2">What we heard:</div>
                  <div className="text-lg font-medium text-[var(--text-primary)] mb-2">"{result.transcription}"</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    Target word: <strong className="text-[var(--text-primary)]">{result.word}</strong>
                  </div>
                </div>

                {/* Scores Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-[var(--background-secondary)] rounded-lg">
                    <div className={`text-3xl font-bold mb-2 ${
                      result.overallScore >= 90 ? 'text-[var(--success)]' :
                      result.overallScore >= 80 ? 'text-[var(--primary)]' :
                      result.overallScore >= 70 ? 'text-[var(--warning)]' :
                      'text-[var(--error)]'
                    }`}>
                      {result.overallScore}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">Overall</div>
                  </div>
                  <div className="text-center p-4 bg-[var(--background-secondary)] rounded-lg">
                    <div className={`text-3xl font-bold mb-2 ${
                      result.accuracyScore >= 90 ? 'text-[var(--success)]' :
                      result.accuracyScore >= 80 ? 'text-[var(--primary)]' :
                      result.accuracyScore >= 70 ? 'text-[var(--warning)]' :
                      'text-[var(--error)]'
                    }`}>
                      {result.accuracyScore}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">Accuracy</div>
                  </div>
                  <div className="text-center p-4 bg-[var(--background-secondary)] rounded-lg">
                    <div className={`text-3xl font-bold mb-2 ${
                      result.fluencyScore >= 90 ? 'text-[var(--success)]' :
                      result.fluencyScore >= 80 ? 'text-[var(--primary)]' :
                      result.fluencyScore >= 70 ? 'text-[var(--warning)]' :
                      'text-[var(--error)]'
                    }`}>
                      {result.fluencyScore}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">Fluency</div>
                  </div>
                  <div className="text-center p-4 bg-[var(--background-secondary)] rounded-lg">
                    <div className={`text-3xl font-bold mb-2 ${
                      result.completenessScore >= 90 ? 'text-[var(--success)]' :
                      result.completenessScore >= 80 ? 'text-[var(--primary)]' :
                      result.completenessScore >= 70 ? 'text-[var(--warning)]' :
                      'text-[var(--error)]'
                    }`}>
                      {result.completenessScore}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">Completeness</div>
                  </div>
                </div>

                {/* Feedback */}
                <div className="bg-[var(--primary-light)] rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[var(--primary)] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)] mb-2">Feedback:</h4>
                      <p className="text-[var(--text-primary)]">{result.feedback}</p>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <Button variant="secondary" onClick={tryAgain}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Practice History */}
          {history.length > 0 && (
            <Card>
              <CardBody>
                <div className="flex items-center gap-4 mb-6">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Recent Practice</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.slice(0, 6).map((item) => (
                    <div key={item.id} className="bg-[var(--background-secondary)] rounded-lg p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-[var(--text-primary)] mb-1">{item.word}</div>
                        <div className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(item.date).toLocaleDateString()}
                        </div>
                        <Badge variant={item.difficulty === 'beginner' ? 'success' : item.difficulty === 'intermediate' ? 'warning' : 'error'} className="mt-2">
                          {item.difficulty}
                        </Badge>
                      </div>
                      <div className={`text-2xl font-bold ml-4 ${
                        item.score >= 90 ? 'text-[var(--success)]' :
                        item.score >= 80 ? 'text-[var(--primary)]' :
                        item.score >= 70 ? 'text-[var(--warning)]' :
                        'text-[var(--error)]'
                      }`}>
                        {item.score}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}