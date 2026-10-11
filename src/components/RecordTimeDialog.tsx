import { useRef, useState } from 'react';
import { Button, Dialog, Text, useToast } from 'nebula-ds-react-library';
import { TrophyIcon } from '@heroicons/react/24/solid';
import { bestTime } from '../lib/scoring';
import { formatDelta, formatTime, splitTime } from '../lib/time';
import { useApp } from '../state/appContext';
import type { Track } from '../types';

interface RecordTimeDialogProps {
  track: Track;
  playerName: string;
}

type Segment = 'minutes' | 'seconds' | 'millis';

const LENGTH: Record<Segment, number> = { minutes: 2, seconds: 2, millis: 3 };
const MAX: Record<Segment, number> = { minutes: 99, seconds: 59, millis: 999 };

export function RecordTimeDialog({ track, playerName }: RecordTimeDialogProps) {
  const { recordTime } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState('0');
  const [seconds, setSeconds] = useState('00');
  const [millis, setMillis] = useState('000');
  const minutesRef = useRef<HTMLInputElement>(null);
  const secondsRef = useRef<HTMLInputElement>(null);
  const millisRef = useRef<HTMLInputElement>(null);
  const refs = { minutes: minutesRef, seconds: secondsRef, millis: millisRef };

  const best = bestTime(track);
  const parsed = (Number(minutes) || 0) * 60_000 + (Number(seconds) || 0) * 1000 + (Number(millis) || 0);
  const tooSlow = best !== null && parsed >= best;
  const valid = parsed > 0 && !tooSlow;

  // Pre-fill with the current record (or zero) each time the dialog opens.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      const parts = splitTime(best ?? 0);
      setMinutes(String(parts.minutes));
      setSeconds(String(parts.seconds).padStart(2, '0'));
      setMillis(String(parts.millis).padStart(3, '0'));
    }
    setOpen(next);
  };

  const setSegment = (segment: Segment, value: string) => {
    if (segment === 'minutes') setMinutes(value);
    else if (segment === 'seconds') setSeconds(value);
    else setMillis(value);
  };

  const handleChange = (segment: Segment, raw: string, next?: Segment) => {
    const digits = raw.replace(/\D/g, '').slice(0, LENGTH[segment]);
    setSegment(segment, digits);
    if (next && digits.length >= LENGTH[segment]) refs[next].current?.focus();
  };

  const handleBlur = (segment: Segment) => {
    const value = Math.min(MAX[segment], Number(getSegment(segment)) || 0);
    setSegment(segment, segment === 'minutes' ? String(value) : String(value).padStart(LENGTH[segment], '0'));
  };

  function getSegment(segment: Segment): string {
    if (segment === 'minutes') return minutes;
    if (segment === 'seconds') return seconds;
    return millis;
  }

  const handleSave = () => {
    if (!valid) return;
    recordTime(track.id, parsed);
    toast.success({
      title: 'New record!',
      description: `${playerName} — ${formatTime(parsed)}. Joypad moves on.`,
    });
    setOpen(false);
  };

  const delta = best !== null ? parsed - best : null;

  const segments: { key: Segment; label: string; next?: Segment; separator?: string }[] = [
    { key: 'minutes', label: 'min', next: 'seconds' },
    { key: 'seconds', label: 'sec', next: 'millis', separator: ':' },
    { key: 'millis', label: 'ms', separator: '.' },
  ];

  return (
    <Dialog
      text="Record time"
      leftIcon={<TrophyIcon />}
      variant="filled"
      size="M"
      title="Record a new time"
      description={
        best !== null
          ? `Current record: ${formatTime(best)}. Beat it to take the record and pass the joypad on.`
          : `Set ${playerName}'s opening time — the joypad then passes to the next player.`
      }
      open={open}
      onOpenChange={handleOpenChange}
    >
      <form
        className="hs-fields"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <div className="hs-row hs-row--between">
          <Text component="span" variant="body4" className="hs-muted">
            Recording for
          </Text>
          <span className="hs-chip">{playerName}</span>
        </div>

        <div className="hs-time">
          {segments.map((segment) => (
            <div key={segment.key} className="hs-time__part">
              {segment.separator ? <span className="hs-time__sep">{segment.separator}</span> : null}
              <label className="hs-time__segment">
                <input
                  ref={refs[segment.key]}
                  inputMode="numeric"
                  value={getSegment(segment.key)}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => handleChange(segment.key, event.target.value, segment.next)}
                  onBlur={() => handleBlur(segment.key)}
                  aria-label={segment.label}
                />
                <span>{segment.label}</span>
              </label>
            </div>
          ))}
        </div>

        <div className="hs-time__summary">
          <Text
            component="span"
            variant="header5"
            className={valid ? 'hs-time__preview' : 'hs-time__preview hs-muted'}
          >
            {formatTime(parsed)}
          </Text>
          {delta !== null && parsed > 0 && delta !== 0 ? (
            <span className={delta < 0 ? 'hs-time__delta hs-time__delta--better' : 'hs-time__delta'}>
              {formatDelta(delta)}
            </span>
          ) : null}
        </div>

        {tooSlow && best !== null ? (
          <Text component="p" variant="body4" className="hs-error">
            Not faster than the current record ({formatTime(best)}).
          </Text>
        ) : null}

        <div className="hs-row hs-row--end">
          <Button type="submit" variant="filled" size="M" rounded="R" text="Save record" disabled={!valid} />
        </div>
      </form>
    </Dialog>
  );
}
