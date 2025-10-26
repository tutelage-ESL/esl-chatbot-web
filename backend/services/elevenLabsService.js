const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
const fs = require('fs');
const path = require('path');

class ElevenLabsService {
    constructor() {
        this.client = null;
        this.isInitialized = false;
        this.availableVoices = [];
        this.init();
    }

    // Estimate TTS duration based on text length and speaking rate
    estimateTtsDuration(text) {
        // Average speaking rate: ~150 words per minute
        // Average word length: ~5 characters
        // Add buffer for pauses and processing
        const wordsPerMinute = 150;
        const avgWordLength = 5;
        const estimatedWords = text.length / avgWordLength;
        const estimatedMinutes = estimatedWords / wordsPerMinute;
        const estimatedSeconds = Math.ceil(estimatedMinutes * 60 * 1.2); // 20% buffer
        return Math.max(1, estimatedSeconds); // Minimum 1 second
    }

    async init() {
        try {
            const apiKey = process.env.ELEVENLABS_API_KEY;
            
            if (!apiKey) {
                console.warn('ElevenLabs API key not configured. Voice synthesis will be disabled.');
                return;
            }

            this.client = new ElevenLabsClient({
                apiKey: apiKey
            });

            // Load available voices
            await this.loadVoices();
            this.isInitialized = true;
            console.log('ElevenLabs service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ElevenLabs service:', error.message);
        }
    }

    async loadVoices() {
        try {
            if (!this.client) return;
            
            const voicesResp = await this.client.voices.getAll();
            let voices = voicesResp.voices || [];

            // Fallback: if SDK returns voices without voice_id, query HTTP API directly
            if (voices.length && !voices[0].voice_id) {
                console.warn('ElevenLabs SDK returned voices without voice_id, falling back to HTTP API');
                const apiKey = process.env.ELEVENLABS_API_KEY;
                try {
                    const resp = await fetch('https://api.elevenlabs.io/v1/voices', {
                        headers: { 'xi-api-key': apiKey }
                    });
                    if (resp.ok) {
                        const json = await resp.json();
                        voices = json.voices || voices;
                    } else {
                        console.warn('HTTP voices API failed:', resp.status);
                    }
                } catch (httpErr) {
                    console.warn('HTTP voices API error:', httpErr.message);
                }
            }

            this.availableVoices = voices;
            console.log(`Loaded ${this.availableVoices.length} ElevenLabs voices`);
        } catch (error) {
            console.error('Failed to load voices:', error.message);
        }
    }

    getAvailableVoices() {
        if (!this.availableVoices || this.availableVoices.length === 0) {
            const defId = process.env.ELEVENLABS_DEFAULT_VOICE_ID;
            if (defId) {
                return [{
                    id: defId,
                    name: 'Default Voice',
                    category: 'default',
                    description: 'Configured default ElevenLabs voice (env)',
                    preview_url: null
                }];
            }
            return [];
        }
        return this.availableVoices.map(voice => ({
            id: voice.voice_id || voice.id || null,
            name: voice.name,
            category: voice.category,
            description: voice.description || '',
            preview_url: voice.preview_url || null
        }));
    }

    getBestVoice(language = 'en') {
        if (!this.availableVoices || this.availableVoices.length === 0) {
            return process.env.ELEVENLABS_DEFAULT_VOICE_ID || null;
        }
    
        // Priority order for English voices
        const preferredVoices = [
            'Rachel', 'Adam', 'Domi', 'Fin', 'Sarah', 'Antoni', 'Thomas', 'Charlie', 'Emily', 'Elli', 'Callum', 'Patrick', 'Harry', 'Liam', 'Dorothy', 'Josh', 'Arnold', 'Charlotte', 'Matilda', 'Matthew', 'James', 'Joseph', 'Jeremy', 'Michael', 'Ethan', 'Gigi', 'Freya', 'Grace', 'Daniel', 'Lily'
        ];
    
        for (const preferredName of preferredVoices) {
            const voice = this.availableVoices.find(v => v.name.toLowerCase() === preferredName.toLowerCase());
            if (voice && (voice.voice_id || voice.id)) {
                return voice.voice_id || voice.id;
            }
        }
    
        const first = this.availableVoices[0];
        return first?.voice_id || first?.id || null;
    }

    async textToSpeech(text, options = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('ElevenLabs service not initialized');
            }

            // Check user usage limits if user is provided
            if (options.user) {
                const user = options.user;
                
                // Reset usage if it's a new month
                if (user.shouldResetUsage()) {
                    await user.resetMonthlyUsage();
                }

                // Estimate duration for this request
                const estimatedDuration = this.estimateTtsDuration(text);
                
                // Check if user can use the service
                if (!user.canUseService(estimatedDuration)) {
                    const remaining = user.getRemainingUsage();
                    const tierLimits = user.getTierLimits();
                    throw new Error(`TTS usage limit exceeded. You have ${Math.floor(remaining / 60)} minutes and ${remaining % 60} seconds remaining out of ${Math.floor(tierLimits / 60)} minutes for your ${user.subscriptionTier} tier.`);
                }
            }

            const voiceId = options.voiceId || this.getBestVoice();
            if (!voiceId) {
                throw new Error('No voice available');
            }

            // Use the correct parameter structure according to official SDK documentation
            const requestOptions = {
                text: text,
                modelId: options.modelId || 'eleven_flash_v2_5', // Fast, high-quality model
                outputFormat: options.outputFormat || 'mp3_44100_128', // Widely supported MP3 format
                voiceSettings: {
                    stability: options.stability || 0.5,
                    similarityBoost: options.similarityBoost || 0.8,
                    style: options.style || 0.0,
                    useSpeakerBoost: options.useSpeakerBoost || true
                }
            };
            
            console.log('ElevenLabs TTS request:', {
                voiceId,
                outputFormat: requestOptions.outputFormat,
                modelId: requestOptions.modelId,
                userId: options.user ? options.user.id : 'anonymous'
            });

            const startTime = Date.now();
            const audioStream = await this.client.textToSpeech.convert(voiceId, requestOptions);
            const processingTime = Date.now() - startTime;
            
            console.log('ElevenLabs TTS response:', {
                bufferLength: audioStream.length,
                bufferType: audioStream.constructor.name,
                processingTime: `${processingTime}ms`
            });
            
            // Convert ReadableStream to Buffer
            let audioBuffer;
            if (audioStream instanceof ReadableStream) {
                const reader = audioStream.getReader();
                const chunks = [];
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                
                audioBuffer = Buffer.concat(chunks);
                console.log('Converted stream to buffer:', {
                    bufferLength: audioBuffer.length,
                    bufferType: audioBuffer.constructor.name
                });
            } else {
                audioBuffer = audioStream;
            }

            // Track usage if user is provided
            if (options.user) {
                const actualDuration = this.estimateTtsDuration(text);
                await options.user.addUsage(actualDuration);
                console.log(`Added ${actualDuration} seconds of TTS usage for user ${options.user.id}`);
            }
            
            return audioBuffer;
        } catch (error) {
            console.error('ElevenLabs TTS error:', error.message);
            throw error;
        }
    }

    async textToSpeechStream(text, options = {}) {
        try {
            if (!this.isInitialized || !this.client) {
                throw new Error('ElevenLabs service not initialized');
            }

            const voiceId = options.voiceId || this.getBestVoice();
            if (!voiceId) {
                throw new Error('No voice available');
            }

            const audioStream = await this.client.textToSpeech.stream(voiceId, {
                text: text,
                modelId: options.modelId || 'eleven_flash_v2_5',
                outputFormat: options.outputFormat || 'mp3_44100_128', // Widely supported MP3 format
                voiceSettings: {
                    stability: options.stability || 0.5,
                    similarityBoost: options.similarityBoost || 0.8,
                    style: options.style || 0.0,
                    useSpeakerBoost: options.useSpeakerBoost || true
                }
            });

            return audioStream;
        } catch (error) {
            console.error('ElevenLabs TTS Stream error:', error.message);
            throw error;
        }
    }

    async saveAudioToFile(audioBuffer, filename) {
        try {
            const uploadsDir = path.join(__dirname, '..', 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const filePath = path.join(uploadsDir, filename);
            fs.writeFileSync(filePath, audioBuffer);
            return filePath;
        } catch (error) {
            console.error('Failed to save audio file:', error.message);
            throw error;
        }
    }

    async speechToText(audioBuffer, options = {}) {
        try {
            if (!this.isAvailable()) {
                throw new Error('ElevenLabs service not available');
            }

            console.log('Transcribing audio with ElevenLabs STT API');
            console.log('Options received:', options);
            const modelId = options.model || 'scribe_v1';
            console.log('Model ID to use:', modelId);

            // Use ElevenLabs Speech-to-Text API
            const response = await this.client.speechToText.convert({
                file: audioBuffer,
                modelId: modelId,
                language: options.language || 'en',
                webhook: false,
                use_multi_channel: false
            });

            return {
                text: response.text,
                transcript: response.text,
                confidence: response.confidence || 0.9
            };

        } catch (error) {
            console.error('ElevenLabs STT error:', error);
            throw error;
        }
    }

    isAvailable() {
        return this.isInitialized && this.client !== null;
    }

    getUsageInfo() {
        // This would require additional API calls to get user subscription info
        // For now, return basic info
        return {
            available: this.isAvailable(),
            voiceCount: this.availableVoices.length
        };
    }
}

// Create singleton instance
const elevenLabsService = new ElevenLabsService();

module.exports = elevenLabsService;