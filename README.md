# Artemis II Live Tracker

> A calm, live social tracker — see where Orion is, what happens next, and who else is watching.

**Stack:** React + Vite · Netlify (hosting + serverless) · Supabase (real-time presence & reactions)

---

## Setup in ~20 minutes

### 1 — Clone and install

```bash
git clone https://github.com/you/artemis2-tracker
cd artemis2-tracker
npm install
```

### 2 — Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste + run the contents of `supabase/schema.sql`
3. Grab your **Project URL** and **anon/public key** from Settings → API

### 3 — Environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

The `NASA_AROW_URL` is optional — the app falls back to calculated estimates if it's blank.

### 4 — Run locally

```bash
npm run dev
# or, to test the Netlify function locally:
npx netlify dev
```

### 5 — Deploy to Netlify

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
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
| `NASA_AROW_URL` | NASA AROW endpoint (optional) |

### 6 — Custom domain

Buy a domain (`artemis2.live`, `whereorion.com`, etc.) and point it at Netlify.
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
│   ├── App.jsx              ← Root: clock, AROW polling, presence
│   ├── lib/
│   │   ├── mission.js       ← Trajectory math, phase data, estimates
│   │   └── supabase.js      ← Presence, broadcast, DB reactions
│   └── components/
│       ├── MissionCanvas.jsx ← SVG trajectory (Earth → Moon → Earth)
│       ├── StatStrip.jsx    ← Live telemetry row
│       ├── Timeline.jsx     ← Mission milestones
│       └── ReactionDock.jsx ← Emoji reactions + viewer count
├── supabase/
│   └── schema.sql           ← Run once to set up Supabase
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
