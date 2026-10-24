import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Radio,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Users,
  History,
  Shield,
  Clock,
  Flame,
  Award,
  Volume2,
  Download,
  Calendar,
  Star,
  Target,
  Film,
  Compass,
  Table2 as Table,
  Filter,
  ArrowUpDown,
  GraduationCap,
  Crosshair,
  ArrowLeft,
  Home,
} from 'lucide-react';
import {
  MLBGame,
  LiveGameFeed,
  WinProbabilityItem,
  getLiveGameFeed,
  getGameWinProbability,
  getHeadToHead,
  getTeamLogoUrl,
  getPlayerPhotoUrl,
  BEGINNER_NOTES_RU,
} from '../services/mlbApi';
import { WinProbabilityChart } from './WinProbabilityChart';
import { sounds } from '../services/soundEffects';
import { notifications } from '../services/notifications';
import { downloadGameIcs, getGoogleCalendarUrl } from '../utils/calendarExport';
import { Match3DReplay } from './Match3DReplay';
import { CelebrationOverlay, CelebrationData } from './CelebrationOverlay';
import { StrikeZoneWidget } from './StrikeZoneWidget';
import { SprayChartWidget } from './SprayChartWidget';
import { BoxscoreWidget } from './BoxscoreWidget';
import { VenueProfileWidget } from './VenueProfileWidget';
import { HighlightsWidget } from './HighlightsWidget';
import { PlayerDetailModal } from './PlayerDetailModal';

interface GameDetailModalProps {
  onSelectTeam?: (teamId: number, teamName: string) => void;
  game: MLBGame;
  onClose: () => void;
  isFavoriteTeam?: boolean;
  favoriteTeamId?: number;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  onSelectTeam,
  game,
  onClose,
  isFavoriteTeam,
  favoriteTeamId,
}) => {
  const [activeTab, setActiveTab] = useState<
    'live' | 'replay3d' | 'boxscore' | 'strikezone' | 'spraychart' | 'highlights' | 'venue' | 'winprob' | 'lineups' | 'h2h'
  >('live');
  const [feedData, setFeedData] = useState<LiveGameFeed | null>(null);
  const [winProbData, setWinProbData] = useState<WinProbabilityItem[]>([]);
  const [h2hGames, setH2hGames] = useState<MLBGame[]>([]);
  const [loading, setLoading] = useState(true);

  // Popover modals state
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | undefined>(undefined);
  
  // Play-by-play filter & sorting
  const [playFilter, setPlayFilter] = useState<'all' | 'scoring' | 'k' | 'hr'>('all');
  const [playSortAsc, setPlaySortAsc] = useState<boolean>(false);
  const [beginnerMode, setBeginnerMode] = useState<boolean>(() => {
    return localStorage.getItem('mlb_beginner_mode') === '1';
  });

  // Simulation mode states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simPlayIndex, setSimPlayIndex] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 0.5, 1, 2
  const [animatedScoreKey, setAnimatedScoreKey] = useState<number>(0);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const prevScoreRef = useRef<{ away?: number; home?: number }>({});


  // Initial load of live feed and win probability
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const [feed, winProb, h2h] = await Promise.all([
          getLiveGameFeed(game.gamePk),
          getGameWinProbability(game.gamePk),
          getHeadToHead(game.teams.away.team.id, game.teams.home.team.id, 2024),
        ]);

        if (isMounted) {
          setFeedData(feed);
          setWinProbData(winProb);
          setH2hGames(h2h);
          if (feed?.liveData?.plays?.allPlays?.length) {
            setSimPlayIndex(feed.liveData.plays.allPlays.length - 1);
          }
        }
      } catch (e) {
        console.error('Error loading game detail data:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    // Fast 3.5-second live polling for active games
    const isLive = game.status?.abstractGameState === 'Live';
    let pollInterval: ReturnType<typeof setInterval>;
    if (isLive) {
      pollInterval = setInterval(async () => {
        const updated = await getLiveGameFeed(game.gamePk);
        if (updated && isMounted) {
          setFeedData(updated);
        }
      }, 3500);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [game.gamePk, game.status?.abstractGameState]);


  // Simulation ticker
  // Determine current display play (either from simulation or latest)
  const realPlays = feedData?.liveData?.plays?.allPlays || [];

  // Generate demo plays when no real data (game not started / scheduled)
  const demoPlays = React.useMemo(() => {
    if (realPlays.length > 0) return realPlays;
    const away = game.teams.away.team;
    const home = game.teams.home.team;
    const events: Array<{ ev: string; evType: string; desc: string; rbi: number; isOut: boolean; awayAdds: number; homeAdds: number }> = [
      { ev: 'Strikeout', evType: 'strikeout', desc: `Мощный фастбол — баттер ${away.name} уходит в страйкаут!`, rbi: 0, isOut: true, awayAdds: 0, homeAdds: 0 },
      { ev: 'Groundout', evType: 'field_out', desc: `Граундбол — двойной аут, 2 розыгрыш!`, rbi: 0, isOut: true, awayAdds: 0, homeAdds: 0 },
      { ev: 'Single', evType: 'single', desc: `Синглхит в центр поля — раннер на 1-й базе!`, rbi: 0, isOut: false, awayAdds: 0, homeAdds: 0 },
      { ev: 'Strikeout', evType: 'strikeout', desc: `Слайдер в угол зоны — финальный страйкаут иннинга!`, rbi: 0, isOut: true, awayAdds: 0, homeAdds: 0 },
      { ev: 'Double', evType: 'double', desc: `Мощный удар в левый угол — баттер добегает до 2-й базы!`, rbi: 0, isOut: false, awayAdds: 0, homeAdds: 0 },
      { ev: 'RBI Single', evType: 'single', desc: `Тайминговый синглхит — раннер со 2-й базы заходит в дом! +1 ран для ${home.name}!`, rbi: 1, isOut: false, awayAdds: 0, homeAdds: 1 },
      { ev: 'Flyout', evType: 'field_out', desc: `Флайбол в центрфилд — поймал! Аут.`, rbi: 0, isOut: true, awayAdds: 0, homeAdds: 0 },
      { ev: 'Home Run', evType: 'home_run', desc: `ХОУМ-РАН! Великолепный удар улетает далеко за забор аутфилда! +2 рана для ${away.name}!`, rbi: 2, isOut: false, awayAdds: 2, homeAdds: 0 },
      { ev: 'Groundout', evType: 'field_out', desc: `Граундбол к шортстопу — форс-аут на 1-й базе.`, rbi: 0, isOut: true, awayAdds: 0, homeAdds: 0 },
      { ev: 'Walk', evType: 'walk', desc: `Питчер выдаёт 4 бола — баттер получает свободную базу (Уок).`, rbi: 0, isOut: false, awayAdds: 0, homeAdds: 0 },
      { ev: 'Strikeout', evType: 'strikeout', desc: `Чейнджап ниже зоны — баттер промахивается! Страйкаут!`, rbi: 0, isOut: true, awayAdds: 0, homeAdds: 0 },
      { ev: 'RBI Double', evType: 'double', desc: `Мощный дабл в правый угол — двое раннеров заходят! +2 рана для ${home.name}!`, rbi: 2, isOut: false, awayAdds: 0, homeAdds: 2 },
      { ev: 'Flyout', evType: 'field_out', desc: `Высокий флайбол в правый аутфилд — сохранили раннеров.`, rbi: 0, isOut: true, awayAdds: 0, homeAdds: 0 },
      { ev: 'Triple', evType: 'triple', desc: `ТРИПЛ! Скоростной удар вдоль левой линии — баттер добегает до 3-й базы!`, rbi: 1, isOut: false, awayAdds: 1, homeAdds: 0 },
      { ev: 'Strikeout', evType: 'strikeout', desc: `Кервбол в угол — вторая жертва питчера в иннинге!`, rbi: 0, isOut: true, awayAdds: 0, homeAdds: 0 },
      { ev: 'Single', evType: 'single', desc: `Сингл через шортстопа — раннер со 3-й базы заходит в дом! +1 ран!`, rbi: 1, isOut: false, awayAdds: 0, homeAdds: 1 },
      { ev: 'Groundout', evType: 'field_out', desc: `Граундбол к 3-й базе — бросок на 1-ю. Аут!`, rbi: 0, isOut: true, awayAdds: 0, homeAdds: 0 },
      { ev: 'Home Run', evType: 'home_run', desc: `ХОУМ-РАН на 2 рана! Шикарный удар под ветер — мяч перелетает дальний забор! +2 для ${home.name}!`, rbi: 2, isOut: false, awayAdds: 0, homeAdds: 2 },
      { ev: 'Strikeout', evType: 'strikeout', desc: `Финальный страйкаут 9-го иннинга — матч завершён!`, rbi: 0, isOut: true, awayAdds: 0, homeAdds: 0 },
    ];
    let awayScore = 0;
    let homeScore = 0;
    return events.map((e, i) => {
      awayScore += e.awayAdds;
      homeScore += e.homeAdds;
      const inning = Math.floor(i / 3) + 1;
      const isTop = i % 6 < 3;
      return {
        result: {
          type: 'atBat',
          event: e.ev,
          eventType: e.evType,
          description: e.desc,
          rbi: e.rbi,
          awayScore,
          homeScore,
          isOut: e.isOut,
        },
        about: {
          atBatIndex: i,
          halfInning: isTop ? 'top' : 'bottom',
          isTopInning: isTop,
          inning: Math.min(inning, 9),
          isScoringPlay: e.rbi > 0,
          isComplete: true,
        },
        count: {
          balls: isTop ? 1 : 2,
          strikes: e.isOut ? 3 : 1,
          outs: e.isOut ? (i % 3) + 1 : i % 3,
        },
        matchup: {
          batter: { id: 0, fullName: isTop ? `Баттер ${away.teamName}` : `Баттер ${home.teamName}` },
          pitcher: { id: 0, fullName: isTop ? `Питчер ${home.teamName}` : `Питчер ${away.teamName}` },
        },
        playEvents: [],
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realPlays.length, game.gamePk]);

  const allPlays = demoPlays;
  const isDemoMode = realPlays.length === 0;

  // Generate demo win-probability data when no real data
  const effectiveWinProbData = React.useMemo(() => {
    if (winProbData.length > 0) return winProbData;
    if (!isDemoMode) return winProbData;
    let homeProb = 50;
    return demoPlays.map((play, i) => {
      const delta = play.result?.eventType === 'home_run' ? (play.about?.isTopInning ? -12 : 12) :
        play.result?.rbi ? (play.about?.isTopInning ? -6 : 6) :
        play.result?.eventType === 'strikeout' ? (play.about?.isTopInning ? 3 : -3) :
        (Math.random() * 6 - 3);
      homeProb = Math.min(95, Math.max(5, homeProb + delta));
      return {
        atBatIndex: i,
        homeTeamWinProbability: homeProb,
        awayTeamWinProbability: 100 - homeProb,
        result: {
          description: play.result?.description || '',
          event: play.result?.event || '',
          homeScore: play.result?.homeScore || 0,
          awayScore: play.result?.awayScore || 0,
          rbi: play.result?.rbi,
        },
        about: {
          inning: play.about?.inning || 1,
          halfInning: play.about?.halfInning || 'top',
        },
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winProbData.length, isDemoMode, demoPlays]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isSimulating && allPlays.length) {
      timer = setTimeout(() => {
        if (simPlayIndex < allPlays.length - 1) {
          const nextIndex = simPlayIndex + 1;
          const nextPlay = allPlays[nextIndex];

          // Check for score change or home run sound
          const nextAway = nextPlay.result?.awayScore;
          const nextHome = nextPlay.result?.homeScore;
          const prevAway = prevScoreRef.current.away;
          const prevHome = prevScoreRef.current.home;

          if (
            (nextAway !== undefined && prevAway !== undefined && nextAway !== prevAway) ||
            (nextHome !== undefined && prevHome !== undefined && nextHome !== prevHome)
          ) {
            sounds.playScoreChange();
            setAnimatedScoreKey((k) => k + 1);

            // Trigger notification
            if (isFavoriteTeam) {
              notifications.alertScoreChange(
                game.teams.home.team.name,
                game.teams.away.team.name,
                `${nextAway} - ${nextHome}`,
                `Иннинг ${nextPlay.about?.inning || ''}`
              );
            }
          }

          if (nextPlay.result?.eventType === 'home_run') {
            sounds.playHomeRunCelebration();
            notifications.alertHomeRun(
              nextPlay.matchup?.batter?.fullName || 'Игрок',
              nextPlay.about?.isTopInning ? game.teams.away.team.name : game.teams.home.team.name,
              nextPlay.result?.rbi || 1
            );
            setCelebration({
              type: 'homerun',
              playerName: nextPlay.matchup?.batter?.fullName || 'Игрок',
              teamName: nextPlay.about?.isTopInning ? game.teams.away.team.name : game.teams.home.team.name,
              details: nextPlay.result?.description || 'Хоум-ран на трибуны!',
            });
          } else if (nextPlay.result?.eventType === 'strikeout' || nextPlay.result?.event?.toLowerCase().includes('strikeout')) {
            sounds.playStrikeout();
            setCelebration({
              type: 'strikeout',
              playerName: nextPlay.matchup?.pitcher?.fullName || 'Питчер',
              teamName: nextPlay.about?.isTopInning ? game.teams.home.team.name : game.teams.away.team.name,
              details: nextPlay.result?.description || '3-й страйк! Баттер выбывает в аут',
            });
          } else if (nextPlay.result?.isOut) {
            sounds.playStrikeout();
          } else {
            sounds.playBatCrack();
          }

          prevScoreRef.current = { away: nextAway, home: nextHome };
          setSimPlayIndex(nextIndex);
        } else {
          setIsSimulating(false);
        }
      }, Math.round(2200 / simSpeed));
    }
    return () => clearTimeout(timer);
  }, [isSimulating, simPlayIndex, allPlays, game, isFavoriteTeam, simSpeed]);

  const currentPlay =
    allPlays.length > 0 ? allPlays[simPlayIndex] || allPlays[allPlays.length - 1] : null;


  // Active linescore
  const linescore = feedData?.liveData?.linescore || game.linescore;

  // Current score for display
  const currentAwayScore =
    isSimulating && currentPlay?.result?.awayScore !== undefined
      ? currentPlay.result.awayScore
      : linescore?.teams?.away?.runs ?? game.teams.away.score ?? 0;

  const currentHomeScore =
    isSimulating && currentPlay?.result?.homeScore !== undefined
      ? currentPlay.result.homeScore
      : linescore?.teams?.home?.runs ?? game.teams.home.score ?? 0;

  // Base runners status for graphic
  const hasRunner1B = isSimulating
    ? Boolean(currentPlay?.matchup) && simPlayIndex % 3 === 1
    : Boolean(linescore?.offense?.first);

  const hasRunner2B = isSimulating
    ? Boolean(currentPlay?.matchup) && simPlayIndex % 3 === 2
    : Boolean(linescore?.offense?.second);

  const hasRunner3B = isSimulating
    ? Boolean(currentPlay?.matchup) && simPlayIndex % 4 === 3
    : Boolean(linescore?.offense?.third);

  // Balls, strikes, outs
  const currentBalls = isSimulating ? currentPlay?.count?.balls ?? 1 : linescore?.balls ?? 0;
  const currentStrikes = isSimulating ? currentPlay?.count?.strikes ?? 2 : linescore?.strikes ?? 0;
  const currentOuts = isSimulating ? currentPlay?.count?.outs ?? 1 : linescore?.outs ?? 0;
  const currentInning = isSimulating
    ? currentPlay?.about?.inning ?? 9
    : linescore?.currentInning ?? 9;
  const isTopInning = isSimulating
    ? currentPlay?.about?.isTopInning ?? false
    : linescore?.isTopInning ?? false;

  // Starting lineups from boxscore
  const awayPlayers = Object.values(feedData?.liveData?.boxscore?.teams?.away?.players || {});
  const homePlayers = Object.values(feedData?.liveData?.boxscore?.teams?.home?.players || {});

  const awayLineup = awayPlayers
    .filter((p) => p.battingOrder)
    .sort((a, b) => Number(a.battingOrder) - Number(b.battingOrder))
    .slice(0, 9);

  const homeLineup = homePlayers
    .filter((p) => p.battingOrder)
    .sort((a, b) => Number(a.battingOrder) - Number(b.battingOrder))
    .slice(0, 9);

  // Probable / starting pitchers
  const awayPitcher =
    feedData?.gameData?.probablePitchers?.away || game.teams.away.probablePitcher;
  const homePitcher =
    feedData?.gameData?.probablePitchers?.home || game.teams.home.probablePitcher;

  // Key / Interesting moments filter
  const highlightPlays = allPlays.filter((p) => {
    const isHr = p.result?.eventType === 'home_run';
    const isBigRbi = (p.result?.rbi || 0) >= 2;
    const isLateInningTie = (p.about?.inning || 0) >= 8 && p.result?.awayScore === p.result?.homeScore;
    return isHr || isBigRbi || isLateInningTie;
  });

  // Free Google Translate (no API key needed)
  async function translateText(text: string): Promise<string> {
    if (!text) return text;
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      const translated = (data[0] as [string, string][]).map((seg) => seg[0]).join('');
      return translated || text;
    } catch {
      return text;
    }
  }

  // Batch-translate visible plays when translate is on
  React.useEffect(() => {
    if (!translateEnabled || allPlays.length === 0) return;
    const visiblePlays = allPlays.slice(0, simPlayIndex + 1);
    const untranslated = visiblePlays.filter(
      (p) => p.result?.description && !translations[p.result.description]
    );
    if (untranslated.length === 0) return;
    const translateBatch = async () => {
      for (const play of untranslated.slice(0, 25)) {
        const orig = play.result?.description || '';
        if (!orig || translations[orig]) continue;
        const t = await translateText(orig);
        setTranslations((prev) => ({ ...prev, [orig]: t }));
        await new Promise((r) => setTimeout(r, 100));
      }
    };
    translateBatch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translateEnabled, simPlayIndex, allPlays.length]);

  return (
    <>
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="glass-shell w-full max-w-5xl my-auto shadow-2xl" style={{ padding: '1px' }}>
        <div className="glass-core rounded-[calc(1.5rem-1px)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
              title="Вернуться назад к матчам (Esc)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Назад</span>
            </button>

            <span
              className="eyebrow hidden sm:inline-flex"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
              }}
            >
              <Radio className="w-3 h-3 text-red-400 animate-pulse" />
              {game.status?.abstractGameState === 'Live' ? 'Прямой эфир' : 'Live Game Center'}
            </span>
            <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
              ID: {game.gamePk} • {game.venue?.name || 'MLB Ballpark'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Live simulation toggle button */}
            <button
              onClick={() => {
                if (!isSimulating && simPlayIndex >= allPlays.length - 1) {
                  setSimPlayIndex(0);
                }
                setIsSimulating(!isSimulating);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-md active:scale-95"
              style={{
                background: isSimulating
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                boxShadow: isSimulating
                  ? '0 4px 16px rgba(245, 158, 11, 0.35)'
                  : '0 4px 16px rgba(16, 185, 129, 0.35)',
              }}
            >
              {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isSimulating ? 'Пауза' : 'Симуляция'}</span>
            </button>
            {isDemoMode && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider"
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#fcd34d',
                }}
                title="Матч ещё не начался — показывается демо-симуляция"
              >
                DEMO
              </span>
            )}

            {/* Calendar Export */}
            <button
              onClick={() => downloadGameIcs(game)}
              title="Скачать .ics для календаря"
              className="p-1.5 rounded-full bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.08] transition"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <a
              href={getGoogleCalendarUrl(game)}
              target="_blank"
              rel="noopener noreferrer"
              title="Добавить в Google Календарь"
              className="p-1.5 rounded-full bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.08] transition"
            >
              <Calendar className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Celebration Overlay for Live Home Runs and Strikeouts */}
        <CelebrationOverlay
          celebration={celebration}
          onClose={() => setCelebration(null)}
        />

        {/* Big Scoreboard Banner */}
        {(() => {
          const isAwayFav = Boolean(favoriteTeamId && game.teams.away.team.id === favoriteTeamId);
          const isHomeFav = Boolean(favoriteTeamId && game.teams.home.team.id === favoriteTeamId);

          return (
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 sm:px-8 py-5 border-b border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Away Team */}
                <div className={`md:col-span-5 flex items-center justify-between sm:justify-start gap-4 p-2.5 rounded-2xl transition-all ${
                  isAwayFav ? 'bg-amber-500/10 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : ''
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`relative ${isAwayFav ? 'ring-4 ring-amber-400 rounded-full p-1 shadow-[0_0_16px_rgba(245,158,11,0.5)]' : ''}`}>
                      <img
                        src={getTeamLogoUrl(game.teams.away.team.id)}
                        alt={game.teams.away.team.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-contain filter drop-shadow-md"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-black text-lg sm:text-xl leading-tight ${isAwayFav ? 'text-amber-300' : 'text-white'}`}>
                          {game.teams.away.team.name}
                        </h3>
                        {isAwayFav && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shadow-sm">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            МОЯ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {game.teams.away.leagueRecord
                          ? `${game.teams.away.leagueRecord.wins}-${game.teams.away.leagueRecord.losses}`
                          : 'Гости'}
                      </p>
                    </div>
                  </div>

                  {/* Away Score */}
                  <div
                    key={`away-${animatedScoreKey}`}
                    className={`text-3xl sm:text-5xl font-black font-mono animate-score-change sm:ml-auto ${
                      isAwayFav ? 'text-amber-300' : 'text-white'
                    }`}
                  >
                    {currentAwayScore}
                  </div>
                </div>

                {/* Inning / Game Status Center Box */}
                <div className="md:col-span-2 text-center py-2 px-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center">
                  <span className="text-xs text-red-400 font-bold uppercase tracking-wider">
                    {isTopInning ? '▲ Верх' : '▼ Низ'} {currentInning} иннинга
                  </span>
                  <div className="text-xs font-semibold text-slate-400 mt-1">
                    {currentOuts} {currentOuts === 1 ? 'аут' : currentOuts === 2 ? 'аута' : 'аутов'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Счет: {currentBalls}B - {currentStrikes}S
                  </div>
                </div>

                {/* Home Team */}
                <div className={`md:col-span-5 flex items-center justify-between sm:justify-end gap-4 p-2.5 rounded-2xl transition-all ${
                  isHomeFav ? 'bg-amber-500/10 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : ''
                }`}>
                  {/* Home Score */}
                  <div
                    key={`home-${animatedScoreKey}`}
                    className={`text-3xl sm:text-5xl font-black font-mono animate-score-change sm:mr-auto ${
                      isHomeFav ? 'text-amber-300' : 'text-white'
                    }`}
                  >
                    {currentHomeScore}
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="flex items-center justify-end gap-2">
                        {isHomeFav && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shadow-sm">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            МОЯ
                          </span>
                        )}
                        <h3 className={`font-black text-lg sm:text-xl leading-tight ${isHomeFav ? 'text-amber-300' : 'text-white'}`}>
                          {game.teams.home.team.name}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {game.teams.home.leagueRecord
                          ? `${game.teams.home.leagueRecord.wins}-${game.teams.home.leagueRecord.losses}`
                          : 'Хозяева'}
                      </p>
                    </div>
                    <div className={`relative ${isHomeFav ? 'ring-4 ring-amber-400 rounded-full p-1 shadow-[0_0_16px_rgba(245,158,11,0.5)]' : ''}`}>
                      <img
                        src={getTeamLogoUrl(game.teams.home.team.id)}
                        alt={game.teams.home.team.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-contain filter drop-shadow-md"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Inning-by-Inning Linescore Table */}
              {linescore?.innings && linescore.innings.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 overflow-x-auto">
                  <table className="w-full text-center text-xs font-mono select-none">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="text-left font-sans py-1 px-2">Команда</th>
                        {linescore.innings.map((inn) => (
                          <th key={inn.num} className="w-7 py-1 px-1">
                            {inn.num}
                          </th>
                        ))}
                        <th className="w-8 py-1 px-1 text-white font-bold">R</th>
                        <th className="w-8 py-1 px-1 text-slate-400">H</th>
                        <th className="w-8 py-1 px-1 text-slate-400">E</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={`border-b border-slate-800/50 ${
                        isAwayFav ? 'bg-amber-500/15 text-amber-300 font-bold border-l-4 border-l-amber-400' : 'text-slate-200'
                      }`}>
                        <td className="text-left font-sans font-semibold py-1.5 px-2 flex items-center gap-1.5">
                          <img src={getTeamLogoUrl(game.teams.away.team.id)} className="w-3.5 h-3.5" alt="" />
                          <span>{game.teams.away.team.abbreviation}</span>
                          {isAwayFav && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 inline" />}
                        </td>
                        {linescore.innings.map((inn) => (
                          <td key={inn.num} className="py-1 px-1">
                            {inn.away?.runs ?? '-'}
                          </td>
                        ))}
                        <td className={`py-1 px-1 font-bold ${isAwayFav ? 'text-amber-300 bg-amber-500/20' : 'text-white bg-slate-800/40'}`}>
                          {currentAwayScore}
                        </td>
                        <td className={`py-1 px-1 ${isAwayFav ? 'text-amber-200/90' : 'text-slate-400'}`}>
                          {linescore.teams?.away?.hits ?? 0}
                        </td>
                        <td className={`py-1 px-1 ${isAwayFav ? 'text-amber-200/90' : 'text-slate-400'}`}>
                          {linescore.teams?.away?.errors ?? 0}
                        </td>
                      </tr>

                      <tr className={isHomeFav ? 'bg-amber-500/15 text-amber-300 font-bold border-l-4 border-l-amber-400' : 'text-slate-200'}>
                        <td className="text-left font-sans font-semibold py-1.5 px-2 flex items-center gap-1.5">
                          <img src={getTeamLogoUrl(game.teams.home.team.id)} className="w-3.5 h-3.5" alt="" />
                          <span>{game.teams.home.team.abbreviation}</span>
                          {isHomeFav && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 inline" />}
                        </td>
                        {linescore.innings.map((inn) => (
                          <td key={inn.num} className="py-1 px-1">
                            {inn.home?.runs ?? '-'}
                          </td>
                        ))}
                        <td className={`py-1 px-1 font-bold ${isHomeFav ? 'text-amber-300 bg-amber-500/20' : 'text-white bg-slate-800/40'}`}>
                          {currentHomeScore}
                        </td>
                        <td className={`py-1 px-1 ${isHomeFav ? 'text-amber-200/90' : 'text-slate-400'}`}>
                          {linescore.teams?.home?.hits ?? 0}
                        </td>
                        <td className={`py-1 px-1 ${isHomeFav ? 'text-amber-200/90' : 'text-slate-400'}`}>
                          {linescore.teams?.home?.errors ?? 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* Navigation Tabs */}
        <div className="bg-slate-950 px-4 sm:px-6 border-b border-slate-800 flex items-center gap-1 overflow-x-auto scrollbar-none whitespace-nowrap">
          <button
            onClick={() => setActiveTab('live')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'live'
                ? 'border-red-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-red-500" />
            <span>Live & Розыгрыши</span>
          </button>

          <button
            onClick={() => setActiveTab('replay3d')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'replay3d'
                ? 'border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>3D Повтор матча</span>
            <span className="px-1 py-0.2 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              3D
            </span>
          </button>

          <button
            onClick={() => setActiveTab('boxscore')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'boxscore'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-blue-400" />
            <span>Бокс-скор</span>
          </button>

          <button
            onClick={() => setActiveTab('strikezone')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'strikezone'
                ? 'border-amber-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Зона страйка</span>
          </button>

          <button
            onClick={() => setActiveTab('spraychart')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'spraychart'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            <span>Спрей-чарт</span>
          </button>

          <button
            onClick={() => setActiveTab('highlights')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'highlights'
                ? 'border-cyan-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            <span>Видео-хайлайты</span>
          </button>

          <button
            onClick={() => setActiveTab('venue')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'venue'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>Стадион</span>
          </button>

          <button
            onClick={() => setActiveTab('winprob')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'winprob'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Вероятность победы</span>
          </button>

          <button
            onClick={() => setActiveTab('lineups')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'lineups'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Составы</span>
          </button>

          <button
            onClick={() => setActiveTab('h2h')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition shrink-0 ${
              activeTab === 'h2h'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>H2H ({h2hGames.length})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB: 3D REPLAY (ANATOMY ISOMETRIC RIG) */}
          {activeTab === 'replay3d' && (
            <div className="space-y-4">
              <Match3DReplay
                game={game}
                allPlays={allPlays}
                currentIndex={simPlayIndex}
                onSelectPlayIndex={(idx) => setSimPlayIndex(idx)}
              />
            </div>
          )}

          {/* TAB 1: LIVE FEED & DIAMOND */}
          {activeTab === 'live' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Live Diamond Graphic & Current Matchup (5 cols) */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Положение на базах
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    {currentOuts} аут(а) • {currentBalls}-{currentStrikes}
                  </span>
                </div>

                {/* Compact Diamond graphic */}
                <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {/* Dirt Diamond */}
                    <polygon
                      points="100,20 180,100 100,180 20,100"
                      fill="#1e293b"
                      stroke="#334155"
                      strokeWidth="2"
                    />

                    {/* Base Lines */}
                    <line x1="100" y1="180" x2="180" y2="100" stroke="#475569" strokeWidth="1.5" />
                    <line x1="180" y1="100" x2="100" y2="20" stroke="#475569" strokeWidth="1.5" />
                    <line x1="100" y1="20" x2="20" y2="100" stroke="#475569" strokeWidth="1.5" />
                    <line x1="20" y1="100" x2="100" y2="180" stroke="#475569" strokeWidth="1.5" />

                    {/* 2nd Base (Top) */}
                    <rect
                      x="92"
                      y="12"
                      width="16"
                      height="16"
                      transform="rotate(45 100 20)"
                      fill={hasRunner2B ? '#facc15' : '#64748b'}
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="transition-colors duration-300"
                    />

                    {/* 1st Base (Right) */}
                    <rect
                      x="172"
                      y="92"
                      width="16"
                      height="16"
                      transform="rotate(45 180 100)"
                      fill={hasRunner1B ? '#facc15' : '#64748b'}
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="transition-colors duration-300"
                    />

                    {/* 3rd Base (Left) */}
                    <rect
                      x="12"
                      y="92"
                      width="16"
                      height="16"
                      transform="rotate(45 20 100)"
                      fill={hasRunner3B ? '#facc15' : '#64748b'}
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="transition-colors duration-300"
                    />

                    {/* Home Plate (Bottom) */}
                    <polygon
                      points="94,175 106,175 106,183 100,188 94,183"
                      fill="#ffffff"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />

                    {/* Pitcher Mound */}
                    <circle cx="100" cy="100" r="8" fill="#475569" />
                  </svg>
                </div>

                {/* Base Runners Status list */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div
                    className={`p-1.5 rounded-lg border transition ${
                      hasRunner1B
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-300 font-bold'
                        : 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium'
                    }`}
                  >
                    1-я база
                  </div>
                  <div
                    className={`p-1.5 rounded-lg border transition ${
                      hasRunner2B
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-300 font-bold'
                        : 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium'
                    }`}
                  >
                    2-я база
                  </div>
                  <div
                    className={`p-1.5 rounded-lg border transition ${
                      hasRunner3B
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-300 font-bold'
                        : 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium'
                    }`}
                  >
                    3-я база
                  </div>
                </div>

                {/* Current Batter vs Pitcher Matchup */}
                <div className="bg-slate-100/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-3">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Текущая дуэль:</div>
                  
                  {/* Batter */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden ring-1 ring-slate-300 dark:ring-slate-700">
                      {currentPlay?.matchup?.batter?.id ? (
                        <img
                          src={getPlayerPhotoUrl(currentPlay.matchup.batter.id)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-400">
                          Б
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase block">
                        Баттер (на бите)
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {currentPlay?.matchup?.batter?.fullName || 'Текущий бьющий'}
                      </span>
                    </div>
                  </div>

                  {/* Pitcher */}
                  <div className="flex items-center gap-2.5 border-t border-slate-200 dark:border-slate-800/80 pt-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden ring-1 ring-slate-300 dark:ring-slate-700">
                      {currentPlay?.matchup?.pitcher?.id ? (
                        <img
                          src={getPlayerPhotoUrl(currentPlay.matchup.pitcher.id)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-400">
                          П
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold uppercase block">
                        Питчер (на горке)
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {currentPlay?.matchup?.pitcher?.fullName ||
                          (isTopInning ? homePitcher?.fullName : awayPitcher?.fullName) ||
                          'Стартовый питчер'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulation Scrubber & Controls */}
                {allPlays.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Розыгрыш {simPlayIndex + 1} из {allPlays.length}
                      </span>

                      {/* Speed switcher */}
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-[10px] font-mono font-bold">
                        {[0.5, 1, 2].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => setSimSpeed(spd)}
                            className={`px-1.5 py-0.5 rounded transition ${
                              simSpeed === spd
                                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title={`Скорость воспроизведения ${spd}x`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Range slider */}
                    <input
                      type="range"
                      min={0}
                      max={allPlays.length - 1}
                      value={simPlayIndex}
                      onChange={(e) => {
                        setIsSimulating(false);
                        setSimPlayIndex(Number(e.target.value));
                      }}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />

                    {/* Step-by-Step Play Controls */}
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <button
                        onClick={() => {
                          setIsSimulating(false);
                          setSimPlayIndex(0);
                        }}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
                        title="В самое начало матча"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setIsSimulating(false);
                          setSimPlayIndex((prev) => Math.max(0, prev - 1));
                        }}
                        className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-bold transition"
                        title="Предыдущий розыгрыш"
                      >
                        ◀ Назад
                      </button>

                      <button
                        onClick={() => {
                          if (!isSimulating && simPlayIndex >= allPlays.length - 1) {
                            setSimPlayIndex(0);
                          }
                          setIsSimulating(!isSimulating);
                        }}
                        className="px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 shadow-md"
                        style={{
                          background: isSimulating
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#fff',
                        }}
                      >
                        {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isSimulating ? 'Пауза' : 'Воспроизведение'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsSimulating(false);
                          setSimPlayIndex((prev) => Math.min(allPlays.length - 1, prev + 1));
                        }}
                        className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-bold transition"
                        title="Следующий розыгрыш"
                      >
                        Вперёд ▶
                      </button>

                      <button
                        onClick={() => {
                          setIsSimulating(false);
                          setSimPlayIndex(allPlays.length - 1);
                        }}
                        className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-[10px] font-mono transition"
                        title="К последнему розыгрышу"
                      >
                        Финал ⏭
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Live Play-by-Play Text Feed (7 cols) */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-red-500" />
                    Текстовая трансляция каждого розыгрыша
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Beginner mode toggle */}
                    <button
                      onClick={() => {
                        const next = !beginnerMode;
                        setBeginnerMode(next);
                        localStorage.setItem('mlb_beginner_mode', next ? '1' : '0');
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10.5px] font-bold transition-all ${
                        beginnerMode
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title="Включить пояснения бейсбольных терминов для новичков"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>🎓 Новичкам</span>
                    </button>

                    {/* Sort Order toggle */}
                    <button
                      onClick={() => setPlaySortAsc((v) => !v)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 text-[10.5px] font-bold hover:text-white transition-all"
                      title="Переключить порядок розыгрышей"
                    >
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      <span>{playSortAsc ? 'По порядку' : 'Свежие сверху'}</span>
                    </button>

                    {/* Translate toggle */}
                    <button
                      onClick={() => setTranslateEnabled((v) => !v)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10.5px] font-bold transition-all ${
                        translateEnabled
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title="Переключить язык трансляции: EN / RU (Google Translate)"
                    >
                      {translateEnabled ? '🇷🇺 RU' : '🇺🇸 EN'}
                    </button>
                  </div>
                </div>

                {/* Filter Chips Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0">
                    <Filter className="w-3 h-3" />
                    Фильтр:
                  </span>
                  <button
                    onClick={() => setPlayFilter('all')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all shrink-0 ${
                      playFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Все ({allPlays.length})
                  </button>
                  <button
                    onClick={() => setPlayFilter('scoring')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all shrink-0 ${
                      playFilter === 'scoring'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Очки / RBI
                  </button>
                  <button
                    onClick={() => setPlayFilter('hr')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all shrink-0 ${
                      playFilter === 'hr'
                        ? 'bg-red-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Хоум-раны
                  </button>
                  <button
                    onClick={() => setPlayFilter('k')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all shrink-0 ${
                      playFilter === 'k'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Страйкауты
                  </button>
                </div>

                {/* Plays List */}
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {(() => {
                    const candidatePlays = allPlays.slice(0, simPlayIndex + 1);
                    const filtered = candidatePlays.filter((p) => {
                      if (playFilter === 'scoring') return (p.result?.rbi || 0) > 0 || p.result?.eventType === 'home_run';
                      if (playFilter === 'hr') return p.result?.eventType === 'home_run';
                      if (playFilter === 'k') return p.result?.eventType === 'strikeout' || p.result?.event?.toLowerCase().includes('strikeout');
                      return true;
                    });
                    const ordered = playSortAsc ? filtered : [...filtered].reverse();

                    if (ordered.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500 text-xs">
                          {playFilter === 'all'
                            ? 'Ожидание первых розыгрышей матча...'
                            : 'Нет розыгрышей, соответствующих выбранному фильтру.'}
                        </div>
                      );
                    }

                    return ordered.map((play, pIdx) => {
                      const isHr = play.result?.eventType === 'home_run';
                      const isScore = (play.result?.rbi || 0) > 0;
                      const isOut = play.result?.isOut;
                      const eventKey = (play.result?.eventType || '').toLowerCase();
                      const beginnerNote = beginnerMode ? BEGINNER_NOTES_RU[eventKey] : null;

                      return (
                        <div
                          key={play.about?.atBatIndex ?? pIdx}
                          className={`p-3 rounded-lg border text-xs transition ${
                            pIdx === 0 && !playSortAsc
                              ? 'bg-slate-900 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
                              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                {play.about?.isTopInning ? '▲ Верх' : '▼ Низ'} {play.about?.inning}
                              </span>
                              {isHr && (
                                <span className="font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                                  <Flame className="w-3 h-3 text-red-400" />
                                  ХОУМ-РАН!
                                </span>
                              )}
                              {isScore && !isHr && (
                                <span className="font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded text-[10px]">
                                  +{play.result?.rbi} РАН
                                </span>
                              )}
                              {isOut && (
                                <span className="font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                  Аут
                                </span>
                              )}
                            </div>

                            <div className="font-mono text-slate-400 text-[11px]">
                              {play.result?.awayScore} - {play.result?.homeScore}
                            </div>
                          </div>

                          {(() => {
                            const orig = play.result?.description || 'Розыгрыш на бите';
                            const translated = translateEnabled && translations[orig];
                            return (
                              <div>
                                <p className="text-slate-200 font-medium leading-relaxed">
                                  {translated || orig}
                                </p>
                                {translateEnabled && !translated && (
                                  <p className="text-slate-500 text-[10px] italic mt-0.5">переводится...</p>
                                )}
                              </div>
                            );
                          })()}

                          {/* Beginner note */}
                          {beginnerNote && (
                            <div className="mt-2 p-2 rounded-lg bg-blue-950/40 border border-blue-500/20 text-blue-200 text-[11px] leading-relaxed">
                              🎓 <span className="font-bold">Пояснение:</span> {beginnerNote}
                            </div>
                          )}

                          {/* Pitch events breakdown */}
                          {play.playEvents && play.playEvents.length > 0 && (
                            <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex flex-wrap gap-1">
                              {play.playEvents
                                .filter((e) => e.pitchData?.startSpeed)
                                .map((pitch, pNum) => (
                                  <span
                                    key={pNum}
                                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
                                  >
                                    #{pNum + 1}: {pitch.pitchData?.type?.description || 'Pitch'}{' '}
                                    {pitch.pitchData?.startSpeed?.toFixed(0)} mph
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          )}

          {/* TAB: BOXSCORE */}
          {activeTab === 'boxscore' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <BoxscoreWidget
                boxscore={feedData?.liveData?.boxscore}
                awayTeam={game.teams.away.team}
                homeTeam={game.teams.home.team}
                onSelectPlayer={(id, name) => {
                  setSelectedPlayerId(id);
                  setSelectedPlayerName(name);
                }}
                onSelectTeam={(id, name) => {
                  onSelectTeam?.(id, name);
                }}
              />
            </div>
          )}

          {/* TAB: STRIKE ZONE */}
          {activeTab === 'strikezone' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <StrikeZoneWidget
                currentPlay={currentPlay}
                allPlays={allPlays}
                onSelectPlayer={(id, name) => {
                  setSelectedPlayerId(id);
                  setSelectedPlayerName(name);
                }}
              />
            </div>
          )}

          {/* TAB: SPRAY CHART */}
          {activeTab === 'spraychart' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <SprayChartWidget
                allPlays={allPlays}
                onSelectPlayer={(id, name) => {
                  setSelectedPlayerId(id);
                  setSelectedPlayerName(name);
                }}
              />
            </div>
          )}

          {/* TAB: VIDEO HIGHLIGHTS */}
          {activeTab === 'highlights' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <HighlightsWidget gamePk={game.gamePk} />
            </div>
          )}

          {/* TAB: VENUE / STADIUM PROFILE */}
          {activeTab === 'venue' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <VenueProfileWidget
                venueId={(game.venue as any)?.id || (feedData?.gameData?.venue as any)?.id}
                venueName={game.venue?.name}
              />
            </div>
          )}

          {/* TAB: WIN PROBABILITY SVG CHART */}
          {activeTab === 'winprob' && (
            <div className="space-y-4">
              <WinProbabilityChart
                data={effectiveWinProbData}
                homeTeam={game.teams.home.team}
                awayTeam={game.teams.away.team}
                onSelectPlay={(atBatIdx) => {
                  const playFound = allPlays.findIndex((p) => p.about?.atBatIndex === atBatIdx);
                  if (playFound >= 0) {
                    setSimPlayIndex(playFound);
                  }
                }}
              />

              {/* Highlight Moments List */}
              {highlightPlays.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Ключевые поворотные моменты игры (High Leverage)
                  </h4>
                  <div className="space-y-2">
                    {highlightPlays.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="text-amber-400 font-bold mr-2">
                            {p.about?.isTopInning ? '▲ Верх' : '▼ Низ'} {p.about?.inning}:
                          </span>
                          <span className="text-slate-200">{p.result?.description}</span>
                        </div>
                        <span className="font-mono text-slate-400 shrink-0">
                          {p.result?.awayScore} - {p.result?.homeScore}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LINEUPS & STARTING PITCHERS */}
          {activeTab === 'lineups' && (
            <div className="space-y-6">
              {/* Pitchers Matchup Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Away Pitcher */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-900 overflow-hidden ring-2 ring-slate-700 shrink-0">
                    {awayPitcher?.id ? (
                      <img
                        src={getPlayerPhotoUrl(awayPitcher.id)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">
                        SP
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Стартовый питчер ({game.teams.away.team.abbreviation})
                    </span>
                    <h5 className="font-bold text-white text-base">
                      {awayPitcher?.fullName || 'Информация уточняется'}
                    </h5>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Назначенный стартер гостей
                    </p>
                  </div>
                </div>

                {/* Home Pitcher */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-900 overflow-hidden ring-2 ring-slate-700 shrink-0">
                    {homePitcher?.id ? (
                      <img
                        src={getPlayerPhotoUrl(homePitcher.id)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">
                        SP
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Стартовый питчер ({game.teams.home.team.abbreviation})
                    </span>
                    <h5 className="font-bold text-white text-base">
                      {homePitcher?.fullName || 'Информация уточняется'}
                    </h5>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Назначенный стартер хозяев
                    </p>
                  </div>
                </div>
              </div>

              {/* Batting Orders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Away Lineup */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <img src={getTeamLogoUrl(game.teams.away.team.id)} className="w-5 h-5" alt="" />
                    <h4 className="font-bold text-sm text-white">
                      Порядок отбивания (Lineup) — {game.teams.away.team.name}
                    </h4>
                  </div>

                  <div className="space-y-1.5">
                    {awayLineup.length > 0 ? (
                      awayLineup.map((p, idx) => (
                        <div
                          key={p.person?.id || idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 font-mono font-bold text-slate-400">{idx + 1}.</span>
                            <span className="font-semibold text-slate-200">{p.person?.fullName}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                              {p.position?.abbreviation}
                            </span>
                            {p.seasonStats?.batting?.avg && (
                              <span className="text-slate-400 text-[11px]">
                                AVG: {p.seasonStats.batting.avg}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 py-4 text-center">
                        Стартовый лайнап появится за час до игры
                      </p>
                    )}
                  </div>
                </div>

                {/* Home Lineup */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <img src={getTeamLogoUrl(game.teams.home.team.id)} className="w-5 h-5" alt="" />
                    <h4 className="font-bold text-sm text-white">
                      Порядок отбивания (Lineup) — {game.teams.home.team.name}
                    </h4>
                  </div>

                  <div className="space-y-1.5">
                    {homeLineup.length > 0 ? (
                      homeLineup.map((p, idx) => (
                        <div
                          key={p.person?.id || idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 font-mono font-bold text-slate-400">{idx + 1}.</span>
                            <span className="font-semibold text-slate-200">{p.person?.fullName}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                              {p.position?.abbreviation}
                            </span>
                            {p.seasonStats?.batting?.avg && (
                              <span className="text-slate-400 text-[11px]">
                                AVG: {p.seasonStats.batting.avg}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 py-4 text-center">
                        Стартовый лайнап появится за час до игры
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HEAD TO HEAD HISTORY */}
          {activeTab === 'h2h' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-400" />
                  История очных встреч в сезоне ({game.teams.away.team.name} vs {game.teams.home.team.name})
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Результаты предыдущих матчей между соперниками
                </p>
              </div>

              {h2hGames.length === 0 ? (
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium py-6 text-center">
                  Данные по очным встречам сезона загружаются...
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {h2hGames.map((hGame, idx) => (
                    <div
                      key={`${hGame.gamePk}-${idx}`}
                      className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                    >
                      <div>
                        <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 dark:bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/20 inline-block">
                          {new Date(hGame.gameDate).toLocaleDateString('ru-RU')}
                        </span>
                        <div className="font-bold text-slate-900 dark:text-white mt-1">
                          {hGame.teams.away.team.abbreviation} vs {hGame.teams.home.team.abbreviation}
                        </div>
                      </div>
                      <div className="font-mono font-black text-sm text-emerald-800 dark:text-emerald-300 bg-emerald-500/20 border border-emerald-500/35 px-2.5 py-1 rounded-lg tabular-nums shadow-sm">
                        {hGame.teams.away.score} : {hGame.teams.home.score}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 dark:bg-slate-950 px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-medium">
          <span>MLB Official Live Data Feed • statsapi.mlb.com</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/25 font-bold transition cursor-pointer"
          >
            Закрыть экран
          </button>
        </div>

        </div>
      </div>
    </div>

    {/* Player Detail Popover Modal */}
    {selectedPlayerId && (
      <PlayerDetailModal
        playerId={selectedPlayerId}
        playerName={selectedPlayerName}
        onClose={() => {
          setSelectedPlayerId(null);
          setSelectedPlayerName(undefined);
        }}
      />
    )}

    
    </>
  );
};
