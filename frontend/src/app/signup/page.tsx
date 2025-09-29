'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useOptimizedRouter } from '@/lib/routing';
import { ThemedComponent, useTheme } from '@/components/ThemeProvider';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { navigate, prefetch } = useOptimizedRouter();
  const { theme, setTheme } = useTheme();

  // Prefetch likely next routes
  useEffect(() => {
    prefetch('/dashboard');
    prefetch('/login');
  }, [prefetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    const startTime = performance.now();

    try {
      const response = await api.post('/api/auth/signup', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      
      if (response.data.success) {
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Record performance and navigate
        const endTime = performance.now();
        console.log(`Signup completed in ${(endTime - startTime).toFixed(2)}ms`);
        
        // Use optimized navigation
        navigate('/dashboard');
      } else {
        setError(response.data.message || 'Signup failed');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.response?.data?.message || 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toggleTheme = () => {
    setTheme(theme === 'enhanced' ? 'classic' : 'enhanced');
  };

  return (
    <ThemedComponent>
      <div className="auth-page">
        {/* Header with branding and theme toggle */}
        <header className="auth-page-header">
          <div className="auth-brand">
            <div className="auth-brand-logo">🎓</div>
            <div className="auth-brand-text">
              <h1 className="auth-brand-title">ESL Academy</h1>
              <p className="auth-brand-subtitle">Excellence in English Learning</p>
            </div>
          </div>
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            {theme === 'enhanced' ? '🌙' : '☀️'}
          </button>
        </header>

        {/* Main content */}
        <main className="auth-page-main">
          <div className="auth-card">
            <div className="card-header">
              <div className="auth-icon">✨</div>
              <h2 className="card-title">Join ESL Academy</h2>
              <p className="card-subtitle">Start your personalized English learning journey today</p>
            </div>

            <div className="card-body">
              {error && (
                <div className="alert alert-error">
                  <span className="alert-icon">⚠️</span>
                  <span className="alert-message">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    <span className="label-icon">👤</span>
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    <span className="label-icon">📧</span>
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Enter your email address"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    <span className="label-icon">🔒</span>
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Create a secure password"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">
                    <span className="label-icon">🔐</span>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Confirm your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary btn-full"
                >
                  {isLoading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Creating Your Account...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🚀</span>
                      Start Learning Journey
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="card-footer">
              <div className="auth-links">
                <p className="auth-link-text">
                  Already have an account?{' '}
                  <Link href="/login" onClick={() => prefetch('/login')} className="auth-link">
                    Sign in here
                  </Link>
                </p>
                
                {/* Learning benefits showcase */}
                <div className="signup-benefits">
                  <h3 className="benefits-title">What you'll get:</h3>
                  <div className="benefits-grid">
                    <div className="benefit-item">
                      <span className="benefit-icon">🤖</span>
                      <div className="benefit-content">
                        <h4 className="benefit-title">AI Tutor</h4>
                        <p className="benefit-description">24/7 personalized English conversations</p>
                      </div>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">🎯</span>
                      <div className="benefit-content">
                        <h4 className="benefit-title">Progress Tracking</h4>
                        <p className="benefit-description">Monitor your improvement with detailed analytics</p>
                      </div>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">🗣️</span>
                      <div className="benefit-content">
                        <h4 className="benefit-title">Voice Practice</h4>
                        <p className="benefit-description">Improve pronunciation with speech recognition</p>
                      </div>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">📚</span>
                      <div className="benefit-content">
                        <h4 className="benefit-title">Vocabulary Builder</h4>
                        <p className="benefit-description">Expand your vocabulary with smart flashcards</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="auth-page-footer">
          <p className="footer-text">
            © 2024 ESL Academy. Empowering English learners worldwide.
          </p>
        </footer>
      </div>
    </ThemedComponent>
  );
}