import { useEffect, useState } from 'react';
import { Button, Text, ThemeProvider, ToastProvider, useTheme, useToast } from 'nebula-ds-react-library';
import { MoonIcon, SunIcon } from '@heroicons/react/24/solid';
import gridUrl from './assets/grid.svg';
import { extractCode, fetchCloudSession, isShareCode } from './lib/cloud';
import { AppProvider } from './state/AppProvider';
import { useApp } from './state/appContext';
import { SetupScreen } from './components/SetupScreen';
import { SessionView } from './components/SessionView';
import { StandingsView } from './components/StandingsView';
import { TracksView } from './components/TracksView';
import { SessionsView } from './components/SessionsView';

type Tab = 'play' | 'standings' | 'tracks' | 'sessions';

const TABS: { id: Tab; label: string }[] = [
  { id: 'play', label: 'Play' },
  { id: 'standings', label: 'Standings' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'sessions', label: 'Sessions' },
];

function AppShell() {
  const { activeSession, reopenSession, importSession } = useApp();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('play');

  // Keep portals (dialog, select menu, toasts) in sync with the active theme.
  useEffect(() => {
    document.documentElement.dataset.nbTheme = theme;
  }, [theme]);

  // Deep link: /?session=<code> loads a shared session once, then cleans the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('session');
    if (!raw) return;

    params.delete('session');
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);

    const code = extractCode(raw);
    if (!code || !isShareCode(code)) {
      toast.error({ title: 'Invalid share link' });
      return;
    }

    void (async () => {
      try {
        const { payload, code: resolved } = await fetchCloudSession(code);
        importSession(payload, resolved);
        toast.success({ title: 'Session loaded', description: payload.session.name });
      } catch (error) {
        toast.error({
          title: 'Could not load the session',
          description: error instanceof Error ? error.message : undefined,
        });
      }
    })();
  }, [importSession, toast]);

  const openSession = (sessionId: string) => {
    reopenSession(sessionId);
    setTab('play');
  };

  return (
    <>
      <header className="hs-header">
        <div className="hs-brand">
          <Text component="span" variant="header4" className="hs-brand__title">
            HOTSEAT
          </Text>
          <Text component="span" variant="body4" className="hs-muted">
            Trackmania hotseat companion
          </Text>
        </div>

        <nav className="hs-nav">
          {TABS.map((item) => (
            <Button
              key={item.id}
              variant="text"
              size="S"
              text={item.label}
              className={tab === item.id ? 'hs-nav__item--active' : undefined}
              onClick={() => setTab(item.id)}
            />
          ))}
        </nav>

        <div className="hs-header__actions">
          {activeSession && (
            <span className="hs-live">
              <span className="hs-dot hs-dot--live" />
              live
            </span>
          )}
          <Button
            variant="text"
            size="S"
            leftIcon={theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            text={theme === 'dark' ? 'Light' : 'Dark'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        </div>
      </header>

      <main className="hs-main">
        {tab === 'play' && (activeSession ? <SessionView /> : <SetupScreen />)}
        {tab === 'standings' && <StandingsView />}
        {tab === 'tracks' && <TracksView />}
        {tab === 'sessions' && <SessionsView onOpenSession={openSession} />}
      </main>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider theme="dark" className="hs-app">
      <img className="hs-bg" src={gridUrl} alt="" aria-hidden="true" />
      <ToastProvider placement="bottom-end">
        <AppProvider>
          <AppShell />
        </AppProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
