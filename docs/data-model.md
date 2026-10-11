# Data model

Two shapes matter: the **local** state (browser) and the **cloud** record (D1). All types live in
[`src/types.ts`](../src/types.ts).

## Local state (`AppData`)

```ts
interface AppData {
  version: number;              // current: 2
  players: Player[];            // global roster, shared across sessions
  sessions: Session[];
  activeSessionId: string | null;
  activeTrackId: string | null;
}
```

| Type | Fields |
| --- | --- |
| `Player` | `id`, `name` |
| `TimeResult` | `id`, `playerId`, `timeMs`, `createdAt` — **only record-beating runs** |
| `TrackPlayer` | `playerId`, `remainingMs` — remaining budget for that player on the track |
| `Track` | `id`, `name`, `createdAt`, `durationMs`, `players: TrackPlayer[]`, `activePlayerId`, `timerStartedAt`, `completedAt`, `results: TimeResult[]` |
| `Session` | `id`, `name`, `date`, `createdAt`, `endedAt`, `playerIds`, `turnDurationMs`, `tracks: Track[]`, `shareCode` |
| `CloudPayload` | `session`, `players` — what gets stored in the cloud |

Notes:

- `Track.timerStartedAt` is the running-clock anchor: `null` means stopped. Live remaining time is
  `remainingMs - (now - timerStartedAt)` (see `liveRemaining()`).
- `Session.shareCode` is `null` until the session is shared; once set, the session auto-saves to D1.
- Players are referenced by id everywhere; the cloud payload carries the players a session needs so a
  load is self-contained.

## Local persistence

- Key: **`hotseat.data.v2`** (legacy `hotseat.data.v1` is read as a fallback).
- `src/lib/storage.ts`:
  - `loadData()` — read + `normalizeData()`.
  - `saveData()` — write on every state change (best-effort; quota/private-mode safe).
  - `normalizeData()` — coerces any stored/imported payload into the current shape (fills defaults,
    rebuilds missing tracks/players), so old exports and legacy data keep working.
  - `downloadData()` / `readDataFile()` — JSON export / import.
- Because the cloud payload is the same shape, the API reuses the same validation.

## Cloud record (D1)

Schema (`migrations/0001_init.sql`):

```sql
CREATE TABLE IF NOT EXISTS sessions (
  code       TEXT PRIMARY KEY,   -- short share code (server-generated)
  name       TEXT NOT NULL,
  data       TEXT NOT NULL,      -- JSON: { session, players }
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- `code` — 8 chars from an unambiguous alphabet (see [api.md](./api.md)); the capability.
- `data` — the serialised `CloudPayload`; `session.shareCode` is stored as `null` (the code lives in
  the column).
- One row per shared session. There is **no** normalised `players`/`tracks`/`results` schema — see
  [architecture.md](./architecture.md) ADR-0003.

## Derived data

Nothing above is duplicated; these are computed on the fly in `src/lib/scoring.ts`:

- `bestTime(track)` — fastest run.
- `rankTrack(track, players)` — ranked entries + points by position.
- `computeStandings(sessions, players)` — aggregated points, wins, best time.
- `computeTrackOverview(sessions, players)` — tracks grouped by name with all-time record + chasers.
