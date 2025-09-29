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

interface NavigationItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}

const navigationItems: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-home' },
  { href: '/chat', label: 'AI Tutor', icon: 'fas fa-comments' },
  { href: '/voice', label: 'Voice Practice', icon: 'fas fa-microphone' },
  { href: '/vocabulary', label: 'Vocabulary', icon: 'fas fa-book-open' },
  { href: '/goals', label: 'Goals', icon: 'fas fa-target' },
  { href: '/progress', label: 'Progress', icon: 'fas fa-chart-line' },
  { href: '/usage-dashboard', label: 'Usage', icon: 'fas fa-chart-pie', badge: 'Pro' }
];

export default function ModernNavigation() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    checkAuthStatus();
    
    // Handle scroll effect
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActivePath = (path: string) => pathname === path;

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'premium': return 'text-yellow-400';
      case 'pro': return 'text-purple-400';
      default: return 'text-blue-400';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'premium': return 'fas fa-crown';
      case 'pro': return 'fas fa-star';
      default: return 'fas fa-user';
    }
  };

  if (isLoading) {
    return (
      <nav className={`modern-nav loading ${isScrolled ? 'scrolled' : ''}`}>
        <div className="modern-nav-container">
          <div className="modern-nav-brand">
            <div className="brand-logo">
              <div className="logo-icon">E</div>
            </div>
            <span className="brand-text">ESL Academy</span>
          </div>
          <div className="loading-spinner-nav"></div>
        </div>
      </nav>
    );
  }

  if (!user) {
    return (
      <nav className={`modern-nav guest ${isScrolled ? 'scrolled' : ''}`}>
        <div className="modern-nav-container">
          <Link href="/" className="modern-nav-brand">
            <div className="brand-logo">
              <div className="logo-icon">E</div>
            </div>
            <span className="brand-text">ESL Academy</span>
          </Link>
          
          <div className="nav-actions">
            <Link href="/login" className="nav-action-btn login-btn">
              <i className="fas fa-sign-in-alt"></i>
              <span>Sign In</span>
            </Link>
            <Link href="/signup" className="nav-action-btn signup-btn">
              <i className="fas fa-user-plus"></i>
              <span>Join Now</span>
            </Link>
            <button 
              onClick={toggleTheme}
              className="theme-toggle-btn"
              aria-label="Toggle theme"
            >
              <i className={`fas ${theme === 'enhanced' ? 'fa-moon' : 'fa-sun'}`}></i>
            </button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={`modern-nav authenticated ${isScrolled ? 'scrolled' : ''}`}>
      <div className="modern-nav-container">
        {/* Brand Section */}
        <Link href="/dashboard" className="modern-nav-brand">
          <div className="brand-logo">
            <div className="logo-icon">E</div>
            <div className="logo-pulse"></div>
          </div>
          <div className="brand-content">
            <span className="brand-text">ESL Academy</span>
            <span className="brand-tagline">Learn • Practice • Excel</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="desktop-nav">
          <ul className="nav-menu">
            {navigationItems.map((item) => (
              <li key={item.href} className="nav-item">
                <Link
                  href={item.href}
                  className={`nav-link ${isActivePath(item.href) ? 'active' : ''}`}
                >
                  <div className="nav-link-content">
                    <i className={item.icon}></i>
                    <span className="nav-text">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </div>
                  <div className="nav-link-indicator"></div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* User Section */}
        <div className="user-section">
          <div className="user-info">
            <div className="user-avatar">
              <i className={getTierIcon(user.subscriptionTier)}></i>
            </div>
            <div className="user-details">
              <span className="user-name">{user.username}</span>
              <span className={`user-tier ${getTierColor(user.subscriptionTier)}`}>
                {user.subscriptionTier}
              </span>
            </div>
          </div>
          
          <div className="nav-controls">
            <button 
              onClick={toggleTheme}
              className="control-btn theme-btn"
              aria-label="Toggle theme"
            >
              <i className={`fas ${theme === 'enhanced' ? 'fa-moon' : 'fa-sun'}`}></i>
            </button>
            
            <button 
              onClick={handleLogout}
              className="control-btn logout-btn"
              aria-label="Sign out"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className={`mobile-menu-btn ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
      </div>

      {/* Mobile Navigation Overlay */}
      <div className={`mobile-nav-overlay ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-nav-content">
          <div className="mobile-user-section">
            <div className="mobile-user-info">
              <div className="mobile-user-avatar">
                <i className={getTierIcon(user.subscriptionTier)}></i>
              </div>
              <div className="mobile-user-details">
                <span className="mobile-user-name">{user.username}</span>
                <span className={`mobile-user-tier ${getTierColor(user.subscriptionTier)}`}>
                  {user.subscriptionTier} Member
                </span>
              </div>
            </div>
          </div>

          <ul className="mobile-nav-menu">
            {navigationItems.map((item) => (
              <li key={item.href} className="mobile-nav-item">
                <Link
                  href={item.href}
                  className={`mobile-nav-link ${isActivePath(item.href) ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="mobile-nav-link-content">
                    <i className={item.icon}></i>
                    <span className="mobile-nav-text">{item.label}</span>
                    {item.badge && (
                      <span className="mobile-nav-badge">{item.badge}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mobile-nav-actions">
            <button 
              onClick={toggleTheme}
              className="mobile-action-btn"
            >
              <i className={`fas ${theme === 'enhanced' ? 'fa-moon' : 'fa-sun'}`}></i>
              <span>{theme === 'enhanced' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
            
            <button 
              onClick={handleLogout}
              className="mobile-action-btn logout"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}