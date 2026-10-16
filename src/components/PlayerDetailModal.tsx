import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  Shield,
  User,
  Loader2,
  Calendar,
  Sparkles,
  TrendingUp,
  MapPin,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import {
  PlayerDetails,
  getPlayerDetails,
  getPlayerPhotoUrl,
  getTeamLogoUrl,
  MLBGame,
} from '../services/mlbApi';
import { TEAM_RU } from '../services/teamData';

interface PlayerDetailModalProps {
  playerId: number | null;
  playerName?: string;
  onClose: () => void;
  season?: number;
  onSelectTeam?: (teamId: number, teamName: string) => void;
  onSelectGame?: (game: MLBGame) => void;
}

type TabType = 'overview' | 'career' | 'gamelog' | 'awards';

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  playerId,
  playerName,
  onClose,
  season = 2026,
  onSelectTeam,
  onSelectGame,
}) => {
  const [details, setDetails] = useState<PlayerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    if (!playerId) return;
    let isMounted = true;
    setLoading(true);

    getPlayerDetails(playerId, season)
      .then((data) => {
        if (isMounted) setDetails(data);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [playerId, season]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!playerId) return null;

  const person = details?.person;
  const isPitcher = details?.isPitcher ?? false;
  const seasonStats = details?.seasonStats || {};
  const careerStats = details?.careerStats || {};
  const yearByYear = details?.yearByYearStats || [];
  const gameLogs = details?.gameLogs || [];
  const awards = details?.awards || [];

  // Key stats overview cards
  const overviewCards = isPitcher
    ? [
        { label: 'ERA', val: seasonStats.era || '-.--', sub: `Карьера: ${careerStats.era || '-.--'}`, highlight: true },
        { label: 'Победы / Поражения', val: `${seasonStats.wins ?? 0} - ${seasonStats.losses ?? 0}`, sub: `Карьера: ${careerStats.wins ?? 0}-${careerStats.losses ?? 0}` },
        { label: 'Страйкауты (SO)', val: seasonStats.strikeOuts ?? '—', sub: `Карьера: ${careerStats.strikeOuts ?? '—'}` },
        { label: 'WHIP', val: seasonStats.whip || '-.--', sub: `Карьера: ${careerStats.whip || '-.--'}` },
        { label: 'Иннинги (IP)', val: seasonStats.inningsPitched ?? '—', sub: `Карьера: ${careerStats.inningsPitched ?? '—'}` },
        { label: 'Сейвы (SV)', val: seasonStats.saves ?? '0', sub: `Карьера: ${careerStats.saves ?? '0'}` },
      ]
    : [
        { label: 'Баттинг AVG', val: seasonStats.avg || '.---', sub: `Карьера: ${careerStats.avg || '.---'}`, highlight: true },
        { label: 'Хоум-раны (HR)', val: seasonStats.homeRuns ?? '—', sub: `Карьера: ${careerStats.homeRuns ?? '—'}` },
        { label: 'RBI (Очки)', val: seasonStats.rbi ?? '—', sub: `Карьера: ${careerStats.rbi ?? '—'}` },
        { label: 'OPS', val: seasonStats.ops || '.---', sub: `Карьера: ${careerStats.ops || '.---'}` },
        { label: 'Хиты (Hits)', val: seasonStats.hits ?? '—', sub: `Карьера: ${careerStats.hits ?? '—'}` },
        { label: 'Украденные базы (SB)', val: seasonStats.stolenBases ?? '—', sub: `Карьера: ${careerStats.stolenBases ?? '—'}` },
      ];

  // Helper for birth place
  const birthPlace = [person?.birthCity, person?.birthStateProvince, person?.birthCountry]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] rounded-3xl border border-white/10 shadow-2xl overflow-hidden text-slate-100 relative flex flex-col"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(10, 15, 29, 0.99))',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-slate-900/60 relative">
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
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
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Закрыть (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pr-10">
            {/* Player Photo */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-800/80 border-2 border-white/10 shrink-0 shadow-xl">
              <img
                src={getPlayerPhotoUrl(playerId)}
                alt={person?.fullName || playerName || 'Player'}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center -z-10 text-slate-600">
                <User className="w-10 h-10" />
              </div>
            </div>

            {/* Player Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  #{person?.primaryNumber ?? '—'}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {person?.primaryPosition?.name || (isPitcher ? 'Питчер' : 'Бьющий')}
                </span>
                {person?.currentTeam && (
                  <button
                    onClick={() => onSelectTeam && onSelectTeam(person.currentTeam!.id, person.currentTeam!.name)}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-amber-400/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-400/40 text-xs font-bold transition"
                    title="Перейти к досье команды"
                  >
                    <img
                      src={getTeamLogoUrl(person.currentTeam.id)}
                      alt=""
                      className="w-3.5 h-3.5 object-contain"
                    />
                    <span>{TEAM_RU[person.currentTeam.id] || person.currentTeam.name}</span>
                    <ChevronRight className="w-3 h-3 text-slate-500" />
                  </button>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white truncate mt-1">
                {person?.fullName || playerName}
              </h2>

              {/* Bio tags */}
              <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-slate-400 mt-2">
                {person?.currentAge && (
                  <span>
                    Возраст: <strong className="text-slate-200">{person.currentAge}</strong>
                  </span>
                )}
                {person?.height && (
                  <span>
                    Рост: <strong className="text-slate-200">{person.height}</strong>
                  </span>
                )}
                {person?.weight && (
                  <span>
                    Вес: <strong className="text-slate-200">{person.weight} lb</strong>
                  </span>
                )}
                {(person?.batSide || person?.pitchHand) && (
                  <span>
                    Б/Б: <strong className="text-slate-200">{person.batSide?.code || '—'}/{person.pitchHand?.code || '—'}</strong>
                  </span>
                )}
                {birthPlace && (
                  <span className="flex items-center gap-1 truncate max-w-xs">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{birthPlace}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 mt-5 overflow-x-auto no-scrollbar border-t border-white/10 pt-3">
            {[
              { id: 'overview', label: `Сезон ${season}`, icon: TrendingUp },
              { id: 'career', label: `Карьера (${yearByYear.length} сез)`, icon: Calendar },
              { id: 'gamelog', label: `Матчи (${gameLogs.length})`, icon: Shield },
              { id: 'awards', label: `Награды (${awards.length})`, icon: Award },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs text-slate-400">Загрузка подробной статистики игрока…</span>
            </div>
          ) : (
            <>
              {/* ── TAB 1: OVERVIEW ── */}
              {activeTab === 'overview' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {overviewCards.map((card, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border ${
                          card.highlight
                            ? 'bg-blue-600/15 border-blue-500/40'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-slate-400 block">{card.label}</span>
                        <span className="text-xl sm:text-2xl font-black text-white mt-0.5 block">{card.val}</span>
                        <span className="text-[10px] text-slate-500 block mt-1">{card.sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* Additional metrics */}
                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-black tracking-wider uppercase text-slate-400">
                      Дополнительные показатели сезона {season}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      {isPitcher ? (
                        <>
                          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Игры / Старты</span>
                            <span className="font-bold text-white font-mono">{seasonStats.gamesPitched ?? '—'} / {seasonStats.gamesStarted ?? '—'}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Полные игры / Шатауты</span>
                            <span className="font-bold text-white font-mono">{seasonStats.completeGames ?? 0} / {seasonStats.shutouts ?? 0}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">SO / 9 иннингов</span>
                            <span className="font-bold text-emerald-400 font-mono">{seasonStats.strikeoutsPer9Inn || '—'}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">K/BB соотношение</span>
                            <span className="font-bold text-amber-300 font-mono">{seasonStats.strikeoutWalkRatio || '—'}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Матчи / Выходы на биту</span>
                            <span className="font-bold text-white font-mono">{seasonStats.gamesPlayed ?? '—'} / {seasonStats.atBats ?? '—'}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Даблы (2B) / Триплы (3B)</span>
                            <span className="font-bold text-white font-mono">{seasonStats.doubles ?? 0} / {seasonStats.triples ?? 0}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">OBP (On-Base %)</span>
                            <span className="font-bold text-emerald-400 font-mono">{seasonStats.obp || '—'}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">SLG (Slugging %)</span>
                            <span className="font-bold text-amber-300 font-mono">{seasonStats.slg || '—'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: YEAR BY YEAR CAREER HISTORY ── */}
              {activeTab === 'career' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black tracking-wider uppercase text-slate-400">
                      Хронология карьеры по сезонам
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">{yearByYear.length} сезонов</span>
                  </div>

                  {yearByYear.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                      История сезонов формируется или недоступна.
                    </div>
                  ) : (
                    <div className="rounded-2xl overflow-hidden border border-slate-800">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-slate-900/90 text-slate-400 font-mono text-[10px] border-b border-slate-800">
                              <th className="py-2.5 px-3">Сезон</th>
                              <th className="py-2.5 px-3">Команда</th>
                              {isPitcher ? (
                                <>
                                  <th className="py-2.5 px-2 text-right">W-L</th>
                                  <th className="py-2.5 px-2 text-right text-emerald-400">ERA</th>
                                  <th className="py-2.5 px-2 text-right">G</th>
                                  <th className="py-2.5 px-2 text-right">GS</th>
                                  <th className="py-2.5 px-2 text-right">SV</th>
                                  <th className="py-2.5 px-2 text-right">IP</th>
                                  <th className="py-2.5 px-2 text-right text-purple-400">SO</th>
                                  <th className="py-2.5 px-2 text-right">WHIP</th>
                                </>
                              ) : (
                                <>
                                  <th className="py-2.5 px-2 text-right">G</th>
                                  <th className="py-2.5 px-2 text-right">AB</th>
                                  <th className="py-2.5 px-2 text-right">R</th>
                                  <th className="py-2.5 px-2 text-right">H</th>
                                  <th className="py-2.5 px-2 text-right text-amber-400">HR</th>
                                  <th className="py-2.5 px-2 text-right">RBI</th>
                                  <th className="py-2.5 px-2 text-right">SB</th>
                                  <th className="py-2.5 px-2 text-right text-emerald-400">AVG</th>
                                  <th className="py-2.5 px-2 text-right text-purple-400">OPS</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {yearByYear.map((row, i) => {
                              const s = row.stat || {};
                              const t = row.team;
                              return (
                                <tr
                                  key={i}
                                  className="border-b border-slate-800/80 hover:bg-slate-800/40 transition"
                                >
                                  <td className="py-2.5 px-3 font-mono font-bold text-white">{row.season}</td>
                                  <td className="py-2.5 px-3">
                                    {t ? (
                                      <div
                                        onClick={() => onSelectTeam && onSelectTeam(t.id, t.name)}
                                        className="flex items-center gap-1.5 cursor-pointer hover:text-amber-300 transition group/t"
                                        title={`Открыть досье команды ${t.name}`}
                                      >
                                        <img
                                          src={getTeamLogoUrl(t.id)}
                                          alt=""
                                          className="w-4 h-4 object-contain"
                                          onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                        <span className="truncate max-w-[120px] font-semibold text-slate-300 group-hover/t:text-amber-300">
                                          {TEAM_RU[t.id] || t.name}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-500">—</span>
                                    )}
                                  </td>
                                  {isPitcher ? (
                                    <>
                                      <td className="py-2.5 px-2 text-right font-mono text-slate-300">{s.wins ?? 0}-{s.losses ?? 0}</td>
                                      <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-400">{s.era || '-.--'}</td>
                                      <td className="py-2.5 px-2 text-right font-mono text-slate-300">{s.gamesPitched ?? '—'}</td>
                                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">{s.gamesStarted ?? '—'}</td>
                                      <td className="py-2.5 px-2 text-right font-mono text-amber-300">{s.saves ?? 0}</td>
                                      <td className="py-2.5 px-2 text-right font-mono text-slate-300">{s.inningsPitched ?? '—'}</td>
                                      <td className="py-2.5 px-2 text-right font-mono font-bold text-purple-400">{s.strikeOuts ?? '—'}</td>
                                      <td className="py-2.5 px-2 text-right font-mono text-slate-300">{s.whip || '-.--'}</td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="py-2.5 px-2 text-right font-mono text-slate-300">{s.gamesPlayed ?? '—'}</td>
                                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">{s.atBats ?? '—'}</td>
                                      <td className="py-2.5 px-2 text-right font-mono text-slate-300">{s.runs ?? '—'}</td>
                                      <td className="py-2.5 px-2 text-right font-mono text-slate-300">{s.hits ?? '—'}</td>
                                      <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-400">{s.homeRuns ?? 0}</td>
                                      <td className="py-2.5 px-2 text-right font-mono text-slate-200">{s.rbi ?? 0}</td>
                                      <td className="py-2.5 px-2 text-right font-mono text-cyan-400">{s.stolenBases ?? 0}</td>
                                      <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-400">{s.avg || '.---'}</td>
                                      <td className="py-2.5 px-2 text-right font-mono font-bold text-purple-400">{s.ops || '.---'}</td>
                                    </>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: GAME LOG ── */}
              {activeTab === 'gamelog' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black tracking-wider uppercase text-slate-400">
                      Матчи сезона {season}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Последние игры</span>
                  </div>

                  {gameLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                      Журнал матчей сезона пуст или игра ещё не началась.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {gameLogs.slice().reverse().map((gl, idx) => {
                        const s = gl.stat || {};
                        const opp = gl.opponent;
                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition flex items-center justify-between flex-wrap gap-2"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                  gl.isWin
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {gl.isWin ? 'ПОБEDA' : 'ПОРАЖЕНИЕ'}
                              </span>

                              <span className="text-xs font-mono text-slate-400">{gl.date}</span>

                              {opp && (
                                <div
                                  onClick={() => onSelectTeam && onSelectTeam(opp.id, opp.name)}
                                  className="flex items-center gap-1.5 cursor-pointer hover:text-amber-300 transition"
                                  title={`Открыть команду ${opp.name}`}
                                >
                                  <img
                                    src={getTeamLogoUrl(opp.id)}
                                    alt=""
                                    className="w-4 h-4 object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                  <span className="text-xs font-bold text-white">
                                    {gl.isHome ? 'vs' : '@'} {TEAM_RU[opp.id] || opp.name}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs font-mono">
                              {isPitcher ? (
                                <>
                                  <span className="text-slate-300">{s.inningsPitched} IP</span>
                                  <span className="text-rose-400">{s.earnedRuns ?? 0} ER</span>
                                  <span className="font-bold text-purple-400">{s.strikeOuts ?? 0} SO</span>
                                  <span className="text-slate-500">{s.numberOfPitches ?? 0} P</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-slate-300">{s.hits ?? 0}-{s.atBats ?? 0}</span>
                                  <span className="font-bold text-amber-400">{s.homeRuns ? `${s.homeRuns} HR` : ''}</span>
                                  <span className="text-slate-400">{s.rbi ? `${s.rbi} RBI` : ''}</span>
                                  <span className="text-emerald-400">{s.avg}</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 4: AWARDS ── */}
              {activeTab === 'awards' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black tracking-wider uppercase text-slate-400">
                      Награды и достижения ({awards.length})
                    </h4>
                  </div>

                  {awards.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                      У данного игрока пока нет зарегистрированных наград в базе MLB.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {awards.map((a, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Award className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="font-bold text-amber-200 text-xs truncate">{a.name}</span>
                          </div>
                          {a.season && (
                            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-lg shrink-0 ml-2">
                              {a.season}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
          <span>MLB Official Player Profile • statsapi.mlb.com</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-xs"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
