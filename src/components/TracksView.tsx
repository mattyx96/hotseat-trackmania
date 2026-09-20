import { useMemo } from 'react';
import { Text } from 'nebula-ds-react-library';
import { TrophyIcon } from '@heroicons/react/24/solid';
import { computeTrackOverview } from '../lib/scoring';
import { formatTime } from '../lib/time';
import { useApp } from '../state/appContext';
import { Card } from './Card';

export function TracksView() {
  const { data } = useApp();
  const overview = useMemo(() => computeTrackOverview(data.sessions, data.players), [data.sessions, data.players]);

  return (
    <Card
      title="Track records"
      subtitle="The all-time best on each track and everyone who held the record before."
    >
      {overview.length === 0 ? (
        <Text component="p" variant="body3" className="hs-empty">
          No tracks recorded yet. They show up here as soon as you race them.
        </Text>
      ) : (
        <div className="hs-trackcards">
          {overview.map((track) => (
            <div key={track.key} className="hs-trackcard">
              <div className="hs-trackcard__head">
                <Text component="h5" variant="header5">
                  {track.name}
                </Text>
                <span className="hs-muted hs-caption">
                  {track.plays} play{track.plays === 1 ? '' : 's'}
                </span>
              </div>

              {track.record ? (
                <div className="hs-trackcard__record">
                  <TrophyIcon width={20} height={20} className="hs-trophy" />
                  <span className="hs-trackcard__holder">{track.record.playerName}</span>
                  <span className="hs-mono hs-trackcard__best">{formatTime(track.record.timeMs)}</span>
                </div>
              ) : (
                <Text component="p" variant="body4" className="hs-muted">
                  No time recorded on this track.
                </Text>
              )}

              {track.others.length > 0 && (
                <ul className="hs-chasers">
                  {track.others.map((entry) => (
                    <li key={`${entry.sessionId}-${entry.playerId}-${entry.timeMs}`}>
                      <span>{entry.playerName}</span>
                      <span className="hs-mono">{formatTime(entry.timeMs)}</span>
                      <span className="hs-muted hs-caption">
                        {entry.sessionName} · {entry.date}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
