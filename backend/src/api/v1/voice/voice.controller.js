'use strict';

const https = require('https');
const http  = require('http');
const { URL } = require('url');
const { HfInference } = require('@huggingface/inference');
const elevenLabsService = require('../../../../services/elevenLabsService');
const { updateProgressDB, ESL_SYSTEM_INSTRUCTION } = require('../chat/chat.controller');
const db = require('../../../../models');
const apiResponse = require('../../../../utils/apiResponse');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requestAudio(u, options, body) {
  return new Promise((resolve, reject) => {
    const req = (u.protocol === 'https:' ? https : http).request(options, (resp) => {
      const chunks = [];
      const contentType = resp.headers['content-type'] || '';
      resp.on('data', (c) => chunks.push(c));
      resp.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ buf, contentType, statusCode: resp.statusCode });
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(new Error('Free TTS timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

// ─── Controllers ──────────────────────────────────────────────────────────────

exports.getVoices = async (req, res) => {
  try {
    if (!elevenLabsService.isAvailable()) {
      return res.status(503).json({ error: 'ElevenLabs service not available', fallback: true });
    }
    const voices = elevenLabsService.getAvailableVoices();
    res.json({ voices, available: true });
  } catch (error) {
    console.error('Failed to get voices:', error);
    res.status(500).json({ error: 'Failed to retrieve voices' });
  }
};

exports.textToSpeech = async (req, res) => {
  try {
    const { text, voiceId, options = {} } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    if (!elevenLabsService.isAvailable()) {
      return res.status(503).json({ error: 'ElevenLabs service not available', fallback: true });
    }

    let user = null;
    if (req.session && req.session.userId) {
      user = await db.User.findByPk(req.session.userId);
    }

    const audioBuffer = await elevenLabsService.textToSpeech(text, { voiceId, user, ...options });
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=3600'
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error('Text-to-speech error:', error);
    if (error.message.includes('TTS usage limit exceeded')) {
      return res.status(429).json({ error: 'Usage limit exceeded', message: error.message, limitExceeded: true });
    }
    res.status(500).json({ error: 'Failed to generate speech', message: error.message });
  }
};

exports.textToSpeechStream = async (req, res) => {
  try {
    const { text, voiceId, options = {} } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    if (!elevenLabsService.isAvailable()) {
      return res.status(503).json({ error: 'ElevenLabs service not available', fallback: true });
    }
    res.set({ 'Content-Type': 'audio/mpeg', 'Transfer-Encoding': 'chunked', 'Cache-Control': 'no-cache' });
    const audioStream = await elevenLabsService.textToSpeechStream(text, { voiceId, ...options });
    audioStream.pipe(res);
  } catch (error) {
    console.error('Text-to-speech stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate speech stream', message: error.message });
    }
  }
};

exports.voiceStatus = async (req, res) => {
  try {
    const status = {
      elevenLabs: { available: elevenLabsService.isAvailable(), voiceCount: elevenLabsService.getAvailableVoices().length },
      browserTTS: { available: true, note: 'Fallback option' },
      freeTTS: { available: true, provider: process.env.FREE_TTS_PROVIDER || 'google', voice: process.env.FREE_TTS_VOICE || null, lang: process.env.FREE_TTS_LANG || 'en' }
    };
    res.json(status);
  } catch (error) {
    console.error('Voice status error:', error);
    res.status(500).json({ error: 'Failed to get voice status' });
  }
};

exports.freeTts = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const baseUrl  = process.env.FREE_TTS_URL;
    const provider = process.env.FREE_TTS_PROVIDER || 'google';
    const voice    = process.env.FREE_TTS_VOICE || 'en_US-amy-medium';
    const lang     = process.env.FREE_TTS_LANG  || 'en';
    const format   = process.env.FREE_TTS_FORMAT || 'mp3';

    let result;
    if (provider === 'piper' && baseUrl) {
      const primary = new URL(baseUrl.replace(/\/$/, '') + '/api/tts');
      const isHttps = primary.protocol === 'https:';
      const payload = JSON.stringify({ text, voice, format });
      const opts = {
        method: 'POST', hostname: primary.hostname,
        port: primary.port || (isHttps ? 443 : 80), path: primary.pathname,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
      };
      result = await requestAudio(primary, opts, payload);
      if (!(result.contentType.includes('audio') || result.statusCode === 200)) {
        const alt = new URL(baseUrl.replace(/\/$/, '') + '/speak');
        alt.search = `?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}&format=${encodeURIComponent(format)}`;
        const altOpts = {
          method: 'GET', hostname: alt.hostname,
          port: alt.port || (alt.protocol === 'https:' ? 443 : 80), path: alt.pathname + alt.search, headers: {}
        };
        result = await requestAudio(alt, altOpts);
      }
    } else {
      // Google Translate TTS (unofficial)
      const gt = new URL('https://translate.google.com/translate_tts');
      gt.search = `?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${encodeURIComponent(lang)}&client=tw-ob`;
      const gtOpts = {
        method: 'GET', hostname: gt.hostname, port: 443, path: gt.pathname + gt.search,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
      };
      result = await requestAudio(gt, gtOpts);
      if (result.statusCode !== 200) return res.status(502).json({ error: 'Free TTS failed', fallback: true });
    }

    if (!result || !result.buf || result.buf.length === 0) {
      return res.status(502).json({ error: 'Free TTS failed', fallback: true });
    }

    const ct = result.contentType.includes('audio') ? result.contentType : (format === 'mp3' ? 'audio/mpeg' : 'audio/wav');
    res.set({ 'Content-Type': ct, 'Content-Length': result.buf.length, 'Cache-Control': 'no-cache' });
    return res.send(result.buf);
  } catch (error) {
    console.error('Free TTS proxy error:', error);
    return res.status(500).json({ error: 'Failed to generate free TTS', message: error.message });
  }
};

exports.voiceMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return apiResponse.validationError(res, 'No message provided');

    const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN, { provider: 'hf-inference' });
    const modelName = process.env.HF_FALLBACK_MODEL || 'HuggingFaceH4/zephyr-7b-beta';
    const prompt = `${ESL_SYSTEM_INSTRUCTION}\n\nUser: ${message}\nAssistant:`;
    const r = await hf.textGeneration({
      model: modelName, inputs: prompt,
      parameters: { max_new_tokens: 256, temperature: 0.7, repetition_penalty: 1.2, no_repeat_ngram_size: 2, return_full_text: false }
    });
    let botResponse = Array.isArray(r) ? (r[0]?.generated_text || '') : (r.generated_text || '');
    botResponse = (botResponse || '').trim();

    const responsePreview = botResponse.length > 100 ? botResponse.substring(0, 100) + '...' : botResponse;
    await updateProgressDB(req.userId, 'Voice message', 'voice', responsePreview);
    return apiResponse.success(res, { response: botResponse });
  } catch (error) {
    console.error('Error processing voice message:', error);
    if (req.userId) {
      await updateProgressDB(req.userId, 'Voice message', 'voice', 'Sorry, I encountered an error processing your voice message. Please try again.');
    }
    return apiResponse.internalError(res, 'Failed to process voice message');
  }
};
