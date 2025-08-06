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
            
            const voices = await this.client.voices.getAll();
            this.availableVoices = voices.voices || [];
            console.log(`Loaded ${this.availableVoices.length} ElevenLabs voices`);
        } catch (error) {
            console.error('Failed to load voices:', error.message);
        }
    }

    getAvailableVoices() {
        return this.availableVoices.map(voice => ({
            id: voice.voiceId,
            name: voice.name,
            category: voice.category,
            description: voice.description || '',
            preview_url: voice.previewUrl || null
        }));
    }

    getBestVoice(language = 'en') {
        if (!this.availableVoices.length) return null;

        // Priority order for English voices
        const preferredVoices = [
            'Rachel', 'Adam', 'Domi', 'Fin', 'Sarah', 'Antoni', 'Thomas', 'Charlie', 'Emily', 'Elli', 'Callum', 'Patrick', 'Harry', 'Liam', 'Dorothy', 'Josh', 'Arnold', 'Charlotte', 'Matilda', 'Matthew', 'James', 'Joseph', 'Jeremy', 'Michael', 'Ethan', 'Gigi', 'Freya', 'Grace', 'Daniel', 'Lily', 'Serena', 'Adam', 'Nicole', 'Jessie', 'Ryan', 'Sam', 'Glinda', 'Giovanni', 'Mimi'
        ];

        // Find the first available preferred voice
        for (const preferredName of preferredVoices) {
            const voice = this.availableVoices.find(v => 
                v.name.toLowerCase() === preferredName.toLowerCase()
            );
            if (voice) {
                return voice.voiceId;
            }
        }

        // Fallback to first available voice
        return this.availableVoices[0]?.voiceId || null;
    }

    async textToSpeech(text, options = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('ElevenLabs service not initialized');
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
                modelId: requestOptions.modelId
            });
            
            const audioStream = await this.client.textToSpeech.convert(voiceId, requestOptions);
            
            console.log('ElevenLabs TTS response:', {
                bufferLength: audioStream.length,
                bufferType: audioStream.constructor.name
            });
            
            // Convert ReadableStream to Buffer
            if (audioStream instanceof ReadableStream) {
                const reader = audioStream.getReader();
                const chunks = [];
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                
                const audioBuffer = Buffer.concat(chunks);
                console.log('Converted stream to buffer:', {
                    bufferLength: audioBuffer.length,
                    bufferType: audioBuffer.constructor.name
                });
                
                return audioBuffer;
            }
            
            return audioStream;
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