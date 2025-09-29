/**
 * Smart TTS Service
 * Automatically switches between ElevenLabs and enhanced free TTS based on usage limits
 */

import api from './api';
import { enhancedTTS } from './enhancedTTS';

interface TTSResponse {
  success: boolean;
  usedElevenLabs: boolean;
  error?: string;
  remainingUsage?: number;
}

interface UsageStatus {
  remainingUsage: number;
  usagePercentage: number;
  limitExceeded: boolean;
  nearLimit: boolean;
}

class SmartTTSService {
  private usageStatus: UsageStatus | null = null;
  private lastUsageCheck = 0;
  private usageCheckInterval = 30000; // 30 seconds
  private isCheckingUsage = false;

  constructor() {
    this.loadUsageStatus();
  }

  private async loadUsageStatus(): Promise<UsageStatus> {
    const now = Date.now();
    
    // Use cached status if recent
    if (this.usageStatus && (now - this.lastUsageCheck) < this.usageCheckInterval) {
      return this.usageStatus;
    }

    // Prevent multiple concurrent checks
    if (this.isCheckingUsage) {
      return this.usageStatus || this.getDefaultUsageStatus();
    }

    this.isCheckingUsage = true;

    try {
      const response = await api.get('/api/subscription/status');
      
      if (response.data) {
        this.usageStatus = {
          remainingUsage: response.data.remainingUsage || 0,
          usagePercentage: response.data.usagePercentage || 100,
          limitExceeded: response.data.remainingUsage <= 0,
          nearLimit: response.data.nearLimit || response.data.usagePercentage >= 80
        };
        this.lastUsageCheck = now;
      } else {
        this.usageStatus = this.getDefaultUsageStatus();
      }
    } catch (error) {
      console.warn('Failed to load usage status, assuming limit exceeded:', error);
      this.usageStatus = this.getDefaultUsageStatus();
    } finally {
      this.isCheckingUsage = false;
    }

    return this.usageStatus;
  }

  private getDefaultUsageStatus(): UsageStatus {
    return {
      remainingUsage: 0,
      usagePercentage: 100,
      limitExceeded: true,
      nearLimit: true
    };
  }

  private estimateTextDuration(text: string): number {
    // Estimate speech duration (similar to backend logic)
    const wordsPerMinute = 150;
    const avgWordLength = 5;
    const estimatedWords = text.length / avgWordLength;
    const estimatedMinutes = estimatedWords / wordsPerMinute;
    return Math.ceil(estimatedMinutes * 60 * 1.2); // 20% buffer
  }

  private async canUseElevenLabs(text: string): Promise<boolean> {
    const usage = await this.loadUsageStatus();
    
    if (usage.limitExceeded) {
      return false;
    }

    const estimatedDuration = this.estimateTextDuration(text);
    return usage.remainingUsage >= estimatedDuration;
  }

  private async tryElevenLabsTTS(text: string): Promise<TTSResponse> {
    try {
      const response = await api.post('/api/text-to-speech', { text }, {
        responseType: 'arraybuffer'
      });
      
      if (response.data) {
        // Create and play audio
        const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        return new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            // Refresh usage status after successful TTS
            this.refreshUsageStatus();
            resolve({
              success: true,
              usedElevenLabs: true
            });
          };
          
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            resolve({
              success: false,
              usedElevenLabs: false,
              error: 'Audio playback failed'
            });
          };
          
          audio.play().catch(() => {
            URL.revokeObjectURL(audioUrl);
            resolve({
              success: false,
              usedElevenLabs: false,
              error: 'Audio play failed'
            });
          });
        });
      }
      
      return {
        success: false,
        usedElevenLabs: false,
        error: 'No audio data received'
      };
      
    } catch (error: any) {
      // Check if it's a usage limit error
      if (error.response?.status === 429 || 
          error.response?.data?.limitExceeded ||
          error.message?.includes('usage limit')) {
        
        // Update usage status to reflect limit exceeded
        this.usageStatus = {
          remainingUsage: 0,
          usagePercentage: 100,
          limitExceeded: true,
          nearLimit: true
        };
        
        return {
          success: false,
          usedElevenLabs: false,
          error: 'Usage limit exceeded'
        };
      }
      
      return {
        success: false,
        usedElevenLabs: false,
        error: error.message || 'ElevenLabs TTS failed'
      };
    }
  }

  private async useEnhancedFreeTTS(text: string): Promise<TTSResponse> {
    try {
      await enhancedTTS.speakWithFallback(text, {
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
        voicePreference: 'neutral'
      });
      
      return {
        success: true,
        usedElevenLabs: false
      };
    } catch (error: any) {
      return {
        success: false,
        usedElevenLabs: false,
        error: error.message || 'Free TTS failed'
      };
    }
  }

  private refreshUsageStatus(): void {
    // Force refresh on next check
    this.lastUsageCheck = 0;
    this.usageStatus = null;
  }

  async speak(text: string, forceFreeTTS = false): Promise<TTSResponse> {
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        usedElevenLabs: false,
        error: 'No text provided'
      };
    }

    // If forced to use free TTS or if we know ElevenLabs is unavailable
    if (forceFreeTTS) {
      console.log('Using enhanced free TTS (forced)');
      return this.useEnhancedFreeTTS(text);
    }

    // Check if we can use ElevenLabs
    const canUseElevenLabs = await this.canUseElevenLabs(text);
    
    if (canUseElevenLabs) {
      console.log('Attempting ElevenLabs TTS...');
      const elevenLabsResult = await this.tryElevenLabsTTS(text);
      
      if (elevenLabsResult.success) {
        return elevenLabsResult;
      }
      
      // ElevenLabs failed, fall back to enhanced free TTS
      console.log('ElevenLabs failed, falling back to enhanced free TTS:', elevenLabsResult.error);
    } else {
      console.log('ElevenLabs usage limit reached, using enhanced free TTS');
    }

    // Use enhanced free TTS
    return this.useEnhancedFreeTTS(text);
  }

  async getUsageStatus(): Promise<UsageStatus> {
    return this.loadUsageStatus();
  }

  async refreshUsage(): Promise<UsageStatus> {
    this.refreshUsageStatus();
    return this.loadUsageStatus();
  }

  stop(): void {
    enhancedTTS.stop();
  }

  isEnhancedTTSReady(): boolean {
    return enhancedTTS.isReady();
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return enhancedTTS.getAvailableVoices();
  }

  getBestVoices(): Map<string, SpeechSynthesisVoice> {
    return enhancedTTS.getBestVoices();
  }
}

// Export singleton instance
export const smartTTS = new SmartTTSService();
export default smartTTS;