# Game rules

Hotseat replaces Trackmania's hotseat mode: one joypad, several players, each with their own clock.
The rules below are implemented in `src/lib/track.ts` (turns/winner) and `src/lib/scoring.ts`
(standings/records).

## Setup

1. Name the session and set the **turn time** (default 10 minutes) — the per-player budget on every
   track.
2. Add players. Player identity is shared across sessions (matched by name), so standings follow the
   same person over time.
3. Start the session. You can reopen an ended session later from **Sessions**.

## A track

- Adding a track creates one **budget per player** (`durationMs`, from the session's turn time) and
  makes the first player the **active player**. The clock starts **stopped**.
- The active player presses **Start** to run their countdown, and **Stop** to pause. **±5s** nudges
  the clock (uncapped above, floored at 0) and **Reset turn** restores the full budget.

## A turn

A turn ends when either:

- the player **records a time faster than the current best** (see below), or
- their countdown reaches **0** — they are **out** for this track.

Either way the joypad moves to the **next player with time left** (wrapping the roster, skipping
anyone out). **The clock always ends stopped** — the next player presses Start themselves.

You can also hand over without a record:

- **Next player** — pass to the next player with time; the current player's elapsed time is deducted.
- **Tap a player card** — switch straight to that player (same time deduction).

## Recording

- Only runs **faster than the current record** are stored (the first time always counts). Slower or
  equal times are rejected.
- Opening the **Record time** dialog **stops the clock** (the run is over) and pre-fills the current
  record. Entry is segmented **min / sec / ms** with a live preview and a delta vs the record.
- Each stored run is a **record** at the moment it was set, so a track's history is the sequence of
  record holders, and the **last** one is the current holder.

## Winning a track

The track ends when it can't continue — i.e. only the record holder still has time, or everyone is
out. **The winner is the current record holder** (the last player to beat the best time). A player who
set the record and later ran out can still win.

## Scoring & standings

For every track, the players who recorded a time are ranked by their best run:

- **Points by position:** 1st = `N`, 2nd = `N-1`, … where `N` is the number of players in that session.
  Players who never recorded a time score 0 for the track.
- **General standings** sum points across sessions, tie-broken by **wins** (1st places), then by best
  time. See `computeStandings()`.

> Because only record-beating runs are stored, a track's points usually go to whoever beat the record
> — often the eventual winner takes most of them.

## Track overview

The **Tracks** tab groups tracks by name (case-insensitive, trimmed) across all sessions and shows, for
each: the **all-time record** holder and time, plus the **previous record holders** behind it (sorted
by time). See `computeTrackOverview()`.

## Edge cases

- **Single player:** the first recorded time completes the track immediately (that player wins).
- **Everyone out:** the last record holder wins even if they are out.
- **No record set:** a track can end with no winner.
- **Deleting a record** from the history is allowed and re-derives the ranking/record.
