// ═══════════════════════════════════════════════
//  ARDAX FOOTBALL BETTING — ai.js
//  Integrazione Groq AI per analisi partite
// ═══════════════════════════════════════════════

const ArdaxAI = (() => {

  const GROQ_URL  = 'https://api.groq.com/openai/v1/chat/completions';
  const AI_CACHE  = 'ardax_ai_cache';

  function getGroqKey() {
    return ARDAX_CONFIG.groqKey;
  }

  // ── CACHE AI (dura tutta la giornata) ──
  function getAICache(key) {
    try {
      const cache = JSON.parse(localStorage.getItem(AI_CACHE) || '{}');
      const entry = cache[key];
      if (!entry) return null;
      // Cache valida per 6 ore
      if (Date.now() - entry.ts > 6 * 60 * 60 * 1000) return null;
      return entry.data;
    } catch { return null; }
  }

  function setAICache(key, data) {
    try {
      const cache = JSON.parse(localStorage.getItem(AI_CACHE) || '{}');
      cache[key] = { data, ts: Date.now() };
      if (Object.keys(cache).length > 30) {
        const oldest = Object.keys(cache).sort((a, b) => cache[a].ts - cache[b].ts)[0];
        delete cache[oldest];
      }
      localStorage.setItem(AI_CACHE, JSON.stringify(cache));
    } catch {}
  }

  // ── ANALISI PARTITA ──
  async function analyzeMatch(matchData) {
    const cacheKey = 'match_' + matchData.fixtureId;
    const cached = getAICache(cacheKey);
    if (cached) return cached;

    const prompt = buildPrompt(matchData);

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getGroqKey(),
        },
        body: JSON.stringify({
          model: ARDAX_CONFIG.groqModel,
          max_tokens: 800,
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: `Sei un analista esperto di scommesse calcistiche per la piattaforma Ardax Football Betting. 
Fornisci analisi tecniche precise e concise in italiano. 
Rispondi SEMPRE e SOLO in formato JSON valido, senza testo aggiuntivo.`
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!res.ok) throw new Error('Groq API error: ' + res.status);
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';

      let analysis;
      try {
        const clean = text.replace(/```json|```/g, '').trim();
        analysis = JSON.parse(clean);
      } catch {
        analysis = buildFallbackAnalysis(matchData);
      }

      setAICache(cacheKey, analysis);
      return analysis;

    } catch (err) {
      console.error('Groq AI error:', err);
      return buildFallbackAnalysis(matchData);
    }
  }

  // ── COSTRUISCI PROMPT ──
  function buildPrompt(d) {
    return `Analizza questa partita di calcio e fornisci previsioni di scommessa.

PARTITA: ${d.home} vs ${d.away}
CAMPIONATO: ${d.league}
DATA: ${d.date}

STATISTICHE ${d.home}:
- Forma recente: ${d.homeForm || 'N/D'}
- Media gol fatti: ${d.homeGoalsFor || 'N/D'}
- Media gol subiti: ${d.homeGoalsAgainst || 'N/D'}
- Clean sheet %: ${d.homeCleanSheet || 'N/D'}%
- BTTS %: ${d.homeBTTS || 'N/D'}%
- Over 2.5 %: ${d.homeOver25 || 'N/D'}%

STATISTICHE ${d.away}:
- Forma recente: ${d.awayForm || 'N/D'}
- Media gol fatti: ${d.awayGoalsFor || 'N/D'}
- Media gol subiti: ${d.awayGoalsAgainst || 'N/D'}
- Clean sheet %: ${d.awayCleanSheet || 'N/D'}%
- BTTS %: ${d.awayBTTS || 'N/D'}%
- Over 2.5 %: ${d.awayOver25 || 'N/D'}%

HEAD TO HEAD (ultimi 5): ${d.h2h || 'N/D'}
ASSENZE: ${d.injuries || 'Nessuna nota'}
METEO: ${d.weather || 'N/D'}

QUOTE BOOKMAKER:
${d.odds ? JSON.stringify(d.odds) : 'Quote non disponibili'}

Rispondi SOLO con questo JSON:
{
  "comment": "commento tecnico dettagliato di 2-3 frasi che spiega la situazione della partita e perché consigliare una certa giocata",
  "mainPick": {
    "market": "es: Segno 1 / Over 2.5 / Gol Sì / DC 1X",
    "odd": 1.85,
    "confidence": 78,
    "reason": "motivo breve in 1 frase"
  },
  "altPick": {
    "market": "mercato alternativo",
    "odd": 1.65,
    "confidence": 65,
    "reason": "motivo breve"
  },
  "risk": "LOW / MEDIUM / HIGH",
  "valueBet": true,
  "markets": {
    "1": { "confidence": 65 },
    "X": { "confidence": 25 },
    "2": { "confidence": 40 },
    "DC1X": { "confidence": 80 },
    "Over25": { "confidence": 72 },
    "GolSi": { "confidence": 68 }
  }
}`;
  }

  // ── FALLBACK SE AI NON RISPONDE ──
  function buildFallbackAnalysis(d) {
    return {
      comment: `Analisi in corso per ${d.home} vs ${d.away}. I dati statistici suggeriscono una partita equilibrata. Valutare i mercati con attenzione alle quote disponibili.`,
      mainPick: { market: "DC 1X", odd: 1.35, confidence: 62, reason: "Opzione più sicura con copertura doppia" },
      altPick: { market: "Over 1.5", odd: 1.40, confidence: 68, reason: "Almeno 2 gol attesi nella media" },
      risk: "MEDIUM",
      valueBet: false,
      markets: { "1": { confidence: 50 }, "X": { confidence: 30 }, "2": { confidence: 35 }, "DC1X": { confidence: 62 }, "Over25": { confidence: 55 }, "GolSi": { confidence: 58 } }
    };
  }

  // ── SELEZIONA GIOCATE VIP (le migliori della giornata) ──
  async function selectVIPPicks(analyses) {
    const threshold = ARDAX_CONFIG.vipConfidenceThreshold;
    const vipPicks = [];

    analyses.forEach(({ match, analysis }) => {
      if (analysis.mainPick.confidence >= threshold) {
        vipPicks.push({
          match,
          pick: analysis.mainPick,
          comment: analysis.comment,
          risk: analysis.risk,
          valueBet: analysis.valueBet,
        });
      }
    });

    // Ordina per confidenza decrescente, max 6 nel VIP
    return vipPicks
      .sort((a, b) => b.pick.confidence - a.pick.confidence)
      .slice(0, 6);
  }

  // ── STATISTICHE CSV (da football-data.co.uk) ──
  // Calcola BTTS%, Over25% dalla storia CSV
  function calculateCSVStats(teamName, csvData) {
    if (!csvData || !csvData.length) return null;

    const homeMatches = csvData.filter(r => r.HomeTeam === teamName);
    const awayMatches = csvData.filter(r => r.AwayTeam === teamName);
    const allMatches = [...homeMatches, ...awayMatches];

    if (allMatches.length === 0) return null;

    const btts = allMatches.filter(r => {
      const hg = parseInt(r.FTHG || 0);
      const ag = parseInt(r.FTAG || 0);
      return hg > 0 && ag > 0;
    }).length;

    const over25 = allMatches.filter(r => {
      const total = parseInt(r.FTHG || 0) + parseInt(r.FTAG || 0);
      return total > 2;
    }).length;

    const goalsFor = homeMatches.reduce((s, r) => s + parseInt(r.FTHG || 0), 0)
                   + awayMatches.reduce((s, r) => s + parseInt(r.FTAG || 0), 0);

    const goalsAgainst = homeMatches.reduce((s, r) => s + parseInt(r.FTAG || 0), 0)
                       + awayMatches.reduce((s, r) => s + parseInt(r.FTHG || 0), 0);

    const cleanSheets = homeMatches.filter(r => parseInt(r.FTAG || 0) === 0).length
                      + awayMatches.filter(r => parseInt(r.FTHG || 0) === 0).length;

    return {
      btts: Math.round((btts / allMatches.length) * 100),
      over25: Math.round((over25 / allMatches.length) * 100),
      avgGoalsFor: (goalsFor / allMatches.length).toFixed(1),
      avgGoalsAgainst: (goalsAgainst / allMatches.length).toFixed(1),
      cleanSheetPct: Math.round((cleanSheets / allMatches.length) * 100),
    };
  }

  return { analyzeMatch, selectVIPPicks, calculateCSVStats };
})();
