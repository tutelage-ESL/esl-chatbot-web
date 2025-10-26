'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useOptimizedRouter } from '@/lib/routing';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui';

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

interface RecentActivity {
  id: string;
  type: 'lesson' | 'chat' | 'vocabulary' | 'voice';
  title: string;
  timestamp: string;
  score?: number;
}

export default function DashboardPage() {
  const router = useOptimizedRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    lessonsCompleted: 0,
    studyTime: '0h',
    wordsLearned: 0,
    streakDays: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
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

      // Mock recent activity data
      setRecentActivity([
        { id: '1', type: 'chat', title: 'AI Conversation Practice', timestamp: '2 hours ago', score: 85 },
        { id: '2', type: 'vocabulary', title: 'Business English Words', timestamp: '1 day ago', score: 92 },
        { id: '3', type: 'voice', title: 'Pronunciation Exercise', timestamp: '2 days ago', score: 78 },
        { id: '4', type: 'lesson', title: 'Grammar Fundamentals', timestamp: '3 days ago', score: 88 },
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'chat': return 'fa-comments';
      case 'vocabulary': return 'fa-book';
      case 'voice': return 'fa-microphone';
      case 'lesson': return 'fa-graduation-cap';
      default: return 'fa-file-alt';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'score-excellent';
    if (score >= 80) return 'score-good';
    if (score >= 70) return 'score-fair';
    return 'score-needs-improvement';
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[var(--text-secondary)]">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 bg-[var(--error-light)] rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="w-8 h-8 text-[var(--error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Access Required</h2>
            <p className="text-[var(--text-secondary)] mb-6">Please log in to view your dashboard.</p>
            <Link href="/login">
              <Button variant="default" size="lg">
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <Card>
          <CardBody className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-2xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                    Welcome back, {user.username}!
                  </h1>
                  <p className="text-[var(--text-secondary)] mb-3">
                    Ready to continue your English learning journey?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default" size="sm">
                      🏆 Intermediate Level
                    </Badge>
                    <Badge variant="secondary" size="sm">
                      🔥 {stats.streakDays} day streak
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/goals">
                  <Button variant="secondary" size="base">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Set Goals
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="secondary" size="base">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Stats Section */}
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Your Progress Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardBody className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--primary-light)] rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                      {stats.lessonsCompleted}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] mb-3">
                      Lessons Completed
                    </div>
                    <ProgressBar 
                      value={Math.min((stats.lessonsCompleted / 50) * 100, 100)} 
                      variant="primary" 
                      size="sm" 
                    />
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      Goal: 50 lessons
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardBody className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--success-light)] rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                      {stats.studyTime}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] mb-3">
                      Study Time
                    </div>
                    <ProgressBar 
                      value={65} 
                      variant="success" 
                      size="sm" 
                    />
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      This week
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardBody className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--warning-light)] rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                      {stats.wordsLearned}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] mb-3">
                      Words Learned
                    </div>
                    <ProgressBar 
                      value={Math.min((stats.wordsLearned / 500) * 100, 100)} 
                      variant="warning" 
                      size="sm" 
                    />
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      Goal: 500 words
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardBody className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--error-light)] rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-[var(--error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                      {stats.streakDays}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] mb-3">
                      Day Streak
                    </div>
                    <ProgressBar 
                      value={Math.min((stats.streakDays / 30) * 100, 100)} 
                      variant="error" 
                      size="sm" 
                    />
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      Goal: 30 days
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer group">
              <CardBody className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">AI Chat Tutor</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Practice conversations</p>
                  </div>
                </div>
                <Link href="/chat">
                  <Button variant="outline" size="sm" className="w-full">
                    Start Chat
                  </Button>
                </Link>
              </CardBody>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer group">
              <CardBody className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--success)] to-[var(--success-dark)] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">Voice Practice</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Improve pronunciation</p>
                  </div>
                </div>
                <Link href="/voice">
                  <Button variant="outline" size="sm" className="w-full">
                    Start Recording
                  </Button>
                </Link>
              </CardBody>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer group">
              <CardBody className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--warning)] to-[var(--warning-dark)] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">Vocabulary Builder</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Learn new words</p>
                  </div>
                </div>
                <Link href="/vocabulary">
                  <Button variant="outline" size="sm" className="w-full">
                    Study Words
                  </Button>
                </Link>
              </CardBody>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer group">
              <CardBody className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--info)] to-[var(--info-dark)] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">Learning Goals</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Set your targets</p>
                  </div>
                </div>
                <Link href="/goals">
                  <Button variant="outline" size="sm" className="w-full">
                    View Goals
                  </Button>
                </Link>
              </CardBody>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer group">
              <CardBody className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--secondary)] to-[var(--secondary-dark)] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">Progress Tracking</h3>
                    <p className="text-sm text-[var(--text-secondary)]">View your analytics</p>
                  </div>
                </div>
                <Link href="/progress">
                  <Button variant="outline" size="sm" className="w-full">
                    View Progress
                  </Button>
                </Link>
              </CardBody>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer group">
              <CardBody className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--error)] to-[var(--error-dark)] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">Pronunciation</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Perfect your accent</p>
                  </div>
                </div>
                <Link href="/pronunciation">
                  <Button variant="outline" size="sm" className="w-full">
                    Practice Now
                  </Button>
                </Link>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Activity
          </h2>
          <Card>
            <CardBody className="p-6">
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-4 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] transition-colors">
                    <div className="w-10 h-10 bg-[var(--primary-light)] rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {activity.type === 'chat' && (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        )}
                        {activity.type === 'vocabulary' && (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        )}
                        {activity.type === 'voice' && (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        )}
                        {activity.type === 'lesson' && (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                        )}
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-[var(--text-primary)] mb-1">{activity.title}</h4>
                      <p className="text-sm text-[var(--text-secondary)]">{activity.timestamp}</p>
                    </div>
                    {activity.score && (
                      <div className="text-right">
                        <div className={`text-lg font-semibold ${getScoreColor(activity.score)}`}>
                          {activity.score}%
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">Score</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                <Link href="/progress">
                  <Button variant="outline" size="sm" className="w-full">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    View All Activity
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Daily Challenge Section */}
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Today's Challenge
          </h2>
          <Card className="bg-gradient-to-r from-[var(--primary-light)] to-[var(--secondary-light)]">
            <CardBody className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Complete a 10-minute conversation practice session</h3>
                  <p className="text-[var(--text-secondary)]">Practice your conversational skills with our AI tutor</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[var(--primary)] mb-1">+50</div>
                  <div className="text-sm text-[var(--text-secondary)]">XP</div>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[var(--text-secondary)]">Progress</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">3/10 minutes</span>
                </div>
                <ProgressBar value={30} variant="primary" size="md" />
              </div>
              <Link href="/chat">
                <Button variant="default" size="base" className="w-full">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Continue Challenge
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>

      </div>
    </Layout>
  );
}