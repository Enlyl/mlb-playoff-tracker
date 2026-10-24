import React, { useState, useEffect } from 'react';
import {
  MLB_TEAMS,
  MLBGame,
  getTeamLogoUrl,
  StandingsTeamRecord,
  getStandings,
} from '../services/mlbApi';
import { notifications } from '../services/notifications';
import { sounds } from '../services/soundEffects';
import { WinsToFinalBanner } from './WinsToFinalBanner';
import {
  Star,
  Flame,
  Bell,
  Calendar,
  Trophy,
  Activity,
  ArrowRight,
  Download,
  Shield,
  Check,
  TrendingUp,
} from 'lucide-react';
import { downloadGameIcs, downloadTeamScheduleIcs } from '../utils/calendarExport';

interface MyTeamTrackerProps {
  onSelectTeam?: (teamId: number, teamName: string) => void;
  favoriteTeamId: number | null;
  setFavoriteTeamId: (id: number) => void;
  onSelectGame: (game: MLBGame) => void;
  onOpenBracket?: () => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const MyTeamTracker: React.FC<MyTeamTrackerProps> = ({
  onSelectTeam,
  favoriteTeamId,
  setFavoriteTeamId,
  onSelectGame,
  onOpenBracket,
  setNotificationsEnabled,
}) => {
  const [teamGames, setTeamGames] = useState<MLBGame[]>([]);
  const [teamRecord, setTeamRecord] = useState<StandingsTeamRecord | null>(null);
  const [downloadingIcs, setDownloadingIcs] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const handleDownloadCalendar = async () => {
    setDownloadingIcs(true);
    try {
      const ok = await downloadTeamScheduleIcs(currentTeam.id, currentTeam.name, teamGames);
      if (ok) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } finally {
      setDownloadingIcs(false);
    }
  };
  
  const currentTeam =
    MLB_TEAMS.find((t) => t.id === favoriteTeamId) ||
    MLB_TEAMS.find((t) => t.id === 119)!;

  useEffect(() => {
    let isMounted = true;
    async function loadTeamData() {
      try {
        const standings = await getStandings(2026);
        for (const div of standings) {
          const rec = div.teamRecords.find((r) => r.team.id === currentTeam.id);
          if (rec && isMounted) {
            setTeamRecord(rec);
            break;
          }
        }

        const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=2026&teamId=${currentTeam.id}&hydrate=team,linescore,probablePitcher,seriesStatus(useOverride=true)`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const allG: MLBGame[] = [];
          (data.dates || []).forEach((d: any) => {
            if (d.games) allG.push(...d.games);
          });
          if (isMounted) setTeamGames(allG);
        }
      } catch (err) {
        console.error('Failed to load team data:', err);
      }
    }

    loadTeamData();
    return () => {
      isMounted = false;
    };
  }, [currentTeam.id]);

  const recentGames = teamGames
    .filter((g) => g.status?.abstractGameState === 'Final')
    .slice(-10)
    .reverse();

  const upcomingGames = teamGames
    .filter((g) => g.status?.abstractGameState !== 'Final')
    .slice(0, 6);

  const streakCode = teamRecord?.streak?.streakCode || 'W1';
  const isHotStreak = streakCode.startsWith('W');

  const handleTestNotification = async () => {
    const granted = await notifications.requestPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      notifications.alertScoreChange(
        currentTeam.name,
        'Соперник',
        '4 - 2',
        '7-й иннинг'
      );
      sounds.playScoreChange();
    }
  };

  const primaryColor = currentTeam.color || '#3b82f6';
  const accentColor = currentTeam.accentColor || currentTeam.color || '#60a5fa';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
      
      {/* ── TEAM HEADER BANNER ── */}
      <div
        className="glass-shell glass-card"
        style={{
          padding: '1px',
          borderColor: `${primaryColor}40`,
          boxShadow: `0 0 40px ${primaryColor}20`,
        }}
      >
        <div
          className="glass-core p-5 sm:p-7 rounded-[calc(1.5rem-1px)] relative overflow-hidden"
          style={{
            background: `radial-gradient(ellipse 600px 300px at 0% 0%, ${primaryColor}25 0%, rgba(15,18,26,0.92) 80%)`,
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-2.5 flex items-center justify-center shrink-0 border"
                style={{
                  background: 'rgba(10, 13, 20, 0.8)',
                  borderColor: `${accentColor}50`,
                  boxShadow: `0 0 25px ${accentColor}25`,
                }}
              >
                <img
                  src={getTeamLogoUrl(currentTeam.id)}
                  alt={currentTeam.name}
                  className="w-full h-full object-contain filter drop-shadow-md"
                />
              </div>
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
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    Моя команда
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                    {currentTeam.division}
                  </span>
                </div>
                <h2 className="text-display text-white" style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)' }}>
                  {currentTeam.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {teamRecord
                    ? `Сезон 2026: ${teamRecord.wins} побед — ${teamRecord.losses} поражений (${teamRecord.winningPercentage} PCT)`
                    : 'MLB Сезон 2026'}
                </p>
              </div>
            </div>

            {/* Quick Switcher & Action */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={currentTeam.id}
                onChange={(e) => setFavoriteTeamId(Number(e.target.value))}
                className="bg-white/[0.04] border border-white/[0.08] text-xs font-bold text-slate-200 px-3.5 py-2 rounded-full outline-none cursor-pointer hover:border-white/[0.16] transition"
              >
                {MLB_TEAMS.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                    {t.name} ({t.division})
                  </option>
                ))}
              </select>

              {/* Club Profile & Roster Button */}
              <button
                onClick={() => onSelectTeam?.(currentTeam.id, currentTeam.name)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/15 transition-all"
                title="Открыть подробный профиль клуба, ростер, тренеров и легенд"
              >
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>Досье клуба</span>
              </button>

              {/* Download Full Team Schedule */}
              <button
                type="button"
                onClick={handleDownloadCalendar}
                disabled={downloadingIcs}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-60 cursor-pointer active:scale-95 shadow-sm ${
                  downloadSuccess
                    ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-300 dark:border-white/15'
                }`}
                title="Скачать все расписание команды в календарь (.ics)"
              >
                {downloadSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Download className={`w-3.5 h-3.5 text-blue-600 dark:text-emerald-400 ${downloadingIcs ? 'animate-bounce' : ''}`} />
                )}
                <span>
                  {downloadSuccess ? 'Скачано (.ics)' : downloadingIcs ? 'Загрузка...' : 'Календарь .ics'}
                </span>
              </button>

              <button
                onClick={handleTestNotification}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-amber-300 transition-all active:scale-95"
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Тест Push</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* BANNER: N ПОБЕД ДО ФИНАЛА */}
      <WinsToFinalBanner
        favoriteTeamId={currentTeam.id}
        onOpenBracket={onOpenBracket}
      />

      {/* ── KEY TEAM STATS (4 BENTO CARDS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Streak */}
        <div className="glass-shell glass-card h-full" style={{ padding: '1px' }}>
          <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)] h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2">
                <span>Серия матчей</span>
                <Flame className={`w-3.5 h-3.5 ${isHotStreak ? 'text-amber-400' : 'text-blue-400'}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl sm:text-3xl font-black font-mono tabular-nums ${
                    isHotStreak ? 'text-amber-400' : 'text-blue-400'
                  }`}
                >
                  {streakCode}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {isHotStreak ? 'Победная серия' : 'Серия поражений'}
                </span>
              </div>

              {/* Segmented Momentum Bar */}
              {(() => {
                const streakNum = Math.min(Math.max(parseInt(streakCode.replace(/\D/g, '') || '1', 10), 1), 6);
                const steps = [1, 2, 3, 4, 5, 6];
                return (
                  <div className="flex items-center gap-1.5 mt-2.5">
                    {steps.map((step) => {
                      const isActive = step <= streakNum;
                      return (
                        <div
                          key={step}
                          className="flex-1 h-6 rounded-md flex items-center justify-center font-mono font-black text-[10px] transition-all"
                          style={{
                            background: isActive
                              ? isHotStreak
                                ? 'rgba(245, 158, 11, 0.9)'
                                : 'rgba(59, 130, 246, 0.9)'
                              : 'rgba(255, 255, 255, 0.04)',
                            color: isActive ? (isHotStreak ? '#0f172a' : '#ffffff') : '#64748b',
                            boxShadow: isActive
                              ? isHotStreak
                                ? '0 0 8px rgba(245, 158, 11, 0.35)'
                                : '0 0 8px rgba(59, 130, 246, 0.35)'
                              : 'none',
                          }}
                          title={`Матч ${step} в серии`}
                        >
                          {step === 6 ? `${step}+` : step}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <p className="text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-white/[0.04]">
              {isHotStreak
                ? 'Высокий темп: команда на победном ходу'
                : 'Спад серии: необходимо прервать в следующей игре'}
            </p>
          </div>
        </div>

        {/* Division Rank */}
        <div className="glass-shell glass-card h-full" style={{ padding: '1px' }}>
          <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)] h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2">
                <span>Место в дивизионе</span>
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tabular-nums">
                  #{teamRecord?.divisionRank || '1'}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {teamRecord?.divisionRank === '1' ? 'Лидер дивизиона' : 'В зоне плей-офф'}
                </span>
              </div>

              {/* 5-Spot Division Rank Bar */}
              {(() => {
                const rankNum = parseInt(teamRecord?.divisionRank || '1', 10) || 1;
                const spots = [1, 2, 3, 4, 5];
                return (
                  <div className="flex items-center gap-1.5 mt-2.5">
                    {spots.map((spot) => {
                      const isCurrent = spot === rankNum;
                      const isLeader = spot === 1;
                      return (
                        <div
                          key={spot}
                          className="flex-1 h-6 rounded-md flex items-center justify-center font-mono font-black text-[10px] transition-all"
                          style={{
                            background: isCurrent
                              ? isLeader
                                ? 'rgba(16, 185, 129, 0.95)'
                                : 'rgba(59, 130, 246, 0.95)'
                              : spot < rankNum
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(255, 255, 255, 0.03)',
                            color: isCurrent
                              ? isLeader
                                ? '#022c22'
                                : '#ffffff'
                              : spot < rankNum
                              ? '#94a3b8'
                              : '#475569',
                            boxShadow: isCurrent
                              ? isLeader
                                ? '0 0 10px rgba(16, 185, 129, 0.4)'
                                : '0 0 10px rgba(59, 130, 246, 0.4)'
                              : 'none',
                          }}
                          title={`Позиция #${spot} в дивизионе`}
                        >
                          #{spot}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <p className="text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-white/[0.04]">
              Отрыв / отставание: {teamRecord?.gamesBack || '0'} GB
            </p>
          </div>
        </div>

        {/* Run Differential */}
        <div className="glass-shell glass-card h-full" style={{ padding: '1px' }}>
          <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)] h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2">
                <span>Разница ранов (DIFF)</span>
                <Activity className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl sm:text-3xl font-black font-mono tabular-nums ${
                    (teamRecord?.runDifferential || 0) > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {(teamRecord?.runDifferential || 0) > 0 ? '+' : ''}
                  {teamRecord?.runDifferential || '0'}
                </span>
                <span className="text-xs text-slate-400 font-medium">ранов</span>
              </div>

              {/* Scored vs Allowed Dual Segment Bar */}
              {(() => {
                const rs = teamRecord?.runsScored || 0;
                const ra = teamRecord?.runsAllowed || 0;
                const total = rs + ra || 1;
                const rsPct = Math.max(15, Math.min(85, Math.round((rs / total) * 100)));
                const raPct = 100 - rsPct;
                return (
                  <div className="flex items-center gap-1.5 mt-2.5 h-6">
                    <div
                      className="h-6 rounded-md flex items-center justify-center font-mono font-black text-[10px] text-emerald-950 shadow-sm transition-all"
                      style={{
                        width: `${rsPct}%`,
                        background: 'rgba(16, 185, 129, 0.95)',
                        boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)',
                      }}
                      title={`Забито: ${rs} (${rsPct}%)`}
                    >
                      +{rs} RS
                    </div>
                    <div
                      className="h-6 rounded-md flex items-center justify-center font-mono font-black text-[10px] text-red-950 shadow-sm transition-all"
                      style={{
                        width: `${raPct}%`,
                        background: 'rgba(239, 68, 68, 0.9)',
                        boxShadow: '0 0 8px rgba(239, 68, 68, 0.25)',
                      }}
                      title={`Пропущено: ${ra} (${raPct}%)`}
                    >
                      -{ra} RA
                    </div>
                  </div>
                );
              })()}
            </div>

            <p className="text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-white/[0.04]">
              Забито: {teamRecord?.runsScored ?? '-'} • Пропущено: {teamRecord?.runsAllowed ?? '-'}
            </p>
          </div>
        </div>

        {/* Form Last 10 */}
        <div className="glass-shell glass-card h-full" style={{ padding: '1px' }}>
          <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)] h-full flex flex-col justify-between">
            {(() => {
              const last10 = recentGames.slice(0, 10);
              const winsCount = last10.filter((g) => {
                const isAway = g.teams.away.team.id === currentTeam.id;
                const myScore = isAway ? g.teams.away.score || 0 : g.teams.home.score || 0;
                const oppScore = isAway ? g.teams.home.score || 0 : g.teams.away.score || 0;
                return myScore > oppScore;
              }).length;
              const lossesCount = last10.length - winsCount;

              return (
                <>
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2">
                      <span>Форма: L10</span>
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-white tabular-nums">
                        {winsCount}-{lossesCount}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">в 10 матчах</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2.5">
                      {last10.map((g, idx) => {
                        const isAway = g.teams.away.team.id === currentTeam.id;
                        const teamScore = isAway ? g.teams.away.score || 0 : g.teams.home.score || 0;
                        const oppScore = isAway ? g.teams.home.score || 0 : g.teams.away.score || 0;
                        const isWin = teamScore > oppScore;

                        return (
                          <div
                            key={idx}
                            title={`${isWin ? 'Победа' : 'Поражение'} ${teamScore}:${oppScore}`}
                            className="flex-1 h-6 rounded-md flex items-center justify-center font-mono font-black text-[10px] text-white shadow-sm transition-transform hover:scale-110"
                            style={{
                              background: isWin ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.85)',
                              boxShadow: isWin ? '0 0 8px rgba(16, 185, 129, 0.3)' : '0 0 8px rgba(239, 68, 68, 0.2)',
                            }}
                          >
                            {isWin ? 'W' : 'L'}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-white/[0.04]">
                    {winsCount >= 7
                      ? 'Отличный отрезок: высокий темп побед'
                      : winsCount <= 3
                      ? 'Спад формы: нужно улучшать игру'
                      : 'Стабильный результат на дистанции'}
                  </p>
                </>
              );
            })()}
          </div>
        </div>

      </div>

      {/* ── RECENT & UPCOMING MATCHES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Recent */}
        <div className="glass-shell glass-card" style={{ padding: '1px' }}>
          <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)] space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Последние сыгранные матчи
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Сезон 2026</span>
            </div>

            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {recentGames.map((g, idx) => {
                const isAway = g.teams.away.team.id === currentTeam.id;
                const myScore = isAway ? g.teams.away.score : g.teams.home.score;
                const oppScore = isAway ? g.teams.home.score : g.teams.away.score;
                const isWin = (myScore || 0) > (oppScore || 0);

                return (
                  <div
                    key={`${g.gamePk}-${idx}`}
                    onClick={() => onSelectGame(g)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all duration-200 cursor-pointer flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] font-mono text-white shadow-sm shrink-0"
                        style={{ background: isWin ? '#10b981' : '#ef4444' }}
                      >
                        {isWin ? 'W' : 'L'}
                      </span>
                      <div>
                        <span className="text-[10px] text-slate-700 dark:text-slate-300 font-mono font-semibold block">
                          {new Date(g.gameDate).toLocaleDateString('ru-RU')}
                        </span>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {g.teams.away.team.name} vs {g.teams.home.team.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-black text-xs px-2.5 py-0.5 rounded-md tabular-nums border ${
                        isWin
                          ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                          : 'text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/30'
                      }`}>
                        {g.teams.away.score} : {g.teams.home.score}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming */}
        <div className="glass-shell glass-card" style={{ padding: '1px' }}>
          <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)] space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Календарь ближайших матчей
              </span>
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
            </div>

            <div className="space-y-1.5">
              {upcomingGames.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">
                  Матчи текущей серии завершены. Ожидание расписания следующего раунда.
                </p>
              ) : (
                upcomingGames.map((g, idx) => (
                  <div
                    key={`${g.gamePk}-${idx}`}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all duration-200 flex items-center justify-between shadow-sm"
                  >
                    <div
                      onClick={() => onSelectGame(g)}
                      className="cursor-pointer flex-1"
                    >
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold block">
                        {new Date(g.gameDate).toLocaleDateString('ru-RU', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <div className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">
                        {g.teams.away.team.name} @ {g.teams.home.team.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadGameIcs(g);
                        }}
                        title="Скачать .ics"
                        className="card-action-btn p-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onSelectGame(g)}
                        className="text-[10px] px-2.5 py-0.5 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/25 font-mono font-bold hover:bg-blue-500/25 transition cursor-pointer"
                      >
                        {g.status?.detailedState || 'Анонс'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      

    </div>
  );
};
