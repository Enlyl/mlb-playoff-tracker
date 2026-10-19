import React, { useState } from 'react';
import {
  Trophy,
  Star,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  Flame,
  Zap,
} from 'lucide-react';
import { PostseasonSeries, MLBGame, getTeamLogoUrl } from '../services/mlbApi';

interface InteractiveBracketTreeProps {
  seriesList: PostseasonSeries[];
  favoriteTeamId?: number;
  onSelectTeam?: (teamId: number, teamName: string) => void;
  onSelectGame?: (game: MLBGame) => void;
  picksMode?: boolean;
  picks?: Record<string, number>;
  onSetPick?: (seriesKey: string, teamId: number, e?: React.MouseEvent) => void;
}

export const InteractiveBracketTree: React.FC<InteractiveBracketTreeProps> = ({
  seriesList,
  favoriteTeamId,
  onSelectTeam,
  onSelectGame,
  picksMode = false,
  picks = {},
  onSetPick,
}) => {
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  // Group by round
  const worldSeries = seriesList.find((s) => s.series?.gameType === 'W');
  const alLcs = seriesList.find((s) => s.series?.gameType === 'L' && (s.seriesDescription.includes('AL') || (s.games?.[0]?.teams.away.team.league?.id === 103)));
  const nlLcs = seriesList.find((s) => s.series?.gameType === 'L' && (s.seriesDescription.includes('NL') || (s.games?.[0]?.teams.away.team.league?.id === 104)));

  const alDs = seriesList.filter((s) => s.series?.gameType === 'D' && s.seriesDescription.includes('AL'));
  const nlDs = seriesList.filter((s) => s.series?.gameType === 'D' && s.seriesDescription.includes('NL'));

  const alWc = seriesList.filter((s) => s.series?.gameType === 'F' && s.seriesDescription.includes('AL'));
  const nlWc = seriesList.filter((s) => s.series?.gameType === 'F' && s.seriesDescription.includes('NL'));

  const getSeriesData = (s?: PostseasonSeries) => {
    if (!s || !s.games || s.games.length === 0) {
      return {
        awayTeam: null,
        homeTeam: null,
        awayWins: 0,
        homeWins: 0,
        winner: null,
        targetWins: 4,
        isScheduled: true,
        isLive: false,
        key: 'tbd',
      };
    }

    const firstGame = s.games[0];
    const awayTeam = firstGame.teams.away.team;
    const homeTeam = firstGame.teams.home.team;

    let awayWins = 0;
    let homeWins = 0;
    let hasPlayed = false;
    let isLive = false;

    s.games.forEach((g) => {
      if (g.status?.abstractGameState === 'Live') isLive = true;
      if (g.status?.abstractGameState === 'Final') {
        hasPlayed = true;
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
    const winner = awayWins >= targetWins ? awayTeam : homeWins >= targetWins ? homeTeam : null;

    const key = `${s.series?.gameType || 'S'}-${awayTeam.id}-${homeTeam.id}`;

    return {
      awayTeam,
      homeTeam,
      awayWins,
      homeWins,
      winner,
      targetWins,
      isScheduled: !hasPlayed,
      isLive,
      key,
    };
  };

  // Node Component for Single Series in the Tree
  const SeriesNode: React.FC<{
    series?: PostseasonSeries;
    title: string;
    roundTag: string;
    align?: 'left' | 'right' | 'center';
    leagueColor?: string;
  }> = ({ series, title, roundTag, align = 'left', leagueColor = '#3b82f6' }) => {
    const data = getSeriesData(series);
    const isSelected = selectedSeriesId === data.key;

    const isAwayFav = Boolean(favoriteTeamId && data.awayTeam?.id === favoriteTeamId);
    const isHomeFav = Boolean(favoriteTeamId && data.homeTeam?.id === favoriteTeamId);
    const isFavSeries = isAwayFav || isHomeFav;

    const currentPick = picks[data.key];

    return (
      <div
        onClick={() => {
          if (data.key !== 'tbd') setSelectedSeriesId(data.key);
        }}
        className={`relative w-[210px] sm:w-[230px] rounded-2xl p-2.5 transition-all duration-300 select-none cursor-pointer group ${
          isSelected
            ? 'ring-2 ring-amber-400 bg-slate-900 shadow-[0_0_24px_rgba(245,158,11,0.25)] scale-[1.02]'
            : 'bg-[#111622]/90 hover:bg-[#161d2d] border border-white/10 hover:border-white/20 shadow-lg'
        } ${isFavSeries ? 'ring-1 ring-amber-400/40' : ''}`}
      >
        {/* Header Tag */}
        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-white/[0.06]">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            {roundTag}
          </span>
          <div className="flex items-center gap-1">
            {data.isLive && (
              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-red-500 text-white animate-pulse">
                LIVE
              </span>
            )}
            {isFavSeries && (
              <span className="px-1 py-0.2 rounded text-[8.5px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shadow-sm">
                <Star className="w-2 h-2 fill-current" />
                МОЯ
              </span>
            )}
            <span className="text-[9px] font-mono font-bold text-slate-400">
              {data.isScheduled ? `до ${data.targetWins}` : `${data.awayWins}-${data.homeWins}`}
            </span>
          </div>
        </div>

        {/* Away Team */}
        <div
          className={`flex items-center justify-between p-1.5 rounded-xl transition ${
            data.winner?.id === data.awayTeam?.id
              ? 'bg-emerald-500/15 font-black text-emerald-300'
              : data.winner
              ? 'opacity-40 text-slate-400'
              : 'text-slate-200'
          } ${isAwayFav ? 'text-amber-300 font-bold' : ''}`}
        >
          <div
            className="flex items-center gap-2 truncate cursor-pointer"
            onClick={(e) => {
              if (data.awayTeam?.id && data.awayTeam.id < 2000) {
                e.stopPropagation();
                onSelectTeam?.(data.awayTeam.id, data.awayTeam.name);
              }
            }}
          >
            {data.awayTeam?.id && data.awayTeam.id < 2000 ? (
              <img src={getTeamLogoUrl(data.awayTeam.id)} alt="" className="w-5 h-5 object-contain shrink-0" />
            ) : (
              <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] text-slate-400">
                ?
              </span>
            )}
            <span className="text-xs font-bold truncate">
              {data.awayTeam?.name || 'Победитель WC'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {picksMode && !data.winner && data.awayTeam?.id && (
              <button
                onClick={(e) => onSetPick?.(data.key, data.awayTeam!.id, e)}
                className={`text-[9px] font-black px-1.5 py-0.5 rounded transition ${
                  currentPick === data.awayTeam.id
                    ? 'bg-emerald-400 text-slate-950 shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
              >
                {currentPick === data.awayTeam.id ? '✓' : '+'}
              </button>
            )}
            <span className="font-mono font-black text-sm tabular-nums w-4 text-right">
              {data.isScheduled ? '-' : data.awayWins}
            </span>
          </div>
        </div>

        {/* Home Team */}
        <div
          className={`flex items-center justify-between p-1.5 rounded-xl transition mt-0.5 ${
            data.winner?.id === data.homeTeam?.id
              ? 'bg-emerald-500/15 font-black text-emerald-300'
              : data.winner
              ? 'opacity-40 text-slate-400'
              : 'text-slate-200'
          } ${isHomeFav ? 'text-amber-300 font-bold' : ''}`}
        >
          <div
            className="flex items-center gap-2 truncate cursor-pointer"
            onClick={(e) => {
              if (data.homeTeam?.id && data.homeTeam.id < 2000) {
                e.stopPropagation();
                onSelectTeam?.(data.homeTeam.id, data.homeTeam.name);
              }
            }}
          >
            {data.homeTeam?.id && data.homeTeam.id < 2000 ? (
              <img src={getTeamLogoUrl(data.homeTeam.id)} alt="" className="w-5 h-5 object-contain shrink-0" />
            ) : (
              <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] text-slate-400">
                ?
              </span>
            )}
            <span className="text-xs font-bold truncate">
              {data.homeTeam?.name || 'Победитель Серии'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {picksMode && !data.winner && data.homeTeam?.id && (
              <button
                onClick={(e) => onSetPick?.(data.key, data.homeTeam!.id, e)}
                className={`text-[9px] font-black px-1.5 py-0.5 rounded transition ${
                  currentPick === data.homeTeam.id
                    ? 'bg-emerald-400 text-slate-950 shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
              >
                {currentPick === data.homeTeam.id ? '✓' : '+'}
              </button>
            )}
            <span className="font-mono font-black text-sm tabular-nums w-4 text-right">
              {data.isScheduled ? '-' : data.homeWins}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── INTERACTIVE VISUAL BRACKET TREE ── */}
      <div className="overflow-x-auto pb-4 scrollbar-thin">
        <div className="min-w-[1080px] p-6 bg-[#0a0e17] rounded-3xl border border-white/10 shadow-2xl relative">
          
          {/* Header Row: Stage Names */}
          <div className="grid grid-cols-5 text-center text-xs font-black uppercase tracking-widest text-slate-400 border-b border-white/[0.08] pb-3 mb-6">
            <div className="text-blue-400">Wild Card (AL)</div>
            <div className="text-blue-300">Дивизион (ALDS)</div>
            <div className="text-amber-400 font-extrabold flex items-center justify-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
              Мировая Серия 2026
            </div>
            <div className="text-amber-300">Дивизион (NLDS)</div>
            <div className="text-amber-400">Wild Card (NL)</div>
          </div>

          {/* Bracket Grid (AL Left -> World Series Center <- NL Right) */}
          <div className="grid grid-cols-5 gap-6 items-center">
            
            {/* COLUMN 1: AL Wild Card (2 series) */}
            <div className="space-y-6 flex flex-col justify-around h-full">
              <SeriesNode
                series={alWc[0]}
                title="AL Wild Card #1"
                roundTag="AL Wild Card"
                leagueColor="#3b82f6"
              />
              <SeriesNode
                series={alWc[1]}
                title="AL Wild Card #2"
                roundTag="AL Wild Card"
                leagueColor="#3b82f6"
              />
            </div>

            {/* COLUMN 2: ALDS (2 series) */}
            <div className="space-y-12 flex flex-col justify-around h-full">
              <SeriesNode
                series={alDs[0]}
                title="ALDS #1"
                roundTag="ALDS (до 3)"
                leagueColor="#60a5fa"
              />
              <SeriesNode
                series={alDs[1]}
                title="ALDS #2"
                roundTag="ALDS (до 3)"
                leagueColor="#60a5fa"
              />
            </div>

            {/* COLUMN 3: CENTER (ALCS, World Series, NLCS) */}
            <div className="flex flex-col items-center justify-center space-y-6">
              {/* ALCS */}
              <div className="w-full flex justify-center">
                <SeriesNode
                  series={alLcs}
                  title="ALCS"
                  roundTag="ALCS • Финал Лиги (до 4)"
                  leagueColor="#3b82f6"
                  align="center"
                />
              </div>

              {/* WORLD SERIES GOLDEN HERO BOX */}
              <div className="p-4 rounded-3xl bg-gradient-to-b from-amber-500/20 to-amber-950/40 border-2 border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.3)] w-[260px] text-center relative overflow-hidden group">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-6 h-6 text-amber-400 filter drop-shadow-md" />
                  <span className="font-black text-amber-300 text-xs uppercase tracking-widest">
                    World Series 2026
                  </span>
                </div>

                {worldSeries ? (
                  <SeriesNode
                    series={worldSeries}
                    title="World Series"
                    roundTag="Финал (Best of 7)"
                    leagueColor="#f59e0b"
                    align="center"
                  />
                ) : (
                  <div className="py-6 px-2 text-center text-slate-300 space-y-1">
                    <p className="font-extrabold text-sm text-white">Победитель AL vs Победитель NL</p>
                    <p className="text-[11px] text-slate-400 font-mono">23 - 31 октября 2026</p>
                  </div>
                )}
              </div>

              {/* NLCS */}
              <div className="w-full flex justify-center">
                <SeriesNode
                  series={nlLcs}
                  title="NLCS"
                  roundTag="NLCS • Финал Лиги (до 4)"
                  leagueColor="#f59e0b"
                  align="center"
                />
              </div>
            </div>

            {/* COLUMN 4: NLDS (2 series) */}
            <div className="space-y-12 flex flex-col justify-around h-full">
              <SeriesNode
                series={nlDs[0]}
                title="NLDS #1"
                roundTag="NLDS (до 3)"
                leagueColor="#fbbf24"
              />
              <SeriesNode
                series={nlDs[1]}
                title="NLDS #2"
                roundTag="NLDS (до 3)"
                leagueColor="#fbbf24"
              />
            </div>

            {/* COLUMN 5: NL Wild Card (2 series) */}
            <div className="space-y-6 flex flex-col justify-around h-full">
              <SeriesNode
                series={nlWc[0]}
                title="NL Wild Card #1"
                roundTag="NL Wild Card"
                leagueColor="#f59e0b"
              />
              <SeriesNode
                series={nlWc[1]}
                title="NL Wild Card #2"
                roundTag="NL Wild Card"
                leagueColor="#f59e0b"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
