const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google Generative AI (assuming genAI is globally available or passed)
// For now, we'll assume it's initialized elsewhere or handle it here if needed.
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Chat endpoint with Gemini AI
router.post('/chat', async (req, res) => {
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

        // Use the global genAI instance to get the model
        const model = global.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const result = await model.generateContent(message);
        const botResponse = result.response.text();

        res.json({ success: true, response: botResponse });
    } catch (error) {
        console.error('Error processing voice message:', error);
        res.status(500).json({ success: false, message: 'Failed to process voice message.' });
    }
});

module.exports = router;