const express = require('express');
const router  = express.Router();
const https   = require('https');
const { authMiddleware } = require('../middleware/auth');

// Simple in-memory rate limiter
const rateLimitMap = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxReqs = 20;
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  if (entry.count > maxReqs) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }
  next();
}

// Core Anthropic API caller — keeps key server-side
async function callAnthropic({ messages, system, max_tokens, model }) {
  return new Promise((resolve, reject) => {
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_KEY) {
      return reject(new Error('AI not configured. Add ANTHROPIC_API_KEY to .env'));
    }

    const payload = JSON.stringify({
      model: model || 'claude-sonnet-4-5',
      max_tokens: max_tokens || 1024,
      system: system || 'You are a helpful assistant for an online learning platform.',
      messages: messages || []
    });

    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => { data += chunk; });
      proxyRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (proxyRes.statusCode >= 400) {
            reject(new Error(parsed?.error?.message || `API error ${proxyRes.statusCode}`));
          } else {
            resolve({ status: proxyRes.statusCode, data: parsed });
          }
        } catch(e) {
          reject(new Error('Invalid response from AI service'));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
// General chat proxy (used by chat widget on school sites)
router.post('/chat', rateLimit, async (req, res) => {
  try {
    const { status, data } = await callAnthropic({
      messages:   req.body.messages || [],
      system:     req.body.system,
      max_tokens: req.body.max_tokens || 600,
      model:      req.body.model,
    });
    res.status(status).json(data);
  } catch (err) {
    console.error('[AI proxy /chat]', err.message);
    const status = err.message.includes('not configured') ? 500 :
                   err.message.includes('429') ? 429 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ── POST /api/ai/generate ─────────────────────────────────────────────────────
// Content generation for admins/instructors (quiz questions, course outlines, etc.)
// Requires authentication
router.post('/generate', authMiddleware, rateLimit, async (req, res) => {
  try {
    const { type, topic, count, level, course_title, subject } = req.body;

    let system = 'You are an expert educational content creator for Nigerian schools and universities. Always respond with valid JSON only — no markdown, no explanation, just the JSON object.';
    let userMsg = '';

    switch (type) {
      case 'quiz_questions': {
        const n = Math.min(count || 5, 20);
        userMsg = `Generate ${n} multiple-choice quiz questions about "${topic || subject || 'General Knowledge'}"${level ? ` for ${level} level` : ''}.
Return ONLY this JSON structure:
{
  "questions": [
    {
      "question_text": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_answer": "a",
      "explanation": "...",
      "question_type": "multiple_choice"
    }
  ]
}`;
        break;
      }

      case 'true_false_questions': {
        const n = Math.min(count || 5, 20);
        userMsg = `Generate ${n} true/false questions about "${topic || subject || 'General Knowledge'}"${level ? ` for ${level} level` : ''}.
Return ONLY this JSON structure:
{
  "questions": [
    {
      "question_text": "...",
      "option_a": "True",
      "option_b": "False",
      "correct_answer": "a",
      "explanation": "...",
      "question_type": "true_false"
    }
  ]
}`;
        break;
      }

      case 'course_outline': {
        userMsg = `Create a detailed course outline for: "${course_title || topic}"${level ? ` (${level} level)` : ''}.
Return ONLY this JSON structure:
{
  "title": "...",
  "description": "...",
  "sections": [
    {
      "title": "Section title",
      "lessons": ["Lesson 1", "Lesson 2", "Lesson 3"]
    }
  ],
  "learning_outcomes": ["outcome 1", "outcome 2"],
  "prerequisites": ["prereq 1"]
}`;
        break;
      }

      case 'course_description': {
        userMsg = `Write a compelling course description for: "${course_title || topic}"${level ? ` (${level} level)` : ''}.
Return ONLY this JSON structure:
{
  "description": "2-3 paragraph course description",
  "short_description": "One sentence summary",
  "learning_outcomes": ["What students will learn 1", "What students will learn 2", "What students will learn 3"]
}`;
        break;
      }

      case 'cbt_questions': {
        const n = Math.min(count || 10, 40);
        userMsg = `Generate ${n} CBT (Computer Based Test) exam questions about "${topic || subject}"${level ? ` for ${level}` : ''} in Nigerian exam style (JAMB/WAEC/NECO format).
Return ONLY this JSON structure:
{
  "questions": [
    {
      "question_text": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_answer": "a",
      "explanation": "..."
    }
  ]
}`;
        break;
      }

      default:
        return res.status(400).json({ error: 'Unknown generation type. Use: quiz_questions, true_false_questions, course_outline, course_description, cbt_questions' });
    }

    const { data } = await callAnthropic({
      messages: [{ role: 'user', content: userMsg }],
      system,
      max_tokens: 3000,
    });

    // Extract text content from Anthropic response
    const textContent = data?.content?.find(c => c.type === 'text')?.text || '';

    // Parse JSON from response
    let parsed;
    try {
      // Strip any accidental markdown fences
      const clean = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(clean);
    } catch(e) {
      console.error('[AI generate] JSON parse failed:', textContent.slice(0, 200));
      return res.status(500).json({ error: 'AI returned invalid JSON. Please try again.' });
    }

    res.json({ ok: true, result: parsed });
  } catch (err) {
    console.error('[AI proxy /generate]', err.message);
    const status = err.message.includes('not configured') ? 500 :
                   err.message.includes('429') ? 429 : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;