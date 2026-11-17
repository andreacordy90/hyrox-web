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

  // Espone globalmente sia showToast compatibile sia UIFeedback
  global.UIFeedback = UIFeedback;
  global.showToast = function (message, type, duration) {
    return UIFeedback.toast({ message, type, duration });
  };

  // Supporto CommonJS/Node se importato in test
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIFeedback;
  }
})(typeof window !== 'undefined' ? window : globalThis);
