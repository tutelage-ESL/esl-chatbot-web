'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useOptimizedRouter } from '@/lib/routing';

type Theme = 'classic' | 'enhanced';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'enhanced' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);
  const { prefetch } = useOptimizedRouter();

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('esl-theme') as Theme;
    if (savedTheme && (savedTheme === 'classic' || savedTheme === 'enhanced')) {
      setThemeState(savedTheme);
    }
    setIsLoading(false);
  }, []);

  // Preload theme CSS files for instant switching
  useEffect(() => {
    const preloadCSS = (href: string) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      document.head.appendChild(link);
    };

    // Preload both theme CSS files
    preloadCSS('/styles/classic-theme.css');
    preloadCSS('/styles/enhanced-theme.css');

    // Prefetch common routes for better performance
    prefetch('/dashboard');
    prefetch('/chat');
  }, [prefetch]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('esl-theme', newTheme);
    
    // Remove existing theme classes
    document.body.className = document.body.className.replace(/\b(classic|enhanced)-theme\b/g, '');
    document.body.classList.add(`${newTheme}-theme`);
    
    // Load the corresponding CSS file
    loadThemeCSS(newTheme);
    
    // Performance: Force repaint for smooth transition
    document.body.offsetHeight;
  };

  // Function to dynamically load theme CSS
  const loadThemeCSS = (themeName: Theme) => {
    // Remove existing theme stylesheets
    const existingLinks = document.querySelectorAll('link[data-theme]');
    existingLinks.forEach(link => link.remove());
    
    // Add new theme stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/styles/${themeName}-theme.css`;
    link.setAttribute('data-theme', themeName);
    document.head.appendChild(link);
  };

  // Apply initial theme class and load CSS
  useEffect(() => {
    if (!isLoading) {
      document.body.classList.add(`${theme}-theme`);
      loadThemeCSS(theme);
    }
  }, [theme, isLoading]);

  const value: ThemeContextType = {
    theme,
    setTheme,
    isLoading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme-aware component wrapper
interface ThemedComponentProps {
  children: ReactNode;
  className?: string;
}

export function ThemedComponent({ children, className = '' }: ThemedComponentProps) {
  const { theme, isLoading } = useTheme();
  
  if (isLoading) {
    return (
      <div className="loading-skeleton">
        <div className="animate-pulse bg-gray-200 rounded h-4 w-3/4 mb-2"></div>
        <div className="animate-pulse bg-gray-200 rounded h-4 w-1/2"></div>
      </div>
    );
  }

  const themeClass = theme === 'classic' ? 'classic-theme' : 'enhanced-theme';
  
  return (
    <div className={`${themeClass} ${className}`}>
      {children}
    </div>
  );
}

// Performance monitoring hook for theme switching
export function useThemePerformance() {
  const { theme } = useTheme();
  
  useEffect(() => {
    const startTime = performance.now();
    
    const measureThemeSwitch = () => {
      const endTime = performance.now();
      const switchTime = endTime - startTime;
      
      console.log(`Theme switch to ${theme} completed in ${switchTime.toFixed(2)}ms`);
      
      // Report to analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'theme_switch', {
          theme_name: theme,
          switch_duration: switchTime
        });
      }
    };

    // Use requestAnimationFrame to measure after paint
    requestAnimationFrame(measureThemeSwitch);
  }, [theme]);
}