import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Download,
  ExternalLink,
  Users,
  Trophy,
  Award,
  Calendar,
  Sparkles,
  Palette,
  BookOpen,
  ChevronRight,
  TrendingUp,
  MapPin,
  Clock,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import {
  MLBGame,
  RosterPlayerItem,
  TeamCoachItem,
  TeamSeasonStatsSummary,
  StandingsTeamRecord,
  VenueDetails,
  TeamTransactionItem,
  getTeamTransactions,
  getTeamLogoUrl,
  getTeamRoster,
  getTeamCoaches,
  getTeamLeaders,
  getTeamSeasonStats,
  getTeamSeasonSchedule,
  getTeamWikiExtract,
  getStandings,
  searchPlayers,
  ROOF_TYPES_RU,
  TURF_TYPES_RU,
} from '../services/mlbApi';
import {
  TEAM_COLORS_MAP,
  TEAM_RU,
  TEAM_WIKI_RU,
  TEAM_PALETTE,
  TEAM_LEGENDS,
  TEAM_FANS,
  COACH_RU,
  LEADER_CATEGORIES,
} from '../services/teamData';
import { downloadTeamScheduleIcs } from '../utils/calendarExport';
import { formatKyivGameTime, getCountdownText } from '../utils/dateUtils';

interface TeamProfileModalProps {
  teamId: number;
  teamName?: string;
  onClose: () => void;
  onSelectPlayer?: (playerId: number, playerName?: string) => void;
  onSelectGame?: (game: MLBGame) => void;
  onSelectTeam?: (teamId: number, teamName: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (teamId: number, teamName: string) => void;
}

type TabType = 'season' | 'leaders' | 'roster' | 'coaches' | 'legends' | 'games' | 'stadium' | 'trans' | 'about';

export const TeamProfileModal: React.FC<TeamProfileModalProps> = ({
  teamId,
  teamName = 'Team',
  onClose,
  onSelectPlayer,
  onSelectGame,
  onSelectTeam,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('season');
  const [leadersSeason, setLeadersSeason] = useState<number>(2026);
  const [gamesSeason, setGamesSeason] = useState<number>(2026);

  // Loaded states
  const [roster, setRoster] = useState<RosterPlayerItem[]>([]);
  const [coaches, setCoaches] = useState<TeamCoachItem[]>([]);
  const [leaders, setLeaders] = useState<Record<string, any[]>>({});
  const [seasonStats, setSeasonStats] = useState<TeamSeasonStatsSummary>({});
  const [schedule, setSchedule] = useState<MLBGame[]>([]);
  const [wikiInfo, setWikiInfo] = useState<{ extract: string; url?: string } | null>(null);
  const [standingsRecord, setStandingsRecord] = useState<StandingsTeamRecord | null>(null);
  const [divisionName, setDivisionName] = useState<string>('');
  const [venueDetails, setVenueDetails] = useState<VenueDetails | null>(null);
  const [transactions, setTransactions] = useState<TeamTransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const teamColor = TEAM_COLORS_MAP[teamId] || '#3b82f6';
  const russianName = TEAM_RU[teamId] || teamName;
  const palette = TEAM_PALETTE[teamId] || [];
  const legends = TEAM_LEGENDS[teamId] || [];
  const fans = TEAM_FANS[teamId] || [];
  const wikiTitle = TEAM_WIKI_RU[teamId] || russianName;

  // Load team details
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [
          rosterData,
          coachesData,
          statsData,
          leadersData,
          schedData,
          wikiData,
          standingsData,
          transData,
          teamVenueRes,
        ] = await Promise.all([
          getTeamRoster(teamId),
          getTeamCoaches(teamId),
          getTeamSeasonStats(teamId, 2026),
          getTeamLeaders(teamId, leadersSeason),
          getTeamSeasonSchedule(teamId, gamesSeason),
          getTeamWikiExtract(wikiTitle),
          getStandings(2026),
          getTeamTransactions(teamId, 25),
          fetch(`https://statsapi.mlb.com/api/v1/teams/${teamId}?hydrate=venue(location,fieldInfo)`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

        if (isMounted) {
          setRoster(rosterData);
          setCoaches(coachesData);
          setSeasonStats(statsData);
          setLeaders(leadersData);
          setSchedule(schedData);
          setWikiInfo(wikiData);
          setTransactions(transData);

          if (teamVenueRes?.teams?.[0]?.venue) {
            setVenueDetails(teamVenueRes.teams[0].venue);
          }

          if (Array.isArray(standingsData)) {
            for (const div of standingsData) {
              const match = div.teamRecords.find((tr) => tr.team.id === teamId);
              if (match) {
                setStandingsRecord(match);
                setDivisionName(div.name);
                break;
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading team profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [teamId]);

  // Reload leaders if season changed
  useEffect(() => {
    let isMounted = true;
    getTeamLeaders(teamId, leadersSeason).then((data) => {
      if (isMounted) setLeaders(data);
    });
    return () => {
      isMounted = false;
    };
  }, [teamId, leadersSeason]);

  // Reload games if games season changed
  useEffect(() => {
    let isMounted = true;
    getTeamSeasonSchedule(teamId, gamesSeason).then((data) => {
      if (isMounted) setSchedule(data);
    });
    return () => {
      isMounted = false;
    };
  }, [teamId, gamesSeason]);

  const handleLegendClick = async (legendName: string) => {
    try {
      const searchRes = await searchPlayers(legendName);
      if (searchRes && searchRes.length > 0 && onSelectPlayer) {
        onSelectPlayer(searchRes[0].id, searchRes[0].fullName);
        return;
      }
    } catch {
      // fallback
    }
    window.open(`https://www.mlb.com/search?q=${encodeURIComponent(legendName)}`, '_blank', 'noopener');
  };

  // Group roster by position category
  const groupedRoster: Record<string, RosterPlayerItem[]> = {
    'Питчеры (Pitchers)': [],
    'Кэтчеры (Catchers)': [],
    'Инфилдеры (Infielders)': [],
    'Аутфилдеры (Outfielders)': [],
    'Назначенные бьющие (DH)': [],
  };

  roster.forEach((player) => {
    const posType = player.position?.type;
    const posCode = player.position?.abbreviation;
    if (posType === 'Pitcher' || posCode === 'P') groupedRoster['Питчеры (Pitchers)'].push(player);
    else if (posType === 'Catcher' || posCode === 'C') groupedRoster['Кэтчеры (Catchers)'].push(player);
    else if (posType === 'Infielder' || ['1B', '2B', '3B', 'SS'].includes(posCode)) groupedRoster['Инфилдеры (Infielders)'].push(player);
    else if (posType === 'Outfielder' || ['LF', 'CF', 'RF', 'OF'].includes(posCode)) groupedRoster['Аутфилдеры (Outfielders)'].push(player);
    else groupedRoster['Назначенные бьющие (DH)'].push(player);
  });

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div
        className="glass-shell w-full max-w-4xl my-auto shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
        style={{ padding: '1px' }}
      >
        <div className="glass-core rounded-[calc(1.5rem-1px)] overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header Bar */}
          <div
            className="p-5 sm:p-6 border-b border-white/[0.08] relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${teamColor}22 0%, rgba(15,23,42,0.6) 100%)`,
              borderLeft: `5px solid ${teamColor}`,
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center p-2 shadow-xl"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <img
                    src={getTeamLogoUrl(teamId)}
                    alt={teamName}
                    className="w-full h-full object-contain filter drop-shadow-md"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full"
                      style={{ background: `${teamColor}33`, color: '#fff', border: `1px solid ${teamColor}66` }}
                    >
                      MLB Club
                    </span>
                    {divisionName && (
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/15">
                        {divisionName} {standingsRecord?.divisionRank ? `• #${standingsRecord.divisionRank}` : ''}
                      </span>
                    )}
                    {standingsRecord && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {standingsRecord.wins}W - {standingsRecord.losses}L ({standingsRecord.winningPercentage})
                      </span>
                    )}
                    {isFavorite && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        Моя команда
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-white mt-1">{teamName}</h1>
                  <p className="text-xs text-slate-300 font-medium">{russianName}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {onToggleFavorite && (
                  <button
                    onClick={() => onToggleFavorite(teamId, teamName)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
                    style={{
                      background: isFavorite ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${isFavorite ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.15)'}`,
                      color: isFavorite ? '#fcd34d' : '#e2e8f0',
                    }}
                    title="Следить за командой"
                  >
                    <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                    <span>{isFavorite ? 'В избранном' : 'Следить'}</span>
                  </button>
                )}

                <button
                  onClick={() => downloadTeamScheduleIcs(teamId, teamName, schedule)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition shadow-sm"
                  title="Скачать расписание в календарь (.ics)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Календарь</span>
                </button>

                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
                  title="Вернуться назад (Esc)"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Назад</span>
                </button>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition border border-white/10 cursor-pointer"
                  title="Закрыть (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 mt-5 overflow-x-auto no-scrollbar border-t border-white/[0.08] pt-3">
              {[
                { id: 'season', label: 'Сезон 2026', icon: Trophy },
                { id: 'leaders', label: 'Лидеры', icon: Award },
                { id: 'roster', label: `Ростер (${roster.length})`, icon: Users },
                { id: 'coaches', label: `Тренеры (${coaches.length})`, icon: Shield },
                { id: 'stadium', label: 'Стадион', icon: MapPin },
                { id: 'trans', label: `Переходы (${transactions.length})`, icon: TrendingUp },
                { id: 'legends', label: `Легенды & Селебрити (${legends.length + fans.length})`, icon: Sparkles },
                { id: 'games', label: 'Матчи', icon: Calendar },
                { id: 'about', label: 'О клубе', icon: BookOpen },
              ].map((tab) => {
                const Icon = tab.icon;
                const isCurrent = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0"
                    style={{
                      background: isCurrent ? `${teamColor}33` : 'transparent',
                      border: `1px solid ${isCurrent ? `${teamColor}66` : 'transparent'}`,
                      color: isCurrent ? '#fff' : '#94a3b8',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>Загрузка профиля команды...</span>
              </div>
            ) : (
              <>
                {/* ── TAB 1: SEASON STATS ── */}
                {activeTab === 'season' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Standings Overview Card */}
                    <div className="bg-slate-900/60 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-black uppercase tracking-wider text-white">
                            Положение в дивизионе: {divisionName || 'MLB'}
                          </span>
                        </div>
                        {standingsRecord?.streak?.streakCode && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Серия: {standingsRecord.streak.streakCode}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Место</span>
                          <span className="text-lg font-black text-amber-300">
                            {standingsRecord?.divisionRank ? `#${standingsRecord.divisionRank}` : '—'}
                          </span>
                          <span className="text-[10px] text-slate-500 block">в дивизионе</span>
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Баланс (W - L)</span>
                          <span className="text-lg font-black text-emerald-400">
                            {standingsRecord ? `${standingsRecord.wins} - ${standingsRecord.losses}` : '—'}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            PCT: {standingsRecord?.winningPercentage || '—'}
                          </span>
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Отставание (GB)</span>
                          <span className="text-lg font-black text-slate-200">
                            {standingsRecord?.gamesBack || '0.0'}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            WC GB: {standingsRecord?.wildCardGamesBack || '—'}
                          </span>
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Разница ранов</span>
                          <span
                            className={`text-lg font-black ${
                              (standingsRecord?.runDifferential ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {standingsRecord?.runDifferential != null
                              ? (standingsRecord.runDifferential > 0
                                  ? `+${standingsRecord.runDifferential}`
                                  : standingsRecord.runDifferential)
                              : '—'}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            RS: {standingsRecord?.runsScored ?? '—'} / RA: {standingsRecord?.runsAllowed ?? '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Upcoming Matchups Section (С кем предстоит играть) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black tracking-wider uppercase text-slate-400 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>С кем предстоит играть (Ближайшие матчи)</span>
                        </h3>
                        <span className="text-[10px] text-slate-500 font-mono">MLB Schedule</span>
                      </div>

                      {(() => {
                        const upcoming = schedule.filter((g) => g.status?.abstractGameState !== 'Final').slice(0, 3);
                        if (upcoming.length === 0) {
                          return (
                            <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl text-center text-xs text-slate-400">
                              Матчи на ближайшие дни не запланированы или регулярный чемпионат завершён.
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {upcoming.map((g) => {
                              const isHome = g.teams.home.team.id === teamId;
                              const oppTeam = isHome ? g.teams.away.team : g.teams.home.team;
                              const countdown = getCountdownText(g.gameDate);
                              const kyivTime = formatKyivGameTime(g.gameDate);

                              return (
                                <div
                                  key={g.gamePk}
                                  onClick={() => onSelectGame && onSelectGame(g)}
                                  className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl transition cursor-pointer flex flex-col justify-between group shadow-sm"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-2.5">
                                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                                        {isHome ? 'Дома (vs)' : 'В гостях (@)'}
                                      </span>
                                      {countdown && (
                                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                          {countdown}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2.5 my-2">
                                      <div
                                        onClick={(e) => {
                                          if (onSelectTeam) {
                                            e.stopPropagation();
                                            onSelectTeam(oppTeam.id, oppTeam.name);
                                          }
                                        }}
                                        className="w-8 h-8 rounded-xl bg-slate-950 p-1 flex items-center justify-center border border-white/10 shrink-0 hover:border-amber-400 transition"
                                        title={`Перейти к профилю ${oppTeam.name}`}
                                      >
                                        <img
                                          src={getTeamLogoUrl(oppTeam.id)}
                                          alt=""
                                          className="w-full h-full object-contain"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      </div>
                                      <div className="truncate">
                                        <span className="text-xs font-bold text-white block truncate group-hover:text-amber-300 transition">
                                          {oppTeam.name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 block truncate">
                                          {TEAM_RU[oppTeam.id] || oppTeam.name}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                                    <span className="font-mono text-slate-300">{kyivTime}</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Team Hitting & Pitching Season Stats */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black tracking-wider uppercase text-slate-400">
                        Командные показатели сезона 2026
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Баттинг AVG</span>
                          <span className="text-xl font-black text-amber-400">{seasonStats.hitting?.avg || '.---'}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Процент хитов</span>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">OPS</span>
                          <span className="text-xl font-black text-emerald-400">{seasonStats.hitting?.ops || '.---'}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">OBP + SLG</span>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Хоум-раны (HR)</span>
                          <span className="text-xl font-black text-white">{seasonStats.hitting?.homeRuns ?? '—'}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">За весь сезон</span>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Украденные базы</span>
                          <span className="text-xl font-black text-cyan-400">{seasonStats.hitting?.stolenBases ?? '—'}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Stolen bases</span>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Питчинг ERA</span>
                          <span className="text-xl font-black text-rose-400">{seasonStats.pitching?.era || '-.--'}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Пропускаемость</span>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">WHIP</span>
                          <span className="text-xl font-black text-purple-400">{seasonStats.pitching?.whip || '-.--'}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Баз за иннинг</span>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Страйкауты (SO)</span>
                          <span className="text-xl font-black text-blue-400">{seasonStats.pitching?.strikeOuts ?? '—'}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Броски питчеров</span>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Сейвы (SV)</span>
                          <span className="text-xl font-black text-amber-300">{seasonStats.pitching?.saves ?? '—'}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Концовки клоузеров</span>
                        </div>
                      </div>
                    </div>

                    {/* Season Splits & Dynamic Records from API */}
                    {standingsRecord?.splitRecords && standingsRecord.splitRecords.length > 0 && (
                      <div className="bg-slate-900/60 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="text-xs font-black tracking-wider uppercase text-slate-400 flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                            <span>Сплиты и динамика сезона</span>
                          </h4>
                          <div className="flex items-center gap-2">
                            {standingsRecord.leagueRank && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                В Лиге: #{standingsRecord.leagueRank}
                              </span>
                            )}
                            {standingsRecord.sportRank && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                В MLB: #{standingsRecord.sportRank}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                          {(() => {
                            const splits = standingsRecord.splitRecords || [];
                            const homeSplit = splits.find((s) => s.type === 'home');
                            const awaySplit = splits.find((s) => s.type === 'away');
                            const lhpSplit = splits.find((s) => s.type === 'left');
                            const rhpSplit = splits.find((s) => s.type === 'right');
                            const l10Split = splits.find((s) => s.type === 'lastTen');
                            const oneRunSplit = splits.find((s) => s.type === 'oneRun');
                            const extraSplit = splits.find((s) => s.type === 'extraInning');
                            const daySplit = splits.find((s) => s.type === 'day');
                            const nightSplit = splits.find((s) => s.type === 'night');

                            return [
                              { label: 'Дома', val: homeSplit ? `${homeSplit.wins} - ${homeSplit.losses}` : '—', sub: homeSplit ? `PCT: ${homeSplit.pct}` : '' },
                              { label: 'В гостях', val: awaySplit ? `${awaySplit.wins} - ${awaySplit.losses}` : '—', sub: awaySplit ? `PCT: ${awaySplit.pct}` : '' },
                              { label: 'Последние 10 (L10)', val: l10Split ? `${l10Split.wins} - ${l10Split.losses}` : '—', sub: l10Split ? `PCT: ${l10Split.pct}` : '' },
                              { label: 'Матчи в 1 очко', val: oneRunSplit ? `${oneRunSplit.wins} - ${oneRunSplit.losses}` : '—', sub: 'Плотная борьба' },
                              { label: 'Против левшей (LHP)', val: lhpSplit ? `${lhpSplit.wins} - ${lhpSplit.losses}` : '—', sub: lhpSplit ? `PCT: ${lhpSplit.pct}` : '' },
                              { label: 'Против правшей (RHP)', val: rhpSplit ? `${rhpSplit.wins} - ${rhpSplit.losses}` : '—', sub: rhpSplit ? `PCT: ${rhpSplit.pct}` : '' },
                              { label: 'Экстра-иннинги', val: extraSplit ? `${extraSplit.wins} - ${extraSplit.losses}` : '—', sub: 'Овертаймы' },
                              { label: 'День / Ночь', val: `${daySplit ? `${daySplit.wins}W` : '—'} / ${nightSplit ? `${nightSplit.wins}W` : '—'}`, sub: 'Дневные / ночные' },
                            ].map((item, i) => (
                              <div key={i} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                                <span className="text-[10px] text-slate-500 font-bold uppercase block">{item.label}</span>
                                <span className="text-base font-black text-white font-mono mt-0.5 block">{item.val}</span>
                                <span className="text-[9px] text-slate-400 block">{item.sub}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 2: LEADERS ── */}
                {activeTab === 'leaders' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black tracking-wider uppercase text-slate-400">
                        Лидеры команды по категориям
                      </h3>
                      <div className="flex items-center gap-1.5">
                        {[2026, 2025, 2024].map((s) => (
                          <button
                            key={s}
                            onClick={() => setLeadersSeason(s)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                              leadersSeason === s
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {LEADER_CATEGORIES.map((cat) => {
                        const items = leaders[cat.key.toLowerCase()] || [];
                        return (
                          <div key={cat.key} className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
                            <span className="text-[11px] font-bold text-slate-300 mb-2 block">{cat.label}</span>
                            {items.length === 0 ? (
                              <p className="text-xs text-slate-500 py-2">Нет данных</p>
                            ) : (
                              <div className="space-y-1.5">
                                {items.slice(0, 3).map((item: any, idx: number) => (
                                  <div
                                    key={idx}
                                    onClick={() => onSelectPlayer && item.person?.id && onSelectPlayer(item.person.id, item.person.fullName)}
                                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="text-slate-500 font-bold text-[10px] w-3">{idx + 1}.</span>
                                      <span className="truncate font-medium text-slate-200 hover:text-amber-300">
                                        {item.person?.fullName}
                                      </span>
                                    </div>
                                    <span className="font-mono font-bold text-amber-400 ml-2">{item.value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── TAB 3: ROSTER ── */}
                {activeTab === 'roster' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {Object.entries(groupedRoster).map(([groupTitle, players]) => {
                      if (players.length === 0) return null;
                      return (
                        <div key={groupTitle} className="space-y-2">
                          <h4 className="text-xs font-black tracking-wider uppercase text-slate-400 flex items-center gap-2">
                            <span>{groupTitle}</span>
                            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">
                              {players.length}
                            </span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {players.map((p) => (
                              <div
                                key={p.person.id}
                                onClick={() => onSelectPlayer && onSelectPlayer(p.person.id, p.person.fullName)}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition group"
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded w-7 text-center">
                                    {p.position?.abbreviation || '—'}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 truncate">
                                    {p.person.fullName}
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono text-slate-500 font-bold ml-2">
                                  {p.jerseyNumber ? `#${p.jerseyNumber}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── TAB 4: COACHES ── */}
                {activeTab === 'coaches' && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <h3 className="text-xs font-black tracking-wider uppercase text-slate-400">
                      Тренерский штаб команды
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {coaches.map((c, i) => {
                        const jobName = c.title || c.job || 'Coach';
                        const ruJob = COACH_RU[jobName] || jobName;
                        const isManager = jobName === 'Manager' || c.jobId === 'MNGR';
                        return (
                          <div
                            key={i}
                            className={`p-3 rounded-2xl border flex items-center justify-between ${
                              isManager
                                ? 'bg-amber-400/10 border-amber-400/30'
                                : 'bg-slate-900/50 border-slate-800'
                            }`}
                          >
                            <div>
                              <span className="text-xs font-bold text-white block">{c.person?.fullName}</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">{ruJob}</span>
                            </div>
                            {c.jerseyNumber && (
                              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
                                #{c.jerseyNumber}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── TAB 5: LEGENDS ── */}
                {activeTab === 'legends' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Легендарные игроки клуба
                      </h3>
                      <p className="text-xs text-slate-400">
                        Величайшие звезды за всю историю франшизы. Нажмите на любого игрока, чтобы открыть его карточку со статистикой!
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {legends.map((legend, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleLegendClick(legend)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-amber-400/20 text-slate-200 hover:text-amber-300 border border-slate-800 hover:border-amber-400/40 text-xs font-bold transition shadow-sm"
                        >
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>{legend}</span>
                          <ChevronRight className="w-3 h-3 text-slate-500" />
                        </button>
                      ))}
                    </div>

                    {fans.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <h4 className="text-xs font-black tracking-wider uppercase text-white">
                              Знаменитые болельщики & Селебрити
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                            {fans.length} персон
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {fans.map((fan, i) => {
                            const [name, ...descParts] = fan.split(' — ');
                            const desc = descParts.join(' — ');
                            return (
                              <div
                                key={i}
                                className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-amber-400/30 transition flex items-start gap-3 shadow-sm group"
                              >
                                <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-black text-white group-hover:text-amber-300 transition truncate">
                                    {name}
                                  </div>
                                  {desc && (
                                    <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                                      {desc}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 6: GAMES ── */}
                {activeTab === 'games' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black tracking-wider uppercase text-slate-400">
                        Матчи сезона {gamesSeason}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        {[2026, 2025].map((s) => (
                          <button
                            key={s}
                            onClick={() => setGamesSeason(s)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                              gamesSeason === s
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {schedule.slice(0, 30).map((g) => {
                        const isHome = g.teams.home.team.id === teamId;
                        const myTeamData = isHome ? g.teams.home : g.teams.away;
                        const oppTeamData = isHome ? g.teams.away : g.teams.home;
                        const isFinal = g.status?.abstractGameState === 'Final';
                        const won = isFinal && (myTeamData.score || 0) > (oppTeamData.score || 0);

                        return (
                          <div
                            key={g.gamePk}
                            onClick={() => onSelectGame && onSelectGame(g)}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                  !isFinal
                                    ? 'bg-slate-800 text-slate-400'
                                    : won
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {!isFinal ? 'ПРЕД' : won ? 'ПОБEDA' : 'ПОРАЖЕНИЕ'}
                              </span>
                              <div className="text-xs">
                                <span className="text-slate-400 font-mono text-[11px] mr-2">
                                  {new Date(g.gameDate).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
                                </span>
                                <span className="font-semibold text-white">
                                  {isHome ? 'vs' : '@'} {oppTeamData.team.name}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {isFinal ? (
                                <span className="font-mono font-black text-sm text-white">
                                  {myTeamData.score} : {oppTeamData.score}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-500 font-medium">Запланирован</span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── TAB: STADIUM / BALLPARK ── */}
                {activeTab === 'stadium' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-[10px] font-black tracking-wider uppercase text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                            Домашняя арена
                          </span>
                          <h3 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-amber-400" />
                            <span>{venueDetails?.name || 'Стадион клуба'}</span>
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {[venueDetails?.location?.address1, venueDetails?.location?.city, venueDetails?.location?.stateAbbrev || venueDetails?.location?.state]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        </div>
                        {venueDetails?.fieldInfo?.capacity && (
                          <div className="text-right bg-slate-950/60 px-4 py-2.5 rounded-2xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Вместимость</span>
                            <span className="text-2xl font-black text-amber-300 font-mono">
                              {venueDetails.fieldInfo.capacity.toLocaleString('ru-RU')}
                            </span>
                            <span className="text-[10px] text-slate-500 block">зрительских мест</span>
                          </div>
                        )}
                      </div>

                      {/* Characteristics grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Тип крыши</span>
                          <span className="font-bold text-white text-xs block mt-0.5">
                            {ROOF_TYPES_RU[venueDetails?.fieldInfo?.roofType?.toUpperCase() || ''] || venueDetails?.fieldInfo?.roofType || 'Открытый стадион'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Покрытие</span>
                          <span className="font-bold text-white text-xs block mt-0.5">
                            {TURF_TYPES_RU[venueDetails?.fieldInfo?.turfType || ''] || venueDetails?.fieldInfo?.turfType || 'Натуральный газон'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Высота над морем</span>
                          <span className="font-bold text-white text-xs block mt-0.5 font-mono">
                            {venueDetails?.location?.elevation ? `${venueDetails.location.elevation} ft` : 'Стандартная'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Телефон стадиона</span>
                          <span className="font-bold text-white text-xs block mt-0.5 font-mono">
                            {venueDetails?.location?.phone || '—'}
                          </span>
                        </div>
                      </div>

                      {/* Field Dimensions Diagram */}
                      {venueDetails?.fieldInfo && (
                        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black tracking-wider uppercase text-slate-400">
                              Геометрия аутфилда (Расстояния от дома до ограждения)
                            </h4>
                            <span className="text-[10px] text-slate-500 font-mono">В футах (ft)</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Левый угол (LF)</span>
                              <span className="text-lg font-black text-amber-300 font-mono">{venueDetails.fieldInfo.leftLine ?? '—'} ft</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Левый центр</span>
                              <span className="text-lg font-black text-white font-mono">{venueDetails.fieldInfo.leftCenter ?? '—'} ft</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Центр-филд (CF)</span>
                              <span className="text-lg font-black text-emerald-400 font-mono">{venueDetails.fieldInfo.center ?? '—'} ft</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Правый центр</span>
                              <span className="text-lg font-black text-white font-mono">{venueDetails.fieldInfo.rightCenter ?? '—'} ft</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Правый угол (RF)</span>
                              <span className="text-lg font-black text-amber-300 font-mono">{venueDetails.fieldInfo.rightLine ?? '—'} ft</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB: TRANSACTIONS & ROSTER MOVES ── */}
                {activeTab === 'trans' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black tracking-wider uppercase text-slate-400 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                        <span>Официальные переходы, лазарет (IL) и изменения состава</span>
                      </h3>
                      <span className="text-[10px] text-slate-500 font-mono">Последние 25 событий</span>
                    </div>

                    {transactions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                        Нет актуальных перемещений в составе за последнее время.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                        {transactions.map((tr) => (
                          <div
                            key={tr.id}
                            className="p-3 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800/80 transition flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-400 font-bold px-1.5 py-0.5 rounded bg-slate-800">
                                  {tr.date}
                                </span>
                                {tr.typeDesc && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                    {tr.typeDesc}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-200 leading-snug">
                                {tr.description}
                              </p>
                            </div>
                            {tr.person && (
                              <button
                                onClick={() => onSelectPlayer && onSelectPlayer(tr.person!.id, tr.person!.fullName)}
                                className="shrink-0 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-amber-400/20 text-slate-300 hover:text-amber-300 border border-slate-700 text-[11px] font-bold transition flex items-center gap-1"
                                title="Открыть досье игрока"
                              >
                                <span>Игрок</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 7: ABOUT & PALETTE ── */}
                {activeTab === 'about' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Club Colors Palette */}
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-black tracking-wider uppercase text-slate-400 flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-amber-400" />
                        Официальная клубная палитра
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {palette.map(([colorTitle, hex], i) => (
                          <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                            <span
                              className="w-7 h-7 rounded-lg border border-white/20 shadow-sm"
                              style={{ background: hex }}
                            />
                            <div className="text-xs">
                              <span className="font-bold text-white block">{colorTitle}</span>
                              <span className="text-[10px] font-mono text-slate-400 uppercase">{hex}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Wikipedia summary */}
                    {wikiInfo && wikiInfo.extract && (
                      <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl space-y-3">
                        <h4 className="text-xs font-black tracking-wider uppercase text-slate-400 flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                          Энциклопедическая справка
                        </h4>
                        <p className="text-xs leading-relaxed text-slate-300">
                          {wikiInfo.extract}
                        </p>
                        {wikiInfo.url && (
                          <a
                            href={wikiInfo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition mt-2"
                          >
                            <span>Читать полную статью в Википедии</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>MLB Statsapi • Официальный профиль клуба</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-xs"
            >
              Закрыть окно
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
