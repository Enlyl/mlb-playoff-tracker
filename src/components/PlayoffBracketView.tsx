import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Star,
  Target,
  RotateCcw,
  CheckCircle2,
  Calendar,
  ChevronRight,
  ExternalLink,
  Flame,
  Shield,
  X,
  Play,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  PostseasonSeries,
  MLBGame,
  getPostseasonSeries,
  getTeamLogoUrl,
} from '../services/mlbApi';

interface PlayoffBracketViewProps {
  onSelectTeam?: (teamId: number, teamName: string) => void;
  onSelectGame: (game: MLBGame) => void;
  favoriteTeamId?: number;
}

export interface ParsedSeries {
  id: string;
  gameType: 'F' | 'D' | 'L' | 'W';
  league: 'AL' | 'NL' | 'MLB';
  roundName: string;
  targetWins: number;
  seriesDescription: string;
  awayTeam: { id: number; name: string };
  homeTeam: { id: number; name: string };
  awayWins: number;
  homeWins: number;
  playedGames: number;
  isOver: boolean;
  winnerId: number | null;
  statusText: string;
  games: MLBGame[];
}

export const PlayoffBracketView: React.FC<PlayoffBracketViewProps> = ({
  onSelectTeam,
  onSelectGame,
  favoriteTeamId,
}) => {
  const [season, setSeason] = useState<number>(2026);
  const [rawSeriesList, setRawSeriesList] = useState<PostseasonSeries[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'bracket' | 'list'>('bracket');
  const [mobileTab, setMobileTab] = useState<'all' | 'al' | 'ws' | 'nl'>('all');
  const [selectedSeries, setSelectedSeries] = useState<ParsedSeries | null>(null);

  // Pick'em prediction state (persisted per season)
  const [picksMode, setPicksMode] = useState<boolean>(false);
  const [picks, setPicks] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`mlb_playoff_picks_${season}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mlb_playoff_picks_${season}`);
      setPicks(saved ? JSON.parse(saved) : {});
    } catch {
      setPicks({});
    }
  }, [season]);

  const handleSetPick = (seriesId: string, teamId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPicks((prev) => {
      const next = { ...prev, [seriesId]: teamId };
      localStorage.setItem(`mlb_playoff_picks_${season}`, JSON.stringify(next));
      return next;
    });
  };

  const handleClearPicks = () => {
    setPicks({});
    localStorage.removeItem(`mlb_playoff_picks_${season}`);
  };

  // Fetch postseason series
  useEffect(() => {
    let isMounted = true;
    async function loadPostseason() {
      setLoading(true);
      try {
        const data = await getPostseasonSeries(season);
        if (isMounted) setRawSeriesList(data);
      } catch (err) {
        console.error('Failed to load postseason:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPostseason();
    return () => {
      isMounted = false;
    };
  }, [season]);

  // Parse raw series into clean structured data
  const parsedSeriesList = useMemo<ParsedSeries[]>(() => {
    return rawSeriesList.map((s) => {
      const sId = s.series?.id || '';
      const gType = (s.series?.gameType || 'F') as 'F' | 'D' | 'L' | 'W';
      const firstGame = s.games?.[0];
      const desc = firstGame?.seriesDescription || s.seriesDescription || 'Серия плей-офф';

      let league: 'AL' | 'NL' | 'MLB' = 'MLB';
      if (gType === 'W') {
        league = 'MLB';
      } else if (
        desc.includes('AL') ||
        sId.startsWith('AL') ||
        sId === 'F_1' ||
        sId === 'F_2' ||
        sId === 'D_1' ||
        sId === 'D_2' ||
        sId === 'L_1'
      ) {
        league = 'AL';
      } else {
        league = 'NL';
      }

      const awayTeam = firstGame?.teams?.away?.team || { id: 0, name: 'TBD' };
      const homeTeam = firstGame?.teams?.home?.team || { id: 0, name: 'TBD' };

      let awayWins = 0;
      let homeWins = 0;
      let playedGames = 0;

      (s.games || []).forEach((g) => {
        if (g.status?.abstractGameState === 'Final') {
          playedGames++;
          const aScore = g.teams?.away?.score ?? 0;
          const hScore = g.teams?.home?.score ?? 0;
          if (aScore > hScore) {
            if (g.teams?.away?.team?.id === awayTeam.id) awayWins++;
            else homeWins++;
          } else if (hScore > aScore) {
            if (g.teams?.home?.team?.id === homeTeam.id) homeWins++;
            else awayWins++;
          }
        }
      });

      const targetWins = gType === 'W' || gType === 'L' ? 4 : gType === 'D' ? 3 : 2;
      const isOver = awayWins >= targetWins || homeWins >= targetWins;
      const winnerId = awayWins >= targetWins ? awayTeam.id : homeWins >= targetWins ? homeTeam.id : null;

      let roundName = 'Wild Card';
      if (gType === 'W') roundName = 'Мировая Серия';
      else if (gType === 'L') roundName = league === 'AL' ? 'Финал АЛ' : 'Финал НЛ';
      else if (gType === 'D') roundName = league === 'AL' ? 'Дивизион АЛ' : 'Дивизион НЛ';
      else if (gType === 'F') roundName = league === 'AL' ? 'WC АЛ' : 'WC НЛ';

      let statusText = `До ${targetWins}`;
      if (isOver) {
        statusText = `Финал (${Math.max(awayWins, homeWins)}-${Math.min(awayWins, homeWins)})`;
      } else if (playedGames > 0) {
        statusText = `Игра ${playedGames + 1}`;
      } else if (firstGame?.gameDate) {
        const d = new Date(firstGame.gameDate);
        statusText = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      }

      return {
        id: sId,
        gameType: gType,
        league,
        roundName,
        targetWins,
        seriesDescription: desc,
        awayTeam,
        homeTeam,
        awayWins,
        homeWins,
        playedGames,
        isOver,
        winnerId,
        statusText,
        games: s.games || [],
      };
    });
  }, [rawSeriesList]);

  // Specific slots extraction
  const slots = useMemo(() => {
    const alWc = parsedSeriesList.filter((s) => s.league === 'AL' && s.gameType === 'F');
    const alDs = parsedSeriesList.filter((s) => s.league === 'AL' && s.gameType === 'D');
    const alLcs = parsedSeriesList.find((s) => s.league === 'AL' && s.gameType === 'L');

    const nlWc = parsedSeriesList.filter((s) => s.league === 'NL' && s.gameType === 'F');
    const nlDs = parsedSeriesList.filter((s) => s.league === 'NL' && s.gameType === 'D');
    const nlLcs = parsedSeriesList.find((s) => s.league === 'NL' && s.gameType === 'L');

    const ws = parsedSeriesList.find((s) => s.gameType === 'W');

    return {
      alWcTop: alWc.find((s) => s.id === 'F_2') || alWc[0],
      alWcBot: alWc.find((s) => s.id === 'F_1') || alWc[1],
      alDsTop: alDs.find((s) => s.id === 'D_1') || alDs[0],
      alDsBot: alDs.find((s) => s.id === 'D_2') || alDs[1],
      alLcs,

      nlWcTop: nlWc.find((s) => s.id === 'F_4') || nlWc[0],
      nlWcBot: nlWc.find((s) => s.id === 'F_3') || nlWc[1],
      nlDsTop: nlDs.find((s) => s.id === 'D_3') || nlDs[0],
      nlDsBot: nlDs.find((s) => s.id === 'D_4') || nlDs[1],
      nlLcs,

      ws,
    };
  }, [parsedSeriesList]);

  // World Series Champion if finalized
  const championTeam = useMemo(() => {
    if (!slots.ws || !slots.ws.isOver || !slots.ws.winnerId) return null;
    if (slots.ws.awayTeam.id === slots.ws.winnerId) return slots.ws.awayTeam;
    if (slots.ws.homeTeam.id === slots.ws.winnerId) return slots.ws.homeTeam;
    return null;
  }, [slots.ws]);

  // Render a Single Match Card (Compact, High-contrast, theme-aware)
  const renderCard = (series?: ParsedSeries, accent: 'al' | 'nl' | 'ws' = 'al') => {
    if (!series) {
      return (
        <div className="w-[114px] sm:w-[126px] h-[68px] rounded-xl border border-dashed border-slate-500/30 flex items-center justify-center text-[10px] text-slate-500 font-mono">
          Ожидание
        </div>
      );
    }

    const isAwayWinner = series.isOver && series.winnerId === series.awayTeam.id;
    const isHomeWinner = series.isOver && series.winnerId === series.homeTeam.id;
    const isAwayFav = Boolean(favoriteTeamId && series.awayTeam.id === favoriteTeamId);
    const isHomeFav = Boolean(favoriteTeamId && series.homeTeam.id === favoriteTeamId);
    const isSeriesFav = isAwayFav || isHomeFav;

    const currentPick = picks[series.id];
    const isPickedAway = picksMode && currentPick === series.awayTeam.id;
    const isPickedHome = picksMode && currentPick === series.homeTeam.id;

    // Accent theme styles
    const borderGlow =
      accent === 'ws'
        ? 'border-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.2)]'
        : accent === 'al'
        ? 'border-blue-500/40 hover:border-blue-400'
        : 'border-amber-500/40 hover:border-amber-400';

    const completedGames = (series.games || []).filter(
      (g) => g.status?.abstractGameState === 'Final' || (g.teams?.away?.score != null && g.teams?.home?.score != null)
    );
    const latestGame = completedGames[completedGames.length - 1] || series.games?.[0];

    const handleCardClick = () => {
      if (latestGame) {
        onSelectGame(latestGame);
      } else {
        setSelectedSeries(series);
      }
    };

    return (
      <div
        onClick={handleCardClick}
        title={latestGame ? 'Нажмите, чтобы открыть обзор матча' : 'Нажмите, чтобы открыть матчи серии'}
        className={`bracket-card w-[114px] sm:w-[124px] md:w-[128px] h-[68px] rounded-xl transition-all duration-200 cursor-pointer relative overflow-hidden backdrop-blur-md group border flex flex-col justify-between ${
          isSeriesFav ? 'ring-2 ring-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.35)]' : ''
        } ${borderGlow}`}
      >
        {/* Top Header Eyebrow */}
        <div className="px-1.5 pt-1 pb-0.5 flex items-center justify-between border-b border-black/5 dark:border-white/10 text-[8.5px] font-mono leading-none">
          <span
            className="bracket-round-eyebrow font-black uppercase tracking-tight truncate max-w-[65px]"
            style={{
              color: accent === 'ws' ? '#d97706' : accent === 'al' ? '#2563eb' : '#d97706',
            }}
          >
            {series.roundName}
          </span>
          <span
            className={`bracket-status-badge px-1 py-0.2 rounded text-[7.5px] font-bold ${
              series.isOver
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : series.playedGames > 0
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300'
            }`}
          >
            {series.statusText}
          </span>
        </div>

        {/* Team Rows */}
        <div className="px-1.5 py-0.5 space-y-0.5 flex-1 flex flex-col justify-center">
          {/* Away Team */}
          <div
            className={`flex items-center justify-between px-1 py-0.5 rounded transition-all leading-tight ${
              isAwayWinner ? 'bracket-row-winner bg-emerald-500/15' : 'hover:bg-black/5 dark:hover:bg-white/5'
            } ${isPickedAway ? 'ring-1 ring-emerald-400 bg-emerald-500/25' : ''}`}
          >
            <div
              className="flex items-center gap-1.5 min-w-0"
              onClick={(e) => {
                if (series.awayTeam.id > 0 && series.awayTeam.id < 2000) {
                  e.stopPropagation();
                  onSelectTeam?.(series.awayTeam.id, series.awayTeam.name);
                }
              }}
              title={series.awayTeam.name}
            >
              <div className="w-3.5 h-3.5 rounded bg-black/10 dark:bg-black/40 flex items-center justify-center shrink-0">
                {series.awayTeam.id > 0 ? (
                  <img
                    src={getTeamLogoUrl(series.awayTeam.id)}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Shield className="w-2.5 h-2.5 text-slate-400" />
                )}
              </div>
              <span
                className={`bracket-team-name text-[10px] font-black truncate max-w-[62px] sm:max-w-[70px] ${
                  isAwayFav ? 'text-amber-500 font-black' : isAwayWinner ? 'text-emerald-700 dark:text-white font-black' : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {series.awayTeam.name}
              </span>
              {isAwayFav && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500 shrink-0" />}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {picksMode && !series.isOver && series.awayTeam.id > 0 && (
                <button
                  onClick={(e) => handleSetPick(series.id, series.awayTeam.id, e)}
                  className={`text-[8px] font-black px-1 py-0.2 rounded transition ${
                    isPickedAway
                      ? 'bg-emerald-500 text-white font-black'
                      : 'bg-slate-300 dark:bg-white/10 text-slate-800 dark:text-slate-300'
                  }`}
                  title="Выбрать победителя"
                >
                  {isPickedAway ? '✓' : 'В'}
                </button>
              )}
              <span
                className={`font-mono text-[11px] font-black tabular-nums ${
                  isAwayWinner ? 'bracket-team-score-winner text-emerald-600 dark:text-emerald-400' : 'bracket-team-score text-slate-800 dark:text-slate-300'
                }`}
              >
                {series.awayWins}
              </span>
            </div>
          </div>

          {/* Home Team */}
          <div
            className={`flex items-center justify-between px-1 py-0.5 rounded transition-all leading-tight ${
              isHomeWinner ? 'bracket-row-winner bg-emerald-500/15' : 'hover:bg-black/5 dark:hover:bg-white/5'
            } ${isPickedHome ? 'ring-1 ring-emerald-400 bg-emerald-500/25' : ''}`}
          >
            <div
              className="flex items-center gap-1.5 min-w-0"
              onClick={(e) => {
                if (series.homeTeam.id > 0 && series.homeTeam.id < 2000) {
                  e.stopPropagation();
                  onSelectTeam?.(series.homeTeam.id, series.homeTeam.name);
                }
              }}
              title={series.homeTeam.name}
            >
              <div className="w-3.5 h-3.5 rounded bg-black/10 dark:bg-black/40 flex items-center justify-center shrink-0">
                {series.homeTeam.id > 0 ? (
                  <img
                    src={getTeamLogoUrl(series.homeTeam.id)}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Shield className="w-2.5 h-2.5 text-slate-400" />
                )}
              </div>
              <span
                className={`bracket-team-name text-[10px] font-black truncate max-w-[62px] sm:max-w-[70px] ${
                  isHomeFav ? 'text-amber-500 font-black' : isHomeWinner ? 'text-emerald-700 dark:text-white font-black' : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {series.homeTeam.name}
              </span>
              {isHomeFav && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500 shrink-0" />}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {picksMode && !series.isOver && series.homeTeam.id > 0 && (
                <button
                  onClick={(e) => handleSetPick(series.id, series.homeTeam.id, e)}
                  className={`text-[8px] font-black px-1 py-0.2 rounded transition ${
                    isPickedHome
                      ? 'bg-emerald-500 text-white font-black'
                      : 'bg-slate-300 dark:bg-white/10 text-slate-800 dark:text-slate-300'
                  }`}
                  title="Выбрать победителя"
                >
                  {isPickedHome ? '✓' : 'В'}
                </button>
              )}
              <span
                className={`font-mono text-[11px] font-black tabular-nums ${
                  isHomeWinner ? 'bracket-team-score-winner text-emerald-600 dark:text-emerald-400' : 'bracket-team-score text-slate-800 dark:text-slate-300'
                }`}
              >
                {series.homeWins}
              </span>
            </div>
          </div>
        </div>

        {/* Series Wins Dots / Quick Game Review Buttons */}
        <div className="px-1.5 pb-0.5 flex items-center justify-between border-t border-black/5 dark:border-white/5 text-[7px] font-mono text-slate-400">
          <div className="flex items-center gap-0.5">
            {completedGames.length > 0 ? (
              completedGames.map((g, idx) => (
                <button
                  key={`${g.gamePk || 'g'}-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGame(g);
                  }}
                  className="px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 hover:bg-amber-400 hover:text-slate-950 font-black transition text-[7px]"
                  title={`Открыть обзор матча #${idx + 1}`}
                >
                  И{idx + 1}
                </button>
              ))
            ) : (
              <span className="text-[7.5px] text-slate-500">До {series.targetWins} побед</span>
            )}
          </div>
          <span className="text-[7.5px] font-bold text-amber-600 dark:text-amber-400 group-hover:underline">
            {completedGames.length > 0 ? 'Обзор →' : 'Матчи'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      
      {/* ── TOP HERO HEADER ── */}
      <div className="bracket-hero rounded-2xl p-4 sm:p-5 relative overflow-hidden border border-amber-500/30 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide uppercase bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                <Trophy className="w-3 h-3 text-amber-500" />
                {season === 2026 ? 'MLB 2026 • Postseason' : `Сезон ${season}`}
              </span>
              <span className="text-xs text-slate-500 font-mono">• 11 серий</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Путь к Мировой Серии {season}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Интерактивная турнирная сетка плей-офф MLB: от Wild Card до чемпиона Мировой Серии.
            </p>
          </div>

          {/* Controls: Season, View Mode, Pick'em */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Season Pills */}
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-slate-200/80 dark:bg-white/[0.04] border border-slate-300 dark:border-white/[0.08]">
              {[2026, 2025, 2024].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSeason(yr)}
                  className={`px-2.5 py-1 rounded-full text-xs font-black transition-all ${
                    season === yr
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-700 dark:text-slate-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* View Switcher: Tree vs List */}
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-slate-200/80 dark:bg-white/[0.04] border border-slate-300 dark:border-white/[0.08]">
              <button
                onClick={() => setViewMode('bracket')}
                className={`px-2.5 py-1 rounded-full text-xs font-black transition-all ${
                  viewMode === 'bracket'
                    ? 'bg-white dark:bg-white/20 text-slate-950 dark:text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Сетка
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-full text-xs font-black transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-white/20 text-slate-950 dark:text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Список
              </button>
            </div>

            {/* Pick'em Toggle */}
            <button
              onClick={() => setPicksMode(!picksMode)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black transition-all ${
                picksMode
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-300 hover:bg-slate-300'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>{picksMode ? 'Прогнозы: ВКЛ' : 'Прогноз'}</span>
            </button>
          </div>
        </div>

        {/* Pick'em active strip */}
        {picksMode && (
          <div className="mt-3 pt-2.5 border-t border-slate-300/40 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Bracket Pick'em активен! Нажимайте «В» на командах в сетке.</span>
              <span className="font-normal text-slate-600 dark:text-slate-400">
                (Выбрано: <b className="text-slate-900 dark:text-white">{Object.keys(picks).length}</b>)
              </span>
            </div>
            {Object.keys(picks).length > 0 && (
              <button
                onClick={handleClearPicks}
                className="flex items-center gap-1 text-slate-500 hover:text-rose-500 transition font-mono text-[11px]"
              >
                <RotateCcw className="w-3 h-3" />
                Сбросить
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-medium text-sm flex flex-col items-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span>Загрузка сетки плей-офф...</span>
        </div>
      ) : viewMode === 'bracket' ? (
        <div className="space-y-3">
          
          {/* MOBILE LEAGUE NAVIGATION TABS */}
          <div className="flex lg:hidden items-center justify-between gap-1 p-1 rounded-xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setMobileTab('all')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition text-center whitespace-nowrap text-[11px] ${
                mobileTab === 'all' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Вся сетка
            </button>
            <button
              onClick={() => setMobileTab('al')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition text-center whitespace-nowrap text-[11px] ${
                mobileTab === 'al' ? 'bg-blue-600 text-white font-black' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Американская
            </button>
            <button
              onClick={() => setMobileTab('ws')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition text-center whitespace-nowrap text-[11px] ${
                mobileTab === 'ws' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Мировая Серия
            </button>
            <button
              onClick={() => setMobileTab('nl')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition text-center whitespace-nowrap text-[11px] ${
                mobileTab === 'nl' ? 'bg-amber-600 text-white font-black' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Национальная
            </button>
          </div>

          {/* ── STADIUM TOURNAMENT BRACKET BOARD ── */}
          <div className="bracket-board rounded-2xl p-3 sm:p-5 relative overflow-hidden border border-slate-300 dark:border-white/10 shadow-xl bg-slate-100 dark:bg-[#090d16]">
            {/* Header League Badges */}
            <div className="relative z-10 flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Американская лига (AL)
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-mono text-[10px] font-black text-amber-600 dark:text-amber-300 uppercase tracking-wide">
                  COMMISSIONER'S TROPHY {season}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Национальная лига (NL)
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
              </div>
            </div>

            {/* MAIN TOURNAMENT BOARD (Fixed vertical coordinates with 100% connected lines) */}
            <div className="relative z-10 overflow-x-auto">
              {mobileTab === 'all' ? (
                /* ── FULL PANORAMIC 13-ELEMENT BOARD (FITS IN 1 SCREEN WIDTH) ── */
                <div className="w-full min-w-[880px] flex items-center justify-between h-[340px] relative">
                  
                  {/* 1. AL WILD CARD (Col 1) */}
                  <div className="w-[114px] sm:w-[124px] h-[340px] flex flex-col justify-between py-9 shrink-0 relative">
                    {renderCard(slots.alWcTop, 'al')}
                    {renderCard(slots.alWcBot, 'al')}
                  </div>

                  {/* 2. CONNECTOR: AL WC -> AL DS (Gap 1: 20px) */}
                  <div className="w-5 h-[340px] shrink-0 pointer-events-none relative">
                    <svg viewBox="0 0 20 340" className="w-full h-full overflow-visible">
                      <line x1="0" y1="70" x2="20" y2="70" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" className="bracket-connector-al" />
                      <line x1="0" y1="270" x2="20" y2="270" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" className="bracket-connector-al" />
                    </svg>
                  </div>

                  {/* 3. AL DIVISION SERIES (Col 2) */}
                  <div className="w-[114px] sm:w-[124px] h-[340px] flex flex-col justify-between py-9 shrink-0 relative">
                    {renderCard(slots.alDsTop, 'al')}
                    {renderCard(slots.alDsBot, 'al')}
                  </div>

                  {/* 4. CONNECTOR: AL DS -> ALCS (Gap 2: 24px) */}
                  <div className="w-6 h-[340px] shrink-0 pointer-events-none relative">
                    <svg viewBox="0 0 24 340" className="w-full h-full overflow-visible">
                      <path
                        d="M0,70 L12,70 L12,270 L0,270 M12,170 L24,170"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="bracket-connector-al"
                      />
                      <circle cx="12" cy="170" r="2.5" fill="#3b82f6" />
                    </svg>
                  </div>

                  {/* 5. AL CHAMPIONSHIP SERIES (Col 3) */}
                  <div className="w-[114px] sm:w-[124px] h-[340px] flex flex-col justify-center shrink-0 relative">
                    {renderCard(slots.alLcs, 'al')}
                  </div>

                  {/* 6. CONNECTOR: ALCS -> WORLD SERIES (Gap 3: 20px) */}
                  <div className="w-5 h-[340px] shrink-0 pointer-events-none relative">
                    <svg viewBox="0 0 20 340" className="w-full h-full overflow-visible">
                      <line x1="0" y1="170" x2="20" y2="170" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" className="bracket-connector-ws" />
                    </svg>
                  </div>

                  {/* 7. WORLD SERIES (GRAND CENTER STAGE: Col 4) */}
                  <div className="w-[126px] sm:w-[138px] h-[340px] flex flex-col items-center justify-center shrink-0 relative">
                    {/* Golden Trophy Podium */}
                    <div className="absolute top-9 flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 p-0.5 shadow-md flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-amber-400" />
                        </div>
                      </div>
                      <span className="font-mono font-black text-[9px] text-amber-600 dark:text-amber-300 uppercase tracking-widest mt-1">
                        МИРОВАЯ СЕРИЯ
                      </span>
                    </div>

                    {/* Grand Final Card */}
                    <div className="w-full">
                      {renderCard(slots.ws, 'ws')}
                    </div>

                    {/* Champion Badge if won */}
                    {championTeam && (
                      <div className="absolute bottom-6 w-full p-1 rounded-lg bg-amber-400/20 border border-amber-400/40 text-center shadow">
                        <div className="text-amber-600 dark:text-amber-300 font-black text-[8px] uppercase">
                          ЧЕМПИОН {season}!
                        </div>
                        <div className="text-slate-900 dark:text-white font-extrabold text-[9.5px] truncate">
                          {championTeam.name}
                        </div>
                      </div>
                    )}

                    {/* Series In Progress Badge */}
                    {!championTeam && slots.ws && !slots.ws.isOver && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[116px] sm:w-[126px] p-2 rounded-xl bg-amber-500/15 dark:bg-amber-400/10 border border-amber-500/40 text-center shadow-lg backdrop-blur-md">
                        <div className="flex items-center justify-center gap-1.5 mb-0.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                            {slots.ws.playedGames > 0 ? 'Финал идёт' : 'Старт серии'}
                          </span>
                        </div>
                        {slots.ws.playedGames > 0 && (
                          <div className="text-[11px] font-mono font-black text-slate-900 dark:text-white">
                            {slots.ws.awayWins} : {slots.ws.homeWins}
                          </div>
                        )}
                        <div className="text-[8px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                          {slots.ws.playedGames > 0
                            ? `До 4 побед • Игра ${slots.ws.playedGames + 1}`
                            : 'Серия до 4 побед'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 8. CONNECTOR: WORLD SERIES -> NLCS (Gap 4: 20px) */}
                  <div className="w-5 h-[340px] shrink-0 pointer-events-none relative">
                    <svg viewBox="0 0 20 340" className="w-full h-full overflow-visible">
                      <line x1="0" y1="170" x2="20" y2="170" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" className="bracket-connector-ws" />
                    </svg>
                  </div>

                  {/* 9. NL CHAMPIONSHIP SERIES (Col 5) */}
                  <div className="w-[114px] sm:w-[124px] h-[340px] flex flex-col justify-center shrink-0 relative">
                    {renderCard(slots.nlLcs, 'nl')}
                  </div>

                  {/* 10. CONNECTOR: NLCS -> NL DS (Gap 5: 24px) */}
                  <div className="w-6 h-[340px] shrink-0 pointer-events-none relative">
                    <svg viewBox="0 0 24 340" className="w-full h-full overflow-visible">
                      <path
                        d="M24,70 L12,70 L12,270 L24,270 M0,170 L12,170"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="bracket-connector-nl"
                      />
                      <circle cx="12" cy="170" r="2.5" fill="#f59e0b" />
                    </svg>
                  </div>

                  {/* 11. NL DIVISION SERIES (Col 6) */}
                  <div className="w-[114px] sm:w-[124px] h-[340px] flex flex-col justify-between py-9 shrink-0 relative">
                    {renderCard(slots.nlDsTop, 'nl')}
                    {renderCard(slots.nlDsBot, 'nl')}
                  </div>

                  {/* 12. CONNECTOR: NL DS -> NL WC (Gap 6: 20px) */}
                  <div className="w-5 h-[340px] shrink-0 pointer-events-none relative">
                    <svg viewBox="0 0 20 340" className="w-full h-full overflow-visible">
                      <line x1="0" y1="70" x2="20" y2="70" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" className="bracket-connector-nl" />
                      <line x1="0" y1="270" x2="20" y2="270" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" className="bracket-connector-nl" />
                    </svg>
                  </div>

                  {/* 13. NL WILD CARD (Col 7) */}
                  <div className="w-[114px] sm:w-[124px] h-[340px] flex flex-col justify-between py-9 shrink-0 relative">
                    {renderCard(slots.nlWcTop, 'nl')}
                    {renderCard(slots.nlWcBot, 'nl')}
                  </div>

                </div>
              ) : mobileTab === 'al' ? (
                /* ── MOBILE TAB: AL PROGRESSION ── */
                <div className="space-y-4 max-w-sm mx-auto py-2">
                  <div>
                    <div className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1.5">
                      Раунд 1: Wild Card АЛ
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {renderCard(slots.alWcTop, 'al')}
                      {renderCard(slots.alWcBot, 'al')}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1.5">
                      Раунд 2: Дивизионы АЛ (ALDS)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {renderCard(slots.alDsTop, 'al')}
                      {renderCard(slots.alDsBot, 'al')}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1.5">
                      Раунд 3: Финал АЛ (ALCS)
                    </div>
                    <div className="flex justify-center">
                      {renderCard(slots.alLcs, 'al')}
                    </div>
                  </div>
                </div>
              ) : mobileTab === 'nl' ? (
                /* ── MOBILE TAB: NL PROGRESSION ── */
                <div className="space-y-4 max-w-sm mx-auto py-2">
                  <div>
                    <div className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1.5">
                      Раунд 1: Wild Card НЛ
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {renderCard(slots.nlWcTop, 'nl')}
                      {renderCard(slots.nlWcBot, 'nl')}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1.5">
                      Раунд 2: Дивизионы НЛ (NLDS)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {renderCard(slots.nlDsTop, 'nl')}
                      {renderCard(slots.nlDsBot, 'nl')}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1.5">
                      Раунд 3: Финал НЛ (NLCS)
                    </div>
                    <div className="flex justify-center">
                      {renderCard(slots.nlLcs, 'nl')}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── MOBILE TAB: WORLD SERIES GRAND FINALE ── */
                <div className="max-w-xs mx-auto py-3 space-y-3 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-amber-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-mono font-black text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      МИРОВАЯ СЕРИЯ {season}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Финал года • Серия до 4 побед
                    </p>
                  </div>

                  {/* Mobile: Series in progress banner */}
                  {slots.ws && !slots.ws.isOver && (
                    <div className="w-full max-w-[220px] px-3 py-2 rounded-xl bg-amber-500/15 dark:bg-amber-400/10 border border-amber-500/40 shadow-lg backdrop-blur-md">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          {slots.ws.playedGames > 0 ? 'Серия продолжается' : 'Финалисты определены'}
                        </span>
                      </div>
                      {slots.ws.playedGames > 0 && (
                        <div className="text-sm font-mono font-black text-slate-900 dark:text-white text-center">
                          {slots.ws.awayTeam.name} {slots.ws.awayWins} : {slots.ws.homeWins} {slots.ws.homeTeam.name}
                        </div>
                      )}
                      <div className="text-[9px] font-mono text-slate-600 dark:text-slate-400 text-center mt-0.5">
                        {slots.ws.playedGames > 0
                          ? `Игра ${slots.ws.playedGames + 1} впереди`
                          : 'Ожидание первой игры'}
                      </div>
                    </div>
                  )}

                  {/* Mobile: Champion banner */}
                  {championTeam && (
                    <div className="w-full max-w-[220px] px-3 py-2 rounded-xl bg-amber-400/20 border border-amber-400/40 text-center shadow-lg">
                      <div className="text-amber-600 dark:text-amber-300 font-black text-[10px] uppercase">
                        🏆 ЧЕМПИОН {season}!
                      </div>
                      <div className="text-slate-900 dark:text-white font-extrabold text-sm truncate">
                        {championTeam.name}
                      </div>
                    </div>
                  )}

                  {renderCard(slots.ws, 'ws')}
                </div>
              )}
            </div>

            <div className="relative z-10 pt-2.5 mt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>* Нажмите на карточку серии для просмотра списка всех сыгранных матчей</span>
              <span>Плей-офф MLB {season}</span>
            </div>
          </div>
        </div>
      ) : (
        /* ── ALTERNATIVE: COMPACT LIST VIEW ── */
        <div className="space-y-3">
          {parsedSeriesList.map((series) => {
            const isAwayWinner = series.isOver && series.winnerId === series.awayTeam.id;
            const isHomeWinner = series.isOver && series.winnerId === series.homeTeam.id;
            const isAwayFav = Boolean(favoriteTeamId && series.awayTeam.id === favoriteTeamId);
            const isHomeFav = Boolean(favoriteTeamId && series.homeTeam.id === favoriteTeamId);
            const isSeriesFav = isAwayFav || isHomeFav;

            const completedGames = (series.games || []).filter(
              (g) => g.status?.abstractGameState === 'Final' || (g.teams?.away?.score != null && g.teams?.home?.score != null)
            );
            const latestGame = completedGames[completedGames.length - 1] || series.games?.[0];

            return (
              <div
                key={series.id}
                onClick={() => {
                  if (latestGame) onSelectGame(latestGame);
                  else setSelectedSeries(series);
                }}
                className={`bracket-card p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                  isSeriesFav
                    ? 'border-amber-400 shadow-md ring-1 ring-amber-400'
                    : 'border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-amber-400/15 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        {series.roundName}
                      </span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-mono font-medium">
                        {series.seriesDescription}
                      </span>
                      {series.isOver && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Завершена
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={getTeamLogoUrl(series.awayTeam.id)}
                          alt=""
                          className="w-4 h-4 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className={`bracket-team-name text-xs font-bold ${isAwayWinner ? 'text-slate-900 dark:text-white font-black' : 'text-slate-800 dark:text-slate-200 font-semibold'}`}>
                          {series.awayTeam.name}
                        </span>
                        <span className="bracket-team-score font-mono text-xs font-black text-amber-600 dark:text-amber-300 ml-1">
                          {series.awayWins}
                        </span>
                      </div>

                      <span className="text-slate-700 dark:text-slate-300 font-black">:</span>

                      <div className="flex items-center gap-1.5">
                        <span className="bracket-team-score font-mono text-xs font-black text-amber-600 dark:text-amber-300 mr-1">
                          {series.homeWins}
                        </span>
                        <span className={`bracket-team-name text-xs font-bold ${isHomeWinner ? 'text-slate-900 dark:text-white font-black' : 'text-slate-800 dark:text-slate-200 font-semibold'}`}>
                          {series.homeTeam.name}
                        </span>
                        <img
                          src={getTeamLogoUrl(series.homeTeam.id)}
                          alt=""
                          className="w-4 h-4 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 font-mono font-semibold">
                      {series.games.length} матчей
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (latestGame) onSelectGame(latestGame);
                        else setSelectedSeries(series);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-0.5 transition shadow-sm"
                    >
                      {completedGames.length > 0 ? 'Обзор матча' : 'Игры серии'} <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SERIES DETAIL DRAWER / MODAL ── */}
      {selectedSeries && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedSeries(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 shadow-2xl relative max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.2 rounded-full text-xs font-black bg-amber-400 text-slate-950 font-mono">
                    {selectedSeries.roundName}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {selectedSeries.seriesDescription}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedSeries.awayTeam.name} ({selectedSeries.awayWins}) vs {selectedSeries.homeTeam.name} ({selectedSeries.homeWins})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Серия {selectedSeries.isOver ? 'завершена' : 'продолжается'} • До {selectedSeries.targetWins} побед
                </p>
              </div>

              <button
                onClick={() => setSelectedSeries(null)}
                className="p-1.5 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-600 dark:text-slate-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Games List in this series */}
            <div className="mt-4 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                Матчи серии ({selectedSeries.games.length})
              </h4>

              {selectedSeries.games.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs font-mono">
                  Матчи еще не начались
                </div>
              ) : (
                selectedSeries.games.map((g, idx) => {
                  const aScore = g.teams?.away?.score ?? '-';
                  const hScore = g.teams?.home?.score ?? '-';
                  const dateStr = g.gameDate
                    ? new Date(g.gameDate).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  return (
                    <div
                      key={`${g.gamePk || 'modal-g'}-${idx}`}
                      onClick={() => {
                        setSelectedSeries(null);
                        onSelectGame(g);
                      }}
                      className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] hover:bg-slate-200/80 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 transition cursor-pointer flex items-center justify-between gap-2 group shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-blue-500/10 dark:bg-blue-500/20 font-mono font-black text-xs text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="text-[10px] text-slate-700 dark:text-slate-300 font-mono font-semibold">
                            {dateStr} • {g.venue?.name || 'MLB Stadium'}
                          </div>
                          <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                            {g.teams?.away?.team?.name} vs {g.teams?.home?.team?.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-mono font-black text-xs tabular-nums shadow-sm">
                          {aScore} : {hScore}
                        </div>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Action Footer */}
            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {selectedSeries.awayTeam.id > 0 && (
                  <button
                    onClick={() => {
                      setSelectedSeries(null);
                      onSelectTeam?.(selectedSeries.awayTeam.id, selectedSeries.awayTeam.name);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-xs font-bold text-slate-800 dark:text-slate-300 transition"
                  >
                    Досье {selectedSeries.awayTeam.name}
                  </button>
                )}
                {selectedSeries.homeTeam.id > 0 && (
                  <button
                    onClick={() => {
                      setSelectedSeries(null);
                      onSelectTeam?.(selectedSeries.homeTeam.id, selectedSeries.homeTeam.name);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-xs font-bold text-slate-800 dark:text-slate-300 transition"
                  >
                    Досье {selectedSeries.homeTeam.name}
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedSeries(null)}
                className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs font-bold text-slate-900 dark:text-white transition"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayoffBracketView;
