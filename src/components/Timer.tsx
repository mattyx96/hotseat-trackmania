import type { ReactNode } from 'react';
import { PauseIcon, PlayIcon, ArrowPathIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { Button, Text } from 'nebula-ds-react-library';
import { formatClock } from '../lib/time';

interface TimerProps {
  remainingMs: number;
  running: boolean;
  playerName: string;
  onStart: () => void;
  onStop: () => void;
  onAdjust: (deltaMs: number) => void;
  onReset: () => void;
  onPass: () => void;
  /** Primary action (the record-time dialog trigger) rendered at the end of the controls. */
  recordAction?: ReactNode;
}

const ADJUSTMENTS: { label: string; delta: number }[] = [
  { label: '-5s', delta: -5000 },
  { label: '+5s', delta: 5000 },
];

export function Timer({
  remainingMs,
  running,
  playerName,
  onStart,
  onStop,
  onAdjust,
  onReset,
  onPass,
  recordAction,
}: TimerProps) {
  const danger = remainingMs <= 60_000;

  return (
    <div className="hs-timer">
      <div className="hs-timer__status">
        <span className={running ? 'hs-dot hs-dot--live' : 'hs-dot'} />
        <Text component="span" variant="body4" className="hs-muted">
          {running ? 'Racing' : 'Paused'} · {playerName}
        </Text>
      </div>

      <Text
        component="p"
        variant="display2"
        className={danger ? 'hs-timer__value hs-timer__value--danger' : 'hs-timer__value'}
      >
        {formatClock(remainingMs)}
      </Text>

      <Text component="span" variant="body4" className="hs-muted">
        Time left for {playerName}
      </Text>

      <div className="hs-timer__controls">
        {running ? (
          <Button
            variant="filled"
            size="M"
            rounded="L"
            leftIcon={<PauseIcon />}
            text="Stop"
            onClick={onStop}
          />
        ) : (
          <Button
            variant="filled"
            size="M"
            rounded="L"
            leftIcon={<PlayIcon />}
            text="Start"
            onClick={onStart}
          />
        )}

        {ADJUSTMENTS.map((adjustment) => (
          <Button
            key={adjustment.label}
            variant="standard"
            size="M"
            text={adjustment.label}
            onClick={() => onAdjust(adjustment.delta)}
          />
        ))}

        <Button
          variant="standard"
          size="M"
          leftIcon={<ArrowPathIcon />}
          text="Reset turn"
          onClick={onReset}
        />

        {recordAction}

        <Button
          variant="standard"
          size="M"
          rounded="R"
          rightIcon={<ArrowRightIcon />}
          text="Next player"
          onClick={onPass}
        />
      </div>
    </div>
  );
}
