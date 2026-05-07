/**
 * SSCracker AI Proxy — Cloudflare Worker
 * Shyamsthali LLP
 *
 * ════════════════════════════════════════════════
 * DEPLOY IN 5 MINUTES — FREE FOREVER
 * ════════════════════════════════════════════════
 *
 * STEP 1: Go to https://workers.cloudflare.com
 * STEP 2: Sign up free (just email needed)
 * STEP 3: Click "Create Worker"
 * STEP 4: Delete all existing code
 * STEP 5: Paste THIS entire file
 * STEP 6: Click "Save and Deploy"
 * STEP 7: Go to Settings → Variables → Add variable:
 *           Name:  ANTHROPIC_API_KEY
 *           Value: your Claude API key (sk-ant-...)
 *           Click "Encrypt" checkbox ← IMPORTANT
 * STEP 8: Copy your Worker URL
 *         (looks like: https://sscracker-proxy.YOUR-NAME.workers.dev)
 * STEP 9: Open ss_config.js in SSCracker_v2 folder
 *         Paste your Worker URL as PROXY_URL
 * STEP 10: Done! All AI features will work.
 *
 * FREE TIER: 100,000 requests/day — enough for 500+ students
 * ════════════════════════════════════════════════
 */

export default {
  async fetch(request, env) {

    /* ── CORS headers — allow SSCracker pages ── */
    const CORS = {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    /* Handle preflight OPTIONS request */
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    /* Only accept POST */
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Only POST allowed' }),
        { status: 405, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    /* Check API key is configured */
    if (!env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured in Worker secrets' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    try {
      /* Read the request body from browser */
      const body = await request.json();

      /* Validate required fields */
      if (!body.messages || !Array.isArray(body.messages)) {
        return new Response(
          JSON.stringify({ error: 'Invalid request: messages array required' }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        );
      }

      /* Forward to Anthropic API with API key added server-side */
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         env.ANTHROPIC_API_KEY,   /* ← Added securely server-side */
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      body.model      || 'claude-sonnet-4-20250514',
          max_tokens: body.max_tokens || 1000,
          system:     body.system     || '',
          stream:     body.stream     || false,
          messages:   body.messages,
        }),
      });

      /* Stream response back to browser */
      if (body.stream) {
        return new Response(anthropicResponse.body, {
          status:  anthropicResponse.status,
          headers: {
            ...CORS,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });
      }

      /* Non-streaming response */
      const data = await anthropicResponse.json();
      return new Response(JSON.stringify(data), {
        status:  anthropicResponse.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Proxy error: ' + err.message }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }
  }
};
