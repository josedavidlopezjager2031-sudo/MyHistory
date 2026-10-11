/* =====================================================
   auth.js – gemeinsame Einstellungen für ALLE Seiten
   (Farbdesign, Hell/Dunkel, Einstellungsfenster)

   Diese Datei enthält KEINE Anmelde- oder Registrier-Funktion
   und keine Verbindung zu Supabase. Sie wird am Ende des <body>
   auf jeder Seite eingebunden:  <script src="auth.js"></script>
   ===================================================== */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const store = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const load = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  // [hell, dunkel]; "original" entfernt die Überschreibung und nutzt die Standardfarbe
  const ACC = {
    gruen: ['#1f7a4d', '#4ccf8b'],
    rot:   ['#d41f26', '#ff5a5f'],
    lila:  ['#7a3fc0', '#b583f5'],
    pink:  ['#d6336c', '#ff7eb3']
  };
  let acc = 'original';

  const root = document.documentElement;
  const isDark = () => getComputedStyle(root).getPropertyValue('--bg').trim() === '#0f0b0d';

  function applyAccent() {
    const s = root.style, a = ACC[acc], d = isDark();
    if (!a) {
      s.removeProperty('--red');
      s.removeProperty('--redsoft');
    } else {
      s.setProperty('--red', a[d ? 1 : 0]);
      s.setProperty('--redsoft', a[d ? 1 : 0] + (d ? '1c' : '14'));
    }
    document.querySelectorAll('.sw').forEach((b) => b.setAttribute('aria-pressed', b.dataset.acc === acc));
    store('oabv-acc', acc);
  }

  function pop(open) {
    const p = $('#setp'), g = $('#gear');
    if (p) p.hidden = !open;
    if (g) g.setAttribute('aria-expanded', open);
  }

  // Gespeicherte Werte laden
  const savedAcc = load('oabv-acc'), savedTheme = load('oabv-theme');
  if (savedAcc && (savedAcc === 'original' || ACC[savedAcc])) acc = savedAcc;
  if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;

  // Farbdesign wählen
  document.querySelectorAll('.sw').forEach((b) => {
    b.addEventListener('click', () => { acc = b.dataset.acc; applyAccent(); });
  });

  // Hell/Dunkel umschalten
  const theme = $('#theme');
  if (theme) theme.addEventListener('click', () => {
    const t = isDark() ? 'light' : 'dark';
    root.dataset.theme = t;
    store('oabv-theme', t);
    applyAccent();
  });

  // Einstellungsfenster öffnen/schließen
  const gear = $('#gear');
  if (gear) gear.addEventListener('click', (e) => {
    e.stopPropagation();
    const p = $('#setp');
    pop(p ? p.hidden : false);
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#setp')) pop(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') pop(false); });
  matchMedia('(prefers-color-scheme:dark)').addEventListener('change', applyAccent);

  applyAccent();
})();
