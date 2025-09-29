'use client';

import { useState, useEffect } from 'react';
import { ThemedComponent, useTheme } from '@/components/ThemeProvider';
import { useOptimizedRouter } from '@/lib/routing';
import AppLayout from '@/components/AppLayout';
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
  const { theme } = useTheme();
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

  const navigateToPage = (path: string) => {
    router.navigate(path);
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      speaking: 'fa-microphone',
      listening: 'fa-headphones',
      reading: 'fa-book-open',
      writing: 'fa-pen',
      vocabulary: 'fa-spell-check',
      grammar: 'fa-language'
    };
    return icons[category as keyof typeof icons] || 'fa-target';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: '#4CAF50',
      completed: '#2196F3',
      paused: '#FF9800'
    };
    return colors[status as keyof typeof colors] || '#666';
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
              <button className="btn btn-nav active">
                <i className="fas fa-target"></i>
                <span>Goals</span>
              </button>
            </nav>
          </header>
          <main className="app-main">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading goals...</div>
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
            <div className="goals-container">
              <div className="goals-header">
                <h2><i className="fas fa-target"></i> Learning Goals</h2>
                <p>Set and track your English learning objectives</p>
              </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <h3>{stats.totalGoals}</h3>
                <p>Total Goals</p>
              </div>
              <div className="stat-card">
                <h3>{stats.activeGoals}</h3>
                <p>Active Goals</p>
              </div>
              <div className="stat-card">
                <h3>{stats.completedGoals}</h3>
                <p>Completed</p>
              </div>
              <div className="stat-card">
                <h3>{stats.averageProgress}%</h3>
                <p>Average Progress</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'current' ? 'active' : ''}`}
                onClick={() => setActiveTab('current')}
              >
                Current Goals
              </button>
              <button 
                className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                Completed
              </button>
              <button 
                className={`tab ${activeTab === 'add' ? 'active' : ''}`}
                onClick={() => setActiveTab('add')}
              >
                Add New Goal
              </button>
            </div>

            {/* Current Goals Tab */}
            {activeTab === 'current' && (
              <div className="tab-content active">
                <div className="goals-grid">
                  {goals.filter(goal => goal.status !== 'completed').map((goal) => (
                    <div key={goal.id} className="goal-card">
                      <div className="goal-header">
                        <div className="goal-category">
                          <i className={`fas ${getCategoryIcon(goal.category)}`}></i>
                          <span>{goal.category}</span>
                        </div>
                        <div 
                          className="goal-status"
                          style={{ color: getStatusColor(goal.status) }}
                        >
                          {goal.status}
                        </div>
                      </div>
                      <h3 className="goal-title">{goal.title}</h3>
                      <p className="goal-description">{goal.description}</p>
                      <div className="goal-progress">
                        <div className="progress-header">
                          <span>Progress</span>
                          <span>{goal.progress}%</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${goal.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="goal-meta">
                        <span className="goal-difficulty">
                          <i className="fas fa-signal"></i>
                          {goal.difficulty}
                        </span>
                        <span className="goal-target">
                          <i className="fas fa-calendar"></i>
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="goal-actions">
                        <button 
                          onClick={() => updateGoalProgress(goal.id, Math.min(100, goal.progress + 10))}
                          className="btn btn-primary btn-sm"
                        >
                          Update Progress
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {goals.filter(goal => goal.status !== 'completed').length === 0 && (
                  <div className="empty-state">
                    <h3>No active goals</h3>
                    <p>Set your first learning goal to get started!</p>
                    <button 
                      onClick={() => setActiveTab('add')}
                      className="btn btn-primary"
                    >
                      Add Your First Goal
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Completed Goals Tab */}
            {activeTab === 'completed' && (
              <div className="tab-content active">
                <div className="goals-grid">
                  {goals.filter(goal => goal.status === 'completed').map((goal) => (
                    <div key={goal.id} className="goal-card completed">
                      <div className="goal-header">
                        <div className="goal-category">
                          <i className={`fas ${getCategoryIcon(goal.category)}`}></i>
                          <span>{goal.category}</span>
                        </div>
                        <div className="goal-status completed">
                          <i className="fas fa-check"></i>
                          Completed
                        </div>
                      </div>
                      <h3 className="goal-title">{goal.title}</h3>
                      <p className="goal-description">{goal.description}</p>
                      <div className="goal-progress">
                        <div className="progress-bar">
                          <div className="progress-fill completed" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {goals.filter(goal => goal.status === 'completed').length === 0 && (
                  <div className="empty-state">
                    <h3>No completed goals yet</h3>
                    <p>Complete your first goal to see it here!</p>
                  </div>
                )}
              </div>
            )}

            {/* Add New Goal Tab */}
            {activeTab === 'add' && (
              <div className="tab-content active">
                <form onSubmit={addGoal} className="add-goal-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="title">Goal Title *</label>
                      <input
                        type="text"
                        id="title"
                        value={newGoal.title}
                        onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="category">Category</label>
                      <select
                        id="category"
                        value={newGoal.category}
                        onChange={(e) => setNewGoal({...newGoal, category: e.target.value as any})}
                      >
                        <option value="speaking">Speaking</option>
                        <option value="listening">Listening</option>
                        <option value="reading">Reading</option>
                        <option value="writing">Writing</option>
                        <option value="vocabulary">Vocabulary</option>
                        <option value="grammar">Grammar</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea
                      id="description"
                      value={newGoal.description}
                      onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="difficulty">Difficulty</label>
                      <select
                        id="difficulty"
                        value={newGoal.difficulty}
                        onChange={(e) => setNewGoal({...newGoal, difficulty: e.target.value as any})}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="targetDate">Target Date</label>
                      <input
                        type="date"
                        id="targetDate"
                        value={newGoal.targetDate}
                        onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-plus"></i> Create Goal
                  </button>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    </AppLayout>
  </ThemedComponent>
  );
}