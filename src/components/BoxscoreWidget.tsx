import React, { useState } from 'react';
import { MLBTeam, BoxscorePlayer, getTeamLogoUrl } from '../services/mlbApi';
import { Users, Shield } from 'lucide-react';

interface BoxscoreWidgetProps {
  boxscore: any;
  awayTeam: MLBTeam;
  homeTeam: MLBTeam;
  onSelectPlayer?: (playerId: number, playerName: string) => void;
  onSelectTeam?: (teamId: number, teamName: string) => void;
}

export const BoxscoreWidget: React.FC<BoxscoreWidgetProps> = ({
  boxscore,
  awayTeam,
  homeTeam,
  onSelectPlayer,
  onSelectTeam,
}) => {
  const [activeSide, setActiveSide] = useState<'away' | 'home'>('away');

  if (!boxscore?.teams) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 rounded-xl bg-white/[0.02] border border-white/5">
        Статистика бокс-скора для этой игры ещё не доступна.
      </div>
    );
  }

  const awayData = boxscore.teams.away || {};
  const homeData = boxscore.teams.home || {};

  const currentTeam = activeSide === 'away' ? awayTeam : homeTeam;
  const currentData = activeSide === 'away' ? awayData : homeData;
  const players = currentData.players || {};

  // Batters in order
  const battersOrder: number[] = currentData.batters || [];
  const battingRows = battersOrder
    .map((id) => players[`ID${id}`])
    .filter(Boolean)
    .filter((p: BoxscorePlayer) => {
      const b = p.stats?.batting;
      return b && (b.atBats != null || (b as any).plateAppearances != null);
    });

  // Pitchers in order
  const pitchersOrder: number[] = currentData.pitchers || [];
  const pitchingRows = pitchersOrder
    .map((id) => players[`ID${id}`])
    .filter(Boolean)
    .filter((p: BoxscorePlayer) => {
      const pit = p.stats?.pitching;
      return pit && pit.inningsPitched != null;
    });

  return (
    <div className="space-y-4">
      {/* Team Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveSide('away')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSide === 'away'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
              : 'bg-white/5 text-slate-400 hover:text-white'
          }`}
        >
          <img src={getTeamLogoUrl(awayTeam.id)} alt="" className="w-4 h-4 object-contain" />
          <span>{awayTeam.name}</span>
        </button>
        <button
          onClick={() => setActiveSide('home')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeSide === 'home'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
              : 'bg-white/5 text-slate-400 hover:text-white'
          }`}
        >
          <img src={getTeamLogoUrl(homeTeam.id)} alt="" className="w-4 h-4 object-contain" />
          <span>{homeTeam.name}</span>
        </button>

        <button
          onClick={() => onSelectTeam?.(currentTeam.id, currentTeam.name)}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
        >
          <Users className="w-3.5 h-3.5" />
          Ростер команды
        </button>
      </div>

      {/* Batting Section */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Нападение (Batting) — {currentTeam.name}</span>
          <span className="text-[11px] text-slate-500 font-normal">Кликните на игрока для карточки</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/70 border-b border-white/10 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="py-2 px-3 font-semibold">Бьющий</th>
                <th className="py-2 px-2 text-center font-semibold">AB</th>
                <th className="py-2 px-2 text-center font-semibold">R</th>
                <th className="py-2 px-2 text-center font-semibold">H</th>
                <th className="py-2 px-2 text-center font-semibold">RBI</th>
                <th className="py-2 px-2 text-center font-semibold">BB</th>
                <th className="py-2 px-2 text-center font-semibold">SO</th>
                <th className="py-2 px-2 text-center font-semibold">AVG</th>
                <th className="py-2 px-2 text-center font-semibold">OPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11.5px]">
              {battingRows.length > 0 ? (
                battingRows.map((p: any, idx: number) => {
                  const b = p.stats?.batting || {};
                  const s = p.seasonStats?.batting || {};
                  return (
                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2 px-3 font-sans font-medium text-slate-200 truncate">
                        <button
                          onClick={() => onSelectPlayer?.(p.person?.id, p.person?.fullName)}
                          className="hover:text-blue-400 hover:underline text-left"
                        >
                          {p.person?.fullName}
                          <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                            {p.position?.abbreviation}
                          </span>
                        </button>
                      </td>
                      <td className="py-2 px-2 text-center">{b.atBats ?? 0}</td>
                      <td className="py-2 px-2 text-center font-bold text-white">{b.runs ?? 0}</td>
                      <td className="py-2 px-2 text-center font-bold text-emerald-400">{b.hits ?? 0}</td>
                      <td className="py-2 px-2 text-center font-bold text-amber-300">{b.rbi ?? 0}</td>
                      <td className="py-2 px-2 text-center">{b.baseOnBalls ?? 0}</td>
                      <td className="py-2 px-2 text-center text-red-400">{b.strikeOuts ?? 0}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{s.avg ?? (b.avg || '—')}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{s.ops ?? (b.ops || '—')}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-slate-500 font-sans">
                    Нет данных по выходам на биту
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pitching Section */}
      <div className="space-y-2 pt-2">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Питчинг (Pitching) — {currentTeam.name}
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/70 border-b border-white/10 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="py-2 px-3 font-semibold">Питчер</th>
                <th className="py-2 px-2 text-center font-semibold">IP</th>
                <th className="py-2 px-2 text-center font-semibold">H</th>
                <th className="py-2 px-2 text-center font-semibold">R</th>
                <th className="py-2 px-2 text-center font-semibold">ER</th>
                <th className="py-2 px-2 text-center font-semibold">BB</th>
                <th className="py-2 px-2 text-center font-semibold">K</th>
                <th className="py-2 px-2 text-center font-semibold">HR</th>
                <th className="py-2 px-2 text-center font-semibold">ERA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11.5px]">
              {pitchingRows.length > 0 ? (
                pitchingRows.map((p: any, idx: number) => {
                  const pit = p.stats?.pitching || {};
                  const s = p.seasonStats?.pitching || {};
                  return (
                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2 px-3 font-sans font-medium text-slate-200 truncate">
                        <button
                          onClick={() => onSelectPlayer?.(p.person?.id, p.person?.fullName)}
                          className="hover:text-amber-400 hover:underline text-left"
                        >
                          {p.person?.fullName}
                        </button>
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-white">{pit.inningsPitched ?? '0.0'}</td>
                      <td className="py-2 px-2 text-center">{pit.hits ?? 0}</td>
                      <td className="py-2 px-2 text-center text-red-300">{pit.runs ?? 0}</td>
                      <td className="py-2 px-2 text-center text-red-400">{pit.earnedRuns ?? 0}</td>
                      <td className="py-2 px-2 text-center">{pit.baseOnBalls ?? 0}</td>
                      <td className="py-2 px-2 text-center font-bold text-amber-300">{pit.strikeOuts ?? 0}</td>
                      <td className="py-2 px-2 text-center">{pit.homeRuns ?? 0}</td>
                      <td className="py-2 px-2 text-center text-slate-400">{s.era ?? (pit.era || '—')}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-slate-500 font-sans">
                    Нет данных по питчингу
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
