/* =====================================================
   auth.js – gemeinsamer Supabase-Client für ALLE Seiten
   Einbinden NACH dem Supabase-CDN-Skript, auf jeder Seite.
   ===================================================== */

// Beide Werte findest du in Supabase unter: Project Settings > API
// Der "anon public"-Key ist für das Frontend gedacht und darf öffentlich sein.
// NIEMALS das Datenbank-Passwort oder den service_role-Key hier eintragen!
const SUPABASE_URL = 'https://hmpdyeuyvzlhcrrzjhoq.supabase.co';
const SUPABASE_ANON_KEY = 'hmpdyeuyvzlhcrrzjhoq';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,      // Session im localStorage -> gilt auf allen Unterseiten
    autoRefreshToken: true,
    detectSessionInUrl: true   // erkennt den Link aus der Bestätigungs-E-Mail
  }
});

const OABV = {
  sb,

  // Liefert { username } oder null, falls noch kein Benutzername gewählt wurde
  async getProfile(userId) {
    const { data, error } = await sb
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Für Unterseiten: prüft Session + Benutzername, sonst Weiterleitung zur Startseite.
  // Rückgabe: { session, username } oder null
  async guard(redirect = 'index.html') {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { location.replace(redirect); return null; }
    try {
      const profile = await this.getProfile(session.user.id);
      if (!profile) { location.replace(redirect); return null; }
      return { session, username: profile.username };
    } catch (err) {
      console.error(err);
      location.replace(redirect);
      return null;
    }
  },

  async logout(redirect = 'index.html') {
    await sb.auth.signOut();
    location.replace(redirect);
  }
};

window.OABV = OABV;
