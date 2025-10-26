'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useOptimizedRouter } from '@/lib/routing';

type Theme = 'light' | 'dark';

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

export function ThemeProvider({ children, defaultTheme = 'light' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);
  const { prefetch } = useOptimizedRouter();

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('esl-theme') as Theme;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setThemeState(savedTheme);
    }
    setIsLoading(false);
  }, []);

  // Prefetch common routes for better performance
  useEffect(() => {
    prefetch('/dashboard');
    prefetch('/chat');
  }, [prefetch]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('esl-theme', newTheme);
    
    // Apply dark mode class to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Apply initial theme
  useEffect(() => {
    if (!isLoading) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
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
  const { isLoading } = useTheme();
  
  if (isLoading) {
    return (
      <div className="loading-skeleton">
        <div className="animate-pulse bg-gray-200 rounded h-4 w-3/4 mb-2"></div>
        <div className="animate-pulse bg-gray-200 rounded h-4 w-1/2"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      {children}
    </div>
  );
}