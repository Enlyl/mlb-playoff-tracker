import React, { useState, useEffect } from 'react';
import {
  DivisionStandings,
  WildCardStandings,
  getStandings,
  getWildCardStandings,
  getTeamLogoUrl,
} from '../services/mlbApi';
import { BarChart2, ShieldCheck, Zap, Info, CheckCircle2, Star } from 'lucide-react';
import { PlayerDetailModal } from './PlayerDetailModal';

interface StandingsViewProps {
  favoriteTeamId: number | null;
  onSelectTeam?: (teamId: number, teamName: string) => void;
  onToggleFavorite?: (teamId: number, teamName: string) => void;
}

export const StandingsView: React.FC<StandingsViewProps> = ({ favoriteTeamId, onSelectTeam, onToggleFavorite }) => {
  const [activeTab, setActiveTab] = useState<'divisions' | 'wildcard'>('divisions');
  const [season, setSeason] = useState<number>(2026);
  const [divisions, setDivisions] = useState<DivisionStandings[]>([]);
  const [wildCardRecords, setWildCardRecords] = useState<WildCardStandings[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeLeague, setActiveLeague] = useState<'ALL' | 'AL' | 'NL'>('ALL');

  // Interactive team and player modal state
    const [selectedPlayerModal, setSelectedPlayerModal] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [divData, wcData] = await Promise.all([
          getStandings(season),
          getWildCardStandings(season),
        ]);
        if (isMounted) {
          setDivisions(divData);
          setWildCardRecords(wcData);
        }
      } catch (err) {
        console.error('Failed to load standings:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [season]);

  const filteredDivisions = divisions.filter((div) => {
    if (activeLeague === 'ALL') return true;
    if (activeLeague === 'AL') return div.league.name?.toLowerCase().includes('american') || div.id === 201 || div.id === 202 || div.id === 200;
    if (activeLeague === 'NL') return div.league.name?.toLowerCase().includes('national') || div.id === 204 || div.id === 205 || div.id === 203;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
      
      {/* ── HEADER BAR ── */}
      <div className="glass-shell glass-card" style={{ padding: '1px' }}>
        <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="eyebrow"
                  style={{
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    color: '#93c5fd',
                  }}
                >
                  <BarChart2 className="w-3 h-3 text-blue-400" />
                  {season === 2026 ? 'MLB 2026 • Регулярка' : `Сезон ${season}`}
                </span>
              </div>
              <h2
                className="text-display text-white"
                style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)' }}
              >
                Турнирные таблицы
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Победители 6 дивизионов + 6 команд Wild Card выходят в плей-офф
              </p>
            </div>

            {/* View Switcher & Season Selector */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tab Pills */}
              <div
                className="flex items-center gap-1 p-1 rounded-full"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <button
                  onClick={() => setActiveTab('divisions')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all"
                  style={{
                    background: activeTab === 'divisions' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    border: activeTab === 'divisions' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                    color: activeTab === 'divisions' ? '#93c5fd' : 'rgba(148, 163, 184, 0.8)',
                    boxShadow: activeTab === 'divisions' ? '0 0 16px rgba(59, 130, 246, 0.2)' : 'none',
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Дивизионы</span>
                </button>

                <button
                  onClick={() => setActiveTab('wildcard')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all"
                  style={{
                    background: activeTab === 'wildcard' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    border: activeTab === 'wildcard' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                    color: activeTab === 'wildcard' ? '#fcd34d' : 'rgba(148, 163, 184, 0.8)',
                    boxShadow: activeTab === 'wildcard' ? '0 0 16px rgba(245, 158, 11, 0.2)' : 'none',
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Гонка Wild Card</span>
                </button>
              </div>

              {/* Season Selector */}
              <select
                value={season}
                onChange={(e) => setSeason(Number(e.target.value))}
                className="bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold text-slate-300 px-3 py-1.5 rounded-full outline-none cursor-pointer"
              >
                <option value={2026} className="bg-slate-900 text-slate-200">2026 (Текущий)</option>
                <option value={2025} className="bg-slate-900 text-slate-200">2025</option>
                <option value={2024} className="bg-slate-900 text-slate-200">2024</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-medium text-sm">
          Загрузка турнирных данных MLB {season}...
        </div>
      ) : activeTab === 'divisions' ? (
        /* TAB 1: DIVISIONS */
        <div className="space-y-4">
          {/* League Filter Pills */}
          <div className="flex items-center gap-1.5">
            {(['ALL', 'AL', 'NL'] as const).map((league) => (
              <button
                key={league}
                onClick={() => setActiveLeague(league)}
                className="px-3 py-1 rounded-full text-[11px] font-bold transition-all"
                style={{
                  background: activeLeague === league ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${activeLeague === league ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.05)'}`,
                  color: activeLeague === league ? '#fff' : 'rgba(148, 163, 184, 0.7)',
                }}
              >
                {league === 'ALL' ? 'Все дивизионы' : league === 'AL' ? 'Американская лига (AL)' : 'Национальная лига (NL)'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredDivisions.map((division) => (
              <div
                key={division.id || division.name}
                className="glass-shell glass-card"
                style={{ padding: '1px' }}
              >
                <div className="glass-core rounded-[calc(1.5rem-1px)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.02]">
                    <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      {division.name}
                    </h3>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      {division.league.name}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-500 font-mono text-[10px] border-b border-white/[0.05]">
                          <th className="py-2 px-3 font-sans"># Команда</th>
                          <th className="py-2 px-2 text-center">W</th>
                          <th className="py-2 px-2 text-center">L</th>
                          <th className="py-2 px-2 text-center">PCT</th>
                          <th className="py-2 px-2 text-center">GB</th>
                          <th className="py-2 px-2 text-center">STRK</th>
                          <th className="py-2 px-2 text-center">DIFF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {division.teamRecords.map((record, rankIdx) => {
                          const isFavorite = favoriteTeamId === record.team.id;
                          const isLeader = rankIdx === 0;

                          return (
                            <tr
                              key={record.team.id}
                              onClick={() => onSelectTeam?.(record.team.id, record.team.name )}
                              title={`Открыть полное досье ${record.team.name}`}
                              className={`border-b transition-all duration-200 cursor-pointer ${
                                isFavorite
                                  ? 'border-amber-500/40 hover:bg-amber-500/25'
                                  : 'border-white/[0.03] hover:bg-white/[0.04]'
                              }`}
                              style={{
                                background: isFavorite
                                  ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.26) 0%, rgba(245, 158, 11, 0.08) 100%)'
                                  : undefined,
                                boxShadow: isFavorite
                                  ? 'inset 4px 0 0 #f59e0b, 0 0 25px rgba(245, 158, 11, 0.2)'
                                  : undefined,
                              }}
                            >
                              <td className="py-2.5 px-3 flex items-center gap-2 font-semibold">
                                <span
                                  className={`w-3.5 text-[11px] font-mono ${
                                    isFavorite
                                      ? 'text-amber-400 font-black'
                                      : isLeader
                                      ? 'text-amber-400 font-bold'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {rankIdx + 1}
                                </span>
                                <img
                                  src={getTeamLogoUrl(record.team.id)}
                                  alt={record.team.name}
                                  className={`w-5 h-5 object-contain transition-transform ${
                                    isFavorite ? 'scale-110 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : ''
                                  }`}
                                />
                                <span
                                  className={
                                    isFavorite
                                      ? 'text-amber-300 font-black tracking-tight text-xs sm:text-sm drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                                      : 'text-slate-200'
                                  }
                                >
                                  {record.team.name}
                                </span>
                                {isFavorite && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/25 border border-amber-400/60 px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)] shrink-0">
                                    <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                                    Моя
                                  </span>
                                )}
                                {isLeader && !isFavorite && (
                                  <span className="text-[9px] px-1 rounded bg-emerald-500/15 text-emerald-400 font-mono font-bold border border-emerald-500/30">
                                    1st
                                  </span>
                                )}
                              </td>

                              <td className={`py-2 px-2 text-center font-mono tabular-nums ${
                                isFavorite ? 'font-black text-amber-200 text-sm' : 'font-bold text-white'
                              }`}>
                                {record.wins}
                              </td>
                              <td className="py-2 px-2 text-center font-mono text-slate-400 tabular-nums">
                                {record.losses}
                              </td>
                              <td className="py-2 px-2 text-center font-mono text-slate-400 tabular-nums">
                                {record.winningPercentage}
                              </td>
                              <td className="py-2 px-2 text-center font-mono text-slate-400 tabular-nums">
                                {record.gamesBack === '-' ? '-' : record.gamesBack}
                              </td>
                              <td className="py-2 px-2 text-center font-mono">
                                {record.streak?.streakCode ? (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      record.streak.streakCode.startsWith('W')
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                                    }`}
                                  >
                                    {record.streak.streakCode}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="py-2 px-2 text-center font-mono tabular-nums">
                                <span
                                  className={`font-semibold ${
                                    (record.runDifferential || 0) > 0
                                      ? 'text-emerald-400'
                                      : (record.runDifferential || 0) < 0
                                      ? 'text-red-400'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {(record.runDifferential || 0) > 0 ? '+' : ''}
                                  {record.runDifferential ?? '-'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* TAB 2: WILD CARD RACE */
        <div className="space-y-4">
          <div
            className="glass-shell p-[1px]"
            style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}
          >
            <div
              className="glass-core p-4 rounded-[calc(1.5rem-1px)] text-xs text-amber-200/90 leading-relaxed flex items-start gap-3"
              style={{ background: 'rgba(245, 158, 11, 0.06)' }}
            >
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Правило Wild Card:</strong> Топ-3 команды в каждой лиге (не выигравшие свой дивизион) получают путевки в раунд плей-офф Wild Card. Зеленая черта разделяет зону квалификации и преследователей.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {wildCardRecords.map((wc, lIdx) => {
              const leagueName = lIdx === 0 ? 'American League (AL)' : 'National League (NL)';
              return (
                <div
                  key={lIdx}
                  className="glass-shell glass-card"
                  style={{ padding: '1px' }}
                >
                  <div className="glass-core rounded-[calc(1.5rem-1px)] overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.02]">
                      <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        Wild Card • {leagueName}
                      </h3>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Топ-3 в плей-офф
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-500 font-mono text-[10px] border-b border-white/[0.05]">
                            <th className="py-2 px-3 font-sans"># Команда</th>
                            <th className="py-2 px-2 text-center">W</th>
                            <th className="py-2 px-2 text-center">L</th>
                            <th className="py-2 px-2 text-center">PCT</th>
                            <th className="py-2 px-2 text-center text-amber-400 font-bold">WCGB</th>
                            <th className="py-2 px-2 text-center">STRK</th>
                            <th className="py-2 px-2 text-center">DIFF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wc.teamRecords.map((record, rankIdx) => {
                            const isQualified = rankIdx < 3;
                            const isCutoffLine = rankIdx === 2;
                            const isFavorite = favoriteTeamId === record.team.id;

                            return (
                              <React.Fragment key={record.team.id}>
                                <tr
                                  onClick={() => onSelectTeam?.(record.team.id, record.team.name )}
                                  title={`Открыть полное досье ${record.team.name}`}
                                  className={`border-b transition-all duration-200 cursor-pointer ${
                                    isFavorite
                                      ? 'border-amber-500/40 hover:bg-amber-500/25'
                                      : 'border-white/[0.03] hover:bg-white/[0.04]'
                                  }`}
                                  style={{
                                    background: isFavorite
                                      ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.26) 0%, rgba(245, 158, 11, 0.08) 100%)'
                                      : undefined,
                                    boxShadow: isFavorite
                                      ? 'inset 4px 0 0 #f59e0b, 0 0 25px rgba(245, 158, 11, 0.2)'
                                      : undefined,
                                    opacity: isFavorite ? 1 : isQualified ? 1 : 0.7,
                                  }}
                                >
                                  <td className="py-2.5 px-3 flex items-center gap-2 font-semibold">
                                    <span
                                      className={`w-4 text-[11px] font-mono ${
                                        isFavorite
                                          ? 'text-amber-400 font-black'
                                          : isQualified
                                          ? 'text-emerald-400 font-bold'
                                          : 'text-slate-600'
                                      }`}
                                    >
                                      #{rankIdx + 1}
                                    </span>
                                    <img
                                      src={getTeamLogoUrl(record.team.id)}
                                      alt={record.team.name}
                                      className={`w-5 h-5 object-contain transition-transform ${
                                        isFavorite ? 'scale-110 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : ''
                                      }`}
                                    />
                                    <span
                                      className={
                                        isFavorite
                                          ? 'text-amber-300 font-black tracking-tight text-xs sm:text-sm drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                                          : 'text-slate-200'
                                      }
                                    >
                                      {record.team.name}
                                    </span>
                                    {isFavorite && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/25 border border-amber-400/60 px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)] shrink-0">
                                        <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                                        Моя
                                      </span>
                                    )}
                                    {isQualified && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-0.5" />
                                    )}
                                  </td>

                                  <td className={`py-2 px-2 text-center font-mono tabular-nums ${
                                    isFavorite ? 'font-black text-amber-200 text-sm' : 'font-bold text-white'
                                  }`}>
                                    {record.wins}
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono text-slate-400 tabular-nums">
                                    {record.losses}
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono text-slate-400 tabular-nums">
                                    {record.winningPercentage}
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono font-bold tabular-nums">
                                    <span className={isQualified ? 'text-emerald-400' : 'text-amber-400'}>
                                      {record.wildCardGamesBack || '-'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono">
                                    {record.streak?.streakCode ? (
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                          record.streak.streakCode.startsWith('W')
                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                                        }`}
                                      >
                                        {record.streak.streakCode}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono tabular-nums">
                                    <span
                                      className={`font-semibold ${
                                        (record.runDifferential || 0) > 0
                                          ? 'text-emerald-400'
                                          : (record.runDifferential || 0) < 0
                                          ? 'text-red-400'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      {(record.runDifferential || 0) > 0 ? '+' : ''}
                                      {record.runDifferential ?? '-'}
                                    </span>
                                  </td>
                                </tr>

                                {/* Cutoff line indicator */}
                                {isCutoffLine && (
                                  <tr className="bg-emerald-500/10 border-y border-emerald-500/30 text-[9px] font-mono text-emerald-400 text-center">
                                    <td colSpan={7} className="py-1 uppercase font-bold tracking-wider">
                                      ▲ Зона выхода в Wild Card раунд плей-офф ▲
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      

      {/* ── PLAYER DETAIL MODAL ── */}
      {selectedPlayerModal && (
        <PlayerDetailModal
          playerId={selectedPlayerModal.id}
          playerName={selectedPlayerModal.name}
          onClose={() => setSelectedPlayerModal(null)}
        />
      )}

    </div>
  );
};
