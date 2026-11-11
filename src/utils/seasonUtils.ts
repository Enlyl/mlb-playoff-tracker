/**
 * Season detection and management utilities for MLB Playoff Tracker.
 * Uses MLB Stats API to determine the current season and available seasons.
 */

const CACHE_KEY = 'mlb_current_season';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

interface CachedSeason {
  season: number;
  ts: number;
}

/**
 * Get current season synchronously from cache or fallback to current year.
 * Used as a default value before the async fetch completes.
 */
export function getCurrentSeasonSync(): number {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached: CachedSeason = JSON.parse(raw);
      if (Date.now() - cached.ts < CACHE_TTL) {
        return cached.season;
      }
    }
  } catch { /* noop */ }

  // Fallback: determine from date
  const now = new Date();
  const month = now.getMonth() + 1; // 1-based
  const year = now.getFullYear();

  // MLB season ends in late October (World Series).
  // In November/December, the champion is crowned and league moves to upcoming year.
  if (month >= 11) {
    return year + 1;
  }
  return year;
}

/**
 * Fetch current season from MLB API and cache it.
 * If current year postseason is finished (postSeasonEndDate has passed),
 * automatically switches to upcoming season (2027).
 */
export async function fetchCurrentSeason(): Promise<number> {
  try {
    const res = await fetch('https://statsapi.mlb.com/api/v1/seasons/current?sportId=1');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const seasonInfo = data.seasons?.[0];
    let season = Number(seasonInfo?.seasonId);

    // If World Series is finished, automatically advance to next season
    if (seasonInfo?.postSeasonEndDate) {
      const postSeasonEnd = new Date(seasonInfo.postSeasonEndDate);
      const now = new Date();
      if (now.getTime() > postSeasonEnd.getTime()) {
        season = season + 1;
      }
    }

    if (season && season > 2000) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ season, ts: Date.now() } as CachedSeason));
      return season;
    }
  } catch (err) {
    console.warn('[seasonUtils] Failed to fetch current season:', err);
  }
  return getCurrentSeasonSync();
}

/**
 * Get the list of seasons available for the user to switch between.
 * Shows current season + 1 (if data exists) and 3 previous seasons.
 */
export function getAvailableSeasons(currentSeason: number): number[] {
  const seasons: number[] = [];
  // Next season (preview — if schedule data exists)
  seasons.push(currentSeason + 1);
  // Current and previous seasons
  for (let i = 0; i <= 3; i++) {
    seasons.push(currentSeason - i);
  }
  // Remove duplicates and sort descending
  return [...new Set(seasons)].sort((a, b) => b - a);
}

const MANUAL_SEASON_KEY = 'mlb_manual_season_selected';

/**
 * Check whether user has explicitly selected a season manually in the UI.
 */
export function isManualSeasonSelected(): boolean {
  try {
    return localStorage.getItem(MANUAL_SEASON_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Get user-selected season from localStorage.
 * Falls back to auto-detected current season.
 */
export function getSelectedSeason(): number {
  try {
    const saved = localStorage.getItem('mlb_selected_season');
    if (saved) {
      const num = Number(saved);
      if (num > 2000) return num;
    }
  } catch { /* noop */ }
  return getCurrentSeasonSync();
}

/**
 * Known Opening Day dates for modern MLB seasons.
 */
export const SEASON_OPENING_DAYS: Record<number, string> = {
  2027: '2027-03-25',
  2026: '2026-03-26',
  2025: '2025-03-27',
  2024: '2024-03-28',
  2023: '2023-03-30',
};

/**
 * Get the earliest game date (Opening Day or first scheduled date) for a given season.
 * Queries the MLB Stats API and falls back to known calendar dates.
 */
export async function getSeasonFirstGameDate(season: number): Promise<string> {
  try {
    const res = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=${season}&gameType=R`);
    if (res.ok) {
      const data = await res.json();
      if (data.dates && data.dates.length > 0 && data.dates[0].date) {
        return data.dates[0].date;
      }
    }
  } catch {
    /* fallback to known date */
  }
  return SEASON_OPENING_DAYS[season] || `${season}-03-25`;
}

/**
 * Persist user-selected season to localStorage.
 * If isManual is true, flags that the choice was deliberately made by the user
 * and should never be automatically overwritten on page reload.
 */
export function saveSelectedSeason(season: number, isManual = true): void {
  try {
    localStorage.setItem('mlb_selected_season', String(season));
    if (isManual) {
      localStorage.setItem(MANUAL_SEASON_KEY, 'true');
    }
  } catch { /* noop */ }
}
