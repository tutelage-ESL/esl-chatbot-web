'use client';

import React, { useState, useEffect } from 'react';
import { smartTTS } from '@/lib/smartTTS';

interface TTSStatusProps {
  className?: string;
  showDetails?: boolean;
}

interface UsageStatus {
  remainingUsage: number;
  usagePercentage: number;
  limitExceeded: boolean;
  nearLimit: boolean;
}

export default function TTSStatusIndicator({ className = '', showDetails = false }: TTSStatusProps) {
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastService, setLastService] = useState<'elevenlabs' | 'free' | null>(null);

  useEffect(() => {
    loadUsageStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadUsageStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUsageStatus = async () => {
    try {
      const status = await smartTTS.getUsageStatus();
      setUsageStatus(status);
    } catch (error) {
      console.error('Failed to load TTS usage status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getStatusIcon = (): string => {
    if (isLoading) return 'fa-spinner fa-spin';
    if (!usageStatus) return 'fa-exclamation-triangle';
    if (usageStatus.limitExceeded) return 'fa-volume-up';
    if (usageStatus.nearLimit) return 'fa-exclamation-circle';
    return 'fa-microphone';
  };

  const getStatusColor = (): string => {
    if (isLoading) return 'text-gray-500';
    if (!usageStatus) return 'text-red-500';
    if (usageStatus.limitExceeded) return 'text-blue-500';
    if (usageStatus.nearLimit) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusText = (): string => {
    if (isLoading) return 'Loading...';
    if (!usageStatus) return 'Error';
    if (usageStatus.limitExceeded) return 'Free TTS Active';
    if (usageStatus.nearLimit) return 'ElevenLabs (Low)';
    return 'ElevenLabs Active';
  };

  const getTooltipText = (): string => {
    if (isLoading) return 'Loading TTS status...';
    if (!usageStatus) return 'Unable to load TTS status';
    
    if (usageStatus.limitExceeded) {
      return 'ElevenLabs quota exhausted. Using high-quality free TTS automatically.';
    }
    
    if (usageStatus.nearLimit) {
      return `ElevenLabs usage: ${usageStatus.usagePercentage}% used. Will switch to free TTS when exhausted.`;
    }
    
    return `ElevenLabs available. ${formatTime(usageStatus.remainingUsage)} remaining this month.`;
  };

  return (
    <div className={`tts-status-indicator ${className}`} title={getTooltipText()}>
      <div className="flex items-center space-x-2">
        <i className={`fas ${getStatusIcon()} ${getStatusColor()}`}></i>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        
        {showDetails && usageStatus && !usageStatus.limitExceeded && (
          <span className="text-xs text-gray-600">
            ({formatTime(usageStatus.remainingUsage)} left)
          </span>
        )}
      </div>
      
      {showDetails && usageStatus && (
        <div className="mt-2 text-xs text-gray-600">
          <div className="flex justify-between items-center">
            <span>Monthly Usage:</span>
            <span>{usageStatus.usagePercentage}%</span>
          </div>
          
          {!usageStatus.limitExceeded && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  usageStatus.nearLimit ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${usageStatus.usagePercentage}%` }}
              ></div>
            </div>
          )}
          
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
            {usageStatus.limitExceeded ? (
              <div className="text-blue-600">
                <i className="fas fa-info-circle mr-1"></i>
                Now using enhanced free TTS with optimized voice selection and natural speech patterns.
              </div>
            ) : (
              <div className="text-gray-600">
                <i className="fas fa-magic mr-1"></i>
                Automatic switching ensures uninterrupted high-quality speech.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}