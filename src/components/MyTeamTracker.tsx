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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-60 cursor-pointer active:scale-95"
                style={{
                  background: downloadSuccess ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${downloadSuccess ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'}`,
                  color: downloadSuccess ? '#6ee7b7' : '#e2e8f0',
                }}
                title="Скачать все расписание команды в календарь (.ics)"
              >
                {downloadSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Download className={`w-3.5 h-3.5 text-emerald-400 ${downloadingIcs ? 'animate-bounce' : ''}`} />
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
        <div className="glass-shell glass-card" style={{ padding: '1px' }}>
          <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)]">
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
            <p className="text-[10px] text-slate-500 mt-2">
              {isHotStreak
                ? 'Команда на победном ходу в последних играх'
                : 'Необходимо прервать серию в следующем матче'}
            </p>
          </div>
        </div>

        {/* Division Rank */}
        <div className="glass-shell glass-card" style={{ padding: '1px' }}>
          <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)]">
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
            <p className="text-[10px] text-slate-500 mt-2">
              Отрыв / отставание: {teamRecord?.gamesBack || '0'} GB
            </p>
          </div>
        </div>

        {/* Run Differential */}
        <div className="glass-shell glass-card" style={{ padding: '1px' }}>
          <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)]">
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
            <p className="text-[10px] text-slate-500 mt-2">
              Забито: {teamRecord?.runsScored ?? '-'} • Пропущено: {teamRecord?.runsAllowed ?? '-'}
            </p>
          </div>
        </div>

        {/* Form Last 10 */}
        <div className="glass-shell glass-card" style={{ padding: '1px' }}>
          <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)]">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2">
              Форма: 10 последних игр
            </div>
            <div className="flex items-center gap-1 py-1">
              {recentGames.map((g, idx) => {
                const isAway = g.teams.away.team.id === currentTeam.id;
                const teamScore = isAway ? g.teams.away.score || 0 : g.teams.home.score || 0;
                const oppScore = isAway ? g.teams.home.score || 0 : g.teams.away.score || 0;
                const isWin = teamScore > oppScore;

                return (
                  <div
                    key={idx}
                    title={`${isWin ? 'Победа' : 'Поражение'} ${teamScore}:${oppScore}`}
                    className="w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[9px] text-white"
                    style={{
                      background: isWin ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)',
                    }}
                  >
                    {isWin ? 'W' : 'L'}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              W = Победа, L = Поражение
            </p>
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
              {recentGames.map((g) => {
                const isAway = g.teams.away.team.id === currentTeam.id;
                const myScore = isAway ? g.teams.away.score : g.teams.home.score;
                const oppScore = isAway ? g.teams.home.score : g.teams.away.score;
                const isWin = (myScore || 0) > (oppScore || 0);

                return (
                  <div
                    key={g.gamePk}
                    onClick={() => onSelectGame(g)}
                    className="p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between hover:bg-white/[0.03]"
                    style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] font-mono text-white"
                        style={{ background: isWin ? '#10b981' : '#ef4444' }}
                      >
                        {isWin ? 'W' : 'L'}
                      </span>
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {new Date(g.gameDate).toLocaleDateString('ru-RU')}
                        </span>
                        <div className="font-semibold text-xs text-white">
                          {g.teams.away.team.name} vs {g.teams.home.team.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white bg-white/[0.04] px-2 py-0.5 rounded tabular-nums">
                        {g.teams.away.score} : {g.teams.home.score}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
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
                upcomingGames.map((g) => (
                  <div
                    key={g.gamePk}
                    className="p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-between hover:bg-white/[0.03]"
                    style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <div
                      onClick={() => onSelectGame(g)}
                      className="cursor-pointer flex-1"
                    >
                      <span className="text-[10px] text-amber-400 font-mono font-bold block">
                        {new Date(g.gameDate).toLocaleDateString('ru-RU', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <div className="font-semibold text-xs text-white mt-0.5">
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
                        className="p-1 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06] transition"
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => onSelectGame(g)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-300 font-mono hover:text-white"
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
