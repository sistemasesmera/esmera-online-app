import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  let welcomeMessage = "¡Hola! Soy el asistente virtual de Esmera Online. ¿En qué puedo ayudarte?";
  let isActive = true;

  try {
    const supabase = createAdminClient();
    const { data: config } = await supabase
      .from("agent_config")
      .select("welcome_message, is_active")
      .single();

    if (config) {
      welcomeMessage = config.welcome_message;
      isActive = config.is_active;
    }
  } catch {
    // If DB is unavailable, still serve the widget
  }

  const apiBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    req.nextUrl.origin;

  const apiKey = process.env.PUBLIC_API_KEY ?? "";

  const js = `/* Esmera Online Chat Widget */
(function() {
  if (document.getElementById('esmera-chat-root')) return;
  ${!isActive ? "return;" : ""}

  var API_BASE = ${JSON.stringify(apiBase)};
  var API_KEY  = ${JSON.stringify(apiKey)};
  var WELCOME  = ${JSON.stringify(welcomeMessage)};

  var NOTIF_MESSAGES = [
    { icon: '👋', text: '¿Tienes dudas sobre nuestros cursos? ¡Estoy aquí para ayudarte!' },
    { icon: '✨', text: '¿Sabías que ofrecemos financiación flexible? Pregúntame sin compromiso.' },
    { icon: '🎓', text: 'Tenemos más de 20 cursos de estética y belleza. ¿Cuál te interesa?' },
    { icon: '💬', text: '¡Hola! ¿Puedo ayudarte a elegir el curso perfecto para ti?' },
  ];

  /* ── Styles ── */
  var style = document.createElement('style');
  style.textContent = [
    '#esmera-chat-root * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }',

    /* Button */
    '#esmera-chat-btn {',
    '  position: fixed; bottom: 24px; right: 24px; z-index: 99998;',
    '  width: 56px; height: 56px; border-radius: 50%;',
    '  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border: none; cursor: pointer;',
    '  box-shadow: 0 4px 16px rgba(79,70,229,.45);',
    '  display: flex; align-items: center; justify-content: center;',
    '  transition: transform .2s, box-shadow .2s;',
    '}',
    '#esmera-chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 22px rgba(79,70,229,.6); }',
    '.ec-btn-icon { position: absolute; display: flex; align-items: center; justify-content: center; transition: opacity .22s, transform .22s cubic-bezier(.34,1.56,.64,1); }',
    '.ec-icon-msg svg { width: 26px; height: 26px; fill: #fff; }',
    '.ec-icon-x { font-size: 22px; color: #fff; opacity: 0; transform: rotate(90deg) scale(.7); }',
    '#esmera-chat-btn.ec-active .ec-icon-msg { opacity: 0; transform: rotate(-90deg) scale(.7); }',
    '#esmera-chat-btn.ec-active .ec-icon-x  { opacity: 1; transform: rotate(0) scale(1); }',

    /* Unread badge */
    '#ec-badge {',
    '  position: absolute; top: -2px; right: -2px; width: 14px; height: 14px;',
    '  background: #ef4444; border-radius: 50%; border: 2px solid #fff;',
    '  display: none;',
    '}',
    '#ec-badge.ec-show { display: block; }',

    /* Notification bubble */
    '@keyframes ec-notif-in  { from { opacity:0; transform:translateX(10px) scale(.96) } to { opacity:1; transform:none } }',
    '@keyframes ec-notif-out { from { opacity:1; transform:none } to { opacity:0; transform:translateX(10px) scale(.96) } }',
    '#ec-notif {',
    '  position: fixed; bottom: 92px; right: 24px; z-index: 99997;',
    '  background: #fff; border-radius: 14px; padding: 12px 12px 12px 14px;',
    '  box-shadow: 0 6px 28px rgba(0,0,0,.13), 0 1px 4px rgba(0,0,0,.07);',
    '  max-width: 230px; font-size: 13px; line-height: 1.45; color: #1e1b4b;',
    '  display: none; align-items: flex-start; gap: 9px; cursor: pointer;',
    '  border: 1px solid rgba(99,102,241,.15);',
    '}',
    '#ec-notif.ec-show   { display: flex; animation: ec-notif-in  .28s cubic-bezier(.34,1.56,.64,1) both; }',
    '#ec-notif.ec-hiding { animation: ec-notif-out .18s ease-in both; }',
    '.ec-notif-icon { font-size: 19px; line-height: 1; flex-shrink: 0; margin-top: 1px; }',
    '.ec-notif-text { flex: 1; font-size: 12.5px; }',
    '.ec-notif-close {',
    '  flex-shrink: 0; background: none; border: none; cursor: pointer;',
    '  color: #94a3b8; font-size: 14px; line-height: 1; padding: 2px; margin-top: -1px;',
    '  transition: color .15s; border-radius: 4px;',
    '}',
    '.ec-notif-close:hover { color: #475569; background: #f1f5f9; }',

    /* Chat box */
    '@keyframes ec-in  { from { opacity:0; transform:translateY(16px) scale(.95) } to { opacity:1; transform:none } }',
    '@keyframes ec-out { from { opacity:1; transform:none } to { opacity:0; transform:translateY(16px) scale(.95) } }',
    '#esmera-chat-box {',
    '  position: fixed; bottom: 92px; right: 24px; z-index: 99999;',
    '  width: 360px; max-width: calc(100vw - 32px);',
    '  height: 500px; max-height: calc(100vh - 120px);',
    '  background: #fff; border-radius: 18px;',
    '  box-shadow: 0 8px 40px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08);',
    '  display: none; flex-direction: column; overflow: hidden;',
    '  transform-origin: bottom right;',
    '}',
    '#esmera-chat-box.ec-open    { display:flex; animation: ec-in  .26s cubic-bezier(.34,1.56,.64,1) both; }',
    '#esmera-chat-box.ec-closing { animation: ec-out .16s ease-in both; }',

    /* Header */
    '#esmera-chat-header {',
    '  background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);',
    '  color: #fff; padding: 14px 16px;',
    '  display: flex; align-items: center; gap: 11px;',
    '}',
    '#esmera-chat-header .ec-avatar {',
    '  width: 40px; height: 40px; border-radius: 50%;',
    '  background: rgba(255,255,255,.18); border: 2px solid rgba(255,255,255,.4);',
    '  display: flex; align-items: center; justify-content: center; flex-shrink: 0;',
    '}',
    '#esmera-chat-header .ec-avatar svg { width: 22px; height: 22px; fill: #fff; }',
    '#esmera-chat-header .ec-name { font-weight: 700; font-size: 13.5px; letter-spacing: -.01em; line-height: 1.2; }',
    '#esmera-chat-header .ec-status { display: flex; align-items: center; gap: 5px; margin-top: 3px; }',
    '#esmera-chat-header .ec-dot {',
    '  width: 7px; height: 7px; border-radius: 50%; background: #4ade80; flex-shrink: 0;',
    '  animation: ec-pulse 2s infinite;',
    '}',
    '@keyframes ec-pulse { 0%{box-shadow:0 0 0 0 rgba(74,222,128,.65)} 70%{box-shadow:0 0 0 5px rgba(74,222,128,0)} 100%{box-shadow:0 0 0 0 rgba(74,222,128,0)} }',
    '#esmera-chat-header .ec-status-label { font-size: 11px; color: #a5f3c0; font-weight: 500; }',
    '#esmera-chat-header .ec-close {',
    '  margin-left: auto; background: rgba(255,255,255,.15); border: none; cursor: pointer;',
    '  color: #fff; font-size: 15px; line-height: 1; padding: 5px 8px; border-radius: 8px;',
    '  transition: background .15s;',
    '}',
    '#esmera-chat-header .ec-close:hover { background: rgba(255,255,255,.28); }',

    /* Messages */
    '#esmera-chat-messages {',
    '  flex: 1; overflow-y: auto; padding: 16px;',
    '  display: flex; flex-direction: column; gap: 10px;',
    '  background: #f8f8fb;',
    '}',
    '@keyframes ec-msg-in { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }',
    '.ec-msg {',
    '  max-width: 82%; padding: 10px 13px; border-radius: 16px;',
    '  font-size: 13.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-word;',
    '  animation: ec-msg-in .18s ease both;',
    '}',
    '.ec-msg.ec-bot  { background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.08); border-bottom-left-radius: 4px; align-self: flex-start; }',
    '.ec-msg.ec-user { background: linear-gradient(135deg, #6366f1, #4338ca); color: #fff; border-bottom-right-radius: 4px; align-self: flex-end; }',
    '.ec-typing { display: flex; gap: 4px; padding: 10px 14px; }',
    '.ec-typing span { width: 7px; height: 7px; border-radius: 50%; background: #bbb; animation: ec-bounce .9s infinite; }',
    '.ec-typing span:nth-child(2) { animation-delay: .15s; }',
    '.ec-typing span:nth-child(3) { animation-delay: .3s; }',
    '@keyframes ec-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }',

    /* Input */
    '#esmera-chat-input-row {',
    '  display: flex; gap: 8px; padding: 12px 12px 12px 14px;',
    '  border-top: 1px solid #ececf0; background: #fff;',
    '}',
    '#esmera-chat-input {',
    '  flex: 1; border: 1.5px solid #e2e2e8; border-radius: 22px;',
    '  padding: 9px 14px; font-size: 13.5px; outline: none;',
    '  transition: border-color .2s; background: #fafafa;',
    '}',
    '#esmera-chat-input:focus { border-color: #6366f1; background: #fff; }',
    '#esmera-chat-send {',
    '  width: 38px; height: 38px; border-radius: 50%;',
    '  background: linear-gradient(135deg, #6366f1, #4338ca); border: none; cursor: pointer;',
    '  display: flex; align-items: center; justify-content: center;',
    '  transition: opacity .2s, transform .15s; flex-shrink: 0;',
    '}',
    '#esmera-chat-send:hover { opacity: .88; transform: scale(1.05); }',
    '#esmera-chat-send svg { width: 16px; height: 16px; fill: #fff; }',
    '#esmera-chat-send:disabled { background: #d1d5db; cursor: not-allowed; transform: none; opacity: 1; }'
  ].join('\\n');
  document.head.appendChild(style);

  /* ── HTML ── */
  var root = document.createElement('div');
  root.id = 'esmera-chat-root';
  root.innerHTML =
    '<div id="ec-notif">' +
      '<span class="ec-notif-icon">👋</span>' +
      '<span class="ec-notif-text"></span>' +
      '<button class="ec-notif-close" aria-label="Cerrar">&#x2715;</button>' +
    '</div>' +
    '<button id="esmera-chat-btn" aria-label="Abrir chat">' +
      '<span id="ec-badge"></span>' +
      '<span class="ec-btn-icon ec-icon-msg"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span>' +
      '<span class="ec-btn-icon ec-icon-x">&#x2715;</span>' +
    '</button>' +
    '<div id="esmera-chat-box" role="dialog">' +
      '<div id="esmera-chat-header">' +
        '<div class="ec-avatar"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>' +
        '<div>' +
          '<div class="ec-name">Asistente virtual — Esmera Online</div>' +
          '<div class="ec-status"><span class="ec-dot"></span><span class="ec-status-label">En línea</span></div>' +
        '</div>' +
        '<button class="ec-close" id="esmera-close-btn" aria-label="Cerrar">&#x2715;</button>' +
      '</div>' +
      '<div id="esmera-chat-messages"></div>' +
      '<div id="esmera-chat-input-row">' +
        '<input id="esmera-chat-input" type="text" placeholder="Escribe un mensaje…" autocomplete="off" maxlength="500" />' +
        '<button id="esmera-chat-send" aria-label="Enviar">' +
          '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(root);

  /* ── Session ID ── */
  var sessionId = (function() {
    try {
      var s = localStorage.getItem('ec-sid');
      if (s) return s;
      s = 'ec-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
      localStorage.setItem('ec-sid', s);
      return s;
    } catch(e) { return 'ec-' + Math.random().toString(36).slice(2,10); }
  })();

  /* ── Persistence (localStorage) ── */
  var LS_KEY = 'ec-history';
  var LS_MAX_AGE = 24 * 60 * 60 * 1000;

  function loadHistory() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      if (Date.now() - saved.ts > LS_MAX_AGE) { localStorage.removeItem(LS_KEY); return null; }
      return saved;
    } catch(e) { return null; }
  }

  function saveHistory() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), messages: messages }));
    } catch(e) {}
  }

  /* ── State ── */
  var messages = [];
  var isOpen = false;
  var isLoading = false;

  var btn      = document.getElementById('esmera-chat-btn');
  var box      = document.getElementById('esmera-chat-box');
  var closeBtn = document.getElementById('esmera-close-btn');
  var msgList  = document.getElementById('esmera-chat-messages');
  var input    = document.getElementById('esmera-chat-input');
  var sendBtn  = document.getElementById('esmera-chat-send');
  var notif    = document.getElementById('ec-notif');
  var badge    = document.getElementById('ec-badge');

  function addMessage(role, content, skipSave) {
    messages.push({ role: role, content: content });
    var el = document.createElement('div');
    el.className = 'ec-msg ' + (role === 'user' ? 'ec-user' : 'ec-bot');
    el.textContent = content;
    msgList.appendChild(el);
    msgList.scrollTop = msgList.scrollHeight;
    if (!skipSave) saveHistory();
  }

  /* ── Restore history on load ── */
  (function() {
    var saved = loadHistory();
    if (saved && saved.messages && saved.messages.length > 0) {
      saved.messages.forEach(function(m) { addMessage(m.role, m.content, true); });
      saveHistory();
    }
  })();

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'ec-msg ec-bot ec-typing';
    el.id = 'ec-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    msgList.appendChild(el);
    msgList.scrollTop = msgList.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('ec-typing');
    if (el) el.remove();
  }

  function sendMessage() {
    var text = input.value.trim();
    if (!text || isLoading) return;
    input.value = '';
    sendBtn.disabled = true;
    isLoading = true;
    addMessage('user', text);
    showTyping();
    fetch(API_BASE + '/api/public/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ messages: messages, session_id: sessionId })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      hideTyping();
      addMessage('assistant', data.message || 'Lo siento, ha ocurrido un error.');
      if (data.lead_captured) {
        var badge2 = document.createElement('div');
        badge2.style.cssText = 'text-align:center;font-size:11px;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px 10px;margin-top:2px;';
        badge2.textContent = '\\u2713 Datos registrados — te contactaremos pronto';
        msgList.appendChild(badge2);
        msgList.scrollTop = msgList.scrollHeight;
      }
    })
    .catch(function() {
      hideTyping();
      addMessage('assistant', 'Lo siento, no puedo responder ahora mismo.');
    })
    .finally(function() {
      isLoading = false;
      sendBtn.disabled = false;
      input.focus();
    });
  }

  /* ── Notifications ── */
  var notifDismissed = false;
  var notifIndex = 0;
  var notifHideTimer = null;
  var notifScheduleTimer = null;

  function hideNotif(permanent) {
    if (permanent) notifDismissed = true;
    notif.classList.add('ec-hiding');
    setTimeout(function() {
      notif.classList.remove('ec-show');
      notif.classList.remove('ec-hiding');
    }, 180);
  }

  function showNotif() {
    if (isOpen || notifDismissed) return;
    var msg = NOTIF_MESSAGES[notifIndex % NOTIF_MESSAGES.length];
    notifIndex++;
    notif.querySelector('.ec-notif-icon').textContent = msg.icon;
    notif.querySelector('.ec-notif-text').textContent = msg.text;
    notif.classList.remove('ec-hiding');
    notif.classList.add('ec-show');
    badge.classList.add('ec-show');
    if (notifHideTimer) clearTimeout(notifHideTimer);
    notifHideTimer = setTimeout(function() { hideNotif(false); }, 6000);
    /* reschedule next */
    if (notifScheduleTimer) clearTimeout(notifScheduleTimer);
    notifScheduleTimer = setTimeout(showNotif, 50000);
  }

  notif.addEventListener('click', function(e) {
    if (e.target.classList.contains('ec-notif-close')) {
      if (notifScheduleTimer) clearTimeout(notifScheduleTimer);
      hideNotif(true);
      return;
    }
    hideNotif(false);
    if (!isOpen) toggle();
  });

  /* First notification after 10 s */
  notifScheduleTimer = setTimeout(showNotif, 10000);

  /* ── Toggle ── */
  function toggle() {
    if (isOpen) {
      box.classList.add('ec-closing');
      btn.classList.remove('ec-active');
      setTimeout(function() {
        box.classList.remove('ec-open');
        box.classList.remove('ec-closing');
      }, 160);
      isOpen = false;
    } else {
      hideNotif(false);
      badge.classList.remove('ec-show');
      box.classList.remove('ec-closing');
      box.classList.add('ec-open');
      btn.classList.add('ec-active');
      if (messages.length === 0) addMessage('assistant', WELCOME, false);
      input.focus();
      isOpen = true;
    }
  }

  btn.addEventListener('click', toggle);
  closeBtn.addEventListener('click', toggle);
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
})();
`;

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
