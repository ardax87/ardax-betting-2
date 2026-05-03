// ═══════════════════════════════════════════════
//  ARDAX FOOTBALL BETTING — auth.js
//  Gestione login, sessioni e utenti
// ═══════════════════════════════════════════════

const Auth = (() => {

  const USERS_KEY   = 'ardax_users';
  const SESSION_KEY = 'ardax_session';
  const LOGS_KEY    = 'ardax_access_logs';

  // ── Inizializza utenti di default (primo avvio) ──
  function init() {
    let users = getUsers();
    // Se non ci sono utenti, crea l'admin di default
    if (users.length === 0) {
      users = [{
        id: 'admin_001',
        username: ARDAX_CONFIG.adminUsername,
        password: ARDAX_CONFIG.adminPassword,
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLogin: null,
      }];
      saveUsers(users);
    }
  }

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // ── LOGIN ──
  function login(username, password) {
    const users = getUsers();
    const user = users.find(u =>
      u.username.toLowerCase() === username.toLowerCase() &&
      u.password === password
    );
    if (!user) return { success: false, error: 'Username o password errati' };

    // Aggiorna lastLogin
    user.lastLogin = new Date().toISOString();
    saveUsers(users);

    // Log accesso
    logAccess(user.id, user.username);

    // Salva sessione
    const session = {
      userId: user.id,
      username: user.username,
      role: user.role,
      loginAt: new Date().toISOString(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { success: true, user: session };
  }

  // ── LOGOUT ──
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // ── SESSIONE CORRENTE ──
  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch { return null; }
  }

  function isLoggedIn() {
    return !!getSession();
  }

  function isAdmin() {
    const s = getSession();
    return s && s.role === 'admin';
  }

  // ── CREA UTENTE (solo admin) ──
  function createUser(username, password) {
    if (!isAdmin()) return { success: false, error: 'Non autorizzato' };
    const users = getUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, error: 'Username già esistente' };
    }
    if (!username || username.length < 3) return { success: false, error: 'Username troppo corto (min 3 caratteri)' };
    if (!password || password.length < 6) return { success: false, error: 'Password troppo corta (min 6 caratteri)' };

    const newUser = {
      id: 'user_' + Date.now(),
      username,
      password,
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLogin: null,
    };
    users.push(newUser);
    saveUsers(users);
    return { success: true, user: newUser };
  }

  // ── ELIMINA UTENTE (solo admin) ──
  function deleteUser(userId) {
    if (!isAdmin()) return { success: false, error: 'Non autorizzato' };
    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, error: 'Utente non trovato' };
    if (users[idx].role === 'admin') return { success: false, error: 'Non puoi eliminare l\'admin' };
    users.splice(idx, 1);
    saveUsers(users);
    return { success: true };
  }

  // ── LOG ACCESSI ──
  function logAccess(userId, username) {
    try {
      const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
      logs.unshift({
        userId, username,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('it-IT'),
        time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      });
      // Mantieni solo ultimi 200 log
      if (logs.length > 200) logs.length = 200;
      localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    } catch {}
  }

  function getAccessLogs() {
    try {
      return JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    } catch { return []; }
  }

  return { init, login, logout, getSession, isLoggedIn, isAdmin, getUsers, createUser, deleteUser, getAccessLogs };
})();
