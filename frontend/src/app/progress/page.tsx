'use client';

import { useState, useEffect } from 'react';
import { useOptimizedRouter } from '@/lib/routing';
import Layout from '@/components/Layout';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui';
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
          },
          {
            id: 3,
            type: 'pronunciation',
            description: 'Practiced pronunciation exercises',
            date: new Date(Date.now() - 172800000).toISOString(),
            points: 12
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

  const getActivityIcon = (type: string) => {
    const icons = {
      chat: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      ),
      vocabulary: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      ),
      pronunciation: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      ),
      voice: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      )
    };
    return icons[type as keyof typeof icons] || (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[var(--surface-primary)] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-[var(--text-secondary)]">Loading progress data...</div>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Learning Analytics
            </h1>
            <p className="text-[var(--text-secondary)] text-lg mb-4">Track your English learning journey and achievements</p>
            <Badge variant="default" className="text-lg px-4 py-2">
              {progressData.level} Level
            </Badge>
          </div>

          {/* Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {/* Overall Progress Card */}
            <Card className="lg:col-span-2 xl:col-span-1 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20 border-blue-200 dark:border-blue-700">
              <CardBody className="p-8 text-center">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Overall Progress</h3>
                  <Badge variant="default" className="text-lg">
                    {progressData.progress}%
                  </Badge>
                </div>
                
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-blue-200 dark:text-blue-800"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(progressData.progress / 100) * 314} 314`}
                      className="text-blue-600 dark:text-blue-400"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{progressData.progress}%</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">Complete</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Next: Advanced Level
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    <strong>{100 - progressData.progress}%</strong> more to go!
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Learning Statistics Card */}
            <Card className="lg:col-span-2">
              <CardBody className="p-6">
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Learning Statistics
                </h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">{progressData.chatMessageCount}</div>
                    <div className="text-sm text-green-600 dark:text-green-400">Messages Sent</div>
                  </div>

                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{progressData.totalWordsTyped}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Words Typed</div>
                  </div>

                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{progressData.studyTime}</div>
                    <div className="text-sm text-purple-600 dark:text-purple-400">Study Time</div>
                  </div>

                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{progressData.dayStreak}</div>
                    <div className="text-sm text-orange-600 dark:text-orange-400">Day Streak</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Achievements Card */}
            <Card>
              <CardBody className="p-6">
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Recent Achievements
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="text-2xl">🏆</div>
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)]">First Conversation</h4>
                      <p className="text-sm text-[var(--text-secondary)]">Completed your first chat session</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl">📚</div>
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)]">Word Collector</h4>
                      <p className="text-sm text-[var(--text-secondary)]">Added 10 words to vocabulary</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl">🔥</div>
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)]">Week Warrior</h4>
                      <p className="text-sm text-[var(--text-secondary)]">7-day learning streak</p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Recent Activities Card */}
            <Card>
              <CardBody className="p-6">
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recent Activities
                </h3>
                
                <div className="space-y-4">
                  {progressData.activities.length > 0 ? (
                    progressData.activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-4 p-4 bg-[var(--surface-secondary)] rounded-lg">
                        <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {getActivityIcon(activity.type)}
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-primary)] font-medium">{activity.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-secondary)]">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              +{activity.points} points
                            </span>
                            <span>{new Date(activity.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-[var(--surface-secondary)] rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Start Your Learning Journey!</h4>
                      <p className="text-[var(--text-secondary)] mb-4">No recent activities to display. Begin chatting with your AI tutor to see your progress here.</p>
                      <Button onClick={() => navigateToPage('/chat')}>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Start Learning
                      </Button>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}