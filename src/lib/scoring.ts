import type { Player, Session, Track } from '../types';

export interface TrackRankEntry {
  playerId: string;
  playerName: string;
  timeMs: number;
  position: number;
  points: number;
}

export interface TrackRanking {
  trackId: string;
  trackName: string;
  entries: TrackRankEntry[];
  best: TrackRankEntry | null;
}

export interface StandingRow {
  playerId: string;
  playerName: string;
  points: number;
  wins: number;
  records: number;
  bestTimeMs: number | null;
}

export interface OverviewEntry {
  playerId: string;
  playerName: string;
  timeMs: number;
  sessionId: string;
  sessionName: string;
  date: string;
}

export interface TrackOverview {
  key: string;
  name: string;
  plays: number;
  record: OverviewEntry | null;
  others: OverviewEntry[];
}

function playerName(players: Player[], playerId: string): string {
  return players.find((player) => player.id === playerId)?.name ?? 'Unknown';
}

/** The fastest recorded run on a track, if any. */
export function bestTime(track: Track): number | null {
  return track.results.reduce<number | null>(
    (best, result) => (best === null || result.timeMs < best ? result.timeMs : best),
    null,
  );
}

/**
 * Ranks the players who recorded a time on a track by their best run.
 * Points follow position: 1st = N, 2nd = N-1, ... where N is the roster size.
 */
export function rankTrack(track: Track, players: Player[]): TrackRanking {
  const bestByPlayer = new Map<string, number>();
  for (const result of track.results) {
    const current = bestByPlayer.get(result.playerId);
    if (current === undefined || result.timeMs < current) {
      bestByPlayer.set(result.playerId, result.timeMs);
    }
  }

  const rosterSize = Math.max(players.length, bestByPlayer.size);
  const entries: TrackRankEntry[] = [...bestByPlayer.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([playerId, timeMs], index) => ({
      playerId,
      playerName: playerName(players, playerId),
      timeMs,
      position: index + 1,
      points: rosterSize - index,
    }));

  return { trackId: track.id, trackName: track.name, entries, best: entries[0] ?? null };
}

/** Aggregates general standings across every given session. */
export function computeStandings(sessions: Session[], players: Player[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();

  for (const session of sessions) {
    const roster = session.playerIds
      .map((id) => players.find((player) => player.id === id))
      .filter((player): player is Player => Boolean(player));

    for (const track of session.tracks) {
      for (const entry of rankTrack(track, roster).entries) {
        let row = rows.get(entry.playerId);
        if (!row) {
          row = {
            playerId: entry.playerId,
            playerName: entry.playerName,
            points: 0,
            wins: 0,
            records: 0,
            bestTimeMs: null,
          };
          rows.set(entry.playerId, row);
        }
        row.points += entry.points;
        row.records += 1;
        if (entry.position === 1) row.wins += 1;
        if (row.bestTimeMs === null || entry.timeMs < row.bestTimeMs) {
          row.bestTimeMs = entry.timeMs;
        }
      }
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      (a.bestTimeMs ?? Number.POSITIVE_INFINITY) - (b.bestTimeMs ?? Number.POSITIVE_INFINITY),
  );
}

/** Groups tracks by name across all sessions and surfaces the all-time record + chasers. */
export function computeTrackOverview(sessions: Session[], players: Player[]): TrackOverview[] {
  const groups = new Map<string, TrackOverview>();

  for (const session of sessions) {
    for (const track of session.tracks) {
      const name = track.name.trim();
      const key = name.toLowerCase();
      if (!key) continue;

      let group = groups.get(key);
      if (!group) {
        group = { key, name, plays: 0, record: null, others: [] };
        groups.set(key, group);
      }
      group.plays += 1;

      for (const result of track.results) {
        const entry: OverviewEntry = {
          playerId: result.playerId,
          playerName: playerName(players, result.playerId),
          timeMs: result.timeMs,
          sessionId: session.id,
          sessionName: session.name,
          date: session.date,
        };
        if (!group.record || entry.timeMs < group.record.timeMs) {
          if (group.record) group.others.push(group.record);
          group.record = entry;
        } else {
          group.others.push(entry);
        }
      }
    }
  }

  const list = [...groups.values()];
  for (const group of list) group.others.sort((a, b) => a.timeMs - b.timeMs);
  return list.sort((a, b) => a.name.localeCompare(b.name));
}
