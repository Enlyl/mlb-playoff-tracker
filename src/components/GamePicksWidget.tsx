import React, { useState } from 'react';
import {
  Flame,
  Trophy,
  Copy,
  Check,
  Play,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MLBGame, getTeamLogoUrl } from '../services/mlbApi';

interface GamePicksWidgetProps {
  games: MLBGame[];
  onSelectGame: (game: MLBGame) => void;
}

interface SpectacleResult {
  score: number;
  tags: string[];
  walkoff: boolean;
  comeback: number;
  changes: number;
  total: number;
  margin: number;
  nInn: number;
}

const ROUND_RU_SHORT: Record<string, string> = {
  F: 'Wild Card',
  D: 'Дивизионная серия',
  L: 'Серия чемпионата лиги',
  W: 'Мировая серия',
};

// Calculate game excitement score based on score, comebacks, walkoffs, extra-innings
function calculateGameSpectacle(g: MLBGame): SpectacleResult | null {
  if (g.status?.abstractGameState !== 'Final') return null;
  const aS = g.teams.away.score;
  const hS = g.teams.home.score;
  if (aS == null || hS == null || aS === hS) return null;

  const margin = Math.abs(aS - hS);
  const total = aS + hS;
  const homeWon = hS > aS;
  const inns = g.linescore?.innings || [];
  const nInn = inns.length || g.linescore?.currentInning || 9;

  let score = 0;
  const tags: string[] = [];

  if (margin === 1) {
    score += 30;
    tags.push('Разница в 1 очко');
  } else if (margin === 2) {
    score += 18;
    tags.push('Разница в 2 очка');
  } else if (margin === 3) {
    score += 8;
  } else if (margin >= 8) {
    score -= 10;
  }

  if (nInn > 9) {
    score += 12 + Math.min(nInn - 9, 6) * 4;
    tags.push(`Экстра-иннинги (${nInn})`);
  }

  // Combacks and lead changes
  let ca = 0;
  let ch = 0;
  let maxDef = 0;
  let changes = 0;
  let lastLead = 0;

  const step = () => {
    const winnerDiff = homeWon ? ch - ca : ca - ch;
    if (winnerDiff < 0) maxDef = Math.max(maxDef, -winnerDiff);
    const lead = Math.sign(ch - ca);
    if (lead !== 0) {
      if (lastLead !== 0 && lead !== lastLead) changes++;
      lastLead = lead;
    }
  };

  inns.forEach((inn) => {
    ca += inn.away?.runs || 0;
    step();
    ch += inn.home?.runs || 0;
    step();
  });

  const last = inns[inns.length - 1];
  const lastHome = last?.home?.runs || 0;
  const walkoff = homeWon && nInn >= 9 && lastHome > 0 && (hS - lastHome) <= aS;
  if (walkoff) {
    score += 20;
    tags.push('Волк-офф: победа последним ударом');
  }

  if (maxDef >= 3) {
    score += Math.min(maxDef * 4, 40);
    tags.push(`Камбэк с −${maxDef}`);
  }

  if (changes >= 2) {
    score += Math.min(changes * 5, 25);
    tags.push(`Смен лидера: ${changes}`);
  }

  if (total >= 18) {
    score += 15;
    tags.push(`Перестрелка: ${total} очков`);
  } else if (total >= 14) {
    score += 8;
    tags.push(`Много очков: ${total}`);
  }

  if (total <= 3 && margin <= 1) {
    score += 10;
    tags.push('Питчерская дуэль');
  }

  const gType = (g as any).gameType as string | undefined;
  const rbMap: Record<string, number> = { F: 15, D: 25, L: 35, W: 50 };
  const rb = gType ? rbMap[gType] || 0 : 0;
  if (rb) {
    score += rb;
    tags.push(ROUND_RU_SHORT[gType || ''] || 'Плей-офф');
  }

  if (rb && g.gamesInSeries && g.seriesGameNumber === g.gamesInSeries) {
    score += 20;
    tags.push('Решающая игра серии');
  }

  return { score, tags, margin, nInn, walkoff, comeback: maxDef, changes, total };
}

export const GamePicksWidget: React.FC<GamePicksWidgetProps> = ({ games, onSelectGame }) => {
  const [copiedPk, setCopiedPk] = useState<number | null>(null);
  const [showMore, setShowMore] = useState<boolean>(false);

  const finalGames = games.filter((g) => g.status?.abstractGameState === 'Final');
  if (finalGames.length === 0) return null;

  // Grade games
  const graded = finalGames
    .map((g) => ({ g, sp: calculateGameSpectacle(g) }))
    .filter((x): x is { g: MLBGame; sp: SpectacleResult } => x.sp !== null)
    .sort((a, b) => b.sp.score - a.sp.score);

  if (graded.length === 0) return null;

  const matchOfDay = graded[0];
  const matchOfWeek = graded.length > 1 ? graded[1] : null;
  const otherMatches = graded.slice(2, 6);

  const copySearchString = (e: React.MouseEvent, g: MLBGame) => {
    e.stopPropagation();
    const date = new Date(g.gameDate);
    const dStr = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    const text = `${dStr} / ${g.teams.away.team.name} @ ${g.teams.home.team.name}`;
    navigator.clipboard.writeText(text);
    setCopiedPk(g.gamePk);
    setTimeout(() => setCopiedPk(null), 2000);
  };

  return (
    <div className="glass-shell glass-card mb-6" style={{ padding: '1px' }}>
      <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>Что смотреть: самые зрелищные матчи</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AI Анализ драмы
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Оценка по камбэкам, волк-оффам, экстра-иннингам и накалу борьбы
              </p>
            </div>
          </div>
        </div>

        {/* Featured Matches Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Match of the Day */}
          {matchOfDay && (
            <div
              onClick={() => onSelectGame(matchOfDay.g)}
              className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-slate-950 border border-amber-400/30 hover:border-amber-400/60 cursor-pointer transition shadow-lg relative group overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="flex items-center gap-1.5 text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  <Flame className="w-3.5 h-3.5 fill-amber-400" />
                  Матч дня — смотреть обязательно
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Рейтинг: {matchOfDay.sp.score} pts
                </span>
              </div>

              {/* Matchup */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={getTeamLogoUrl(matchOfDay.g.teams.away.team.id)}
                    alt=""
                    className="w-7 h-7 object-contain"
                  />
                  <span className="text-sm font-black text-slate-950 dark:text-white">
                    {matchOfDay.g.teams.away.team.name}
                  </span>
                </div>
                <div className="font-mono font-black text-lg text-amber-700 dark:text-amber-300 px-3 py-1 rounded-xl bg-amber-500/10 dark:bg-slate-950/80 border border-amber-500/30">
                  {matchOfDay.g.teams.away.score} : {matchOfDay.g.teams.home.score}
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-slate-950 dark:text-white text-right">
                    {matchOfDay.g.teams.home.team.name}
                  </span>
                  <img
                    src={getTeamLogoUrl(matchOfDay.g.teams.home.team.id)}
                    alt=""
                    className="w-7 h-7 object-contain"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {matchOfDay.sp.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-white/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.08] text-xs">
                <button
                  onClick={(e) => copySearchString(e, matchOfDay.g)}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                  title="Скопировать поисковый запрос для торрента / трекера"
                >
                  {copiedPk === matchOfDay.g.gamePk ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Поиск для трекера</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] font-bold text-amber-300 group-hover:translate-x-0.5 transition flex items-center gap-1">
                  Смотреть анализ →
                </span>
              </div>
            </div>
          )}

          {/* Match of the Week */}
          {matchOfWeek && (
            <div
              onClick={() => onSelectGame(matchOfWeek.g)}
              className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-slate-900/60 to-slate-950 border border-cyan-400/30 hover:border-cyan-400/60 cursor-pointer transition shadow-lg relative group overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="flex items-center gap-1.5 text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                  <Trophy className="w-3.5 h-3.5 text-cyan-300" />
                  Матч недели — стоит скачать
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Рейтинг: {matchOfWeek.sp.score} pts
                </span>
              </div>

              {/* Matchup */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={getTeamLogoUrl(matchOfWeek.g.teams.away.team.id)}
                    alt=""
                    className="w-7 h-7 object-contain"
                  />
                  <span className="text-sm font-black text-slate-950 dark:text-white">
                    {matchOfWeek.g.teams.away.team.name}
                  </span>
                </div>
                <div className="font-mono font-black text-lg text-cyan-700 dark:text-cyan-300 px-3 py-1 rounded-xl bg-cyan-500/10 dark:bg-slate-950/80 border border-cyan-500/30">
                  {matchOfWeek.g.teams.away.score} : {matchOfWeek.g.teams.home.score}
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-slate-950 dark:text-white text-right">
                    {matchOfWeek.g.teams.home.team.name}
                  </span>
                  <img
                    src={getTeamLogoUrl(matchOfWeek.g.teams.home.team.id)}
                    alt=""
                    className="w-7 h-7 object-contain"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {matchOfWeek.sp.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-white/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.08] text-xs">
                <button
                  onClick={(e) => copySearchString(e, matchOfWeek.g)}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                  title="Скопировать поисковый запрос для торрента / трекера"
                >
                  {copiedPk === matchOfWeek.g.gamePk ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Поиск для трекера</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] font-bold text-cyan-300 group-hover:translate-x-0.5 transition flex items-center gap-1">
                  Смотреть анализ →
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible More Matches */}
        {otherMatches.length > 0 && (
          <div>
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition py-1"
            >
              <span>{showMore ? 'Скрыть топ других игр' : `Ещё зрелищные матчи (${otherMatches.length})`}</span>
              {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showMore && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
                {otherMatches.map(({ g, sp }, idx) => (
                  <div
                    key={`${g.gamePk}-${idx}`}
                    onClick={() => onSelectGame(g)}
                    className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/50 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 cursor-pointer transition flex items-center justify-between shadow-sm"
                  >
                    <div className="truncate pr-2">
                      <div className="text-xs font-black text-slate-950 dark:text-white truncate">
                        {g.teams.away.team.name} @ {g.teams.home.team.name}
                      </div>
                      <div className="flex gap-1 mt-1 truncate">
                        {sp.tags.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="text-[9px] bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded font-semibold">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="font-mono font-black text-xs text-amber-700 dark:text-amber-300 shrink-0">
                      {g.teams.away.score} : {g.teams.home.score}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
