import { useMemo, useState } from 'react';
import { Select, Text } from 'nebula-ds-react-library';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { computeStandings } from '../lib/scoring';
import { formatTime } from '../lib/time';
import { useApp } from '../state/appContext';
import { Card } from './Card';

export function StandingsView() {
  const { data } = useApp();
  const [scope, setScope] = useState<string[]>(['all']);

  const sessions = useMemo(() => {
    const selected = scope[0];
    if (!selected || selected === 'all') return data.sessions;
    return data.sessions.filter((session) => session.id === selected);
  }, [scope, data.sessions]);

  const rows = useMemo(() => computeStandings(sessions, data.players), [sessions, data.players]);

  const items = [
    { value: 'all', label: 'All sessions' },
    ...data.sessions.map((session) => ({ value: session.id, label: `${session.name} · ${session.date}` })),
  ];

  return (
    <Card
      title="General standings"
      subtitle="On every track the winner takes N points, second N-1, and so on."
      actions={
        <div className="hs-filter">
          <Select
            label="Scope"
            placeholder="All sessions"
            indicator={<ChevronDownIcon width={16} height={16} />}
            items={items}
            value={scope}
            onValueChange={(value) => setScope(value.length > 0 ? [value[0]] : ['all'])}
          />
        </div>
      }
    >
      {rows.length === 0 ? (
        <Text component="p" variant="body3" className="hs-empty">
          No results yet. Record a time during a session and the standings will fill in.
        </Text>
      ) : (
        <div className="hs-tablewrap">
          <table className="hs-table">
            <thead>
              <tr>
                <th className="hs-table__rank">#</th>
                <th>Player</th>
                <th className="hs-table__num">Points</th>
                <th className="hs-table__num">Wins</th>
                <th className="hs-table__num">Times</th>
                <th className="hs-table__num">Best</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.playerId}>
                  <td>
                    <span className={`hs-rank hs-rank--${Math.min(index + 1, 4)}`}>{index + 1}</span>
                  </td>
                  <td className="hs-table__player">{row.playerName}</td>
                  <td className="hs-table__num hs-mono hs-points">{row.points}</td>
                  <td className="hs-table__num hs-mono">{row.wins}</td>
                  <td className="hs-table__num hs-mono">{row.records}</td>
                  <td className="hs-table__num hs-mono">
                    {row.bestTimeMs !== null ? formatTime(row.bestTimeMs) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
