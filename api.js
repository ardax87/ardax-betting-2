// ═══════════════════════════════════════════════
//  ARDAX FOOTBALL BETTING — api.js
//  Chiamate API-Football con cache intelligente
// ═══════════════════════════════════════════════

const FootballAPI = (() => {

  const BASE_URL   = 'https://v3.football.api-sports.io';
  const CACHE_KEY  = 'ardax_api_cache';
  const CACHE_TTL  = 60 * 60 * 1000; // 1 ora in ms

  function getKey() {
    return ARDAX_CONFIG.apiFootballKey;
  }

  // ── CACHE ──
  function getCache(key) {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      const entry = cache[key];
      if (!entry) return null;
      if (Date.now() - entry.ts > CACHE_TTL) return null;
      return entry.data;
    } catch { return null; }
  }

  function setCache(key, data) {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      cache[key] = { data, ts: Date.now() };
      // Pulisci cache vecchia (max 50 entry)
      const keys = Object.keys(cache);
      if (keys.length > 50) {
        const oldest = keys.sort((a, b) => cache[a].ts - cache[b].ts)[0];
        delete cache[oldest];
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {}
  }

  // ── CHIAMATA BASE ──
  async function call(endpoint, params = {}) {
    const cacheKey = endpoint + JSON.stringify(params);
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const url = new URL(BASE_URL + endpoint);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'x-apisports-key': getKey(),
          'x-rapidapi-host': 'v3.football.api-sports.io',
        }
      });
      if (!res.ok) throw new Error('API error: ' + res.status);
      const data = await res.json();
      setCache(cacheKey, data);
      return data;
    } catch (err) {
      console.error('FootballAPI error:', err);
      return null;
    }
  }

  // ── FIXTURES DEL GIORNO ──
  async function getFixturesByDate(date) {
    // date formato: YYYY-MM-DD
    const leagueIds = ARDAX_CONFIG.leagues.map(l => l.id);

    const results = await Promise.all(
      leagueIds.map(leagueId =>
        call('/fixtures', { date, league: leagueId })
      )
    );

    const fixtures = [];
    results.forEach((res, i) => {
      if (res && res.response) {
        res.response.forEach(f => {
          fixtures.push({
            id: f.fixture.id,
            date: f.fixture.date,
            time: new Date(f.fixture.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            status: f.fixture.status.short,
            league: {
              id: f.league.id,
              name: f.league.name,
              country: f.league.country,
              logo: f.league.logo,
              flag: ARDAX_CONFIG.leagues.find(l => l.id === f.league.id)?.flag || '🏆',
            },
            home: {
              id: f.teams.home.id,
              name: f.teams.home.name,
              logo: f.teams.home.logo,
            },
            away: {
              id: f.teams.away.id,
              name: f.teams.away.name,
              logo: f.teams.away.logo,
            },
            score: f.goals,
          });
        });
      }
    });

    // Ordina per orario
    fixtures.sort((a, b) => new Date(a.date) - new Date(b.date));
    return fixtures;
  }

  // ── QUOTE ──
  async function getOdds(fixtureId) {
    const res = await call('/odds', { fixture: fixtureId });
    if (!res || !res.response || !res.response[0]) return null;

    const bookmaker = res.response[0].bookmakers?.[0];
    if (!bookmaker) return null;

    const odds = {};
    bookmaker.bets.forEach(bet => {
      bet.values.forEach(v => {
        odds[v.value] = parseFloat(v.odd);
      });
    });
    return odds;
  }

  // ── HEAD TO HEAD ──
  async function getH2H(team1Id, team2Id) {
    const res = await call('/fixtures/headtohead', {
      h2h: `${team1Id}-${team2Id}`,
      last: 5
    });
    if (!res || !res.response) return [];
    return res.response.map(f => ({
      date: new Date(f.fixture.date).toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'2-digit' }),
      home: f.teams.home.name,
      away: f.teams.away.name,
      homeGoals: f.goals.home,
      awayGoals: f.goals.away,
      winner: f.teams.home.winner ? 'H' : f.teams.away.winner ? 'A' : 'D',
    }));
  }

  // ── STATISTICHE SQUADRA ──
  async function getTeamStats(teamId, leagueId) {
    const res = await call('/teams/statistics', {
      team: teamId,
      league: leagueId,
      season: ARDAX_CONFIG.currentSeason
    });
    if (!res || !res.response) return null;
    const s = res.response;
    return {
      played:        s.fixtures?.played?.total || 0,
      wins:          s.fixtures?.wins?.total || 0,
      draws:         s.fixtures?.draws?.total || 0,
      loses:         s.fixtures?.loses?.total || 0,
      goalsFor:      s.goals?.for?.total?.total || 0,
      goalsAgainst:  s.goals?.against?.total?.total || 0,
      cleanSheets:   s.clean_sheet?.total || 0,
      form:          s.form || '',
      homeWins:      s.fixtures?.wins?.home || 0,
      awayWins:      s.fixtures?.wins?.away || 0,
      avgGoalsFor:   s.goals?.for?.average?.total || '0',
      avgGoalsAgainst: s.goals?.against?.average?.total || '0',
    };
  }

  // ── INFORTUNI E SQUALIFICHE ──
  async function getInjuries(fixtureId) {
    const res = await call('/injuries', { fixture: fixtureId });
    if (!res || !res.response) return [];
    return res.response.map(p => ({
      name: p.player.name,
      team: p.team.name,
      type: p.player.type,
      reason: p.player.reason,
    }));
  }

  // ── ARBITRO ──
  async function getReferee(fixtureId) {
    const res = await call('/fixtures', { id: fixtureId });
    if (!res || !res.response || !res.response[0]) return null;
    return res.response[0].fixture.referee || null;
  }

  // ── FORMA RECENTE (da fixture) ──
  async function getRecentForm(teamId, leagueId, last = 5) {
    const res = await call('/fixtures', {
      team: teamId,
      league: leagueId,
      season: ARDAX_CONFIG.currentSeason,
      last
    });
    if (!res || !res.response) return [];

    return res.response.reverse().map(f => {
      const isHome = f.teams.home.id === teamId;
      const myGoals = isHome ? f.goals.home : f.goals.away;
      const oppGoals = isHome ? f.goals.away : f.goals.home;
      if (myGoals > oppGoals) return 'V';
      if (myGoals < oppGoals) return 'P';
      return 'N';
    });
  }

  return {
    getFixturesByDate,
    getOdds,
    getH2H,
    getTeamStats,
    getInjuries,
    getReferee,
    getRecentForm,
  };
})();
