# Artemis II Tracker Archive

> An archived mission tracker for Artemis II with frozen social stats from the live run.

**Stack:** React + Vite · Netlify (hosting + serverless) · local archived social stats

---

## Setup in ~5 minutes

### 1 — Clone and install

```bash
git clone https://github.com/you/artemis2-tracker
cd artemis2-tracker
npm install
```

### 2 — Environment variables

```bash
cp .env.example .env.local
```

Fill in the optional NASA endpoint if you have one:

```
NASA_AROW_URL=https://example.com/arow.json
```

If `NASA_AROW_URL` is blank, the app falls back to calculated estimates.

### 3 — Run locally

```bash
npm run dev
# or, to test the Netlify function locally:
npx netlify dev
```

### 4 — Deploy to Netlify

```bash
# Option A: GitHub integration (recommended)
# Push to GitHub → connect repo in Netlify UI → done.

# Option B: Netlify CLI
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

Set your env vars in **Netlify → Site settings → Environment variables**:

| Key | Value |
|-----|-------|
| `NASA_AROW_URL` | NASA AROW endpoint (optional) |

### 5 — Custom domain

Buy a domain (`artemis2mission.live`, `whereorion.com`, etc.) and point it at Netlify.
Netlify provisions HTTPS automatically.

---

## Add your icon

Drop two files into `/public`:

- `favicon.svg` — your Artemis II icon (SVG preferred)
- `og-preview.png` — 1200×630px screenshot of the tracker for social sharing

---

## Project structure

```
├── netlify/
│   └── functions/
│       └── arow.js          ← NASA AROW proxy (avoids CORS)
├── src/
│   ├── App.jsx              ← Root: clock, archive banner, fireworks replay
│   ├── lib/
│   │   ├── mission.js       ← Trajectory math, phase data, estimates
│   │   └── archiveStats.js  ← Frozen emoji totals + peak viewer count
│   └── components/
│       ├── MissionCanvas.jsx ← SVG trajectory (Earth → Moon → Earth)
│       ├── StatStrip.jsx    ← Live telemetry row
│       ├── Timeline.jsx     ← Mission milestones
│       └── ReactionDock.jsx ← Frozen reaction stats + music dock
└── netlify.toml
```

---

## NASA AROW

When NASA publishes the AROW endpoint URL, add it to `NASA_AROW_URL`.
The proxy in `netlify/functions/arow.js` handles CORS and normalises units (km → miles).
Adjust the field name mapping at the top of that file once you see the real response shape.

---

## Sharing checklist

- [ ] Screenshot the tracker → save as `public/og-preview.png`
- [ ] Post to r/space and r/nasa with mission day context
- [ ] Tweet with `#Artemis2` — journalists monitor that tag
- [ ] "Show HN" on Hacker News
- [ ] Tag `@NASA` and `@NASAArtemis`

---

## Archive notes

- Social stats are frozen from the live mission run.
- Peak live viewers are recorded locally in `src/lib/archiveStats.js`.
- Splashdown fireworks no longer auto-play; they can be replayed manually from the archive banner.
