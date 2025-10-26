'use client';

import React, { useState, useEffect } from 'react';
import { useOptimizedRouter } from '@/hooks/useOptimizedRouter';
import Layout from '@/components/ui/Layout';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

interface UsageData {
  subscriptionTier: string;
  monthlyLimit: number;
  monthlyUsage: number;
  remainingUsage: number;
  lastReset: string;
  nextReset: string;
  usagePercentage: number;
}

interface TierOption {
  name: string;
  limit: string;
  price: string;
  features: string[];
}

export default function UsageDashboard() {
  const router = useOptimizedRouter();
  const [usageData, setUsageData] = useState<UsageData>({
    subscriptionTier: 'Standard',
    monthlyLimit: 0,
    monthlyUsage: 0,
    remainingUsage: 0,
    lastReset: '',
    nextReset: '',
    usagePercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const tierOptions: TierOption[] = [
    {
      name: 'Standard',
      limit: '300',
      price: 'Free',
      features: ['300 minutes/month', 'Basic voice options', 'Standard support']
    },
    {
      name: 'Gold',
      limit: '1000',
      price: '$9.99/month',
      features: ['1000 minutes/month', 'Premium voices', 'Priority support', 'Advanced features']
    },
    {
      name: 'Diamond',
      limit: '3000',
      price: '$19.99/month',
      features: ['3000 minutes/month', 'All premium voices', '24/7 support', 'Custom voice training', 'API access']
    }
  ];

  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/progress');
    loadUsageData();
  }, [router]);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/usage');
      setUsageData(response.data);
    } catch (error) {
      console.error('Error loading usage data:', error);
      // Mock data for demo
      const mockUsage = 180 * 60; // 180 minutes in seconds
      const mockLimit = 300 * 60; // 300 minutes in seconds
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
    router.push(path);
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
      Standard: 'bg-gray-500',
      Gold: 'bg-yellow-500',
      Diamond: 'bg-blue-500'
    };
    return colors[tier as keyof typeof colors] || 'bg-gray-500';
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
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-slate-600 dark:text-slate-300">Loading usage data...</div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => navigateToPage('/dashboard')}
                  className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back to Dashboard</span>
                </Button>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshUsage}
                  disabled={refreshing}
                  className="p-2"
                  title="Refresh Usage Data"
                >
                  <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Usage Dashboard</h1>
                <p className="text-slate-600 dark:text-slate-300">Monitor your TTS usage and subscription benefits</p>
              </div>
            </div>
          </div>

          {/* Usage Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Current Subscription Card */}
            <Card className="hover:shadow-lg transition-all duration-200 lg:col-span-1">
              <CardBody>
                <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Current Subscription</h3>
                    </div>
                    <Badge className={`${getTierColor(usageData.subscriptionTier)} text-white`}>
                      {usageData.subscriptionTier}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                      {formatTime(usageData.monthlyLimit)}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">Monthly Limit</div>
                  </div>
                  <Button
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                  >
                    Upgrade Plan
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Usage Statistics Card */}
            <Card className="hover:shadow-lg transition-all duration-200 lg:col-span-1 xl:col-span-2">
              <CardBody>
                <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Usage Statistics</h3>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Monthly Usage</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{usageData.usagePercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${usageData.usagePercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                      <span>{formatTime(usageData.monthlyUsage)}</span>
                      <span>{formatTime(usageData.monthlyLimit)}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-300">Remaining:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatTime(usageData.remainingUsage)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-300">Last Reset:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatDate(usageData.lastReset)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-300">Next Reset:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatDate(usageData.nextReset)}</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Usage Warning Card */}
            {warning && (
              <Card className={`hover:shadow-lg transition-all duration-200 ${
                warning.type === 'danger' 
                  ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' 
                  : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
              }`}>
                <CardBody>
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        warning.type === 'danger' 
                          ? 'bg-red-100 dark:bg-red-900/30' 
                          : 'bg-yellow-100 dark:bg-yellow-900/30'
                      }`}>
                        <svg className={`w-4 h-4 ${
                          warning.type === 'danger' 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Usage Alert</h3>
                    </div>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{warning.message}</p>
                </CardBody>
              </Card>
            )}

            {/* Quick Actions Card */}
            <Card className="hover:shadow-lg transition-all duration-200 lg:col-span-1 xl:col-span-1">
              <CardBody>
                <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Actions</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  <Button 
                    variant="secondary"
                    onClick={refreshUsage}
                    disabled={refreshing}
                    className="w-full justify-start"
                  >
                    <svg className={`w-4 h-4 mr-3 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Usage
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => navigateToPage('/progress')}
                    className="w-full justify-start"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    View History
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full justify-start"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage Plan
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Upgrade Your Plan</h3>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpgradeModal(false)}
                  className="p-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {tierOptions.map((tier) => (
                    <Card 
                      key={tier.name}
                      className={`transition-all duration-200 ${
                        usageData.subscriptionTier === tier.name 
                          ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                          : 'hover:shadow-lg'
                      }`}
                    >
                      <CardBody>
                        <div className="text-center mb-4">
                          <h4 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{tier.name}</h4>
                          <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">{tier.limit} minutes/month</div>
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tier.price}</div>
                        </div>
                        <div className="space-y-2 mb-6">
                          {tier.features.map((feature, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                              <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                        <Button 
                          onClick={() => selectTier(tier.name)}
                          disabled={usageData.subscriptionTier === tier.name}
                          className={`w-full ${
                            usageData.subscriptionTier === tier.name 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-blue-600 hover:bg-blue-700'
                          } text-white`}
                        >
                          {usageData.subscriptionTier === tier.name ? 'Current Plan' : `Select ${tier.name}`}
                        </Button>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}