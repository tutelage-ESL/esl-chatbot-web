'use client';

import React, { useState, useEffect } from 'react';
import { useTheme, ThemedComponent } from '@/components/ThemeProvider';
import { useOptimizedRouter } from '@/lib/routing';
import api from '@/lib/api';

interface UsageData {
  subscriptionTier: 'Standard' | 'Gold' | 'Diamond';
  monthlyLimit: number; // in seconds
  monthlyUsage: number; // in seconds
  remainingUsage: number; // in seconds
  lastReset: string;
  nextReset: string;
  usagePercentage: number;
}

interface TierOption {
  name: string;
  limit: number; // in minutes
  price: string;
  features: string[];
}

export default function UsageDashboardPage() {
  const router = useOptimizedRouter();
  const [usageData, setUsageData] = useState<UsageData>({
    subscriptionTier: 'Standard',
    monthlyLimit: 1200, // 20 minutes in seconds
    monthlyUsage: 0,
    remainingUsage: 1200,
    lastReset: '',
    nextReset: '',
    usagePercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const tierOptions: TierOption[] = [
    {
      name: 'Standard',
      limit: 20,
      price: 'Free',
      features: ['20 minutes/month', 'Basic TTS quality', 'Standard support']
    },
    {
      name: 'Gold',
      limit: 60,
      price: '$9.99/month',
      features: ['60 minutes/month', 'High-quality TTS', 'Priority support', 'Advanced features']
    },
    {
      name: 'Diamond',
      limit: 120,
      price: '$19.99/month',
      features: ['120 minutes/month', 'Premium TTS quality', '24/7 support', 'All features', 'Custom voices']
    }
  ];

  // Prefetch likely routes
  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/chat');
    router.prefetch('/settings');
  }, [router]);

  useEffect(() => {
    loadUsageData();
    // Refresh usage data every 30 seconds
    const interval = setInterval(loadUsageData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/subscription/status');
      const data = response.data;
      
      setUsageData({
        subscriptionTier: data.subscriptionTier || 'Standard',
        monthlyLimit: data.monthlyLimit || 1200,
        monthlyUsage: data.monthlyUsage || 0,
        remainingUsage: data.remainingUsage || 1200,
        lastReset: data.lastReset || new Date().toISOString(),
        nextReset: data.nextReset || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        usagePercentage: data.usagePercentage || 0
      });
    } catch (error) {
      console.error('Error loading usage data:', error);
      // Set mock data for demo
      const mockUsage = Math.floor(Math.random() * 800); // Random usage up to ~13 minutes
      const mockLimit = 1200; // 20 minutes
      setUsageData({
        subscriptionTier: 'Standard',
        monthlyLimit: mockLimit,
        monthlyUsage: mockUsage,
        remainingUsage: mockLimit - mockUsage,
        lastReset: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        nextReset: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        usagePercentage: Math.round((mockUsage / mockLimit) * 100)
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshUsage = async () => {
    setRefreshing(true);
    await loadUsageData();
    setRefreshing(false);
  };

  const selectTier = async (tier: string) => {
    try {
      await api.post('/api/subscription/upgrade', { tier });
      setShowUpgradeModal(false);
      loadUsageData();
      alert(`Successfully upgraded to ${tier} plan!`);
    } catch (error) {
      console.error('Error upgrading tier:', error);
      alert('Error upgrading plan. Please try again.');
    }
  };

  const navigateToPage = (path: string) => {
    router.navigate(path);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTierColor = (tier: string) => {
    const colors = {
      Standard: '#6c757d',
      Gold: '#ffc107',
      Diamond: '#17a2b8'
    };
    return colors[tier as keyof typeof colors] || '#6c757d';
  };

  const getUsageWarning = () => {
    if (usageData.usagePercentage >= 90) {
      return {
        type: 'danger',
        message: 'You have used 90% of your monthly limit. Consider upgrading your plan.',
        icon: 'fa-exclamation-triangle'
      };
    } else if (usageData.usagePercentage >= 75) {
      return {
        type: 'warning',
        message: 'You have used 75% of your monthly limit. Monitor your usage carefully.',
        icon: 'fa-exclamation-circle'
      };
    }
    return null;
  };

  const warning = getUsageWarning();

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
                <i className="fas fa-chart-pie"></i>
                <span>Usage</span>
              </button>
            </nav>
          </header>
          <main className="app-main">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading usage data...</div>
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
              <i className="fas fa-chart-pie"></i>
              <span>Usage</span>
            </button>
            <button onClick={() => navigateToPage('/settings')} className="btn btn-nav">
              <i className="fas fa-cog"></i>
              <span>Settings</span>
            </button>
          </nav>
        </header>

        <main className="app-main">
          <div className="usage-container">
            <div className="usage-header">
              <h2><i className="fas fa-chart-pie"></i> Usage Dashboard</h2>
              <p className="usage-subtitle">Monitor your TTS usage and subscription benefits</p>
            </div>

            <div className="usage-grid">
              {/* Current Subscription Card */}
              <div className="usage-card subscription-card">
                <div className="card-header">
                  <h3><i className="fas fa-crown"></i> Current Subscription</h3>
                  <div 
                    className="tier-badge"
                    style={{ backgroundColor: getTierColor(usageData.subscriptionTier) }}
                  >
                    {usageData.subscriptionTier}
                  </div>
                </div>
                <div className="subscription-info">
                  <div className="tier-benefits">
                    <div className="benefit-item">
                      <i className="fas fa-clock"></i>
                      <span>{formatTime(usageData.monthlyLimit)}/month</span>
                    </div>
                    <div className="benefit-item">
                      <i className="fas fa-calendar-alt"></i>
                      <span>Monthly reset</span>
                    </div>
                    <div className="benefit-item">
                      <i className="fas fa-microphone"></i>
                      <span>High-quality TTS</span>
                    </div>
                  </div>
                  <div className="upgrade-section">
                    <button 
                      className="btn btn-upgrade"
                      onClick={() => setShowUpgradeModal(true)}
                    >
                      <i className="fas fa-arrow-up"></i> Upgrade Plan
                    </button>
                  </div>
                </div>
              </div>

              {/* Usage Statistics Card */}
              <div className="usage-card stats-card">
                <div className="card-header">
                  <h3><i className="fas fa-chart-bar"></i> This Month's Usage</h3>
                  <div className="usage-percentage">{usageData.usagePercentage}%</div>
                </div>
                <div className="usage-stats">
                  <div className="usage-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${usageData.usagePercentage}%` }}
                      ></div>
                    </div>
                    <div className="usage-labels">
                      <span>{formatTime(usageData.monthlyUsage)}</span>
                      <span>{formatTime(usageData.monthlyLimit)}</span>
                    </div>
                  </div>
                  <div className="usage-details">
                    <div className="detail-item">
                      <span className="detail-label">Remaining:</span>
                      <span className="detail-value">{formatTime(usageData.remainingUsage)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Last Reset:</span>
                      <span className="detail-value">{formatDate(usageData.lastReset)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Next Reset:</span>
                      <span className="detail-value">{formatDate(usageData.nextReset)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Warning Card */}
              {warning && (
                <div className={`usage-card warnings-card ${warning.type}`}>
                  <div className="card-header">
                    <h3><i className={`fas ${warning.icon}`}></i> Usage Alert</h3>
                  </div>
                  <div className="warning-content">
                    <p>{warning.message}</p>
                  </div>
                </div>
              )}

              {/* Quick Actions Card */}
              <div className="usage-card actions-card">
                <div className="card-header">
                  <h3><i className="fas fa-bolt"></i> Quick Actions</h3>
                </div>
                <div className="action-buttons">
                  <button 
                    className="action-btn"
                    onClick={refreshUsage}
                    disabled={refreshing}
                  >
                    <i className={`fas fa-sync-alt ${refreshing ? 'fa-spin' : ''}`}></i>
                    <span>Refresh Usage</span>
                  </button>
                  <button 
                    className="action-btn"
                    onClick={() => navigateToPage('/progress')}
                  >
                    <i className="fas fa-history"></i>
                    <span>View History</span>
                  </button>
                  <button 
                    className="action-btn"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <i className="fas fa-cog"></i>
                    <span>Manage Plan</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upgrade Your Plan</h3>
              <button 
                className="modal-close"
                onClick={() => setShowUpgradeModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="tier-options">
                {tierOptions.map((tier) => (
                  <div 
                    key={tier.name}
                    className={`tier-option ${usageData.subscriptionTier === tier.name ? 'current' : ''}`}
                  >
                    <div className="tier-name">{tier.name}</div>
                    <div className="tier-limit">{tier.limit} minutes/month</div>
                    <div className="tier-price">{tier.price}</div>
                    <div className="tier-features">
                      {tier.features.map((feature, index) => (
                        <div key={index} className="feature-item">
                          <i className="fas fa-check"></i>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <button 
                      className={`btn ${usageData.subscriptionTier === tier.name ? 'btn-current' : 'btn-select'}`}
                      onClick={() => selectTier(tier.name)}
                      disabled={usageData.subscriptionTier === tier.name}
                    >
                      {usageData.subscriptionTier === tier.name ? 'Current Plan' : `Select ${tier.name}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </ThemedComponent>
  );
}