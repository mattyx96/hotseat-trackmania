import { useState } from 'react';
import { Button, Dialog, Input, Text, useToast } from 'nebula-ds-react-library';
import { TrophyIcon } from '@heroicons/react/24/solid';
import { bestTime } from '../lib/scoring';
import { formatTime, parseTime } from '../lib/time';
import { useApp } from '../state/appContext';
import type { Track } from '../types';

interface RecordTimeDialogProps {
  track: Track;
  playerName: string;
}

export function RecordTimeDialog({ track, playerName }: RecordTimeDialogProps) {
  const { recordTime } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [timeText, setTimeText] = useState('');
  const [touched, setTouched] = useState(false);

  const best = bestTime(track);
  const parsed = parseTime(timeText);
  const tooSlow = parsed !== null && best !== null && parsed >= best;
  const isValid = parsed !== null && !tooSlow;

  const reset = () => {
    setTimeText('');
    setTouched(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) reset();
    setOpen(next);
  };

  const handleSave = () => {
    setTouched(true);
    if (!isValid || parsed === null) return;
    recordTime(track.id, parsed);
    toast.success({
      title: 'New record!',
      description: `${playerName} — ${formatTime(parsed)}. Joypad moves on.`,
    });
    setOpen(false);
  };

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

        <Input
          label="Time"
          placeholder="1:23.456"
          value={timeText}
          onChange={(event) => setTimeText(event.target.value)}
          errors={touched && parsed === null ? ['Enter a valid time, for example 1:23.456'] : undefined}
          helperText={
            tooSlow && best !== null
              ? `Slower than the current record (${formatTime(best)}).`
              : 'Formats: 1:23.456, 0:42.100 or 83.456'
          }
          isRequired
          fullWidth
        />

        <div className="hs-row hs-row--end">
          <Button type="submit" variant="filled" size="M" rounded="R" text="Save record" />
        </div>
      </form>
    </Dialog>
  );
}
