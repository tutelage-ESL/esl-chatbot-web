'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import api from '@/lib/api';

interface User {
  username: string;
  subscriptionTier: string;
}

export default function Navigation() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/api/auth/status');
      if (response.data.authenticated) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'enhanced' ? 'classic' : 'enhanced');
  };

  const isActivePath = (path: string) => pathname === path;

  if (isLoading) {
    return (
      <header className="navigation-header">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="nav-logo">E</div>
            <span className="nav-title">ESL Academy</span>
          </div>
          <div className="loading-spinner"></div>
        </div>
      </header>
    );
  }

  if (!user) {
    return (
      <header className="navigation-header">
        <div className="nav-container">
          <Link href="/" className="nav-brand">
            <div className="nav-logo">E</div>
            <span className="nav-title">ESL Academy</span>
          </Link>
          <nav className="nav-links">
            <Link 
              href="/login" 
              className={`nav-link ${isActivePath('/login') ? 'active' : ''}`}
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="btn btn-primary"
            >
              Join Now
            </Link>
            <button 
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle theme"
            >
              {theme === 'enhanced' ? '🌙' : '☀️'}
            </button>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="navigation-header">
      <div className="nav-container">
        <Link href="/dashboard" className="nav-brand">
          <div className="nav-logo">E</div>
          <span className="nav-title">ESL Academy</span>
        </Link>
        
        <nav className="nav-links">
          <Link
            href="/dashboard"
            className={`nav-link ${isActivePath('/dashboard') ? 'active' : ''}`}
          >
            📊 Dashboard
          </Link>
          <Link
            href="/chat"
            className={`nav-link ${isActivePath('/chat') ? 'active' : ''}`}
          >
            💬 Chat
          </Link>
          <Link
            href="/voice"
            className={`nav-link ${isActivePath('/voice') ? 'active' : ''}`}
          >
            🎤 Voice
          </Link>
          <Link
            href="/vocabulary"
            className={`nav-link ${isActivePath('/vocabulary') ? 'active' : ''}`}
          >
            📚 Vocabulary
          </Link>
          <Link
            href="/goals"
            className={`nav-link ${isActivePath('/goals') ? 'active' : ''}`}
          >
            🎯 Goals
          </Link>
          <Link
            href="/progress"
            className={`nav-link ${isActivePath('/progress') ? 'active' : ''}`}
          >
            📈 Progress
          </Link>
          
          <div className="user-menu">
            <span className="user-greeting">
              Hello, {user.username}
            </span>
            <button 
              onClick={handleLogout}
              className="btn btn-secondary"
            >
              Sign Out
            </button>
            <button 
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle theme"
            >
              {theme === 'enhanced' ? '🌙' : '☀️'}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}