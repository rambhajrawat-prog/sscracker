/**
 * SSCracker Gamification Engine v1.0
 * Shyamsthali LLP — AI EdTech Platform
 *
 * DROP-IN: Add one line to any SSCracker HTML page, just before </body>:
 *   <script src="../gamification.js"></script>
 *   (adjust path depth as needed — root pages use "gamification.js")
 *
 * FEATURES:
 *   - XP points system (correct answers, streaks, daily login, doubts)
 *   - Daily login streak with fire badge
 *   - Level system (10 levels, Recruit → Legend)
 *   - Floating HUD bar on every page (top-right)
 *   - Toast notifications for XP events
 *   - Leaderboard data written to localStorage
 *   - Public API: window.SSG.award(event, meta)
 *
 * USAGE FROM OTHER SCRIPTS:
 *   window.SSG.award('correct_answer', { subject: 'Math', chapter: 'Algebra' });
 *   window.SSG.award('doubt_submitted');
 *   window.SSG.award('mock_completed', { score: 78, total: 100 });
 *   window.SSG.award('streak_bonus');   // called automatically on daily login
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
     CONSTANTS
  ───────────────────────────────────────── */
  var STORAGE_KEY   = 'ss_gamification';
  var VERSION       = '1.0';

  var XP_TABLE = {
    correct_answer:    10,
    wrong_answer:       0,
    doubt_submitted:   15,
    mock_completed:    50,
    mock_perfect:     100,  // 90%+ score
    daily_login:        5,
    streak_3:          20,
    streak_7:          50,
    streak_14:        100,
    streak_30:        250,
    chapter_done:      30,
    first_doubt:       25,  // one-time bonus
  };

  var LEVELS = [
    { min:    0, max:   99,  name: 'Recruit',    nameHI: 'नवसैनिक',    badge: '🪖' },
    { min:  100, max:  299,  name: 'Cadet',      nameHI: 'कैडेट',      badge: '⭐' },
    { min:  300, max:  599,  name: 'Trainee',    nameHI: 'प्रशिक्षु',  badge: '🌟' },
    { min:  600, max:  999,  name: 'Scholar',    nameHI: 'विद्वान',    badge: '📚' },
    { min: 1000, max: 1599,  name: 'Expert',     nameHI: 'विशेषज्ञ',  badge: '🎯' },
    { min: 1600, max: 2399,  name: 'Champion',   nameHI: 'चैंपियन',   badge: '🏆' },
    { min: 2400, max: 3499,  name: 'Warrior',    nameHI: 'योद्धा',    badge: '⚔️' },
    { min: 3500, max: 4999,  name: 'Commander',  nameHI: 'कमांडर',    badge: '🎖️' },
    { min: 5000, max: 7499,  name: 'General',    nameHI: 'जनरल',      badge: '🌠' },
    { min: 7500, max: Infinity, name: 'Legend',  nameHI: 'लीजेंड',    badge: '👑' },
  ];

  var STREAKS = [
    { days: 3,  bonus: 'streak_3',  label: '3-day streak!' },
    { days: 7,  bonus: 'streak_7',  label: '7-day streak! 🔥' },
    { days: 14, bonus: 'streak_14', label: '14-day streak! 🔥🔥' },
    { days: 30, bonus: 'streak_30', label: '30-day streak! 👑' },
  ];

  var LANG = {
    hi: {
      xp_gained:      (n) => `+${n} XP मिले!`,
      level_up:       (l) => `Level Up! अब आप ${l.nameHI} हैं ${l.badge}`,
      streak:         (n) => `${n} दिन की streak! 🔥`,
      daily:          'आज का login bonus!',
      correct:        'सही जवाब! 🎯',
      doubt:          'Doubt पूछा! 💬',
      mock_done:      'Mock complete! 📝',
      chapter:        'Chapter पूरा! 📖',
    },
    en: {
      xp_gained:      (n) => `+${n} XP earned!`,
      level_up:       (l) => `Level Up! You are now ${l.name} ${l.badge}`,
      streak:         (n) => `${n}-day streak! 🔥`,
      daily:          'Daily login bonus!',
      correct:        'Correct answer! 🎯',
      doubt:          'Doubt asked! 💬',
      mock_done:      'Mock complete! 📝',
      chapter:        'Chapter complete! 📖',
    }
  };

  /* ─────────────────────────────────────────
     STATE MANAGEMENT
  ───────────────────────────────────────── */
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s.version === VERSION) return s;
      }
    } catch(e) {}
    return createFreshState();
  }

  function createFreshState() {
    var name = '';
    try { name = localStorage.getItem('ss_user_email') || localStorage.getItem('ss_user_name') || ''; } catch(e) {}
    return {
      version:        VERSION,
      name:           name,
      xp:             0,
      level:          0,
      streak:         0,
      lastLoginDate:  null,
      totalCorrect:   0,
      totalDoubts:    0,
      totalMocks:     0,
      chaptersViewed: [],
      achievements:   [],
      history:        [],   // [{event, xp, time, meta}]
      oneTimeDone:    {},   // track one-time bonuses
    };
  }

  function saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e) {}
  }

  /* ─────────────────────────────────────────
     CORE LOGIC
  ───────────────────────────────────────── */
  function getLevel(xp) {
    for (var i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].min) return i;
    }
    return 0;
  }

  function getLang() {
    var l = 'hi';
    try { l = localStorage.getItem('ss_ui_lang') || 'hi'; } catch(e) {}
    return LANG[l] || LANG.hi;
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function checkDailyLogin(state) {
    var today = todayStr();
    if (state.lastLoginDate === today) return state; // already logged in today

    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (state.lastLoginDate === yesterday) {
      state.streak += 1;
    } else {
      state.streak = 1; // reset streak
    }
    state.lastLoginDate = today;

    // Base daily XP
    grantXP(state, 'daily_login', {});

    // Streak milestone bonuses
    STREAKS.forEach(function(s) {
      if (state.streak === s.days) {
        grantXP(state, s.bonus, { days: s.days });
        showToast(getLang().streak(s.days), 'streak');
      }
    });

    return state;
  }

  function grantXP(state, event, meta) {
    var xp = XP_TABLE[event] || 0;
    if (!xp) return;

    var prevLevel = getLevel(state.xp);
    state.xp += xp;
    var newLevel = getLevel(state.xp);

    // Record history (keep last 50)
    state.history.unshift({ event: event, xp: xp, time: new Date().toISOString(), meta: meta || {} });
    if (state.history.length > 50) state.history = state.history.slice(0, 50);

    // Level up notification
    if (newLevel > prevLevel) {
      state.level = newLevel;
      setTimeout(function() {
        showToast(getLang().level_up(LEVELS[newLevel]), 'levelup');
        updateHUD(state);
      }, 800);
    } else {
      state.level = newLevel;
    }

    showToast(getLang().xp_gained(xp), 'xp');
    return xp;
  }

  /* ─────────────────────────────────────────
     PUBLIC AWARD API
  ───────────────────────────────────────── */
  function award(event, meta) {
    meta = meta || {};
    var state = loadState();

    switch (event) {
      case 'correct_answer':
        state.totalCorrect += 1;
        grantXP(state, 'correct_answer', meta);
        showToast(getLang().correct, 'correct');
        // Milestone every 10 correct
        if (state.totalCorrect % 10 === 0) {
          grantXP(state, 'correct_answer', meta); // bonus XP at milestone
        }
        break;

      case 'doubt_submitted':
        state.totalDoubts += 1;
        grantXP(state, 'doubt_submitted', meta);
        showToast(getLang().doubt, 'doubt');
        // First doubt one-time bonus
        if (!state.oneTimeDone.first_doubt) {
          state.oneTimeDone.first_doubt = true;
          grantXP(state, 'first_doubt', meta);
        }
        break;

      case 'mock_completed':
        state.totalMocks += 1;
        grantXP(state, 'mock_completed', meta);
        showToast(getLang().mock_done, 'mock');
        // Perfect score bonus
        if (meta.score && meta.total && (meta.score / meta.total) >= 0.9) {
          grantXP(state, 'mock_perfect', meta);
          showToast('90%+ score! Perfect bonus! 🌟', 'levelup');
        }
        break;

      case 'chapter_viewed':
        var cid = (meta.course || '') + '_' + (meta.chapter || '');
        if (state.chaptersViewed.indexOf(cid) === -1) {
          state.chaptersViewed.push(cid);
          grantXP(state, 'chapter_done', meta);
          showToast(getLang().chapter, 'chapter');
        }
        break;

      default:
        grantXP(state, event, meta);
    }

    // Update leaderboard snapshot
    updateLeaderboard(state);
    saveState(state);
    updateHUD(state);
  }

  /* ─────────────────────────────────────────
     LEADERBOARD (localStorage)
  ───────────────────────────────────────── */
  function updateLeaderboard(state) {
    var name = state.name || 'Student';
    var entry = {
      name:  name,
      xp:    state.xp,
      level: state.level,
      streak: state.streak,
      time:  new Date().toISOString(),
    };
    // Store own entry keyed by name
    var key = 'ss_lb_' + name.replace(/\s+/g, '_').slice(0, 20);
    try { localStorage.setItem(key, JSON.stringify(entry)); } catch(e) {}
  }

  /* ─────────────────────────────────────────
     HUD (floating bar injected into page)
  ───────────────────────────────────────── */
  var hudEl = null;

  function injectHUD() {
    if (document.getElementById('ss-hud')) return;

    var hud = document.createElement('div');
    hud.id = 'ss-hud';
    hud.innerHTML = '<div id="ss-hud-inner"></div>';
    document.body.appendChild(hud);

    // Styles
    var style = document.createElement('style');
    style.textContent = [
      '#ss-hud{',
        'position:fixed;top:10px;right:10px;z-index:99999;',
        'font-family:"Baloo 2",system-ui,sans-serif;',
      '}',
      '#ss-hud-inner{',
        'background:#002e5b;color:#fff;',
        'border-radius:30px;padding:6px 14px 6px 10px;',
        'display:flex;align-items:center;gap:8px;',
        'box-shadow:0 4px 16px rgba(0,0,0,.35);',
        'cursor:pointer;transition:transform .15s;',
        'border:1.5px solid rgba(255,255,255,.15);',
        'font-size:13px;font-weight:600;',
      '}',
      '#ss-hud-inner:hover{transform:scale(1.04);}',
      '#ss-hud-xp{color:#f5a623;font-weight:700;font-size:14px;}',
      '#ss-hud-streak{color:#ff7043;}',
      '#ss-hud-level{',
        'background:rgba(255,255,255,.12);',
        'border-radius:20px;padding:2px 8px;',
        'font-size:11px;color:#cde0f5;',
      '}',
      '#ss-hud-bar-wrap{',
        'width:60px;height:5px;',
        'background:rgba(255,255,255,.15);',
        'border-radius:3px;overflow:hidden;',
      '}',
      '#ss-hud-bar{height:100%;background:#f5a623;border-radius:3px;transition:width .4s;}',
      /* Toast */
      '.ss-toast{',
        'position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(20px);',
        'background:#002e5b;color:#fff;',
        'padding:10px 20px;border-radius:30px;',
        'font-family:"Baloo 2",system-ui,sans-serif;',
        'font-size:14px;font-weight:600;',
        'box-shadow:0 4px 20px rgba(0,0,0,.3);',
        'z-index:999999;opacity:0;',
        'transition:opacity .25s,transform .25s;',
        'white-space:nowrap;pointer-events:none;',
      '}',
      '.ss-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}',
      '.ss-toast.xp{border-left:4px solid #f5a623;}',
      '.ss-toast.correct{border-left:4px solid #4caf50;}',
      '.ss-toast.streak{border-left:4px solid #ff7043;}',
      '.ss-toast.levelup{',
        'background:#1b3a6b;border-left:4px solid #f5a623;',
        'font-size:15px;',
      '}',
      '.ss-toast.doubt{border-left:4px solid #2196f3;}',
      '.ss-toast.mock{border-left:4px solid #9c27b0;}',
      '.ss-toast.chapter{border-left:4px solid #009688;}',
    ].join('');
    document.head.appendChild(style);

    hudEl = hud;
    hud.addEventListener('click', function() {
      window.location.href = resolveLeaderboardPath();
    });
  }

  function resolveLeaderboardPath() {
    // Detect depth by counting path segments
    var parts = window.location.pathname.split('/').filter(Boolean);
    var depth = parts.length;
    // If served from file:// or root, depth might be 0 or 1
    if (depth <= 1) return 'leaderboard.html';
    return '../'.repeat(depth - 1) + 'leaderboard.html';
  }

  function updateHUD(state) {
    if (!hudEl) return;
    var lvl  = LEVELS[state.level] || LEVELS[0];
    var next = LEVELS[state.level + 1];
    var pct  = next
      ? Math.round(((state.xp - lvl.min) / (next.min - lvl.min)) * 100)
      : 100;
    pct = Math.min(100, Math.max(0, pct));

    var streakHtml = state.streak >= 2
      ? '<span id="ss-hud-streak">🔥' + state.streak + '</span>' : '';

    document.getElementById('ss-hud-inner').innerHTML =
      '<span>' + lvl.badge + '</span>' +
      '<span id="ss-hud-xp">' + state.xp + ' XP</span>' +
      streakHtml +
      '<span id="ss-hud-level">' + lvl.name + '</span>' +
      '<div id="ss-hud-bar-wrap"><div id="ss-hud-bar" style="width:' + pct + '%"></div></div>';
  }

  /* ─────────────────────────────────────────
     TOAST NOTIFICATIONS
  ───────────────────────────────────────── */
  var toastQueue  = [];
  var toastActive = false;

  function showToast(msg, type) {
    toastQueue.push({ msg: msg, type: type || 'xp' });
    if (!toastActive) processToastQueue();
  }

  function processToastQueue() {
    if (!toastQueue.length) { toastActive = false; return; }
    toastActive = true;
    var item = toastQueue.shift();

    var el = document.createElement('div');
    el.className = 'ss-toast ' + item.type;
    el.textContent = item.msg;
    document.body.appendChild(el);

    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        el.classList.add('show');
        setTimeout(function() {
          el.classList.remove('show');
          setTimeout(function() {
            if (el.parentNode) el.parentNode.removeChild(el);
            processToastQueue();
          }, 280);
        }, 2000);
      });
    });
  }

  /* ─────────────────────────────────────────
     AUTO-DETECT PAGE & AWARD XP
  ───────────────────────────────────────── */
  function autoDetectPage() {
    var path = window.location.pathname.toLowerCase();
    var page = path.split('/').pop();

    // Detect chapter page visits
    var chapterPages = [
      'math', 'gat', 'reasoning', 'english', 'gk', 'science',
      'history', 'geography', 'polity', 'economics', 'physics',
      'chemistry', 'biology', 'current', 'computer'
    ];
    var isChapter = chapterPages.some(function(k) { return page.indexOf(k) >= 0; });
    if (isChapter && page.indexOf('index') < 0) {
      var course = path.indexOf('nda') >= 0 ? 'NDA'
                 : path.indexOf('delhi') >= 0 ? 'DP'
                 : path.indexOf('ssc') >= 0   ? 'SSCGD' : 'Other';
      award('chapter_viewed', { course: course, chapter: page.replace('.html','') });
    }
  }

  /* ─────────────────────────────────────────
     HOOK INTO EXISTING QUESTION ANSWERING
     (patches any onclick that checks answers)
  ───────────────────────────────────────── */
  function patchAnswerButtons() {
    // The existing SSCracker pages use .opt buttons with .answer divs
    // We listen at document level for clicks
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.opt');
      if (!btn) return;
      // Small delay to let existing handler run first
      setTimeout(function() {
        var answerDiv = btn.closest('.qa') && btn.closest('.qa').querySelector('.answer');
        if (answerDiv && answerDiv.style.display !== 'none') {
          // Check if this was the correct answer (existing code shows answer div on correct click)
          // We award XP — if truly wrong, existing code still shows the answer
          award('correct_answer', { page: window.location.pathname });
        }
      }, 50);
    }, true);
  }

  /* ─────────────────────────────────────────
     HOOK INTO DOUBT FORM SUBMIT
  ───────────────────────────────────────── */
  function patchDoubtForm() {
    var form = document.getElementById('doubtForm');
    if (!form) return;
    form.addEventListener('submit', function() {
      // Award after a short delay so main handler runs first
      setTimeout(function() { award('doubt_submitted', {}); }, 200);
    }, { once: false, capture: false, passive: true });
  }

  /* ─────────────────────────────────────────
     GET STATS (for dashboard use)
  ───────────────────────────────────────── */
  function getStats() {
    var state = loadState();
    var lvl = LEVELS[state.level] || LEVELS[0];
    var next = LEVELS[state.level + 1];
    var pct = next
      ? Math.round(((state.xp - lvl.min) / (next.min - lvl.min)) * 100)
      : 100;
    return {
      xp:            state.xp,
      level:         state.level,
      levelName:     lvl.name,
      levelNameHI:   lvl.nameHI,
      levelBadge:    lvl.badge,
      nextLevel:     next ? next.name : null,
      xpToNext:      next ? (next.min - state.xp) : 0,
      progressPct:   pct,
      streak:        state.streak,
      totalCorrect:  state.totalCorrect,
      totalDoubts:   state.totalDoubts,
      totalMocks:    state.totalMocks,
      chaptersViewed:state.chaptersViewed.length,
      history:       state.history.slice(0, 10),
    };
  }

  /* ─────────────────────────────────────────
     INIT
  ───────────────────────────────────────── */
  function init() {
    var state = loadState();
    state = checkDailyLogin(state);
    saveState(state);

    injectHUD();
    updateHUD(state);
    autoDetectPage();
    patchAnswerButtons();
    patchDoubtForm();

    // Show daily login toast (after short delay so page is visible)
    setTimeout(function() {
      if (state.lastLoginDate === todayStr()) {
        showToast(getLang().daily, 'xp');
      }
    }, 1200);
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ─────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────── */
  window.SSG = {
    award:    award,
    getStats: getStats,
    levels:   LEVELS,
    xpTable:  XP_TABLE,
  };

})();
