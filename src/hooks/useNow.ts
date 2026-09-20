import { useEffect, useState } from 'react';

/** Re-renders on an interval while `active`, so live timers tick. */
export function useNow(active: boolean, interval = 250): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [active, interval]);

  return now;
}
