/**
 * SSCracker AI Core v1.0 — Master AI Brain
 * Shyamsthali LLP
 *
 * DROP-IN: Add after gamification.js on every page:
 *   <script src="ss_ai_core.js"></script>   (root)
 *   <script src="../ss_ai_core.js"></script> (subfolders)
 *
 * WHAT THIS FILE DOES — 8 AI techniques applied sitewide:
 *
 *  1. AI CHAPTER EXPLAINER    — "Explain this to me" button on every chapter page
 *  2. AI SMART HINT ENGINE    — Context-aware progressive hints on practice Qs
 *  3. AI CONCEPT CHECKER      — After wrong answer: Claude explains WHY in Hindi/English
 *  4. AI DAILY MOTIVATOR      — Personalised morning message based on student's data
 *  5. AI WEAK SPOT DETECTOR   — Scans performance → shows "Focus on THIS today" banner
 *  6. AI VOICE TUTOR          — Text-to-speech for explanations (Web Speech API + AI text)
 *  7. AI SPEED COACH          — Tracks time per question → warns if too slow/fast
 *  8. AI STUDY PLAN GENERATOR — On-demand 7-day personalised plan via Claude API
 *
 * PUBLIC API:
 *   window.SSAI.explain(topic, context)   → streams explanation into element
 *   window.SSAI.hint(questionText, attempt) → returns AI hint
 *   window.SSAI.whyWrong(q, chosen, correct) → explains the mistake
 *   window.SSAI.generatePlan(profile)     → 7-day study plan
 *   window.SSAI.speak(text, lang)         → voice tutor
 */

(function (global) {
  'use strict';

  var MODEL  = 'claude-sonnet-4-20250514';
  var APIURL = (window.SS_CONFIG && window.SS_CONFIG.PROXY_URL) ? window.SS_CONFIG.PROXY_URL : 'https://api.anthropic.com/v1/messages';

  /* ─────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────── */
  function getLang() {
    try { return localStorage.getItem('ss_ui_lang') || 'hi'; } catch(e) { return 'hi'; }
  }

  function getStudentName() {
    try { return (localStorage.getItem('ss_user_email') || '').split('@')[0] || 'Student'; } catch(e) { return 'Student'; }
  }

  function getGamStats() {
    try {
      var raw = localStorage.getItem('ss_gamification');
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return { xp: 0, streak: 0, totalCorrect: 0, totalDoubts: 0, chaptersViewed: [], weakAreas: {} };
  }

  function detectPage() {
    var path = window.location.pathname.toLowerCase();
    if (path.includes('math') || path.includes('algebra') || path.includes('trigonometry') ||
        path.includes('percentage') || path.includes('profit') || path.includes('geometry')) return 'math';
    if (path.includes('reasoning') || path.includes('analogy') || path.includes('series')) return 'reasoning';
    if (path.includes('english') || path.includes('tense') || path.includes('noun')) return 'english';
    if (path.includes('history') || path.includes('hist_')) return 'history';
    if (path.includes('geo') || path.includes('geography')) return 'geography';
    if (path.includes('polity') || path.includes('constitution')) return 'polity';
    if (path.includes('science') || path.includes('sci_')) return 'science';
    if (path.includes('economics') || path.includes('eco_')) return 'economics';
    if (path.includes('gk') || path.includes('current')) return 'gk';
    if (path.includes('mock') || path.includes('test')) return 'mock';
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('index')) return 'index';
    return 'general';
  }

  function detectCourse() {
    var path = window.location.pathname.toLowerCase();
    if (path.includes('/nda/')) return 'NDA';
    if (path.includes('delhi_police') || path.includes('/dp')) return 'Delhi Police';
    if (path.includes('ssc_gd') || path.includes('ssc-gd')) return 'SSC GD';
    return 'NDA';
  }

  function detectChapterName() {
    var h1 = document.querySelector('h1');
    if (h1) return h1.textContent.trim().slice(0, 80);
    return document.title.split('–')[0].trim().slice(0, 80);
  }

  /* ─────────────────────────────────────────
     CORE CLAUDE API CALLER (streaming)
  ───────────────────────────────────────── */
  async function streamToElement(prompt, systemPrompt, targetEl, onDone) {
    if (!targetEl) return;
    targetEl.textContent = '';

    var cursor = document.createElement('span');
    cursor.style.cssText = 'display:inline-block;width:2px;height:1em;background:currentColor;vertical-align:text-bottom;margin-left:2px;animation:ss-blink .7s infinite;';
    targetEl.appendChild(cursor);

    try {
      var resp = await fetch(APIURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 800,
          system: systemPrompt,
          stream: true,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!resp.ok) throw new Error('API error ' + resp.status);

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
              var textNode = document.createTextNode(evt.delta.text);
              targetEl.insertBefore(textNode, cursor);
            }
          } catch(e) {}
        }
      }
    } catch(err) {
      targetEl.textContent = getLang() === 'hi'
        ? '⚠️ AI से connect नहीं हो पाया। कृपया internet check करें।'
        : '⚠️ Could not connect to AI. Please check your internet.';
    } finally {
      if (cursor.parentNode) cursor.remove();
      if (typeof onDone === 'function') onDone();
    }
  }

  async function callAPI(prompt, systemPrompt) {
    try {
      var resp = await fetch(APIURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 600,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      var data = await resp.json();
      return (data.content || []).map(function(c){ return c.text || ''; }).join('');
    } catch(e) {
      return null;
    }
  }

  /* ─────────────────────────────────────────
     SHARED SYSTEM PROMPT
  ───────────────────────────────────────── */
  function baseSystem() {
    var lang = getLang();
    var name = getStudentName();
    return 'You are SSCracker AI Tutor for Shyamsthali LLP. Student name: ' + name + '. ' +
      'Course: ' + detectCourse() + '. ' +
      (lang === 'hi'
        ? 'ALWAYS respond in simple Hindi (Devanagari). Technical terms in English are OK. Be warm, encouraging, exam-focused.'
        : 'Respond in clear English. Be warm, encouraging, exam-focused.') +
      ' Keep responses concise and practical. No markdown headers.';
  }

  /* ═══════════════════════════════════════════
     TECHNIQUE 1: AI CHAPTER EXPLAINER
     Injects "AI से समझें" button on chapter pages
  ═══════════════════════════════════════════ */
  function injectChapterExplainer() {
    var pageType = detectPage();
    if (['mock','dashboard','index'].includes(pageType)) return;
    if (!document.querySelector('h1, h2')) return;

    var chapter  = detectChapterName();
    var course   = detectCourse();

    var btn = document.createElement('button');
    btn.id  = 'ss-ai-explain-btn';
    btn.innerHTML = '🤖 AI से समझें / Ask AI Tutor';
    btn.style.cssText = [
      'display:inline-flex;align-items:center;gap:6px;',
      'background:#002e5b;color:#fff;border:none;',
      'padding:9px 18px;border-radius:20px;',
      'font-family:"Baloo 2",system-ui,sans-serif;font-size:13px;font-weight:600;',
      'cursor:pointer;margin:12px 0;transition:background .2s;',
      'box-shadow:0 2px 8px rgba(0,46,91,.2);'
    ].join('');
    btn.onmouseover = function(){ this.style.background='#003e7a'; };
    btn.onmouseout  = function(){ this.style.background='#002e5b'; };

    var panel = document.createElement('div');
    panel.id  = 'ss-ai-explain-panel';
    panel.style.cssText = [
      'display:none;background:#eef3ff;border:1px solid #c5d4f5;',
      'border-radius:10px;padding:16px;margin:10px 0;',
      'font-size:.9rem;line-height:1.8;color:#002e5b;',
      'white-space:pre-wrap;word-break:break-word;'
    ].join('');

    /* Question input for custom questions */
    var qRow = document.createElement('div');
    qRow.style.cssText = 'display:none;margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;';
    var qInput = document.createElement('input');
    qInput.type = 'text';
    qInput.placeholder = getLang() === 'hi' ? 'इस chapter के बारे में कोई भी सवाल पूछें...' : 'Ask anything about this chapter...';
    qInput.style.cssText = 'flex:1;min-width:200px;padding:8px 12px;border:1px solid #c5d4f5;border-radius:8px;font-size:.85rem;outline:none;';
    var qBtn = document.createElement('button');
    qBtn.textContent = getLang() === 'hi' ? 'पूछें →' : 'Ask →';
    qBtn.style.cssText = 'padding:8px 14px;background:#002e5b;color:#fff;border:none;border-radius:8px;font-family:"Baloo 2",system-ui;font-weight:600;cursor:pointer;font-size:.82rem;';

    qRow.appendChild(qInput);
    qRow.appendChild(qBtn);

    /* Topic chips */
    var chips = document.createElement('div');
    chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
    var quickTopics = getLang() === 'hi'
      ? ['📖 मुझे simply explain करें', '💡 Main shortcut बताएं', '🎯 Exam में क्या आता है', '⚠️ Common mistakes क्या हैं', '📝 5 practice questions दें']
      : ['📖 Explain simply', '💡 Key shortcut', '🎯 Exam focus areas', '⚠️ Common mistakes', '📝 Give 5 practice Qs'];

    quickTopics.forEach(function(topic) {
      var chip = document.createElement('button');
      chip.textContent = topic;
      chip.style.cssText = 'padding:5px 11px;border-radius:20px;border:1px solid #aec4ef;background:#fff;color:#002e5b;font-size:.75rem;cursor:pointer;font-family:"Baloo 2",system-ui;font-weight:500;transition:all .15s;';
      chip.onmouseover = function(){ this.style.background='#002e5b';this.style.color='#fff'; };
      chip.onmouseout  = function(){ this.style.background='#fff';this.style.color='#002e5b'; };
      chip.onclick = function() { triggerExplain(topic.replace(/^[^\s]+ /, '')); };
      chips.appendChild(chip);
    });

    function triggerExplain(customQ) {
      var q = customQ || qInput.value.trim();
      if (!q) q = (getLang() === 'hi' ? chapter + ' को simply explain करें exam के लिए' : 'Explain ' + chapter + ' simply for exam');
      panel.style.display = 'block';
      panel.textContent = '';
      qInput.value = '';

      var prompt = q + '\n\nChapter context: ' + chapter + ' | Course: ' + course;
      var sys = baseSystem() + ' Chapter being studied: ' + chapter + '. Keep explanation under 200 words. Use numbered steps where helpful.';
      streamToElement(prompt, sys, panel);
    }

    btn.onclick = function() {
      if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'block';
        chips.style.display = 'flex';
        qRow.style.display  = 'flex';
        triggerExplain('');
      } else {
        panel.style.display = 'none';
        chips.style.display = 'none';
        qRow.style.display  = 'none';
      }
    };
    qBtn.onclick = function() { triggerExplain(qInput.value.trim()); };
    qInput.onkeydown = function(e) { if (e.key === 'Enter') triggerExplain(qInput.value.trim()); };

    /* Insert after first h1 or h2 */
    var anchor = document.querySelector('h1') || document.querySelector('h2') || document.body.firstChild;
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(btn, anchor.nextSibling);
      anchor.parentNode.insertBefore(chips, btn.nextSibling);
      anchor.parentNode.insertBefore(qRow, chips.nextSibling);
      anchor.parentNode.insertBefore(panel, qRow.nextSibling);
    }
  }

  /* ═══════════════════════════════════════════
     TECHNIQUE 2 & 3: AI CONCEPT CHECKER
     Hooks into existing radio/option clicks
     → After wrong answer shows AI explanation
  ═══════════════════════════════════════════ */
  function injectConceptChecker() {
    var pageType = detectPage();
    var course   = detectCourse();
    var chapter  = detectChapterName();

    /* Create floating explanation panel */
    var panel = document.createElement('div');
    panel.id  = 'ss-concept-panel';
    panel.style.cssText = [
      'display:none;position:fixed;bottom:80px;left:50%;transform:translateX(-50%);',
      'width:min(420px,90vw);max-height:260px;overflow-y:auto;',
      'background:#002e5b;color:#e8edf5;border-radius:14px;',
      'padding:14px 16px;font-size:.83rem;line-height:1.7;',
      'box-shadow:0 8px 32px rgba(0,0,0,.35);z-index:9000;',
      'white-space:pre-wrap;word-break:break-word;'
    ].join('');
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'position:absolute;top:8px;right:10px;background:transparent;border:none;color:#aac4e8;font-size:14px;cursor:pointer;';
    closeBtn.onclick = function(){ panel.style.display = 'none'; };
    panel.appendChild(closeBtn);
    var panelText = document.createElement('div');
    panel.appendChild(panelText);
    document.body.appendChild(panel);

    /* Listen for answer clicks across all page types */
    document.addEventListener('click', async function(e) {
      /* Detect radio button or option click */
      var radio  = e.target.closest('input[type="radio"]');
      var optBtn = e.target.closest('.opt-btn');
      if (!radio && !optBtn) return;

      /* Small delay so existing page logic runs first */
      await new Promise(function(r){ setTimeout(r, 400); });

      /* Try to find if answer was wrong by checking page state */
      var questionText = '';
      var chosenText   = '';
      var correctText  = '';

      if (radio) {
        var qBlock = radio.closest('.question, .qa, [class*="question"], li');
        if (qBlock) questionText = qBlock.textContent.trim().slice(0, 200);
        chosenText = radio.parentElement ? radio.parentElement.textContent.trim().slice(0,60) : '';
      }

      if (optBtn) {
        var qCard = optBtn.closest('[id*="q-card"], .q-card, main');
        if (qCard) {
          var qTextEl = qCard.querySelector('[id*="qText"], .q-text, p');
          if (qTextEl) questionText = qTextEl.textContent.trim().slice(0, 200);
        }
        if (optBtn.classList.contains('wrong')) {
          chosenText  = optBtn.textContent.trim().slice(0,60);
          var correct = optBtn.parentElement && optBtn.parentElement.querySelector('.correct');
          if (correct) correctText = correct.textContent.trim().slice(0,60);
        } else {
          return; /* Don't show panel for correct answers */
        }
      }

      if (!questionText && !chosenText) return;

      /* Show panel */
      panelText.textContent = getLang() === 'hi' ? '🤖 AI सोच रहा है...' : '🤖 AI thinking...';
      panel.style.display = 'block';

      var prompt = 'Question: ' + questionText + '\nStudent chose: ' + chosenText + (correctText ? '\nCorrect answer: ' + correctText : '') + '\nExplain why the student is wrong and the correct approach. Max 100 words.';
      var sys    = baseSystem() + ' Give a brief, encouraging explanation. Start with "❌" then explain the mistake. End with "💡 Trick:" and give a memory shortcut.';

      streamToElement(prompt, sys, panelText);
    }, true);
  }

  /* ═══════════════════════════════════════════
     TECHNIQUE 4: AI DAILY MOTIVATOR
     Shows personalised message on index pages
  ═══════════════════════════════════════════ */
  async function injectDailyMotivator() {
    var pageType = detectPage();
    if (!['index','dashboard'].includes(pageType)) return;

    /* Check if shown today */
    var today = new Date().toISOString().slice(0,10);
    var shown;
    try { shown = localStorage.getItem('ss_motivator_date'); } catch(e){}
    if (shown === today) return;

    var stats  = getGamStats();
    var name   = getStudentName();
    var course = detectCourse();
    var hour   = new Date().getHours();
    var greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    var banner = document.createElement('div');
    banner.id  = 'ss-motivator';
    banner.style.cssText = [
      'background:linear-gradient(135deg,#002e5b 0%,#003e7a 100%);',
      'color:#fff;padding:14px 18px;border-radius:12px;margin:12px 0;',
      'font-size:.85rem;line-height:1.7;position:relative;',
      'border-left:4px solid #f5a623;'
    ].join('');
    var closeX = document.createElement('button');
    closeX.textContent = '✕';
    closeX.style.cssText = 'position:absolute;top:8px;right:10px;background:transparent;border:none;color:#aac4e8;cursor:pointer;font-size:13px;';
    closeX.onclick = function(){ banner.style.display='none'; };
    banner.appendChild(closeX);
    var msgEl = document.createElement('div');
    msgEl.textContent = '🤖 ' + greeting + ', ' + name + '! Loading your personalised message...';
    banner.appendChild(msgEl);

    /* Insert at top of main content */
    var main = document.querySelector('main, .wrap, #content, body');
    var first = main ? main.firstChild : null;
    if (main && first) main.insertBefore(banner, first);
    else document.body.insertBefore(banner, document.body.firstChild);

    /* Generate AI message */
    var prompt = greeting + ' ' + name + '! Stats: XP=' + stats.xp + ', streak=' + stats.streak + ' days, correct answers=' + stats.totalCorrect + ', course=' + course + '. Write ONE encouraging message (2 sentences max) for today\'s study session.';
    var sys = baseSystem() + ' Write a short, warm, personal motivational message. Include an exam-relevant tip. No bullet points.';

    var result = await callAPI(prompt, sys);
    if (result) {
      msgEl.textContent = '🌟 ' + result;
      try { localStorage.setItem('ss_motivator_date', today); } catch(e){}
    }
  }

  /* ═══════════════════════════════════════════
     TECHNIQUE 5: AI WEAK SPOT DETECTOR
     Shows "Focus on THIS today" based on data
  ═══════════════════════════════════════════ */
  function injectWeakSpotBanner() {
    var pageType = detectPage();
    if (!['index','dashboard'].includes(pageType)) return;

    var stats = getGamStats();
    var weak  = stats.weakAreas || {};
    var topWeak = Object.entries(weak).sort(function(a,b){ return b[1]-a[1]; }).slice(0,3).map(function(e){ return e[0]; });
    if (!topWeak.length) return;

    var banner = document.createElement('div');
    banner.style.cssText = [
      'background:#fff8e1;border:1px solid #ffe082;border-radius:10px;',
      'padding:10px 16px;margin:10px 0;font-size:.83rem;',
      'display:flex;align-items:center;gap:10px;flex-wrap:wrap;'
    ].join('');
    banner.innerHTML = '<span style="font-size:16px;">🎯</span>' +
      '<span style="color:#6b4400;font-weight:500;">' +
        (getLang() === 'hi'
          ? 'आज focus करें: <strong>' + topWeak.join(', ') + '</strong> — ये आपके weak areas हैं।'
          : 'Today\'s focus: <strong>' + topWeak.join(', ') + '</strong> — your weak areas.') +
      '</span>';
    var main = document.querySelector('main, .wrap, body');
    if (main) main.insertBefore(banner, main.querySelector('#ss-motivator') ? document.getElementById('ss-motivator').nextSibling : main.firstChild);
  }

  /* ═══════════════════════════════════════════
     TECHNIQUE 6: AI VOICE TUTOR
     Adds voice button to chapter explainer panel
  ═══════════════════════════════════════════ */
  function setupVoiceTutor() {
    if (!window.speechSynthesis) return;

    global.SSAI_speak = function(text, lang) {
      window.speechSynthesis.cancel();
      if (!text || !text.trim()) return;
      var utter       = new SpeechSynthesisUtterance(text.slice(0, 800));
      utter.lang      = (lang || getLang()) === 'hi' ? 'hi-IN' : 'en-IN';
      utter.rate      = 0.95;
      utter.pitch     = 1.05;
      window.speechSynthesis.speak(utter);
    };

    /* Add voice button to explainer panel after it has content */
    document.addEventListener('click', function(e) {
      if (e.target.id !== 'ss-ai-explain-btn') return;
      setTimeout(function() {
        var panel = document.getElementById('ss-ai-explain-panel');
        if (!panel || document.getElementById('ss-voice-btn')) return;
        var vBtn = document.createElement('button');
        vBtn.id  = 'ss-voice-btn';
        vBtn.textContent = '🔊 सुनें / Listen';
        vBtn.style.cssText = 'display:inline-block;margin-top:8px;padding:5px 12px;border-radius:20px;border:1px solid #aec4ef;background:#fff;color:#002e5b;font-size:.75rem;cursor:pointer;font-family:"Baloo 2",system-ui;';
        vBtn.onclick = function() {
          var txt = panel.textContent.replace('🔊 सुनें / Listen','').trim();
          global.SSAI_speak(txt, getLang());
        };
        panel.appendChild(vBtn);
      }, 3000);
    });
  }

  /* ═══════════════════════════════════════════
     TECHNIQUE 7: AI SPEED COACH
     Monitors time on mock/practice pages
  ═══════════════════════════════════════════ */
  function setupSpeedCoach() {
    var pageType = detectPage();
    if (!['mock','math','reasoning'].includes(pageType)) return;

    var qStartTime = Date.now();
    var warningEl  = null;

    function showSpeedWarning(msg) {
      if (!warningEl) {
        warningEl = document.createElement('div');
        warningEl.style.cssText = [
          'position:fixed;top:70px;right:12px;',
          'background:#fff3cd;border:1px solid #ffc107;border-radius:10px;',
          'padding:8px 14px;font-size:.78rem;color:#856404;',
          'z-index:9999;max-width:220px;line-height:1.4;',
          'box-shadow:0 2px 8px rgba(0,0,0,.1);'
        ].join('');
        document.body.appendChild(warningEl);
      }
      warningEl.textContent = msg;
      warningEl.style.display = 'block';
      setTimeout(function(){ if (warningEl) warningEl.style.display = 'none'; }, 4000);
    }

    /* Watch for question navigation */
    var lastQ = 0;
    setInterval(function() {
      var qNum = document.getElementById('currentQuestionNumber') || document.getElementById('qNumDisplay');
      if (!qNum) return;
      var curr = parseInt(qNum.textContent) || 0;
      if (curr !== lastQ) {
        var elapsed = Math.floor((Date.now() - qStartTime) / 1000);
        if (lastQ > 0) {
          if (elapsed < 8 && pageType === 'mock') {
            showSpeedWarning(getLang() === 'hi'
              ? '⚡ ' + elapsed + ' sec — बहुत जल्दी! Question ठीक से पढ़ें।'
              : '⚡ ' + elapsed + 's — Too fast! Read carefully.');
          } else if (elapsed > 90) {
            showSpeedWarning(getLang() === 'hi'
              ? '⏰ ' + elapsed + ' sec — बहुत time लग रहा है। अगला Q try करें।'
              : '⏰ ' + elapsed + 's — Taking long. Move to next Q.');
          }
        }
        qStartTime = Date.now();
        lastQ = curr;
      }
    }, 1000);
  }

  /* ═══════════════════════════════════════════
     TECHNIQUE 8: AI 7-DAY STUDY PLAN GENERATOR
     Floating button on dashboard/index pages
  ═══════════════════════════════════════════ */
  function injectStudyPlanGenerator() {
    var pageType = detectPage();
    if (!['index','dashboard'].includes(pageType)) return;

    var btn = document.createElement('button');
    btn.id  = 'ss-plan-btn';
    btn.innerHTML = '📅 AI 7-Day Plan बनाएं';
    btn.style.cssText = [
      'display:block;width:100%;max-width:300px;',
      'padding:11px 18px;background:#27ae60;color:#fff;',
      'border:none;border-radius:10px;margin:12px 0;',
      'font-family:"Baloo 2",system-ui;font-weight:700;font-size:.88rem;',
      'cursor:pointer;transition:background .2s;'
    ].join('');
    btn.onmouseover = function(){ this.style.background='#1e8e4e'; };
    btn.onmouseout  = function(){ this.style.background='#27ae60'; };

    var planPanel = document.createElement('div');
    planPanel.id  = 'ss-plan-panel';
    planPanel.style.cssText = [
      'display:none;background:#eafaf1;border:1px solid #a9dfbf;',
      'border-radius:10px;padding:16px;margin:8px 0;',
      'font-size:.85rem;line-height:1.8;color:#1a6e3e;',
      'white-space:pre-wrap;max-height:400px;overflow-y:auto;'
    ].join('');

    btn.onclick = async function() {
      planPanel.style.display = 'block';
      planPanel.textContent = '🤖 7-day plan generate हो रहा है...';
      btn.disabled = true;

      var stats  = getGamStats();
      var course = detectCourse();
      var name   = getStudentName();
      var weak   = Object.keys(stats.weakAreas || {}).slice(0,5).join(', ') || 'not identified yet';

      var prompt = 'Create a 7-day study plan for ' + name + ' preparing for ' + course + '.\nWeak topics: ' + weak + '\nCurrent XP: ' + stats.xp + ', streak: ' + stats.streak + ' days, correct answers: ' + stats.totalCorrect + '.\nPlan should be: Day-wise, realistic (2-3 hours/day), include specific chapters and practice targets. End with a motivational line.';
      var sys = baseSystem() + ' Create a structured 7-day study plan. Format: Day 1:, Day 2: etc. Be specific with chapter names. Include mock test on Day 5 and Day 7.';

      await streamToElement(prompt, sys, planPanel, function() {
        btn.disabled = false;
        /* Save plan */
        try { localStorage.setItem('ss_study_plan', planPanel.textContent); } catch(e){}
      });
    };

    /* Check for saved plan */
    try {
      var saved = localStorage.getItem('ss_study_plan');
      if (saved) {
        planPanel.textContent = saved;
        planPanel.style.display = 'block';
        btn.innerHTML = '📅 AI Plan Refresh करें';
      }
    } catch(e){}

    /* Find a good insertion point */
    var anchor = document.querySelector('main, .wrap, .grid, .card');
    if (anchor) {
      anchor.insertBefore(btn, anchor.firstChild);
      anchor.insertBefore(planPanel, btn.nextSibling);
    }
  }

  /* ─────────────────────────────────────────
     INJECT GLOBAL STYLES
  ───────────────────────────────────────── */
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '@keyframes ss-blink{0%,100%{opacity:1}50%{opacity:0}}',
      '#ss-ai-explain-btn:focus{outline:none;}',
      '#ss-concept-panel::-webkit-scrollbar{width:4px;}',
      '#ss-concept-panel::-webkit-scrollbar-thumb{background:#334;border-radius:4px;}',
      '#ss-plan-panel::-webkit-scrollbar{width:4px;}',
      '#ss-plan-panel::-webkit-scrollbar-thumb{background:#a9dfbf;border-radius:4px;}',
    ].join('');
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────── */
  var SSAI = {
    /* Stream explanation into any element */
    explain: function(topic, context, targetEl) {
      var sys = baseSystem() + ' Explain concisely for exam preparation.';
      var prompt = 'Explain: ' + topic + (context ? '\nContext: ' + context : '');
      streamToElement(prompt, sys, targetEl);
    },

    /* Get AI hint for a question */
    hint: async function(questionText, attemptNum) {
      var level = attemptNum >= 2 ? 'detailed' : 'gentle';
      var sys   = baseSystem() + ' Give a ' + level + ' hint without revealing the answer.';
      return await callAPI('Give a hint for: ' + questionText, sys);
    },

    /* Explain why an answer is wrong */
    whyWrong: async function(question, chosen, correct, targetEl) {
      var prompt = 'Q: ' + question + '\nStudent answered: ' + chosen + '\nCorrect: ' + correct + '\nExplain the mistake briefly.';
      var sys = baseSystem() + ' Be encouraging. Start with ❌ then explain. End with 💡 Trick.';
      if (targetEl) { streamToElement(prompt, sys, targetEl); }
      else { return await callAPI(prompt, sys); }
    },

    /* Generate full 7-day plan */
    generatePlan: async function(profile) {
      var sys = baseSystem() + ' Generate a structured 7-day study plan.';
      return await callAPI(JSON.stringify(profile), sys);
    },

    /* Voice tutor */
    speak: function(text, lang) {
      if (global.SSAI_speak) global.SSAI_speak(text, lang);
    },
  };

  /* ─────────────────────────────────────────
     INIT — run all techniques
  ───────────────────────────────────────── */
  function init() {
    injectStyles();

    /* Stagger init to not block page render */
    setTimeout(injectChapterExplainer, 600);
    setTimeout(injectConceptChecker,   800);
    setTimeout(setupVoiceTutor,        900);
    setTimeout(setupSpeedCoach,        1000);

    /* Heavy AI calls — longer delay */
    setTimeout(injectDailyMotivator,   1500);
    setTimeout(injectWeakSpotBanner,   1200);
    setTimeout(injectStudyPlanGenerator, 1300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.SSAI = SSAI;

})(window);
