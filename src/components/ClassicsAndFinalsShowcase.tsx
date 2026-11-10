import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Star,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Medal,
  Calendar,
  Zap,
} from 'lucide-react';
import { MLBGame, PostseasonSeries, getPostseasonSeries, getTeamLogoUrl } from '../services/mlbApi';

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

// ── Curated Greatest Thriller Matches in Modern MLB ──
const CURATED_THRILLERS: CuratedThriller[] = [
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
];

const FINALS_SEASONS = [2026, 2025, 2024, 2023];

export const ClassicsAndFinalsShowcase: React.FC<ClassicsAndFinalsShowcaseProps> = ({
  onSelectGame,
  favoriteTeamId,
  season: currentAppSeason = 2026,
}) => {
  const [activeTab, setActiveTab] = useState<'finals' | 'thrillers'>('finals');
  const [selectedFinalsSeason, setSelectedFinalsSeason] = useState<number>(() => {
    // Default to the current season if it's in the list, else latest past season with finals
    return FINALS_SEASONS.includes(currentAppSeason) ? currentAppSeason : 2026;
  });
  const [finalsSeries, setFinalsSeries] = useState<PostseasonSeries[]>([]);
  const [loadingFinals, setLoadingFinals] = useState<boolean>(false);

  // Load finals for selected season
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoadingFinals(true);
      try {
        const allSeries = await getPostseasonSeries(selectedFinalsSeason);
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
  }, [selectedFinalsSeason]);

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
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-amber-500/15 via-slate-900/90 to-purple-500/10 border border-amber-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/30 shadow-sm flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Золотая коллекция MLB
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  • Лучшие матчи и финальные серии
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {activeTab === 'finals' ? `Все финалы сезона ${selectedFinalsSeason}` : 'Легендарные триллеры последних лет'}
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
              <span>Все финалы года</span>
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
              <span>Золотые триллеры</span>
            </button>
          </div>
        </div>

        {/* If in "finals" mode, display Season pills */}
        {activeTab === 'finals' && (
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/[0.08]">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Выберите сезон финалов:</span>
            </span>
            <div className="flex items-center gap-1.5">
              {FINALS_SEASONS.map((yr) => {
                const isSel = selectedFinalsSeason === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedFinalsSeason(yr)}
                    className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                      isSel
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── TAB 1: ВСЕ ФИНАЛЫ СЕЗОНА ── */}
      {activeTab === 'finals' && (
        <div className="space-y-4">
          {loadingFinals ? (
            <div className="text-center py-16 text-slate-400 font-medium text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>Загрузка финалов сезона {selectedFinalsSeason}...</span>
            </div>
          ) : finalsSeries.length === 0 ? (
            <div className="glass-shell p-[1px]">
              <div className="glass-core p-8 text-center text-slate-400 space-y-2 rounded-2xl">
                <Trophy className="w-8 h-8 mx-auto text-amber-400/40" />
                <p className="font-bold text-white">В сезоне {selectedFinalsSeason} финалы ещё не состоялись</p>
                <p className="text-xs text-slate-400">Выберите 2026, 2024 или 2023, чтобы посмотреть завершённые финалы.</p>
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
                                  Главный финал
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                              {awayTeam?.name} vs {homeTeam?.name} • Итог серии: <strong className="text-amber-400">{awayWins} : {homeWins}</strong>
                              {winnerName && ` (Победитель: ${winnerName})`}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-mono font-bold text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10 self-start sm:self-auto">
                          {series.games?.length || 0} сыгранных матчей
                        </span>
                      </div>

                      {/* Game Cards Grid for this Series */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                        {(series.games || []).map((game, gIdx) => {
                          const as = game.teams?.away?.score;
                          const hs = game.teams?.home?.score;
                          const awayWon = typeof as === 'number' && typeof hs === 'number' && as > hs;
                          const homeWon = typeof as === 'number' && typeof hs === 'number' && hs > as;
                          const gDate = new Date(game.gameDate);
                          const dateStr = gDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

                          return (
                            <div
                              key={game.gamePk}
                              onClick={() => onSelectGame(game)}
                              className="group p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-amber-400/50 transition-all cursor-pointer flex flex-col justify-between space-y-2 shadow-xs hover:shadow-md"
                            >
                              <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-white/[0.05]">
                                <span className="font-mono font-bold text-amber-400">
                                  {game.description || `Игра ${gIdx + 1}`}
                                </span>
                                <span className="text-slate-500 font-mono text-[10px]">{dateStr}</span>
                              </div>

                              <div className="space-y-1.5">
                                {/* Away */}
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <img src={getTeamLogoUrl(game.teams.away.team.id)} className="w-4 h-4 object-contain shrink-0" alt="" />
                                    <span className={`truncate ${awayWon ? 'font-black text-white' : 'text-slate-400'}`}>
                                      {game.teams.away.team.name}
                                    </span>
                                  </div>
                                  <span className={`font-mono font-bold ml-2 ${awayWon ? 'text-emerald-400 font-black' : 'text-slate-400'}`}>
                                    {as ?? '—'}
                                  </span>
                                </div>

                                {/* Home */}
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <img src={getTeamLogoUrl(game.teams.home.team.id)} className="w-4 h-4 object-contain shrink-0" alt="" />
                                    <span className={`truncate ${homeWon ? 'font-black text-white' : 'text-slate-400'}`}>
                                      {game.teams.home.team.name}
                                    </span>
                                  </div>
                                  <span className={`font-mono font-bold ml-2 ${homeWon ? 'text-emerald-400 font-black' : 'text-slate-400'}`}>
                                    {hs ?? '—'}
                                  </span>
                                </div>
                              </div>

                              <div className="pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[10px]">
                                <span className="text-slate-500 font-mono">
                                  {game.venue?.name?.replace(/ Ballpark| Stadium| Field/g, '') || 'MLB'}
                                </span>
                                <span className="text-amber-400 group-hover:text-amber-300 font-bold flex items-center gap-0.5">
                                  Смотреть обзор <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                                </span>
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
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Здесь собраны величайшие валидольные концовки: победные Walk-Off хоум-раны, спасения с 2 аутами и легендарные камбэки. Нажмите на любой матч, чтобы открыть текстовую трансляцию, симуляцию каждого броска и бокс-скор!
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {CURATED_THRILLERS.map((t) => (
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
                      Смотреть трансляцию <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassicsAndFinalsShowcase;
