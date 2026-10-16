import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header, TabType } from './components/Header';
import { MatchesView } from './components/MatchesView';
import { PlayoffBracketView } from './components/PlayoffBracketView';
import { StandingsView } from './components/StandingsView';
import { RulesExplainer } from './components/RulesExplainer';
import { MyTeamTracker } from './components/MyTeamTracker';
import { GameDetailModal } from './components/GameDetailModal';
import { WinsToFinalBanner } from './components/WinsToFinalBanner';
import { SettingsView } from './components/SettingsView';
import { RankingsView } from './components/RankingsView';
import { TeamProfilePage } from './components/TeamProfilePage';
import { PlayerDetailModal } from './components/PlayerDetailModal';
import { MLBGame, MLB_TEAMS } from './services/mlbApi';
import { sounds } from './services/soundEffects';
import { notifications } from './services/notifications';
import {
  Radio,
  Trophy,
  BookOpen,
  Star,
  Settings,
  BarChart2,
  TrendingUp,
  ArrowLeft,
  Home,
} from 'lucide-react';
import './App.css';

const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 14, filter: 'blur(4px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: 'blur(2px)',
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const MOBILE_NAV = [
  { id: 'matches'   as TabType, label: 'Матчи',    icon: Radio,        color: '#ef4444' },
  { id: 'bracket'   as TabType, label: 'Плей-офф', icon: Trophy,       color: '#f59e0b' },
  { id: 'standings' as TabType, label: 'Таблицы',  icon: BarChart2,    color: '#3b82f6' },
  { id: 'rankings'  as TabType, label: 'Рейтинги', icon: TrendingUp,   color: '#10b981' },
  { id: 'rules'     as TabType, label: 'Правила',  icon: BookOpen,     color: '#06b6d4' },
  { id: 'myteam'    as TabType, label: 'Команда',  icon: Star,         color: '#a855f7' },
  { id: 'settings'  as TabType, label: 'Настройки',icon: Settings,     color: '#64748b' },
];

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('matches');
  const [favoriteTeamId, setFavoriteTeamIdState] = useState<number>(() => {
    const saved = localStorage.getItem('mlb_favorite_team_id');
    return saved ? Number(saved) : 119;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.getMuted());
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return notifications.getPermission() === 'granted';
  });
  const [selectedGame, setSelectedGame] = useState<MLBGame | null>(null);
  const [selectedTeamProfile, setSelectedTeamProfile] = useState<{ id: number; name: string } | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: number; name?: string } | null>(null);
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('mlb_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const setTheme = useCallback((t: 'dark' | 'light') => {
    setThemeState(t);
    localStorage.setItem('mlb_theme', t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('mlb_theme', next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [theme]);

  const setFavoriteTeamId = (id: number) => {
    setFavoriteTeamIdState(id);
    localStorage.setItem('mlb_favorite_team_id', String(id));
  };

  const favoriteTeam =
    MLB_TEAMS.find((t) => t.id === favoriteTeamId) || MLB_TEAMS[0];

  /* ── History API — make browser back navigate within SPA ── */
  const skipNextPush = useRef(false);

  // Push state when tab changes
  useEffect(() => {
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    window.history.pushState({ tab: activeTab, modal: false }, '', `#${activeTab}`);
  }, [activeTab]);

  // Push state when game modal opens
  useEffect(() => {
    if (selectedGame) {
      window.history.pushState({ tab: activeTab, modal: 'game' }, '');
    }
  }, [selectedGame]);

  // Push state when player modal opens
  useEffect(() => {
    if (selectedPlayer) {
      window.history.pushState({ tab: activeTab, modal: 'player' }, '');
    }
  }, [selectedPlayer]);

  // Listen for popstate (browser back / forward)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // If player modal is open, close it first
      if (selectedPlayer) {
        setSelectedPlayer(null);
        return;
      }
      // If game modal is open, close it next
      if (selectedGame) {
        setSelectedGame(null);
        return;
      }
      // If team profile page is open, close it
      if (selectedTeamProfile) {
        setSelectedTeamProfile(null);
        return;
      }
      // Restore tab from state
      const state = e.state as { tab?: TabType; modal?: string | boolean; team?: { id: number; name: string } } | null;
      if (state?.team) {
        setSelectedTeamProfile(state.team);
      } else if (state?.tab) {
        skipNextPush.current = true;
        setActiveTab(state.tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    // Set initial state
    window.history.replaceState({ tab: activeTab, modal: false }, '', `#${activeTab}`);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedGame, selectedPlayer, selectedTeamProfile, activeTab]);

  // ESC key closes modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPlayer) {
          setSelectedPlayer(null);
        } else if (selectedGame) {
          setSelectedGame(null);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedGame, selectedPlayer]);

  const handleGoHome = useCallback(() => {
    setSelectedPlayer(null);
    setSelectedGame(null);
    setSelectedTeamProfile(null);
    setActiveTab('matches');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToTeam = useCallback((teamId: number, teamName: string) => {
    setSelectedPlayer(null);
    setSelectedTeamProfile({ id: teamId, name: teamName });
    window.history.pushState({ tab: activeTab, team: { id: teamId, name: teamName } }, '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const handleSelectTab = useCallback((tab: TabType) => {
    setSelectedPlayer(null);
    setSelectedGame(null);
    setSelectedTeamProfile(null);
    setActiveTab(tab);
  }, []);

  return (
    <div
      style={{
        '--team-color': favoriteTeam.color || '#3b82f6',
        '--team-accent': favoriteTeam.accentColor || '#60a5fa',
      } as React.CSSProperties}
      className="min-h-screen bg-mesh flex flex-col relative"
    >
      {/* ── HEADER ── */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        onGoHome={handleGoHome}
        isTeamPage={Boolean(selectedTeamProfile)}
        theme={theme}
        toggleTheme={toggleTheme}
        favoriteTeamId={favoriteTeamId}
        setFavoriteTeamId={setFavoriteTeamId}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        notificationsEnabled={notificationsEnabled}
        setNotificationsEnabled={setNotificationsEnabled}
      />

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 pb-20 md:pb-10 relative z-[1]">
        <AnimatePresence mode="wait">
          {/* ── TEAM PROFILE PAGE (overrides tabs when a team is selected) ── */}
          {selectedTeamProfile ? (
            <motion.div key={`team-${selectedTeamProfile.id}`} {...PAGE_VARIANTS}>
              <TeamProfilePage
                teamId={selectedTeamProfile.id}
                teamName={selectedTeamProfile.name}
                onBack={() => {
                  setSelectedTeamProfile(null);
                  window.history.back();
                }}
                onSelectPlayer={(id, name) => setSelectedPlayer({ id, name })}
                onSelectGame={(g) => setSelectedGame(g)}
                onSelectTeam={(id, name) => navigateToTeam(id, name)}
                isFavorite={favoriteTeamId === selectedTeamProfile.id}
                onToggleFavorite={(id, _name) => setFavoriteTeamId(id)}
              />
            </motion.div>
          ) : (
            <>
          {activeTab === 'matches' && (
            <motion.div key="matches" {...PAGE_VARIANTS}>
              <div className="space-y-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2">
                  <WinsToFinalBanner
                    favoriteTeamId={favoriteTeamId}
                    onOpenBracket={() => setActiveTab('bracket')}
                  />
                </div>
                <MatchesView
                  onSelectGame={(g) => setSelectedGame(g)}
                  favoriteTeamId={favoriteTeamId}
                  onSelectTeam={(id, name) => navigateToTeam(id, name)}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'bracket' && (
            <motion.div key="bracket" {...PAGE_VARIANTS}>
              <PlayoffBracketView
                onSelectGame={(g) => setSelectedGame(g)}
                favoriteTeamId={favoriteTeamId}
                onSelectTeam={(id, name) => navigateToTeam(id, name)}
              />
            </motion.div>
          )}

          {activeTab === 'standings' && (
            <motion.div key="standings" {...PAGE_VARIANTS}>
              <StandingsView
                favoriteTeamId={favoriteTeamId}
                onToggleFavorite={(id) => {
                  setFavoriteTeamId(id);
                }}
                onSelectTeam={(id, name) => navigateToTeam(id, name || '')}
              />
            </motion.div>
          )}

          {activeTab === 'rules' && (
            <motion.div key="rules" {...PAGE_VARIANTS}>
              <RulesExplainer />
            </motion.div>
          )}

          {activeTab === 'myteam' && (
            <motion.div key="myteam" {...PAGE_VARIANTS}>
              <MyTeamTracker
                favoriteTeamId={favoriteTeamId}
                setFavoriteTeamId={setFavoriteTeamId}
                onSelectGame={(g) => setSelectedGame(g)}
                onOpenBracket={() => setActiveTab('bracket')}
                notificationsEnabled={notificationsEnabled}
                setNotificationsEnabled={setNotificationsEnabled}
                onSelectTeam={(id, name) => navigateToTeam(id, name)}
              />
            </motion.div>
          )}

          {activeTab === 'rankings' && (
            <motion.div key="rankings" {...PAGE_VARIANTS}>
              <RankingsView
                favoriteTeamId={favoriteTeamId}
                onSelectTeam={(id, name) => navigateToTeam(id, name)}
              />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" {...PAGE_VARIANTS}>
              <SettingsView
                favoriteTeamId={favoriteTeamId}
                setFavoriteTeamId={setFavoriteTeamId}
                isMuted={isMuted}
                setIsMuted={setIsMuted}
                notificationsEnabled={notificationsEnabled}
                setNotificationsEnabled={setNotificationsEnabled}
                theme={theme}
                setTheme={setTheme}
              />
            </motion.div>
          )}
            </>
          )}
        </AnimatePresence>
      </main>

      {/* ── GAME DETAIL MODAL ── */}
      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          favoriteTeamId={favoriteTeamId}
          isFavoriteTeam={
            Boolean(favoriteTeamId) &&
            (selectedGame.teams.away.team.id === favoriteTeamId ||
              selectedGame.teams.home.team.id === favoriteTeamId)
          }
          onSelectTeam={(id, name) => {
            setSelectedGame(null);
            navigateToTeam(id, name);
          }}
        />
      )}

      {/* ── PLAYER DETAIL MODAL ── */}
      {selectedPlayer && (
        <PlayerDetailModal
          playerId={selectedPlayer.id}
          playerName={selectedPlayer.name}
          onClose={() => setSelectedPlayer(null)}
          onSelectTeam={(id, name) => {
            setSelectedPlayer(null);
            navigateToTeam(id, name);
          }}
        />
      )}

      {/* ── MOBILE BOTTOM NAV — floating glass bar ── */}
      <div
        className="fixed bottom-3 left-3 right-3 z-30 md:hidden flex items-center justify-around mobile-nav-bar transition-all duration-300"
        style={{
          background: theme === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(10,13,20,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: theme === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: '18px',
          padding: '6px 4px',
          boxShadow: theme === 'light' ? '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)' : '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {MOBILE_NAV.map(({ id, label, icon: Icon, color }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => handleSelectTab(id)}
              className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-xl transition-all"
              style={{
                transitionDuration: '250ms',
                transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
                minWidth: '44px',
                background: isActive ? `${color}18` : 'transparent',
              }}
            >
              <Icon
                className="w-4 h-4"
                style={{
                  color: isActive ? color : 'rgba(100,116,139,0.9)',
                  transition: 'color 250ms cubic-bezier(0.22,1,0.36,1)',
                  strokeWidth: isActive ? 2 : 1.5,
                }}
              />
              <span
                className="text-[8.5px] font-bold"
                style={{
                  color: isActive ? color : 'rgba(71,85,105,1)',
                  transition: 'color 250ms cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── DESKTOP FOOTER ── */}
      <footer className="hidden md:block relative z-[1] py-5 text-[11px] text-slate-600">
        <div
          className="max-w-7xl mx-auto px-6 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1.25rem' }}
        >
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" className="w-3.5 h-3.5 opacity-40" alt="" />
            <span>MLB Playoff Tracker • Сезон 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-700">statsapi.mlb.com</span>
            <button onClick={() => handleSelectTab('rules')} className="hover:text-slate-400 transition-colors">
              Правила
            </button>
            <button onClick={() => handleSelectTab('bracket')} className="hover:text-slate-400 transition-colors">
              Bracket 2026
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
