import { useEffect, useState, type KeyboardEvent } from 'react';
import { Button, IconButton, Input, Text } from 'nebula-ds-react-library';
import { FlagIcon, PlusIcon, StopCircleIcon, TrashIcon, TrophyIcon } from '@heroicons/react/24/solid';
import { useNow } from '../hooks/useNow';
import { formatClock, formatTime } from '../lib/time';
import { activePlayer, liveRemaining, recordHolderId } from '../lib/track';
import { useApp } from '../state/appContext';
import { Card } from './Card';
import { RecordTimeDialog } from './RecordTimeDialog';
import { ShareSessionDialog } from './ShareSessionDialog';
import { Timer } from './Timer';
import type { Player, Track } from '../types';

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const PLAYER_STATES: Record<string, string> = {
  winner: 'Winner',
  out: 'Out of time',
  racing: 'Racing',
  paused: 'Your turn',
  next: 'Next up',
  waiting: 'Waiting',
};

function playerState(opts: {
  completed: boolean;
  isHolder: boolean;
  out: boolean;
  isActive: boolean;
  running: boolean;
  isNext: boolean;
}): string {
  if (opts.completed) return opts.isHolder ? 'winner' : 'out';
  if (opts.out) return 'out';
  if (opts.isActive) return opts.running ? 'racing' : 'paused';
  if (opts.isNext) return 'next';
  return 'waiting';
}

interface TrackRowProps {
  track: Track;
  active: boolean;
  resolveName: (playerId: string) => string;
  onSelect: () => void;
}

function TrackRow({ track, active, resolveName, onSelect }: TrackRowProps) {
  const best = track.results.length > 0 ? track.results[track.results.length - 1] : null;

  return (
    <button
      type="button"
      className={active ? 'hs-trackrow hs-trackrow--active' : 'hs-trackrow'}
      onClick={onSelect}
    >
      <span className="hs-trackrow__name">
        <FlagIcon width={16} height={16} />
        {track.name}
      </span>
      <span className="hs-trackrow__time hs-mono">
        {best ? `${formatTime(best.timeMs)} · ${resolveName(best.playerId)}` : 'No record yet'}
      </span>
      <span className="hs-muted hs-caption">
        {track.completedAt ? 'done' : track.timerStartedAt ? 'live' : 'paused'}
      </span>
    </button>
  );
}

export function SessionView() {
  const {
    activeSession,
    activeTrack,
    sessionPlayers,
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
    deleteResult,
    endSession,
  } = useApp();
  const [trackName, setTrackName] = useState('');

  const running = Boolean(activeTrack && !activeTrack.completedAt && activeTrack.timerStartedAt);
  const now = useNow(running);

  useEffect(() => {
    if (!activeTrack || activeTrack.completedAt || !activeTrack.timerStartedAt) return;
    if (liveRemaining(activeTrack, now) <= 0) {
      eliminateActivePlayer(activeTrack.id);
    }
  }, [activeTrack, now, eliminateActivePlayer]);

  if (!activeSession) return null;

  const resolveName = (playerId: string) =>
    sessionPlayers.find((player) => player.id === playerId)?.name ?? 'Unknown';

  const createTrack = () => {
    addTrack(trackName);
    setTrackName('');
  };

  const handleTrackKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      createTrack();
    }
  };

  const completed = Boolean(activeTrack?.completedAt);
  const holderId = activeTrack ? recordHolderId(activeTrack) : null;
  const active = activeTrack ? activePlayer(activeTrack) : undefined;
  const remaining = activeTrack ? liveRemaining(activeTrack, now) : 0;
  const results = activeTrack ? [...activeTrack.results] : [];
  const recordResult = results.length > 0 ? results[results.length - 1] : null;

  // Who gets the joypad after the current player (for the "Next up" marker).
  const nextUpId = (() => {
    if (!activeTrack || activeTrack.completedAt) return null;
    const order = activeTrack.players;
    const currentIndex = order.findIndex((player) => player.playerId === activeTrack.activePlayerId);
    if (currentIndex < 0) return null;
    for (let step = 1; step <= order.length; step += 1) {
      const candidate = order[(currentIndex + step) % order.length];
      if (candidate.remainingMs > 0) return candidate.playerId;
    }
    return null;
  })();

  return (
    <div className="hs-stack">
      <Card
        title={activeSession.name}
        subtitle={`${formatDate(activeSession.date)} · ${activeSession.playerIds.length} players · ${formatClock(
          activeSession.turnDurationMs,
        )} per turn`}
        actions={
          <div className="hs-row hs-row--end">
            <ShareSessionDialog session={activeSession} />
            <Button
              variant="outlined"
              size="S"
              rounded="R"
              leftIcon={<StopCircleIcon />}
              text="End session"
              onClick={endSession}
            />
          </div>
        }
      >
        <div className="hs-chips">
          {sessionPlayers.map((player: Player) => (
            <span key={player.id} className="hs-chip">
              {player.name}
            </span>
          ))}
        </div>
      </Card>

      {activeTrack ? (
        <Card
          title={activeTrack.name}
          subtitle={
            completed
              ? 'Track complete'
              : `Now playing: ${active ? resolveName(active.playerId) : '—'}`
          }
          actions={
            completed ? (
              <Button
                variant="filled"
                size="S"
                rounded="R"
                leftIcon={<PlusIcon />}
                text="New track"
                onClick={() => addTrack('')}
              />
            ) : (
              <div className="hs-row hs-row--end">
                <Button
                  variant="outlined"
                  size="S"
                  rounded="R"
                  leftIcon={<StopCircleIcon />}
                  text="End track"
                  onClick={() => endTrack(activeTrack.id)}
                />
              </div>
            )
          }
        >
          {completed ? (
            <div className="hs-winner">
              <TrophyIcon width={28} height={28} className="hs-trophy" />
              {holderId ? (
                <div className="hs-titleblock">
                  <Text component="p" variant="header4" className="hs-winner__name">
                    {resolveName(holderId)} wins the track!
                  </Text>
                  <Text component="span" variant="body4" className="hs-muted">
                    Best time {recordResult ? formatTime(recordResult.timeMs) : '—'} — the last player to beat the
                    record.
                  </Text>
                </div>
              ) : (
                <Text component="p" variant="body3" className="hs-muted">
                  Track ended without a record.
                </Text>
              )}
            </div>
          ) : (
            <Timer
              remainingMs={remaining}
              running={running}
              playerName={active ? resolveName(active.playerId) : '—'}
              onStart={() => startTimer(activeTrack.id)}
              onStop={() => stopTimer(activeTrack.id)}
              onAdjust={(deltaMs) => adjustTimer(activeTrack.id, deltaMs)}
              onReset={() => resetTimer(activeTrack.id)}
              onPass={() => passTurn(activeTrack.id)}
              recordAction={
                active ? (
                  <RecordTimeDialog track={activeTrack} playerName={resolveName(active.playerId)} />
                ) : undefined
              }
            />
          )}

          <div className="hs-divider" />

          <div className="hs-subhead">
            <Text component="h6" variant="header6">
              Players
            </Text>
            <Text component="span" variant="body4" className="hs-muted">
              Out of time = out. Tap a player to hand them the joypad. Last player holding the record wins.
            </Text>
          </div>

          <div className="hs-players">
            {activeTrack.players.map((player, index) => {
              const isActive = activeTrack.activePlayerId === player.playerId;
              const isHolder = holderId === player.playerId;
              const isNext = !completed && !isActive && player.playerId === nextUpId;
              const out = player.remainingMs <= 0;
              const playerRemaining = isActive && running ? remaining : player.remainingMs;
              const ratio = activeTrack.durationMs > 0 ? playerRemaining / activeTrack.durationMs : 0;
              const percent = Math.max(0, Math.min(100, ratio * 100));
              const low = !out && playerRemaining <= Math.min(60_000, activeTrack.durationMs * 0.15);
              const state = playerState({ completed, isHolder, out, isActive, running, isNext });
              const className = `hs-player${isActive ? ' hs-player--active' : ''}${
                out ? ' hs-player--out' : ''
              }`;

              return (
                <button
                  key={player.playerId}
                  type="button"
                  className={className}
                  disabled={out || completed || isActive}
                  onClick={() => switchPlayer(activeTrack.id, player.playerId)}
                  title={
                    !out && !completed && !isActive
                      ? `Hand the joypad to ${resolveName(player.playerId)}`
                      : undefined
                  }
                >
                  <span className="hs-player__head">
                    <span className="hs-player__order">{index + 1}</span>
                    <span className="hs-player__name">{resolveName(player.playerId)}</span>
                    {isHolder && <TrophyIcon width={16} height={16} className="hs-trophy" />}
                  </span>

                  <span className={out ? 'hs-player__time hs-player__time--out' : 'hs-player__time'}>
                    {out ? 'OUT' : formatClock(playerRemaining)}
                  </span>

                  <span className="hs-player__bar">
                    <span
                      className={low ? 'hs-player__bar-fill hs-player__bar-fill--low' : 'hs-player__bar-fill'}
                      style={{ width: `${percent}%` }}
                    />
                  </span>

                  <span className={`hs-player__state hs-player__state--${state}`}>{PLAYER_STATES[state]}</span>
                </button>
              );
            })}
          </div>

          <div className="hs-divider" />

          <div className="hs-subhead">
            <Text component="h6" variant="header6">
              Record history
            </Text>
            <Text component="span" variant="body4" className="hs-muted">
              Every time someone beat the best — newest record first is the current holder.
            </Text>
          </div>

          {results.length === 0 ? (
            <Text component="p" variant="body3" className="hs-empty">
              No records yet. The first time set takes the record and passes the joypad on.
            </Text>
          ) : (
            <ol className="hs-results">
              {[...results].reverse().map((result, reverseIndex) => {
                const position = results.length - reverseIndex;
                const isRecord = position === 1;
                return (
                  <li key={result.id} className={isRecord ? 'hs-result hs-result--record' : 'hs-result'}>
                    <span className={`hs-rank hs-rank--${Math.min(position, 4)}`}>{position}</span>
                    <span className="hs-result__player">{resolveName(result.playerId)}</span>
                    <span className="hs-result__time hs-mono">{formatTime(result.timeMs)}</span>
                    <span className="hs-result__tag">{isRecord ? 'record' : 'former'}</span>
                    <IconButton
                      icon={<TrashIcon />}
                      size="S"
                      variant="text"
                      rounded="R"
                      aria-label="Delete this record"
                      onClick={() => deleteResult(activeTrack.id, result.id)}
                    />
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      ) : (
        <Card title="Start the first track" subtitle="The first player's countdown starts as soon as you add it.">
          <div className="hs-row">
            <Input
              label="Track name"
              placeholder="A07 — Dirt"
              value={trackName}
              onChange={(event) => setTrackName(event.target.value)}
              onKeyDown={handleTrackKeyDown}
              fullWidth
              className="hs-grow"
            />
            <Button
              variant="filled"
              size="M"
              rounded="R"
              leftIcon={<PlusIcon />}
              text="Start track"
              onClick={createTrack}
            />
          </div>
        </Card>
      )}

      <Card
        title={completed ? 'On to the next track?' : 'Tracks in this session'}
        subtitle={
          completed
            ? 'Name the next one (or hit New track above) — everyone gets a fresh countdown.'
            : undefined
        }
      >
        <div className="hs-fields">
          <div className="hs-row">
            <Input
              label="Next track"
              placeholder="Track name"
              value={trackName}
              onChange={(event) => setTrackName(event.target.value)}
              onKeyDown={handleTrackKeyDown}
              fullWidth
              className="hs-grow"
            />
            <Button
              variant="standard"
              size="M"
              rounded="R"
              leftIcon={<PlusIcon />}
              text="Add track"
              onClick={createTrack}
            />
          </div>

          {activeSession.tracks.length === 0 ? (
            <Text component="p" variant="body3" className="hs-empty">
              No tracks yet in this session.
            </Text>
          ) : (
            <div className="hs-tracklist">
              {activeSession.tracks.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  active={track.id === activeTrack?.id}
                  resolveName={resolveName}
                  onSelect={() => selectTrack(track.id)}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
