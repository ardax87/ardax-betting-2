// ═══════════════════════════════════════════════
//  ARDAX FOOTBALL BETTING — config.js
// ═══════════════════════════════════════════════

const ARDAX_CONFIG = {

  appName: "Ardax Football Betting",
  appShortName: "Ardax",

  // Chiavi impostate su Vercel > Settings > Environment Variables
  // Nome variabile: API_FOOTBALL_KEY e GROQ_KEY
  apiFootballKey: window.__ENV__?.apiFootball || "",
  groqKey: window.__ENV__?.groq || "",

  leagues: [
    { id: 135, name: "Serie A",        country: "Italia",      flag: "\uD83C\uDDEE\uD83C\uDDF9", csvCode: "I1"  },
    { id: 136, name: "Serie B",        country: "Italia",      flag: "\uD83C\uDDEE\uD83C\uDDF9", csvCode: "I2"  },
    { id: 39,  name: "Premier League", country: "Inghilterra", flag: "\uD83C\uDDEC\uD83C\uDDE7", csvCode: "E0"  },
    { id: 140, name: "La Liga",        country: "Spagna",      flag: "\uD83C\uDDEA\uD83C\uDDF8", csvCode: "SP1" },
    { id: 78,  name: "Bundesliga",     country: "Germania",    flag: "\uD83C\uDDE9\uD83C\uDDEA", csvCode: "D1"  },
    { id: 61,  name: "Ligue 1",        country: "Francia",     flag: "\uD83C\uDDEB\uD83C\uDDF7", csvCode: "F1"  },
    { id: 88,  name: "Eredivisie",     country: "Olanda",      flag: "\uD83C\uDDF3\uD83C\uDDF1", csvCode: "N1"  },
    { id: 94,  name: "Primeira Liga",  country: "Portogallo",  flag: "\uD83C\uDDF5\uD83C\uDDF9", csvCode: "P1"  },
    { id: 40,  name: "Championship",   country: "Inghilterra", flag: "\uD83C\uDDEC\uD83C\uDDE7", csvCode: "E1"  },
    { id: 203, name: "Super Lig",      country: "Turchia",     flag: "\uD83C\uDDF9\uD83C\uDDF7", csvCode: "T1"  },
  ],

  markets: [
    { key: "1",   label: "1",         desc: "Vittoria Casa"       },
    { key: "X",   label: "X",         desc: "Pareggio"            },
    { key: "2",   label: "2",         desc: "Vittoria Ospite"     },
    { key: "1X",  label: "DC 1X",     desc: "Doppia Chance 1X"    },
    { key: "12",  label: "DC 12",     desc: "Doppia Chance 12"    },
    { key: "X2",  label: "DC X2",     desc: "Doppia Chance X2"    },
    { key: "O25", label: "Over 2.5",  desc: "Totale Gol Over 2.5" },
    { key: "U25", label: "Under 2.5", desc: "Totale Gol Under 2.5"},
    { key: "GG",  label: "Gol Si",    desc: "Entrambe segnano"    },
    { key: "NG",  label: "No Gol",    desc: "Una non segna"       },
    { key: "AH",  label: "AH -0.5",   desc: "Handicap Asiatico"   },
    { key: "O15", label: "Over 1.5",  desc: "Totale Gol Over 1.5" },
  ],

  adminUsername: "admin",
  adminPassword: "ardax2025admin",
  currentSeason: 2024,
  groqModel: "llama-3.3-70b-versatile",
  vipConfidenceThreshold: 75,
  daysRange: 4,
};
