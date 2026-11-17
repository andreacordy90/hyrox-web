/**
 * bot_restart.js
 * Modulo condiviso per il monitoraggio e riavvio 1-click del Bot Telegram.
 * Gestisce polling /api/bot/status ogni 2s, trigger POST /api/bot/restart,
 * animazione spinner e notifiche toast con PID aggiornato senza reload della pagina.
 */

function getBotApiBase() {
  if (typeof window === 'undefined') return '';
  return window.location.protocol.startsWith('http') ? '' : 'http://localhost:5050';
}

function showBotToast(message, type = 'success') {
  let toast = document.getElementById('bot-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bot-toast';
    toast.className = 'toast fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 shadow-2xl flex items-center gap-3 transition-all duration-300 ease-in-out font-sans text-xs';
    toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400 text-base" id="bot-toast-icon"></i><span id="bot-toast-message"></span>`;
    document.body.appendChild(toast);
  }

  const msgSpan = document.getElementById('bot-toast-message') || toast.querySelector('span');
  if (msgSpan) msgSpan.textContent = message;

  const icon = document.getElementById('bot-toast-icon') || toast.querySelector('i');
  if (type === 'error') {
    toast.className = 'toast fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 border border-rose-500/40 text-rose-300 shadow-2xl flex items-center gap-3 transition-all duration-300 ease-in-out font-sans text-xs';
    if (icon) icon.className = 'fa-solid fa-circle-exclamation text-rose-400 text-base';
  } else {
    toast.className = 'toast fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 shadow-2xl flex items-center gap-3 transition-all duration-300 ease-in-out font-sans text-xs';
    if (icon) icon.className = 'fa-solid fa-circle-check text-emerald-400 text-base';
  }

  toast.classList.remove('hidden');
  toast.style.display = 'flex';

  if (window._botToastTimeout) clearTimeout(window._botToastTimeout);
  window._botToastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
    toast.style.display = 'none';
  }, 4000);

  if (window.UIFeedback && typeof window.UIFeedback.toast === 'function') {
    window.UIFeedback.toast(message, type);
  }
}

async function fetchBotStatus() {
  const baseApi = getBotApiBase();
  try {
    const resp = await fetch(`${baseApi}/api/bot/status`);
    if (!resp.ok) return null;
    const data = await resp.json();

    const pid = data.pid || '‑';
    const isActive = !!data.active;

    // Update release_manager PID element
    const pidSpan = document.getElementById('bot-pid');
    if (pidSpan) {
      pidSpan.textContent = pid;
    }

    // Update coach_dashboard Demone PID element if present
    const coachPid = document.getElementById('coach-bot-pid');
    if (coachPid) {
      coachPid.textContent = isActive ? `PID ${pid}` : 'FERMO';
    }

    // Update status text
    const statusText = document.getElementById('bot-status-text');
    if (statusText) {
      statusText.textContent = isActive ? 'ATTIVO' : 'FERMO';
    }

    // Update status badge
    const badge = document.getElementById('bot-status-badge') || (pidSpan ? pidSpan.closest('span') : null);
    if (badge) {
      if (isActive) {
        badge.className = "px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1.5";
      } else {
        badge.className = "px-3 py-1.5 text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center gap-1.5";
      }
    }

    // Update pulse indicator
    const indicator = document.getElementById('bot-status-indicator');
    if (indicator) {
      indicator.className = isActive
        ? "w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
        : "w-2 h-2 rounded-full bg-rose-400";
    }

    return data;
  } catch (err) {
    console.warn("fetchBotStatus error:", err);
    return null;
  }
}

function setBotRestartingState(isRestarting) {
  // Elements on release_manager
  const btnRelease = document.getElementById('btn-restart-bot');
  const spinnerRelease = document.getElementById('bot-restart-spinner');
  const iconRelease = document.getElementById('bot-restart-icon');

  // Elements on coach_dashboard
  const btnCoach = document.getElementById('btn-restart-bot-coach');
  const spinnerCoach = document.getElementById('bot-restart-spinner-coach');
  const iconCoach = document.getElementById('bot-restart-icon-coach');

  [btnRelease, btnCoach].forEach(btn => {
    if (btn) btn.disabled = isRestarting;
  });

  [spinnerRelease, spinnerCoach].forEach(spinner => {
    if (spinner) {
      if (isRestarting) spinner.classList.remove('hidden');
      else spinner.classList.add('hidden');
    }
  });

  [iconRelease, iconCoach].forEach(icon => {
    if (icon) {
      if (isRestarting) icon.classList.add('hidden');
      else icon.classList.remove('hidden');
    }
  });
}

async function restartBot(btnElement) {
  setBotRestartingState(true);
  const baseApi = getBotApiBase();

  try {
    const oldStatus = await fetchBotStatus();
    const oldPid = oldStatus ? oldStatus.pid : null;

    const resp = await fetch(`${baseApi}/api/bot/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (!resp.ok) {
      throw new Error(`HTTP error ${resp.status}`);
    }

    const res = await resp.json();

    // Poll until status confirms new PID or at least 1-2 attempts
    let newPid = null;
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 800));
      const current = await fetchBotStatus();
      if (current && current.active && current.pid && current.pid !== oldPid) {
        newPid = current.pid;
        break;
      } else if (current && current.pid) {
        newPid = current.pid;
      }
    }

    const pidMsg = newPid ? ` (Nuovo PID: ${newPid})` : '';
    showBotToast(`✅ Bot Telegram riavviato con successo!${pidMsg}`, 'success');
  } catch (err) {
    console.error("Errore durante il riavvio del bot:", err);
    showBotToast(`❌ Errore durante il riavvio del bot: ${err.message || err}`, 'error');
  } finally {
    setBotRestartingState(false);
    fetchBotStatus();
  }
}

// Auto-start 2s polling on DOM load
if (typeof window !== 'undefined') {
  window.fetchBotStatus = fetchBotStatus;
  window.restartBot = restartBot;
  window.showBotToast = showBotToast;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fetchBotStatus();
      setInterval(fetchBotStatus, 2000);
    });
  } else {
    fetchBotStatus();
    setInterval(fetchBotStatus, 2000);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fetchBotStatus, restartBot, showBotToast, getBotApiBase };
}
