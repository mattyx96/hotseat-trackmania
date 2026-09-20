import { createContext, useContext } from 'react';
import type { AppData, Player, Session, Track } from '../types';

export interface AppContextValue {
  data: AppData;
  players: Player[];
  activeSession: Session | null;
  activeTrack: Track | null;
  sessionPlayers: Player[];
  createSession: (name: string, playerNames: string[], turnDurationMs: number) => void;
  endSession: () => void;
  deleteSession: (sessionId: string) => void;
  /** Make an ended session live again (ending any other active session). */
  reopenSession: (sessionId: string) => void;
  addTrack: (name: string) => void;
  selectTrack: (trackId: string) => void;
  startTimer: (trackId: string) => void;
  stopTimer: (trackId: string) => void;
  adjustTimer: (trackId: string, deltaMs: number) => void;
  resetTimer: (trackId: string) => void;
  /** A player ran out of time: mark them out and pass the joypad. */
  eliminateActivePlayer: (trackId: string) => void;
  /** Hand the joypad to the next player with time, no record required. */
  passTurn: (trackId: string) => void;
  /** Hand the joypad directly to a specific player with time left. */
  switchPlayer: (trackId: string, playerId: string) => void;
  /** Finish a track early; the current record holder wins. */
  endTrack: (trackId: string) => void;
  /** Record a run for the active player; only faster-than-record runs are stored, then the turn passes. */
  recordTime: (trackId: string, timeMs: number) => void;
  deleteResult: (trackId: string, resultId: string) => void;
  replaceData: (data: AppData) => void;
  resetAll: () => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside <AppProvider>.');
  }
  return context;
}
