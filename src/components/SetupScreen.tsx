import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { Input, Button, IconButton, Text } from 'nebula-ds-react-library';
import {
  ArrowUturnLeftIcon,
  ClockIcon,
  FlagIcon,
  PlusIcon,
  RocketLaunchIcon,
  TicketIcon,
  TrophyIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import { formatClock } from '../lib/time';
import { useApp } from '../state/appContext';
import { Card } from './Card';

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="hs-stat">
      <span className="hs-stat__icon">{icon}</span>
      <span className="hs-stat__value">{value}</span>
      <span className="hs-stat__label">{label}</span>
    </div>
  );
}

export function SetupScreen() {
  const { data, createSession, reopenSession } = useApp();
  const { players, sessions } = data;

  const [sessionName, setSessionName] = useState('');
  const [turnMinutes, setTurnMinutes] = useState('10');
  const [draft, setDraft] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);

  const minutes = Number(turnMinutes);
  const turnValid = Number.isFinite(minutes) && minutes > 0;
  const turnMs = turnValid ? Math.round(minutes * 60_000) : 0;
  const canStart = participants.length > 0 && turnValid;

  const totalTracks = sessions.reduce((sum, session) => sum + session.tracks.length, 0);
  const totalRecords = sessions.reduce(
    (sum, session) => sum + session.tracks.reduce((trackSum, track) => trackSum + track.results.length, 0),
    0,
  );

  const addParticipant = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDraft('');
    if (participants.some((participant) => participant.toLowerCase() === trimmed.toLowerCase())) return;
    setParticipants((prev) => [...prev, trimmed]);
  };

  const removeParticipant = (name: string) => {
    setParticipants((prev) => prev.filter((participant) => participant !== name));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addParticipant(draft);
    }
  };

  const start = () => {
    if (!canStart) return;
    createSession(sessionName, participants, turnMs);
  };

  const knownPlayers = players.filter(
    (player) => !participants.some((participant) => participant.toLowerCase() === player.name.toLowerCase()),
  );
  const recent = sessions.slice(0, 4);

  return (
    <div className="hs-stack">
      <div className="hs-grid hs-grid--setup">
        <Card title="New session" subtitle="Name it, set the turn clock and add who's playing.">
          <div className="hs-fields hs-setup-fields">
            <Input
              label="Session name"
              placeholder="Friday night"
              value={sessionName}
              onChange={(event) => setSessionName(event.target.value)}
              helperText="Optional — defaults to today's date."
              fullWidth
            />

            <Input
              label="Turn time (minutes)"
              type="number"
              min={1}
              step={1}
              value={turnMinutes}
              onChange={(event) => setTurnMinutes(event.target.value)}
              errors={turnValid ? undefined : ['Enter at least 1 minute']}
              helperText="How long each player gets per track before they're out."
              fullWidth
            />

            <div className="hs-row">
              <Input
                label="Add player"
                placeholder="Name"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                fullWidth
                className="hs-grow"
              />
              <Button
                variant="standard"
                size="M"
                rounded="R"
                leftIcon={<PlusIcon />}
                text="Add"
                onClick={() => addParticipant(draft)}
              />
            </div>

            <div>
              <Text component="span" variant="body4" className="hs-muted hs-label">
                Players ({participants.length})
              </Text>
              <div className="hs-chips">
                {participants.map((name) => (
                  <span key={name} className="hs-chip">
                    {name}
                    <IconButton
                      icon={<XMarkIcon />}
                      size="S"
                      variant="text"
                      rounded="R"
                      aria-label={`Remove ${name}`}
                      onClick={() => removeParticipant(name)}
                    />
                  </span>
                ))}
                {participants.length === 0 && (
                  <Text component="span" variant="body4" className="hs-muted">
                    Nobody added yet — add names above or tap your roster.
                  </Text>
                )}
              </div>
            </div>

            <div className="hs-setup-actions">
              <div className="hs-divider" />

              <Button
                className="hs-btn-full"
                variant="filled"
                size="L"
                rounded="R"
                leftIcon={<RocketLaunchIcon />}
                text="Start session"
                disabled={!canStart}
                onClick={start}
              />
            </div>
          </div>
        </Card>

        <div className="hs-stack">
          <Card title="Roster" subtitle="Known players keep their identity across sessions.">
            <div className="hs-chips">
              {knownPlayers.map((player) => (
                <Button
                  key={player.id}
                  variant="standard"
                  size="S"
                  rounded="R"
                  leftIcon={<PlusIcon />}
                  text={player.name}
                  onClick={() => addParticipant(player.name)}
                />
              ))}
              {knownPlayers.length === 0 && (
                <Text component="span" variant="body4" className="hs-muted">
                  {players.length === 0 ? 'No players saved yet.' : 'Everyone is already on the roster.'}
                </Text>
              )}
            </div>
          </Card>

          <Card title="Session preview" subtitle="What you're about to play.">
            <div className="hs-fields">
              <div className="hs-stats">
                <Stat icon={<UserGroupIcon width={18} height={18} />} value={String(participants.length)} label="Players" />
                <Stat
                  icon={<ClockIcon width={18} height={18} />}
                  value={turnValid ? formatClock(turnMs) : '—'}
                  label="Per turn"
                />
                <Stat
                  icon={<ClockIcon width={18} height={18} />}
                  value={participants.length > 0 && turnValid ? formatClock(turnMs * participants.length) : '—'}
                  label="Total clock"
                />
              </div>
              <Text component="p" variant="body4" className="hs-muted">
                Each player gets the turn time to beat the record. Run out of time and you're out — the last player
                still holding the record wins the track.
              </Text>
            </div>
          </Card>

          <Card title="Your data" subtitle="Across every session.">
            <div className="hs-stats">
              <Stat icon={<TicketIcon width={18} height={18} />} value={String(sessions.length)} label="Sessions" />
              <Stat icon={<UserGroupIcon width={18} height={18} />} value={String(players.length)} label="Players" />
              <Stat icon={<FlagIcon width={18} height={18} />} value={String(totalTracks)} label="Tracks" />
              <Stat icon={<TrophyIcon width={18} height={18} />} value={String(totalRecords)} label="Records" />
            </div>
          </Card>
        </div>
      </div>

      {recent.length > 0 && (
        <Card title="Recent sessions" subtitle="Pick up where you left off.">
          <div className="hs-recent">
            {recent.map((session) => (
              <div key={session.id} className="hs-recentrow">
                <div className="hs-titleblock">
                  <Text component="span" variant="header6">
                    {session.name}
                  </Text>
                  <Text component="span" variant="body4" className="hs-muted">
                    {formatDay(session.date)} · {session.playerIds.length} player
                    {session.playerIds.length === 1 ? '' : 's'} · {session.tracks.length} track
                    {session.tracks.length === 1 ? '' : 's'}
                  </Text>
                </div>
                <Button
                  variant="standard"
                  size="S"
                  rounded="R"
                  leftIcon={<ArrowUturnLeftIcon />}
                  text="Reopen"
                  onClick={() => reopenSession(session.id)}
                />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
