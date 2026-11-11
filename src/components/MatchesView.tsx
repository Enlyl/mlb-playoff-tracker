import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MLBGame,
  MLB_TEAMS,
  getSchedule,
  getUpcoming24HoursGames,
  getUpcoming48HoursGames,
  getSeasonPastGames,
  getSeasonUpcomingGames,
  getLiveGameFeed,
  getTeamLogoUrl,
  LiveGameFeed,
} from '../services/mlbApi';
import {
  Calendar,
  Radio,
  Star,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Download,
  Flame,
  Zap,
  Clock,
  Play,
  Search,
  Tv,
  Eye,
} from 'lucide-react';
import { downloadGameIcs, getGoogleCalendarUrl } from '../utils/calendarExport';
import { formatKyivGameTime, getCountdownText } from '../utils/dateUtils';
import { calculateGameExcitement } from '../utils/gameExcitement';
import { CelebrationOverlay, CelebrationData } from './CelebrationOverlay';
import { GamePicksWidget } from './GamePicksWidget';
import { ClassicsAndFinalsShowcase } from './ClassicsAndFinalsShowcase';
import { sounds } from '../services/soundEffects';
import { notifications } from '../services/notifications';
import { getSeasonTheme } from '../utils/seasonThemes';
import { getCurrentSeasonSync, getSeasonFirstGameDate, SEASON_OPENING_DAYS } from '../utils/seasonUtils';

interface MatchesViewProps {
  onSelectTeam?: (teamId: number, teamName: string) => void;
  onSelectGame: (game: MLBGame) => void;
  favoriteTeamId: number | null;
  season?: number;
  onNavigateToClassics?: () => void;
}

export const MatchesView: React.FC<MatchesViewProps> = ({
  onSelectGame,
  favoriteTeamId,
  onSelectTeam,
  season = 2026,
  onNavigateToClassics,
}) => {
  const seasonTheme = getSeasonTheme(season);
  // Dynamic current dates (NO hardcoded Sept 27 / 29)
  const todayObj = new Date();
  const formatISO = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (days: number) => {
    const d = new Date(todayObj);
    d.setDate(todayObj.getDate() + days);
    return d;
  };

  const todayISO = formatISO(todayObj);
  const tomorrowISO = formatISO(addDays(1));
  const dayAfterISO = formatISO(addDays(2));
  const yesterdayISO = formatISO(addDays(-1));

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const currentYear = todayObj.getFullYear();
    if (season > currentYear) {
      return SEASON_OPENING_DAYS[season] || `${season}-03-25`;
    }
    return todayISO;
  });
  type ViewMode = 'past' | 'today' | 'upcoming' | 'calendar' | 'classics';
  const [games, setGames] = useState<MLBGame[]>([]);
  const [upcoming24h, setUpcoming24h] = useState<MLBGame[]>([]);
  const [upcoming48h, setUpcoming48h] = useState<MLBGame[]>([]);
  const [pastGames, setPastGames] = useState<MLBGame[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<MLBGame[]>([]);
  const [pastLoading, setPastLoading] = useState(false);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [showPastGames, setShowPastGames] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('past');
  const [liveHeroGame, setLiveHeroGame] = useState<MLBGame | null>(null);
  const [liveHeroFeed, setLiveHeroFeed] = useState<LiveGameFeed | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [onlyMyTeam, setOnlyMyTeam] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);

  const prevScoreRef = useRef<{ away?: number; home?: number }>({});
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [showDateFallback, setShowDateFallback] = useState(false);
  const isCustomDate = viewMode === 'calendar' && ![todayISO, tomorrowISO, dayAfterISO].includes(selectedDate);

  const handleOpenCalendar = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        try {
          dateInputRef.current.showPicker();
          return;
        } catch (err) {
          console.warn('showPicker error, showing fallback:', err);
        }
      }
    }
    setShowDateFallback((prev) => !prev);
  };

  // 1. Load games for selected date
  useEffect(() => {
    let isMounted = true;
    async function loadDateGames() {
      setLoading(true);
      try {
        const data = await getSchedule(selectedDate);
        if (isMounted) setGames(data);
      } catch (err) {
        console.error('Error loading schedule:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDateGames();
    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // 2. Load upcoming 24h games, 48h upcoming, and live game
  const refresh24h = async () => {
    try {
      const res = await getUpcoming24HoursGames();
      setUpcoming24h(res.next24HoursGames);
      if (res.liveGame) {
        setLiveHeroGame(res.liveGame);
      } else if (res.next24HoursGames.length > 0) {
        // Feature closest upcoming game in hero showcase
        setLiveHeroGame(res.next24HoursGames[0]);
      }
    } catch (e) {
      console.error('Error loading 24h upcoming:', e);
    }
  };

  // Load upcoming 48h games for main page widget
  const refreshUpcoming48h = async () => {
    try {
      const games48 = await getUpcoming48HoursGames();
      setUpcoming48h(games48);
    } catch (e) {
      console.error('Error loading 48h upcoming:', e);
    }
  };

  useEffect(() => {
    refresh24h();
    refreshUpcoming48h();
    const interval24 = setInterval(refresh24h, 30000);
    return () => clearInterval(interval24);
  }, []);

  // 3. FAST POLLING FOR LIVE GAME (EVERY 3.5 SECONDS FOR REAL-TIME FIELD CHANGES)
  useEffect(() => {
    const isLive = liveHeroGame?.status?.abstractGameState === 'Live';
    if (!isLive || !liveHeroGame?.gamePk) return;

    let isMounted = true;
    const pollLiveFeed = async () => {
      try {
        const feed = await getLiveGameFeed(liveHeroGame.gamePk);
        if (feed && isMounted) {
          setLiveHeroFeed(feed);

          // Check score changes
          const awayScore = feed.liveData?.linescore?.teams?.away?.runs ?? feed.gameData?.teams?.away ? liveHeroGame.teams.away.score : undefined;
          const homeScore = feed.liveData?.linescore?.teams?.home?.runs ?? feed.gameData?.teams?.home ? liveHeroGame.teams.home.score : undefined;

          if (
            (awayScore !== undefined && prevScoreRef.current.away !== undefined && awayScore !== prevScoreRef.current.away) ||
            (homeScore !== undefined && prevScoreRef.current.home !== undefined && homeScore !== prevScoreRef.current.home)
          ) {
            sounds.playScoreChange();
            if (favoriteTeamId && (liveHeroGame.teams.away.team.id === favoriteTeamId || liveHeroGame.teams.home.team.id === favoriteTeamId)) {
              notifications.alertScoreChange(
                liveHeroGame.teams.away.team.name,
                liveHeroGame.teams.home.team.name,
                `${awayScore} - ${homeScore}`,
                'Live обновление'
              );
            }
          }
          prevScoreRef.current = { away: awayScore, home: homeScore };

          // Check home run in latest play
          const currentPlay = feed.liveData?.plays?.currentPlay;
          if (currentPlay?.result?.eventType === 'home_run') {
            sounds.playHomeRunCelebration();
          }
        }
      } catch (err) {
        console.error('Fast poll error:', err);
      }
    };

    pollLiveFeed();
    const liveInterval = setInterval(pollLiveFeed, 3500); // 3.5 seconds fast polling
    return () => {
      isMounted = false;
      clearInterval(liveInterval);
    };
  }, [liveHeroGame?.gamePk, liveHeroGame?.status?.abstractGameState, favoriteTeamId]);

  // Load past season games lazily when user opens the "Прошедшие" tab
  const loadPastGames = async (forceSeason?: number) => {
    const s = forceSeason ?? season;
    setPastLoading(true);
    try {
      const data = await getSeasonPastGames(s, 600);
      setPastGames(data);
    } catch (e) {
      console.error('Error loading past games:', e);
    } finally {
      setPastLoading(false);
    }
  };

  // Load upcoming season games
  const loadUpcomingGames = async (forceSeason?: number) => {
    const s = forceSeason ?? season;
    setUpcomingLoading(true);
    try {
      const data = await getSeasonUpcomingGames(s, 600);
      setUpcomingGames(data);
    } catch (e) {
      console.error('Error loading upcoming games:', e);
    } finally {
      setUpcomingLoading(false);
    }
  };

  // When season changes: determine default viewMode
  useEffect(() => {
    const detectedSeason = getCurrentSeasonSync();
    if (season > detectedSeason) {
      // Future season → show upcoming (scheduled games)
      setViewMode('upcoming');
      setShowPastGames(false);
      const openingDate = SEASON_OPENING_DAYS[season] || `${season}-03-25`;
      setSelectedDate(openingDate);
      getSeasonFirstGameDate(season).then((firstDate) => {
        if (firstDate) setSelectedDate(firstDate);
      });
    } else if (season < detectedSeason) {
      // Past season → show past games
      setViewMode('past');
      setShowPastGames(true);
    } else {
      // Current detected season
      const today = new Date();
      const monthDay = (today.getMonth() + 1) * 100 + today.getDate();
      if (monthDay > 1031) {
        setViewMode('past');
        setShowPastGames(true);
      } else {
        setViewMode('today');
        setShowPastGames(false);
        setSelectedDate(todayISO);
      }
    }
  }, [season]);

  // Sync showPastGames with viewMode
  useEffect(() => {
    setShowPastGames(viewMode === 'past');
    if (viewMode === 'today') {
      setSelectedDate(todayISO);
    }
    if (viewMode === 'upcoming') {
      loadUpcomingGames(season);
    }
  }, [viewMode]);

  // Reload past games if season changes while viewing past tab
  useEffect(() => {
    if (showPastGames) {
      loadPastGames(season);
    } else {
      setPastGames([]);
    }
  }, [season, showPastGames]);

  // Top 3 Must-Watch thriller games based on sabermetric excitement index (strictly of the selected season)
  const topMustWatchGames = React.useMemo(() => {
    if (!pastGames.length) return [];
    const seasonGames = pastGames.filter((g) => {
      if (!g.gameDate) return true;
      return g.gameDate.startsWith(String(season));
    });
    const scored = seasonGames.map((g) => ({
      game: g,
      rating: calculateGameExcitement(g),
    }));
    // Sort descending by excitement rating score
    scored.sort((a, b) => b.rating.score - a.rating.score);
    return scored.slice(0, 3);
  }, [pastGames, season]);

  const filteredGames = games.filter((g) => {
    if (onlyMyTeam && favoriteTeamId) {
      const isFav = g.teams.away.team.id === favoriteTeamId || g.teams.home.team.id === favoriteTeamId;
      if (!isFav) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchAway = g.teams.away.team.name.toLowerCase().includes(q);
      const matchHome = g.teams.home.team.name.toLowerCase().includes(q);
      if (!matchAway && !matchHome) return false;
    }
    return true;
  });

  const isHeroLive = liveHeroGame?.status?.abstractGameState === 'Live';
  const isHeroFinal = liveHeroGame?.status?.abstractGameState === 'Final';
  const isHeroPreview = !isHeroLive && !isHeroFinal;
  const heroLinescore = liveHeroFeed?.liveData?.linescore || liveHeroGame?.linescore;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-6">
      {/* Celebration overlay */}
      <CelebrationOverlay celebration={celebration} onClose={() => setCelebration(null)} />

      {/* ══════════════════════════════════════════════════════════════════════
          0. FAVORITE TEAM QUICK-LINK BANNER
         ══════════════════════════════════════════════════════════════════════ */}
      {favoriteTeamId && (() => {
        const favTeam = MLB_TEAMS.find(t => t.id === favoriteTeamId);
        if (!favTeam) return null;
        return (
          <button
            onClick={() => onSelectTeam?.(favTeam.id, favTeam.name)}
            className="w-full group glass-shell glass-card cursor-pointer hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99]"
            style={{
              padding: '2px',
              borderColor: `${favTeam.accentColor || favTeam.color}55`,
            }}
          >
            <div
              className="glass-core px-4 py-3 rounded-[calc(1.5rem-2px)] flex items-center gap-3"
              style={{
                background: `linear-gradient(135deg, ${favTeam.color}18 0%, transparent 60%)`,
              }}
            >
              <img
                src={getTeamLogoUrl(favTeam.id)}
                alt=""
                className="w-8 h-8 object-contain shrink-0 group-hover:scale-110 transition-transform"
              />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {favTeam.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Все игры сезона {season} →
                </span>
              </div>
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
              </div>
            </div>
          </button>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          1. HERO LIVE / FEATURED MATCH SHOWCASE (CENTERED & BIGGEST ELEMENT)
         ══════════════════════════════════════════════════════════════════════ */}
      {liveHeroGame && (
        <div className="w-full flex justify-center">
          <div
            onClick={() => onSelectGame(liveHeroGame)}
            className="w-full glass-shell glass-card cursor-pointer transform hover:-translate-y-0.5 transition-all duration-300 relative group overflow-hidden"
            style={{
              padding: '2px',
              borderColor: isHeroLive ? 'rgba(239, 68, 68, 0.7)' : 'rgba(245, 158, 11, 0.5)',
              boxShadow: isHeroLive
                ? '0 0 60px rgba(239, 68, 68, 0.25), 0 0 20px rgba(239, 68, 68, 0.15)'
                : '0 0 45px rgba(245, 158, 11, 0.15)',
            }}
          >
            <div
              className="glass-core p-6 sm:p-8 rounded-[calc(1.5rem-2px)] relative overflow-hidden"
              style={{
                background: isHeroLive
                  ? 'radial-gradient(ellipse 900px 450px at 50% 0%, rgba(239,68,68,0.22) 0%, rgba(15,18,26,0.98) 75%)'
                  : 'radial-gradient(ellipse 900px 450px at 50% 0%, rgba(245,158,11,0.18) 0%, rgba(15,18,26,0.98) 75%)',
              }}
            >
              {/* Top Banner Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  {isHeroLive ? (
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white font-mono font-black text-xs tracking-wider animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      🔴 ИДЁТ ПРЯМО СЕЙЧАС В ЭФИРЕ
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono font-bold text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      ГЛАВНЫЙ МАТЧ БЛИЖАЙШИХ ЧАСОВ • {getCountdownText(liveHeroGame.gameDate)}
                    </span>
                  )}

                  {isHeroLive && heroLinescore && (
                    <span className="text-xs text-slate-300 font-mono font-bold px-2.5 py-1 rounded-lg bg-black/40 border border-white/10">
                      {heroLinescore.isTopInning ? '▲ Верх' : '▼ Низ'} {heroLinescore.currentInning || 1}-го иннинга
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-300 font-mono">
                  {isHeroLive ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10">
                      <span className="text-emerald-400 font-bold">{heroLinescore?.balls ?? 0}B</span> -{' '}
                      <span className="text-amber-400 font-bold">{heroLinescore?.strikes ?? 0}S</span> -{' '}
                      <span className="text-red-400 font-bold">{heroLinescore?.outs ?? 0} Out</span>
                    </span>
                  ) : (
                    <span>{formatKyivGameTime(liveHeroGame.gameDate)}</span>
                  )}
                  <span className="text-slate-400 truncate max-w-[200px] hidden sm:inline">
                    {liveHeroGame.venue?.name || 'MLB Stadium'}
                  </span>
                </div>
              </div>

              {/* Main Teams & Score Display (Gigantic 56px) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-2">
                {/* Away Team */}
                <div className="md:col-span-5 flex items-center justify-between sm:justify-start gap-4 p-3 rounded-2xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04]">
                  <div className="flex items-center gap-3.5 truncate">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTeam?.(liveHeroGame.teams.away.team.id, liveHeroGame.teams.away.team.name);
                      }}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-200/80 dark:bg-black/40 border border-slate-300 dark:border-white/10 p-2 flex items-center justify-center shrink-0 hover:scale-105 transition shadow-lg"
                      title="Открыть страницу клуба"
                    >
                      <img
                        src={getTeamLogoUrl(liveHeroGame.teams.away.team.id)}
                        alt=""
                        className="w-full h-full object-contain filter drop-shadow-md"
                      />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h2 className="font-black text-xl sm:text-2xl text-slate-950 dark:text-white tracking-tight truncate">
                          {liveHeroGame.teams.away.team.name}
                        </h2>
                        {favoriteTeamId === liveHeroGame.teams.away.team.id && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shadow-sm">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            МОЯ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-400 font-mono mt-0.5">
                        Гости • {liveHeroGame.teams.away.leagueRecord?.wins ?? 0}-{liveHeroGame.teams.away.leagueRecord?.losses ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="text-4xl sm:text-6xl font-black font-mono text-slate-950 dark:text-white tabular-nums sm:ml-auto">
                    {liveHeroGame.teams.away.score ?? (isHeroLive ? 0 : '—')}
                  </div>
                </div>

                {/* Center VS & Bases Status */}
                <div className="md:col-span-2 flex flex-col items-center justify-center text-center py-2">
                  {isHeroLive ? (
                    <div className="flex flex-col items-center gap-1.5">
                      {/* Diamond Bases Radar */}
                      <div className="relative w-10 h-10 my-1">
                        {/* 2nd Base */}
                        <div
                          className={`absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border ${
                            heroLinescore?.offense?.second
                              ? 'bg-amber-400 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                              : 'bg-slate-800 border-slate-600'
                          }`}
                        />
                        {/* 3rd Base */}
                        <div
                          className={`absolute top-1/2 left-0 -translate-y-1/2 w-3 h-3 rotate-45 border ${
                            heroLinescore?.offense?.third
                              ? 'bg-amber-400 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                              : 'bg-slate-800 border-slate-600'
                          }`}
                        />
                        {/* 1st Base */}
                        <div
                          className={`absolute top-1/2 right-0 -translate-y-1/2 w-3 h-3 rotate-45 border ${
                            heroLinescore?.offense?.first
                              ? 'bg-amber-400 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                              : 'bg-slate-800 border-slate-600'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest">
                        В ИГРЕ
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono uppercase tracking-widest block">
                        VS
                      </span>
                      <span className="text-[10px] text-slate-700 dark:text-slate-400 font-mono font-medium">
                        {liveHeroGame.seriesDescription || `Серия ${season}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Home Team */}
                <div className="md:col-span-5 flex items-center justify-between sm:justify-end gap-4 p-3 rounded-2xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04]">
                  <div className="text-4xl sm:text-6xl font-black font-mono text-slate-950 dark:text-white tabular-nums sm:mr-auto">
                    {liveHeroGame.teams.home.score ?? (isHeroLive ? 0 : '—')}
                  </div>

                  <div className="flex items-center gap-3.5 truncate text-right">
                    <div className="truncate">
                      <div className="flex items-center justify-end gap-2">
                        {favoriteTeamId === liveHeroGame.teams.home.team.id && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shadow-sm">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            МОЯ
                          </span>
                        )}
                        <h2 className="font-black text-xl sm:text-2xl text-slate-950 dark:text-white tracking-tight truncate">
                          {liveHeroGame.teams.home.team.name}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-400 font-mono mt-0.5">
                        Хозяева • {liveHeroGame.teams.home.leagueRecord?.wins ?? 0}-{liveHeroGame.teams.home.leagueRecord?.losses ?? 0}
                      </p>
                    </div>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTeam?.(liveHeroGame.teams.home.team.id, liveHeroGame.teams.home.team.name);
                      }}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-200/80 dark:bg-black/40 border border-slate-300 dark:border-white/10 p-2 flex items-center justify-center shrink-0 hover:scale-105 transition shadow-lg"
                      title="Открыть страницу клуба"
                    >
                      <img
                        src={getTeamLogoUrl(liveHeroGame.teams.home.team.id)}
                        alt=""
                        className="w-full h-full object-contain filter drop-shadow-md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Interactive CTA Bar */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-300">
                  <Play className="w-4 h-4 text-red-500 fill-current animate-pulse" />
                  <span className="font-bold">
                    {isHeroLive
                      ? 'Нажмите для перехода в Live-Центр и отслеживания каждого броска (поллинг 3.5 сек)'
                      : isHeroFinal
                      ? 'Нажмите, чтобы открыть полную статистику, страйк-зону и спрей-чарт'
                      : 'Матч ещё не начался — вернитесь к началу игры'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {!isHeroPreview && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectGame(liveHeroGame);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-lg shadow-red-600/30"
                    >
                      <span>{isHeroLive ? 'Смотреть Live' : 'Статистика и обзор'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          2. UPCOMING IN NEXT 48 HOURS SECTION (2 days widget on homepage)
         ══════════════════════════════════════════════════════════════════════ */}
      {upcoming24h.length > 0 && (
        <div className="glass-shell glass-card" style={{ padding: '1px' }}>
          <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)] space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-blue-500/20 text-blue-400">
                  <Clock className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-black text-white">
                  Ближайшие матчи — 2 суток ({upcoming24h.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Обновляется каждые 30 сек
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcoming24h.map((g, idx) => {
                const awayName = g.teams.away.team.name;
                const homeName = g.teams.home.team.name;
                const isFavAway = favoriteTeamId === g.teams.away.team.id;
                const isFavHome = favoriteTeamId === g.teams.home.team.id;

                return (
                  <div
                    key={`${g.gamePk}-${idx}`}
                    onClick={() => onSelectGame(g)}
                    className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 cursor-pointer transition space-y-2 group shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-400/15 dark:bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                        {getCountdownText(g.gameDate)}
                      </span>
                      <span className="font-semibold">{formatKyivGameTime(g.gameDate)}</span>
                    </div>

                    <div className="space-y-1.5 py-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <img src={getTeamLogoUrl(g.teams.away.team.id)} alt="" className="w-5 h-5 object-contain" />
                          <span className={`text-xs font-bold truncate ${isFavAway ? '!text-amber-600 dark:!text-amber-400 font-black' : 'text-slate-900 dark:text-slate-100'}`}>
                            {awayName}
                          </span>
                        </div>
                        {isFavAway && <Star className="w-3 h-3 fill-amber-400 text-amber-500" />}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <img src={getTeamLogoUrl(g.teams.home.team.id)} alt="" className="w-5 h-5 object-contain" />
                          <span className={`text-xs font-bold truncate ${isFavHome ? '!text-amber-600 dark:!text-amber-400 font-black' : 'text-slate-900 dark:text-slate-100'}`}>
                            {homeName}
                          </span>
                        </div>
                        {isFavHome && <Star className="w-3 h-3 fill-amber-400 text-amber-500" />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                      <span className="truncate">{g.seriesDescription || 'Regular Season'}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadGameIcs(g);
                        }}
                        className="card-action-btn p-1"
                        title="Добавить матч в календарь (.ics)"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          3. TOP CONTROLS BAR: VIEW MODE TABS + FILTER
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="glass-shell glass-card" style={{ padding: '1px' }}>
        <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)]">
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="eyebrow"
                  style={{
                    background: seasonTheme.badgeBg,
                    border: `1px solid ${seasonTheme.borderRgba}`,
                    color: seasonTheme.badgeText,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: seasonTheme.primaryColor }}
                  />
                  Матчи • {seasonTheme.badgeLabel}
                </span>
              </div>
              <h2 className="text-display text-slate-950 dark:text-white" style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)' }}>
                Матчи сезона
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {viewMode === 'past' && `Все завершённые матчи MLB ${season} — от новых к старым`}
                {viewMode === 'today' && `Игры на ${new Date(todayISO).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                {viewMode === 'upcoming' && `Предстоящие матчи MLB ${season}`}
                {viewMode === 'calendar' && `Выбранная дата: ${new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                {viewMode === 'classics' && `Лучшие матчи и финалы сезона ${season}`}
              </p>
            </div>

            {/* ── View Mode Tabs ── */}
            <div className="flex flex-wrap items-center gap-2">
              {([
                {
                  mode: 'past' as ViewMode,
                  label: 'Прошедшие',
                  icon: <Eye className="w-3.5 h-3.5" />,
                  activeClass: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/40',
                  inactiveClass: 'hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/30',
                  tagColor: '#10b981',
                },
                {
                  mode: 'today' as ViewMode,
                  label: 'Сегодня',
                  icon: <Radio className="w-3.5 h-3.5 animate-pulse" />,
                  activeClass: 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.35)] ring-1 ring-rose-400/40',
                  inactiveClass: 'hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30',
                  tagColor: '#f43f5e',
                },
                {
                  mode: 'upcoming' as ViewMode,
                  label: 'Предстоящие',
                  icon: <Play className="w-3.5 h-3.5" />,
                  activeClass: 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.3)] ring-1 ring-sky-400/40',
                  inactiveClass: 'hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-500/30',
                  tagColor: '#0ea5e9',
                },
                {
                  mode: 'calendar' as ViewMode,
                  label: 'Календарь',
                  icon: <Calendar className="w-3.5 h-3.5" />,
                  activeClass: 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] ring-1 ring-indigo-400/40',
                  inactiveClass: 'hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500/30',
                  tagColor: '#6366f1',
                },
                {
                  mode: 'classics' as ViewMode,
                  label: 'Финал & Триллеры',
                  icon: <Flame className="w-3.5 h-3.5 text-amber-500" />,
                  activeClass: 'bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-500/25 text-amber-800 dark:text-amber-300 border-amber-500/60 shadow-[0_0_18px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/50',
                  inactiveClass: 'hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30',
                  tagColor: '#f59e0b',
                },
              ]).map(({ mode, label, icon, activeClass, inactiveClass, tagColor }) => {
                const isActive = viewMode === mode;
                return (
                  <motion.button
                    key={mode}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.91, rotate: -2 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 18 }}
                    onClick={() => {
                      sounds.playBatCrack();
                      setViewMode(mode);
                      if (mode === 'calendar') {
                        handleOpenCalendar();
                      }
                    }}
                    className={`relative overflow-hidden flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black transition-colors cursor-pointer border ${
                      isActive
                        ? `${activeClass} shadow-xs font-black`
                        : `bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.07] ${inactiveClass}`
                    }`}
                  >
                    {/* Animated baseball seams accent on active */}
                    {isActive && (
                      <motion.span
                        layoutId="activeTabGlow"
                        className="absolute inset-0 pointer-events-none rounded-full"
                        style={{
                          background: `radial-gradient(ellipse at 50% 0%, ${tagColor}35 0%, transparent 80%)`,
                        }}
                        transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
                      />
                    )}
                    {/* Baseball icon badge when active */}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {isActive ? (
                        <motion.span
                          initial={{ rotate: -90, scale: 0.6 }}
                          animate={{ rotate: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          className="inline-block text-[12px] leading-none"
                        >
                          ⚾
                        </motion.span>
                      ) : (
                        icon
                      )}
                      <span>{label}</span>
                    </span>
                  </motion.button>
                );
              })}

              {/* Hidden date input for Calendar mode */}
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setViewMode('calendar');
                    setShowDateFallback(false);
                  }
                }}
                className={
                  showDateFallback
                    ? 'px-2.5 py-1 rounded-full bg-slate-900 text-amber-300 text-[11px] font-bold border border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer shadow-lg'
                    : 'absolute opacity-0 pointer-events-none w-0 h-0'
                }
                tabIndex={showDateFallback ? 0 : -1}
                aria-hidden={!showDateFallback}
              />

              {/* Separator */}
              <div className="w-px h-5 bg-slate-300 dark:bg-white/10 mx-1 hidden sm:block" />

              {/* Team Search Input */}
              <div className="relative flex items-center min-w-[170px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск: Padres, Dodgers..."
                  className="w-full bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 rounded-full pl-8 pr-7 py-1.5 text-[11px] text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs px-1 cursor-pointer"
                    title="Очистить поиск"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          4. CONTENT BASED ON VIEW MODE
         ══════════════════════════════════════════════════════════════════════ */}

      {/* TODAY — games for today's date */}
      {viewMode === 'today' && <GamePicksWidget games={games} onSelectGame={onSelectGame} season={season} />}

      {/* UPCOMING — all scheduled future games of the season */}
      {viewMode === 'upcoming' && (
        <div className="space-y-4">
          {upcomingLoading ? (
            <div className="text-center py-16 text-slate-500 font-medium text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              <span>Загрузка предстоящих матчей сезона {season}...</span>
            </div>
          ) : upcomingGames.length === 0 ? (
            <div className="glass-shell p-[1px]">
              <div className="glass-core p-8 text-center text-slate-400 space-y-1.5 rounded-2xl">
                <p className="font-bold text-slate-900 dark:text-white">Предстоящих матчей нет</p>
                <p className="text-xs text-slate-500">
                  Сезон {season} завершён или ещё не появилось расписание.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingGames
                .filter((g) => {
                  if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    return g.teams.away.team.name.toLowerCase().includes(q) || g.teams.home.team.name.toLowerCase().includes(q);
                  }
                  return true;
                })
                .map((game) => {
                const gameDate = new Date(game.gameDate);
                const dateStr = gameDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                const timeStr = gameDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={game.gamePk}
                    onClick={() => onSelectGame(game)}
                    className="glass-shell glass-card cursor-pointer hover:-translate-y-0.5 transition-all active:scale-[0.99]"
                    style={{ padding: '1px' }}
                  >
                    <div className="glass-core p-3 sm:p-4 rounded-[calc(1.5rem-1px)] flex items-center gap-3">
                      <div className="text-center shrink-0 w-14">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{dateStr}</div>
                        <div className="text-xs font-black text-slate-900 dark:text-white">{timeStr}</div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <img src={getTeamLogoUrl(game.teams.away.team.id)} alt="" className="w-5 h-5 object-contain" />
                          <span className={`text-xs font-bold truncate ${favoriteTeamId === game.teams.away.team.id ? '!text-amber-600 dark:!text-amber-400 font-black' : 'text-slate-900 dark:text-slate-100'}`}>
                            {game.teams.away.team.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <img src={getTeamLogoUrl(game.teams.home.team.id)} alt="" className="w-5 h-5 object-contain" />
                          <span className={`text-xs font-bold truncate ${favoriteTeamId === game.teams.home.team.id ? '!text-amber-600 dark:!text-amber-400 font-black' : 'text-slate-900 dark:text-slate-100'}`}>
                            {game.teams.home.team.name}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-[10px] text-slate-500">{game.seriesDescription || 'Regular Season'}</div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CLASSICS — finals & thrillers showcase */}
      {viewMode === 'classics' && (
        <div className="space-y-6">
          <ClassicsAndFinalsShowcase
            onSelectGame={onSelectGame}
            favoriteTeamId={favoriteTeamId}
            season={season}
          />
        </div>
      )}

      {/* PAST — all past season games */}
      {viewMode === 'past' && (
        <div className="space-y-6">
          {pastLoading ? (
            <div className="text-center py-16 text-slate-500 font-medium text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              <span>Загрузка матчей регулярки сезона {season}...</span>
            </div>
          ) : pastGames.length === 0 ? (
            <div className="glass-shell p-[1px]">
              <div className="glass-core p-8 text-center text-slate-400 space-y-1.5 rounded-2xl">
                <p className="font-bold text-white">Регулярный сезон {season} ещё не начался</p>
                <p className="text-xs text-slate-500">
                  Матчи регулярки 2027 стартуют 25 марта. Выше представлена полная подборка финалов и триллеров прошлых сезонов!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ── TOP 3 MUST-WATCH MATCHES SHOWCASE ── */}
              {topMustWatchGames.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-rose-500/10 border border-amber-500/35 p-4 sm:p-5 shadow-xl space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-amber-500/20">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
                        <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                          <span>Топ-3 матча сезона {season}, которые стоит посмотреть</span>
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/35 uppercase tracking-wider">
                            Must-Watch {season}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          Саберометрический индекс зрелищности сезона {season}: минимальная разница, экстра-иннинги, перестрелки и драма концовок
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {topMustWatchGames.map(({ game, rating }, idx) => {
                      const awayScore = game.teams.away.score;
                      const homeScore = game.teams.home.score;
                      const awayWon = typeof awayScore === 'number' && typeof homeScore === 'number' && awayScore > homeScore;
                      const homeWon = typeof awayScore === 'number' && typeof homeScore === 'number' && homeScore > awayScore;
                      const gameDate = new Date(game.gameDate);
                      const dateLbl = gameDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

                      return (
                        <div
                          key={`must-watch-${game.gamePk}`}
                          onClick={() => onSelectGame(game)}
                          className="group relative cursor-pointer rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-amber-500/40 p-3.5 shadow-md hover:shadow-xl hover:border-amber-400 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
                        >
                          {/* Top Rank Badge & Rating */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center font-mono shadow-xs">
                                #{idx + 1}
                              </span>
                              <span className="text-[11px] font-black text-slate-900 dark:text-white truncate">
                                {dateLbl}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 dark:bg-amber-400/15 border border-amber-500/35 text-amber-700 dark:text-amber-300 font-mono text-[11px] font-black">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>{rating.score}</span>
                              <span className="text-[9px] text-amber-600/70 dark:text-amber-400/70">/10</span>
                            </div>
                          </div>

                          {/* Score and Teams */}
                          <div className="space-y-1.5 py-1">
                            {/* Away */}
                            <div className={`flex items-center justify-between p-2 rounded-xl transition ${
                              awayWon
                                ? 'bg-emerald-500/15 border border-emerald-500/30'
                                : 'bg-slate-100 dark:bg-slate-800/60'
                            }`}>
                              <div className="flex items-center gap-2 truncate">
                                <img src={getTeamLogoUrl(game.teams.away.team.id)} alt="" className="w-5 h-5 object-contain shrink-0" />
                                <span className={`text-xs truncate ${awayWon ? 'font-black text-slate-950 dark:text-white' : 'font-bold text-slate-700 dark:text-slate-300'}`}>
                                  {game.teams.away.team.name}
                                </span>
                              </div>
                              <span className={`text-sm font-mono font-black ${awayWon ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                {awayScore ?? '—'}
                              </span>
                            </div>

                            {/* Home */}
                            <div className={`flex items-center justify-between p-2 rounded-xl transition ${
                              homeWon
                                ? 'bg-emerald-500/15 border border-emerald-500/30'
                                : 'bg-slate-100 dark:bg-slate-800/60'
                            }`}>
                              <div className="flex items-center gap-2 truncate">
                                <img src={getTeamLogoUrl(game.teams.home.team.id)} alt="" className="w-5 h-5 object-contain shrink-0" />
                                <span className={`text-xs truncate ${homeWon ? 'font-black text-slate-950 dark:text-white' : 'font-bold text-slate-700 dark:text-slate-300'}`}>
                                  {game.teams.home.team.name}
                                </span>
                              </div>
                              <span className={`text-sm font-mono font-black ${homeWon ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                {homeScore ?? '—'}
                              </span>
                            </div>
                          </div>

                          {/* Reasons & CTA */}
                          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              {rating.badges.map((b, bi) => (
                                <span
                                  key={bi}
                                  className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                                >
                                  {b}
                                </span>
                              ))}
                            </div>
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform">
                              <span>Обзор</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── ALL PAST GAMES LIST ── */}
              <div className="space-y-2">
                <p className="text-[11px] text-slate-700 dark:text-slate-300 font-mono px-1 font-semibold">
                  Все прошедшие матчи: {pastGames.length} — отсортировано от новых к старым
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {pastGames.map((game, idx) => {
                    const rating = calculateGameExcitement(game);
                    const isFavGame =
                      favoriteTeamId &&
                      (game.teams.away.team.id === favoriteTeamId || game.teams.home.team.id === favoriteTeamId);
                    const awayScore = game.teams.away.score;
                    const homeScore = game.teams.home.score;
                    const awayWon = typeof awayScore === 'number' && typeof homeScore === 'number' && awayScore > homeScore;
                    const homeWon = typeof awayScore === 'number' && typeof homeScore === 'number' && homeScore > awayScore;
                    const gameDate = new Date(game.gameDate);
                    const dateLbl = gameDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                    return (
                      <div
                        key={`${game.gamePk}-${idx}`}
                        onClick={() => onSelectGame(game)}
                        className="cursor-pointer glass-shell glass-card hover:-translate-y-0.5 transition-all duration-200"
                        style={{
                          padding: '1px',
                          borderColor: isFavGame ? 'rgba(245,158,11,0.45)' : undefined,
                        }}
                      >
                        <div className="glass-core p-4 rounded-[calc(1.5rem-1px)] space-y-3">
                          {/* Date + Rating + Series Header */}
                          <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/25 px-2.5 py-0.5 rounded-md font-bold tracking-tight">
                                {dateLbl}
                              </span>
                              <span
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-bold"
                                title={`Рейтинг зрелищности матча: ${rating.score}/10 (${rating.label})`}
                              >
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                <span>{rating.score}</span>
                              </span>
                            </div>
                            <span className="truncate max-w-[140px] text-right font-semibold text-slate-900 dark:text-slate-200">
                              {game.seriesDescription || 'MLB Регулярка'}
                            </span>
                          </div>

                        {/* Teams + Score */}
                        <div className="space-y-2 py-0.5">
                          {/* Away Team */}
                          <div className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                            awayWon
                              ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25'
                              : 'bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5'
                          }`}>
                            <div className="flex items-center gap-2.5 truncate">
                              <img src={getTeamLogoUrl(game.teams.away.team.id)} alt="" className="w-5 h-5 object-contain shrink-0" />
                              <span className={`text-xs truncate ${
                                awayWon
                                  ? 'font-black text-slate-950 dark:text-white'
                                  : 'font-bold text-slate-800 dark:text-slate-200'
                              } ${favoriteTeamId === game.teams.away.team.id ? '!text-amber-600 dark:!text-amber-400 font-black' : ''}`}>
                                {game.teams.away.team.name}
                              </span>
                            </div>
                            <span className={`font-mono tabular-nums ml-2 px-2.5 py-0.5 rounded-md text-sm ${
                              awayWon
                                ? 'font-black text-emerald-800 dark:text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 shadow-sm'
                                : 'font-bold text-slate-700 dark:text-slate-300 bg-slate-200/60 dark:bg-white/10'
                            }`}>
                              {awayScore ?? '—'}
                            </span>
                          </div>

                          {/* Home Team */}
                          <div className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                            homeWon
                              ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25'
                              : 'bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5'
                          }`}>
                            <div className="flex items-center gap-2.5 truncate">
                              <img src={getTeamLogoUrl(game.teams.home.team.id)} alt="" className="w-5 h-5 object-contain shrink-0" />
                              <span className={`text-xs truncate ${
                                homeWon
                                  ? 'font-black text-slate-950 dark:text-white'
                                  : 'font-bold text-slate-800 dark:text-slate-200'
                              } ${favoriteTeamId === game.teams.home.team.id ? '!text-amber-600 dark:!text-amber-400 font-black' : ''}`}>
                                {game.teams.home.team.name}
                              </span>
                            </div>
                            <span className={`font-mono tabular-nums ml-2 px-2.5 py-0.5 rounded-md text-sm ${
                              homeWon
                                ? 'font-black text-emerald-800 dark:text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 shadow-sm'
                                : 'font-bold text-slate-700 dark:text-slate-300 bg-slate-200/60 dark:bg-white/10'
                            }`}>
                              {homeScore ?? '—'}
                            </span>
                          </div>
                        </div>

                        {/* Final status badge + Action Link */}
                        <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[10px]">
                          <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono font-black px-2.5 py-0.5 rounded-md flex items-center gap-1.5 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            ФИНАЛ
                          </span>

                          <div className="flex items-center gap-2">
                            {isFavGame && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shadow-sm">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                МОЯ
                              </span>
                            )}
                            <span className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-0.5">
                              Обзор →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          5b. MAIN MATCHES LIST FOR SELECTED DATE
         ══════════════════════════════════════════════════════════════════════ */}
      {(viewMode === 'today' || viewMode === 'calendar') && (loading ? (
        <div className="text-center py-20 text-slate-500 font-medium text-sm flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
          <span>Загрузка матчей на {selectedDate}...</span>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="glass-shell p-[1px]">
          <div className="glass-core p-10 sm:p-14 text-center text-slate-400 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center">
              <Calendar className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-base font-bold text-white">
                {searchQuery || onlyMyTeam
                  ? 'По вашим фильтрам матчей не найдено'
                  : `Матчей на ${selectedDate} нет`}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {searchQuery || onlyMyTeam
                  ? 'Попробуйте сбросить поисковый запрос или фильтр «Моя команда»'
                  : 'В этот день в расписании MLB нет официальных игр (день отдыха или перемещения команд).'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 flex-wrap pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(todayISO);
                  setSearchQuery('');
                  setOnlyMyTeam(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 transition active:scale-95 cursor-pointer"
              >
                Вернуться к сегодняшним матчам
              </button>
              {(searchQuery || onlyMyTeam) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setOnlyMyTeam(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition active:scale-95 cursor-pointer"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>

            {/* Promo banner for Golden Classics and Finals */}
            <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-purple-500/15 border border-amber-500/30 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-bold text-white">Золотая коллекция: Финалы & Лучшие триллеры</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold uppercase">
                    2023–2026
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  Пока матчи нового сезона не стартовали, смотрите все серии World Series, ALCS, NLCS и 7 легендарных матчей с walk-off хоумранами, экстра-иннингами и историческими камбэками!
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewMode('classics');
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shrink-0 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 transition"
              >
                Смотреть коллекцию →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGames.map((game, idx) => {
            const isLive = game.status?.abstractGameState === 'Live';
            const isFinal = game.status?.abstractGameState === 'Final';
            const isFavGame =
              favoriteTeamId &&
              (game.teams.away.team.id === favoriteTeamId || game.teams.home.team.id === favoriteTeamId);

            const awayPitcher = game.teams.away.probablePitcher;
            const homePitcher = game.teams.home.probablePitcher;

            return (
              <div
                key={`${game.gamePk}-${idx}`}
                className="glass-shell glass-card"
                style={{
                  padding: '1px',
                  borderColor: isLive
                    ? 'rgba(239, 68, 68, 0.5)'
                    : isFavGame
                    ? 'rgba(245, 158, 11, 0.4)'
                    : undefined,
                  boxShadow: isLive
                    ? '0 0 30px rgba(239, 68, 68, 0.15)'
                    : isFavGame
                    ? '0 0 25px rgba(245, 158, 11, 0.1)'
                    : undefined,
                }}
              >
                <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)] space-y-3">
                  {/* Top Status Strip */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {isLive ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white font-mono font-bold text-[10px] animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          LIVE
                        </span>
                      ) : isFinal ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono font-black text-[10px] uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          Завершён
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 font-mono font-bold text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatKyivGameTime(game.gameDate)}
                        </span>
                      )}

                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-200">
                        <span>
                          {game.seriesDescription || 'Матч'} • Игра {game.seriesGameNumber || 1}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isFavGame && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-950 bg-amber-400 px-2 py-0.5 rounded shadow-sm">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Моя
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadGameIcs(game);
                        }}
                        title="Экспорт матча в календарь (.ics)"
                        className="card-action-btn p-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={getGoogleCalendarUrl(game)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Google Календарь"
                        className="card-action-btn p-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Matchup Teams Rows */}
                  <div onClick={() => onSelectGame(game)} className="space-y-3 cursor-pointer">
                    {/* Away Team */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                        favoriteTeamId === game.teams.away.team.id
                          ? 'bg-amber-500/10 border border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/30'
                          : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer group/team"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTeam?.(game.teams.away.team.id, game.teams.away.team.name);
                        }}
                        title="Открыть страницу клуба"
                      >
                        <div className="relative w-8 h-8 shrink-0 group-hover/team:scale-110 transition-transform">
                          <img
                            src={getTeamLogoUrl(game.teams.away.team.id)}
                            alt=""
                            className="w-full h-full object-contain filter drop-shadow"
                          />
                        </div>
                        <div>
                          <span className="match-card-team-name font-black text-sm text-slate-950 dark:text-white group-hover/team:text-amber-600 dark:group-hover/team:text-amber-400 transition-colors block">
                            {game.teams.away.team.name}
                          </span>
                          {game.teams.away.leagueRecord && (
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-semibold block">
                              ({game.teams.away.leagueRecord.wins}-{game.teams.away.leagueRecord.losses})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="font-mono font-black text-2xl text-slate-950 dark:text-white tabular-nums">
                        {game.teams.away.score ?? (isLive ? 0 : '-')}
                      </div>
                    </div>

                    {/* Home Team */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                        favoriteTeamId === game.teams.home.team.id
                          ? 'bg-amber-500/10 border border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/30'
                          : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer group/team"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTeam?.(game.teams.home.team.id, game.teams.home.team.name);
                        }}
                        title="Открыть страницу клуба"
                      >
                        <div className="relative w-8 h-8 shrink-0 group-hover/team:scale-110 transition-transform">
                          <img
                            src={getTeamLogoUrl(game.teams.home.team.id)}
                            alt=""
                            className="w-full h-full object-contain filter drop-shadow"
                          />
                        </div>
                        <div>
                          <span className="match-card-team-name font-black text-sm text-slate-950 dark:text-white group-hover/team:text-amber-600 dark:group-hover/team:text-amber-400 transition-colors block">
                            {game.teams.home.team.name}
                          </span>
                          {game.teams.home.leagueRecord && (
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-semibold block">
                              ({game.teams.home.leagueRecord.wins}-{game.teams.home.leagueRecord.losses})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="font-mono font-black text-2xl text-slate-950 dark:text-white tabular-nums">
                        {game.teams.home.score ?? (isLive ? 0 : '-')}
                      </div>
                    </div>
                  </div>

                  {/* Probable Pitchers */}
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Стартовые питчеры матча
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/20">SP</span>
                        <div className="truncate">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                            {awayPitcher?.fullName || 'TBD'}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {awayPitcher?.stats?.era ? `ERA ${awayPitcher.stats.era}` : 'Статистика сезона'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/20">SP</span>
                        <div className="truncate">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                            {homePitcher?.fullName || 'TBD'}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {homePitcher?.stats?.era ? `ERA ${homePitcher.stats.era}` : 'Статистика сезона'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer link to live modal */}
                  {(isLive || isFinal) && (
                    <div
                      onClick={() => onSelectGame(game)}
                      className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer transition-colors"
                    >
                      <span>{isLive ? 'Смотреть Live' : 'Статистика и обзор матча'}</span>
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      
    </div>
  );
};
