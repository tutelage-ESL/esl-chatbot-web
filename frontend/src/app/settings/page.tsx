'use client';

import { useState, useEffect } from 'react';
import { useOptimizedRouter } from '@/lib/routing';
import Layout from '@/components/ui/Layout';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

interface StudentProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  currentLevel: string;
  targetLevel: string;
  learningGoals: string[];
  focusAreas: string[];
  interfaceLanguage: string;
  timezone: string;
  voiceSpeed: number;
  theme: string;
  notifications: {
    email: boolean;
    push: boolean;
    reminders: boolean;
  };
}

export default function SettingsPage() {
  const router = useOptimizedRouter();
  const [profile, setProfile] = useState<StudentProfile>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    currentLevel: 'Beginner',
    targetLevel: 'Intermediate',
    learningGoals: [],
    focusAreas: [],
    interfaceLanguage: 'English',
    timezone: 'UTC-5',
    voiceSpeed: 1.0,
    theme: 'Light',
    notifications: {
      email: true,
      push: true,
      reminders: true
    }
  });
  const [editingSections, setEditingSections] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Prefetch likely routes
  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/chat');
    router.prefetch('/progress');
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/profile');
      setProfile(response.data.profile || profile);
    } catch (error) {
      console.error('Error loading profile:', error);
      // Set mock data for demo
      setProfile({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
        dateOfBirth: '1990-01-15',
        currentLevel: 'Intermediate',
        targetLevel: 'Advanced',
        learningGoals: ['Improve conversation skills', 'Pass IELTS exam'],
        focusAreas: ['Grammar', 'Vocabulary', 'Pronunciation'],
        interfaceLanguage: 'English',
        timezone: 'UTC-5',
        voiceSpeed: 1.0,
        theme: 'Light',
        notifications: {
          email: true,
          push: true,
          reminders: true
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEdit = (section: string) => {
    setEditingSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const cancelEdit = (section: string) => {
    setEditingSections(prev => ({
      ...prev,
      [section]: false
    }));
    loadProfile(); // Reset to original values
  };

  const saveSection = async (section: string) => {
    try {
      setSaving(true);
      await api.put('/api/profile', { section, data: profile });
      setEditingSections(prev => ({
        ...prev,
        [section]: false
      }));
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = (field: string, value: any) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNestedProfile = (parent: string, field: string, value: any) => {
    setProfile(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof StudentProfile] as any,
        [field]: value
      }
    }));
  };

  const toggleFocusArea = (area: string) => {
    setProfile(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter(a => a !== area)
        : [...prev.focusAreas, area]
    }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Student Profile</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Manage your account information and learning preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information Card */}
          <Card>
            <CardBody>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Personal Information</h3>
                  </div>
                  <Button
                    variant={editingSections.personal ? "secondary" : "primary"}
                    onClick={() => toggleEdit('personal')}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {editingSections.personal ? 'Cancel' : 'Edit'}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        First Name
                      </label>
                      <Input
                        type="text"
                        id="first-name"
                        value={profile.firstName}
                        onChange={(e) => updateProfile('firstName', e.target.value)}
                        disabled={!editingSections.personal}
                      />
                    </div>
                    <div>
                      <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Last Name
                      </label>
                      <Input
                        type="text"
                        id="last-name"
                        value={profile.lastName}
                        onChange={(e) => updateProfile('lastName', e.target.value)}
                        disabled={!editingSections.personal}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        id="email"
                        value={profile.email}
                        onChange={(e) => updateProfile('email', e.target.value)}
                        disabled={!editingSections.personal}
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number
                      </label>
                      <Input
                        type="tel"
                        id="phone"
                        value={profile.phone}
                        onChange={(e) => updateProfile('phone', e.target.value)}
                        disabled={!editingSections.personal}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="date-of-birth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      id="date-of-birth"
                      value={profile.dateOfBirth}
                      onChange={(e) => updateProfile('dateOfBirth', e.target.value)}
                      disabled={!editingSections.personal}
                    />
                  </div>
                  {editingSections.personal && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="primary"
                        onClick={() => saveSection('personal')}
                        disabled={saving}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => cancelEdit('personal')}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Learning Profile Card */}
          <Card>
            <CardBody>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Learning Profile</h3>
                  </div>
                  <Button
                    variant={editingSections.learning ? "secondary" : "primary"}
                    onClick={() => toggleEdit('learning')}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {editingSections.learning ? 'Cancel' : 'Edit'}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="current-level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current English Level
                      </label>
                      <select
                        id="current-level"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        value={profile.currentLevel}
                        onChange={(e) => updateProfile('currentLevel', e.target.value)}
                        disabled={!editingSections.learning}
                      >
                        <option value="Beginner">Beginner (A1)</option>
                        <option value="Elementary">Elementary (A2)</option>
                        <option value="Intermediate">Intermediate (B1)</option>
                        <option value="Upper Intermediate">Upper Intermediate (B2)</option>
                        <option value="Advanced">Advanced (C1)</option>
                        <option value="Proficient">Proficient (C2)</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="target-level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Target Level
                      </label>
                      <select
                        id="target-level"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        value={profile.targetLevel}
                        onChange={(e) => updateProfile('targetLevel', e.target.value)}
                        disabled={!editingSections.learning}
                      >
                        <option value="Beginner">Beginner (A1)</option>
                        <option value="Elementary">Elementary (A2)</option>
                        <option value="Intermediate">Intermediate (B1)</option>
                        <option value="Upper Intermediate">Upper Intermediate (B2)</option>
                        <option value="Advanced">Advanced (C1)</option>
                        <option value="Proficient">Proficient (C2)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="learning-goals" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Learning Goals
                    </label>
                    <textarea
                      id="learning-goals"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={3}
                      value={profile.learningGoals.join(', ')}
                      onChange={(e) => updateProfile('learningGoals', e.target.value.split(', ').filter(g => g.trim()))}
                      disabled={!editingSections.learning}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Focus Areas
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Grammar', 'Vocabulary', 'Pronunciation', 'Listening', 'Writing', 'Reading'].map(area => (
                        <label key={area} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            checked={profile.focusAreas.includes(area)}
                            onChange={() => toggleFocusArea(area)}
                            disabled={!editingSections.learning}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{area}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {editingSections.learning && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="primary"
                        onClick={() => saveSection('learning')}
                        disabled={saving}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => cancelEdit('learning')}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* App Settings Card */}
          <Card className="lg:col-span-2">
            <CardBody>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">App Settings</h3>
                  </div>
                  <Button
                    variant={editingSections.settings ? "secondary" : "primary"}
                    onClick={() => toggleEdit('settings')}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {editingSections.settings ? 'Cancel' : 'Edit'}
                  </Button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Interface Language
                      </label>
                      <select
                        id="language-select"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        value={profile.interfaceLanguage}
                        onChange={(e) => updateProfile('interfaceLanguage', e.target.value)}
                        disabled={!editingSections.settings}
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Italian">Italian</option>
                        <option value="Portuguese">Portuguese</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timezone
                      </label>
                      <select
                        id="timezone"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        value={profile.timezone}
                        onChange={(e) => updateProfile('timezone', e.target.value)}
                        disabled={!editingSections.settings}
                      >
                        <option value="Asia/Baghdad">Baghdad Time (UTC+3)</option>
                        <option value="UTC-5">Eastern Time (UTC-5)</option>
                        <option value="UTC-6">Central Time (UTC-6)</option>
                        <option value="UTC-7">Mountain Time (UTC-7)</option>
                        <option value="UTC-8">Pacific Time (UTC-8)</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="theme-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Theme
                      </label>
                      <select
                        id="theme-select"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        value={profile.theme}
                        onChange={(e) => updateProfile('theme', e.target.value)}
                        disabled={!editingSections.settings}
                      >
                        <option value="Light">Light</option>
                        <option value="Dark">Dark</option>
                        <option value="Classic">Classic</option>
                        <option value="Enhanced">Enhanced</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="voice-speed" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Voice Speed: {profile.voiceSpeed}x
                      </label>
                      <input
                        type="range"
                        id="voice-speed"
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={profile.voiceSpeed}
                        onChange={(e) => updateProfile('voiceSpeed', parseFloat(e.target.value))}
                        disabled={!editingSections.settings}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      Notifications
                    </label>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Email Notifications</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Receive updates via email</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={profile.notifications.email}
                            onChange={(e) => updateNestedProfile('notifications', 'email', e.target.checked)}
                            disabled={!editingSections.settings}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Push Notifications</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Receive browser notifications</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={profile.notifications.push}
                            onChange={(e) => updateNestedProfile('notifications', 'push', e.target.checked)}
                            disabled={!editingSections.settings}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Study Reminders</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Get reminded to practice</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={profile.notifications.reminders}
                            onChange={(e) => updateNestedProfile('notifications', 'reminders', e.target.checked)}
                            disabled={!editingSections.settings}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {editingSections.settings && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="primary"
                        onClick={() => saveSection('settings')}
                        disabled={saving}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => cancelEdit('settings')}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Layout>
  );
}