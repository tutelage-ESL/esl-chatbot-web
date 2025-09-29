/**
 * Enhanced Text-to-Speech Service
 * Provides high-quality free TTS with optimized voice selection and audio processing
 */

interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voicePreference?: 'male' | 'female' | 'neutral';
  language?: string;
}

interface VoiceQuality {
  voice: SpeechSynthesisVoice;
  score: number;
  naturalness: number;
  clarity: number;
}

class EnhancedTTSService {
  private voices: SpeechSynthesisVoice[] = [];
  private bestVoices: Map<string, SpeechSynthesisVoice> = new Map();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve) => {
      const loadVoices = () => {
        this.voices = speechSynthesis.getVoices();
        if (this.voices.length > 0) {
          this.analyzeAndRankVoices();
          this.isInitialized = true;
          resolve();
        } else {
          // Voices not loaded yet, wait for the event
          speechSynthesis.addEventListener('voiceschanged', () => {
            this.voices = speechSynthesis.getVoices();
            this.analyzeAndRankVoices();
            this.isInitialized = true;
            resolve();
          }, { once: true });
        }
      };

      if (speechSynthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
      }
    });
  }

  private analyzeAndRankVoices(): void {
    const voiceQualities: VoiceQuality[] = this.voices.map(voice => ({
      voice,
      score: this.calculateVoiceScore(voice),
      naturalness: this.assessNaturalness(voice),
      clarity: this.assessClarity(voice)
    }));

    // Sort by overall score
    voiceQualities.sort((a, b) => b.score - a.score);

    // Cache best voices by category
    const englishVoices = voiceQualities.filter(vq => 
      vq.voice.lang.startsWith('en') && vq.voice.localService === false
    );

    if (englishVoices.length > 0) {
      this.bestVoices.set('en-default', englishVoices[0].voice);
      
      // Find best male and female voices
      const maleVoice = englishVoices.find(vq => 
        this.isMaleVoice(vq.voice.name)
      )?.voice;
      const femaleVoice = englishVoices.find(vq => 
        this.isFemaleVoice(vq.voice.name)
      )?.voice;

      if (maleVoice) this.bestVoices.set('en-male', maleVoice);
      if (femaleVoice) this.bestVoices.set('en-female', femaleVoice);
    }
  }

  private calculateVoiceScore(voice: SpeechSynthesisVoice): number {
    let score = 0;

    // Prefer cloud-based voices (higher quality)
    if (!voice.localService) score += 50;

    // Prefer Google voices (generally higher quality)
    if (voice.name.toLowerCase().includes('google')) score += 30;

    // Prefer neural/enhanced voices
    if (voice.name.toLowerCase().includes('neural') || 
        voice.name.toLowerCase().includes('enhanced') ||
        voice.name.toLowerCase().includes('premium')) {
      score += 25;
    }

    // Language preference (English)
    if (voice.lang.startsWith('en-US')) score += 20;
    else if (voice.lang.startsWith('en')) score += 15;

    // Voice name quality indicators
    const qualityIndicators = ['wavenet', 'studio', 'journey', 'news', 'standard'];
    for (const indicator of qualityIndicators) {
      if (voice.name.toLowerCase().includes(indicator)) {
        score += 10;
        break;
      }
    }

    return score;
  }

  private assessNaturalness(voice: SpeechSynthesisVoice): number {
    let naturalness = 50; // Base score

    // Cloud voices are generally more natural
    if (!voice.localService) naturalness += 30;

    // Google and Microsoft voices tend to be more natural
    if (voice.name.toLowerCase().includes('google') || 
        voice.name.toLowerCase().includes('microsoft')) {
      naturalness += 20;
    }

    // Neural voices are more natural
    if (voice.name.toLowerCase().includes('neural')) naturalness += 25;

    return Math.min(100, naturalness);
  }

  private assessClarity(voice: SpeechSynthesisVoice): number {
    let clarity = 50; // Base score

    // News and standard voices tend to be clearer
    if (voice.name.toLowerCase().includes('news') || 
        voice.name.toLowerCase().includes('standard')) {
      clarity += 20;
    }

    // Cloud voices generally have better clarity
    if (!voice.localService) clarity += 25;

    return Math.min(100, clarity);
  }

  private isMaleVoice(voiceName: string): boolean {
    const maleIndicators = ['male', 'man', 'david', 'mark', 'ryan', 'brian', 'justin', 'matthew'];
    return maleIndicators.some(indicator => 
      voiceName.toLowerCase().includes(indicator)
    );
  }

  private isFemaleVoice(voiceName: string): boolean {
    const femaleIndicators = ['female', 'woman', 'zira', 'hazel', 'aria', 'jenny', 'michelle', 'linda'];
    return femaleIndicators.some(indicator => 
      voiceName.toLowerCase().includes(indicator)
    );
  }

  private selectOptimalVoice(options: TTSOptions = {}): SpeechSynthesisVoice | null {
    const { voicePreference = 'neutral', language = 'en' } = options;

    // Try to get cached best voice
    let voiceKey = `${language}-${voicePreference}`;
    if (voicePreference === 'neutral') voiceKey = `${language}-default`;

    let selectedVoice = this.bestVoices.get(voiceKey);

    if (!selectedVoice) {
      // Fallback to any good English voice
      selectedVoice = this.bestVoices.get('en-default');
    }

    if (!selectedVoice && this.voices.length > 0) {
      // Last resort: pick the first available voice
      selectedVoice = this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
    }

    return selectedVoice || null;
  }

  private preprocessText(text: string): string {
    // Clean and optimize text for better speech synthesis
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Add pauses for better pacing
      .replace(/([.!?])\s+/g, '$1 ')
      // Handle abbreviations
      .replace(/\bDr\./g, 'Doctor')
      .replace(/\bMr\./g, 'Mister')
      .replace(/\bMrs\./g, 'Missus')
      .replace(/\bMs\./g, 'Miss')
      // Handle common contractions for better pronunciation
      .replace(/won't/g, 'will not')
      .replace(/can't/g, 'cannot')
      .replace(/n't/g, ' not')
      // Add slight pauses for commas
      .replace(/,/g, ', ');
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    // Ensure initialization is complete
    if (!this.isInitialized) {
      await this.initPromise;
    }

    return new Promise((resolve, reject) => {
      try {
        // Cancel any ongoing speech
        speechSynthesis.cancel();

        const processedText = this.preprocessText(text);
        const utterance = new SpeechSynthesisUtterance(processedText);

        // Select optimal voice
        const selectedVoice = this.selectOptimalVoice(options);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        // Configure speech parameters for quality
        utterance.rate = options.rate || 0.9; // Slightly slower for clarity
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;

        // Add event listeners
        utterance.onend = () => resolve();
        utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

        // Start speaking
        speechSynthesis.speak(utterance);

      } catch (error) {
        reject(error);
      }
    });
  }

  async speakWithFallback(text: string, options: TTSOptions = {}): Promise<void> {
    try {
      await this.speak(text, options);
    } catch (error) {
      console.warn('Enhanced TTS failed, trying basic fallback:', error);
      
      // Basic fallback
      return new Promise((resolve, reject) => {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        utterance.onend = () => resolve();
        utterance.onerror = (event) => reject(new Error(`Fallback TTS error: ${event.error}`));
        speechSynthesis.speak(utterance);
      });
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  getBestVoices(): Map<string, SpeechSynthesisVoice> {
    return this.bestVoices;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  stop(): void {
    speechSynthesis.cancel();
  }
}

// Export singleton instance
export const enhancedTTS = new EnhancedTTSService();
export default enhancedTTS;