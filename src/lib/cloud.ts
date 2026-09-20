import type { CloudPayload, Player, Session } from '../types';

const CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6,12}$/i;

export function isShareCode(value: string): boolean {
  return CODE_RE.test(value.trim());
}

/** Accepts a bare code or a full share link (`…?session=CODE`). */
export function extractCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get('session');
    if (fromQuery) return fromQuery.trim().toUpperCase();
  } catch {
    // not a URL — treat as a bare code
  }
  return trimmed.toUpperCase();
}

export function buildPayload(session: Session, players: Player[]): CloudPayload {
  const referenced = new Set(session.playerIds);
  return {
    // The share code lives in its own column, so the stored session keeps it null.
    session: { ...session, shareCode: null },
    players: players.filter((player) => referenced.has(player.id)),
  };
}

async function unwrap(response: Response): Promise<unknown> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  return response.json().catch(() => ({}));
}

/** Creates a cloud copy and returns its short share code. */
export async function createCloudSession(session: Session, players: Player[]): Promise<string> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(buildPayload(session, players)),
  });
  const body = (await unwrap(response)) as { code: string };
  return body.code;
}

/** Overwrites an existing cloud session (used by auto-save). */
export async function updateCloudSession(code: string, session: Session, players: Player[]): Promise<void> {
  const response = await fetch(`/api/sessions/${encodeURIComponent(code)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(buildPayload(session, players)),
  });
  await unwrap(response);
}

/** Loads a cloud session by its share code. */
export async function fetchCloudSession(code: string): Promise<{ payload: CloudPayload; code: string }> {
  const response = await fetch(`/api/sessions/${encodeURIComponent(code)}`);
  const body = (await unwrap(response)) as CloudPayload & { code?: string };
  return { payload: { session: body.session, players: body.players }, code: body.code ?? code };
}
