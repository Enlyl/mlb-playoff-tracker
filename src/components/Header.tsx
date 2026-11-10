import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Trophy,
  BarChart2,
  BookOpen,
  Star,
  Settings,
  TrendingUp,
  ArrowLeft,
  Home,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  ChevronDown,
  Flame,
} from 'lucide-react';
import { sounds } from '../services/soundEffects';
import { getAvailableSeasons } from '../utils/seasonUtils';
import { getSeasonTheme, SeasonTheme } from '../utils/seasonThemes';

export type TabType = 'matches' | 'bracket' | 'classics' | 'standings' | 'rules' | 'myteam' | 'rankings' | 'settings';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onGoHome?: () => void;
  isTeamPage?: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  favoriteTeamId: number | null;
  setFavoriteTeamId: (id: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  season: number;
  setSeason: (s: number) => void;
  detectedSeason: number;
  seasonTheme?: SeasonTheme;
}

const TABS: {
  id: TabType;
  label: string;
  short: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { id: 'matches',   label: 'Матчи & Live',      short: 'Матчи',      icon: <Calendar  className="w-3.5 h-3.5" />, color: '#ef4444' },
  { id: 'bracket',   label: 'Путь к финалу',     short: 'Плей-офф',   icon: <Trophy    className="w-3.5 h-3.5" />, color: '#f59e0b' },
  { id: 'classics',  label: 'Золотая коллекция', short: 'Триллеры',   icon: <Flame     className="w-3.5 h-3.5" />, color: '#f97316' },
  { id: 'standings', label: 'Таблицы',           short: 'Таблицы',    icon: <BarChart2 className="w-3.5 h-3.5" />, color: '#3b82f6' },
  { id: 'rankings',  label: 'Рейтинги',          short: 'Рейтинги',   icon: <TrendingUp className="w-3.5 h-3.5" />, color: '#10b981' },
  { id: 'rules',     label: 'Правила',           short: 'Правила',    icon: <BookOpen  className="w-3.5 h-3.5" />, color: '#06b6d4' },
  { id: 'myteam',    label: 'Моя команда',       short: 'Команда',    icon: <Star      className="w-3.5 h-3.5" />, color: '#a855f7' },
  { id: 'settings',  label: 'Настройки',         short: 'Настройки',  icon: <Settings  className="w-3.5 h-3.5" />, color: '#64748b' },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onGoHome,
  isTeamPage,
  theme,
  toggleTheme,
  isMuted,
  setIsMuted,
  season,
  setSeason,
  detectedSeason,
  seasonTheme,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const seasonRef = useRef<HTMLDivElement>(null);
  const activeSeasonTheme = seasonTheme || getSeasonTheme(season);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close season dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (seasonRef.current && !seasonRef.current.contains(e.target as Node)) {
        setSeasonOpen(false);
      }
    };
    if (seasonOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [seasonOpen]);

  const handleReturnHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      setActiveTab('matches');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeTabData = TABS.find((t) => t.id === activeTab);

  return (
    <header
      className="sticky top-0 z-40 transition-all duration-500"
      style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
    >
      {/* Dynamic Seasonal Accent Line */}
      <div
        className="h-[2px] w-full transition-all duration-700"
        style={{
          background: activeSeasonTheme.gradient,
          boxShadow: `0 0 12px ${activeSeasonTheme.glowRgba}`,
        }}
      />
      {/* Top bar: Logo + Season badge */}
      <div
        className={`transition-all duration-500 ${
          scrolled
            ? 'bg-[#050508]/95 backdrop-blur-2xl border-b border-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.04)]'
            : 'bg-transparent'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Brand - Returns to Home from anywhere */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleReturnHome}
              className="flex items-center gap-3 group text-left cursor-pointer transition transform hover:scale-[1.02] active:scale-[0.98]"
              title="На главную страницу (Матчи & Live)"
            >
              {/* Logo pill — double bezel */}
              <div className="glass-shell p-[1px]" style={{ borderRadius: '12px' }}>
                <div
                  className="glass-core flex items-center justify-center w-8 h-8 group-hover:border-amber-400/40 transition"
                  style={{
                    borderRadius: '11px',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 0 20px rgba(239,68,68,0.2)',
                  }}
                >
                  <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="⚾" className="w-5 h-5 object-contain" />
                </div>
              </div>

              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-black tracking-[-0.04em] text-white group-hover:text-amber-300 transition"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    MLB Live Hub
                  </span>
                  <span
                    className="eyebrow hidden sm:inline-flex"
                    style={{
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#fca5a5',
                    }}
                  >
                    {season}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">
                  Трекер матчей, плей-офф и правила
                </span>
              </div>
            </button>

            {/* Quick "На главную" button if currently on another tab or team page */}
            {(activeTab !== 'matches' || isTeamPage) && (
              <button
                onClick={handleReturnHome}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition shadow-sm cursor-pointer ml-1 animate-in fade-in duration-200"
                title="Вернуться на главную страницу"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>На главную</span>
              </button>
            )}
          </div>

          {/* Right Controls: Sound, Theme, Season */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !isMuted;
                setIsMuted(next);
                sounds.setMuted(next);
                if (!next) sounds.playBatCrack();
              }}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 cursor-pointer active:scale-95"
              title={isMuted ? 'Включить звуковые эффекты' : 'Выключить звук'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="hidden md:inline">{isMuted ? 'Без звука' : 'Звук'}</span>
            </button>

            {/* Theme Toggle (Dark / Light) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-300 border border-white/10 cursor-pointer active:scale-95"
              title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Светлая</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Тёмная</span>
                </>
              )}
            </button>

            {/* Season Switcher Dropdown */}
            <div className="relative" ref={seasonRef}>
              <button
                type="button"
                onClick={() => setSeasonOpen(!seasonOpen)}
                className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                style={{
                  background: theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.85)',
                  borderColor: activeSeasonTheme.borderRgba,
                  borderWidth: '1px',
                  boxShadow: `0 0 10px ${activeSeasonTheme.glowRgba}`,
                }}
                title={`Выбран сезон ${season}: ${activeSeasonTheme.statusText}`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                  style={{
                    backgroundColor: activeSeasonTheme.primaryColor,
                    boxShadow: `0 0 6px ${activeSeasonTheme.primaryColor}`,
                  }}
                />
                <span className="font-mono font-black text-slate-900 dark:text-white">{season}</span>
                <span
                  className="hidden sm:inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: activeSeasonTheme.badgeBg,
                    color: activeSeasonTheme.badgeText,
                  }}
                >
                  {activeSeasonTheme.badgeLabel.split('•')[1]?.trim() || activeSeasonTheme.label}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${seasonOpen ? 'rotate-180' : ''}`} />
              </button>

              {seasonOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-72 sm:w-80 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden border"
                  style={{
                    background: theme === 'light' ? 'rgba(255, 255, 255, 0.98)' : 'rgba(11, 16, 27, 0.97)',
                    borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div className="px-3.5 py-1.5 text-[10px] uppercase font-black text-slate-400 tracking-wider border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span>Выбор сезона MLB</span>
                    <span className="text-[9px] font-mono text-slate-500">Автосохранение</span>
                  </div>
                  <div className="p-1.5 space-y-1">
                    {getAvailableSeasons(detectedSeason).map((yr) => {
                      const itemTheme = getSeasonTheme(yr);
                      const isSelected = yr === season;
                      const isCurrent = yr === detectedSeason;
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            setSeason(yr);
                            setSeasonOpen(false);
                          }}
                          className={`w-full p-2.5 rounded-xl text-left transition-all flex items-start justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'ring-1 ring-inset shadow-xs'
                              : theme === 'light'
                              ? 'hover:bg-slate-100'
                              : 'hover:bg-white/[0.06]'
                          }`}
                          style={
                            isSelected
                              ? {
                                  background: itemTheme.badgeBg,
                                  borderColor: itemTheme.borderRgba,
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                              style={{
                                backgroundColor: itemTheme.primaryColor,
                                boxShadow: isSelected ? `0 0 8px ${itemTheme.primaryColor}` : undefined,
                              }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                  {yr}
                                </span>
                                {itemTheme.champion && (
                                  <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 flex items-center gap-0.5">
                                    🏆 {itemTheme.champion}
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Текущий
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {itemTheme.statusText}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/20 text-white shrink-0 mt-0.5">
                              Выбран
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation — floating glass pill */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-2">
        <div
          className="overflow-x-auto scrollbar-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <nav
            className="flex items-center gap-0.5 w-max min-w-full sm:w-auto sm:min-w-0"
            style={{
              background: 'rgba(15,18,26,0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px',
              padding: '3px',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)',
            }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const isLight = theme === 'light';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? isLight
                        ? 'text-slate-950 font-extrabold shadow-sm'
                        : 'text-white'
                      : isLight
                        ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                  style={{
                    transitionDuration: '250ms',
                    transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
                    background: isActive
                      ? isLight
                        ? `linear-gradient(135deg, ${tab.color}28 0%, ${tab.color}15 100%)`
                        : `linear-gradient(135deg, ${tab.color}22 0%, ${tab.color}11 100%)`
                      : 'transparent',
                    boxShadow: isActive
                      ? isLight
                        ? `inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px ${tab.color}30`
                        : `inset 0 1px 1px rgba(255,255,255,0.08), 0 0 16px ${tab.color}20`
                      : 'none',
                    border: isActive
                      ? `1px solid ${tab.color}${isLight ? '60' : '30'}`
                      : '1px solid transparent',
                  }}
                >
                  <span
                    style={{
                      color: isActive ? tab.color : 'inherit',
                      transition: 'color 250ms cubic-bezier(0.22,1,0.36,1)',
                    }}
                  >
                    {tab.icon}
                  </span>
                  <span className="sm:hidden">{tab.short}</span>
                  <span className="hidden sm:inline">{tab.label}</span>

                  {/* Active indicator dot */}
                  {isActive && (
                    <span
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: tab.color, opacity: isLight ? 1 : 0.7 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Active tab breadcrumb (mobile only, shows current tab name) */}
      {activeTabData && (
        <div
          className="sm:hidden px-4 pb-1.5 flex items-center gap-1.5"
          style={{ opacity: 0.5 }}
        >
          <span style={{ color: activeTabData.color }}>{activeTabData.icon}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {activeTabData.label}
          </span>
        </div>
      )}
    </header>
  );
};
