// ═══════════════════════════════════════════════
//  ARDAX FOOTBALL BETTING — data.js
//  Gestione CSV, schedine e storage locale
// ═══════════════════════════════════════════════

const ArdaxData = (() => {

  const CSV_KEY      = 'ardax_csv_data';
  const SCHEDINE_KEY = 'ardax_schedine';
  const METEO_CACHE  = 'ardax_meteo';

  // ════════════════════════════════════
  //  CSV FOOTBALL-DATA.CO.UK
  // ════════════════════════════════════

  // Mappa codici file → campionato
  const CSV_LEAGUE_MAP = {
    'I1': 'Serie A', 'I2': 'Serie B',
    'E0': 'Premier League', 'E1': 'Championship',
    'SP1': 'La Liga', 'D1': 'Bundesliga',
    'F1': 'Ligue 1', 'N1': 'Eredivisie',
    'P1': 'Primeira Liga', 'T1': 'Super Lig',
  };

  function detectLeagueFromFilename(filename) {
    const name = filename.replace('.csv', '').toUpperCase();
    return CSV_LEAGUE_MAP[name] || null;
  }

  // ── PARSING CSV ──
  function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    }).filter(r => r.HomeTeam && r.AwayTeam);
  }

  // ── CARICA FILE CSV ──
  async function loadCSVFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const text = e.target.result;
          const rows = parseCSV(text);
          const league = detectLeagueFromFilename(file.name);
          resolve({ rows, league, filename: file.name, count: rows.length });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Errore lettura file'));
      reader.readAsText(file, 'latin1'); // football-data usa latin1
    });
  }

  // ── SALVA DATI CSV ──
  function saveCSVData(leagueCode, rows) {
    try {
      const allData = getCSVData();
      allData[leagueCode] = { rows, updatedAt: new Date().toISOString() };
      localStorage.setItem(CSV_KEY, JSON.stringify(allData));
      return true;
    } catch (err) {
      console.error('CSV save error:', err);
      return false;
    }
  }

  function getCSVData() {
    try {
      return JSON.parse(localStorage.getItem(CSV_KEY) || '{}');
    } catch { return {}; }
  }

  function getLeagueCSVData(leagueCode) {
    const all = getCSVData();
    return all[leagueCode]?.rows || [];
  }

  function getCSVLastUpdate() {
    const all = getCSVData();
    const dates = Object.values(all).map(d => d.updatedAt).filter(Boolean);
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map(d => new Date(d)))).toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  // ════════════════════════════════════
  //  SCHEDINE
  // ════════════════════════════════════

  function getSchedine() {
    try {
      return JSON.parse(localStorage.getItem(SCHEDINE_KEY) || '[]');
    } catch { return []; }
  }

  function saveSchedine(schedine) {
    localStorage.setItem(SCHEDINE_KEY, JSON.stringify(schedine));
  }

  function createSchedina(name, events) {
    const schedine = getSchedine();
    const totalOdd = events.reduce((acc, e) => acc * parseFloat(e.odd || 1), 1);
    const newSchedina = {
      id: 'sch_' + Date.now(),
      name,
      createdAt: new Date().toISOString(),
      date: new Date().toLocaleDateString('it-IT'),
      events: events.map(e => ({
        ...e,
        result: 'pending', // 'win' | 'loss' | 'pending'
      })),
      totalOdd: parseFloat(totalOdd.toFixed(2)),
      published: true,
      status: 'pending', // 'win' | 'loss' | 'partial' | 'pending'
    };
    schedine.unshift(newSchedina);
    saveSchedine(schedine);
    return newSchedina;
  }

  function updateEventResult(schedinaId, eventIndex, result) {
    const schedine = getSchedine();
    const sch = schedine.find(s => s.id === schedinaId);
    if (!sch) return false;

    sch.events[eventIndex].result = result;

    // Aggiorna stato schedina
    const results = sch.events.map(e => e.result);
    if (results.every(r => r === 'win')) sch.status = 'win';
    else if (results.some(r => r === 'loss')) sch.status = 'loss';
    else if (results.some(r => r === 'win') && results.some(r => r === 'pending')) sch.status = 'partial';
    else sch.status = 'pending';

    saveSchedine(schedine);
    return true;
  }

  function deleteSchedina(schedinaId) {
    const schedine = getSchedine().filter(s => s.id !== schedinaId);
    saveSchedine(schedine);
  }

  function togglePublish(schedinaId) {
    const schedine = getSchedine();
    const sch = schedine.find(s => s.id === schedinaId);
    if (sch) { sch.published = !sch.published; saveSchedine(schedine); }
  }

  // ── STATS SCHEDINE ──
  function getSchedinaStats() {
    const schedine = getSchedine().filter(s => s.status !== 'pending');
    const wins = schedine.filter(s => s.status === 'win').length;
    return {
      total: schedine.length,
      wins,
      losses: schedine.filter(s => s.status === 'loss').length,
      winRate: schedine.length ? Math.round((wins / schedine.length) * 100) : 0,
    };
  }

  // ════════════════════════════════════
  //  METEO (Open-Meteo — gratis, no key)
  // ════════════════════════════════════

  // Coordinate stadio per campionato (approssimative)
  const LEAGUE_COORDS = {
    'Serie A':        { lat: 45.4654, lon: 9.1859 },  // Milano
    'Serie B':        { lat: 44.4949, lon: 11.3426 }, // Bologna
    'Premier League': { lat: 51.5074, lon: -0.1278 }, // Londra
    'La Liga':        { lat: 40.4168, lon: -3.7038 }, // Madrid
    'Bundesliga':     { lat: 52.5200, lon: 13.4050 }, // Berlino
    'Ligue 1':        { lat: 48.8566, lon: 2.3522 },  // Parigi
    'Eredivisie':     { lat: 52.3676, lon: 4.9041 },  // Amsterdam
    'Primeira Liga':  { lat: 38.7169, lon: -9.1399 }, // Lisbona
    'Championship':   { lat: 51.5074, lon: -0.1278 }, // Londra
    'Super Lig':      { lat: 41.0082, lon: 28.9784 }, // Istanbul
  };

  async function getWeather(leagueName, matchDate) {
    const cacheKey = `meteo_${leagueName}_${matchDate}`;
    try {
      const cached = JSON.parse(localStorage.getItem(METEO_CACHE) || '{}');
      if (cached[cacheKey] && Date.now() - cached[cacheKey].ts < 3 * 60 * 60 * 1000) {
        return cached[cacheKey].data;
      }
    } catch {}

    const coords = LEAGUE_COORDS[leagueName];
    if (!coords) return null;

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,precipitation_sum,weathercode&timezone=auto&start_date=${matchDate}&end_date=${matchDate}`;
      const res = await fetch(url);
      const d = await res.json();

      if (!d.daily) return null;

      const code = d.daily.weathercode?.[0];
      const temp = d.daily.temperature_2m_max?.[0];
      const rain = d.daily.precipitation_sum?.[0];

      const weather = {
        temp: Math.round(temp) + '°C',
        rain: rain > 0 ? rain.toFixed(1) + 'mm' : '0mm',
        icon: getWeatherIcon(code),
        desc: getWeatherDesc(code),
        influence: rain > 5 ? 'Pioggia intensa — favorisce Under' : rain > 0 ? 'Pioggia leggera' : 'Terreno asciutto',
      };

      const cache = {};
      try { Object.assign(cache, JSON.parse(localStorage.getItem(METEO_CACHE) || '{}')); } catch {}
      cache[cacheKey] = { data: weather, ts: Date.now() };
      localStorage.setItem(METEO_CACHE, JSON.stringify(cache));

      return weather;
    } catch { return null; }
  }

  function getWeatherIcon(code) {
    if (code === 0) return '☀️';
    if (code <= 2) return '⛅';
    if (code <= 49) return '🌫️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌦️';
    return '⛈️';
  }

  function getWeatherDesc(code) {
    if (code === 0) return 'Sereno';
    if (code <= 2) return 'Parzialmente nuvoloso';
    if (code <= 3) return 'Nuvoloso';
    if (code <= 49) return 'Nebbia';
    if (code <= 55) return 'Pioggerella';
    if (code <= 67) return 'Pioggia';
    if (code <= 77) return 'Neve';
    return 'Temporale';
  }

  return {
    loadCSVFile, saveCSVData, getCSVData, getLeagueCSVData, getCSVLastUpdate, detectLeagueFromFilename,
    getSchedine, createSchedina, updateEventResult, deleteSchedina, togglePublish, getSchedinaStats,
    getWeather,
  };
})();
