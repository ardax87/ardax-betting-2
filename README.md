# Ardax Football Betting 🏆

Piattaforma AI di analisi scommesse calcistiche — 10 campionati, analisi Groq AI, PWA installabile su Android.

---

## 🚀 Setup in 5 minuti

### 1. Ottieni le API Key gratuite

**API-Football** (palinsesto automatico)
1. Vai su https://dashboard.api-football.com
2. Registrati gratuitamente
3. Copia la tua API key

**Groq AI** (analisi partite)
1. Vai su https://console.groq.com
2. Registrati gratuitamente
3. Crea una API key

### 2. Inserisci le API Key

Apri il file `js/config.js` e modifica:

```javascript
apiFootballKey: "INCOLLA_QUI_LA_TUA_API_FOOTBALL_KEY",
groqKey: "INCOLLA_QUI_LA_TUA_GROQ_KEY",
```

Imposta anche le credenziali admin:
```javascript
adminUsername: "admin",        // il tuo username admin
adminPassword: "CambiaQuesta!", // CAMBIA questa password!
```

### 3. Carica su GitHub

1. Crea una repository su GitHub (es: `ardax-betting`)
2. Carica tutti i file del progetto
3. Struttura finale:
```
ardax-betting/
├── index.html
├── manifest.json
├── sw.js
├── vercel.json
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── auth.js
│   ├── api.js
│   ├── ai.js
│   ├── data.js
│   └── app.js
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

### 4. Deploy su Vercel

1. Vai su https://vercel.com
2. Accedi con GitHub
3. Clicca "New Project"
4. Seleziona la tua repository `ardax-betting`
5. Clicca "Deploy"
6. ✅ Il sito è online! Vercel ti darà un URL tipo `ardax-betting.vercel.app`

---

## 📱 Installare come app su Android

1. Apri Chrome sul telefono
2. Vai sull'URL del tuo sito Ardax
3. Chrome mostra un banner "Aggiungi alla schermata Home"
4. Clicca "Installa" → l'app appare come icona sul telefono

---

## 📊 Come aggiornare le statistiche (ogni lunedì)

1. Vai su https://www.football-data.co.uk/data.php
2. Scarica i CSV dei campionati che ti interessano:
   - `I1.csv` = Serie A
   - `I2.csv` = Serie B
   - `E0.csv` = Premier League
   - `SP1.csv` = La Liga
   - `D1.csv` = Bundesliga
   - `F1.csv` = Ligue 1
   - `N1.csv` = Eredivisie
   - `P1.csv` = Primeira Liga
   - `E1.csv` = Championship
   - `T1.csv` = Super Lig
3. Accedi ad Ardax come admin
4. Vai in "Admin" → "Carica statistiche CSV"
5. Trascina tutti i file insieme
6. Clicca "Carica e aggiorna statistiche"
7. ✅ Fatto! L'AI usa i nuovi dati automaticamente

---

## 🎨 Cambiare i colori

Apri `css/style.css` e modifica le variabili in cima al file:

```css
:root {
  --color-primary:       #1a9e5c;   /* verde principale */
  --color-gold:          #c9a84c;   /* oro */
  --bg-app:              #0a1628;   /* sfondo */
}
```

Salva il file, fai push su GitHub → Vercel aggiorna automaticamente in 30 secondi.

---

## 👥 Gestire gli utenti

1. Accedi come admin
2. Vai nel pannello Admin
3. Sezione "Gestione utenti":
   - Inserisci username e password → "Crea utente"
   - Clicca "Elimina" per rimuovere un utente
4. Gli utenti non possono registrarsi autonomamente

---

## 📋 Creare una schedina

1. Accedi come admin
2. Vai nel pannello Admin → "Crea nuova schedina"
3. Inserisci il nome della schedina
4. Clicca sulle partite per aggiungere eventi
5. Per ogni evento inserisci la giocata e la quota
6. Clicca "Salva e pubblica"
7. Gli utenti vedono subito la schedina

### Aggiornare i risultati

1. Vai in Admin → schedine
2. Clicca ✅ (vinto) o ❌ (perso) per ogni evento

---

## 🔧 Struttura file

| File | Cosa fa |
|------|---------|
| `index.html` | App principale |
| `css/style.css` | Tutti gli stili — modifica qui per cambiare colori |
| `js/config.js` | Configurazione: API key, campionati, impostazioni |
| `js/auth.js` | Login, sessioni, gestione utenti |
| `js/api.js` | Chiamate API-Football |
| `js/ai.js` | Integrazione Groq AI |
| `js/data.js` | CSV, schedine, meteo, storage |
| `js/app.js` | Logica UI, navigazione, rendering |
| `manifest.json` | Configurazione PWA |
| `sw.js` | Service Worker (cache offline) |
| `vercel.json` | Configurazione deploy Vercel |

---

## 💡 Costi

| Servizio | Costo |
|----------|-------|
| API-Football (100 req/giorno) | Gratis |
| Groq AI | Gratis |
| Open-Meteo (meteo) | Gratis |
| Vercel hosting | Gratis |
| GitHub | Gratis |
| **TOTALE** | **€0/mese** |

---

## ⚠️ Note legali

Ardax Football Betting è un servizio di analisi statistica AI.
Non è un bookmaker e non accetta scommesse.
Le analisi sono generate da AI su base statistica — il calcio è imprevedibile.
Solo per utenti maggiori di 18 anni.

---

*Ardax Football Betting — Versione 1.0 — Fase 1*
