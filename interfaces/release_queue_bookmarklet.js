/**
 * =============================================================================
 * HYROX & UTMB | RELEASE QUEUE BOOKMARKLET (ZERO-TOKEN)
 * =============================================================================
 * Come usarlo nel Browser:
 * 1. Crea un nuovo preferito nel browser (es. Chrome, Safari, Firefox).
 * 2. Assegna il nome: "🔍 Ispeziona Coda Codice"
 * 3. Come URL / Indirizzo, incolla l'intero codice "javascript:(function(){...})()" riportato sotto.
 * 4. Clicca il preferito su qualsiasi pagina: apparirà una card elegante con
 *    lo stato del ticket attualmente in scrittura e la sequenza FIFO!
 * =============================================================================
 */

javascript:(async function(){
  const TOAST_ID = 'hyrox-queue-toast-overlay';
  const existing = document.getElementById(TOAST_ID);
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement('div');
  overlay.id = TOAST_ID;
  overlay.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    width: 380px;
    max-width: 90vw;
    background: #0B0F19;
    color: #f1f5f9;
    border: 1px solid #00F0FF44;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 25px rgba(0,240,255,0.15);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 16px;
    backdrop-filter: blur(16px);
    transition: all 0.25s ease-in-out;
  `;

  overlay.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #1e293b; padding-bottom:8px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:16px;">🚀</span>
        <strong style="font-size:13px; font-weight:700; color:#fff;">Coda Scrittura Codice</strong>
        <span style="font-size:10px; background:#00F0FF15; color:#00F0FF; padding:2px 6px; border-radius:99px; border:1px solid #00F0FF33; font-weight:600;">0 TOKEN</span>
      </div>
      <button id="close-hyrox-toast" style="background:none; border:none; color:#94a3b8; font-size:16px; cursor:pointer; padding:0 4px;">&times;</button>
    </div>
    <div id="hyrox-toast-body" style="font-size:12px; color:#cbd5e1;">
      <div style="text-align:center; padding:12px 0; color:#94a3b8;">Lettura stato in corso...</div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById('close-hyrox-toast').onclick = () => overlay.remove();

  try {
    const res = await fetch('http://localhost:5050/api/queue');
    const q = await res.json();
    const body = document.getElementById('hyrox-toast-body');

    let html = '';

    if (q.active_worker) {
      const w = q.active_worker;
      html += `
        <div style="background:#022c22; border:1px solid #10b981; border-radius:10px; padding:10px; margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="display:inline-block; width:8px; height:8px; background:#10b981; border-radius:50%; box-shadow:0 0 8px #10b981;"></span>
            <strong style="color:#6ee7b7; font-size:11px; text-transform:uppercase;">In Scrittura Adesso</strong>
          </div>
          <div style="font-size:13px; font-weight:bold; color:#fff; margin-bottom:2px;">#${w.issue} - ${w.title || 'Implementazione'}</div>
          <div style="font-size:11px; color:#94a3b8;">PID: <code>${w.pid}</code> | In corso da: <strong style="color:#6ee7b7;">${w.elapsed_formatted}</strong></div>
        </div>
      `;
    } else {
      html += `
        <div style="background:#1e293b55; border:1px solid #334155; border-radius:10px; padding:8px 10px; margin-bottom:10px; font-size:11px; color:#94a3b8;">
          💤 Nessun ticket in scrittura ora. Worker a riposo.
        </div>
      `;
    }

    const seq = (q.sequence || []).filter(s => !q.active_worker || s.number !== q.active_worker.issue);
    html += `<div style="font-size:11px; font-weight:600; color:#94a3b8; margin-bottom:6px;">Sequenza Prossimi Ticket FIFO (${seq.length}):</div>`;

    if (seq.length > 0) {
      html += `<div style="display:flex; flex-direction:column; gap:4px; max-height:160px; overflow-y:auto;">`;
      seq.forEach((item, idx) => {
        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b66; border:1px solid #33415566; border-radius:6px; padding:6px 8px; font-size:11px;">
            <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
              <span style="background:#334155; color:#cbd5e1; border-radius:4px; padding:1px 5px; font-weight:bold; font-size:10px;">${idx+1}°</span>
              <strong style="color:#FFDD00;">#${item.number}</strong>
              <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">${item.title}</span>
            </div>
            <a href="${item.url}" target="_blank" style="color:#38bdf8; text-decoration:none; font-size:10px; margin-left:6px;">Apri</a>
          </div>
        `;
      });
      html += `</div>`;
    } else {
      html += `<div style="font-size:11px; color:#64748b; padding:4px 0;">Nessun altro ticket in coda.</div>`;
    }

    body.innerHTML = html;
  } catch (err) {
    document.getElementById('hyrox-toast-body').innerHTML = `
      <div style="color:#f87171; font-size:11px;">
        ⚠️ Impossibile contattare il server locale (<code>localhost:5050</code>).<br>
        Assicurati che sia attivo con: <code>python scripts/ops_cli.py release-ui</code>
      </div>
    `;
  }
})();
