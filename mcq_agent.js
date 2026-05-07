/**
 * SSCracker Daily MCQ Content Generator Agent v1.0
 * Shyamsthali LLP
 *
 * WHAT IT DOES:
 *   Runs every day at 5:00 AM IST via GitHub Actions cron.
 *   Calls Claude API to generate 20 fresh MCQs per exam stream.
 *   Saves them to daily_mcqs.json which the platform reads.
 *
 * FILES:
 *   mcq_agent.js          ← This file (the agent logic)
 *   daily_mcqs.json       ← Output file (auto-updated daily)
 *   .github/workflows/mcq_cron.yml ← GitHub Actions cron config
 *
 * DEPLOYMENT:
 *   1. Push this file to your GitHub repo
 *   2. Add ANTHROPIC_API_KEY as a GitHub Secret
 *   3. GitHub Actions runs this every morning at 5am IST
 *   4. daily_mcqs.json is committed back to repo automatically
 *
 * LOCAL TEST:
 *   node mcq_agent.js
 *   (needs ANTHROPIC_API_KEY in environment)
 */

const https   = require('https');
const fs      = require('fs');
const path    = require('path');

/* ─────────────────────────────────────────
   CONFIGURATION
───────────────────────────────────────── */
const CONFIG = {
  model:    'claude-sonnet-4-20250514',
  maxTokens: 2000,
  apiKey:   process.env.ANTHROPIC_API_KEY,
  outputFile: path.join(__dirname, 'daily_mcqs.json'),
  streams: [
    {
      key:    'NDA',
      name:   'NDA (National Defence Academy)',
      count:  20,
      topics: [
        'Mathematics — Algebra, Trigonometry, Calculus, Statistics',
        'English — Grammar, Comprehension, Vocabulary',
        'General Knowledge — History, Geography, Science, Polity',
        'Current Affairs — Last 30 days',
        'Physics, Chemistry, Biology'
      ]
    },
    {
      key:   'DP',
      name:  'Delhi Police Constable',
      count: 20,
      topics: [
        'General Knowledge & Current Affairs',
        'Delhi GK — History, Culture, Government',
        'Reasoning — Analogy, Series, Coding-Decoding',
        'Numerical Ability — Percentage, Profit-Loss, Time-Work',
        'Computer Awareness'
      ]
    },
    {
      key:   'SSCGD',
      name:  'SSC GD Constable',
      count: 20,
      topics: [
        'General Intelligence & Reasoning',
        'General Knowledge & General Awareness',
        'Elementary Mathematics',
        'English / Hindi Language'
      ]
    },
    {
      key:   'BANKPO',
      name:  'Bank PO (IBPS)',
      count: 15,
      topics: [
        'Quantitative Aptitude — Data Interpretation, Arithmetic',
        'Reasoning Ability — Puzzles, Seating Arrangement',
        'English Language — Reading Comprehension, Error Spotting',
        'General Awareness — Banking, Economy, Finance'
      ]
    }
  ]
};

/* ─────────────────────────────────────────
   CLAUDE API CALLER
───────────────────────────────────────── */
function callClaude(prompt, systemPrompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model:      CONFIG.model,
      max_tokens: CONFIG.maxTokens,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers:  {
        'Content-Type':      'application/json',
        'Content-Length':    Buffer.byteLength(body),
        'x-api-key':         CONFIG.apiKey,
        'anthropic-version': '2023-06-01',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text   = (parsed.content || []).map(c => c.text || '').join('');
          resolve(text);
        } catch(e) {
          reject(new Error('Parse error: ' + data.slice(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/* ─────────────────────────────────────────
   GENERATE MCQs FOR ONE STREAM
───────────────────────────────────────── */
async function generateMCQsForStream(stream) {
  const today     = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const topicsStr = stream.topics.join('\n- ');

  const systemPrompt = `You are SSCracker Content Creator for Shyamsthali LLP.
Generate fresh, high-quality MCQs for Indian competitive exam aspirants.
Today's date: ${today}
CRITICAL: Return ONLY valid JSON. No markdown, no explanation, no backticks.
The JSON must be a valid array of MCQ objects.`;

  const userPrompt = `Generate ${stream.count} unique MCQs for ${stream.name} exam.

Cover these topics:
- ${topicsStr}

Return a JSON array with EXACTLY ${stream.count} objects. Each object:
{
  "id": "unique_id_string",
  "topic": "topic name",
  "subject": "subject name",
  "difficulty": 1-5 (1=easy, 5=hard),
  "question": "Full question text in English. Include Hindi translation in brackets if helpful.",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": 0,
  "explanation": "Clear explanation why this is correct (2-3 sentences)",
  "hint": "One helpful hint without revealing answer",
  "shortcut": "Memory trick or formula shortcut if applicable"
}

Rules:
- Mix easy (30%), medium (50%), hard (20%) questions
- Include 3-4 current affairs questions with today's date context
- Make questions exam-realistic — similar to actual paper pattern
- Explanations must be educational and complete
- No repeated questions
- answer field = 0-indexed integer (0=A, 1=B, 2=C, 3=D)`;

  console.log(`  Generating ${stream.count} MCQs for ${stream.name}...`);

  const response = await callClaude(userPrompt, systemPrompt);

  /* Parse JSON — handle any markdown wrapping */
  let cleaned = response.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const mcqs = JSON.parse(cleaned);

  /* Validate and enrich */
  return mcqs.map((q, i) => ({
    ...q,
    id:        `${stream.key}_${Date.now()}_${i}`,
    stream:    stream.key,
    createdAt: new Date().toISOString(),
    date:      new Date().toISOString().slice(0, 10),
  }));
}

/* ─────────────────────────────────────────
   MAIN AGENT RUN
───────────────────────────────────────── */
async function runAgent() {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  SSCracker MCQ Agent — Shyamsthali LLP ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`  Date: ${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}`);
  console.log(`  Time: ${new Date().toLocaleTimeString('en-IN')}`);
  console.log('');

  if (!CONFIG.apiKey) {
    console.error('❌ ERROR: ANTHROPIC_API_KEY not set in environment!');
    process.exit(1);
  }

  const results = {
    generatedAt: new Date().toISOString(),
    date:        new Date().toISOString().slice(0, 10),
    totalMCQs:   0,
    streams:     {},
  };

  let totalGenerated = 0;
  const errors = [];

  /* Generate for each stream */
  for (const stream of CONFIG.streams) {
    try {
      const mcqs = await generateMCQsForStream(stream);
      results.streams[stream.key] = {
        name:  stream.name,
        count: mcqs.length,
        mcqs:  mcqs,
      };
      totalGenerated += mcqs.length;
      console.log(`  ✅ ${stream.name}: ${mcqs.length} MCQs generated`);

      /* Small delay between API calls */
      await new Promise(r => setTimeout(r, 1500));

    } catch (err) {
      console.error(`  ❌ ${stream.name}: ${err.message}`);
      errors.push({ stream: stream.key, error: err.message });

      /* Fallback: keep yesterday's MCQs for this stream */
      try {
        const existing = JSON.parse(fs.readFileSync(CONFIG.outputFile, 'utf8'));
        if (existing.streams && existing.streams[stream.key]) {
          results.streams[stream.key] = existing.streams[stream.key];
          console.log(`  ⚠️  Using yesterday's MCQs for ${stream.name}`);
        }
      } catch(e) {
        results.streams[stream.key] = { name: stream.name, count: 0, mcqs: [] };
      }
    }
  }

  results.totalMCQs = totalGenerated;
  results.errors    = errors;

  /* Write output file */
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(results, null, 2));

  console.log('');
  console.log(`✅ DONE: ${totalGenerated} MCQs written to daily_mcqs.json`);
  if (errors.length) console.log(`⚠️  ${errors.length} stream(s) had errors`);
  console.log('');

  /* Generate summary for CEO agent */
  generateSummary(results, totalGenerated);
}

function generateSummary(results, total) {
  const summary = {
    date:    results.date,
    total:   total,
    streams: Object.entries(results.streams).map(([k, v]) => `${k}: ${v.count} MCQs`).join(', '),
    errors:  results.errors && results.errors.length ? results.errors.map(e => e.stream).join(', ') : 'None',
  };

  const summaryPath = path.join(__dirname, 'mcq_summary.json');
  try {
    const history = JSON.parse(fs.existsSync(summaryPath) ? fs.readFileSync(summaryPath,'utf8') : '[]');
    history.unshift(summary);
    fs.writeFileSync(summaryPath, JSON.stringify(history.slice(0, 30), null, 2));
  } catch(e) {}
}

/* ─────────────────────────────────────────
   RUN
───────────────────────────────────────── */
runAgent().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
