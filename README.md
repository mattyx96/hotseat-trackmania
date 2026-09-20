# Hotseat

A local-first **Trackmania hotseat companion**: set up the players, race a track, log the
record-beating times, and keep standings + track records across sessions.

Built with React 19 + Vite and the [Nebula design system](https://nebula-ds-react-library.irongalaxy.space)
(`nebula-ds-react-library`). All state lives in the browser (`localStorage`), with JSON export/import.

## Scripts

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
npm run lint     # oxlint
```

## How it works

The joypad passes around the room, so every player races in turn with their own countdown.

1. **Play → Setup** — name the session, set the **turn time** (default 10 minutes), add the players
   (known players are one tap away and keep their identity across sessions), then **Start session**.
2. **Track** — name a track; it starts right away with the first player's countdown running.
3. **Turns** — a player races until they **beat the record**. Enter the time with **Record time** and
   the joypad passes to the next player, whose countdown starts. You can also pass at any time with
   **Next player**, or tap a player in the strip to switch to them — no record needed. If a player's
   countdown hits zero they're **out** and the joypad skips to the next player with time left.
   Start/Stop, **±1s / ±5s** and **Reset turn** keep the clock honest.
4. **Winning a track** — the track ends when only the record holder has time left (or everyone is
   out): the **last player to hold the best time wins**. The record history shows every record as it
   was beaten, newest (current holder) first.
5. **Next track** — hit **New track** (or name one) and the party moves on; everyone gets a fresh
   countdown.
6. **Standings / Tracks / Sessions** — general points across all sessions, all-time track records
   with the chasers behind them, and the session history. Export/Import JSON and reset all data from
   **Sessions**.

## Data model

```
Player      { id, name }
TrackPlayer { playerId, remainingMs }              // per-player turn budget on a track
Track       { id, name, durationMs, players, activePlayerId,
              timerStartedAt, completedAt, results: TimeResult[] }
TimeResult  { id, playerId, timeMs, createdAt }    // only record-beating runs
Session     { id, name, date, endedAt, playerIds, turnDurationMs, tracks: Track[] }
AppData     { version, players, sessions, activeSessionId, activeTrackId }
```

Records, standings and the track overview are all derived from `AppData` (`src/lib/scoring.ts`).

## Project layout

```
src/
  App.tsx                 app shell (header, tabs, theme toggle)
  main.tsx                entry point (imports the Nebula stylesheet)
  index.css               layout styles on top of the Nebula tokens
  types.ts                data model
  lib/
    time.ts               parse/format lap times and countdown clocks
    track.ts              turn order, countdown, elimination + winner rules
    scoring.ts            rankings, standings, track overview
    storage.ts            localStorage load/save + JSON export/import (with migration)
  hooks/useNow.ts         ticking clock for live timers
  state/
    appContext.ts         context + useApp hook
    AppProvider.tsx       global state and actions
  components/             Card, SetupScreen, SessionView, Timer, RecordTimeDialog,
                          StandingsView, TracksView, SessionsView
```
