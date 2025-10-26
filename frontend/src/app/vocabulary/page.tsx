'use client';

import React, { useState, useEffect } from 'react';
import { useOptimizedRouter } from '@/hooks/useOptimizedRouter';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  const router = useOptimizedRouter();
  
  // State management
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

  // Prefetch routes
  useEffect(() => {
    router.prefetch('/chat');
    router.prefetch('/voice');
    router.prefetch('/pronunciation');
  }, [router]);

  useEffect(() => {
    loadVocabulary();
  }, []);

  const loadVocabulary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/vocabulary');
      const data = response.data;
      
      setWords(data.words || []);
      calculateStats(data.words || []);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      
      // Mock data for demo
      const mockWords: VocabularyWord[] = [
        {
          id: 1,
          word: 'serendipity',
          definition: 'The occurrence and development of events by chance in a happy or beneficial way',
          difficulty: 'advanced',
          mastery: 'learning',
          example: 'It was pure serendipity that we met at the coffee shop.',
          pronunciation: '/ˌserənˈdipədē/',
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          word: 'eloquent',
          definition: 'Fluent or persuasive in speaking or writing',
          difficulty: 'intermediate',
          mastery: 'practicing',
          example: 'Her eloquent speech moved the entire audience.',
          pronunciation: '/ˈeləkwənt/',
          createdAt: new Date().toISOString()
        },
        {
          id: 3,
          word: 'beautiful',
          definition: 'Pleasing the senses or mind aesthetically',
          difficulty: 'beginner',
          mastery: 'mastered',
          example: 'The sunset was absolutely beautiful.',
          pronunciation: '/ˈbjuːtɪfəl/',
          createdAt: new Date().toISOString()
        }
      ];
      
      setWords(mockWords);
      calculateStats(mockWords);
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
      const response = await api.post('/vocabulary', newWord);
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
      
      // Mock success for demo
      const mockNewWord: VocabularyWord = {
        id: Date.now(),
        ...newWord,
        mastery: 'learning',
        createdAt: new Date().toISOString()
      };
      
      const updatedWords = [...words, mockNewWord];
      setWords(updatedWords);
      calculateStats(updatedWords);
      
      setNewWord({
        word: '',
        definition: '',
        difficulty: 'beginner',
        example: '',
        pronunciation: ''
      });
      setActiveTab('wordList');
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
    router.push(path);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'primary';
    }
  };

  const getMasteryColor = (mastery: string) => {
    switch (mastery) {
      case 'mastered': return 'success';
      case 'practicing': return 'warning';
      case 'learning': return 'primary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--background-secondary)] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[var(--text-primary)] font-medium">Loading vocabulary...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--background-secondary)]">
        <div className="container mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Vocabulary Builder</h1>
                <p className="text-[var(--text-secondary)] mt-1">Expand your English vocabulary with interactive learning and practice</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="default">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Interactive Learning
              </Badge>
              <Badge variant="secondary">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Progress Tracking
              </Badge>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardBody className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{stats.totalWords}</div>
                <div className="text-sm text-[var(--text-secondary)]">Total Words</div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-[var(--success)] to-[var(--success-hover)] rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{stats.masteredWords}</div>
                <div className="text-sm text-[var(--text-secondary)]">Mastered</div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-[var(--warning)] to-[var(--warning-hover)] rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{stats.learningWords}</div>
                <div className="text-sm text-[var(--text-secondary)]">Learning</div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{stats.practicingWords}</div>
                <div className="text-sm text-[var(--text-secondary)]">Practicing</div>
              </CardBody>
            </Card>
          </div>

          {/* Tab Navigation */}
          <Card className="mb-8">
            <CardBody>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeTab === 'wordList' ? 'primary' : 'secondary'}
                  onClick={() => setActiveTab('wordList')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Word List
                </Button>
                <Button
                  variant={activeTab === 'practice' ? 'primary' : 'secondary'}
                  onClick={() => setActiveTab('practice')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15a2 2 0 002-2V9a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293L10.293 4.293A1 1 0 009.586 4H8a2 2 0 00-2 2v5a2 2 0 002 2z" />
                  </svg>
                  Practice
                </Button>
                <Button
                  variant={activeTab === 'quiz' ? 'primary' : 'secondary'}
                  onClick={() => setActiveTab('quiz')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Quiz
                </Button>
                <Button
                  variant={activeTab === 'addWord' ? 'primary' : 'secondary'}
                  onClick={() => setActiveTab('addWord')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Word
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Word List Tab */}
          {activeTab === 'wordList' && (
            <Card>
              <CardBody>
                <div className="flex items-center gap-4 mb-6">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Your Vocabulary</h2>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                      Difficulty
                    </label>
                    <select 
                      className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      value={filters.difficulty} 
                      onChange={(e) => setFilters({...filters, difficulty: e.target.value})}
                    >
                      <option value="all">All Difficulties</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Mastery Level
                    </label>
                    <select 
                      className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      value={filters.mastery} 
                      onChange={(e) => setFilters({...filters, mastery: e.target.value})}
                    >
                      <option value="all">All Mastery Levels</option>
                      <option value="learning">Learning</option>
                      <option value="practicing">Practicing</option>
                      <option value="mastered">Mastered</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search
                    </label>
                    <Input
                      type="text"
                      placeholder="Search words..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                  </div>
                </div>

                {/* Words Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredWords.map((word) => (
                    <div key={word.id} className="bg-[var(--background-secondary)] rounded-lg p-6 border border-[var(--border)] hover:border-[var(--primary)] transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">{word.word}</h3>
                        <div className="flex gap-2">
                          <Badge variant={getDifficultyColor(word.difficulty)}>
                            {word.difficulty}
                          </Badge>
                          <Badge variant={getMasteryColor(word.mastery)}>
                            {word.mastery}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-[var(--text-primary)] mb-4">{word.definition}</p>
                      
                      {word.pronunciation && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                            <span className="font-mono">{word.pronunciation}</span>
                          </div>
                        </div>
                      )}
                      
                      {word.example && (
                        <div className="bg-[var(--primary-light)] rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-[var(--primary)] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            <div>
                              <div className="text-xs font-medium text-[var(--primary)] mb-1">Example:</div>
                              <p className="text-sm text-[var(--text-primary)] italic">"{word.example}"</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {filteredWords.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[var(--background-secondary)] rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No words found</h3>
                    <p className="text-[var(--text-secondary)]">Try adjusting your filters or add some new words to get started.</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Add Word Tab */}
          {activeTab === 'addWord' && (
            <Card>
              <CardBody>
                <div className="flex items-center gap-4 mb-6">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Add New Word</h2>
                </div>
                
                <form onSubmit={addWord} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4l-2 16h14L17 4M9 9v8m6-8v8" />
                        </svg>
                        Word *
                      </label>
                      <Input
                        type="text"
                        value={newWord.word}
                        onChange={(e) => setNewWord({...newWord, word: e.target.value})}
                        placeholder="Enter the word"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                        Difficulty
                      </label>
                      <select
                        className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        value={newWord.difficulty}
                        onChange={(e) => setNewWord({...newWord, difficulty: e.target.value as any})}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Definition *
                    </label>
                    <textarea
                      className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
                      rows={3}
                      value={newWord.definition}
                      onChange={(e) => setNewWord({...newWord, definition: e.target.value})}
                      placeholder="Enter the definition"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Example Sentence
                      </label>
                      <textarea
                        className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
                        rows={2}
                        value={newWord.example}
                        onChange={(e) => setNewWord({...newWord, example: e.target.value})}
                        placeholder="Enter an example sentence"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        Pronunciation
                      </label>
                      <Input
                        type="text"
                        value={newWord.pronunciation}
                        onChange={(e) => setNewWord({...newWord, pronunciation: e.target.value})}
                        placeholder="e.g., /ˈwɜːrd/"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button type="submit" variant="default" className="px-8">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Word
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}

          {/* Practice Tab */}
          {activeTab === 'practice' && (
            <Card>
              <CardBody>
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15a2 2 0 002-2V9a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293L10.293 4.293A1 1 0 009.586 4H8a2 2 0 00-2 2v5a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Practice Mode Coming Soon!</h3>
                  <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                    Interactive practice sessions with flashcards, matching games, and spaced repetition will be available in the next update.
                  </p>
                  <Badge variant="default">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    In Development
                  </Badge>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Quiz Tab */}
          {activeTab === 'quiz' && (
            <Card>
              <CardBody>
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-r from-[var(--accent)] to-[var(--primary)] rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Quiz Mode Coming Soon!</h3>
                  <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                    Test your vocabulary knowledge with interactive quizzes, multiple choice questions, and progress tracking.
                  </p>
                  <Badge variant="secondary">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    In Development
                  </Badge>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}