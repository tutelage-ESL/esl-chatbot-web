const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { HfInference } = require('@huggingface/inference');
const elevenLabsService = require('../services/elevenLabsService');

// Initialize Google Generative AI (assuming genAI is globally available or passed)
// For now, we'll assume it's initialized elsewhere or handle it here if needed.
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Chat endpoint with Gemini AI
router.post('/chat', async (req, res) => {
  // Check if user is authenticated
  if (!req.session.userId) {
    console.log('Unauthorized access to /api/chat');
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    console.log('Received chat request with message:', req.body.message);
    const { message } = req.body;
    
    if (!message) {
      console.log('No message provided');
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!global.genAI) {
      console.log('genAI not initialized, echoing message');
      return res.json({ response: `Echo: ${message}` });
    }

    console.log('Initializing model');
    const model = global.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const prompt = `You are an ESL (English as Second Language) tutor. Help the student with their English learning. Student says: "${message}". Provide a helpful, encouraging response.`;
    
    console.log('Generating content with prompt:', prompt);
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    console.log('Generated response:', response);
    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Progress endpoints
router.get('/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const progress = await models.Progress.findOne({ where: { userId } });
    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }
    return res.json(progress);
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.post('/progress', async (req, res) => {
  try {
    const { user_id, progress } = req.body;
    
    if (!user_id || progress === undefined) {
      return res.status(400).json({ error: 'user_id and progress are required' });
    }
    const [updatedProgress, created] = await models.Progress.upsert({
      userId: user_id,
      progress
    });
    return res.json(updatedProgress);
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Settings endpoints
router.get('/settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = await models.Settings.findOne({ where: { userId } });
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    return res.json(settings);
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { user_id, language, voiceSpeed, autoSpeak } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const [updatedSettings, created] = await models.Settings.upsert({
      userId: user_id,
      language,
      voiceSpeed,
      autoSpeak
    });
    return res.json(updatedSettings);
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// File upload endpoint
const upload = multer({ dest: 'uploads/' });
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ filename: req.file.filename, originalName: req.file.originalname });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      gemini: !!global.genAI
    }
  });
});

router.post('/voice-message', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'No message provided.' });
        }

        const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN, { provider: 'hf-inference' });
        const modelName = 'HuggingFaceH4/zephyr-7b-beta'; // A suitable free model

        const response = await hf.textGeneration({
            model: modelName,
            inputs: message,
        });
        const botResponse = response.generated_text;

        res.json({ success: true, response: botResponse });
    } catch (error) {
        console.error('Error processing voice message:', error);
        res.status(500).json({ success: false, message: 'Failed to process voice message.' });
    }
});

// ElevenLabs Voice Synthesis Endpoints
router.get('/voices', async (req, res) => {
  try {
    if (!elevenLabsService.isAvailable()) {
      return res.status(503).json({ 
        error: 'ElevenLabs service not available',
        fallback: true
      });
    }

    const voices = elevenLabsService.getAvailableVoices();
    res.json({ voices, available: true });
  } catch (error) {
    console.error('Failed to get voices:', error);
    res.status(500).json({ error: 'Failed to retrieve voices' });
  }
});

router.post('/text-to-speech', async (req, res) => {
  try {
    const { text, voiceId, options = {} } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!elevenLabsService.isAvailable()) {
      return res.status(503).json({ 
        error: 'ElevenLabs service not available',
        fallback: true
      });
    }

    // Generate audio buffer
    const audioBuffer = await elevenLabsService.textToSpeech(text, {
      voiceId,
      ...options
    });

    // Set appropriate headers for audio response
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('Text-to-speech error:', error);
    res.status(500).json({ 
      error: 'Failed to generate speech',
      message: error.message
    });
  }
});

router.post('/text-to-speech-stream', async (req, res) => {
  try {
    const { text, voiceId, options = {} } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!elevenLabsService.isAvailable()) {
      return res.status(503).json({ 
        error: 'ElevenLabs service not available',
        fallback: true
      });
    }

    // Set headers for streaming audio
    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache'
    });

    // Get audio stream and pipe to response
    const audioStream = await elevenLabsService.textToSpeechStream(text, {
      voiceId,
      ...options
    });

    audioStream.pipe(res);
  } catch (error) {
    console.error('Text-to-speech stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to generate speech stream',
        message: error.message
      });
    }
  }
});

router.get('/voice-status', async (req, res) => {
  try {
    const status = {
      elevenLabs: {
        available: elevenLabsService.isAvailable(),
        voiceCount: elevenLabsService.getAvailableVoices().length
      },
      browserTTS: {
        available: true, // Browser TTS is always available as fallback
        note: 'Fallback option'
      }
    };

    res.json(status);
  } catch (error) {
    console.error('Voice status error:', error);
    res.status(500).json({ error: 'Failed to get voice status' });
  }
});

module.exports = router;