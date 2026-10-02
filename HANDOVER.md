# Handover

Context for anyone (agent or human) picking this project up. Keep it short and current.

## What this is

**Hotseat** — a local-first **Trackmania hotseat companion**. The joypad passes around the room, so
each player races in turn with their own countdown; beat the record to pass the joypad, run out of
time and you're out, and the last player holding the record wins the track. Sessions keep standings,
per-track records and history.

- **Repo:** https://github.com/mattyx96/hotseat-trackmania (public, default branch `main`)
- **Live:** https://hotseat-trackmania.pages.dev
- **Stack:** React 19 + TypeScript + Vite 8, styled with the **Nebula design system**
  (`nebula-ds-react-library`), hosted on Cloudflare Pages with Pages Functions + D1.

## How it works (product rules)

- Setup: name the session, set the **turn time** (default 10 min), add players (identity persists
  across sessions), start.
- A **track** gives every player their own countdown. The active player ("joypad") races.
- **Record time** logs the active player's run; only faster-than-record runs are stored. A new record
  passes the joypad to the next player.
- **Next player** or tapping a player card hands over the joypad without a record.
- Running out of time marks the player **out**; the joypad skips to the next player with time.
- The track ends when only the record holder has time left (or everyone is out): the **last player to
  hold the best time wins**.
- Standings: on each track the winner takes `N` points, second `N-1`, … (`N` = players that session).
- Tracks view: all-time record per track name + the previous record holders behind it.

## Architecture

```
src/                      React app (state in localStorage)
  App.tsx                 shell: header, tabs, theme, ?session= deep link
  index.css               layout only, on top of the Nebula tokens
  types.ts                AppData / Session / Track / TimeResult / Player
  lib/
    time.ts               parse/format lap times + countdown clocks
    track.ts              turn order, countdown, elimination + winner rules
    scoring.ts            rankings, standings, track overview
    storage.ts            localStorage load/save + JSON export/import (+ migration)
    cloud.ts              client for /api/sessions
  state/                  appContext.ts (context + useApp) + AppProvider.tsx (state, auto-save)
  components/             Card, SetupScreen, SessionView, Timer, RecordTimeDialog,
                          ShareSessionDialog, StandingsView, TracksView, SessionsView
functions/                Cloudflare Pages Functions (the API)
  _lib/                   shared types, share-code generation, payload validation
  api/sessions/           POST /api/sessions, GET|PUT /api/sessions/:code
migrations/               D1 migrations
wrangler.jsonc            Pages + D1 binding (DB -> hotseat)
```

- Local-first: **localStorage is the source of truth**; the cloud is an optional save/share layer.
- Cloud model: **no auth** — the short share code (8 chars, unambiguous alphabet) is the capability.
  Sessions are addressed by code; anyone with the code can read **and overwrite**. No listing
  endpoint; payloads are validated and size-capped.
- Once a session is shared, changes **auto-save** (debounced ~1.5 s) to D1.
- Deep link `/?session=<code>` imports a shared session on startup.

## Environment / ops

- **wrangler** installed globally (`/opt/homebrew/bin/wrangler`), authenticated as
  `grandemattyx@gmail.com` (account `d489f308be5436ebaddd3be26fda02fc`).
- **D1:** database `hotseat` (`a0a7c71f-1023-429d-afd6-38e72c6a710c`, region EEUR).
- **Pages project:** `hotseat-trackmania`.
- Commands: `npm run dev` (UI), `npm run dev:api` (functions + local D1 on :8788, Vite proxies `/api`),
  `npm run build`, `npm run typecheck:functions`, `npm run lint`, `npm run db:migrate:local|remote`,
  `npm run deploy`.
- **Deploys are manual** (`npm run deploy`). Push-to-deploy is not wired up yet.

## Conventions

- Keep changes consistent with the surrounding code and the **design system**: use library components
  and `--nb-*` tokens, no hard-coded colours. Light and dark must both look right.
- Verify UI changes by rendering (headless Chrome is available) — the browser tool in the agent
  session is not connected, so there's no click-through.
- Check the background/contrast default from the DS references when in doubt:
  nebula.irongalaxy.space, the Storybook, or `~/Desktop/Projects/constellation-starter`.

## Current state

- Feature-complete for local play + cloud save/share/load.
- Recent fixes: DS default surfaces restored (page/panels/header = `background-primary`), border and
  input-outline contrast, panel `round="no"` + `outline="200"`, players section restyle, per-player
  turns with pass/eliminate, session reopen, full-width setup action.
- Open work lives in [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) (e.g. timer shouldn't auto-start, clearer
  running state, human-readable record input, pre-fill previous record).
- Also discussed but **not built**: Cloudflare **Hono on Workers + D1 + auth** (Access/OAuth) as a
  heavier alternative to the current authless Pages Functions; recommended path was Pages Functions +
  D1 (built) and Access if auth is ever needed.
- Planned: a **skill** to automate deployment (user will ask for it later).

## Gotchas

- Sharing is authless by design — treat share codes as secrets.
- No client-side routing: tabs are component state, so no SPA fallback is needed on Pages.
- `dist/` is gitignored; Pages builds it. Lockfile is npm (`package-lock.json`).
