// ═══════════════════════════════════════════════
//  ARDAX FOOTBALL BETTING — app.js
//  Logica principale UI e navigazione
// ═══════════════════════════════════════════════

const App = (() => {

  let currentPage   = 'home';
  let currentDate   = new Date();
  let fixtures      = [];
  let selectedLeague = 'all';
  let themeMode     = localStorage.getItem('ardax_theme') || 'dark';
  let adminCsvFiles = [];

  // ════════════════════════════════════
  //  INIT
  // ════════════════════════════════════
  async function init() {
    Auth.init();
    applyTheme(themeMode);

    if (!Auth.isLoggedIn()) {
      showPage('login');
      return;
    }

    // Mostra disclaimer 18+ al primo accesso
    if (!localStorage.getItem('ardax_disclaimer_accepted')) {
      showDisclaimer18();
    }

    showMainApp();
    await loadHomePage();
  }

  // ════════════════════════════════════
  //  TEMA
  // ════════════════════════════════════
  function applyTheme(mode) {
    if (mode === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
    themeMode = mode;
    localStorage.setItem('ardax_theme', mode);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = mode === 'light' ? '🌙' : '☀️';
  }

  function toggleTheme() {
    applyTheme(themeMode === 'dark' ? 'light' : 'dark');
  }

  // ════════════════════════════════════
  //  NAVIGAZIONE
  // ════════════════════════════════════
  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`[data-nav="${pageId}"]`);
    if (navItem) navItem.classList.add('active');

    currentPage = pageId;

    // Nascondi admin dal nav se non è admin
    const adminNav = document.querySelector('[data-nav="admin"]');
    if (adminNav) adminNav.style.display = Auth.isAdmin() ? 'flex' : 'none';
  }

  function showMainApp() {
    document.getElementById('main-nav').style.display = 'flex';
    showPage('home');
  }

  function navigateTo(pageId) {
    showPage(pageId);
    if (pageId === 'home' && fixtures.length === 0) loadHomePage();
    if (pageId === 'vip') loadVIPPage();
    if (pageId === 'schedine') loadSchedinePage();
    if (pageId === 'admin') loadAdminPage();
    if (pageId === 'disclaimer') renderDisclaimer();
  }

  // ════════════════════════════════════
  //  LOGIN PAGE
  // ════════════════════════════════════
  function renderLogin() {
    document.getElementById('page-login').innerHTML = `
      <div class="login-hero">
        <div class="login-logo-big"><span>A</span></div>
        <div class="login-app-name">ARDAX</div>
        <div class="login-app-sub">Football Betting • AI Analysis</div>
      </div>
      <div class="login-form-wrap">
        <div class="login-card">
          <div class="login-title">Accedi</div>
          <div class="login-sub">Inserisci le tue credenziali per continuare</div>
          <div class="form-group">
            <label class="form-label">Username</label>
            <div class="input-icon-wrap">
              <span class="input-icon">👤</span>
              <input class="form-input with-icon" id="login-user" type="text" placeholder="Il tuo username" autocomplete="username" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="input-icon-wrap">
              <span class="input-icon">🔒</span>
              <input class="form-input with-icon" id="login-pass" type="password" placeholder="La tua password" autocomplete="current-password" />
              <button class="toggle-pw" onclick="App.togglePassword()" id="toggle-pw-btn">👁️</button>
            </div>
          </div>
          <div id="login-error" style="color:var(--color-loss);font-size:12px;margin-bottom:12px;display:none;"></div>
          <button class="btn btn-primary btn-block btn-lg" onclick="App.doLogin()">Accedi →</button>
        </div>
        <div class="login-disclaimer">
          <span class="footer-18">18+</span>
          Il gioco d'azzardo può causare dipendenza.<br>
          <a href="#" onclick="App.navigateTo('disclaimer')">Gioca responsabilmente</a>
        </div>
      </div>
    `;

    // Enter per login
    setTimeout(() => {
      document.getElementById('login-pass')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') App.doLogin();
      });
    }, 100);
  }

  function togglePassword() {
    const input = document.getElementById('login-pass');
    const btn = document.getElementById('toggle-pw-btn');
    if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
    else { input.type = 'password'; btn.textContent = '👁️'; }
  }

  function doLogin() {
    const username = document.getElementById('login-user')?.value?.trim();
    const password = document.getElementById('login-pass')?.value;
    const errorEl = document.getElementById('login-error');

    if (!username || !password) {
      errorEl.textContent = 'Inserisci username e password';
      errorEl.style.display = 'block';
      return;
    }

    const result = Auth.login(username, password);
    if (!result.success) {
      errorEl.textContent = result.error;
      errorEl.style.display = 'block';
      return;
    }

    errorEl.style.display = 'none';
    if (!localStorage.getItem('ardax_disclaimer_accepted')) showDisclaimer18();
    else { showMainApp(); loadHomePage(); }
  }

  // ════════════════════════════════════
  //  DISCLAIMER 18+
  // ════════════════════════════════════
  function showDisclaimer18() {
    const overlay = document.getElementById('disclaimer-popup');
    if (overlay) overlay.style.display = 'flex';
  }

  function acceptDisclaimer() {
    localStorage.setItem('ardax_disclaimer_accepted', '1');
    document.getElementById('disclaimer-popup').style.display = 'none';
    showMainApp();
    loadHomePage();
  }

  // ════════════════════════════════════
  //  HOME — PALINSESTO
  // ════════════════════════════════════
  async function loadHomePage() {
    renderDaySelector();
    renderFilterBar();
    await loadFixtures(currentDate);
  }

  function renderDaySelector() {
    const container = document.getElementById('day-selector');
    if (!container) return;
    const days = [];
    const today = new Date();
    for (let i = 0; i < ARDAX_CONFIG.daysRange; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    const dayNames = ['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
    container.innerHTML = days.map((d, i) => {
      const isToday = i === 0;
      const isCurrent = d.toDateString() === currentDate.toDateString();
      return `<div class="day-btn ${isCurrent ? 'active' : ''}" onclick="App.selectDay(${d.getTime()})">
        <div class="day-name">${isToday ? 'OGGI' : dayNames[d.getDay()]}</div>
        <div class="day-num">${d.getDate()}</div>
      </div>`;
    }).join('');
  }

  function renderFilterBar() {
    const container = document.getElementById('filter-bar');
    if (!container) return;
    const chips = [
      { id: 'all', label: 'Tutti' },
      ...ARDAX_CONFIG.leagues.map(l => ({ id: l.name, label: l.flag + ' ' + l.name }))
    ];
    container.innerHTML = chips.map(c =>
      `<div class="filter-chip ${selectedLeague === c.id ? 'active' : ''}" onclick="App.filterLeague('${c.id}')">${c.label}</div>`
    ).join('');
  }

  function selectDay(timestamp) {
    currentDate = new Date(timestamp);
    renderDaySelector();
    loadFixtures(currentDate);
  }

  function filterLeague(leagueId) {
    selectedLeague = leagueId;
    renderFilterBar();
    renderFixtures();
  }

  async function loadFixtures(date) {
    const container = document.getElementById('matches-container');
    if (!container) return;

    // Loading skeleton
    container.innerHTML = Array(5).fill(0).map(() => `
      <div style="margin:0 16px 6px;padding:14px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);">
        <div class="skeleton" style="height:14px;width:60%;margin-bottom:8px;"></div>
        <div class="skeleton" style="height:12px;width:80%;"></div>
      </div>
    `).join('');

    const dateStr = date.toISOString().split('T')[0];
    fixtures = await FootballAPI.getFixturesByDate(dateStr);

    // Arricchisci con dati CSV se disponibili
    fixtures = fixtures.map(f => {
      const leagueCode = ARDAX_CONFIG.leagues.find(l => l.id === f.league.id)?.csvCode;
      const csvRows = leagueCode ? ArdaxData.getLeagueCSVData(leagueCode) : [];
      const homeStats = csvRows.length ? ArdaxAI.calculateCSVStats(f.home.name, csvRows) : null;
      const awayStats = csvRows.length ? ArdaxAI.calculateCSVStats(f.away.name, csvRows) : null;
      return { ...f, homeStats, awayStats };
    });

    renderFixtures();
  }

  function renderFixtures() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    const filtered = selectedLeague === 'all'
      ? fixtures
      : fixtures.filter(f => f.league.name === selectedLeague);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚽</div>
          <div class="empty-title">Nessuna partita</div>
          <div class="empty-sub">Non ci sono partite per questa data</div>
        </div>`;
      return;
    }

    // Raggruppa per campionato
    const byLeague = {};
    filtered.forEach(f => {
      const key = f.league.name;
      if (!byLeague[key]) byLeague[key] = [];
      byLeague[key].push(f);
    });

    container.innerHTML = Object.entries(byLeague).map(([league, matches]) => `
      <div class="league-group">
        <div class="league-header">
          <span class="league-flag">${matches[0].league.flag}</span>
          <span class="league-name">${league}</span>
          <span class="league-count">${matches.length}</span>
        </div>
        ${matches.map(m => renderMatchRow(m)).join('')}
      </div>
    `).join('');
  }

  function renderMatchRow(match) {
    const isLive = match.status === '1H' || match.status === '2H' || match.status === 'HT';
    return `
      <div class="match-row" onclick="App.openMatch(${match.id})">
        ${isLive ? '<div class="live-dot"></div>' : ''}
        <div class="match-time">${match.time}</div>
        <div class="match-teams">
          <div class="match-team">${match.home.name}</div>
          <div class="match-team" style="color:var(--text-secondary)">${match.away.name}</div>
        </div>
        <div class="match-ai-pick">
          <div class="ai-pick-label">AI ⭐</div>
          <div class="ai-pick-conf">Analisi</div>
        </div>
        <div class="match-arrow">›</div>
      </div>
    `;
  }

  // ════════════════════════════════════
  //  SCHEDA PARTITA
  // ════════════════════════════════════
  async function openMatch(fixtureId) {
    const match = fixtures.find(f => f.id === fixtureId);
    if (!match) return;

    const sheet = document.getElementById('match-sheet');
    const content = document.getElementById('match-sheet-content');
    sheet.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Loading
    content.innerHTML = `
      <div class="sheet-handle"></div>
      <div style="padding:40px;text-align:center">
        <div class="spinner"></div>
        <div style="margin-top:12px;font-size:13px;color:var(--text-muted)">Analisi AI in corso...</div>
      </div>
    `;

    // Carica dati in parallelo
    const dateStr = new Date(match.date).toISOString().split('T')[0];
    const [odds, h2h, injuries, weather] = await Promise.all([
      FootballAPI.getOdds(fixtureId),
      FootballAPI.getH2H(match.home.id, match.away.id),
      FootballAPI.getInjuries(fixtureId),
      ArdaxData.getWeather(match.league.name, dateStr),
    ]);

    // Analisi AI
    const analysis = await ArdaxAI.analyzeMatch({
      fixtureId,
      home: match.home.name,
      away: match.away.name,
      league: match.league.name,
      date: dateStr,
      homeForm: match.homeStats ? null : null,
      homeGoalsFor: match.homeStats?.avgGoalsFor,
      homeGoalsAgainst: match.homeStats?.avgGoalsAgainst,
      homeCleanSheet: match.homeStats?.cleanSheetPct,
      homeBTTS: match.homeStats?.btts,
      homeOver25: match.homeStats?.over25,
      awayGoalsFor: match.awayStats?.avgGoalsFor,
      awayGoalsAgainst: match.awayStats?.avgGoalsAgainst,
      awayCleanSheet: match.awayStats?.cleanSheetPct,
      awayBTTS: match.awayStats?.btts,
      awayOver25: match.awayStats?.over25,
      h2h: h2h ? h2h.map(g => `${g.home} ${g.homeGoals}-${g.awayGoals} ${g.away}`).join(', ') : '',
      injuries: injuries?.map(i => `${i.name} (${i.team})`).join(', '),
      weather: weather ? `${weather.icon} ${weather.temp} ${weather.desc}` : null,
      odds,
    });

    renderMatchSheet(content, match, odds, h2h, injuries, weather, analysis);
  }

  function renderMatchSheet(container, match, odds, h2h, injuries, weather, analysis) {
    const conf = analysis.mainPick.confidence;
    const confClass = conf >= 75 ? 'high' : conf >= 60 ? 'medium' : 'low';

    container.innerHTML = `
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <div class="sheet-league">${match.league.flag} ${match.league.name} · ${match.time}</div>
        <div class="sheet-teams">
          <div class="sheet-team">
            <div class="sheet-team-name">${match.home.name}</div>
          </div>
          <div class="sheet-vs">VS</div>
          <div class="sheet-team" style="text-align:right">
            <div class="sheet-team-name">${match.away.name}</div>
          </div>
        </div>
        <div class="sheet-meta">
          <span class="risk-label risk-${analysis.risk}">${analysis.risk} RISK</span>
          ${analysis.valueBet ? '<span class="badge badge-gold">💎 VALUE BET</span>' : ''}
        </div>
      </div>

      <div class="sheet-body">

        <!-- AI ANALYSIS -->
        <div class="ai-box">
          <div class="ai-box-header">
            <div class="ai-pulse"></div>
            <div class="ai-box-title">Analisi AI — Ardax</div>
          </div>
          <div class="ai-comment">${analysis.comment}</div>

          <div class="ai-pick-main">
            <div>
              <div class="ai-pick-main-label">🏆 GIOCATA CONSIGLIATA</div>
              <div class="ai-pick-main-value">${analysis.mainPick.market}</div>
              <div style="font-size:11px;color:#8a7a5a;margin-top:2px">${analysis.mainPick.reason}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:22px;font-weight:700;color:#fff;font-family:var(--font-display)">${analysis.mainPick.odd?.toFixed(2) || '-'}</div>
              <div style="font-size:11px;color:var(--color-gold)">${analysis.mainPick.confidence}% conf.</div>
            </div>
          </div>

          <div class="ai-pick-alt">
            <div>
              <div class="ai-pick-alt-label">Alternativa</div>
              <div class="ai-pick-alt-value">${analysis.altPick.market}</div>
              <div style="font-size:11px;color:var(--text-muted)">${analysis.altPick.reason}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:18px;font-weight:700;color:var(--text-primary);font-family:var(--font-display)">${analysis.altPick.odd?.toFixed(2) || '-'}</div>
              <div style="font-size:11px;color:var(--text-muted)">${analysis.altPick.confidence}% conf.</div>
            </div>
          </div>

          <div class="ai-metrics">
            ${Object.entries(analysis.markets || {}).map(([k, v]) => {
              const c = v.confidence;
              const cls = c >= 75 ? 'high' : c >= 60 ? 'medium' : 'low';
              return `<div class="ai-metric-row">
                <span class="ai-metric-label">${k}</span>
                <div class="conf-bar-wrap" style="flex:1">
                  <div class="conf-bar"><div class="conf-fill ${cls}" style="width:${c}%"></div></div>
                  <span class="conf-pct">${c}%</span>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- QUOTE -->
        ${odds ? `
        <div>
          <div class="markets-title">Quote bookmaker</div>
          <div class="markets-grid">
            ${Object.entries(odds).slice(0, 12).map(([k, v]) => {
              const isRec = k === analysis.mainPick.market;
              return `<div class="market-btn ${isRec ? 'ai-rec' : ''}">
                <div class="market-name">${k}</div>
                <div class="market-odd">${parseFloat(v).toFixed(2)}</div>
                ${isRec ? '<div class="market-ai-tag">IA ⭐</div>' : ''}
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- STATISTICHE CSV -->
        ${match.homeStats || match.awayStats ? `
        <div>
          <div class="markets-title">Statistiche stagione</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-align:center">${match.home.name}</div>
              <div class="stats-grid">
                <div class="stat-item"><div class="stat-label">Media Gol</div><div class="stat-value">${match.homeStats?.avgGoalsFor || '-'}</div></div>
                <div class="stat-item"><div class="stat-label">BTTS %</div><div class="stat-value">${match.homeStats?.btts || '-'}${match.homeStats ? '%' : ''}</div></div>
                <div class="stat-item"><div class="stat-label">Over 2.5%</div><div class="stat-value">${match.homeStats?.over25 || '-'}${match.homeStats ? '%' : ''}</div></div>
                <div class="stat-item"><div class="stat-label">Clean %</div><div class="stat-value">${match.homeStats?.cleanSheetPct || '-'}${match.homeStats ? '%' : ''}</div></div>
              </div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-align:center">${match.away.name}</div>
              <div class="stats-grid">
                <div class="stat-item"><div class="stat-label">Media Gol</div><div class="stat-value">${match.awayStats?.avgGoalsFor || '-'}</div></div>
                <div class="stat-item"><div class="stat-label">BTTS %</div><div class="stat-value">${match.awayStats?.btts || '-'}${match.awayStats ? '%' : ''}</div></div>
                <div class="stat-item"><div class="stat-label">Over 2.5%</div><div class="stat-value">${match.awayStats?.over25 || '-'}${match.awayStats ? '%' : ''}</div></div>
                <div class="stat-item"><div class="stat-label">Clean %</div><div class="stat-value">${match.awayStats?.cleanSheetPct || '-'}${match.awayStats ? '%' : ''}</div></div>
              </div>
            </div>
          </div>
        </div>` : ''}

        <!-- H2H -->
        ${h2h && h2h.length > 0 ? `
        <div>
          <div class="markets-title">Head to Head — ultimi ${h2h.length}</div>
          <div class="h2h-list">
            ${h2h.map(g => `
              <div class="h2h-item">
                <span class="h2h-date">${g.date}</span>
                <span class="h2h-match">${g.home} vs ${g.away}</span>
                <span class="h2h-score">${g.homeGoals}-${g.awayGoals}</span>
                <div class="h2h-badge ${g.winner}">${g.winner}</div>
              </div>
            `).join('')}
          </div>
        </div>` : ''}

        <!-- METEO -->
        ${weather ? `
        <div>
          <div class="markets-title">Meteo partita</div>
          <div class="weather-box">
            <div class="weather-icon">${weather.icon}</div>
            <div>
              <div class="weather-temp">${weather.temp}</div>
              <div class="weather-desc">${weather.desc}</div>
            </div>
            <div class="weather-extra">
              <div>🌧️ ${weather.rain}</div>
              <div style="margin-top:4px;font-size:10px">${weather.influence}</div>
            </div>
          </div>
        </div>` : ''}

        <!-- INFORTUNI -->
        ${injuries && injuries.length > 0 ? `
        <div>
          <div class="markets-title">Assenze e squalifiche</div>
          ${injuries.map(i => `
            <div style="background:var(--bg-card-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;margin-bottom:4px;display:flex;justify-content:space-between;font-size:12px;">
              <span style="color:var(--text-primary)">${i.name}</span>
              <span style="color:var(--text-muted)">${i.team} · ${i.type}</span>
            </div>
          `).join('')}
        </div>` : ''}

        <div style="height:20px"></div>
      </div>
    `;
  }

  function closeMatchSheet() {
    const sheet = document.getElementById('match-sheet');
    sheet.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ════════════════════════════════════
  //  VIP PAGE
  // ════════════════════════════════════
  async function loadVIPPage() {
    const container = document.getElementById('vip-content');
    if (!container) return;

    container.innerHTML = `<div style="padding:32px;text-align:center"><div class="spinner"></div><div style="margin-top:12px;font-size:13px;color:var(--text-muted)">Selezione giocate VIP...</div></div>`;

    if (fixtures.length === 0) {
      const dateStr = new Date().toISOString().split('T')[0];
      fixtures = await FootballAPI.getFixturesByDate(dateStr);
    }

    // Analizza le prime N partite per trovare le VIP
    const toAnalyze = fixtures.slice(0, 10);
    const analyses = await Promise.all(
      toAnalyze.map(async m => {
        const analysis = await ArdaxAI.analyzeMatch({
          fixtureId: m.id,
          home: m.home.name,
          away: m.away.name,
          league: m.league.name,
          homeGoalsFor: m.homeStats?.avgGoalsFor,
          homeCleanSheet: m.homeStats?.cleanSheetPct,
          homeBTTS: m.homeStats?.btts,
          awayGoalsFor: m.awayStats?.avgGoalsFor,
          awayCleanSheet: m.awayStats?.cleanSheetPct,
        });
        return { match: m, analysis };
      })
    );

    const vipPicks = await ArdaxAI.selectVIPPicks(analyses);
    renderVIPPicks(container, vipPicks);
  }

  function renderVIPPicks(container, picks) {
    if (picks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⭐</div>
          <div class="empty-title">Nessuna giocata VIP</div>
          <div class="empty-sub">Non ci sono giocate con confidenza sufficiente oggi</div>
        </div>`;
      return;
    }

    container.innerHTML = picks.map(p => `
      <div class="vip-card">
        <div class="vip-card-header">
          <span class="vip-card-league">${p.match.league.flag} ${p.match.league.name} · ${p.match.time}</span>
          <span class="vip-card-conf">⭐ ${p.pick.confidence}% fiducia</span>
        </div>
        <div class="vip-card-body">
          <div class="vip-match">${p.match.home.name} vs ${p.match.away.name}</div>
          <div class="vip-pick-box">
            <div>
              <div class="vip-pick-label">GIOCATA VIP</div>
              <div class="vip-pick-value">${p.pick.market}</div>
            </div>
            <div style="text-align:right">
              <div class="vip-pick-odd">${p.pick.odd?.toFixed(2) || '-'}</div>
              <span class="risk-label risk-${p.risk}" style="margin-top:4px;display:inline-block">${p.risk}</span>
            </div>
          </div>
          <div class="vip-comment">${p.comment}</div>
          <button class="btn btn-gold btn-block btn-sm" onclick="App.openMatch(${p.match.id})">Vedi analisi completa →</button>
        </div>
      </div>
    `).join('');
  }

  // ════════════════════════════════════
  //  SCHEDINE PAGE
  // ════════════════════════════════════
  function loadSchedinePage() {
    const container = document.getElementById('schedine-content');
    if (!container) return;
    const schedine = ArdaxData.getSchedine().filter(s => s.published);
    renderSchedine(container, schedine);
  }

  function renderSchedine(container, schedine) {
    if (schedine.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">Nessuna schedina</div>
          <div class="empty-sub">L'admin non ha ancora pubblicato schedine</div>
        </div>`;
      return;
    }

    const stats = ArdaxData.getSchedinaStats();
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
        <div class="admin-stat-card"><div class="admin-stat-val">${stats.total}</div><div class="admin-stat-label">Schedine</div></div>
        <div class="admin-stat-card"><div class="admin-stat-val" style="color:var(--color-primary)">${stats.wins}</div><div class="admin-stat-label">Vinte</div></div>
        <div class="admin-stat-card"><div class="admin-stat-val" style="color:var(--color-gold)">${stats.winRate}%</div><div class="admin-stat-label">Win rate</div></div>
      </div>
      ${schedine.map(s => renderSchedinaCard(s, false)).join('')}
    `;
  }

  function renderSchedinaCard(sch, isAdmin) {
    const statusColor = sch.status === 'win' ? 'var(--color-primary)' : sch.status === 'loss' ? 'var(--color-loss)' : 'var(--color-gold)';
    const statusLabel = sch.status === 'win' ? '✅ VINTA' : sch.status === 'loss' ? '❌ PERSA' : '⏳ IN CORSO';
    return `
      <div class="schedina-card">
        <div class="schedina-header">
          <div>
            <div class="schedina-name">${sch.name}</div>
            <div class="schedina-date">${sch.date}</div>
          </div>
          <span style="font-size:12px;font-weight:700;color:${statusColor}">${statusLabel}</span>
        </div>
        <div class="schedina-body">
          ${sch.events.map((e, i) => `
            <div class="schedina-event">
              <div class="schedina-match">
                <div class="schedina-match-name">${e.match}</div>
                <div class="schedina-pick">${e.pick} · @${e.odd}</div>
              </div>
              ${isAdmin ? `
                <div class="result-toggle">
                  <button class="result-btn win ${e.result === 'win' ? 'active' : ''}" onclick="App.setResult('${sch.id}',${i},'win')">V</button>
                  <button class="result-btn loss ${e.result === 'loss' ? 'active' : ''}" onclick="App.setResult('${sch.id}',${i},'loss')">P</button>
                </div>
              ` : `
                <span style="font-size:16px">${e.result === 'win' ? '✅' : e.result === 'loss' ? '❌' : '⏳'}</span>
              `}
            </div>
          `).join('')}
        </div>
        <div class="schedina-footer">
          <span class="schedina-total-label">Quota totale</span>
          <span class="schedina-total-odd">${sch.totalOdd}</span>
        </div>
      </div>
    `;
  }

  function setResult(schId, eventIdx, result) {
    ArdaxData.updateEventResult(schId, eventIdx, result);
    loadAdminPage();
  }

  // ════════════════════════════════════
  //  ADMIN PAGE
  // ════════════════════════════════════
  function loadAdminPage() {
    if (!Auth.isAdmin()) { navigateTo('home'); return; }
    const container = document.getElementById('admin-content');
    if (!container) return;
    renderAdminPage(container);
  }

  function renderAdminPage(container) {
    const users = Auth.getUsers().filter(u => u.role !== 'admin');
    const logs = Auth.getAccessLogs().slice(0, 10);
    const schedine = ArdaxData.getSchedine();
    const lastCSV = ArdaxData.getCSVLastUpdate();

    container.innerHTML = `
      <!-- DASHBOARD -->
      <div class="admin-section">
        <div class="admin-section-title">Dashboard</div>
        <div class="admin-stat-grid">
          <div class="admin-stat-card">
            <div class="admin-stat-val">${users.length}</div>
            <div class="admin-stat-label">Utenti attivi</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-val">${schedine.length}</div>
            <div class="admin-stat-label">Schedine totali</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-val" style="color:var(--color-primary)">${fixtures.length}</div>
            <div class="admin-stat-label">Partite oggi</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-val" style="color:var(--color-gold)">${ArdaxData.getSchedinaStats().winRate}%</div>
            <div class="admin-stat-label">Win rate</div>
          </div>
        </div>
      </div>

      <!-- CARICA CSV -->
      <div class="admin-section">
        <div class="admin-section-title">Carica statistiche CSV</div>
        <label for="csv-upload">
          <div class="upload-zone" id="upload-zone">
            <div class="upload-zone-icon">📊</div>
            <div class="upload-zone-title">Trascina i CSV qui</div>
            <div class="upload-zone-sub">oppure <span>clicca per selezionare</span> — più file insieme</div>
          </div>
        </label>
        <input type="file" id="csv-upload" accept=".csv" multiple style="display:none" onchange="App.handleCSVUpload(this)">
        <div id="csv-files-list"></div>
        <div id="csv-upload-btn-wrap" style="display:none">
          <div class="upload-progress" id="upload-progress"><div class="upload-progress-fill" id="upload-fill"></div></div>
          <button class="btn btn-gold btn-block mt-8" onclick="App.processCSVUpload()">Carica e aggiorna statistiche</button>
        </div>
        <div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px">
          ${lastCSV ? 'Ultimo aggiornamento: ' + lastCSV : 'Nessun CSV caricato'}
        </div>
      </div>

      <!-- GESTIONE SCHEDINE -->
      <div class="admin-section">
        <div class="admin-section-title">Schedine</div>
        <button class="btn btn-primary btn-block mb-12" onclick="App.showCreateSchedina()">+ Crea nuova schedina</button>
        ${schedine.length > 0 ? schedine.map(s => renderSchedinaCard(s, true)).join('') : '<div class="empty-state" style="padding:20px"><div class="empty-sub">Nessuna schedina creata</div></div>'}
      </div>

      <!-- GESTIONE UTENTI -->
      <div class="admin-section">
        <div class="admin-section-title">Gestione utenti</div>
        <div class="card mb-12">
          <div class="card-body">
            <div class="section-title">Crea nuovo utente</div>
            <div class="form-group">
              <input class="form-input" id="new-username" placeholder="Username" type="text" />
            </div>
            <div class="form-group">
              <input class="form-input" id="new-password" placeholder="Password" type="password" />
            </div>
            <div id="create-user-error" style="color:var(--color-loss);font-size:12px;margin-bottom:8px;display:none"></div>
            <button class="btn btn-primary btn-block" onclick="App.createUser()">Crea utente</button>
          </div>
        </div>
        <div class="section-title">Utenti registrati</div>
        ${users.length === 0
          ? '<div style="font-size:13px;color:var(--text-muted);padding:12px 0">Nessun utente registrato</div>'
          : users.map(u => `
            <div class="user-item">
              <div class="user-avatar">${u.username[0].toUpperCase()}</div>
              <div class="user-info">
                <div class="user-name">${u.username}</div>
                <div class="user-meta">Ultimo accesso: ${u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('it-IT') : 'Mai'}</div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="App.deleteUser('${u.id}')">Elimina</button>
            </div>
          `).join('')}
      </div>

      <!-- LOG ACCESSI -->
      <div class="admin-section">
        <div class="admin-section-title">Log accessi recenti</div>
        ${logs.length === 0
          ? '<div style="font-size:13px;color:var(--text-muted)">Nessun accesso registrato</div>'
          : logs.map(l => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
              <span style="color:var(--text-primary);font-weight:500">${l.username}</span>
              <span style="color:var(--text-muted)">${l.date} ${l.time}</span>
            </div>
          `).join('')}
      </div>

      <!-- LOGOUT -->
      <div class="admin-section">
        <button class="btn btn-outline btn-block" onclick="App.logout()">Esci dall'app</button>
      </div>
    `;

    // Setup drag&drop
    setupDropZone();
  }

  function setupDropZone() {
    const zone = document.getElementById('upload-zone');
    if (!zone) return;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag');
      const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
      addCSVFiles(files);
    });
  }

  function handleCSVUpload(input) {
    const files = Array.from(input.files);
    addCSVFiles(files);
    input.value = '';
  }

  function addCSVFiles(files) {
    files.forEach(f => {
      if (!adminCsvFiles.find(x => x.name === f.name)) adminCsvFiles.push(f);
    });
    renderCSVFilesList();
  }

  function renderCSVFilesList() {
    const list = document.getElementById('csv-files-list');
    const btnWrap = document.getElementById('csv-upload-btn-wrap');
    if (!list) return;
    if (adminCsvFiles.length === 0) { list.innerHTML = ''; if(btnWrap) btnWrap.style.display = 'none'; return; }
    if(btnWrap) btnWrap.style.display = 'block';
    list.innerHTML = adminCsvFiles.map((f, i) => {
      const league = ArdaxData.detectLeagueFromFilename(f.name);
      return `
        <div class="uploaded-file">
          <span class="file-icon">📄</span>
          <div class="file-info">
            <div class="file-name">${f.name}</div>
            <div class="file-size">${league ? league : 'Campionato sconosciuto'} · ${(f.size/1024).toFixed(0)}KB</div>
          </div>
          <button class="file-remove-btn" onclick="App.removeCSVFile(${i})">×</button>
        </div>
      `;
    }).join('');
  }

  function removeCSVFile(idx) {
    adminCsvFiles.splice(idx, 1);
    renderCSVFilesList();
  }

  async function processCSVUpload() {
    if (adminCsvFiles.length === 0) return;
    const fill = document.getElementById('upload-fill');
    let processed = 0;

    for (const file of adminCsvFiles) {
      try {
        const { rows, league } = await ArdaxData.loadCSVFile(file);
        const code = file.name.replace('.csv', '').toUpperCase();
        ArdaxData.saveCSVData(code, rows);
        processed++;
        if (fill) fill.style.width = Math.round((processed / adminCsvFiles.length) * 100) + '%';
      } catch (err) {
        console.error('CSV error:', file.name, err);
      }
    }

    showToast(`✅ ${processed} file importati con successo!`, 'success');
    adminCsvFiles = [];
    loadAdminPage();
  }

  function createUser() {
    const username = document.getElementById('new-username')?.value?.trim();
    const password = document.getElementById('new-password')?.value;
    const errEl = document.getElementById('create-user-error');
    const result = Auth.createUser(username, password);
    if (!result.success) {
      errEl.textContent = result.error;
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
    showToast(`✅ Utente "${username}" creato!`, 'success');
    loadAdminPage();
  }

  function deleteUser(userId) {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;
    Auth.deleteUser(userId);
    showToast('Utente eliminato', 'success');
    loadAdminPage();
  }

  function showCreateSchedina() {
    const modal = document.getElementById('create-schedina-modal');
    if (modal) {
      modal.style.display = 'flex';
      renderSchedinaBuilder();
    }
  }

  function renderSchedinaBuilder() {
    const container = document.getElementById('schedina-builder');
    if (!container) return;
    const available = fixtures.slice(0, 20);
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label">Nome schedina</label>
        <input class="form-input" id="schedina-name-input" placeholder="es. Schedina Serie A Sabato" type="text" />
      </div>
      <div class="section-title">Seleziona eventi (clicca per aggiungere)</div>
      <div id="builder-events"></div>
      <div id="selected-events-list"></div>
    `;
    const sel = [];
    renderBuilderEvents(available, sel);
  }

  function renderBuilderEvents(matches, selected) {
    const container = document.getElementById('builder-events');
    if (!container) return;
    container.innerHTML = matches.map(m => `
      <div style="background:var(--bg-card-2);border:1px solid var(--border);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:6px;cursor:pointer"
           onclick="App.addToSchedina(${m.id})">
        <div style="font-size:13px;font-weight:500;color:var(--text-primary)">${m.home.name} vs ${m.away.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${m.league.flag} ${m.league.name} · ${m.time}</div>
      </div>
    `).join('');
  }

  let builderSelected = [];
  function addToSchedina(fixtureId) {
    const match = fixtures.find(f => f.id === fixtureId);
    if (!match || builderSelected.find(s => s.id === fixtureId)) return;
    const pick = prompt(`${match.home.name} vs ${match.away.name}\n\nInserisci la giocata (es: 1, X, 2, Over 2.5, Gol Sì):`);
    if (!pick) return;
    const odd = parseFloat(prompt('Inserisci la quota:') || '1');
    builderSelected.push({
      id: fixtureId,
      match: `${match.home.name} vs ${match.away.name}`,
      pick,
      odd: isNaN(odd) ? 1 : odd,
    });
    renderSelectedEvents();
  }

  function renderSelectedEvents() {
    const container = document.getElementById('selected-events-list');
    if (!container) return;
    if (builderSelected.length === 0) { container.innerHTML = ''; return; }
    const total = builderSelected.reduce((a, e) => a * e.odd, 1);
    container.innerHTML = `
      <div class="section-title mt-12">Selezioni (${builderSelected.length})</div>
      ${builderSelected.map((e, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
          <div style="flex:1"><div style="font-weight:500">${e.match}</div><div style="color:var(--text-muted)">${e.pick} @${e.odd}</div></div>
          <button style="background:none;border:none;color:var(--color-loss);font-size:16px;cursor:pointer" onclick="App.removeFromSchedina(${i})">×</button>
        </div>
      `).join('')}
      <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:14px;font-weight:700">
        <span>Quota totale</span>
        <span style="color:var(--color-gold)">${total.toFixed(2)}</span>
      </div>
      <button class="btn btn-gold btn-block" onclick="App.saveSchedina()">Salva e pubblica schedina</button>
    `;
  }

  function removeFromSchedina(idx) {
    builderSelected.splice(idx, 1);
    renderSelectedEvents();
  }

  function saveSchedina() {
    const name = document.getElementById('schedina-name-input')?.value?.trim();
    if (!name) { alert('Inserisci un nome per la schedina'); return; }
    if (builderSelected.length === 0) { alert('Aggiungi almeno un evento'); return; }
    ArdaxData.createSchedina(name, builderSelected);
    builderSelected = [];
    document.getElementById('create-schedina-modal').style.display = 'none';
    showToast('✅ Schedina pubblicata!', 'success');
    loadAdminPage();
  }

  // ════════════════════════════════════
  //  DISCLAIMER PAGE
  // ════════════════════════════════════
  function renderDisclaimer() {
    const container = document.getElementById('disclaimer-content');
    if (!container) return;
    container.innerHTML = `
      <div class="disclaimer-hero">
        <div class="disclaimer-18">18+</div>
        <div class="disclaimer-title">Gioco Responsabile</div>
        <div class="disclaimer-sub">Ardax Football Betting è un servizio di analisi statistica.<br>Il gioco d'azzardo può causare dipendenza.</div>
      </div>
      <div style="padding:16px">
        <div class="disclaimer-block">
          <div class="disclaimer-block-title">⚠️ Solo per maggiorenni</div>
          <div class="disclaimer-block-text">L'accesso a questa piattaforma è consentito esclusivamente a persone di età uguale o superiore a 18 anni. In alcune giurisdizioni il limite può essere superiore.</div>
        </div>
        <div class="disclaimer-block">
          <div class="disclaimer-block-title">🤖 Analisi generate da AI</div>
          <div class="disclaimer-block-text">Tutte le previsioni e le analisi presenti su Ardax sono generate da intelligenza artificiale su base statistica. Il calcio è imprevedibile e i risultati passati non garantiscono risultati futuri. Ardax non è un bookmaker e non è responsabile delle perdite degli utenti.</div>
        </div>
        <div class="disclaimer-block">
          <div class="disclaimer-block-title">🆘 Hai bisogno di aiuto?</div>
          <div class="disclaimer-block-text">Se il gioco è diventato un problema, puoi trovare supporto gratuito e riservato.</div>
        </div>
        <a href="https://www.giocaResponsabile.it" target="_blank" class="disclaimer-link">
          <div><div class="disclaimer-link-title">🇮🇹 GiocaResponsabile.it</div><div class="disclaimer-link-sub">Sito ufficiale ADM — Agenzia Dogane e Monopoli</div></div>
          <span style="color:var(--text-muted)">›</span>
        </a>
        <a href="https://www.gamcare.org.uk" target="_blank" class="disclaimer-link">
          <div><div class="disclaimer-link-title">🌍 GamCare</div><div class="disclaimer-link-sub">Supporto internazionale per il gioco problematico</div></div>
          <span style="color:var(--text-muted)">›</span>
        </a>
        <div style="text-align:center;margin-top:20px;font-size:11px;color:var(--text-muted);line-height:1.6">
          Ardax Football Betting · Servizio di analisi statistica<br>
          Non siamo un operatore di gioco. Non accettiamo scommesse.
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════
  //  LOGOUT
  // ════════════════════════════════════
  function logout() {
    Auth.logout();
    document.getElementById('main-nav').style.display = 'none';
    showPage('login');
    renderLogin();
  }

  // ════════════════════════════════════
  //  TOAST
  // ════════════════════════════════════
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  return {
    init, navigateTo, toggleTheme,
    renderLogin,
    doLogin, togglePassword, acceptDisclaimer, logout,
    selectDay, filterLeague,
    openMatch, closeMatchSheet,
    handleCSVUpload, removeCSVFile, processCSVUpload,
    createUser, deleteUser,
    showCreateSchedina, addToSchedina, removeFromSchedina, saveSchedina,
    setResult, showToast,
  };
})();

// Avvio immediato appena il DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { App.renderLogin(); App.init(); });
} else {
  App.renderLogin();
  App.init();
}
