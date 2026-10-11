# Architecture

## Overview

Hotseat is a single-page React app that is **local-first**. The browser is the source of truth for
everything; the cloud is an optional layer for sharing and restoring sessions.

```
┌──────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│                                                              │
│  React app (src/)                                            │
│    AppProvider ── state ──► localStorage  (hotseat.data.v2)  │
│         │                    ▲                               │
│         │                    └── JSON export / import        │
│         │                                                    │
│         └── src/lib/cloud.ts ── fetch('/api/sessions/…')     │
└──────────────────────────────┬───────────────────────────────┘
                               │ same origin, no CORS
┌──────────────────────────────▼───────────────────────────────┐
│ Cloudflare Pages                                             │
│   static assets (dist/)  +  Pages Functions (functions/)     │
│                                                              │
│   functions/api/sessions/  ── D1 binding "DB" ──►  D1        │
└──────────────────────────────────────────────────────────────┘
```

- **Static site:** the Vite build (`dist/`) served by Cloudflare Pages.
- **API:** Cloudflare **Pages Functions** in `functions/`, deployed with the site (same domain).
- **Database:** Cloudflare **D1** (SQLite), binding `DB` → database `hotseat`.

## Principles

1. **Local-first.** `localStorage` holds the whole `AppData`. The app is fully usable with no network
   and no account. The cloud is never required to play.
2. **One source of truth.** Game state only lives in `AppProvider`; components read it through
   `useApp()`. There is no separate server-side state model — the cloud stores a *snapshot*.
3. **Cloud is opt-in and additive.** A session is only uploaded when you press **Share**; after that it
   auto-saves. Loading merges the cloud copy into local state.
4. **No accounts.** A short **share code** is the capability: whoever has the code can read *and*
   overwrite that session. This keeps the whole backend to one table and three endpoints.
5. **Design-system first.** UI uses `nebula-ds-react-library` components and `--nb-*` tokens; light and
   dark must both look right (see [development.md](./development.md)).

## Runtime pieces

| Piece | Where | Responsibility |
| --- | --- | --- |
| App shell | `src/App.tsx` | Header, tabs, theme sync, `?session=` deep link. |
| State | `src/state/AppProvider.tsx` | All actions, `localStorage` persistence, debounced cloud auto-save. |
| Context | `src/state/appContext.ts` | `AppContext` + `useApp()`. |
| Rules | `src/lib/track.ts` | Turn order, countdown, elimination, winner. |
| Scoring | `src/lib/scoring.ts` | Rankings, standings, track overview. |
| Storage | `src/lib/storage.ts` | Load/save `localStorage`, normalise, JSON export/import. |
| Cloud client | `src/lib/cloud.ts` | Calls the `/api/sessions` endpoints. |
| API | `functions/` | Pages Functions for create / get / update. |
| Schema | `migrations/` | D1 migrations. |
| Config | `wrangler.jsonc` | Pages project name + D1 binding. |

## Decisions

Short ADR-style notes. Context → decision → consequences.

### ADR-0001 — Local-first with `localStorage`

- **Context:** the app is used by a group around one device; there is no account system and no need
  for a server to play.
- **Decision:** keep the entire state in `localStorage` (`hotseat.data.v2`), with JSON export/import
  for backup and moving between machines. Data is normalised on load so older shapes still work.
- **Consequences:** zero backend to run for normal use; state is per-browser; sharing requires the
  cloud layer (below).

### ADR-0002 — Cloud save via Pages Functions + D1, no auth

- **Context:** we wanted an optional way to share/restore a session, without building a backend, an
  auth system, or running servers.
- **Decision:** ship a tiny API as **Pages Functions** (same deploy as the site) backed by **D1**. A
  session is addressed by a server-generated **8-char share code**; the code is the capability. No
  accounts, no listing endpoint.
- **Consequences:** anyone with a code can read **and overwrite** that session — acceptable for a
  friends tool, and documented as a gotcha. If we ever need real access control, add Cloudflare
  Access in front, or an `edit_secret` column returned once on create.

### ADR-0003 — Sessions stored as JSON documents

- **Context:** standings, records and history are all derived client-side from the session graph.
- **Decision:** store each session (plus the players it references) as a single JSON blob in one
  `sessions` table, rather than normalising `players` / `tracks` / `results` tables.
- **Consequences:** the API stays three endpoints and the schema is one migration; there is no
  server-side querying. Normalising later is possible if we want cross-group leaderboards or analytics.

### Alternatives considered (and not built)

| Option | Why not |
| --- | --- |
| **Workers KV** | Simpler than D1, but eventual consistency and low per-key write throughput for a "save as you play" flow. |
| **R2** | Object storage is for files/backups; a live, frequently-updated save doesn't fit, and it needs signed URLs or a Worker to be browser-safe. |
| **Durable Objects** | The right tool for **live multi-device** sync (WebSocket per room) — more complexity and cost than a save feature needs. |
| **Hono on Workers + D1 + auth (Access/OAuth)** | Cleaner routing/validation and real accounts, but heavier than needed; kept as the upgrade path if sharing goes public. |

## Known limitations / future

- Authless sharing (see ADR-0002). Rate-limiting can be added at the Cloudflare edge if needed.
- No real-time multi-device sync; the cloud copy is last-write-wins.
- The schema is a document store, not queryable relational tables.
- Deploys are manual (see [deployment.md](./deployment.md)); push-to-deploy isn't wired up.
