/* menu.js – steuert alle Ansichten auf index.html */
(() => {
  'use strict';
  const { sb } = OABV;
  const $ = (s) => document.querySelector(s);
  const VIEWS = ['menu', 'login', 'register', 'mailsent', 'username', 'welcome'];

  function show(name) {
    VIEWS.forEach((v) => { $('#v-' + v).hidden = v !== name; });
    document.querySelectorAll('.msg').forEach((m) => { m.textContent = ''; m.classList.remove('ok'); });
    const first = $('#v-' + name + ' input');
    if (first) first.focus();
  }

  function setMsg(view, text, ok = false) {
    const el = $('#v-' + view + ' .msg');
    el.textContent = text;
    el.classList.toggle('ok', ok);
  }

  async function withBusy(form, fn) {
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try { await fn(); } finally { btn.disabled = false; }
  }

  // Navigation zwischen Ansichten per data-view
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (b) show(b.dataset.view);
  });

  // Entscheidet anhand der Session, welche Ansicht gezeigt wird
  async function route() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { show('menu'); return; }
    try {
      const profile = await OABV.getProfile(session.user.id);
      if (!profile) {
        show('username');             // verifiziert, aber noch kein Name -> Auswahl
      } else {
        $('#who').textContent = profile.username;
        show('welcome');
      }
    } catch (err) {
      console.error(err);
      show('menu');
      setMsg('menu', 'Dein Profil konnte nicht geladen werden. Bitte versuche es erneut.');
    }
    // Token aus der URL (nach E-Mail-Link) entfernen
    if (location.hash || location.search) history.replaceState(null, '', location.pathname);
  }

  // Fehler aus dem E-Mail-Link anzeigen (z. B. abgelaufen)
  function checkLinkError() {
    const params = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
    if (params.get('error_description')) {
      show('menu');
      setMsg('menu', 'Der Bestätigungslink ist ungültig oder abgelaufen. Bitte registriere dich erneut.');
      history.replaceState(null, '', location.pathname);
      return true;
    }
    return false;
  }

  // Wichtig: keine weiteren Supabase-Aufrufe direkt im Callback -> setTimeout
  sb.auth.onAuthStateChange((event) => {
    if (['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT'].includes(event)) {
      setTimeout(() => { if (!checkLinkError()) route(); }, 0);
    }
  });

  /* ---------- Anmelden mit Benutzername ---------- */
  $('#f-login').addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy(e.target, async () => {
      const username = $('#login-user').value.trim();
      const password = $('#login-pass').value;
      const fail = () => setMsg('login', 'Benutzername oder Passwort ist falsch.');

      // 1) Benutzername -> E-Mail (serverseitige Funktion, siehe schema.sql)
      const { data: email, error: lookupErr } = await sb.rpc('email_for_username', { p_username: username });
      if (lookupErr || !email) return fail();

      // 2) Normales Supabase-Login mit E-Mail + Passwort
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return fail();
      $('#login-pass').value = '';
      // route() wird automatisch durch SIGNED_IN ausgelöst
    });
  });

  /* ---------- Registrieren mit E-Mail ---------- */
  $('#f-register').addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy(e.target, async () => {
      const email = $('#reg-email').value.trim();
      const password = $('#reg-pass').value;
      if (password.length < 8) return setMsg('register', 'Das Passwort braucht mindestens 8 Zeichen.');

      const { data, error } = await sb.auth.signUp({
        email,
        password,
        // Hierher führt der Link aus der Bestätigungs-E-Mail zurück
        options: { emailRedirectTo: location.origin + location.pathname }
      });
      if (error) return setMsg('register', 'Registrierung fehlgeschlagen: ' + error.message);

      // Bereits registrierte E-Mail: Supabase liefert dann keine Identities zurück
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return setMsg('register', 'Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an.');
      }
      $('#sent-to').textContent = email;
      $('#reg-pass').value = '';
      show('mailsent');
    });
  });

  /* ---------- Benutzernamen festlegen ---------- */
  $('#f-username').addEventListener('submit', (e) => {
    e.preventDefault();
    withBusy(e.target, async () => {
      const name = $('#new-username').value.trim();
      if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) {
        return setMsg('username', 'Erlaubt sind 3 bis 20 Buchstaben, Zahlen oder Unterstriche.');
      }
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return show('menu');

      const { error } = await sb.from('profiles').insert({ id: user.id, username: name });
      if (error) {
        if (error.code === '23505') return setMsg('username', 'Dieser Benutzername ist bereits vergeben.');
        console.error(error);
        return setMsg('username', 'Der Name konnte nicht gespeichert werden.');
      }
      route();
    });
  });

  $('#logout').addEventListener('click', () => sb.auth.signOut());

  // Start
  if (!checkLinkError()) route();
})();
