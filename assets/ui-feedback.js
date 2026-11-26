/**
 * ui-feedback.js
 * Modulo riusabile standalone per notifiche Toast accessibili, Skeleton screens
 * e helpers per la gestione del focus da tastiera (WCAG 2.1 AA).
 */

(function (global) {
  'use strict';

  let containerPolite = null;
  let containerAssertive = null;

  function ensureContainers() {
    if (!containerPolite) {
      containerPolite = document.getElementById('ui-toast-container-polite');
      if (!containerPolite) {
        containerPolite = document.createElement('div');
        containerPolite.id = 'ui-toast-container-polite';
        containerPolite.className = 'ui-toast-container';
        containerPolite.setAttribute('role', 'region');
        containerPolite.setAttribute('aria-label', 'Notifiche informative');
        containerPolite.setAttribute('aria-live', 'polite');
        containerPolite.setAttribute('aria-atomic', 'false');
        document.body.appendChild(containerPolite);
      }
    }

    if (!containerAssertive) {
      containerAssertive = document.getElementById('ui-toast-container-assertive');
      if (!containerAssertive) {
        containerAssertive = document.createElement('div');
        containerAssertive.id = 'ui-toast-container-assertive';
        containerAssertive.className = 'ui-toast-container';
        containerAssertive.setAttribute('role', 'region');
        containerAssertive.setAttribute('aria-label', 'Notifiche importanti');
        containerAssertive.setAttribute('aria-live', 'assertive');
        containerAssertive.setAttribute('aria-atomic', 'true');
        // Posizionato leggermente sovrapposto/condiviso
        containerAssertive.style.bottom = 'auto';
        containerAssertive.style.top = '1.25rem';
        document.body.appendChild(containerAssertive);
      }
    }
  }

  const ICONS = {
    success: 'fa-solid fa-circle-check',
    error: 'fa-solid fa-circle-exclamation',
    warning: 'fa-solid fa-triangle-exclamation',
    info: 'fa-solid fa-circle-info'
  };

  const UIFeedback = {
    /**
     * Mostra una notifica toast accessibile non bloccante.
     * @param {Object|string} options
     * @param {string} [type='info'] 'success' | 'error' | 'warning' | 'info'
     * @param {number} [duration=4000] Millisecondi di auto-dismiss
     */
    toast(options, legacyType, legacyDuration) {
      ensureContainers();

      let message = '';
      let type = 'info';
      let duration = 4000;
      let title = '';

      if (typeof options === 'string') {
        message = options;
        if (legacyType) type = legacyType;
        if (legacyDuration) duration = legacyDuration;
      } else if (typeof options === 'object' && options !== null) {
        message = options.message || '';
        type = options.type || 'info';
        duration = typeof options.duration === 'number' ? options.duration : 4000;
        title = options.title || '';
      }

      const validTypes = ['success', 'error', 'warning', 'info'];
      if (!validTypes.includes(type)) {
        type = 'info';
      }

      // Se errore critico usa la live region assertiva, altrimenti polite
      const parentContainer = (type === 'error') ? containerAssertive : containerPolite;

      const toastEl = document.createElement('div');
      toastEl.className = `ui-toast ui-toast-${type}`;
      toastEl.setAttribute('role', type === 'error' ? 'alert' : 'status');
      toastEl.setAttribute('tabindex', '0');

      // Icona
      const iconClass = ICONS[type] || ICONS.info;
      const iconEl = document.createElement('div');
      iconEl.className = 'ui-toast-icon';
      iconEl.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i>`;
      toastEl.appendChild(iconEl);

      // Contenuto testuale
      const contentEl = document.createElement('div');
      contentEl.className = 'ui-toast-content';

      if (title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'ui-toast-title';
        titleEl.textContent = title;
        contentEl.appendChild(titleEl);
      }

      const bodyEl = document.createElement('div');
      bodyEl.className = 'ui-toast-body';
      // Consente HTML safe di base (es. <strong>, <br>) se presente
      bodyEl.innerHTML = message;
      contentEl.appendChild(bodyEl);
      toastEl.appendChild(contentEl);

      // Bottone chiusura accessibile
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'ui-toast-close';
      closeBtn.setAttribute('aria-label', 'Chiudi notifica');
      closeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
      toastEl.appendChild(closeBtn);

      // Barra di avanzamento per il dismiss
      let progressBar = null;
      if (duration > 0) {
        progressBar = document.createElement('div');
        progressBar.className = 'ui-toast-progress';
        progressBar.style.transition = `transform ${duration}ms linear`;
        progressBar.style.transform = 'scaleX(1)';
        toastEl.appendChild(progressBar);
      }

      parentContainer.appendChild(toastEl);

      // Trigger animazione di ingresso
      requestAnimationFrame(() => {
        toastEl.classList.add('ui-toast-visible');
        if (progressBar) {
          requestAnimationFrame(() => {
            progressBar.style.transform = 'scaleX(0)';
          });
        }
      });

      // Timer con pausa su mouseenter / focus
      let remaining = duration;
      let timerId = null;
      let startTime = Date.now();

      function dismiss() {
        if (!toastEl.parentNode) return;
        toastEl.classList.remove('ui-toast-visible');
        setTimeout(() => {
          if (toastEl.parentNode) {
            toastEl.parentNode.removeChild(toastEl);
          }
        }, 260);
      }

      function startTimer() {
        if (duration <= 0) return;
        startTime = Date.now();
        timerId = setTimeout(dismiss, remaining);
      }

      function pauseTimer() {
        if (duration <= 0) return;
        clearTimeout(timerId);
        remaining -= Date.now() - startTime;
        if (remaining < 0) remaining = 0;
        if (progressBar) {
          const computedWidth = window.getComputedStyle(progressBar).transform;
          progressBar.style.transition = 'none';
          progressBar.style.transform = computedWidth;
        }
      }

      function resumeTimer() {
        if (duration <= 0 || remaining <= 0) return;
        if (progressBar) {
          progressBar.style.transition = `transform ${remaining}ms linear`;
          progressBar.style.transform = 'scaleX(0)';
        }
        startTimer();
      }

      startTimer();

      toastEl.addEventListener('mouseenter', pauseTimer);
      toastEl.addEventListener('mouseleave', resumeTimer);
      toastEl.addEventListener('focusin', pauseTimer);
      toastEl.addEventListener('focusout', resumeTimer);

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTimeout(timerId);
        dismiss();
      });

      // Tasto ESC sul toast lo chiude
      toastEl.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          clearTimeout(timerId);
          dismiss();
        }
      });

      return {
        dismiss,
        element: toastEl
      };
    },

    /**
     * Attiva o disattiva uno Skeleton screen in un container.
     * @param {HTMLElement|string} target Contenitore o selettore
     * @param {boolean} isVisible Se vero, mostra lo skeleton, altrimenti ripristina il contenuto
     * @param {string} [templateId] ID del template dello skeleton (opzionale)
     */
    setSkeleton(target, isVisible, templateId) {
      const container = typeof target === 'string' ? document.querySelector(target) : target;
      if (!container) return;

      if (isVisible) {
        if (!container.dataset.originalHtml) {
          container.dataset.originalHtml = container.innerHTML;
        }
        container.setAttribute('aria-busy', 'true');

        if (templateId) {
          const tpl = document.getElementById(templateId);
          if (tpl) {
            container.innerHTML = tpl.innerHTML;
            return;
          }
        }

        // Skeleton generico di fallback a card/righe
        container.innerHTML = `
          <div class="skeleton skeleton-card p-4 rounded-xl space-y-3" role="status" aria-label="Caricamento dati in corso">
            <div class="skeleton skeleton-text skeleton-title"></div>
            <div class="skeleton skeleton-text w-full"></div>
            <div class="skeleton skeleton-text w-3/4"></div>
            <span class="sr-only">Caricamento in corso...</span>
          </div>
        `;
      } else {
        container.removeAttribute('aria-busy');
        if (container.dataset.originalHtml) {
          container.innerHTML = container.dataset.originalHtml;
          delete container.dataset.originalHtml;
        }
      }
    },

    /**
     * Focus Trap per finestre di dialogo modali accessibili (WCAG 2.1 AA).
     * @param {HTMLElement} dialogEl Elemento modale con role="dialog"
     * @param {Function} [onClose] Callback invocata su ESC
     */
    trapFocus(dialogEl, onClose) {
      if (!dialogEl) return () => {};

      const previouslyFocused = document.activeElement;
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');

      const getFocusables = () => Array.from(dialogEl.querySelectorAll(focusableSelectors));

      function handleKeyDown(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (typeof onClose === 'function') {
            onClose();
          }
          return;
        }

        if (e.key === 'Tab') {
          const focusables = getFocusables();
          if (focusables.length === 0) {
            e.preventDefault();
            return;
          }
          const first = focusables[0];
          const last = focusables[focusables.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first || !dialogEl.contains(document.activeElement)) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last || !dialogEl.contains(document.activeElement)) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      }

      dialogEl.addEventListener('keydown', handleKeyDown);

      // Metti a fuoco il primo elemento disponibile nel dialog
      setTimeout(() => {
        const focusables = getFocusables();
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          dialogEl.focus();
        }
      }, 50);

      // Restituisce funzione di cleanup
      return function releaseFocus() {
        dialogEl.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
          previouslyFocused.focus();
        }
      };
    },

    /**
     * Gestisce visibilità, messaggio testuale e azione di un banner alert accessibile.
     * @param {string|HTMLElement} elementId ID elemento o HTMLElement del banner
     * @param {Object} [options]
     * @param {boolean} [options.show] Se true mostra il banner, altrimenti lo nasconde
     * @param {string} [options.message] Messaggio da visualizzare nel banner
     * @param {Function} [options.onAction] Callback opzionale da associare al pulsante azione
     */
    setAlertBanner(elementId, options = {}) {
      const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
      if (!el) return;

      const { show, message, onAction } = options || {};
      if (!show) {
        el.hidden = true;
        if (el.classList) el.classList.add('hidden');
        return;
      }

      const textEl = el.querySelector('[data-role="banner-text"]') || el.querySelector('span:nth-child(2)');
      if (textEl && message !== undefined && message !== null) {
        textEl.textContent = String(message);
      }

      if (typeof onAction === 'function') {
        const actionBtn = el.querySelector('[data-role="banner-action"], button');
        if (actionBtn) {
          actionBtn.onclick = onAction;
        }
      }

      el.hidden = false;
      if (el.classList) el.classList.remove('hidden');
    },

    /**
     * Scorre in modo fluido fino al target e sposta il focus in modo accessibile.
     * @param {string|HTMLElement} targetSelector Selettore CSS o HTMLElement
     */
    focusAndScroll(targetSelector) {
      const el = typeof targetSelector === 'string'
        ? document.querySelector(targetSelector)
        : targetSelector;
      if (!el) return;

      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (typeof el.hasAttribute === 'function' && !el.hasAttribute('tabindex')) {
        if (typeof el.setAttribute === 'function') {
          el.setAttribute('tabindex', '-1');
        }
      }
      if (typeof el.focus === 'function') {
        try {
          el.focus({ preventScroll: true });
        } catch (err) {
          el.focus();
        }
      }
    }
  };

  // Tema scuro permanente bloccato su HUD globale (Issue #188)
  function applyTheme() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
  }

  const PALETTES = {
    '00': {
      id: '00',
      name: 'Lime / Hyrox',
      badge: '00 // LIME HYROX',
      color: '#b1cc5b',
      accentBright: '#d9f99d',
      accentRgb: '177, 204, 91',
      desc: 'Metabolic Power & Transition HUD',
      secondary: '#d4af37'
    },
    '10': {
      id: '10',
      name: 'Titanium / Race PR',
      badge: '10 // TITANIUM RACE PR',
      color: '#38bdf8',
      accentBright: '#bae6fd',
      accentRgb: '56, 189, 248',
      desc: 'Peak Velocity & Ice Cyan Telemetry',
      secondary: '#f59e0b'
    },
    '20': {
      id: '20',
      name: 'Viola / Night Trail',
      badge: '20 // VIOLA NIGHT TRAIL',
      color: '#c084fc',
      accentBright: '#e9d5ff',
      accentRgb: '192, 132, 252',
      desc: 'Ultra Altitude & Stealth Ultraviolet',
      secondary: '#dba066'
    },
    '30': {
      id: '30',
      name: 'Teal / Lava Coral',
      badge: '30 // TEAL LAVA CORAL',
      color: '#2dd4bf',
      accentBright: '#99f6e4',
      accentRgb: '45, 212, 191',
      desc: 'Aerobic Base & Lava Coral Flow',
      secondary: '#fb7185'
    }
  };

  function getSavedPalette() {
    if (typeof localStorage === 'undefined') return '00';
    try {
      const p = localStorage.getItem('hud_palette');
      return (p && PALETTES[p]) ? p : '00';
    } catch (e) {
      return '00';
    }
  }

  function getLogoBasePath() {
    const isRootLevel = typeof window !== 'undefined' && (window.location.pathname.endsWith('index.html') || !window.location.pathname.includes('/interfaces/'));
    return isRootLevel ? 'interfaces/assets/logo/' : 'assets/logo/';
  }

  const FOUR_LOGO_FRAMES = ['00', '10', '20', '30'];
  const activeLogoCycles = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  function applyPalette(paletteId, saveToStorage = true) {
    if (typeof document === 'undefined') return '00';
    const targetId = (paletteId && PALETTES[paletteId]) ? paletteId : '00';
    const info = PALETTES[targetId];
    const root = document.documentElement;

    root.setAttribute('data-hud-palette', targetId);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme && info.color) {
      metaTheme.setAttribute('content', info.color);
    }

    const logoRelPath = `${getLogoBasePath()}${targetId}.jpeg`;

    const logoImgs = document.querySelectorAll('.header-logo-replay-btn img, #header-brand-logo-btn img, [data-hud-logo], .brand-logo-img, .auth-hud-logo img');
    logoImgs.forEach((img) => {
      if (img && img.src && !img.src.includes('00-192') && !img.classList.contains('intro-logo-img')) {
        img.src = logoRelPath;
      }
    });

    const drawerBadge = document.getElementById('drawer-badge-palette');
    if (drawerBadge) {
      drawerBadge.textContent = info.badge;
    }

    const modalCards = document.querySelectorAll('#hud-palette-modal [data-palette-choice]');
    modalCards.forEach((card) => {
      const pId = card.getAttribute('data-palette-choice');
      const isCurrent = pId === targetId;
      card.classList.toggle('border-[var(--ds-accent)]', isCurrent);
      card.classList.toggle('border-slate-700', !isCurrent);
      card.classList.toggle('bg-[rgba(var(--ds-accent-rgb),0.12)]', isCurrent);
      card.setAttribute('aria-checked', isCurrent ? 'true' : 'false');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = isCurrent;
      const statusBadge = card.querySelector('.palette-status-badge');
      if (statusBadge) {
        statusBadge.textContent = isCurrent ? 'ATTIVO' : 'SELEZIONA';
        statusBadge.className = isCurrent
          ? 'palette-status-badge text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--ds-accent)] text-[#12171e]'
          : 'palette-status-badge text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700';
      }
    });

    if (saveToStorage && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('hud_palette', targetId);
      } catch (e) {}
    }

    if (typeof window !== 'undefined' && typeof window.savePalettePreferenceToProfile === 'function') {
      try {
        window.savePalettePreferenceToProfile(targetId);
      } catch (e) {}
    }

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('hud-palette-change', { detail: { palette: targetId, info: info } }));
      } catch (e) {}
    }

    return targetId;
  }

  let activePaletteTrapCleanup = null;

  function closePaletteModal() {
    const modal = document.getElementById('hud-palette-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    if (typeof activePaletteTrapCleanup === 'function') {
      activePaletteTrapCleanup();
      activePaletteTrapCleanup = null;
    }
  }

  function openPaletteModal() {
    if (typeof document === 'undefined') return;
    let modal = document.getElementById('hud-palette-modal');
    const current = getSavedPalette();
    const basePath = getLogoBasePath();

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'hud-palette-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'hud-palette-modal-title');

      modal.innerHTML = `
        <div id="hud-palette-modal-backdrop" class="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" aria-hidden="true"></div>
        <div class="relative w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl bg-[#161c24] border-2 border-[var(--ds-accent)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] p-5 sm:p-6 text-white flex flex-col gap-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-700/80">
            <div>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[rgba(var(--ds-accent-rgb),0.15)] border border-[rgba(var(--ds-accent-rgb),0.4)] text-[var(--ds-accent)] font-mono text-[11px] font-bold uppercase tracking-wider mb-1">
                <span class="w-2 h-2 rounded-full bg-[var(--ds-accent)] animate-pulse" aria-hidden="true"></span>
                <span>HUD // THEME &amp; LOGO IDENTITY</span>
              </div>
              <h2 id="hud-palette-modal-title" class="text-lg sm:text-xl font-black tracking-wide text-white">PERSONALIZZAZIONE COLORI &amp; LOGO</h2>
              <p class="text-xs text-slate-300">Scegli la palette e il logo del tuo Hub</p>
            </div>
            <button type="button" id="hud-palette-modal-close" aria-label="Chiudi finestra personalizzazione" class="btn-tactical btn-tactical--secondary min-h-[44px] min-w-[44px] px-3 py-2 text-slate-400 hover:text-white">
              <i class="fa-solid fa-xmark text-base" aria-hidden="true"></i>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Scelta palette grafica e logo">
            ${['00', '10', '20', '30'].map((id) => {
              const pal = PALETTES[id];
              const isCur = id === current;
              return `
                <div data-palette-choice="${id}" class="palette-card cursor-pointer rounded-xl border p-3 flex items-center gap-3 transition hover:scale-[1.02] active:scale-[0.98] ${
                  isCur ? 'border-[var(--ds-accent)] bg-[rgba(var(--ds-accent-rgb),0.12)]' : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
                }" tabindex="0" role="radio" aria-checked="${isCur ? 'true' : 'false'}" aria-label="Seleziona tema ${pal.name}">
                  <input type="radio" name="hud_palette_radio" value="${id}" ${isCur ? 'checked' : ''} class="sr-only" aria-hidden="true" />
                  <div class="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-700 shrink-0 bg-[#12171e] shadow-md flex items-center justify-center">
                    <img src="${basePath}${id}.jpeg" alt="Logo ${pal.name}" class="w-full h-full object-cover scale-[1.12]" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-1 mb-0.5">
                      <span class="font-bold text-sm text-white truncate">${pal.name}</span>
                      <span class="palette-status-badge ${
                        isCur
                          ? 'text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--ds-accent)] text-[#12171e]'
                          : 'text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700'
                      }">${isCur ? 'ATTIVO' : 'SELEZIONA'}</span>
                    </div>
                    <p class="text-[11px] text-slate-300 truncate">${pal.desc}</p>
                    <div class="flex items-center gap-2 mt-1.5">
                      <span class="w-3.5 h-3.5 rounded-full border border-white/30" style="background-color: ${pal.color}" title="Accento primario ${pal.color}"></span>
                      <span class="w-3.5 h-3.5 rounded-full border border-white/30" style="background-color: ${pal.secondary}" title="Accento secondario ${pal.secondary}"></span>
                      <span class="text-[10px] font-mono text-slate-400 uppercase">${pal.id} // HUD</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="pt-3 border-t border-slate-700/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
            <button type="button" id="hud-palette-replay-intro-btn" class="btn-tactical btn-tactical--secondary min-h-[44px] w-full sm:w-auto px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <i class="fa-solid fa-play mr-2 text-[var(--ds-accent)]" aria-hidden="true"></i>Rivedi Intro HUD
            </button>
            <button type="button" id="hud-palette-modal-ok-btn" class="btn-tactical btn-tactical--primary min-h-[44px] w-full sm:w-auto px-6 py-2 text-xs font-bold uppercase tracking-wider">
              Conferma &amp; Chiudi
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const closeBtn = document.getElementById('hud-palette-modal-close');
      const okBtn = document.getElementById('hud-palette-modal-ok-btn');
      const backdrop = document.getElementById('hud-palette-modal-backdrop');
      if (closeBtn) closeBtn.onclick = closePaletteModal;
      if (okBtn) okBtn.onclick = closePaletteModal;
      if (backdrop) backdrop.onclick = closePaletteModal;

      const replayBtn = document.getElementById('hud-palette-replay-intro-btn');
      if (replayBtn) {
        replayBtn.onclick = () => {
          closePaletteModal();
          if (typeof window.triggerHeaderLogoReplay === 'function') {
            window.triggerHeaderLogoReplay();
          } else if (typeof window.playPwaIntro === 'function') {
            window.playPwaIntro(true);
          } else if (typeof window.replayIntro === 'function') {
            window.replayIntro();
          }
        };
      }

      const choices = modal.querySelectorAll('[data-palette-choice]');
      choices.forEach((card) => {
        const choose = () => {
          const choiceId = card.getAttribute('data-palette-choice');
          applyPalette(choiceId, true);
          UIFeedback.toast({
            message: `Tema impostato: ${PALETTES[choiceId].name}`,
            type: 'success',
            duration: 2500
          });
        };
        card.onclick = choose;
        card.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            choose();
          }
        };
      });
    }

    modal.classList.remove('hidden');
    activePaletteTrapCleanup = UIFeedback.trapFocus(modal, closePaletteModal);
  }

  function initAppTheme() {
    applyTheme('dark');
    const p = getSavedPalette();
    applyPalette(p, false);
  }

  function toggleAppTheme() {
    applyTheme('dark');
  }

  /**
   * Genera l'HTML dei 4 loghi HUD sovrapposti (00 active di default, 10/20/30 pronti per il fade).
   * @param {string} [sizeClass='md'] 'xs' | 'sm' | 'md' | 'lg' | 'xl' o classe CSS custom
   * @returns {string}
   */
  function createFourLogoLoaderHTML(sizeClass = 'md') {
    const sizeMap = {
      xs: 'w-8 h-8',
      sm: 'w-12 h-12',
      md: 'w-16 h-16',
      lg: 'w-24 h-24',
      xl: 'w-32 h-32'
    };
    const safeSize = (typeof sizeClass === 'string' && sizeClass.trim()) ? sizeClass.trim() : 'md';
    const sizeClasses = sizeMap[safeSize] || safeSize;
    const basePath = getLogoBasePath();
    const imgs = FOUR_LOGO_FRAMES.map((id, idx) => {
      const pal = PALETTES[id];
      const cls = idx === 0 ? 'intro-logo-img active' : 'intro-logo-img';
      const alt = pal ? `Logo ${pal.name}` : `Logo ${id}`;
      return `<img data-hud-logo-frame="${id}" src="${basePath}${id}.jpeg" alt="${alt}" class="${cls}" />`;
    }).join('');
    return `<div class="four-logo-loader four-logo-loader--${safeSize} relative rounded-full overflow-hidden ${sizeClasses}" data-four-logo-loader="true">${imgs}</div>`;
  }

  /**
   * Avvia e gestisce il ciclo continuo dei 4 loghi HUD (00 -> 10 -> 20 -> 30) ogni 650ms.
   * Gestisce pulizia timer precedente, stop gracefully e reset opzionale.
   * @param {HTMLElement|string} containerEl Contenitore o selettore CSS
   * @param {Object} [options={}]
   * @param {number} [options.intervalMs=650] Intervallo tra i fotogrammi in ms
   * @param {string[]} [options.frames=['00','10','20','30']] Sequenza ID loghi
   * @param {string} [options.activeClass='active'] Classe CSS attiva
   * @param {boolean} [options.resetOnStop=true] Ripristina il primo logo allo stop
   * @param {boolean} [options.autoStart=true] Avvia automaticamente il ciclo
   */
  function mountFourLogoCycle(containerEl, options = {}) {
    const noopController = {
      start() {},
      stop() {},
      reset() {},
      destroy() {},
      isRunning() { return false; }
    };
    if (typeof document === 'undefined' || !containerEl) return noopController;

    const container = typeof containerEl === 'string'
      ? document.querySelector(containerEl)
      : containerEl;
    if (!container || typeof container.querySelectorAll !== 'function') {
      return noopController;
    }

    if (activeLogoCycles && activeLogoCycles.has(container)) {
      const prev = activeLogoCycles.get(container);
      if (prev && typeof prev.stop === 'function') {
        prev.stop(false);
      }
    }

    const opts = options || {};
    const frames = Array.isArray(opts.frames) && opts.frames.length > 0 ? opts.frames : FOUR_LOGO_FRAMES;
    const intervalMs = typeof opts.intervalMs === 'number' && opts.intervalMs > 0 ? opts.intervalMs : 650;
    const activeClass = typeof opts.activeClass === 'string' && opts.activeClass ? opts.activeClass : 'active';
    const resetOnStop = opts.resetOnStop !== false;
    const autoStart = opts.autoStart !== false;

    function resolveFrameElements() {
      const mapped = frames
        .map((id) => (
          container.querySelector(`[data-hud-logo-frame="${id}"]`) ||
          container.querySelector(`#intro-logo-${id}`)
        ))
        .filter(Boolean);
      if (mapped.length >= 2) return mapped;
      return Array.from(container.querySelectorAll('.intro-logo-img'));
    }

    let elements = resolveFrameElements();
    let currentIdx = Math.max(0, elements.findIndex((el) => el.classList && el.classList.contains(activeClass)));
    let timerId = null;
    let running = false;

    function clearTimer() {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    }

    function applyActiveIndex(targetIdx) {
      if (!elements || elements.length === 0) return;
      const safeIdx = ((targetIdx % elements.length) + elements.length) % elements.length;
      elements.forEach((el, idx) => {
        if (!el || !el.classList) return;
        if (idx === safeIdx) el.classList.add(activeClass);
        else el.classList.remove(activeClass);
      });
      currentIdx = safeIdx;
    }

    function scheduleTick() {
      clearTimer();
      if (!running || elements.length < 2) return;
      timerId = setTimeout(() => {
        if (!running) return;
        applyActiveIndex(currentIdx + 1);
        scheduleTick();
      }, intervalMs);
    }

    function start() {
      elements = resolveFrameElements();
      if (running || elements.length < 2) return;
      running = true;
      scheduleTick();
    }

    function reset() {
      elements = resolveFrameElements();
      applyActiveIndex(0);
    }

    function stop(shouldReset = resetOnStop) {
      running = false;
      clearTimer();
      if (shouldReset) {
        applyActiveIndex(0);
      }
      if (activeLogoCycles && activeLogoCycles.get(container) === controller) {
        activeLogoCycles.delete(container);
      }
    }

    const controller = {
      start,
      stop,
      reset,
      destroy() { stop(true); },
      isRunning() { return running; }
    };

    if (activeLogoCycles) {
      activeLogoCycles.set(container, controller);
    }

    if (autoStart) {
      start();
    }

    return controller;
  }

  UIFeedback.PALETTES = PALETTES;
  UIFeedback.getPalette = getSavedPalette;
  UIFeedback.applyPalette = applyPalette;
  UIFeedback.openPaletteModal = openPaletteModal;
  UIFeedback.closePaletteModal = closePaletteModal;
  UIFeedback.createFourLogoLoaderHTML = createFourLogoLoaderHTML;
  UIFeedback.mountFourLogoCycle = mountFourLogoCycle;

  // Espone globalmente sia showToast compatibile sia UIFeedback e theme helpers
  global.UIFeedback = UIFeedback;
  global.showToast = function (message, type, duration) {
    return UIFeedback.toast({ message, type, duration });
  };
  global.initAppTheme = initAppTheme;
  global.toggleAppTheme = toggleAppTheme;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAppTheme);
    } else {
      initAppTheme();
    }
  }

  // Supporto CommonJS/Node se importato in test
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIFeedback;
  }
})(typeof window !== 'undefined' ? window : globalThis);
