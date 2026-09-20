import { useEffect, useState } from 'react';
import { Button, Text, ThemeProvider, ToastProvider, useTheme } from 'nebula-ds-react-library';
import { MoonIcon, SunIcon } from '@heroicons/react/24/solid';
import gridUrl from './assets/grid.svg';
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
  const { activeSession, reopenSession } = useApp();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<Tab>('play');

  // Keep portals (dialog, select menu, toasts) in sync with the active theme.
  useEffect(() => {
    document.documentElement.dataset.nbTheme = theme;
  }, [theme]);

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
