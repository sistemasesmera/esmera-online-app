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

  // Prefer explicit env var; fall back to request origin
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

  /* ── Styles ── */
  var style = document.createElement('style');
  style.textContent = [
    '#esmera-chat-root * { box-sizing: border-box; font-family: system-ui, sans-serif; }',
    '#esmera-chat-btn {',
    '  position: fixed; bottom: 24px; right: 24px; z-index: 99998;',
    '  width: 56px; height: 56px; border-radius: 50%;',
    '  background: #4f46e5; border: none; cursor: pointer;',
    '  box-shadow: 0 4px 16px rgba(79,70,229,.45);',
    '  display: flex; align-items: center; justify-content: center;',
    '  transition: transform .2s, box-shadow .2s;',
    '}',
    '#esmera-chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(79,70,229,.55); }',
    '#esmera-chat-btn svg { width: 26px; height: 26px; fill: #fff; }',
    '#esmera-chat-box {',
    '  position: fixed; bottom: 92px; right: 24px; z-index: 99999;',
    '  width: 360px; max-width: calc(100vw - 32px);',
    '  height: 500px; max-height: calc(100vh - 120px);',
    '  background: #fff; border-radius: 16px;',
    '  box-shadow: 0 8px 32px rgba(0,0,0,.18);',
    '  display: none; flex-direction: column; overflow: hidden;',
    '}',
    '#esmera-chat-box.ec-open { display: flex; }',
    '#esmera-chat-header {',
    '  background: #4f46e5; color: #fff; padding: 14px 16px;',
    '  display: flex; align-items: center; gap: 10px;',
    '}',
    '#esmera-chat-header .ec-avatar {',
    '  width: 34px; height: 34px; border-radius: 50%;',
    '  background: rgba(255,255,255,.2);',
    '  display: flex; align-items: center; justify-content: center;',
    '}',
    '#esmera-chat-header .ec-avatar svg { width: 18px; height: 18px; fill: #fff; }',
    '#esmera-chat-header .ec-name { font-weight: 700; font-size: 14px; }',
    '#esmera-chat-header .ec-status { font-size: 11px; opacity: .8; }',
    '#esmera-chat-header .ec-close {',
    '  margin-left: auto; background: none; border: none; cursor: pointer;',
    '  color: #fff; opacity: .8; font-size: 20px; line-height: 1; padding: 2px 4px;',
    '}',
    '#esmera-chat-header .ec-close:hover { opacity: 1; }',
    '#esmera-chat-messages {',
    '  flex: 1; overflow-y: auto; padding: 16px;',
    '  display: flex; flex-direction: column; gap: 10px;',
    '  background: #f8f8fa;',
    '}',
    '.ec-msg {',
    '  max-width: 82%; padding: 10px 13px; border-radius: 16px;',
    '  font-size: 13.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-word;',
    '}',
    '.ec-msg.ec-bot { background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.08); border-bottom-left-radius: 4px; align-self: flex-start; }',
    '.ec-msg.ec-user { background: #4f46e5; color: #fff; border-bottom-right-radius: 4px; align-self: flex-end; }',
    '.ec-typing { display: flex; gap: 4px; padding: 10px 14px; }',
    '.ec-typing span { width: 7px; height: 7px; border-radius: 50%; background: #aaa; animation: ec-bounce .9s infinite; }',
    '.ec-typing span:nth-child(2) { animation-delay: .15s; }',
    '.ec-typing span:nth-child(3) { animation-delay: .3s; }',
    '@keyframes ec-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }',
    '#esmera-chat-input-row {',
    '  display: flex; gap: 8px; padding: 12px;',
    '  border-top: 1px solid #eee; background: #fff;',
    '}',
    '#esmera-chat-input {',
    '  flex: 1; border: 1px solid #ddd; border-radius: 22px;',
    '  padding: 9px 14px; font-size: 13.5px; outline: none;',
    '  transition: border-color .2s;',
    '}',
    '#esmera-chat-input:focus { border-color: #4f46e5; }',
    '#esmera-chat-send {',
    '  width: 38px; height: 38px; border-radius: 50%;',
    '  background: #4f46e5; border: none; cursor: pointer;',
    '  display: flex; align-items: center; justify-content: center;',
    '  transition: background .2s; flex-shrink: 0;',
    '}',
    '#esmera-chat-send:hover { background: #4338ca; }',
    '#esmera-chat-send svg { width: 16px; height: 16px; fill: #fff; }',
    '#esmera-chat-send:disabled { background: #ccc; cursor: not-allowed; }'
  ].join('\\n');
  document.head.appendChild(style);

  /* ── HTML ── */
  var root = document.createElement('div');
  root.id = 'esmera-chat-root';
  root.innerHTML =
    '<button id="esmera-chat-btn" aria-label="Abrir chat">' +
      '<svg viewBox="0 0 24 24"><path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/></svg>' +
    '</button>' +
    '<div id="esmera-chat-box" role="dialog">' +
      '<div id="esmera-chat-header">' +
        '<div class="ec-avatar"><svg viewBox="0 0 24 24"><path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/></svg></div>' +
        '<div><div class="ec-name">Esmera Online</div><div class="ec-status">&#9679; En l&iacute;nea</div></div>' +
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

  /* ── State ── */
  var messages = [];
  var isOpen = false;
  var isLoading = false;

  var btn     = document.getElementById('esmera-chat-btn');
  var box     = document.getElementById('esmera-chat-box');
  var closeBtn= document.getElementById('esmera-close-btn');
  var msgList = document.getElementById('esmera-chat-messages');
  var input   = document.getElementById('esmera-chat-input');
  var sendBtn = document.getElementById('esmera-chat-send');

  function addMessage(role, content) {
    messages.push({ role: role, content: content });
    var el = document.createElement('div');
    el.className = 'ec-msg ' + (role === 'user' ? 'ec-user' : 'ec-bot');
    el.textContent = content;
    msgList.appendChild(el);
    msgList.scrollTop = msgList.scrollHeight;
  }

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
      body: JSON.stringify({ messages: messages })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      hideTyping();
      addMessage('assistant', data.message || 'Lo siento, ha ocurrido un error.');
      if (data.lead_captured) {
        var badge = document.createElement('div');
        badge.style.cssText = 'text-align:center;font-size:11px;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px 10px;margin-top:2px;';
        badge.textContent = '✓ Datos registrados — te contactaremos pronto';
        msgList.appendChild(badge);
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

  function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      box.classList.add('ec-open');
      if (messages.length === 0) addMessage('assistant', WELCOME);
      input.focus();
    } else {
      box.classList.remove('ec-open');
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
