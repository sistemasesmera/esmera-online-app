import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { data: config } = await supabase
    .from("agent_config")
    .select("welcome_message, is_active")
    .single();

  const welcomeMessage = config?.welcome_message ?? "¡Hola! ¿En qué puedo ayudarte?";
  const isActive = config?.is_active ?? false;

  const apiBase = req.nextUrl.origin;
  const apiKey = process.env.PUBLIC_API_KEY ?? "";

  const js = `
(function() {
  if (document.getElementById('esmera-chat-root')) return;
  ${!isActive ? "return; // agent not active" : ""}

  const API_BASE = '${apiBase}';
  const API_KEY  = '${apiKey}';
  const WELCOME  = ${JSON.stringify(welcomeMessage)};

  /* ── Styles ── */
  const style = document.createElement('style');
  style.textContent = \`
    #esmera-chat-root * { box-sizing: border-box; font-family: system-ui, sans-serif; }
    #esmera-chat-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 99998;
      width: 56px; height: 56px; border-radius: 50%;
      background: #4f46e5; border: none; cursor: pointer;
      box-shadow: 0 4px 16px rgba(79,70,229,.45);
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s, box-shadow .2s;
    }
    #esmera-chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(79,70,229,.55); }
    #esmera-chat-btn svg { width: 26px; height: 26px; fill: #fff; }
    #esmera-chat-box {
      position: fixed; bottom: 92px; right: 24px; z-index: 99999;
      width: 360px; max-width: calc(100vw - 32px);
      height: 500px; max-height: calc(100vh - 120px);
      background: #fff; border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,.18);
      display: none; flex-direction: column; overflow: hidden;
    }
    #esmera-chat-box.open { display: flex; }
    #esmera-chat-header {
      background: #4f46e5; color: #fff; padding: 14px 16px;
      display: flex; align-items: center; gap: 10px;
    }
    #esmera-chat-header .avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: rgba(255,255,255,.2);
      display: flex; align-items: center; justify-content: center;
    }
    #esmera-chat-header .avatar svg { width: 18px; height: 18px; fill: #fff; }
    #esmera-chat-header .info .name { font-weight: 700; font-size: 14px; }
    #esmera-chat-header .info .status { font-size: 11px; opacity: .8; }
    #esmera-chat-header .close-btn {
      margin-left: auto; background: none; border: none; cursor: pointer;
      color: #fff; opacity: .8; font-size: 20px; line-height: 1; padding: 2px 4px;
    }
    #esmera-chat-header .close-btn:hover { opacity: 1; }
    #esmera-chat-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
      background: #f8f8fa;
    }
    .esmera-msg {
      max-width: 82%; padding: 10px 13px; border-radius: 16px;
      font-size: 13.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-word;
    }
    .esmera-msg.bot { background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.08); border-bottom-left-radius: 4px; align-self: flex-start; }
    .esmera-msg.user { background: #4f46e5; color: #fff; border-bottom-right-radius: 4px; align-self: flex-end; }
    .esmera-typing { display: flex; gap: 4px; padding: 10px 14px; }
    .esmera-typing span { width: 7px; height: 7px; border-radius: 50%; background: #aaa; animation: esmera-bounce .9s infinite; }
    .esmera-typing span:nth-child(2) { animation-delay: .15s; }
    .esmera-typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes esmera-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
    #esmera-chat-input-row {
      display: flex; gap: 8px; padding: 12px;
      border-top: 1px solid #eee; background: #fff;
    }
    #esmera-chat-input {
      flex: 1; border: 1px solid #ddd; border-radius: 22px;
      padding: 9px 14px; font-size: 13.5px; outline: none;
      transition: border-color .2s;
    }
    #esmera-chat-input:focus { border-color: #4f46e5; }
    #esmera-chat-send {
      width: 38px; height: 38px; border-radius: 50%;
      background: #4f46e5; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .2s; flex-shrink: 0;
    }
    #esmera-chat-send:hover { background: #4338ca; }
    #esmera-chat-send svg { width: 16px; height: 16px; fill: #fff; }
    #esmera-chat-send:disabled { background: #ccc; cursor: not-allowed; }
  \`;
  document.head.appendChild(style);

  /* ── HTML ── */
  const root = document.createElement('div');
  root.id = 'esmera-chat-root';
  root.innerHTML = \`
    <button id="esmera-chat-btn" aria-label="Abrir chat">
      <svg viewBox="0 0 24 24"><path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
    </button>
    <div id="esmera-chat-box" role="dialog" aria-label="Chat de asistencia">
      <div id="esmera-chat-header">
        <div class="avatar">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        </div>
        <div class="info">
          <div class="name">Esmera Online</div>
          <div class="status">● En línea</div>
        </div>
        <button class="close-btn" id="esmera-close-btn" aria-label="Cerrar">✕</button>
      </div>
      <div id="esmera-chat-messages"></div>
      <div id="esmera-chat-input-row">
        <input id="esmera-chat-input" type="text" placeholder="Escribe un mensaje…" autocomplete="off" maxlength="500" />
        <button id="esmera-chat-send" aria-label="Enviar">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  \`;
  document.body.appendChild(root);

  /* ── State ── */
  const messages = [];
  let isOpen = false;
  let isLoading = false;

  const btn     = document.getElementById('esmera-chat-btn');
  const box     = document.getElementById('esmera-chat-box');
  const closeBtn= document.getElementById('esmera-close-btn');
  const msgList = document.getElementById('esmera-chat-messages');
  const input   = document.getElementById('esmera-chat-input');
  const sendBtn = document.getElementById('esmera-chat-send');

  function addMessage(role, content) {
    messages.push({ role, content });
    const el = document.createElement('div');
    el.className = 'esmera-msg ' + (role === 'user' ? 'user' : 'bot');
    el.textContent = content;
    msgList.appendChild(el);
    msgList.scrollTop = msgList.scrollHeight;
    return el;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'esmera-msg bot esmera-typing';
    el.id = 'esmera-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    msgList.appendChild(el);
    msgList.scrollTop = msgList.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('esmera-typing');
    if (el) el.remove();
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isLoading) return;
    input.value = '';
    sendBtn.disabled = true;
    isLoading = true;
    addMessage('user', text);
    showTyping();
    try {
      const res = await fetch(API_BASE + '/api/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      hideTyping();
      addMessage('assistant', data.message || 'Lo siento, ha ocurrido un error.');
    } catch {
      hideTyping();
      addMessage('assistant', 'Lo siento, no puedo responder ahora mismo. Inténtalo de nuevo.');
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function toggle() {
    isOpen = !isOpen;
    box.classList.toggle('open', isOpen);
    if (isOpen && messages.length === 0) {
      addMessage('assistant', WELCOME);
    }
    if (isOpen) input.focus();
  }

  btn.addEventListener('click', toggle);
  closeBtn.addEventListener('click', toggle);
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
})();
`;

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
