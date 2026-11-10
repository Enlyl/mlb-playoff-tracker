/**
 * Season theme and visual identity definition.
 * Each MLB season has unique color palettes, championship details and visual accents.
 */

export interface SeasonTheme {
  year: number;
  label: string;
  badgeLabel: string;
  champion: string | null;
  statusText: string;
  primaryColor: string;     // Hex
  secondaryColor: string;   // Hex
  accentColor: string;      // Hex
  glowRgba: string;         // Ambient radial glow
  borderRgba: string;       // Border tint
  badgeBg: string;          // Tailwind badge class
  badgeText: string;        // Tailwind text class
  gradient: string;         // CSS gradient
  themeClass: string;       // Unique class name
  headline: string;
}

export const SEASON_THEMES: Record<number, SeasonTheme> = {
  2027: {
    year: 2027,
    label: 'Сезон 2027',
    badgeLabel: '2027 • Скоро старт',
    champion: null,
    statusText: 'Регулярный сезон стартует 25 марта 2027',
    primaryColor: '#10b981',       // Emerald
    secondaryColor: '#06b6d4',     // Cyan
    accentColor: '#34d399',
    glowRgba: 'rgba(16, 185, 129, 0.18)',
    borderRgba: 'rgba(16, 185, 129, 0.35)',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeText: '#34d399',
    gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    themeClass: 'season-theme-2027',
    headline: 'Новая эра бейсбола',
  },
  2026: {
    year: 2026,
    label: 'Сезон 2026',
    badgeLabel: '2026 • Brewers Чемпионы',
    champion: 'Milwaukee Brewers',
    statusText: 'Чемпионы Мировой Серии: Milwaukee Brewers (4-1 против Rays)',
    primaryColor: '#f59e0b',       // Brewers Championship Gold
    secondaryColor: '#2563eb',     // Brewers Navy Blue
    accentColor: '#fbbf24',
    glowRgba: 'rgba(245, 158, 11, 0.18)',
    borderRgba: 'rgba(245, 158, 11, 0.35)',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeText: '#fbbf24',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #3b82f6 100%)',
    themeClass: 'season-theme-2026',
    headline: 'Золотой триумф Брюэрс',
  },
  2025: {
    year: 2025,
    label: 'Сезон 2025',
    badgeLabel: '2025 • Сезон MLB',
    champion: null,
    statusText: 'Архив сезона MLB 2025',
    primaryColor: '#3b82f6',       // Electric Sapphire
    secondaryColor: '#8b5cf6',     // Violet
    accentColor: '#60a5fa',
    glowRgba: 'rgba(59, 130, 246, 0.18)',
    borderRgba: 'rgba(59, 130, 246, 0.35)',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeText: '#60a5fa',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    themeClass: 'season-theme-2025',
    headline: 'Сапфировая классика',
  },
  2024: {
    year: 2024,
    label: 'Сезон 2024',
    badgeLabel: '2024 • Dodgers Чемпионы',
    champion: 'Los Angeles Dodgers',
    statusText: 'Чемпионы Мировой Серии: Los Angeles Dodgers (4-1 против Yankees)',
    primaryColor: '#1d4ed8',       // Dodger Blue
    secondaryColor: '#eab308',     // Trophy Gold
    accentColor: '#60a5fa',
    glowRgba: 'rgba(29, 78, 216, 0.22)',
    borderRgba: 'rgba(29, 78, 216, 0.4)',
    badgeBg: 'rgba(29, 78, 216, 0.18)',
    badgeText: '#93c5fd',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #eab308 100%)',
    themeClass: 'season-theme-2024',
    headline: 'Триумф Доджерс и Гранд-слэм Фримена',
  },
  2023: {
    year: 2023,
    label: 'Сезон 2023',
    badgeLabel: '2023 • Rangers Чемпионы',
    champion: 'Texas Rangers',
    statusText: 'Чемпионы Мировой Серии: Texas Rangers (4-1 против D-backs)',
    primaryColor: '#dc2626',       // Rangers Crimson
    secondaryColor: '#2563eb',     // Rangers Royal
    accentColor: '#f87171',
    glowRgba: 'rgba(220, 38, 38, 0.2)',
    borderRgba: 'rgba(220, 38, 38, 0.4)',
    badgeBg: 'rgba(220, 38, 38, 0.18)',
    badgeText: '#fca5a5',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #2563eb 100%)',
    themeClass: 'season-theme-2023',
    headline: 'Первое в истории чемпионство Техаса',
  },
};

export function getSeasonTheme(year: number): SeasonTheme {
  if (SEASON_THEMES[year]) {
    return SEASON_THEMES[year];
  }
  // Generic fallback for any other year
  return {
    year,
    label: `Сезон ${year}`,
    badgeLabel: `${year} • Архив MLB`,
    champion: null,
    statusText: `Архивные матчи и статистика сезона MLB ${year}`,
    primaryColor: '#6366f1',
    secondaryColor: '#a855f7',
    accentColor: '#818cf8',
    glowRgba: 'rgba(99, 102, 241, 0.18)',
    borderRgba: 'rgba(99, 102, 241, 0.35)',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    badgeText: '#a5b4fc',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    themeClass: `season-theme-${year}`,
    headline: `Сезон MLB ${year}`,
  };
}
