import type { AppData, Player, Session, TimeResult, Track, TrackPlayer } from '../types';
import { DEFAULT_TURN_MS } from './track';

const STORAGE_KEY = 'hotseat.data.v2';
const LEGACY_KEY = 'hotseat.data.v1';
const DATA_VERSION = 2;

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeResult(raw: unknown): TimeResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<TimeResult>;
  if (typeof value.playerId !== 'string' || typeof value.timeMs !== 'number') return null;
  return {
    id: typeof value.id === 'string' ? value.id : makeId(),
    playerId: value.playerId,
    timeMs: value.timeMs,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  };
}

function normalizeTrack(raw: unknown, playerIds: string[]): Track {
  const value = (raw ?? {}) as Partial<Track>;
  const durationMs =
    typeof value.durationMs === 'number' && value.durationMs > 0 ? value.durationMs : DEFAULT_TURN_MS;

  const players: TrackPlayer[] =
    Array.isArray(value.players) && value.players.length > 0
      ? value.players.map((player) => ({
          playerId: String(player.playerId),
          remainingMs: Math.max(0, numberOr(player.remainingMs, durationMs)),
        }))
      : playerIds.map((playerId) => ({ playerId, remainingMs: durationMs }));

  return {
    id: typeof value.id === 'string' ? value.id : makeId(),
    name: typeof value.name === 'string' && value.name.trim() ? value.name : 'Untitled track',
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    durationMs,
    players,
    activePlayerId: typeof value.activePlayerId === 'string' ? value.activePlayerId : null,
    timerStartedAt: typeof value.timerStartedAt === 'string' ? value.timerStartedAt : null,
    completedAt: typeof value.completedAt === 'string' ? value.completedAt : null,
    results: Array.isArray(value.results)
      ? value.results.map(normalizeResult).filter((result): result is TimeResult => result !== null)
      : [],
  };
}

function normalizeSession(raw: unknown): Session | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<Session>;
  if (typeof value.id !== 'string') return null;

  const playerIds = Array.isArray(value.playerIds)
    ? value.playerIds.filter((id): id is string => typeof id === 'string')
    : [];
  const turnDurationMs =
    typeof value.turnDurationMs === 'number' && value.turnDurationMs > 0 ? value.turnDurationMs : DEFAULT_TURN_MS;

  return {
    id: value.id,
    name: typeof value.name === 'string' && value.name.trim() ? value.name : `Session ${value.date ?? ''}`.trim(),
    date: typeof value.date === 'string' ? value.date : new Date().toISOString().slice(0, 10),
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    endedAt: typeof value.endedAt === 'string' ? value.endedAt : null,
    playerIds,
    turnDurationMs,
    shareCode: typeof value.shareCode === 'string' ? value.shareCode : null,
    tracks: Array.isArray(value.tracks) ? value.tracks.map((track) => normalizeTrack(track, playerIds)) : [],
  };
}

/** Coerces any stored/exported payload into the current data shape. */
export function normalizeData(value: unknown): AppData {
  const parsed = (value ?? {}) as Partial<AppData>;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.players) || !Array.isArray(parsed.sessions)) {
    throw new Error('This file is not a Hotseat export.');
  }

  const players: Player[] = parsed.players
    .filter(
      (player): player is Player =>
        Boolean(player) && typeof player.id === 'string' && typeof player.name === 'string',
    )
    .map((player) => ({ id: player.id, name: player.name }));

  const sessions = parsed.sessions
    .map(normalizeSession)
    .filter((session): session is Session => session !== null);

  const activeSessionId = sessions.some((session) => session.id === parsed.activeSessionId)
    ? (parsed.activeSessionId ?? null)
    : null;
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;
  const activeTrackId =
    activeSession && activeSession.tracks.some((track) => track.id === parsed.activeTrackId)
      ? (parsed.activeTrackId ?? null)
      : null;

  return { version: DATA_VERSION, players, sessions, activeSessionId, activeTrackId };
}

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    players: [],
    sessions: [],
    activeSessionId: null,
    activeTrackId: null,
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return emptyData();
    return normalizeData(JSON.parse(raw));
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable (private mode / quota); persistence is best-effort.
  }
}

/** Downloads the current data as a JSON file. */
export function downloadData(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `hotseat-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Reads an exported JSON file back into app data. */
export async function readDataFile(file: File): Promise<AppData> {
  const text = await file.text();
  return normalizeData(JSON.parse(text));
}
