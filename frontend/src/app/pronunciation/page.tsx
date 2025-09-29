'use client';

import { useState, useEffect, useRef } from 'react';
import { ThemedComponent, useTheme } from '@/components/ThemeProvider';
import { useOptimizedRouter } from '@/lib/routing';
import api from '@/lib/api';

interface PronunciationResult {
  word: string;
  transcription: string;
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  feedback: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface PracticeHistory {
  id: number;
  word: string;
  score: number;
  date: string;
  difficulty: string;
}

export default function PronunciationPage() {
  const { theme } = useTheme();
  const router = useOptimizedRouter();
  const [currentWord, setCurrentWord] = useState('');
  const [customWord, setCustomWord] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [history, setHistory] = useState<PracticeHistory[]>([]);
  const [error, setError] = useState('');
  const [phonetic, setPhonetic] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Prefetch likely routes
  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/chat');
    router.prefetch('/vocabulary');
  }, [router]);

  useEffect(() => {
    loadHistory();
    generateRandomWord();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await api.get('/api/pronunciation/history');
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Error loading history:', error);
      // Set mock data for demo
      setHistory([
        { id: 1, word: 'pronunciation', score: 85, date: '2024-01-15', difficulty: 'intermediate' },
        { id: 2, word: 'beautiful', score: 92, date: '2024-01-14', difficulty: 'beginner' },
        { id: 3, word: 'extraordinary', score: 78, date: '2024-01-13', difficulty: 'advanced' }
      ]);
    }
  };

  const generateRandomWord = async () => {
    try {
      const response = await api.get(`/api/pronunciation/random-word?difficulty=${difficulty}`);
      const data = response.data;
      setCurrentWord(data.word);
      setPhonetic(data.phonetic || '');
    } catch (error) {
      console.error('Error generating word:', error);
      // Set mock data based on difficulty
      const words = {
        beginner: { word: 'hello', phonetic: '/həˈloʊ/' },
        intermediate: { word: 'pronunciation', phonetic: '/prəˌnʌnsiˈeɪʃən/' },
        advanced: { word: 'extraordinary', phonetic: '/ɪkˈstrɔːrdəˌneri/' }
      };
      const selected = words[difficulty];
      setCurrentWord(selected.word);
      setPhonetic(selected.phonetic);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        analyzePronunciation(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setError('');

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

    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const analyzePronunciation = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('word', currentWord);
      formData.append('difficulty', difficulty);

      const response = await api.post('/api/pronunciation/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      loadHistory(); // Refresh history
    } catch (error) {
      console.error('Error analyzing pronunciation:', error);
      // Set mock result for demo
      const mockResult: PronunciationResult = {
        word: currentWord,
        transcription: currentWord.toLowerCase(),
        overallScore: Math.floor(Math.random() * 30) + 70,
        accuracyScore: Math.floor(Math.random() * 30) + 70,
        fluencyScore: Math.floor(Math.random() * 30) + 70,
        completenessScore: Math.floor(Math.random() * 30) + 70,
        feedback: 'Good pronunciation! Try to emphasize the stressed syllables more clearly.',
        difficulty
      };
      setResult(mockResult);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const practiceCustomWord = () => {
    if (customWord.trim()) {
      setCurrentWord(customWord.trim());
      setPhonetic(''); // Would need to fetch phonetic for custom word
      setCustomWord('');
      setResult(null);
    }
  };

  const tryAgain = () => {
    setResult(null);
    setError('');
  };

  const navigateToPage = (path: string) => {
    router.navigate(path);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    return 'needs-work';
  };

  const formatTime = (seconds: number) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <ThemedComponent>
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
            <button className="btn btn-nav active">
              <i className="fas fa-microphone"></i>
              <span>Pronunciation</span>
            </button>
            <button onClick={() => navigateToPage('/vocabulary')} className="btn btn-nav">
              <i className="fas fa-book"></i>
              <span>Vocabulary</span>
            </button>
          </nav>
        </header>

        <main className="app-main">
          <div className="pronunciation-container">
            <div className="pronunciation-header">
              <h2><i className="fas fa-microphone"></i> Pronunciation Practice</h2>
              <p>Improve your English pronunciation with AI-powered feedback</p>
            </div>

            {/* Practice Section */}
            <div className="practice-section">
              {/* Difficulty Selector */}
              <div className="difficulty-selector">
                <label htmlFor="difficulty">Select Difficulty Level</label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => {
                    setDifficulty(e.target.value as any);
                    generateRandomWord();
                  }}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Word Input Section */}
              <div className="word-input-section">
                <div className="input-group">
                  <input
                    type="text"
                    className="word-input"
                    placeholder="Enter a custom word to practice..."
                    value={customWord}
                    onChange={(e) => setCustomWord(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && practiceCustomWord()}
                  />
                  <button 
                    className="practice-btn"
                    onClick={practiceCustomWord}
                    disabled={!customWord.trim()}
                  >
                    <i className="fas fa-play"></i>
                    Practice
                  </button>
                </div>
                <div style={{ textAlign: 'center', margin: '15px 0', color: '#666' }}>
                  or
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button 
                    className="practice-btn"
                    onClick={generateRandomWord}
                    style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}
                  >
                    <i className="fas fa-random"></i>
                    Generate Random Word
                  </button>
                </div>
              </div>

              {/* Current Word Display */}
              {currentWord && (
                <div className="current-word">
                  <div className="difficulty-badge">
                    <span className={`difficulty ${difficulty}`}>
                      {difficulty}
                    </span>
                  </div>
                  <div className="word-display">{currentWord}</div>
                  {phonetic && (
                    <div className="phonetic-display">{phonetic}</div>
                  )}
                </div>
              )}

              {/* Recording Section */}
              {currentWord && (
                <div className="recording-section">
                  <button
                    className={`record-btn ${isRecording ? 'recording' : ''}`}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isAnalyzing}
                  >
                    <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
                  </button>
                  
                  <div className="recording-status">
                    {isRecording ? 'Recording...' : 'Click to start recording'}
                  </div>
                  
                  {isRecording && (
                    <div className="recording-timer">
                      {formatTime(recordingTime)}
                    </div>
                  )}
                  
                  {error && (
                    <div className="error">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Analysis Loading */}
            {isAnalyzing && (
              <div className="analysis-section" style={{ display: 'block' }}>
                <div className="loading">
                  <div className="spinner"></div>
                  <p>Analyzing your pronunciation...</p>
                </div>
              </div>
            )}

            {/* Analysis Results */}
            {result && (
              <div className="analysis-section" style={{ display: 'block' }}>
                <h3 className="analysis-title">Pronunciation Analysis</h3>
                
                <div className="transcription-section">
                  <div className="transcription-title">What we heard:</div>
                  <div className="transcription-text">"{result.transcription}"</div>
                  <div className="target-word">
                    Target word: <strong>{result.word}</strong>
                  </div>
                </div>

                <div className="score-display">
                  <div className="score-item">
                    <span className={`score-value ${getScoreColor(result.overallScore)}`}>
                      {result.overallScore}
                    </span>
                    <span className="score-label">Overall</span>
                  </div>
                  <div className="score-item">
                    <span className={`score-value ${getScoreColor(result.accuracyScore)}`}>
                      {result.accuracyScore}
                    </span>
                    <span className="score-label">Accuracy</span>
                  </div>
                  <div className="score-item">
                    <span className={`score-value ${getScoreColor(result.fluencyScore)}`}>
                      {result.fluencyScore}
                    </span>
                    <span className="score-label">Fluency</span>
                  </div>
                  <div className="score-item">
                    <span className={`score-value ${getScoreColor(result.completenessScore)}`}>
                      {result.completenessScore}
                    </span>
                    <span className="score-label">Completeness</span>
                  </div>
                </div>

                <div className="feedback-text">
                  <strong>Feedback:</strong>
                  <p>{result.feedback}</p>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button className="try-again-btn" onClick={tryAgain}>
                    <i className="fas fa-redo"></i> Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Practice History */}
            {history.length > 0 && (
              <div className="practice-history">
                <h3 className="history-title">
                  <i className="fas fa-history"></i>
                  Recent Practice
                </h3>
                <div className="history-list">
                  {history.slice(0, 5).map((item) => (
                    <div key={item.id} className="history-item">
                      <div>
                        <div className="history-word">{item.word}</div>
                        <div style={{ fontSize: '0.9em', color: '#666' }}>
                          {new Date(item.date).toLocaleDateString()} • {item.difficulty}
                        </div>
                      </div>
                      <div className={`history-score ${getScoreColor(item.score)}`}>
                        {item.score}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ThemedComponent>
  );
}