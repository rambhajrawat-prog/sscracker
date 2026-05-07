/**
 * SSCracker Language Toggle System v1.0
 * Shyamsthali LLP — AI EdTech Platform
 *
 * DROP-IN: Add ONE line to any SSCracker HTML page, just before </body>:
 *   <script src="../lang.js"></script>
 *   (root pages use "lang.js", subfolders use "../lang.js", etc.)
 *
 * WHAT IT DOES:
 *   1. Injects a floating HI/EN toggle button on every page (top-left)
 *   2. Translates ALL static UI text on the page via data-t="key" attributes
 *   3. Translates pages that DON'T have data-t by scanning known text patterns
 *   4. Remembers language preference in localStorage
 *   5. Works alongside gamification.js — both can be on same page
 *
 * USAGE IN NEW PAGES (add data-t to elements):
 *   <h1 data-t="home.title">Online Coaching</h1>
 *   <button data-t="nav.askDoubt">Ask Doubt</button>
 *
 * USAGE FROM OTHER SCRIPTS (programmatic):
 *   window.SSLang.set('hi');      // switch to Hindi
 *   window.SSLang.set('en');      // switch to English
 *   window.SSLang.get();          // returns 'hi' or 'en'
 *   window.SSLang.t('key');       // get translation string
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
     TRANSLATION DICTIONARY
  ───────────────────────────────────────── */
  var DICT = {

    /* ── Navigation & common UI ── */
    'nav.home':         { hi: '🏠 होम',              en: '🏠 Home' },
    'nav.nda':          { hi: '📘 NDA',              en: '📘 NDA' },
    'nav.dp':           { hi: '👮 Delhi Police',     en: '👮 Delhi Police' },
    'nav.sscgd':        { hi: '🛡️ SSC GD',          en: '🛡️ SSC GD' },
    'nav.askDoubt':     { hi: '💬 Doubt पूछें',      en: '💬 Ask Doubt' },
    'nav.leaderboard':  { hi: '🏆 Leaderboard',      en: '🏆 Leaderboard' },
    'nav.dashboard':    { hi: '📊 Dashboard',        en: '📊 Dashboard' },
    'nav.back':         { hi: '← वापस',             en: '← Back' },
    'nav.login':        { hi: 'Login',               en: 'Login' },

    /* ── Home page ── */
    'home.badge':       { hi: 'Launch के लिए तैयार', en: 'Ready to Launch' },
    'home.title':       { hi: 'Online Competitive Exam Preparation', en: 'Online Competitive Exam Preparation' },
    'home.sub':         { hi: 'नीचे अपना course चुनें। सब कुछ mobile-friendly और fully interlinked है।', en: 'Choose your course below. Everything is mobile-friendly and fully interlinked.' },
    'home.nda.sub':     { hi: 'Paper 1 + Paper 2 • Full Course',     en: 'Paper 1 + Paper 2 • Full Course' },
    'home.dp.sub':      { hi: 'Constable + Mock Tests',              en: 'Constable + Mock Tests' },
    'home.sscgd.sub':   { hi: 'Reasoning • Maths • GK • Language • Mock Tests', en: 'Reasoning • Maths • GK • Language • Mock Tests' },
    'home.doubtBtn':    { hi: '💬 Doubt / Support',                  en: '💬 Ask Doubt / Support' },

    /* ── NDA index page ── */
    'nda.title':        { hi: 'Shyamsthali LLP (SSCracker)',         en: 'Shyamsthali LLP (SSCracker)' },
    'nda.sub':          { hi: 'NDA Free Basic Course – Maths + GAT', en: 'NDA Free Basic Course – Maths + GAT' },
    'nda.marquee':      { hi: '📌 NDA Exam साल में दो बार होता है। Latest notifications के लिए UPSC की official website देखें।', en: '📌 NDA Exam is held twice every year. Please check the official UPSC website for latest notifications.' },
    'nda.btn.about':    { hi: 'NDA के बारे में',                    en: 'About NDA' },
    'nda.btn.math':     { hi: 'गणित',                               en: 'Math' },
    'nda.btn.gat':      { hi: 'GAT',                                 en: 'GAT' },
    'nda.btn.mock':     { hi: 'Mock Tests',                          en: 'Mock Tests' },
    'nda.btn.current':  { hi: 'Current Affairs',                     en: 'Current Affairs' },
    'nda.btn.notes':    { hi: 'Study Notes',                         en: 'Study Notes' },
    'nda.btn.plan':     { hi: '4-Week Plan',                         en: '4-Week Plan' },
    'nda.btn.doubt':    { hi: 'Doubt पूछें',                        en: 'Ask Doubt' },
    'nda.btn.login':    { hi: 'Login',                               en: 'Login' },
    'nda.sec.math':     { hi: 'गणित – Basic Course',                en: 'Math – Basic Course' },
    'nda.sec.gat':      { hi: 'GAT – Basic Course',                  en: 'GAT – Basic Course' },
    'nda.sec.mock':     { hi: 'NDA Mock Tests',                      en: 'NDA Mock Tests' },
    'nda.sec.current':  { hi: 'Current Affairs',                     en: 'Current Affairs' },
    'nda.sec.notes':    { hi: 'NDA Study Notes',                     en: 'NDA Study Notes' },
    'nda.sec.plan':     { hi: 'NDA 4-Week Study Plan',               en: 'NDA 4-Week Study Plan' },
    'nda.sec.doubt':    { hi: 'Doubt पूछें',                        en: 'Ask a Doubt' },
    'nda.sec.login':    { hi: 'Login',                               en: 'Login' },
    'nda.open.math':    { hi: 'Math Index खोलें',                   en: 'Open Math Index' },
    'nda.open.gat':     { hi: 'GAT Index खोलें',                    en: 'Open GAT Index' },
    'nda.open.mock':    { hi: 'Mock Tests शुरू करें',               en: 'Start Mock Tests' },
    'nda.open.current': { hi: 'Current Affairs देखें',              en: 'Open Current Affairs' },
    'nda.open.notes':   { hi: 'NDA Study Notes देखें',              en: 'Open NDA Study Notes' },
    'nda.open.plan':    { hi: 'Study Plan देखें',                   en: 'Open Study Plan' },
    'nda.open.doubt':   { hi: 'Doubt पूछें',                        en: 'Ask your question' },
    'nda.open.login':   { hi: 'Login Page पर जाएं',                 en: 'Go to Login Page' },
    'nda.founder.link': { hi: 'Founder के बारे में – Ram Bhaj Rawat', en: 'About Founder – Ram Bhaj Rawat' },

    /* ── Delhi Police index ── */
    'dp.title':         { hi: 'Shyamsthali LLP – Delhi Police Constable Course', en: 'Shyamsthali LLP – Delhi Police Constable Course' },
    'dp.btn.overview':  { hi: 'Overview',                            en: 'Overview' },
    'dp.btn.subjects':  { hi: 'Subjects',                            en: 'Subjects' },
    'dp.btn.mock':      { hi: 'Mock Tests (5)',                       en: 'Mock Tests (5)' },
    'dp.btn.dates':     { hi: 'Important Dates',                     en: 'Important Dates' },
    'dp.btn.roadmap':   { hi: 'Preparation Roadmap',                 en: 'Preparation Roadmap' },
    'dp.btn.doubt':     { hi: 'Doubt पूछें',                        en: 'Ask Doubt' },
    'dp.sec.welcome':   { hi: 'Delhi Police Constable Free Course में आपका स्वागत है', en: 'Welcome to Delhi Police Constable Free Course' },
    'dp.sec.subjects':  { hi: 'Subjects & Chapter-wise Material',    en: 'Subjects & Chapter-wise Material' },
    'dp.sec.mock':      { hi: 'Delhi Police Mock Tests (5 Sets)',     en: 'Delhi Police Mock Tests (5 Sets)' },
    'dp.sec.dates':     { hi: 'Important Dates – Student Planner',   en: 'Important Dates – Student Planner' },
    'dp.sec.roadmap':   { hi: 'Preparation Roadmap',                 en: 'Preparation Roadmap' },
    'dp.sec.doubt':     { hi: 'Doubt पूछें – Delhi Police',         en: 'Ask Your Doubt – Delhi Police' },

    /* ── SSC GD index ── */
    'sscgd.title':      { hi: 'SSC (GD) – Complete Course',          en: 'SSC (GD) – Complete Course' },
    'sscgd.sub':        { hi: 'Reasoning • Maths • GK/GA • Language (English + Hindi) • Full Mock Tests', en: 'Reasoning • Maths • GK/GA • Language (English + Hindi) • Full Mock Tests' },
    'sscgd.reasoning':  { hi: 'Reasoning',                           en: 'Reasoning' },
    'sscgd.math':       { hi: 'Maths',                               en: 'Maths' },
    'sscgd.gk':         { hi: 'GK / General Awareness',             en: 'GK / General Awareness' },
    'sscgd.language':   { hi: 'Language',                            en: 'Language' },
    'sscgd.mock':       { hi: 'Full Mock Tests',                     en: 'Full Mock Tests' },
    'sscgd.doubt':      { hi: 'Doubt पूछें',                        en: 'Ask Doubt' },

    /* ── Ask Doubt page ── */
    'doubt.title':      { hi: 'Doubt पूछें',                        en: 'Ask a Doubt' },
    'doubt.sub':        { hi: 'कोई भी subject — AI Tutor 3 seconds में जवाब देगा।', en: 'Any subject — AI Tutor answers in 3 seconds.' },
    'doubt.name':       { hi: 'नाम',                                 en: 'Name' },
    'doubt.course':     { hi: 'Course',                              en: 'Course' },
    'doubt.subject':    { hi: 'Subject / विषय',                     en: 'Subject' },
    'doubt.chapter':    { hi: 'Chapter / अध्याय',                   en: 'Chapter' },
    'doubt.question':   { hi: 'आपका Doubt',                         en: 'Your Doubt / Question' },
    'doubt.submit':     { hi: '✨ AI Tutor से पूछिए',               en: '✨ Ask AI Tutor' },
    'doubt.ansLang':    { hi: 'जवाब किस भाषा में चाहिए?',          en: 'Answer language' },

    /* ── Dashboard ── */
    'dash.title':       { hi: 'मेरा Dashboard',                     en: 'My Dashboard' },
    'dash.chapters':    { hi: 'Chapters\nVisited',                  en: 'Chapters\nVisited' },
    'dash.mocks':       { hi: 'Mocks\nAttempted',                   en: 'Mocks\nAttempted' },
    'dash.doubts':      { hi: 'Doubts\nAsked',                      en: 'Doubts\nAsked' },
    'dash.streak':      { hi: 'Day\nStreak',                        en: 'Day\nStreak' },
    'dash.level':       { hi: 'Current\nLevel',                     en: 'Current\nLevel' },

    /* ── Leaderboard ── */
    'lb.title':         { hi: 'All-India Leaderboard',              en: 'All-India Leaderboard' },
    'lb.sub':           { hi: 'अपने साथी aspirants से compare करें।', en: 'Compare with fellow aspirants.' },

    /* ── Common UI ── */
    'ui.start':         { hi: 'शुरू करें',                          en: 'Start' },
    'ui.submit':        { hi: 'Submit करें',                        en: 'Submit' },
    'ui.back':          { hi: '← वापस',                            en: '← Back' },
    'ui.next':          { hi: 'अगला →',                            en: 'Next →' },
    'ui.prev':          { hi: '← पिछला',                           en: '← Previous' },
    'ui.loading':       { hi: 'लोड हो रहा है...',                  en: 'Loading...' },
    'ui.correct':       { hi: '✅ सही जवाब!',                      en: '✅ Correct!' },
    'ui.wrong':         { hi: '❌ गलत जवाब',                       en: '❌ Wrong answer' },
    'ui.showAnswer':    { hi: 'जवाब देखें',                        en: 'Show Answer' },
    'ui.hint':          { hi: '💡 Hint लें',                       en: '💡 Get Hint' },
    'ui.mockStart':     { hi: 'Mock Test शुरू करें',               en: 'Start Mock Test' },
    'ui.mockSubmit':    { hi: 'Mock Submit करें',                   en: 'Submit Mock' },
    'ui.timer':         { hi: 'समय बाकी',                          en: 'Time Remaining' },
    'ui.score':         { hi: 'आपका Score',                        en: 'Your Score' },
    'ui.accuracy':      { hi: 'Accuracy',                           en: 'Accuracy' },
    'ui.rank':          { hi: 'आपकी Rank',                         en: 'Your Rank' },
  };

  /* ─────────────────────────────────────────
     PAGE-SPECIFIC PATTERN TRANSLATIONS
     These handle pages that don't have data-t
     attributes — we match text and swap it.
  ───────────────────────────────────────── */
  var PAGE_PATTERNS = {
    /* key = partial text to match, value = {hi, en} */
    'Online Competitive Exam Preparation': {
      hi: 'Online Competitive Exam Preparation',
      en: 'Online Competitive Exam Preparation'
    },
    'Choose your course below': {
      hi: 'नीचे अपना course चुनें। सब कुछ mobile-friendly और fully interlinked है।',
      en: 'Choose your course below. Everything is mobile-friendly and fully interlinked.'
    },
    'Ask Doubt / Support': {
      hi: 'Doubt / Support',
      en: 'Ask Doubt / Support'
    },
    'Paper 1 + Paper 2': {
      hi: 'Paper 1 + Paper 2 • Full Course',
      en: 'Paper 1 + Paper 2 • Full Course'
    },
    'Constable + Mock Tests': {
      hi: 'Constable + Mock Tests',
      en: 'Constable + Mock Tests'
    },
    'NDA Free Basic Course': {
      hi: 'NDA Free Basic Course – Maths + GAT',
      en: 'NDA Free Basic Course – Maths + GAT'
    },
    'demo version': {
      hi: 'AI Tutor से तुरंत जवाब पाएं — Hindi या English में।',
      en: 'Get instant answers from AI Tutor — in Hindi or English.'
    },
    'front-end demo': {
      hi: 'यह AI-powered version है।',
      en: 'This is the AI-powered version.'
    },
    'NDA Exam is held twice': {
      hi: 'NDA Exam साल में दो बार होता है। Latest notifications के लिए UPSC की official website देखें।',
      en: 'NDA Exam is held twice every year. Please check the official UPSC website for latest notifications.'
    },
    'Doubt saved locally': {
      hi: '✅ AI Tutor ने जवाब दे दिया।',
      en: '✅ AI Tutor has answered.'
    },
    'track your journey': {
      hi: 'अपनी तैयारी track करें',
      en: 'Track your preparation journey'
    },
  };

  /* ─────────────────────────────────────────
     SUBJECT / SECTION TRANSLATIONS
  ───────────────────────────────────────── */
  var SUBJECT_MAP = {
    'Math':             { hi: 'गणित',          en: 'Math' },
    'Maths':            { hi: 'गणित',          en: 'Maths' },
    'GAT':              { hi: 'GAT',           en: 'GAT' },
    'Reasoning':        { hi: 'Reasoning',     en: 'Reasoning' },
    'English':          { hi: 'English',       en: 'English' },
    'General Knowledge':{ hi: 'सामान्य ज्ञान', en: 'General Knowledge' },
    'Current Affairs':  { hi: 'Current Affairs', en: 'Current Affairs' },
    'History':          { hi: 'इतिहास',        en: 'History' },
    'Geography':        { hi: 'भूगोल',         en: 'Geography' },
    'Polity':           { hi: 'राजनीति',       en: 'Polity' },
    'Economics':        { hi: 'अर्थशास्त्र',   en: 'Economics' },
    'Science':          { hi: 'विज्ञान',       en: 'Science' },
    'Physics':          { hi: 'भौतिकी',        en: 'Physics' },
    'Chemistry':        { hi: 'रसायन',         en: 'Chemistry' },
    'Biology':          { hi: 'जीव विज्ञान',   en: 'Biology' },
    'Computer':         { hi: 'Computer',      en: 'Computer' },
    'Strategy':         { hi: 'Strategy',      en: 'Strategy' },
    'Mock Tests':       { hi: 'Mock Tests',    en: 'Mock Tests' },
    'Study Plan':       { hi: 'Study Plan',    en: 'Study Plan' },
    'Study Notes':      { hi: 'Study Notes',   en: 'Study Notes' },
    'Ask Doubt':        { hi: 'Doubt पूछें',   en: 'Ask Doubt' },
    'Login':            { hi: 'Login',         en: 'Login' },
    'Leaderboard':      { hi: 'Leaderboard',   en: 'Leaderboard' },
    'Dashboard':        { hi: 'Dashboard',     en: 'Dashboard' },
    'Home':             { hi: 'होम',           en: 'Home' },
  };

  /* ─────────────────────────────────────────
     STATE
  ───────────────────────────────────────── */
  var currentLang = 'hi';

  function loadLang() {
    try { return localStorage.getItem('ss_ui_lang') || 'hi'; } catch(e) { return 'hi'; }
  }

  function saveLang(l) {
    try { localStorage.setItem('ss_ui_lang', l); } catch(e) {}
  }

  /* ─────────────────────────────────────────
     TRANSLATION HELPERS
  ───────────────────────────────────────── */
  function t(key) {
    var entry = DICT[key];
    if (!entry) return key;
    return entry[currentLang] || entry.en || key;
  }

  function getSubjectTranslation(text, lang) {
    var found = SUBJECT_MAP[text.trim()];
    if (found) return found[lang] || text;
    return null;
  }

  /* ─────────────────────────────────────────
     APPLY TRANSLATIONS TO PAGE
  ───────────────────────────────────────── */
  function applyTranslations(lang) {
    /* 1. Elements with data-t attribute */
    var tagged = document.querySelectorAll('[data-t]');
    tagged.forEach(function(el) {
      var key = el.getAttribute('data-t');
      var val = DICT[key];
      if (val) {
        var text = val[lang] || val.en;
        if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'email' || el.type === 'tel')) {
          el.placeholder = text;
        } else if (el.tagName === 'INPUT' && el.type === 'submit') {
          el.value = text;
        } else {
          el.textContent = text;
        }
      }
    });

    /* 2. Elements with data-t-placeholder */
    var phEls = document.querySelectorAll('[data-t-placeholder]');
    phEls.forEach(function(el) {
      var key = el.getAttribute('data-t-placeholder');
      var val = DICT[key];
      if (val) el.placeholder = val[lang] || val.en;
    });

    /* 3. Nav button text — scan nav buttons */
    var navBtns = document.querySelectorAll('nav button, nav a, header .links a, header a');
    navBtns.forEach(function(el) {
      var txt = el.textContent.trim();
      var tr = getSubjectTranslation(txt, lang);
      if (tr && tr !== txt) el.textContent = tr;
    });

    /* 4. Page-level pattern matching for pages without data-t */
    applyPagePatterns(lang);

    /* 5. Update <html lang> attribute */
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';

    /* 6. Update page title suffix */
    var title = document.title;
    if (title && !title.includes('–')) {
      document.title = title + ' – SSCracker';
    }
  }

  function applyPagePatterns(lang) {
    /* Scan text nodes for known patterns and swap them */
    Object.keys(PAGE_PATTERNS).forEach(function(pattern) {
      var replacement = PAGE_PATTERNS[pattern][lang];
      if (!replacement) return;

      /* Find elements containing this text */
      var allEls = document.querySelectorAll('p, h1, h2, h3, h4, span, div, li, td, .small, .badge, .note, .hi-note, .subtle');
      allEls.forEach(function(el) {
        /* Only swap direct text content, not if it has child elements with content */
        if (el.children.length === 0 && el.textContent.includes(pattern)) {
          el.textContent = replacement;
        }
      });
    });
  }

  /* ─────────────────────────────────────────
     INJECT TOGGLE BUTTON UI
  ───────────────────────────────────────── */
  function injectToggle() {
    if (document.getElementById('ss-lang-toggle')) return;

    var wrap = document.createElement('div');
    wrap.id = 'ss-lang-toggle';

    var style = document.createElement('style');
    style.textContent = [
      '#ss-lang-toggle{',
        'position:fixed;',
        'bottom:70px;',   /* above gamification HUD if present */
        'right:10px;',
        'z-index:99998;',
        'display:flex;',
        'flex-direction:column;',
        'gap:4px;',
      '}',
      '#ss-lang-inner{',
        'display:flex;',
        'background:#002e5b;',
        'border-radius:24px;',
        'padding:4px;',
        'gap:3px;',
        'box-shadow:0 3px 12px rgba(0,0,0,.3);',
        'border:1px solid rgba(255,255,255,.12);',
      '}',
      '.ssl-btn{',
        'padding:6px 13px;',
        'border-radius:20px;',
        'border:none;',
        'cursor:pointer;',
        'font-size:12px;',
        'font-weight:700;',
        'font-family:"Baloo 2",system-ui,sans-serif;',
        'transition:all .2s;',
        'background:transparent;',
        'color:rgba(255,255,255,.55);',
        'line-height:1.2;',
      '}',
      '.ssl-btn.active{',
        'background:#f5a623;',
        'color:#002e5b;',
      '}',
      '.ssl-btn:hover:not(.active){',
        'color:#fff;',
      '}',
      '#ss-lang-label{',
        'font-size:10px;',
        'color:rgba(255,255,255,.5);',
        'text-align:center;',
        'font-family:system-ui,sans-serif;',
        'letter-spacing:.04em;',
      '}',
      /* Tooltip on hover */
      '#ss-lang-toggle:hover #ss-lang-label{color:rgba(255,255,255,.8);}',
    ].join('');
    document.head.appendChild(style);

    wrap.innerHTML = [
      '<div id="ss-lang-inner">',
        '<button class="ssl-btn" id="ssl-hi" onclick="window.SSLang.set(\'hi\')">हिंदी</button>',
        '<button class="ssl-btn" id="ssl-en" onclick="window.SSLang.set(\'en\')">EN</button>',
      '</div>',
      '<div id="ss-lang-label">Language</div>',
    ].join('');

    document.body.appendChild(wrap);
  }

  function updateToggleUI(lang) {
    var hi = document.getElementById('ssl-hi');
    var en = document.getElementById('ssl-en');
    if (!hi || !en) return;
    hi.classList.toggle('active', lang === 'hi');
    en.classList.toggle('active', lang === 'en');
  }

  /* ─────────────────────────────────────────
     ALSO SYNC WITH ANY EXISTING LANG BUTTONS
     (for pages that already have their own)
  ───────────────────────────────────────── */
  function syncExistingButtons(lang) {
    /* Sync header lang toggles built into page templates */
    var existingHI = document.getElementById('btnHI') || document.getElementById('uiHI') || document.getElementById('langHI');
    var existingEN = document.getElementById('btnEN') || document.getElementById('uiEN') || document.getElementById('langEN');
    if (existingHI) existingHI.classList.toggle('active', lang === 'hi');
    if (existingEN) existingEN.classList.toggle('active', lang === 'en');
  }

  /* ─────────────────────────────────────────
     PUBLIC API — set language
  ───────────────────────────────────────── */
  function setLang(lang) {
    if (lang !== 'hi' && lang !== 'en') return;
    currentLang = lang;
    saveLang(lang);
    applyTranslations(lang);
    updateToggleUI(lang);
    syncExistingButtons(lang);

    /* Fire custom event so other scripts can react */
    try {
      window.dispatchEvent(new CustomEvent('ss-lang-change', { detail: { lang: lang } }));
    } catch(e) {}
  }

  /* ─────────────────────────────────────────
     INIT
  ───────────────────────────────────────── */
  function init() {
    currentLang = loadLang();

    /* Inject floating toggle */
    injectToggle();
    updateToggleUI(currentLang);

    /* Apply translations */
    applyTranslations(currentLang);
    syncExistingButtons(currentLang);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ─────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────── */
  window.SSLang = {
    set:   setLang,
    get:   function() { return currentLang; },
    t:     t,
    dict:  DICT,
  };

})();
