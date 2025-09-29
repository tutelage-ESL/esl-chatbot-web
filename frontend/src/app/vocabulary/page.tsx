'use client';

import { useState, useEffect } from 'react';
import { ThemedComponent, useTheme } from '@/components/ThemeProvider';
import { useOptimizedRouter } from '@/lib/routing';
import AppLayout from '@/components/AppLayout';
import api from '@/lib/api';

interface VocabularyWord {
  id: number;
  word: string;
  definition: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  mastery: 'learning' | 'practicing' | 'mastered';
  example?: string;
  pronunciation?: string;
  createdAt: string;
}

interface VocabularyStats {
  totalWords: number;
  masteredWords: number;
  learningWords: number;
  practicingWords: number;
}

export default function VocabularyPage() {
  const { theme } = useTheme();
  const router = useOptimizedRouter();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [stats, setStats] = useState<VocabularyStats>({
    totalWords: 0,
    masteredWords: 0,
    learningWords: 0,
    practicingWords: 0
  });
  const [activeTab, setActiveTab] = useState('wordList');
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState({
    word: '',
    definition: '',
    difficulty: 'beginner' as const,
    example: '',
    pronunciation: ''
  });
  const [filters, setFilters] = useState({
    difficulty: 'all',
    mastery: 'all',
    search: ''
  });

  // Prefetch likely routes
  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/chat');
    router.prefetch('/progress');
  }, [router]);

  useEffect(() => {
    loadVocabulary();
  }, []);

  const loadVocabulary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/vocabulary');
      const data = response.data;
      
      setWords(data.words || []);
      calculateStats(data.words || []);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (wordList: VocabularyWord[]) => {
    const stats = {
      totalWords: wordList.length,
      masteredWords: wordList.filter(w => w.mastery === 'mastered').length,
      learningWords: wordList.filter(w => w.mastery === 'learning').length,
      practicingWords: wordList.filter(w => w.mastery === 'practicing').length
    };
    setStats(stats);
  };

  const addWord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/vocabulary', newWord);
      if (response.data.success) {
        setNewWord({
          word: '',
          definition: '',
          difficulty: 'beginner',
          example: '',
          pronunciation: ''
        });
        loadVocabulary();
        setActiveTab('wordList');
      }
    } catch (error) {
      console.error('Error adding word:', error);
      alert('Error adding word. Please try again.');
    }
  };

  const filteredWords = words.filter(word => {
    const matchesDifficulty = filters.difficulty === 'all' || word.difficulty === filters.difficulty;
    const matchesMastery = filters.mastery === 'all' || word.mastery === filters.mastery;
    const matchesSearch = filters.search === '' || 
      word.word.toLowerCase().includes(filters.search.toLowerCase()) ||
      word.definition.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesDifficulty && matchesMastery && matchesSearch;
  });

  const navigateToPage = (path: string) => {
    router.navigate(path);
  };

  if (loading) {
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
                <i className="fas fa-book"></i>
                <span>Vocabulary</span>
              </button>
            </nav>
          </header>
          <main className="app-main">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading vocabulary...</div>
            </div>
          </main>
        </div>
      </ThemedComponent>
    );
  }

  return (
    <ThemedComponent>
      <AppLayout>
        <div className="app-container">
          <main className="app-main">
            <div className="vocabulary-container">
              <div className="vocab-header">
                <div>
                  <h2><i className="fas fa-book"></i> Vocabulary Builder</h2>
                  <p className="vocab-subtitle">Expand your English vocabulary with interactive learning</p>
                </div>
              </div>

            {/* Stats Cards */}
            <div className="vocab-stats">
              <div className="vocab-stat-card">
                <div className="vocab-stat-number">{stats.totalWords}</div>
                <div className="vocab-stat-label">Total Words</div>
              </div>
              <div className="vocab-stat-card">
                <div className="vocab-stat-number">{stats.masteredWords}</div>
                <div className="vocab-stat-label">Mastered</div>
              </div>
              <div className="vocab-stat-card">
                <div className="vocab-stat-number">{stats.learningWords}</div>
                <div className="vocab-stat-label">Learning</div>
              </div>
              <div className="vocab-stat-card">
                <div className="vocab-stat-number">{stats.practicingWords}</div>
                <div className="vocab-stat-label">Practicing</div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="vocab-tabs">
              <button 
                className={`tab ${activeTab === 'wordList' ? 'active' : ''}`}
                onClick={() => setActiveTab('wordList')}
              >
                Word List
              </button>
              <button 
                className={`tab ${activeTab === 'practice' ? 'active' : ''}`}
                onClick={() => setActiveTab('practice')}
              >
                Practice
              </button>
              <button 
                className={`tab ${activeTab === 'quiz' ? 'active' : ''}`}
                onClick={() => setActiveTab('quiz')}
              >
                Quiz
              </button>
              <button 
                className={`tab ${activeTab === 'addWord' ? 'active' : ''}`}
                onClick={() => setActiveTab('addWord')}
              >
                Add Word
              </button>
            </div>

            {/* Word List Tab */}
            {activeTab === 'wordList' && (
              <div className="tab-content">
                <div className="word-filters">
                  <select 
                    value={filters.difficulty} 
                    onChange={(e) => setFilters({...filters, difficulty: e.target.value})}
                  >
                    <option value="all">All Difficulties</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <select 
                    value={filters.mastery} 
                    onChange={(e) => setFilters({...filters, mastery: e.target.value})}
                  >
                    <option value="all">All Mastery Levels</option>
                    <option value="learning">Learning</option>
                    <option value="practicing">Practicing</option>
                    <option value="mastered">Mastered</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Search words..." 
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                  />
                </div>
                
                <div className="words-grid">
                  {filteredWords.map((word) => (
                    <div key={word.id} className="word-card">
                      <div className="word-header">
                        <h3 className="word-title">{word.word}</h3>
                        <div className="word-badges">
                          <span className={`difficulty-badge ${word.difficulty}`}>
                            {word.difficulty}
                          </span>
                          <span className={`mastery-badge ${word.mastery}`}>
                            {word.mastery}
                          </span>
                        </div>
                      </div>
                      <p className="word-definition">{word.definition}</p>
                      {word.example && (
                        <p className="word-example">
                          <strong>Example:</strong> {word.example}
                        </p>
                      )}
                      {word.pronunciation && (
                        <p className="word-pronunciation">
                          <strong>Pronunciation:</strong> {word.pronunciation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {filteredWords.length === 0 && (
                  <div className="empty-state">
                    <h3>No words found</h3>
                    <p>Try adjusting your filters or add some new words to get started.</p>
                  </div>
                )}
              </div>
            )}

            {/* Add Word Tab */}
            {activeTab === 'addWord' && (
              <div className="tab-content">
                <form onSubmit={addWord} className="add-word-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="word">Word *</label>
                      <input
                        type="text"
                        id="word"
                        value={newWord.word}
                        onChange={(e) => setNewWord({...newWord, word: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="definition">Definition *</label>
                      <textarea
                        id="definition"
                        value={newWord.definition}
                        onChange={(e) => setNewWord({...newWord, definition: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="difficulty">Difficulty</label>
                      <select
                        id="difficulty"
                        value={newWord.difficulty}
                        onChange={(e) => setNewWord({...newWord, difficulty: e.target.value as any})}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="example">Example Sentence</label>
                      <textarea
                        id="example"
                        value={newWord.example}
                        onChange={(e) => setNewWord({...newWord, example: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="pronunciation">Pronunciation</label>
                      <input
                        type="text"
                        id="pronunciation"
                        value={newWord.pronunciation}
                        onChange={(e) => setNewWord({...newWord, pronunciation: e.target.value})}
                      />
                    </div>
                  </div>
                  <button type="submit" className="add-btn">
                    <i className="fas fa-plus"></i> Add Word
                  </button>
                </form>
              </div>
            )}

            {/* Practice and Quiz tabs - placeholder for now */}
            {activeTab === 'practice' && (
              <div className="tab-content">
                <div className="coming-soon">
                  <h3>Practice Mode Coming Soon!</h3>
                  <p>Interactive practice sessions will be available in the next update.</p>
                </div>
              </div>
            )}

            {activeTab === 'quiz' && (
              <div className="tab-content">
                <div className="coming-soon">
                  <h3>Quiz Mode Coming Soon!</h3>
                  <p>Test your vocabulary knowledge with interactive quizzes.</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </AppLayout>
  </ThemedComponent>
  );
}