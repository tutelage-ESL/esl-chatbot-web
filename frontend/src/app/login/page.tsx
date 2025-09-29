'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useOptimizedRouter } from '@/lib/routing';
import { ThemedComponent, useTheme } from '@/components/ThemeProvider';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { navigate, prefetch } = useOptimizedRouter();
  const { theme, setTheme } = useTheme();

  // Prefetch likely next routes
  useEffect(() => {
    prefetch('/dashboard');
    prefetch('/signup');
  }, [prefetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const startTime = performance.now();

    try {
      const response = await api.post('/api/auth/login', formData);
      
      if (response.data.success) {
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Record performance and navigate
        const endTime = performance.now();
        console.log(`Login completed in ${(endTime - startTime).toFixed(2)}ms`);
        
        // Use optimized navigation
        navigate('/dashboard');
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'An error occurred during login');
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
              <div className="auth-icon">🔐</div>
              <h2 className="card-title">Welcome Back</h2>
              <p className="card-subtitle">Sign in to continue your English learning journey</p>
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
                    placeholder="Enter your password"
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
                      Signing In...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🚀</span>
                      Sign In to Academy
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="card-footer">
              <div className="auth-links">
                <p className="auth-link-text">
                  Don't have an account?{' '}
                  <Link href="/signup" onClick={() => prefetch('/signup')} className="auth-link">
                    Join ESL Academy
                  </Link>
                </p>
                <div className="auth-features">
                  <div className="feature-item">
                    <span className="feature-icon">🤖</span>
                    <span className="feature-text">AI-Powered Learning</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🎯</span>
                    <span className="feature-text">Personalized Progress</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🌟</span>
                    <span className="feature-text">Expert Guidance</span>
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