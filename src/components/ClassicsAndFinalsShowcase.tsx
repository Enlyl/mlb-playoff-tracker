import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Flame,
  Star,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Medal,
  Calendar,
  Layers,
} from 'lucide-react';
import { MLBGame, PostseasonSeries, getPostseasonSeries, getTeamLogoUrl } from '../services/mlbApi';
import { getSeasonTheme } from '../utils/seasonThemes';

interface ClassicsAndFinalsShowcaseProps {
  onSelectGame: (game: MLBGame) => void;
  favoriteTeamId: number | null;
  season?: number;
}

interface CuratedThriller {
  id: string;
  gamePk: number;
  season: number;
  title: string;
  subtitle: string;
  headline: string;
  story: string;
  scoreSummary: string;
  excitementScore: string;
  tags: string[];
  gameDate: string;
  teams: {
    away: { id: number; name: string; score: number };
    home: { id: number; name: string; score: number };
  };
}

// ── Curated Greatest Modern Thriller Matches by Season ──
const CURATED_THRILLERS: CuratedThriller[] = [
  // ── 2026 ──
  {
    id: 'ws-2026-g2',
    gamePk: 849802,
    season: 2026,
    title: 'Мировая Серия 2026 • Игра 2',
    subtitle: 'Rays @ Brewers',
    headline: 'Напряженная дуэль финала 2026: победа Милуоки в 1 ран!',
    story: 'Упорная позиционная борьба булпенов. Милуоки отбивается от штурма в 9-м иннинге и защищает победу с минимальной разницей 5:4.',
    scoreSummary: 'TB 4 : 5 MIL',
    excitementScore: '9.7',
    tags: ['Финал 2026', 'Разница в 1 очко', 'Драма 9-го иннинга'],
    gameDate: '2026-10-25T00:00:00Z',
    teams: {
      away: { id: 139, name: 'Tampa Bay Rays', score: 4 },
      home: { id: 158, name: 'Milwaukee Brewers', score: 5 },
    },
  },
  {
    id: 'alcs-2026-g7',
    gamePk: 849808,
    season: 2026,
    title: 'Финал Американской Лиги 2026 • Игра 7',
    subtitle: 'Guardians @ Rays (Седьмой решающий матч)',
    headline: 'Игра на выбывание: путевка в Мировую Серию в решающем 7-м матче!',
    story: 'Максимальный накал серии до 4 побед. Седьмая игра решила судьбу чемпионства Американской лиги в пользу Тампа-Бэй.',
    scoreSummary: 'CLE 3 : 4 TB',
    excitementScore: '9.8',
    tags: ['Game 7', 'Матч жизни и смерти', 'Разница в 1 ран'],
    gameDate: '2026-10-20T00:00:00Z',
    teams: {
      away: { id: 114, name: 'Cleveland Guardians', score: 3 },
      home: { id: 139, name: 'Tampa Bay Rays', score: 4 },
    },
  },
  {
    id: 'ws-2026-g5',
    gamePk: 849799,
    season: 2026,
    title: 'Мировая Серия 2026 • Игра 5',
    subtitle: 'Brewers @ Rays (Чемпионский матч)',
    headline: 'Триумф Милуоки: Брюэрс завоевывают Кубок Мировой Серии!',
    story: 'Пятая игра финала года. Брюэрс закрывают серию со счетом 4-1 и впервые в современной истории берут кубок чемпиона MLB!',
    scoreSummary: 'MIL 4 : 1 TB',
    excitementScore: '9.6',
    tags: ['Чемпионский матч', 'World Series Trophy', 'Серия 4-1'],
    gameDate: '2026-10-29T00:00:00Z',
    teams: {
      away: { id: 158, name: 'Milwaukee Brewers', score: 4 },
      home: { id: 139, name: 'Tampa Bay Rays', score: 1 },
    },
  },

  // ── 2025 ──
  {
    id: 'ws-2025-g7',
    gamePk: 813024,
    season: 2025,
    title: 'Мировая Серия 2025 • Игра 7',
    subtitle: 'Dodgers @ Blue Jays (Решающий 7-й матч)',
    headline: 'Доджерс выигрывают Мировую Серию в драматичном 7-м матче 5:4!',
    story: 'Решающая седьмая игра финала года в Торонто. Доджерс завоевывают второй титул подряд в упорнейшей серии из 7 матчей, отразив финальный штурм на 9-м иннинге!',
    scoreSummary: 'LAD 5 : 4 TOR',
    excitementScore: '9.9',
    tags: ['Game 7', 'Чемпионский матч', 'Серия 4-3', 'Back-to-back'],
    gameDate: '2025-11-02T00:00:00Z',
    teams: {
      away: { id: 119, name: 'Los Angeles Dodgers', score: 5 },
      home: { id: 141, name: 'Toronto Blue Jays', score: 4 },
    },
  },

  // ── 2024 ──
  {
    id: 'ws-2024-g1',
    gamePk: 775300,
    season: 2024,
    title: 'Мировая Серия 2024 • Игра 1',
    subtitle: 'Yankees @ Dodgers (10-й иннинг)',
    headline: 'Первый победный Grand Slam за 120 лет истории Мировой Серии!',
    story: '10-й иннинг, счет 2:3 в пользу Янкис, 2 аута, полные базы. Травмированный Фредди Фримен первым же ударом отправляет мяч на трибуны — легендарный победный Walk-off Grand Slam!',
    scoreSummary: 'NYY 3 : 6 LAD',
    excitementScore: '10.0',
    tags: ['Walk-Off', 'Grand Slam', 'Овертайм', 'Финал года'],
    gameDate: '2024-10-26T00:08:00Z',
    teams: {
      away: { id: 147, name: 'New York Yankees', score: 3 },
      home: { id: 119, name: 'Los Angeles Dodgers', score: 6 },
    },
  },
  {
    id: 'ws-2024-g5',
    gamePk: 775296,
    season: 2024,
    title: 'Мировая Серия 2024 • Игра 5',
    subtitle: 'Dodgers @ Yankees (Золотой матч)',
    headline: 'Величайший чемпионский камбэк со счета 0:5 на «Янки Стэдиум»!',
    story: 'Янкис вели 5:0 после хоум-ранов Джаджа и Чишолма. В 5-м иннинге Доджерс наказали хозяев за ошибки в защите, набрали 5 очков подряд и в 8-м иннинге вырвали чемпионский титул!',
    scoreSummary: 'LAD 7 : 6 NYY',
    excitementScore: '10.0',
    tags: ['Камбэк 0:5', 'Золотой матч', 'Победа в серии 4-1'],
    gameDate: '2024-10-31T00:08:00Z',
    teams: {
      away: { id: 119, name: 'Los Angeles Dodgers', score: 7 },
      home: { id: 147, name: 'New York Yankees', score: 6 },
    },
  },
  {
    id: 'alcs-2024-g3',
    gamePk: 775310,
    season: 2024,
    title: 'Финал Американской Лиги 2024 • Игра 3',
    subtitle: 'Yankees @ Guardians (10-й иннинг)',
    headline: 'Сумасшедшая развязка: два спасительных хоум-рана на 9-м и 10-м иннингах!',
    story: 'Кливленд проигрывал 3:5 на 9-м иннинге при 2 аутах, когда Йонкенси Ноэль сравнял счет 2-рановым хоум-раном. В 10-м иннинге Дэвид Фрай выбил победный уокофф в экстазе переполненных трибун!',
    scoreSummary: 'NYY 5 : 7 CLE',
    excitementScore: '9.9',
    tags: ['Walk-Off HR', '2 аута на 9-м', 'Экстра-иннинги'],
    gameDate: '2024-10-18T21:08:00Z',
    teams: {
      away: { id: 147, name: 'New York Yankees', score: 5 },
      home: { id: 114, name: 'Cleveland Guardians', score: 7 },
    },
  },
  {
    id: 'nlcs-2024-g6',
    gamePk: 775317,
    season: 2024,
    title: 'Финал Национальной Лиги 2024 • Игра 6',
    subtitle: 'Mets @ Dodgers (Выход в WS)',
    headline: 'Огневая мощь Доджерс: Томми Эдман и Охтани выводят команду в Мировую Серию!',
    story: 'Эдман выбил 4 RBI, а нападение Доджерс перебило Метс 10:5, оформив путевку в финал года.',
    scoreSummary: 'NYM 5 : 10 LAD',
    excitementScore: '9.5',
    tags: ['Выход в WS', 'Серия 4-2', 'MVP Эдман'],
    gameDate: '2024-10-21T00:08:00Z',
    teams: {
      away: { id: 121, name: 'New York Mets', score: 5 },
      home: { id: 119, name: 'Los Angeles Dodgers', score: 10 },
    },
  },

  // ── 2023 ──
  {
    id: 'ws-2023-g1',
    gamePk: 748542,
    season: 2023,
    title: 'Мировая Серия 2023 • Игра 1',
    subtitle: 'D-backs @ Rangers (11-й иннинг)',
    headline: 'Двойное спасение: хоум-ран Сигера на 9-м иннинге и финал на 11-м!',
    story: 'Аризона была в двух страйках от победы на 9-м иннинге, но Кори Сигер сравнял счет пушечным хоум-раном. В 11-м иннинге Адолис Гарсия вколотил победный мяч за пределы поля!',
    scoreSummary: 'AZ 5 : 6 TEX',
    excitementScore: '9.9',
    tags: ['Спасение на 9-м', '11 иннингов', 'Walk-Off'],
    gameDate: '2023-10-28T00:05:00Z',
    teams: {
      away: { id: 109, name: 'Arizona Diamondbacks', score: 5 },
      home: { id: 140, name: 'Texas Rangers', score: 6 },
    },
  },
  {
    id: 'alcs-2023-g7',
    gamePk: 748555,
    season: 2023,
    title: 'Финал Американской Лиги 2023 • Игра 7',
    subtitle: 'Rangers @ Astros (Техасское дерби)',
    headline: 'Адолис Гарсия крушит Хьюстон: 2 хоум-рана и путевка в финал в 7-м матче!',
    story: 'Гарсия набрал 5 RBI и оформил дубль из хоум-ранов на поле заклятого соперника в решающем седьмом матче.',
    scoreSummary: 'TEX 11 : 4 HOU',
    excitementScore: '9.8',
    tags: ['Game 7', 'Техасское дерби', 'Адолис Гарсия MVP'],
    gameDate: '2023-10-24T00:03:00Z',
    teams: {
      away: { id: 140, name: 'Texas Rangers', score: 11 },
      home: { id: 117, name: 'Houston Astros', score: 4 },
    },
  },
  {
    id: 'nlcs-2023-g7',
    gamePk: 748558,
    season: 2023,
    title: 'Финал Национальной Лиги 2023 • Игра 7',
    subtitle: 'D-backs @ Phillies (Сенсация в Филли)',
    headline: 'Сенсация Аризоны: Корбин Кэрролл выбивает фаворита в 7-й игре на выезде!',
    story: 'Молодая команда D-backs устояла перед бешеным давлением фанатов в Филадельфии и сотворила одну из главных сенсаций десятилетия.',
    scoreSummary: 'AZ 4 : 2 PHI',
    excitementScore: '9.7',
    tags: ['Game 7', 'Сенсация', 'Выход в WS'],
    gameDate: '2023-10-25T00:07:00Z',
    teams: {
      away: { id: 109, name: 'Arizona Diamondbacks', score: 4 },
      home: { id: 143, name: 'Philadelphia Phillies', score: 2 },
    },
  },
];

const FINALS_SEASONS = [2026, 2025, 2024, 2023];

export const ClassicsAndFinalsShowcase: React.FC<ClassicsAndFinalsShowcaseProps> = ({
  onSelectGame,
  favoriteTeamId,
  season: currentAppSeason = 2026,
}) => {
  const [activeTab, setActiveTab] = useState<'finals' | 'thrillers'>('finals');
  
  // Local season selection synchronized with app global season
  const [selectedSeason, setSelectedSeason] = useState<number>(currentAppSeason);
  const [showAllYears, setShowAllYears] = useState<boolean>(false);
  const [finalsSeries, setFinalsSeries] = useState<PostseasonSeries[]>([]);
  const [loadingFinals, setLoadingFinals] = useState<boolean>(false);

  // Synchronize when parent season changes (e.g. user toggles year in Header)
  useEffect(() => {
    if (currentAppSeason) {
      setSelectedSeason(currentAppSeason);
      setShowAllYears(false);
    }
  }, [currentAppSeason]);

  const activeSeasonTheme = getSeasonTheme(selectedSeason);

  // Load finals for selected season
  useEffect(() => {
    let isMounted = true;
    async function load() {
      // 2027 has not had postseason yet
      if (selectedSeason >= 2027) {
        setFinalsSeries([]);
        setLoadingFinals(false);
        return;
      }

      setLoadingFinals(true);
      try {
        const allSeries = await getPostseasonSeries(selectedSeason);
        // Filter for Finals: World Series, ALCS, NLCS
        const finalsOnly = allSeries.filter((s) => {
          const desc = s.seriesDescription?.toLowerCase() || '';
          return (
            desc.includes('world series') ||
            desc.includes('championship series') ||
            desc.includes('alcs') ||
            desc.includes('nlcs')
          );
        });
        if (isMounted) setFinalsSeries(finalsOnly);
      } catch (err) {
        console.error('Failed to load finals:', err);
      } finally {
        if (isMounted) setLoadingFinals(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [selectedSeason]);

  // Filter curated thrillers strictly by the chosen season (or all if user explicitly requested)
  const displayedThrillers = useMemo(() => {
    if (showAllYears) {
      return CURATED_THRILLERS;
    }
    return CURATED_THRILLERS.filter((t) => t.season === selectedSeason);
  }, [selectedSeason, showAllYears]);

  const handleLaunchCurated = (thriller: CuratedThriller) => {
    // Construct valid MLBGame representation
    const game: MLBGame = {
      gamePk: thriller.gamePk,
      gameDate: thriller.gameDate,
      status: {
        abstractGameState: 'Final',
        detailedState: 'Final',
        statusCode: 'F',
        isOver: true,
      },
      teams: {
        away: {
          team: {
            id: thriller.teams.away.id,
            name: thriller.teams.away.name,
            teamName: thriller.teams.away.name,
            abbreviation: thriller.teams.away.name.slice(0, 3).toUpperCase(),
          },
          score: thriller.teams.away.score,
        },
        home: {
          team: {
            id: thriller.teams.home.id,
            name: thriller.teams.home.name,
            teamName: thriller.teams.home.name,
            abbreviation: thriller.teams.home.name.slice(0, 3).toUpperCase(),
          },
          score: thriller.teams.home.score,
        },
      },
      seriesDescription: thriller.title,
    };
    onSelectGame(game);
  };

  return (
    <div className="space-y-4">
      {/* ── HEADER & NAVIGATION CONTROLS ── */}
      <div
        className="rounded-2xl p-4 sm:p-5 border shadow-xl space-y-4 transition-all"
        style={{
          background: `linear-gradient(135deg, ${activeSeasonTheme.glowRgba} 0%, rgba(15, 23, 42, 0.95) 100%)`,
          borderColor: activeSeasonTheme.borderRgba,
          boxShadow: `0 0 24px ${activeSeasonTheme.glowRgba}`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-2xl border shadow-sm flex items-center justify-center"
              style={{
                backgroundColor: activeSeasonTheme.badgeBg,
                borderColor: activeSeasonTheme.borderRgba,
              }}
            >
              <Trophy className="w-6 h-6 animate-pulse" style={{ color: activeSeasonTheme.primaryColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: activeSeasonTheme.badgeBg,
                    color: activeSeasonTheme.badgeText,
                    borderColor: activeSeasonTheme.borderRgba,
                  }}
                >
                  {showAllYears ? 'Все сезоны' : activeSeasonTheme.badgeLabel}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  • {showAllYears ? 'Матчи за все сезоны' : `Матчи выбранного сезона ${selectedSeason}`}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {activeTab === 'finals'
                  ? `Все финалы сезона ${selectedSeason}`
                  : showAllYears
                  ? 'Золотые триллеры всех сезонов'
                  : `Золотые триллеры сезона ${selectedSeason}`}
              </h3>
            </div>
          </div>

          {/* Mode Tabs: Финалы vs Триллеры */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-800/80 border border-white/10 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('finals')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                activeTab === 'finals'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Финалы года</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('thrillers')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                activeTab === 'thrillers'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>Золотые триллеры ({displayedThrillers.length})</span>
            </button>
          </div>
        </div>

        {/* Global Season Selector Pills for the Showcase */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/[0.08]">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Сезон коллекции:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {FINALS_SEASONS.map((yr) => {
              const isSel = !showAllYears && selectedSeason === yr;
              const yrTheme = getSeasonTheme(yr);
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    setSelectedSeason(yr);
                    setShowAllYears(false);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSel
                      ? 'shadow-sm'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                  }`}
                  style={
                    isSel
                      ? {
                          backgroundColor: yrTheme.primaryColor,
                          color: '#020617',
                          boxShadow: `0 0 10px ${yrTheme.primaryColor}`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: isSel ? '#020617' : yrTheme.primaryColor }}
                  />
                  <span>{yr}</span>
                  {yrTheme.champion && (
                    <span className="text-[10px] opacity-80 hidden sm:inline">
                      🏆
                    </span>
                  )}
                </button>
              );
            })}

            {/* "Все сезоны" toggle for Thrillers tab */}
            {activeTab === 'thrillers' && (
              <button
                type="button"
                onClick={() => setShowAllYears(!showAllYears)}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  showAllYears
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Все сезоны</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── TAB 1: ВСЕ ФИНАЛЫ СЕЗОНА ── */}
      {activeTab === 'finals' && (
        <div className="space-y-4">
          {loadingFinals ? (
            <div className="text-center py-16 text-slate-400 font-medium text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>Загрузка финалов сезона {selectedSeason}...</span>
            </div>
          ) : selectedSeason >= 2027 || finalsSeries.length === 0 ? (
            <div className="glass-shell p-[1px]">
              <div className="glass-core p-8 text-center text-slate-400 space-y-3 rounded-2xl">
                <Trophy className="w-10 h-10 mx-auto text-amber-400/40" />
                <p className="font-bold text-white text-base">
                  В сезоне {selectedSeason} финалы ещё не состоялись
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {selectedSeason >= 2027
                    ? 'Регулярный сезон стартует 25 марта 2027, а матчи плей-офф пройдут в октябре 2027 года.'
                    : 'Матчи финала для выбранного сезона не найдены.'}{' '}
                  Выберите завершённый сезон для просмотра финальных серий:
                </p>
                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                  {[2026, 2024, 2023].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => {
                        setSelectedSeason(yr);
                        setShowAllYears(false);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 cursor-pointer active:scale-95 transition"
                    >
                      Финалы {yr} года →
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {finalsSeries.map((series, sIdx) => {
                const isWS = series.seriesDescription?.toLowerCase().includes('world series');
                const isALCS = series.seriesDescription?.toLowerCase().includes('american') || series.seriesDescription?.toLowerCase().includes('al');
                const firstGame = series.games?.[0];
                const awayTeam = firstGame?.teams?.away?.team;
                const homeTeam = firstGame?.teams?.home?.team;

                // Calculate series score
                let awayWins = 0;
                let homeWins = 0;
                (series.games || []).forEach((g) => {
                  const as = g.teams?.away?.score;
                  const hs = g.teams?.home?.score;
                  if (typeof as === 'number' && typeof hs === 'number') {
                    if (as > hs) awayWins++;
                    else if (hs > as) homeWins++;
                  }
                });

                const winnerName = awayWins > homeWins ? awayTeam?.name : homeWins > awayWins ? homeTeam?.name : null;

                return (
                  <div
                    key={`finals-series-${sIdx}`}
                    className="glass-shell glass-card rounded-2xl overflow-hidden"
                    style={{ padding: '1px' }}
                  >
                    <div className="glass-core p-4 sm:p-5 rounded-[calc(1rem-1px)] space-y-3.5">
                      {/* Series Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl border flex items-center justify-center ${
                            isWS
                              ? 'bg-amber-400/20 text-amber-400 border-amber-400/40'
                              : isALCS
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          }`}>
                            {isWS ? <Trophy className="w-5 h-5" /> : <Medal className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm sm:text-base font-black text-white">
                                {series.seriesDescription}
                              </h4>
                              {isWS && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 shadow-xs">
                                  Главный финал года
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                              {awayTeam?.name} vs {homeTeam?.name} • Итог серии: <strong className="text-amber-400">{awayWins} : {homeWins}</strong>
                              {winnerName && ` (Победитель: ${winnerName})`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                            Всего матчей: {(series.games || []).length}
                          </span>
                        </div>
                      </div>

                      {/* Game Cards Grid inside this series */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                        {(series.games || []).map((game, gIdx) => {
                          const as = game.teams?.away?.score;
                          const hs = game.teams?.home?.score;
                          const isAwayWin = typeof as === 'number' && typeof hs === 'number' && as > hs;
                          const isHomeWin = typeof as === 'number' && typeof hs === 'number' && hs > as;
                          const gameNum = game.seriesStatus?.gameNumber || gIdx + 1;
                          const isFavGame = Boolean(
                            favoriteTeamId &&
                              (game.teams?.away?.team?.id === favoriteTeamId ||
                                game.teams?.home?.team?.id === favoriteTeamId)
                          );

                          return (
                            <div
                              key={`series-${sIdx}-game-${game.gamePk || gIdx}-${gIdx}`}
                              onClick={() => onSelectGame(game)}
                              className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.07] hover:border-amber-400/50 transition-all cursor-pointer flex flex-col justify-between space-y-2 group shadow-sm active:scale-[0.98]"
                            >
                              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-white/[0.05] pb-1.5">
                                <span className="font-bold text-slate-300 group-hover:text-amber-300 transition">
                                  Игра {gameNum}
                                </span>
                                <span className="font-mono text-[10px]">
                                  {game.gameDate ? new Date(game.gameDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''}
                                </span>
                              </div>

                              {/* Teams with Logos & Scores */}
                              <div className="space-y-1.5 py-1">
                                <div className={`flex items-center justify-between text-xs font-semibold ${isAwayWin ? 'text-white font-black' : 'text-slate-400'}`}>
                                  <div className="flex items-center gap-1.5 truncate">
                                    <img
                                      src={getTeamLogoUrl(game.teams?.away?.team?.id || 0)}
                                      className="w-4 h-4 object-contain shrink-0"
                                      alt=""
                                    />
                                    <span className="truncate">{game.teams?.away?.team?.name}</span>
                                  </div>
                                  <span className={`font-mono text-sm ${isAwayWin ? 'text-amber-400 font-black' : 'text-slate-400'}`}>
                                    {as ?? '—'}
                                  </span>
                                </div>

                                <div className={`flex items-center justify-between text-xs font-semibold ${isHomeWin ? 'text-white font-black' : 'text-slate-400'}`}>
                                  <div className="flex items-center gap-1.5 truncate">
                                    <img
                                      src={getTeamLogoUrl(game.teams?.home?.team?.id || 0)}
                                      className="w-4 h-4 object-contain shrink-0"
                                      alt=""
                                    />
                                    <span className="truncate">{game.teams?.home?.team?.name}</span>
                                  </div>
                                  <span className={`font-mono text-sm ${isHomeWin ? 'text-amber-400 font-black' : 'text-slate-400'}`}>
                                    {hs ?? '—'}
                                  </span>
                                </div>
                              </div>

                              {/* Footer: Venue & Action */}
                              <div className="pt-1.5 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-slate-400">
                                <span className="truncate max-w-[120px]">
                                  {game.venue?.name || 'MLB'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {isFavGame && (
                                    <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[9px]">
                                      ★
                                    </span>
                                  )}
                                  <span className="text-blue-400 group-hover:text-blue-300 font-bold flex items-center">
                                    Обзор →
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: ЗОЛОТЫЕ ТРИЛЛЕРЫ ── */}
      {activeTab === 'thrillers' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {showAllYears
                  ? `Показаны все величайшие триллеры MLB (${displayedThrillers.length} матчей): Walk-off хоум-раны, спасения и камбэки.`
                  : `Показаны лучшие триллеры сезона ${selectedSeason} (${displayedThrillers.length} ${displayedThrillers.length === 1 ? 'матч' : 'матчей'}).`}
              </span>
            </div>
            {!showAllYears && (
              <button
                type="button"
                onClick={() => setShowAllYears(true)}
                className="text-amber-400 hover:text-amber-300 font-black underline text-xs cursor-pointer ml-auto"
              >
                Показать триллеры всех сезонов ({CURATED_THRILLERS.length}) →
              </button>
            )}
          </div>

          {displayedThrillers.length === 0 ? (
            <div className="glass-shell p-[1px]">
              <div className="glass-core p-8 text-center text-slate-400 space-y-3 rounded-2xl">
                <Flame className="w-10 h-10 mx-auto text-amber-500/40" />
                <p className="font-bold text-white text-base">
                  В сезоне {selectedSeason} матчи ещё не игрались
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Регулярный чемпионат {selectedSeason} стартует 25 марта. Выберите прошедший сезон или посмотрите коллекцию всех триллеров:
                </p>
                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                  {[2026, 2024, 2023].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => {
                        setSelectedSeason(yr);
                        setShowAllYears(false);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 cursor-pointer active:scale-95 transition"
                    >
                      Триллеры {yr} →
                    </button>
                  ))}
                  <button
                    onClick={() => setShowAllYears(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 cursor-pointer active:scale-95 transition"
                  >
                    Все сезоны ({CURATED_THRILLERS.length}) →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {displayedThrillers.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleLaunchCurated(t)}
                  className="group p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-400/60 transition-all cursor-pointer flex flex-col justify-between space-y-3 shadow-md hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div>
                    {/* Top Bar: Title + Excitement Badge */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-black text-amber-400">
                        {t.title}
                      </span>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[11px] font-black border border-amber-400/35">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{t.excitementScore} / 10</span>
                      </div>
                    </div>

                    {/* Headline */}
                    <h4 className="text-sm sm:text-base font-extrabold text-white group-hover:text-amber-200 transition">
                      {t.headline}
                    </h4>

                    {/* Story */}
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {t.story}
                    </p>
                  </div>

                  {/* Teams & Score Strip */}
                  <div className="pt-2.5 border-t border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <img src={getTeamLogoUrl(t.teams.away.id)} className="w-5 h-5 object-contain" alt="" />
                        <span className="text-xs font-bold text-white">{t.teams.away.name}</span>
                      </div>
                      <span className="font-mono text-sm font-black text-amber-400 px-2 py-0.5 rounded bg-white/5">
                        {t.scoreSummary}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{t.teams.home.name}</span>
                        <img src={getTeamLogoUrl(t.teams.home.id)} className="w-5 h-5 object-contain" alt="" />
                      </div>
                    </div>

                    {/* Tags & Action Button */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {t.tags.map((tag) => (
                          <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-slate-400 border border-white/[0.08]">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <span className="text-xs font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
                        Смотреть обзор <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
