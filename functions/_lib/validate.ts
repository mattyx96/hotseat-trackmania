import type { StoredPayload } from './types';

const MAX_BODY_BYTES = 256 * 1024;

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new Error('Payload is too large.');
  }
  return JSON.parse(text);
}

export type ParseResult = { ok: true; payload: StoredPayload } | { ok: false; error: string };

/** Minimal shape validation so a public (authless) endpoint can't store junk. */
export function parsePayload(raw: unknown): ParseResult {
  if (!isRecord(raw)) return { ok: false, error: 'Body must be a JSON object.' };

  const { session, players } = raw;
  if (!isRecord(session)) return { ok: false, error: 'Missing session.' };
  if (typeof session.id !== 'string' || !session.id) return { ok: false, error: 'session.id is required.' };
  if (typeof session.name !== 'string') return { ok: false, error: 'session.name is required.' };
  if (!Array.isArray(session.playerIds)) return { ok: false, error: 'session.playerIds must be an array.' };
  if (!Array.isArray(session.tracks)) return { ok: false, error: 'session.tracks must be an array.' };
  if (typeof session.turnDurationMs !== 'number' || !Number.isFinite(session.turnDurationMs)) {
    return { ok: false, error: 'session.turnDurationMs must be a number.' };
  }
  if (!Array.isArray(players)) return { ok: false, error: 'players must be an array.' };
  if (players.length > 64) return { ok: false, error: 'Too many players.' };

  for (const player of players) {
    if (!isRecord(player) || typeof player.id !== 'string' || typeof player.name !== 'string') {
      return { ok: false, error: 'Each player needs a string id and name.' };
    }
  }

  const cleanSession = { ...session, name: session.name.slice(0, 120), shareCode: null };
  const cleanPlayers = (players as { id: string; name: string }[]).map((player) => ({
    id: player.id,
    name: player.name.slice(0, 60),
  }));

  return {
    ok: true,
    payload: { session: cleanSession as unknown as StoredPayload['session'], players: cleanPlayers },
  };
}
