'use client';

import { useState, useEffect } from 'react';
import { ThemedComponent, useTheme } from '@/components/ThemeProvider';
import { useOptimizedRouter } from '@/lib/routing';
import api from '@/lib/api';

interface ProgressData {
  progress: number;
  chatMessageCount: number;
  totalWordsTyped: number;
  studyTime: string;
  dayStreak: number;
  level: string;
  
  activities: Activity[];
}

interface Activity {
  id: number;
  type: string;
  description: string;
  date: string;
  points: number;
}

export default function ProgressPage() {
  const { theme } = useTheme();
  const router = useOptimizedRouter();
  const [progressData, setProgressData] = useState<ProgressData>({
    progress: 0,
    chatMessageCount: 0,
    totalWordsTyped: 0,
    studyTime: '0h',
    dayStreak: 0,
    level: 'Beginner',
    activities: []
  });
  const [loading, setLoading] = useState(true);

  // Prefetch likely routes
  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/chat');
    router.prefetch('/vocabulary');
  }, [router]);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/progress');
      const data = response.data;
      
      setProgressData({
        progress: data.progress || 45,
        chatMessageCount: data.chatMessageCount || 0,
        totalWordsTyped: data.totalWordsTyped || 0,
        studyTime: data.studyTime || '0h',
        dayStreak: data.dayStreak || 0,
        level: data.level || 'Intermediate',
        activities: data.activities || []
      });
    } catch (error) {
      console.error('Error loading progress data:', error);
      // Set mock data for demo
      setProgressData({
        progress: 45,
        chatMessageCount: 127,
        totalWordsTyped: 2340,
        studyTime: '24h',
        dayStreak: 7,
        level: 'Intermediate',
        activities: [
          {
            id: 1,
            type: 'chat',
            description: 'Completed conversation practice',
            date: new Date().toISOString(),
            points: 10
          },
          {
            id: 2,
            type: 'vocabulary',
            description: 'Added 5 new words to vocabulary',
            date: new Date(Date.now() - 86400000).toISOString(),
            points: 15
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToPage = (path: string) => {
    router.navigate(path);
  };

  const getProgressStrokeDasharray = () => {
    const circumference = 2 * Math.PI * 50; // radius = 50
    const progress = (progressData.progress / 100) * circumference;
    return `${progress} ${circumference}`;
  };

  if (loading) {
    return (
      <ThemedComponent>
        <div className="app-container">
          <header className="app-header">
            <div className="academy-brand">
              <div className="academy-logo">🎓</div>
              <h1>ESL Academy</h1>
              <div className="academy-tagline">Excellence in English Learning</div>
            </div>
            <nav className="app-nav">
              <button onClick={() => navigateToPage('/dashboard')} className="nav-btn">
                <i className="fas fa-home"></i>
                <span>Dashboard</span>
              </button>
              <button onClick={() => navigateToPage('/chat')} className="nav-btn">
                <i className="fas fa-comments"></i>
                <span>Chat</span>
              </button>
              <button className="nav-btn active">
                <i className="fas fa-chart-line"></i>
                <span>Progress</span>
              </button>
              <button onClick={() => navigateToPage('/vocabulary')} className="nav-btn">
                <i className="fas fa-book"></i>
                <span>Vocabulary</span>
              </button>
            </nav>
          </header>
          <main className="app-main">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading progress data...</div>
            </div>
          </main>
        </div>
      </ThemedComponent>
    );
  }

  return (
    <ThemedComponent>
      <div className="app-container">
        <header className="app-header">
          <div className="academy-brand">
            <div className="academy-logo">🎓</div>
            <h1>ESL Academy</h1>
            <div className="academy-tagline">Excellence in English Learning</div>
          </div>
          <nav className="app-nav">
            <button onClick={() => navigateToPage('/dashboard')} className="nav-btn">
              <i className="fas fa-home"></i>
              <span>Dashboard</span>
            </button>
            <button onClick={() => navigateToPage('/chat')} className="nav-btn">
              <i className="fas fa-comments"></i>
              <span>Chat</span>
            </button>
            <button className="nav-btn active">
              <i className="fas fa-chart-line"></i>
              <span>Progress</span>
            </button>
            <button onClick={() => navigateToPage('/vocabulary')} className="nav-btn">
              <i className="fas fa-book"></i>
              <span>Vocabulary</span>
            </button>
          </nav>
        </header>

        <main className="app-main">
          <section className="progress-section">
            <div className="progress-header">
              <div className="progress-title">
                <h2><i className="fas fa-chart-line"></i> Learning Analytics</h2>
                <p className="progress-subtitle">Track your English learning journey and achievements</p>
              </div>
              <div className="progress-level">
                <div className="level-badge">
                  <span className="level-text">{progressData.level}</span>
                  <div className="level-progress">
                    <div 
                      className="level-fill" 
                      style={{ width: `${progressData.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Grid */}
            <div className="analytics-grid">
              {/* Overall Progress Card */}
              <div className="analytics-card main-progress">
                <div className="card-header">
                  <h3><i className="fas fa-trophy"></i> Overall Progress</h3>
                  <span className="progress-percentage">{progressData.progress}%</span>
                </div>
                <div className="progress-circle">
                  <svg className="progress-ring" width="120" height="120">
                    <circle 
                      className="progress-ring-bg" 
                      cx="60" 
                      cy="60" 
                      r="50"
                    ></circle>
                    <circle 
                      className="progress-ring-fill" 
                      cx="60" 
                      cy="60" 
                      r="50"
                      style={{ strokeDasharray: getProgressStrokeDasharray() }}
                    ></circle>
                  </svg>
                  <div className="progress-text">
                    <span className="progress-number">{progressData.progress}%</span>
                    <span className="progress-label">Complete</span>
                  </div>
                </div>
                <div className="progress-details">
                  <p>🎯 Next milestone: <strong>Advanced Level</strong></p>
                  <p>📈 <strong>{100 - progressData.progress}%</strong> more to go!</p>
                </div>
              </div>

              {/* Learning Statistics Card */}
              <div className="analytics-card stats-card">
                <div className="card-header">
                  <h3><i className="fas fa-chart-bar"></i> Learning Statistics</h3>
                </div>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-icon">
                      <i className="fas fa-comments"></i>
                    </div>
                    <div className="stat-info">
                      <span className="stat-number">{progressData.chatMessageCount}</span>
                      <span className="stat-label">Messages Sent</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">
                      <i className="fas fa-keyboard"></i>
                    </div>
                    <div className="stat-info">
                      <span className="stat-number">{progressData.totalWordsTyped}</span>
                      <span className="stat-label">Words Typed</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">
                      <i className="fas fa-clock"></i>
                    </div>
                    <div className="stat-info">
                      <span className="stat-number">{progressData.studyTime}</span>
                      <span className="stat-label">Study Time</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">
                      <i className="fas fa-fire"></i>
                    </div>
                    <div className="stat-info">
                      <span className="stat-number">{progressData.dayStreak}</span>
                      <span className="stat-label">Day Streak</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievements Card */}
              <div className="analytics-card achievements-card">
                <div className="card-header">
                  <h3><i className="fas fa-medal"></i> Recent Achievements</h3>
                </div>
                <div className="achievements-list">
                  <div className="achievement-item">
                    <div className="achievement-icon">🏆</div>
                    <div className="achievement-info">
                      <h4>First Conversation</h4>
                      <p>Completed your first chat session</p>
                    </div>
                  </div>
                  <div className="achievement-item">
                    <div className="achievement-icon">📚</div>
                    <div className="achievement-info">
                      <h4>Word Collector</h4>
                      <p>Added 10 words to vocabulary</p>
                    </div>
                  </div>
                  <div className="achievement-item">
                    <div className="achievement-icon">🔥</div>
                    <div className="achievement-info">
                      <h4>Week Warrior</h4>
                      <p>7-day learning streak</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activities Card */}
              <div className="analytics-card activities-card">
                <div className="card-header">
                  <h3><i className="fas fa-history"></i> Recent Activities</h3>
                </div>
                <div className="activities-list">
                  {progressData.activities.length > 0 ? (
                    progressData.activities.map((activity) => (
                      <div key={activity.id} className="activity-item">
                        <div className="activity-icon">
                          <i className={`fas ${activity.type === 'chat' ? 'fa-comments' : 'fa-book'}`}></i>
                        </div>
                        <div className="activity-info">
                          <div className="activity-description">{activity.description}</div>
                          <div className="activity-meta">
                            <span className="activity-points">+{activity.points} points</span>
                            <span className="activity-time">
                              {new Date(activity.date).toLocaleDateString()} {new Date(activity.date).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-activities">
                      <div className="no-activities-icon">
                        <i className="fas fa-chart-line"></i>
                      </div>
                      <h4>Start Your Learning Journey!</h4>
                      <p>No recent activities to display. Begin chatting with your AI tutor to see your progress here.</p>
                      <button 
                        onClick={() => navigateToPage('/chat')} 
                        className="btn btn-primary"
                      >
                        <i className="fas fa-comments"></i> Start Learning
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ThemedComponent>
  );
}