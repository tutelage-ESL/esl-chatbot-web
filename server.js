const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize Supabase (optional)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// Initialize Gemini AI
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    res.json({ user: data.user });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.json({ user: data.user, session: data.session });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Chat endpoint with Gemini AI
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!genAI) {
      return res.json({ response: `Echo: ${message}` });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
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
// NOTE: The 'progress.user_id' column does not exist in your Supabase table.
// Please ensure your 'progress' table has a 'user_id' column.
app.get('/api/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!supabase) {
      return res.json([{ user_id: userId, progress: 50, updated_at: new Date().toISOString() }]);
    }
    
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId);
      
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

app.post('/api/progress', async (req, res) => {
  try {
    const { user_id, progress } = req.body;
    
    if (!user_id || progress === undefined) {
      return res.status(400).json({ error: 'user_id and progress are required' });
    }
    
    if (!supabase) {
      return res.json({ user_id, progress, updated_at: new Date().toISOString() });
    }
    
    const { data, error } = await supabase
      .from('progress')
      .upsert({ user_id, progress, updated_at: new Date().toISOString() });
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// File upload endpoint
const upload = multer({ dest: 'uploads/' });
app.post('/api/upload', upload.single('file'), (req, res) => {
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
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      supabase: !!supabase,
      gemini: !!genAI
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Supabase: ${supabase ? 'Connected' : 'Not configured'}`);
  console.log(`Gemini AI: ${genAI ? 'Connected' : 'Not configured'}`);
});