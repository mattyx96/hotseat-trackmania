import type { Track, TrackPlayer } from '../types';

/** Default time budget each player gets per track. */
export const DEFAULT_TURN_MS = 10 * 60 * 1000;

export function activePlayer(track: Track): TrackPlayer | undefined {
  return track.players.find((player) => player.playerId === track.activePlayerId);
}

/** Live remaining time for the player whose turn it is. */
export function liveRemaining(track: Track, now: number): number {
  const player = activePlayer(track);
  if (!player) return 0;
  const running = track.timerStartedAt ? Math.max(0, now - new Date(track.timerStartedAt).getTime()) : 0;
  return Math.max(0, player.remainingMs - running);
}

/** The player who currently holds the record (the last one to beat the best time). */
export function recordHolderId(track: Track): string | null {
  return track.results.length > 0 ? track.results[track.results.length - 1].playerId : null;
}

export function alivePlayers(track: Track): TrackPlayer[] {
  return track.players.filter((player) => player.remainingMs > 0);
}

export function isTrackComplete(track: Track): boolean {
  return track.completedAt !== null;
}

/**
 * Decides what happens after the active player's turn ends (a new record or a timeout):
 * either finish the track or hand the joypad to the next player who still has time.
 * The winner is always the current record holder.
 */
export function resolveTurn(track: Track, now: number): Track {
  if (track.completedAt) return track;

  const holderId = recordHolderId(track);
  const alive = alivePlayers(track);
  const canContinue = alive.length > 1 || (alive.length === 1 && alive[0].playerId !== holderId);

  if (!canContinue) {
    return {
      ...track,
      completedAt: new Date(now).toISOString(),
      timerStartedAt: null,
      activePlayerId: null,
    };
  }

  const order = track.players;
  const currentIndex = order.findIndex((player) => player.playerId === track.activePlayerId);
  let next: TrackPlayer | undefined;
  for (let step = 1; step <= order.length; step += 1) {
    const candidate = order[(currentIndex + step) % order.length];
    if (candidate.remainingMs > 0) {
      next = candidate;
      break;
    }
  }
  const target = next ?? alive[0];

  return {
    ...track,
    activePlayerId: target.playerId,
    timerStartedAt: target.playerId === track.activePlayerId ? track.timerStartedAt : new Date(now).toISOString(),
  };
}
