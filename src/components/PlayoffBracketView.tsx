import React, { useState, useEffect } from 'react';
import {
  Trophy,
  ExternalLink,
  ChevronRight,
  GitCommit,
  Sparkles,
  Star,
  Target,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import {
  PostseasonSeries,
  MLBGame,
  getPostseasonSeries,
  getTeamLogoUrl,
} from '../services/mlbApi';
import { InteractiveBracketTree } from './InteractiveBracketTree';

interface PlayoffBracketViewProps {
  onSelectTeam?: (teamId: number, teamName: string) => void;
  onSelectGame: (game: MLBGame) => void;
  favoriteTeamId?: number;
}

export const PlayoffBracketView: React.FC<PlayoffBracketViewProps> = ({
  onSelectTeam,
  onSelectGame,
  favoriteTeamId,
}) => {
  const [season, setSeason] = useState<number>(2026);
  const [seriesList, setSeriesList] = useState<PostseasonSeries[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'bracket' | 'list'>('bracket');
  const [picksMode, setPicksMode] = useState<boolean>(false);
  const [picks, setPicks] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('mlb_playoff_picks_2026');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  const handleSetPick = (seriesKey: string, teamId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPicks((prev) => {
      const next = { ...prev, [seriesKey]: teamId };
      localStorage.setItem('mlb_playoff_picks_2026', JSON.stringify(next));
      return next;
    });
  };

  const handleClearPicks = () => {
    setPicks({});
    localStorage.removeItem('mlb_playoff_picks_2026');
  };

  useEffect(() => {
    let isMounted = true;
    async function loadPostseason() {
      setLoading(true);
      try {
        const data = await getPostseasonSeries(season);
        if (isMounted) {
          setSeriesList(data);
        }
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

  // Group series by round
  const worldSeries = seriesList.find((s) => s.series?.gameType === 'W');
  const lcsSeries = seriesList.filter((s) => s.series?.gameType === 'L');
  const dsSeries = seriesList.filter((s) => s.series?.gameType === 'D');
  const wcSeries = seriesList.filter((s) => s.series?.gameType === 'F');

  const getSeriesStatus = (s: PostseasonSeries) => {
    if (!s.games || s.games.length === 0) return { awayWins: 0, homeWins: 0, winner: null, isScheduled: true };
    const firstGame = s.games[0];
    const awayTeam = firstGame.teams.away.team;
    const homeTeam = firstGame.teams.home.team;

    let awayWins = 0;
    let homeWins = 0;
    let hasPlayedGames = false;

    s.games.forEach((g) => {
      if (g.status?.abstractGameState === 'Final') {
        hasPlayedGames = true;
        const aScore = g.teams.away.score || 0;
        const hScore = g.teams.home.score || 0;
        if (aScore > hScore) {
          if (g.teams.away.team.id === awayTeam.id) awayWins++;
          else homeWins++;
        } else if (hScore > aScore) {
          if (g.teams.home.team.id === homeTeam.id) homeWins++;
          else awayWins++;
        }
      }
    });

    const isWsOrLcs = s.series?.gameType === 'W' || s.series?.gameType === 'L';
    const targetWins = isWsOrLcs ? 4 : s.series?.gameType === 'D' ? 3 : 2;

    const winner =
      awayWins >= targetWins ? awayTeam : homeWins >= targetWins ? homeTeam : null;

    const firstDate = firstGame.gameDate;

    return {
      awayTeam,
      homeTeam,
      awayWins,
      homeWins,
      winner,
      targetWins,
      firstDate,
      isScheduled: !hasPlayedGames,
    };
  };

  function BracketMatchupCard({
    series,
    status,
    favoriteTeamId,
    badgeColor = '#3b82f6',
  }: {
    series: PostseasonSeries;
    status: ReturnType<typeof getSeriesStatus>;
    favoriteTeamId?: number;
    badgeColor?: string;
  }) {
    const isAwayFav = Boolean(favoriteTeamId && status.awayTeam?.id === favoriteTeamId);
    const isHomeFav = Boolean(favoriteTeamId && status.homeTeam?.id === favoriteTeamId);
    const isSeriesFav = isAwayFav || isHomeFav;

    const seriesKey = series.seriesDescription || `${series.series?.gameType}_${series.series?.id}`;
    const currentPick = picks[seriesKey];
    const isOver = Boolean(status.winner);

    // Odds heuristic
    const oddsAway = Math.max(10, Math.min(90, 50 + (status.awayWins - status.homeWins) * 15));
    const oddsHome = 100 - oddsAway;

    return (
      <div
        className="p-3 rounded-xl border text-xs space-y-2 transition-all relative overflow-hidden"
        style={{
          background: isSeriesFav ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.02)',
          borderColor: isSeriesFav ? 'rgba(245, 158, 11, 0.55)' : 'rgba(255,255,255,0.06)',
          boxShadow: isSeriesFav ? '0 0 20px rgba(245, 158, 11, 0.16)' : 'none',
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold truncate text-[11px]" style={{ color: isSeriesFav ? '#fcd34d' : badgeColor }}>
            {series.seriesDescription}
          </span>
          <div className="flex items-center gap-1.5">
            {isSeriesFav && (
              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shrink-0 shadow-sm">
                <Star className="w-2 h-2 fill-current" />
                МОЯ
              </span>
            )}
            {picksMode && isOver && currentPick && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold">
                {currentPick === status.winner?.id ? (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> +1
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-0.5">
                    <XCircle className="w-2.5 h-2.5" /> 0
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Away Team Row */}
        <div
          className={`flex items-center justify-between p-1.5 rounded-lg transition-all ${
            isAwayFav
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold ring-1 ring-amber-400/20'
              : ''
          } ${picksMode && currentPick === status.awayTeam?.id ? 'ring-2 ring-emerald-400/80 bg-emerald-500/15' : ''}`}
        >
          <div
            className="flex items-center gap-1.5 truncate cursor-pointer hover:text-amber-300"
            onClick={(e) => {
              if (status.awayTeam?.id && status.awayTeam.id < 2000) {
                e.stopPropagation();
                onSelectTeam?.(status.awayTeam.id, status.awayTeam.name );
              }
            }}
            title="Открыть досье команды"
          >
            {status.awayTeam?.id && status.awayTeam.id < 2000 && (
              <img src={getTeamLogoUrl(status.awayTeam.id)} alt="" className="w-4 h-4 object-contain shrink-0" />
            )}
            <span className={`truncate ${isAwayFav ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
              {status.awayTeam?.name || 'TBD'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {picksMode && !isOver && status.awayTeam?.id && (
              <button
                onClick={(e) => handleSetPick(seriesKey, status.awayTeam.id, e)}
                className={`text-[9px] font-black px-1.5 py-0.5 rounded transition ${
                  currentPick === status.awayTeam.id
                    ? 'bg-emerald-400 text-slate-950 shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
                title="Сделать прогноз на победу в серии"
              >
                {currentPick === status.awayTeam.id ? 'ВЫБРАН' : 'ВЫБРАТЬ'}
              </button>
            )}
            <span className={`font-mono font-bold tabular-nums ${isAwayFav ? 'text-amber-300' : 'text-white'}`}>
              {status.isScheduled ? '-' : status.awayWins}
            </span>
          </div>
        </div>

        {/* Home Team Row */}
        <div
          className={`flex items-center justify-between p-1.5 rounded-lg transition-all ${
            isHomeFav
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold ring-1 ring-amber-400/20'
              : ''
          } ${picksMode && currentPick === status.homeTeam?.id ? 'ring-2 ring-emerald-400/80 bg-emerald-500/15' : ''}`}
        >
          <div
            className="flex items-center gap-1.5 truncate cursor-pointer hover:text-amber-300"
            onClick={(e) => {
              if (status.homeTeam?.id && status.homeTeam.id < 2000) {
                e.stopPropagation();
                onSelectTeam?.(status.homeTeam.id, status.homeTeam.name );
              }
            }}
            title="Открыть досье команды"
          >
            {status.homeTeam?.id && status.homeTeam.id < 2000 && (
              <img src={getTeamLogoUrl(status.homeTeam.id)} alt="" className="w-4 h-4 object-contain shrink-0" />
            )}
            <span className={`truncate ${isHomeFav ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
              {status.homeTeam?.name || 'TBD'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {picksMode && !isOver && status.homeTeam?.id && (
              <button
                onClick={(e) => handleSetPick(seriesKey, status.homeTeam.id, e)}
                className={`text-[9px] font-black px-1.5 py-0.5 rounded transition ${
                  currentPick === status.homeTeam.id
                    ? 'bg-emerald-400 text-slate-950 shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
                title="Сделать прогноз на победу в серии"
              >
                {currentPick === status.homeTeam.id ? 'ВЫБРАН' : 'ВЫБРАТЬ'}
              </button>
            )}
            <span className={`font-mono font-bold tabular-nums ${isHomeFav ? 'text-amber-300' : 'text-white'}`}>
              {status.isScheduled ? '-' : status.homeWins}
            </span>
          </div>
        </div>

        {/* Odds & Pick Status Bar */}
        {!isOver && !status.isScheduled && (
          <div className="pt-1">
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${oddsAway}%` }}
                title={`${status.awayTeam?.name}: ${oddsAway}%`}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${oddsHome}%` }}
                title={`${status.homeTeam?.name}: ${oddsHome}%`}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
              <span>{oddsAway}%</span>
              <span>{oddsHome}%</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isCurrentSeason = season === 2026;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
      
      {/* ── HERO HEADER BAR ── */}
      <div
        className="glass-shell glass-card"
        style={{
          padding: '1px',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          boxShadow: '0 0 40px rgba(245, 158, 11, 0.12)',
        }}
      >
        <div
          className="glass-core p-5 sm:p-7 rounded-[calc(1.5rem-1px)] relative overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse 600px 300px at 0% 0%, rgba(245, 158, 11, 0.12) 0%, rgba(15,18,26,0.92) 80%)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="eyebrow"
                  style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#fcd34d',
                  }}
                >
                  <Trophy className="w-3 h-3 text-amber-400" />
                  {isCurrentSeason ? 'MLB 2026 • Postseason' : `Сезон ${season}`}
                </span>
              </div>
              <h2
                className="text-display text-white"
                style={{ fontSize: 'clamp(1.2rem, 3.5vw, 1.8rem)' }}
              >
                Путь к Мировой Серии {season}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {isCurrentSeason
                  ? 'Сетка плей-офф сезона 2026. Раунд Wild Card стартует 29 сентября, а финал Мировой Серии начнется 23 октября.'
                  : `Результаты и путь победителя Мировой Серии ${season} года.`}
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Season Buttons */}
              <div
                className="flex items-center gap-1 p-1 rounded-full"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                {[
                  { yr: 2026, label: '2026' },
                  { yr: 2025, label: '2025' },
                  { yr: 2024, label: '2024' },
                ].map(({ yr, label }) => (
                  <button
                    key={yr}
                    onClick={() => setSeason(yr)}
                    className="px-3 py-1 rounded-full text-[11px] font-bold transition-all"
                    style={{
                      background: season === yr ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      border: season === yr ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                      color: season === yr ? '#fcd34d' : 'rgba(148, 163, 184, 0.8)',
                      boxShadow: season === yr ? '0 0 16px rgba(245, 158, 11, 0.2)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* View Switcher */}
              <div
                className="flex items-center gap-1 p-1 rounded-full"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <button
                  onClick={() => setViewMode('bracket')}
                  className="px-3 py-1 rounded-full text-[11px] font-bold transition-all"
                  style={{
                    background: viewMode === 'bracket' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    border: viewMode === 'bracket' ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid transparent',
                    color: viewMode === 'bracket' ? '#fff' : 'rgba(148, 163, 184, 0.7)',
                  }}
                >
                  Дерево
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className="px-3 py-1 rounded-full text-[11px] font-bold transition-all"
                  style={{
                    background: viewMode === 'list' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    border: viewMode === 'list' ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid transparent',
                    color: viewMode === 'list' ? '#fff' : 'rgba(148, 163, 184, 0.7)',
                  }}
                >
                  Список
                </button>
              </div>

              {/* Pick'em Mode Button */}
              <button
                onClick={() => setPicksMode(!picksMode)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all"
                style={{
                  background: picksMode ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${picksMode ? 'rgba(16, 185, 129, 0.45)' : 'rgba(255, 255, 255, 0.08)'}`,
                  color: picksMode ? '#34d399' : 'rgba(148, 163, 184, 0.8)',
                  boxShadow: picksMode ? '0 0 16px rgba(16, 185, 129, 0.2)' : 'none',
                }}
              >
                <Target className="w-3.5 h-3.5" />
                <span>{picksMode ? 'Прогнозы: ВКЛ' : 'Прогнозы (Pick\'em)'}</span>
              </button>
            </div>
          </div>

          {/* Pick'em Stats Strip */}
          {picksMode && (
            <div className="mt-4 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-400" />
                  Интерактивный Bracket Pick'em
                </span>
                <span className="text-slate-400">
                  Выбрано прогнозов: <b className="text-emerald-400">{Object.keys(picks).length}</b>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400">
                  Нажимайте «ВЫБРАТЬ» на командах в сетке
                </span>
                {Object.keys(picks).length > 0 && (
                  <button
                    onClick={handleClearPicks}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-400 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Сбросить прогнозы</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-medium text-sm">
          Загрузка турнирной сетки MLB...
        </div>
      ) : (
        <>
          {/* TOURNAMENT BRACKET TREE VIEW */}
          {viewMode === 'bracket' && (
            <div className="space-y-6">
              {/* Animated Interactive Playoff Bracket Tree */}
              <InteractiveBracketTree
                seriesList={seriesList}
                favoriteTeamId={favoriteTeamId}
                onSelectTeam={onSelectTeam}
                onSelectGame={onSelectGame}
                picksMode={picksMode}
                picks={picks}
                onSetPick={handleSetPick}
              />
              
              {/* World Series Centerpiece Card */}
              {worldSeries && (() => {
                const { awayTeam, homeTeam, awayWins, homeWins, winner, firstDate, isScheduled } =
                  getSeriesStatus(worldSeries);
                return (
                  <div
                    className="glass-shell glass-card"
                    style={{
                      padding: '1px',
                      borderColor: 'rgba(245, 158, 11, 0.45)',
                      boxShadow: '0 0 50px rgba(245, 158, 11, 0.18)',
                    }}
                  >
                    <div
                      className="glass-core p-6 sm:p-8 rounded-[calc(1.5rem-1px)] relative overflow-hidden"
                      style={{
                        background: 'radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.15) 0%, rgba(15,18,26,0.95) 75%)',
                      }}
                    >
                      <div className="text-center mb-6">
                        <span
                          className="eyebrow mb-2"
                          style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            color: '#fcd34d',
                          }}
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          {isScheduled
                            ? `Мировая Серия ${season} • Старт: ${new Date(firstDate || '').toLocaleDateString('ru-RU')}`
                            : `Победитель ${season}: ${winner?.name || 'В процессе'}`}
                        </span>
                        <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight mt-1">
                          ФИНАЛ: World Series {season}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Главный трофей бейсбола: Commissioner’s Trophy (Серия до 4 побед)
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center max-w-3xl mx-auto">
                        {/* Away / AL Champ */}
                        {(() => {
                          const isAwayFav = Boolean(favoriteTeamId && awayTeam?.id === favoriteTeamId);
                          return (
                            <div
                              className="sm:col-span-5 flex flex-col items-center p-5 rounded-2xl border transition-all duration-300"
                              style={{
                                background: isAwayFav
                                  ? 'rgba(245, 158, 11, 0.16)'
                                  : winner?.id === awayTeam?.id
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : 'rgba(255,255,255,0.02)',
                                borderColor: isAwayFav
                                  ? 'rgba(245, 158, 11, 0.7)'
                                  : winner?.id === awayTeam?.id
                                  ? 'rgba(245, 158, 11, 0.4)'
                                  : 'rgba(255,255,255,0.06)',
                                boxShadow: isAwayFav ? '0 0 30px rgba(245, 158, 11, 0.3)' : undefined,
                              }}
                            >
                              {awayTeam?.id && awayTeam.id < 2000 ? (
                                <div className={`relative ${isAwayFav ? 'ring-4 ring-amber-400 rounded-full p-1 shadow-[0_0_20px_rgba(245,158,11,0.6)]' : ''}`}>
                                  <img
                                    src={getTeamLogoUrl(awayTeam.id)}
                                    alt=""
                                    className="w-16 h-16 object-contain filter drop-shadow-lg mb-2"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-bold text-xs text-slate-400 text-center p-2 mb-2">
                                  Чемпион AL
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 justify-center mt-1">
                                <h4 className={`font-bold text-sm text-center ${isAwayFav ? 'text-amber-300' : 'text-white'}`}>
                                  {awayTeam?.name || 'Победитель AL'}
                                </h4>
                                {isAwayFav && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-current" />
                                    МОЯ
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                {isScheduled ? 'Определится в ALCS' : 'Чемпион Лиги'}
                              </div>
                              <div className="text-2xl font-black font-mono text-white mt-2 tabular-nums">
                                {isScheduled ? '-' : awayWins}{' '}
                                <span className="text-[10px] text-slate-500 font-sans font-normal">побед</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* VS Center */}
                        <div className="sm:col-span-2 text-center flex flex-col items-center">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs mb-1"
                            style={{
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: '#000',
                              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
                            }}
                          >
                            VS
                          </div>
                          <span className="font-mono text-base font-bold text-amber-400">
                            {isScheduled ? 'Best of 7' : `${awayWins} - ${homeWins}`}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            {isScheduled ? '23 - 31 октября' : winner ? 'Серия окончена' : 'В процессе'}
                          </span>
                        </div>

                        {/* Home / NL Champ */}
                        {(() => {
                          const isHomeFav = Boolean(favoriteTeamId && homeTeam?.id === favoriteTeamId);
                          return (
                            <div
                              className="sm:col-span-5 flex flex-col items-center p-5 rounded-2xl border transition-all duration-300"
                              style={{
                                background: isHomeFav
                                  ? 'rgba(245, 158, 11, 0.16)'
                                  : winner?.id === homeTeam?.id
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : 'rgba(255,255,255,0.02)',
                                borderColor: isHomeFav
                                  ? 'rgba(245, 158, 11, 0.7)'
                                  : winner?.id === homeTeam?.id
                                  ? 'rgba(245, 158, 11, 0.4)'
                                  : 'rgba(255,255,255,0.06)',
                                boxShadow: isHomeFav ? '0 0 30px rgba(245, 158, 11, 0.3)' : undefined,
                              }}
                            >
                              {homeTeam?.id && homeTeam.id < 2000 ? (
                                <div className={`relative ${isHomeFav ? 'ring-4 ring-amber-400 rounded-full p-1 shadow-[0_0_20px_rgba(245,158,11,0.6)]' : ''}`}>
                                  <img
                                    src={getTeamLogoUrl(homeTeam.id)}
                                    alt=""
                                    className="w-16 h-16 object-contain filter drop-shadow-lg mb-2"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-bold text-xs text-slate-400 text-center p-2 mb-2">
                                  Чемпион NL
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 justify-center mt-1">
                                <h4 className={`font-bold text-sm text-center ${isHomeFav ? 'text-amber-300' : 'text-white'}`}>
                                  {homeTeam?.name || 'Победитель NL'}
                                </h4>
                                {isHomeFav && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-current" />
                                    МОЯ
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                {isScheduled ? 'Определится в NLCS' : 'Чемпион Лиги'}
                              </div>
                              <div className="text-2xl font-black font-mono text-white mt-2 tabular-nums">
                                {isScheduled ? '-' : homeWins}{' '}
                                <span className="text-[10px] text-slate-500 font-sans font-normal">побед</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Games list for World Series */}
                      {worldSeries.games && worldSeries.games.length > 0 && (
                        <div className="mt-6 pt-5 border-t border-white/[0.06]">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                            Матчи финальной серии (нажмите для перехода в Live-центр)
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                            {worldSeries.games.map((g, idx) => (
                              <div
                                key={g.gamePk}
                                onClick={() => onSelectGame(g)}
                                className="glass-shell glass-card cursor-pointer"
                                style={{ padding: '1px' }}
                              >
                                <div className="glass-core p-2.5 rounded-[calc(1.5rem-1px)]">
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1.5">
                                    <span>Игра {idx + 1}</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                                  </div>
                                  <div className="space-y-0.5 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-slate-300 truncate">
                                        {g.teams.away.team.teamName || g.teams.away.team.name}
                                      </span>
                                      <span className="font-mono font-bold text-white tabular-nums">
                                        {g.teams.away.score ?? '-'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-slate-300 truncate">
                                        {g.teams.home.team.teamName || g.teams.home.team.name}
                                      </span>
                                      <span className="font-mono font-bold text-white tabular-nums">
                                        {g.teams.home.score ?? '-'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* AL & NL LEAGUE COLUMNS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* American League (AL) */}
                <div className="glass-shell glass-card" style={{ padding: '1px', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                  <div className="glass-core p-5 rounded-[calc(1.5rem-1px)] space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        <h4 className="font-bold text-white text-sm">
                          Американская Лига (American League)
                        </h4>
                      </div>
                      <span className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-widest">
                        AL Pennant
                      </span>
                    </div>

                    {/* ALCS */}
                    <div
                      className="p-3.5 rounded-xl border"
                      style={{ background: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.25)' }}
                    >
                      <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider block">
                        Финал Американской Лиги (ALCS • Best of 7)
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Победители Дивизионов AL борются за выход в Мировую Серию
                      </p>
                    </div>

                    {/* ALDS */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Серии Дивизионов (ALDS • Best of 5)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {dsSeries
                          .filter((s) => s.seriesDescription.includes('AL'))
                          .map((s, idx) => (
                            <BracketMatchupCard
                              key={idx}
                              series={s}
                              status={getSeriesStatus(s)}
                              favoriteTeamId={favoriteTeamId}
                              badgeColor="#93c5fd"
                            />
                          ))}
                      </div>
                    </div>

                    {/* AL Wild Card */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Wild Card AL (Best of 3)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {wcSeries
                          .filter((s) => s.seriesDescription.includes('AL'))
                          .map((s, idx) => (
                            <BracketMatchupCard
                              key={idx}
                              series={s}
                              status={getSeriesStatus(s)}
                              favoriteTeamId={favoriteTeamId}
                              badgeColor="#60a5fa"
                            />
                          ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* National League (NL) */}
                <div className="glass-shell glass-card" style={{ padding: '1px', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <div className="glass-core p-5 rounded-[calc(1.5rem-1px)] space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        <h4 className="font-bold text-white text-sm">
                          Национальная Лига (National League)
                        </h4>
                      </div>
                      <span className="text-[10px] text-red-400 font-mono font-bold uppercase tracking-widest">
                        NL Pennant
                      </span>
                    </div>

                    {/* NLCS */}
                    <div
                      className="p-3.5 rounded-xl border"
                      style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.25)' }}
                    >
                      <span className="text-[10px] text-red-300 font-bold uppercase tracking-wider block">
                        Финал Национальной Лиги (NLCS • Best of 7)
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Победители Дивизионов NL борются за выход в Мировую Серию
                      </p>
                    </div>

                    {/* NLDS */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Серии Дивизионов (NLDS • Best of 5)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {dsSeries
                          .filter((s) => s.seriesDescription.includes('NL'))
                          .map((s, idx) => (
                            <BracketMatchupCard
                              key={idx}
                              series={s}
                              status={getSeriesStatus(s)}
                              favoriteTeamId={favoriteTeamId}
                              badgeColor="#fca5a5"
                            />
                          ))}
                      </div>
                    </div>

                    {/* NL Wild Card */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Wild Card NL (Best of 3)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {wcSeries
                          .filter((s) => s.seriesDescription.includes('NL'))
                          .map((s, idx) => (
                            <BracketMatchupCard
                              key={idx}
                              series={s}
                              status={getSeriesStatus(s)}
                              favoriteTeamId={favoriteTeamId}
                              badgeColor="#f87171"
                            />
                          ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {seriesList.map((s, idx) => {
                const status = getSeriesStatus(s);
                const isAwayFav = Boolean(favoriteTeamId && status.awayTeam?.id === favoriteTeamId);
                const isHomeFav = Boolean(favoriteTeamId && status.homeTeam?.id === favoriteTeamId);
                const isSeriesFav = isAwayFav || isHomeFav;

                return (
                  <div
                    key={idx}
                    className="glass-shell glass-card"
                    style={{
                      padding: '1px',
                      borderColor: isSeriesFav ? 'rgba(245, 158, 11, 0.55)' : undefined,
                      boxShadow: isSeriesFav ? '0 0 25px rgba(245, 158, 11, 0.18)' : undefined,
                    }}
                  >
                    <div
                      className="glass-core p-4 rounded-[calc(1.5rem-1px)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      style={{
                        background: isSeriesFav ? 'rgba(245, 158, 11, 0.05)' : undefined,
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="eyebrow"
                            style={{
                              background: isSeriesFav ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                              color: isSeriesFav ? '#fcd34d' : '#94a3b8',
                            }}
                          >
                            {s.series?.gameType === 'W' ? 'Мировая Серия' : s.series?.gameType === 'L' ? 'Финал Лиги' : s.series?.gameType === 'D' ? 'Серия Дивизиона' : 'Wild Card'}
                          </span>
                          <span className={`text-xs font-bold ${isSeriesFav ? 'text-amber-300' : 'text-white'}`}>
                            {s.seriesDescription}
                          </span>
                          {isSeriesFav && (
                            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shadow-sm">
                              <Star className="w-2 h-2 fill-current" />
                              МОЯ КОМАНДА
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs mt-1">
                          <span className={`flex items-center gap-1 ${isAwayFav ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                            {status.awayTeam?.name || 'TBD'}
                            {isAwayFav && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 inline" />}
                          </span>
                          <span className="font-mono font-bold text-amber-400">{status.isScheduled ? 'vs' : `${status.awayWins} - ${status.homeWins}`}</span>
                          <span className={`flex items-center gap-1 ${isHomeFav ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                            {status.homeTeam?.name || 'TBD'}
                            {isHomeFav && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 inline" />}
                          </span>
                        </div>
                      </div>
                      {status.winner && (
                        <div className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 w-max">
                          Победитель: {status.winner.name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </>
      )}

      

    </div>
  );
};
