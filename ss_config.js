/**
 * SSCracker Central Configuration
 * Shyamsthali LLP
 *
 * ════════════════════════════════════════════
 * SETUP: After deploying your Cloudflare Worker,
 * paste your Worker URL below as PROXY_URL.
 *
 * Example:
 *   PROXY_URL: 'https://sscracker-proxy.yourname.workers.dev'
 *
 * That's the ONLY thing you need to change!
 * All 8 AI features will start working immediately.
 * ════════════════════════════════════════════
 */

window.SS_CONFIG = {

  /* ─── YOUR CLOUDFLARE WORKER URL ───
     After deploying cloudflare_worker.js, paste your
     Worker URL here. It looks like:
     https://sscracker-proxy.YOUR-NAME.workers.dev
  ──────────────────────────────────── */
  PROXY_URL: 'https://sscracker-proxy.rambhajrawat.workers.dev',
  /* ─── AI Model ─── */
  MODEL: 'claude-sonnet-4-20250514',


  /* ─── Platform settings ─── */
  PLATFORM: {
    name:    'SSCracker',
    company: 'Shyamsthali LLP',
    founder: 'Ram Bhaj Rawat Ji',
    whatsapp:'91XXXXXXXXXX',   /* ← Replace with your WhatsApp number */
  },


  /* ─── Razorpay Key ─── */
  RAZORPAY_KEY: 'rzp_test_YOUR_KEY_HERE',  /* ← Replace with your Razorpay Key */


  /* ─── Free tier limits ─── */
  FREE_TIER: {
    mocksPerMonth:  3,
    doubtsPerDay:   5,
    streamsAllowed: ['NDA', 'DP', 'SSCGD'],
  },


  /* ─── Internal: DO NOT CHANGE ─── */
  _ready: true,
};


/* ════════════════════════════════════════════
   GLOBAL API CALLER — used by all AI features
   All pages call window.SS_API() instead of
   calling Anthropic directly.
════════════════════════════════════════════ */
window.SS_API = {

  /* Non-streaming call — returns text */
  call: async function(messages, systemPrompt, maxTokens) {
    var cfg = window.SS_CONFIG;
    if (!cfg || !cfg.PROXY_URL || cfg.PROXY_URL.includes('YOUR-WORKER')) {
      console.warn('SSCracker: PROXY_URL not configured in ss_config.js');
      return null;
    }
    try {
      var resp = await fetch(cfg.PROXY_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      cfg.MODEL,
          max_tokens: maxTokens || 800,
          system:     systemPrompt || '',
          stream:     false,
          messages:   Array.isArray(messages) ? messages : [{ role:'user', content: messages }],
        }),
      });
      var data = await resp.json();
      if (data.error) { console.error('API error:', data.error); return null; }
      return (data.content || []).map(function(c){ return c.text || ''; }).join('');
    } catch(e) {
      console.error('SS_API.call error:', e);
      return null;
    }
  },

  /* Streaming call — pipes text into a DOM element */
  stream: async function(messages, systemPrompt, targetEl, onDone) {
    var cfg = window.SS_CONFIG;
    if (!cfg || !cfg.PROXY_URL || cfg.PROXY_URL.includes('YOUR-WORKER')) {
      if (targetEl) targetEl.textContent = '⚙️ AI Proxy setup नहीं है। ss_config.js में PROXY_URL add करें।';
      return;
    }

    if (targetEl) {
      targetEl.textContent = '';
      var cursor = document.createElement('span');
      cursor.style.cssText = 'display:inline-block;width:2px;height:1em;background:currentColor;vertical-align:text-bottom;margin-left:2px;animation:ss-blink .7s infinite;';
      targetEl.appendChild(cursor);
    }

    try {
      var resp = await fetch(cfg.PROXY_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      cfg.MODEL,
          max_tokens: 1000,
          system:     systemPrompt || '',
          stream:     true,
          messages:   Array.isArray(messages) ? messages : [{ role:'user', content: messages }],
        }),
      });

      if (!resp.ok) throw new Error('Proxy error ' + resp.status);

      var reader  = resp.body.getReader();
      var decoder = new TextDecoder();
      var buffer  = '';

      while (true) {
        var _r = await reader.read();
        if (_r.done) break;
        buffer += decoder.decode(_r.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop();

        for (var line of lines) {
          if (!line.startsWith('data: ')) continue;
          var raw = line.slice(6).trim();
          if (raw === '[DONE]') break;
          try {
            var evt = JSON.parse(raw);
            if (evt.type === 'content_block_delta' && evt.delta && evt.delta.text) {
              if (targetEl && cursor) {
                var tn = document.createTextNode(evt.delta.text);
                targetEl.insertBefore(tn, cursor);
              }
            }
          } catch(e) {}
        }
      }
    } catch(err) {
      if (targetEl) {
        var msg = document.createTextNode('⚠️ AI से connect नहीं हो पाया: ' + err.message);
        if (cursor && cursor.parentNode) targetEl.insertBefore(msg, cursor);
        else if (targetEl) targetEl.appendChild(msg);
      }
    } finally {
      if (cursor && cursor.parentNode) cursor.remove();
      if (typeof onDone === 'function') onDone();
    }
  },

  /* Check if proxy is configured */
  isConfigured: function() {
    var cfg = window.SS_CONFIG;
    return cfg && cfg.PROXY_URL && !cfg.PROXY_URL.includes('YOUR-WORKER');
  },

  /* Show setup banner if not configured */
  checkSetup: function() {
    if (this.isConfigured()) return;
    var existing = document.getElementById('ss-setup-banner');
    if (existing) return;

    var banner = document.createElement('div');
    banner.id  = 'ss-setup-banner';
    banner.style.cssText = [
      'position:fixed;bottom:0;left:0;right:0;z-index:99997;',
      'background:#0D1F3C;border-top:2px solid #F5A623;',
      'padding:10px 16px;display:flex;align-items:center;',
      'justify-content:space-between;flex-wrap:wrap;gap:8px;',
    ].join('');

    banner.innerHTML = [
      '<div style="font-family:Rajdhani,system-ui;font-size:.82rem;color:#A8B8D8;">',
        '⚙️ <strong style="color:#F5A623;">AI Setup needed:</strong>',
        ' Cloudflare Worker deploy करें → ss_config.js में URL paste करें → सभी AI features काम करेंगे',
      '</div>',
      '<div style="display:flex;gap:8px;">',
        '<a href="SETUP_GUIDE.html" style="padding:5px 12px;border-radius:6px;background:#F5A623;color:#0D1F3C;font-family:Rajdhani,system-ui;font-weight:700;font-size:.75rem;text-decoration:none;letter-spacing:.04em;">Setup Guide →</a>',
        '<button onclick="document.getElementById(\'ss-setup-banner\').remove()" style="padding:5px 10px;background:transparent;border:1px solid rgba(255,255,255,.15);border-radius:6px;color:#5F7A9D;font-size:.72rem;cursor:pointer;">Dismiss</button>',
      '</div>',
    ].join('');

    document.body.appendChild(banner);
  },
};

/* Auto-check setup on every page */
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() { window.SS_API.checkSetup(); }, 2000);
});
