import { MLBGame } from '../services/mlbApi';

export interface GameExcitementRating {
  score: number; // 0 to 10 scale (e.g. 9.8)
  label: string; // e.g. "Триллер до последнего аута"
  badges: string[]; // e.g. ["1 очко разницы", "11 иннингов", "Walk-off"]
  accent: 'amber' | 'rose' | 'emerald' | 'blue';
}

/**
 * Calculates a sabermetric-inspired excitement rating (0 - 10) for completed baseball games.
 * Considers score closeness, extra innings, total scoring, late-game drama, and walk-offs.
 */
export function calculateGameExcitement(game: MLBGame): GameExcitementRating {
  const awayScore = game.teams.away.score ?? 0;
  const homeScore = game.teams.home.score ?? 0;
  const diff = Math.abs(awayScore - homeScore);
  const totalRuns = awayScore + homeScore;
  const innings = game.linescore?.currentInning || game.linescore?.innings?.length || 9;

  let points = 50;
  const badges: string[] = [];

  // 1. Closeness of score (up to 35 pts)
  if (diff === 1) {
    points += 35;
    badges.push('1 очко разницы');
  } else if (diff === 2) {
    points += 22;
    badges.push('Плотный счёт');
  } else if (diff === 3) {
    points += 10;
  } else if (diff >= 7) {
    points -= 15;
  }

  // 2. Extra innings (up to 25 pts)
  if (innings > 9) {
    points += 25;
    badges.push(`${innings} иннингов`);
  }

  // 3. High slugfest or tight pitcher's duel (up to 15 pts)
  if (totalRuns >= 12) {
    points += 15;
    badges.push(`${totalRuns} ранов`);
  } else if (totalRuns <= 3 && diff === 1) {
    points += 15;
    badges.push('Дуэль питчеров');
  }

  // 4. Walk-off drama (home won and scored in 9th or later)
  const homeWon = homeScore > awayScore;
  const lastInningHomeRuns = game.linescore?.innings?.[game.linescore.innings.length - 1]?.home?.runs ?? 0;
  if (homeWon && lastInningHomeRuns > 0 && diff <= 2) {
    points += 15;
    badges.push('Walk-off');
  }

  // 5. Playoff importance
  const desc = (game.seriesDescription || '').toLowerCase();
  if (desc.includes('world series') || desc.includes('ws') || desc.includes('мировая')) {
    points += 12;
    badges.push('Мировая серия');
  } else if (desc.includes('alcs') || desc.includes('nlcs') || desc.includes('финал')) {
    points += 8;
    badges.push('Финал лиги');
  } else if (desc.includes('alds') || desc.includes('nlds')) {
    points += 6;
  }

  // Normalize score into 7.2 - 9.9 scale
  const rawScore = 7.2 + (points / 100) * 2.6;
  const score = Math.min(9.9, Math.max(7.0, Number(rawScore.toFixed(1))));

  let label = 'Яркий матч';
  let accent: 'amber' | 'rose' | 'emerald' | 'blue' = 'amber';

  if (innings > 9) {
    label = 'Овертайм • Экстра-иннинги';
    accent = 'rose';
  } else if (diff === 1 && totalRuns >= 10) {
    label = 'Перестрелка в 1 очко';
    accent = 'rose';
  } else if (diff === 1 && totalRuns <= 3) {
    label = 'Дуэль питчеров 1 очко';
    accent = 'blue';
  } else if (diff === 1) {
    label = 'Триллер до последнего аута';
    accent = 'amber';
  } else if (diff === 2) {
    label = 'Драматичная концовка';
    accent = 'emerald';
  }

  return {
    score,
    label,
    badges: badges.slice(0, 3),
    accent,
  };
}
