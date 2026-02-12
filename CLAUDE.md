# CLAUDE.md

## Project Overview

**DRK Vereinsabstimmung** is a serverless, anonymous digital voting system for German Red Cross (Deutsches Rotes Kreuz) association meetings. Voters scan a QR code with their smartphones and cast secret ballots via peer-to-peer WebRTC connections — no server, no installation, fully GDPR-compliant.

**Live deployment:** https://afielen.github.io/drk/index.html

## Tech Stack

- **Vanilla JavaScript** (ES6 modules) — no framework, no build tools
- **HTML5 / CSS3** — static files served directly
- **PeerJS v1.5.4** (WebRTC) — peer-to-peer real-time communication (CDN)
- **jsPDF v2.5.1** — PDF protocol export (CDN)
- **qrcode-generator v1.4.4** — QR code rendering (inline-embedded)
- **Self-hosted fonts** — Source Sans 3, Source Serif 4 (WOFF2, GDPR-compliant)

## Project Structure

```
drk/
├── index.html              # Main SPA (presenter + voter UI)
├── danke.html              # Thank-you page shown after session ends
├── datenschutz.html        # Privacy policy
├── impressum.html          # Legal / imprint
├── logo.png / logo.svg     # DRK logos
├── css/
│   └── style.css           # All styles (presenter, voter, modals)
├── fonts/
│   ├── fonts.css           # @font-face declarations
│   └── *.woff2             # Self-hosted font files
├── js/
│   ├── app.js              # Main entry: state management, vote lifecycle, event handlers
│   ├── peer-mode.js        # PeerJS transport layer (host + voter sides)
│   ├── ui.js               # DOM utilities, fingerprinting, QR rendering, modals
│   └── pdf-export.js       # PDF report generation with DRK branding
└── api/                    # Empty placeholder (contains .gitkeep)
```

## Architecture

### Dual-mode SPA

The application runs as a single-page app with two roles determined by the URL:

- **Presenter (host):** Opens `index.html` directly. Creates a PeerJS peer, displays a QR code, manages voting rounds, and shows results.
- **Voter (client):** Opens `index.html?vote=[presenterPeerId]` (via QR scan). Connects to the presenter peer, receives vote topics, casts votes, and sees results.

### Voting Modes

1. **Offener Modus (Open Mode):** Voters scan the QR code directly. Browser fingerprinting + localStorage prevent double-voting.
2. **Stimmkarten-Modus (Token Mode):** Physical cards with 6-character codes (format `XXX-XXX`). Each code is valid once per voting round.

### Communication Protocol

All communication is peer-to-peer via WebRTC (PeerJS). Messages are JSON objects with a `type` field.

**Host to voter:** `vote-started`, `vote-confirmed`, `already-voted`, `waiting`, `session-ended`, `redirect`, `pong`

**Voter to host:** `cast-vote`, `sk-validate`, `sk-cast-vote`, `register`, `ping`

### Key Subsystems

| Module | Responsibility |
|--------|---------------|
| `app.js` | Session state, vote lifecycle (start/close/results), token generation, history tracking |
| `peer-mode.js` | `createHostTransport()` and `createVoterTransport()` — connection management, heartbeat (15s), reconnection (exponential backoff: 0/2/5/10/20s), disconnect cleanup (60s threshold) |
| `ui.js` | DOM helpers (`$()`), HTML escaping, crypto-secure random IDs, QR canvas rendering, device fingerprinting (Canvas, WebGL, fonts, hardware), modals |
| `pdf-export.js` | Professional PDF with DRK red header, colored result bars, participation stats, page numbers |

## Development Workflow

### No build process

This is a zero-build project. All JavaScript uses native ES6 modules (`type="module"` in the script tag). To develop locally, serve the files with any static HTTP server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (npx)
npx serve .
```

Then open `http://localhost:8000` in Chrome.

### No package.json

There is no `package.json`. External libraries are loaded from CDNs in `index.html`. No `npm install` is needed.

### No test framework

There is no automated test suite. Testing is done manually in-browser. Chrome is the primary target (QR code rendering may be limited in Edge).

### No linter or formatter

There is no ESLint, Prettier, or similar configuration. Follow the existing code style when making changes.

### Deployment

The app is deployed as static files on **GitHub Pages** from the `master` branch. Any push to `master` triggers a deployment.

## Code Conventions

- **Language:** All UI text, comments, variable names in user-facing HTML, and documentation are in **German**. JavaScript variable/function names use **English**.
- **Modules:** ES6 `import`/`export` — each `.js` file is a module loaded via `type="module"`.
- **DOM access:** Use the `$()` helper from `ui.js` (wraps `document.querySelector`).
- **Security-sensitive randomness:** Use `crypto.getRandomValues()` with `Math.random()` fallback. See `generateSecureId()` and `generateRandomCode()` in `ui.js`.
- **HTML escaping:** Always use `escapeHtml()` from `ui.js` when inserting user-provided text into the DOM.
- **No external dependencies at runtime beyond CDN libs** — keep it serverless and self-contained.

## Hardcoded Constants

| Constant | Value | Location |
|----------|-------|----------|
| Token charset | `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no ambiguous chars) | `app.js` |
| Reconnect delays | `[0, 2000, 5000, 10000, 20000]` ms | `peer-mode.js` |
| Max reconnect attempts | 5 | `peer-mode.js` |
| Heartbeat interval | 15s | `peer-mode.js` |
| Disconnect cleanup threshold | 60s | `peer-mode.js` |
| Default voter count | 10 | `app.js` |
| Default timer | 5 minutes | `app.js` |
| QR code size | 220x220 px | `ui.js` |
| Peer ID prefix | `drk-` + 16 random chars | `app.js` |

## Security Model

1. **Device fingerprinting** — multi-signal hash (Canvas, WebGL, fonts, screen, hardware, timezone, touch, platform)
2. **localStorage/sessionStorage** — prevents re-voting in normal browser windows
3. **Presenter-side validation** — host maintains a set of devices that already voted
4. **Crypto-secure session IDs** — `crypto.getRandomValues()` for peer IDs (2^64 possibilities)
5. **Peer ID collision retry** — up to 3 automatic retries if ID already taken on PeerJS server
6. **No data persistence** — all data is in-memory only, lost when session ends

## Important Notes for AI Assistants

- **No server-side code exists.** The `api/` directory is an empty placeholder. All logic runs client-side.
- **GDPR compliance is critical.** Do not introduce external service calls, tracking, cookies, or data persistence.
- **Anonymity is a core requirement.** Never add features that could link votes to individuals.
- **Keep it zero-build.** Do not introduce build tools (webpack, vite, etc.) or package managers unless explicitly requested.
- **Browser compatibility:** Primary target is Chrome. Test QR rendering if changing display code.
- **German text:** All user-facing strings must be in German. Use umlauts written as `ae`, `oe`, `ue` (not `ä`, `ö`, `ü`) to match the existing convention in the codebase.
- **CDN libraries:** PeerJS, jsPDF, and qrcode-generator are loaded from CDNs. Do not bundle or vendor them unless asked.
