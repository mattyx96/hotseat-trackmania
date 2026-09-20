export interface Player {
  id: string;
  name: string;
}

export interface TimeResult {
  id: string;
  playerId: string;
  timeMs: number;
  createdAt: string;
}

export interface TrackPlayer {
  playerId: string;
  /** Remaining time budget for this player on this track, in milliseconds. */
  remainingMs: number;
}

export interface Track {
  id: string;
  name: string;
  createdAt: string;
  /** Per-player time budget for this track. */
  durationMs: number;
  /** Turn order and remaining time for each player on this track. */
  players: TrackPlayer[];
  /** Whose turn (joypad) it is, or null when the track is finished. */
  activePlayerId: string | null;
  /** ISO timestamp when the active player's countdown was started, or null when paused. */
  timerStartedAt: string | null;
  /** ISO timestamp when the track ended, or null while it is being played. */
  completedAt: string | null;
  /** Only runs that beat the previous best, in chronological order. */
  results: TimeResult[];
}

export interface Session {
  id: string;
  name: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  createdAt: string;
  endedAt: string | null;
  playerIds: string[];
  /** Default time budget per player, per track (e.g. 10 minutes). */
  turnDurationMs: number;
  tracks: Track[];
}

export interface AppData {
  version: number;
  players: Player[];
  sessions: Session[];
  activeSessionId: string | null;
  activeTrackId: string | null;
}
