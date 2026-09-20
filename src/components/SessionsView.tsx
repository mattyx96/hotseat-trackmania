import { useRef, type ChangeEvent } from 'react';
import { Button, IconButton, Text, useToast } from 'nebula-ds-react-library';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ArrowUturnLeftIcon, PlayIcon, TrashIcon } from '@heroicons/react/24/solid';
import { computeStandings, rankTrack } from '../lib/scoring';
import { downloadData, readDataFile } from '../lib/storage';
import { formatClock, formatTime } from '../lib/time';
import { useApp } from '../state/appContext';
import { Card } from './Card';
import type { Player, Session } from '../types';

interface SessionCardProps {
  session: Session;
  players: Player[];
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

function SessionCard({ session, players, active, onOpen, onDelete }: SessionCardProps) {
  const roster = session.playerIds
    .map((id) => players.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player));

  const winner = computeStandings([session], players)[0];

  return (
    <Card
      title={session.name}
      subtitle={`${session.date} · ${roster.length} player${roster.length === 1 ? '' : 's'} · ${
        session.tracks.length
      } track${session.tracks.length === 1 ? '' : 's'} · ${formatClock(session.turnDurationMs)} turns${
        active ? ' · live' : ''
      }`}
      actions={
        <div className="hs-row hs-row--end">
          <Button
            variant="standard"
            size="S"
            rounded="R"
            leftIcon={active ? <PlayIcon /> : <ArrowUturnLeftIcon />}
            text={active ? 'Resume' : 'Reopen'}
            onClick={onOpen}
          />
          <IconButton
            icon={<TrashIcon />}
            size="S"
            variant="text"
            rounded="R"
            aria-label={`Delete ${session.name}`}
            onClick={onDelete}
          />
        </div>
      }
    >
      <div className="hs-fields">
        <div className="hs-chips">
          {roster.map((player) => (
            <span key={player.id} className="hs-chip">
              {player.name}
            </span>
          ))}
        </div>

        {session.tracks.length === 0 ? (
          <Text component="p" variant="body3" className="hs-empty">
            No tracks were played in this session.
          </Text>
        ) : (
          <div className="hs-tablewrap">
            <table className="hs-table">
              <thead>
                <tr>
                  <th>Track</th>
                  <th>Winner</th>
                  <th className="hs-table__num">Time</th>
                  <th>Other records</th>
                </tr>
              </thead>
              <tbody>
                {session.tracks.map((track) => {
                  const ranking = rankTrack(track, roster);
                  return (
                    <tr key={track.id}>
                      <td className="hs-table__player">{track.name}</td>
                      <td>{ranking.best?.playerName ?? '—'}</td>
                      <td className="hs-table__num hs-mono">
                        {ranking.best ? formatTime(ranking.best.timeMs) : '—'}
                      </td>
                      <td className="hs-muted hs-caption">
                        {ranking.entries
                          .slice(1)
                          .map((entry) => `${entry.playerName} ${formatTime(entry.timeMs)}`)
                          .join(' · ') || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {winner && (
          <Text component="p" variant="body4" className="hs-muted">
            Session leader: <strong>{winner.playerName}</strong> — {winner.points} pts, {winner.wins} track win
            {winner.wins === 1 ? '' : 's'}.
          </Text>
        )}
      </div>
    </Card>
  );
}

export function SessionsView({ onOpenSession }: { onOpenSession: (sessionId: string) => void }) {
  const { data, deleteSession, replaceData, resetAll } = useApp();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const next = await readDataFile(file);
      replaceData(next);
      toast.success({ title: 'Data imported', description: file.name });
    } catch (error) {
      toast.error({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Could not read that file.',
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleReset = () => {
    if (window.confirm('Delete every session, track and time? This cannot be undone.')) {
      resetAll();
      toast.success({ title: 'Data cleared' });
    }
  };

  return (
    <div className="hs-stack">
      <Card
        title="Data"
        subtitle="Stored in this browser. Export it to keep a backup or move to another machine."
      >
        <div className="hs-row">
          <Button
            variant="filled"
            size="M"
            rounded="L"
            leftIcon={<ArrowDownTrayIcon />}
            text="Export JSON"
            onClick={() => downloadData(data)}
          />
          <Button
            variant="standard"
            size="M"
            leftIcon={<ArrowUpTrayIcon />}
            text="Import JSON"
            onClick={() => fileRef.current?.click()}
          />
          <Button
            variant="outlined"
            size="M"
            rounded="R"
            leftIcon={<TrashIcon />}
            text="Reset all"
            onClick={handleReset}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hs-visually-hidden"
            onChange={handleImport}
          />
        </div>
      </Card>

      {data.sessions.length === 0 ? (
        <Card title="Sessions">
          <Text component="p" variant="body3" className="hs-empty">
            No sessions yet. Head to Play and start one.
          </Text>
        </Card>
      ) : (
        data.sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            players={data.players}
            active={session.id === data.activeSessionId}
            onOpen={() => onOpenSession(session.id)}
            onDelete={() => deleteSession(session.id)}
          />
        ))
      )}
    </div>
  );
}
