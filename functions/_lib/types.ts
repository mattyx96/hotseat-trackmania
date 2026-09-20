import type { Player, Session } from '../../src/types';

export interface Env {
  DB: D1Database;
}

/** What we store in `sessions.data`: a session plus the players it references. */
export interface StoredPayload {
  session: Session;
  players: Player[];
}
