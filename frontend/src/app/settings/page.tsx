'use client';

import { useState, useEffect } from 'react';
import { ThemedComponent, useTheme } from '@/components/ThemeProvider';
import { useOptimizedRouter } from '@/lib/routing';
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
  const { theme, setTheme } = useTheme();
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
      
      // Apply theme change immediately if theme section was saved
      if (section === 'settings' && profile.theme !== theme) {
        setTheme(profile.theme.toLowerCase() as 'classic' | 'enhanced');
      }
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
              <button className="btn btn-nav active">
                <i className="fas fa-cog"></i>
                <span>Settings</span>
              </button>
            </nav>
          </header>
          <main className="app-main">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading profile...</div>
            </div>
          </main>
        </div>
      </ThemedComponent>
    );
  }

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
              <i className="fas fa-cog"></i>
              <span>Settings</span>
            </button>
            <button onClick={() => navigateToPage('/progress')} className="btn btn-nav">
              <i className="fas fa-chart-line"></i>
              <span>Progress</span>
            </button>
          </nav>
        </header>

        <main className="app-main">
          <div className="settings-container">
            <div className="profile-header">
              <h2><i className="fas fa-user-circle"></i> Student Profile</h2>
              <p className="profile-subtitle">Manage your account information and learning preferences</p>
            </div>

            <div className="profile-container">
              {/* Personal Information Card */}
              <div className="profile-card">
                <div className="card-header">
                  <h3><i className="fas fa-user"></i> Personal Information</h3>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => toggleEdit('personal')}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                </div>
                <form className="profile-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="first-name">First Name</label>
                      <input
                        type="text"
                        id="first-name"
                        value={profile.firstName}
                        onChange={(e) => updateProfile('firstName', e.target.value)}
                        readOnly={!editingSections.personal}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="last-name">Last Name</label>
                      <input
                        type="text"
                        id="last-name"
                        value={profile.lastName}
                        onChange={(e) => updateProfile('lastName', e.target.value)}
                        readOnly={!editingSections.personal}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="email">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        value={profile.email}
                        onChange={(e) => updateProfile('email', e.target.value)}
                        readOnly={!editingSections.personal}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        value={profile.phone}
                        onChange={(e) => updateProfile('phone', e.target.value)}
                        readOnly={!editingSections.personal}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="date-of-birth">Date of Birth</label>
                    <input
                      type="date"
                      id="date-of-birth"
                      value={profile.dateOfBirth}
                      onChange={(e) => updateProfile('dateOfBirth', e.target.value)}
                      readOnly={!editingSections.personal}
                    />
                  </div>
                  {editingSections.personal && (
                    <div className="form-actions">
                      <button 
                        type="button" 
                        className="btn btn-save"
                        onClick={() => saveSection('personal')}
                        disabled={saving}
                      >
                        <i className="fas fa-save"></i> Save Changes
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-cancel"
                        onClick={() => cancelEdit('personal')}
                      >
                        <i className="fas fa-times"></i> Cancel
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Learning Profile Card */}
              <div className="profile-card">
                <div className="card-header">
                  <h3><i className="fas fa-graduation-cap"></i> Learning Profile</h3>
                  <button 
                    type="button" 
                    className="edit-btn"
                    onClick={() => toggleEdit('learning')}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                </div>
                <form className="profile-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="current-level">Current English Level</label>
                      <select
                        id="current-level"
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
                    <div className="form-group">
                      <label htmlFor="target-level">Target Level</label>
                      <select
                        id="target-level"
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
                  <div className="form-group">
                    <label htmlFor="learning-goals">Learning Goals</label>
                    <textarea
                      id="learning-goals"
                      rows={3}
                      value={profile.learningGoals.join(', ')}
                      onChange={(e) => updateProfile('learningGoals', e.target.value.split(', ').filter(g => g.trim()))}
                      readOnly={!editingSections.learning}
                    />
                  </div>
                  <div className="form-group">
                    <label>Focus Areas</label>
                    <div className="checkbox-group">
                      {['Grammar', 'Vocabulary', 'Pronunciation', 'Listening', 'Writing', 'Reading'].map(area => (
                        <label key={area} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={profile.focusAreas.includes(area)}
                            onChange={() => toggleFocusArea(area)}
                            disabled={!editingSections.learning}
                          />
                          <span className="checkmark"></span>
                          {area}
                        </label>
                      ))}
                    </div>
                  </div>
                  {editingSections.learning && (
                    <div className="form-actions">
                      <button 
                        type="button" 
                        className="btn btn-save"
                        onClick={() => saveSection('learning')}
                        disabled={saving}
                      >
                        <i className="fas fa-save"></i> Save Changes
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-cancel"
                        onClick={() => cancelEdit('learning')}
                      >
                        <i className="fas fa-times"></i> Cancel
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* App Settings Card */}
              <div className="profile-card">
                <div className="card-header">
                  <h3><i className="fas fa-cog"></i> App Settings</h3>
                  <button 
                    type="button" 
                    className="edit-btn"
                    onClick={() => toggleEdit('settings')}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                </div>
                <form className="profile-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="language-select">Interface Language</label>
                      <select
                        id="language-select"
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
                    <div className="form-group">
                      <label htmlFor="timezone">Timezone</label>
                      <select
                        id="timezone"
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
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="voice-speed">Voice Speed</label>
                      <div className="range-input">
                        <input
                          type="range"
                          id="voice-speed"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={profile.voiceSpeed}
                          onChange={(e) => updateProfile('voiceSpeed', parseFloat(e.target.value))}
                          disabled={!editingSections.settings}
                        />
                        <span className="speed-value">{profile.voiceSpeed}x</span>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="theme-select">Theme</label>
                      <select
                        id="theme-select"
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
                  </div>
                  <div className="form-group">
                    <label>Notifications</label>
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={profile.notifications.email}
                          onChange={(e) => updateNestedProfile('notifications', 'email', e.target.checked)}
                          disabled={!editingSections.settings}
                        />
                        <span className="checkmark"></span>
                        Email Notifications
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={profile.notifications.push}
                          onChange={(e) => updateNestedProfile('notifications', 'push', e.target.checked)}
                          disabled={!editingSections.settings}
                        />
                        <span className="checkmark"></span>
                        Push Notifications
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={profile.notifications.reminders}
                          onChange={(e) => updateNestedProfile('notifications', 'reminders', e.target.checked)}
                          disabled={!editingSections.settings}
                        />
                        <span className="checkmark"></span>
                        Study Reminders
                      </label>
                    </div>
                  </div>
                  {editingSections.settings && (
                    <div className="form-actions">
                      <button 
                        type="button" 
                        className="btn btn-save"
                        onClick={() => saveSection('settings')}
                        disabled={saving}
                      >
                        <i className="fas fa-save"></i> Save Changes
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-cancel"
                        onClick={() => cancelEdit('settings')}
                      >
                        <i className="fas fa-times"></i> Cancel
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ThemedComponent>
  );
}