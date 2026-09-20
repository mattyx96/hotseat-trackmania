import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildPayload, updateCloudSession } from '../lib/cloud';
import { resolveTurn } from '../lib/track';
import { loadData, saveData } from '../lib/storage';
import type { AppData, CloudPayload, Player, Session, TimeResult, Track } from '../types';
import { AppContext, type AppContextValue } from './appContext';

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function updateTrack(data: AppData, trackId: string, updater: (track: Track) => Track): AppData {
  return {
    ...data,
    sessions: data.sessions.map((session) => ({
      ...session,
      tracks: session.tracks.map((track) => (track.id === trackId ? updater(track) : track)),
    })),
  };
}

/** Deducts the currently running segment from the active player's remaining time. */
function consumeActiveTime(track: Track, now: number): Track {
  if (!track.timerStartedAt || !track.activePlayerId) return track;
  const used = Math.max(0, now - new Date(track.timerStartedAt).getTime());
  return {
    ...track,
    players: track.players.map((player) =>
      player.playerId === track.activePlayerId
        ? { ...player, remainingMs: Math.max(0, player.remainingMs - used) }
        : player,
    ),
    timerStartedAt: null,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());
  const lastSynced = useRef(new Map<string, string>());
  const syncTimers = useRef(new Map<string, number>());

  useEffect(() => {
    saveData(data);
  }, [data]);

  // Auto-save any session that has been shared to the cloud (debounced).
  useEffect(() => {
    const timers = syncTimers.current;
    for (const session of data.sessions) {
      const code = session.shareCode;
      if (!code) continue;

      const snapshot = JSON.stringify(buildPayload(session, data.players));
      if (lastSynced.current.get(code) === snapshot) continue;

      const pending = timers.get(code);
      if (pending !== undefined) window.clearTimeout(pending);

      timers.set(
        code,
        window.setTimeout(() => {
          timers.delete(code);
          lastSynced.current.set(code, snapshot);
          updateCloudSession(code, session, data.players).catch(() => {
            // Allow a retry on the next change.
            lastSynced.current.delete(code);
          });
        }, 1500),
      );
    }

    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, [data]);

  const createSession = useCallback((name: string, playerNames: string[], turnDurationMs: number) => {
    setData((prev) => {
      const players = [...prev.players];
      const playerIds: string[] = [];

      for (const rawName of playerNames) {
        const trimmed = rawName.trim();
        if (!trimmed) continue;
        let player = players.find((candidate) => candidate.name.toLowerCase() === trimmed.toLowerCase());
        if (!player) {
          player = { id: uid(), name: trimmed };
          players.push(player);
        }
        if (!playerIds.includes(player.id)) playerIds.push(player.id);
      }

      const now = new Date();
      const session: Session = {
        id: uid(),
        name: name.trim() || `Session ${now.toISOString().slice(0, 10)}`,
        date: now.toISOString().slice(0, 10),
        createdAt: now.toISOString(),
        endedAt: null,
        playerIds,
        turnDurationMs: turnDurationMs > 0 ? turnDurationMs : 10 * 60 * 1000,
        tracks: [],
        shareCode: null,
      };

      return {
        ...prev,
        players,
        sessions: [session, ...prev.sessions],
        activeSessionId: session.id,
        activeTrackId: null,
      };
    });
  }, []);

  const endSession = useCallback(() => {
    setData((prev) => {
      if (!prev.activeSessionId) return prev;
      const activeSessionId = prev.activeSessionId;
      return {
        ...prev,
        activeSessionId: null,
        activeTrackId: null,
        sessions: prev.sessions.map((session) =>
          session.id === activeSessionId ? { ...session, endedAt: new Date().toISOString() } : session,
        ),
      };
    });
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setData((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((session) => session.id !== sessionId),
      activeSessionId: prev.activeSessionId === sessionId ? null : prev.activeSessionId,
      activeTrackId: prev.activeSessionId === sessionId ? null : prev.activeTrackId,
    }));
  }, []);

  const reopenSession = useCallback((sessionId: string) => {
    setData((prev) => {
      const target = prev.sessions.find((session) => session.id === sessionId);
      if (!target) return prev;
      const switching = prev.activeSessionId !== sessionId;
      const now = new Date().toISOString();
      const lastTrack = target.tracks[target.tracks.length - 1] ?? null;

      return {
        ...prev,
        activeSessionId: sessionId,
        activeTrackId: switching ? (lastTrack?.id ?? null) : prev.activeTrackId,
        sessions: prev.sessions.map((session) => {
          if (session.id === sessionId) {
            return session.endedAt === null ? session : { ...session, endedAt: null };
          }
          if (switching && session.id === prev.activeSessionId && session.endedAt === null) {
            return { ...session, endedAt: now };
          }
          return session;
        }),
      };
    });
  }, []);

  const attachShareCode = useCallback((sessionId: string, code: string) => {
    setData((prev) => {
      const target = prev.sessions.find((session) => session.id === sessionId);
      if (target) {
        lastSynced.current.set(code, JSON.stringify(buildPayload({ ...target, shareCode: code }, prev.players)));
      }
      return {
        ...prev,
        sessions: prev.sessions.map((session) =>
          session.id === sessionId ? { ...session, shareCode: code } : session,
        ),
      };
    });
  }, []);

  const importSession = useCallback((payload: CloudPayload, code: string | null) => {
    setData((prev) => {
      const players = [...prev.players];
      for (const player of payload.players) {
        if (!players.some((candidate) => candidate.id === player.id)) players.push(player);
      }

      const imported: Session = { ...payload.session, shareCode: code };
      if (code) {
        lastSynced.current.set(code, JSON.stringify(buildPayload(imported, players)));
      }

      const exists = prev.sessions.some((session) => session.id === imported.id);
      const sessions = exists
        ? prev.sessions.map((session) => (session.id === imported.id ? imported : session))
        : [imported, ...prev.sessions];

      return { ...prev, players, sessions };
    });
  }, []);

  const addTrack = useCallback((name: string) => {
    const id = uid();
    setData((prev) => {
      const session = prev.sessions.find((candidate) => candidate.id === prev.activeSessionId);
      if (!session) return prev;

      const now = Date.now();
      const track: Track = {
        id,
        name: name.trim() || `Track ${session.tracks.length + 1}`,
        createdAt: new Date(now).toISOString(),
        durationMs: session.turnDurationMs,
        players: session.playerIds.map((playerId) => ({ playerId, remainingMs: session.turnDurationMs })),
        activePlayerId: session.playerIds[0] ?? null,
        timerStartedAt: session.playerIds.length > 0 ? new Date(now).toISOString() : null,
        completedAt: null,
        results: [],
      };

      return {
        ...prev,
        activeTrackId: id,
        sessions: prev.sessions.map((candidate) =>
          candidate.id === session.id ? { ...candidate, tracks: [...candidate.tracks, track] } : candidate,
        ),
      };
    });
  }, []);

  const selectTrack = useCallback((trackId: string) => {
    setData((prev) => ({ ...prev, activeTrackId: trackId }));
  }, []);

  const startTimer = useCallback((trackId: string) => {
    setData((prev) =>
      updateTrack(prev, trackId, (track) => {
        if (track.completedAt || track.timerStartedAt || !track.activePlayerId) return track;
        const player = track.players.find((candidate) => candidate.playerId === track.activePlayerId);
        if (!player || player.remainingMs <= 0) return track;
        return { ...track, timerStartedAt: new Date().toISOString() };
      }),
    );
  }, []);

  const stopTimer = useCallback((trackId: string) => {
    setData((prev) =>
      updateTrack(prev, trackId, (track) => {
        if (track.completedAt || !track.timerStartedAt) return track;
        const now = Date.now();
        const consumed = consumeActiveTime(track, now);
        const active = consumed.players.find((player) => player.playerId === consumed.activePlayerId);
        return active && active.remainingMs <= 0 ? resolveTurn(consumed, now) : consumed;
      }),
    );
  }, []);

  const adjustTimer = useCallback((trackId: string, deltaMs: number) => {
    setData((prev) =>
      updateTrack(prev, trackId, (track) => {
        if (track.completedAt || !track.activePlayerId) return track;
        const players = track.players.map((player) =>
          player.playerId === track.activePlayerId
            ? { ...player, remainingMs: Math.min(track.durationMs, Math.max(0, player.remainingMs + deltaMs)) }
            : player,
        );
        const updated: Track = { ...track, players };
        const active = players.find((player) => player.playerId === track.activePlayerId);
        if (active && active.remainingMs <= 0 && !track.timerStartedAt) return resolveTurn(updated, Date.now());
        return updated;
      }),
    );
  }, []);

  const resetTimer = useCallback((trackId: string) => {
    setData((prev) =>
      updateTrack(prev, trackId, (track) => {
        if (track.completedAt || !track.activePlayerId) return track;
        return {
          ...track,
          players: track.players.map((player) =>
            player.playerId === track.activePlayerId ? { ...player, remainingMs: track.durationMs } : player,
          ),
        };
      }),
    );
  }, []);

  const eliminateActivePlayer = useCallback((trackId: string) => {
    setData((prev) =>
      updateTrack(prev, trackId, (track) => {
        if (track.completedAt || !track.activePlayerId) return track;
        const now = Date.now();
        return resolveTurn(
          {
            ...track,
            players: track.players.map((player) =>
              player.playerId === track.activePlayerId ? { ...player, remainingMs: 0 } : player,
            ),
            timerStartedAt: null,
          },
          now,
        );
      }),
    );
  }, []);

  const passTurn = useCallback((trackId: string) => {
    setData((prev) =>
      updateTrack(prev, trackId, (track) => {
        if (track.completedAt || !track.activePlayerId) return track;
        const now = Date.now();
        return resolveTurn(consumeActiveTime(track, now), now);
      }),
    );
  }, []);

  const switchPlayer = useCallback((trackId: string, playerId: string) => {
    setData((prev) =>
      updateTrack(prev, trackId, (track) => {
        if (track.completedAt) return track;
        const target = track.players.find((player) => player.playerId === playerId);
        if (!target || target.remainingMs <= 0 || target.playerId === track.activePlayerId) return track;
        const now = Date.now();
        return {
          ...consumeActiveTime(track, now),
          activePlayerId: playerId,
          timerStartedAt: new Date(now).toISOString(),
        };
      }),
    );
  }, []);

  const endTrack = useCallback((trackId: string) => {
    setData((prev) =>
      updateTrack(prev, trackId, (track) => {
        if (track.completedAt) return track;
        return {
          ...track,
          completedAt: new Date().toISOString(),
          timerStartedAt: null,
          activePlayerId: null,
        };
      }),
    );
  }, []);

  const recordTime = useCallback((trackId: string, timeMs: number) => {
    setData((prev) =>
      updateTrack(prev, trackId, (track) => {
        const scorerId = track.activePlayerId;
        if (track.completedAt || !scorerId) return track;

        const now = Date.now();
        const consumed = consumeActiveTime(track, now);
        const best = consumed.results.reduce<number | null>(
          (current, result) => (current === null || result.timeMs < current ? result.timeMs : current),
          null,
        );

        // Only record-beating runs count; a slower run just keeps the turn going.
        if (best !== null && timeMs >= best) return consumed;

        const result: TimeResult = {
          id: uid(),
          playerId: scorerId,
          timeMs,
          createdAt: new Date(now).toISOString(),
        };
        return resolveTurn({ ...consumed, results: [...consumed.results, result] }, now);
      }),
    );
  }, []);

  const deleteResult = useCallback((trackId: string, resultId: string) => {
    setData((prev) =>
      updateTrack(prev, trackId, (track) => ({
        ...track,
        results: track.results.filter((result) => result.id !== resultId),
      })),
    );
  }, []);

  const replaceData = useCallback((next: AppData) => {
    setData(next);
  }, []);

  const resetAll = useCallback(() => {
    setData({
      version: 2,
      players: [],
      sessions: [],
      activeSessionId: null,
      activeTrackId: null,
    });
  }, []);

  const activeSession = useMemo(
    () => data.sessions.find((session) => session.id === data.activeSessionId) ?? null,
    [data.sessions, data.activeSessionId],
  );

  const activeTrack = useMemo(() => {
    if (!activeSession) return null;
    return activeSession.tracks.find((track) => track.id === data.activeTrackId) ?? null;
  }, [activeSession, data.activeTrackId]);

  const sessionPlayers = useMemo(() => {
    if (!activeSession) return [];
    return activeSession.playerIds
      .map((id) => data.players.find((player) => player.id === id))
      .filter((player): player is Player => Boolean(player));
  }, [activeSession, data.players]);

  const value: AppContextValue = {
    data,
    players: data.players,
    activeSession,
    activeTrack,
    sessionPlayers,
    createSession,
    endSession,
    deleteSession,
    reopenSession,
    importSession,
    attachShareCode,
    addTrack,
    selectTrack,
    startTimer,
    stopTimer,
    adjustTimer,
    resetTimer,
    eliminateActivePlayer,
    passTurn,
    switchPlayer,
    endTrack,
    recordTime,
    deleteResult,
    replaceData,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
