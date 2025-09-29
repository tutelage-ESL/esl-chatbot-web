'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useOptimizedRouter } from '@/lib/routing';
import { ThemedComponent, useTheme } from '@/components/ThemeProvider';
import AppLayout from '@/components/AppLayout';

interface DashboardStats {
  lessonsCompleted: number;
  studyTime: string;
  wordsLearned: number;
  streakDays: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  subscriptionTier: string;
}

export default function DashboardPage() {
  const router = useOptimizedRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    lessonsCompleted: 0,
    studyTime: '0h',
    wordsLearned: 0,
    streakDays: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [userResponse, statsResponse] = await Promise.all([
        api.get('/api/auth/status'),
        api.get('/api/dashboard/stats'),
      ]);

      if (userResponse.data.authenticated) {
        setUser(userResponse.data.user);
      }

      if (statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedComponent>
        <div className="app-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading dashboard...</p>
          </div>
        </div>
      </ThemedComponent>
    );
  }

  if (!user) {
    return (
      <ThemedComponent>
        <div className="app-container">
          <div className="error-container">
            <p className="error-text">Please log in to view your dashboard.</p>
            <Link href="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </div>
        </div>
      </ThemedComponent>
    );
  }

  return (
    <ThemedComponent>
      <AppLayout>
        <div className="app-container">
          <main className="dashboard-main">
          {/* Welcome Section */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div className="nav-logo">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="card-title">Welcome back, {user.username}!</h2>
                  <p className="card-subtitle">Intermediate Level • Keep up the excellent work!</p>
                </div>
              </div>
              <div className="user-menu">
                <span className="user-greeting">Ready to learn?</span>
                <Link href="/settings" className="btn btn-secondary">
                  Settings
                </Link>
              </div>
            </div>
            <div className="card-body">
              <p>You're making great progress in your English learning journey. Continue practicing to reach your goals!</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📚</div>
              <span className="stat-value">{stats.lessonsCompleted}</span>
              <div className="stat-label">Lessons Completed</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⏰</div>
              <span className="stat-value">{stats.studyTime}</span>
              <div className="stat-label">Study Time</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <span className="stat-value">{stats.wordsLearned}</span>
              <div className="stat-label">Words Learned</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <span className="stat-value">{stats.streakDays}</span>
              <div className="stat-label">Day Streak</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-grid">
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">💬 AI Chat Practice</h3>
                  <p className="card-subtitle">Interactive conversations</p>
                </div>
              </div>
              <div className="card-body">
                <p>Practice conversations with our AI tutor to improve your speaking and comprehension skills.</p>
              </div>
              <div className="card-footer">
                <Link href="/chat" className="btn btn-primary">
                  Start Chatting
                </Link>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Available 24/7</span>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">🎤 Voice Practice</h3>
                  <p className="card-subtitle">Pronunciation training</p>
                </div>
              </div>
              <div className="card-body">
                <p>Improve your pronunciation with voice exercises and real-time feedback.</p>
              </div>
              <div className="card-footer">
                <Link href="/voice" className="btn btn-success">
                  Practice Speaking
                </Link>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>AI-powered feedback</span>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">📚 Vocabulary Builder</h3>
                  <p className="card-subtitle">Expand your word knowledge</p>
                </div>
              </div>
              <div className="card-body">
                <p>Learn new words and phrases with interactive lessons and spaced repetition.</p>
              </div>
              <div className="card-footer">
                <Link href="/vocabulary" className="btn btn-primary">
                  Learn Words
                </Link>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Adaptive learning</span>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">🎯 Learning Goals</h3>
                  <p className="card-subtitle">Track your objectives</p>
                </div>
              </div>
              <div className="card-body">
                <p>Set and track your learning objectives to stay motivated and focused.</p>
              </div>
              <div className="card-footer">
                <Link href="/goals" className="btn btn-warning">
                  View Goals
                </Link>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Stay motivated</span>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">📈 Progress Tracking</h3>
                  <p className="card-subtitle">Monitor your improvement</p>
                </div>
              </div>
              <div className="card-body">
                <p>Monitor your learning progress over time with detailed analytics and insights.</p>
              </div>
              <div className="card-footer">
                <Link href="/progress" className="btn btn-secondary">
                  View Progress
                </Link>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Detailed analytics</span>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">⏱️ Usage Dashboard</h3>
                  <p className="card-subtitle">Subscription & usage</p>
                </div>
              </div>
              <div className="card-body">
                <p>Track your TTS usage, subscription status, and account information.</p>
              </div>
              <div className="card-footer">
                <Link href="/usage-dashboard" className="btn btn-secondary">
                  View Usage
                </Link>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Account details</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  </ThemedComponent>
  );
}