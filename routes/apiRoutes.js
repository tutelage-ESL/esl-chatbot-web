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
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Assuming genAI is initialized in app.js and passed or accessible
    // For now, a simple echo if genAI is not available
    if (!global.genAI) { // Using global for simplicity, consider dependency injection
      return res.json({ response: `Echo: ${message}` });
    }

    const model = global.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const prompt = `You are an ESL (English as Second Language) tutor. Help the student with their English learning. Student says: "${message}". Provide a helpful, encouraging response.`;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
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
    // Placeholder for Sequelize integration
    // You will need to implement Sequelize queries here to fetch user progress
    // For now, returning a dummy response
    return res.json([{ user_id: userId, progress: 50, updated_at: new Date().toISOString() }]);
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
    // Placeholder for Sequelize integration
    // You will need to implement Sequelize queries here to update user progress
    // For now, returning a dummy response
    return res.json({ user_id, progress, updated_at: new Date().toISOString() });
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
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

module.exports = router;