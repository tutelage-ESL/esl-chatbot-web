'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useOptimizedRouter } from '@/lib/routing';
import Layout from '@/components/Layout';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui';
import api from '@/lib/api';

interface Goal {
  id: number;
  title: string;
  description: string;
  category: 'speaking' | 'listening' | 'reading' | 'writing' | 'vocabulary' | 'grammar';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  targetDate: string;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
}

interface GoalStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  averageProgress: number;
}

export default function GoalsPage() {
  const router = useOptimizedRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState<GoalStats>({
    totalGoals: 0,
    activeGoals: 0,
    completedGoals: 0,
    averageProgress: 0
  });
  const [activeTab, setActiveTab] = useState('current');
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'speaking' as const,
    difficulty: 'beginner' as const,
    targetDate: ''
  });

  // Prefetch likely routes
  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/progress');
    router.prefetch('/chat');
  }, [router]);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/goals');
      const data = response.data;
      
      setGoals(data.goals || []);
      calculateStats(data.goals || []);
    } catch (error) {
      console.error('Error loading goals:', error);
      // Set mock data for demo
      const mockGoals: Goal[] = [
        {
          id: 1,
          title: 'Improve Conversation Skills',
          description: 'Practice daily conversations with AI tutor',
          category: 'speaking',
          difficulty: 'intermediate',
          targetDate: '2024-03-01',
          progress: 65,
          status: 'active',
          createdAt: '2024-01-15'
        },
        {
          id: 2,
          title: 'Learn 100 New Words',
          description: 'Expand vocabulary with business terms',
          category: 'vocabulary',
          difficulty: 'beginner',
          targetDate: '2024-02-15',
          progress: 45,
          status: 'active',
          createdAt: '2024-01-10'
        },
        {
          id: 3,
          title: 'Master Grammar Rules',
          description: 'Complete advanced grammar exercises',
          category: 'grammar',
          difficulty: 'advanced',
          targetDate: '2024-01-30',
          progress: 100,
          status: 'completed',
          createdAt: '2024-01-01'
        }
      ];
      setGoals(mockGoals);
      calculateStats(mockGoals);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (goalList: Goal[]) => {
    const stats = {
      totalGoals: goalList.length,
      activeGoals: goalList.filter(g => g.status === 'active').length,
      completedGoals: goalList.filter(g => g.status === 'completed').length,
      averageProgress: goalList.length > 0 
        ? Math.round(goalList.reduce((sum, g) => sum + g.progress, 0) / goalList.length)
        : 0
    };
    setStats(stats);
  };

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/goals', newGoal);
      if (response.data.success) {
        setNewGoal({
          title: '',
          description: '',
          category: 'speaking',
          difficulty: 'beginner',
          targetDate: ''
        });
        loadGoals();
        setActiveTab('current');
      }
    } catch (error) {
      console.error('Error adding goal:', error);
      alert('Error adding goal. Please try again.');
    }
  };

  const updateGoalProgress = async (goalId: number, progress: number) => {
    try {
      await api.patch(`/api/goals/${goalId}`, { progress });
      loadGoals();
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      speaking: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      ),
      listening: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      ),
      reading: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      ),
      writing: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      ),
      vocabulary: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      ),
      grammar: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      )
    };
    return icons[category as keyof typeof icons] || (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      beginner: 'success',
      intermediate: 'warning',
      advanced: 'error'
    };
    return colors[difficulty as keyof typeof colors] || 'default';
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[var(--surface-primary)] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-[var(--text-secondary)]">Loading goals...</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[var(--surface-primary)] p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 flex items-center justify-center gap-3">
              <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Learning Goals
            </h1>
            <p className="text-[var(--text-secondary)] text-lg">Set and track your English learning objectives</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Goals</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalGoals}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Active Goals</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.activeGoals}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Completed</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.completedGoals}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Avg Progress</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.averageProgress}%</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center">
            <div className="bg-[var(--surface-secondary)] p-1 rounded-lg inline-flex">
              {[
                { id: 'current', label: 'Current Goals', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                { id: 'completed', label: 'Completed', icon: 'M5 13l4 4L19 7' },
                { id: 'add', label: 'Add New Goal', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-[var(--primary)] text-white shadow-lg'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)]'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add New Goal Tab */}
          {activeTab === 'add' && (
            <Card>
              <CardBody className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Create New Goal</h2>
                  <p className="text-[var(--text-secondary)]">Set a new learning objective to track your progress</p>
                </div>

                <form onSubmit={addGoal} className="space-y-6 max-w-2xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Goal Title *
                      </label>
                      <Input
                        type="text"
                        value={newGoal.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGoal({ ...newGoal, title: e.target.value })}
                        placeholder="e.g., Improve conversation skills"
                        required
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Category *
                      </label>
                      <select
                        value={newGoal.category}
                        onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as any })}
                        className="w-full px-4 py-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        required
                      >
                        <option value="speaking">🗣️ Speaking</option>
                        <option value="listening">👂 Listening</option>
                        <option value="reading">📖 Reading</option>
                        <option value="writing">✍️ Writing</option>
                        <option value="vocabulary">💬 Vocabulary</option>
                        <option value="grammar">📝 Grammar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Difficulty Level *
                      </label>
                      <select
                        value={newGoal.difficulty}
                        onChange={(e) => setNewGoal({ ...newGoal, difficulty: e.target.value as any })}
                        className="w-full px-4 py-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                        required
                      >
                        <option value="beginner">🟢 Beginner</option>
                        <option value="intermediate">🟡 Intermediate</option>
                        <option value="advanced">🔴 Advanced</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Description
                      </label>
                      <textarea
                        value={newGoal.description}
                        onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                        placeholder="Describe what you want to achieve..."
                        rows={4}
                        className="w-full px-4 py-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Target Date *
                      </label>
                      <Input
                        type="date"
                        value={newGoal.targetDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center gap-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab('current')}
                      className="px-8"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="px-8">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Goal
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}

          {/* Current Goals Tab */}
          {activeTab === 'current' && (
            <div className="space-y-6">
              {goals.filter(g => g.status === 'active').length === 0 ? (
                <Card>
                  <CardBody className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Active Goals</h3>
                    <p className="text-[var(--text-secondary)] mb-6">Start your learning journey by creating your first goal!</p>
                    <Button onClick={() => setActiveTab('add')}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Your First Goal
                    </Button>
                  </CardBody>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {goals.filter(g => g.status === 'active').map((goal) => (
                    <Card key={goal.id} className="hover:shadow-lg transition-shadow duration-200">
                      <CardBody className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {getCategoryIcon(goal.category)}
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-semibold text-[var(--text-primary)]">{goal.title}</h3>
                              <p className="text-sm text-[var(--text-secondary)] capitalize">{goal.category}</p>
                            </div>
                          </div>
                          <Badge variant={getDifficultyColor(goal.difficulty)} className="capitalize">
                            {goal.difficulty}
                          </Badge>
                        </div>

                        <p className="text-[var(--text-secondary)] text-sm mb-4">{goal.description}</p>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[var(--text-secondary)]">Progress</span>
                            <span className="font-medium text-[var(--text-primary)]">{goal.progress}%</span>
                          </div>
                          <ProgressBar value={goal.progress} className="h-2" />
                          
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[var(--text-secondary)]">Target Date</span>
                            <span className="font-medium text-[var(--text-primary)]">
                              {new Date(goal.targetDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateGoalProgress(goal.id, Math.min(100, goal.progress + 10))}
                            className="flex-1"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Update Progress
                          </Button>
                          <Link href={`/chat?goal=${goal.id}`}>
                            <Button size="sm" className="flex-1">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Practice
                            </Button>
                          </Link>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Completed Goals Tab */}
          {activeTab === 'completed' && (
            <div className="space-y-6">
              {goals.filter(g => g.status === 'completed').length === 0 ? (
                <Card>
                  <CardBody className="p-12 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Completed Goals Yet</h3>
                    <p className="text-[var(--text-secondary)]">Keep working on your active goals to see them here!</p>
                  </CardBody>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {goals.filter(g => g.status === 'completed').map((goal) => (
                    <Card key={goal.id} className="border-green-200 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10">
                      <CardBody className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-semibold text-[var(--text-primary)]">{goal.title}</h3>
                              <p className="text-sm text-[var(--text-secondary)] capitalize">{goal.category}</p>
                            </div>
                          </div>
                          <Badge variant="success">Completed</Badge>
                        </div>

                        <p className="text-[var(--text-secondary)] text-sm mb-4">{goal.description}</p>

                        <div className="space-y-3">
                          <ProgressBar value={100} className="h-2" variant="success" />
                          
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[var(--text-secondary)]">Completed on</span>
                            <span className="font-medium text-green-600">
                              {new Date(goal.targetDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}