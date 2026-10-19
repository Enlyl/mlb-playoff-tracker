import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as k from './iso/iso-kit';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Flame,
  Zap,
  FastForward,
  Rewind,
  Eye,
  Shield,
  Activity,
  Layers,
  ChevronRight,
  TrendingUp,
  Volume2,
} from 'lucide-react';
import { PlayItem, MLBGame } from '../services/mlbApi';
import { sounds } from '../services/soundEffects';

interface Match3DReplayProps {
  game: MLBGame;
  allPlays: PlayItem[];
  currentIndex?: number;
  onSelectPlayIndex?: (index: number) => void;
}

export const Match3DReplay: React.FC<Match3DReplayProps> = ({
  game,
  allPlays,
  currentIndex: externalIndex,
  onSelectPlayIndex,
}) => {
  const [playIdx, setPlayIdx] = useState<number>(externalIndex ?? 0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playProgress, setPlayProgress] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [filterHighlightsOnly, setFilterHighlightsOnly] = useState<boolean>(false);

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Sync with external index if changed externally
  useEffect(() => {
    if (externalIndex !== undefined && externalIndex !== playIdx) {
      setPlayIdx(externalIndex);
      setPlayProgress(0);
    }
  }, [externalIndex]);

  // Filter scoring / highlight plays
  const eligibleIndices = useMemo(() => {
    if (!filterHighlightsOnly) {
      return allPlays.map((_, i) => i);
    }
    const filtered: number[] = [];
    allPlays.forEach((p, idx) => {
      const isScoring = p.about?.isScoringPlay || (p.result?.rbi || 0) > 0;
      const isHr = p.result?.eventType === 'home_run';
      const isOut3 = p.count?.outs === 3;
      if (isScoring || isHr || isOut3) {
        filtered.push(idx);
      }
    });
    return filtered.length > 0 ? filtered : allPlays.map((_, i) => i);
  }, [allPlays, filterHighlightsOnly]);

  const currentPlay: PlayItem | undefined = allPlays[playIdx];

  // Play animation loop
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastTimeRef.current !== null) {
        const delta = (now - lastTimeRef.current) / 1000;
        // One play takes ~2.4 seconds at 1x
        setPlayProgress((prev) => {
          const next = prev + delta * 0.42 * playbackSpeed;
          if (next >= 1) {
            // Next play in timeline
            const curPos = eligibleIndices.indexOf(playIdx);
            if (curPos >= 0 && curPos < eligibleIndices.length - 1) {
              const nextIdx = eligibleIndices[curPos + 1];
              setPlayIdx(nextIdx);
              onSelectPlayIndex?.(nextIdx);
              // Trigger sound on transition
              const nextPlay = allPlays[nextIdx];
              if (nextPlay?.result?.eventType === 'home_run') {
                sounds.playHomeRunCelebration();
              } else if ((nextPlay?.result?.rbi || 0) > 0) {
                sounds.playScoreChange();
              } else if (nextPlay?.result?.eventType === 'strikeout') {
                sounds.playStrikeout();
              } else {
                sounds.playGloveCatch();
              }
              return 0;
            } else {
              setIsPlaying(false);
              return 1;
            }
          }
          return next;
        });
      }
      lastTimeRef.current = now;
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, playIdx, eligibleIndices, allPlays, onSelectPlayIndex]);

  // World & Camera Projection
  const WIDTH = 920;
  const HEIGHT = 490;

  const P = useMemo(() => {
    return k.fitProjection(
      [
        [-150, -110, 0],
        [150, 110, 0],
        [0, 0, 150],
        [-110, 110, 70],
        [110, -110, 70],
      ],
      WIDTH,
      HEIGHT,
      { pad: 40, azimuth: 44, elevation: 33 }
    );
  }, []);

  const at = (pt: k.Point3): k.Flat => k.iso(pt, P);

  // Extract play metadata
  const eventType = currentPlay?.result?.eventType || '';
  const desc = currentPlay?.result?.description || 'Ожидание розыгрыша...';
  const inningStr = currentPlay?.about
    ? `${currentPlay.about.isTopInning ? '▲ Верх' : '▼ Низ'} ${currentPlay.about.inning} иннинга`
    : '';
  const awayScore = currentPlay?.result?.awayScore ?? game.teams.away.score ?? 0;
  const homeScore = currentPlay?.result?.homeScore ?? game.teams.home.score ?? 0;
  const isHr = eventType === 'home_run';
  const isScoring = (currentPlay?.result?.rbi || 0) > 0;
  const isK = eventType === 'strikeout';

  // Pitch Data from play events
  const pitchEvents = (currentPlay?.playEvents || []).filter((e) => e.pitchData);
  const lastPitch = pitchEvents[pitchEvents.length - 1];
  const pitchSpeed = lastPitch?.pitchData?.startSpeed ? `${lastPitch.pitchData.startSpeed.toFixed(1)} mph` : '94.5 mph';
  const pitchType = lastPitch?.pitchData?.type?.description || (isK ? 'Слайдер' : isHr ? 'Фастбол' : 'Подача');

  // SVG Geometry of Baseball Field & Moving Parts
  const geometry = useMemo(() => {
    // 1. Heavy Base Machine Platform
    const BASE_PLAN = { x: -140, y: -95, w: 280, d: 190, r: 14 };
    const BASE_H = 10;
    const FOOT_H = 5;

    const baseFill = k.haloOf(BASE_PLAN, -BASE_H - FOOT_H, BASE_H, P);
    const baseSlab = k.slabOf(BASE_PLAN, -BASE_H, BASE_H, P, 10, 1.4);
    const baseInset = k.planOutline(k.insetPlan(BASE_PLAN, 4.5), 0, P);
    const baseScrews = k.corners(BASE_PLAN, 9);

    // Front Ruler Strip
    const ruler = { x: -120, y: BASE_PLAN.y + BASE_PLAN.d - 12, w: 240, d: 6, r: 1 };
    const rulerSlab = k.slabOf(ruler, 0, 0.6, P, 2);
    const ticks = k.topTicks(ruler.x + 4, ruler.x + ruler.w - 4, 4, 5, ruler.y + 0.5, 0.6, [1.8, 3.2], P);

    // 2. Corner Pillars
    const postCoords: [number, number][] = [
      [-120, -75],
      [120, -75],
      [-120, 75],
      [120, 75],
    ];
    const posts = postCoords.map(([x, y]) => {
      return {
        cyl: k.cylinder(x, y, 4, 0, 14, P, 24),
        cap: k.cylinder(x, y, 4.8, 14, 2, P, 24),
      };
    });

    // 3. Field Coordinates
    // Home Plate at [0, 50], 1B at [50, 0], 2B at [0, -50], 3B at [-50, 0], Mound at [0, 0]
    const HOME: k.Point3 = [0, 50, 0.5];
    const B1: k.Point3 = [50, 0, 0.5];
    const B2: k.Point3 = [0, -50, 0.5];
    const B3: k.Point3 = [-50, 0, 0.5];
    const MOUND: k.Point3 = [0, 0, 0];

    // Baselines
    const baselines = k.pathOf([at(HOME), at(B1), at(B2), at(B3)], true);

    // Foul Lines extending into outfield
    const foulLeft = k.pathOf([at(HOME), at([-95, -45, 0.2])]);
    const foulRight = k.pathOf([at(HOME), at([95, -45, 0.2])]);

    // Outfield Wall Arc
    const outfieldArc = k.pathOf([
      at([-95, -45, 0.2]),
      at([-70, -75, 0.2]),
      at([0, -90, 0.2]),
      at([70, -75, 0.2]),
      at([95, -45, 0.2]),
    ]);

    // Mound mound cylinder + rubber plate
    const moundCyl = k.cylinder(MOUND[0], MOUND[1], 18, 0, 4, P, 28);
    const rubber = k.slabOf({ x: -4, y: -1.5, w: 8, d: 3, r: 0.5 }, 4, 0.8, P, 2);

    // Base Cushions
    const padHome = k.slabOf({ x: -4, y: 46, w: 8, d: 8, r: 1 }, 0, 1.2, P, 2);
    const pad1B = k.slabOf({ x: 46, y: -4, w: 8, d: 8, r: 1.5 }, 0, 2.5, P, 2);
    const pad2B = k.slabOf({ x: -4, y: -54, w: 8, d: 8, r: 1.5 }, 0, 2.5, P, 2);
    const pad3B = k.slabOf({ x: -54, y: -4, w: 8, d: 8, r: 1.5 }, 0, 2.5, P, 2);

    // Dynamic Ball Trajectory depending on play type and progress
    const t = playProgress;
    let ballPos: k.Point3 = [0, 0, 0];
    let trailPath = '';

    if (isHr) {
      // Home run: hits into deep outfield over wall
      if (t < 0.2) {
        // Pitch phase: Mound -> Home
        const pT = t / 0.2;
        ballPos = [MOUND[0] + (HOME[0] - MOUND[0]) * pT, MOUND[1] + (HOME[1] - MOUND[1]) * pT, 14 - pT * 6];
      } else {
        // Hit phase: Home -> deep stands [20, -95, 45]
        const hT = (t - 0.2) / 0.8;
        const targetX = 25;
        const targetY = -95;
        const curX = HOME[0] + (targetX - HOME[0]) * hT;
        const curY = HOME[1] + (targetY - HOME[1]) * hT;
        const curZ = 8 + Math.sin(hT * Math.PI) * 55;
        ballPos = [curX, curY, curZ];
        trailPath = k.pathOf([at(HOME), at([(HOME[0] + targetX) / 2, (HOME[1] + targetY) / 2, 60]), at(ballPos)]);
      }
    } else if (eventType === 'single' || eventType === 'double') {
      if (t < 0.25) {
        const pT = t / 0.25;
        ballPos = [MOUND[0] + (HOME[0] - MOUND[0]) * pT, MOUND[1] + (HOME[1] - MOUND[1]) * pT, 14 - pT * 6];
      } else {
        const hT = (t - 0.25) / 0.75;
        const targetX = eventType === 'double' ? -40 : 45;
        const targetY = -45;
        const curX = HOME[0] + (targetX - HOME[0]) * hT;
        const curY = HOME[1] + (targetY - HOME[1]) * hT;
        const curZ = 6 + Math.sin(hT * Math.PI) * 22;
        ballPos = [curX, curY, curZ];
        trailPath = k.pathOf([at(HOME), at(ballPos)]);
      }
    } else if (isK) {
      // Strikeout pitch right into catcher glove at Home
      const curX = MOUND[0] + (HOME[0] - MOUND[0]) * t;
      const curY = MOUND[1] + (HOME[1] - MOUND[1]) * t;
      const curZ = 16 - t * 8;
      ballPos = [curX, curY, curZ];
      trailPath = k.pathOf([at([MOUND[0], MOUND[1], 16]), at(ballPos)]);
    } else {
      // Regular in-play grounder / flyout
      if (t < 0.3) {
        const pT = t / 0.3;
        ballPos = [MOUND[0] + (HOME[0] - MOUND[0]) * pT, MOUND[1] + (HOME[1] - MOUND[1]) * pT, 14 - pT * 6];
      } else {
        const hT = (t - 0.3) / 0.7;
        const targetX = 20;
        const targetY = -15;
        ballPos = [HOME[0] + (targetX - HOME[0]) * hT, HOME[1] + (targetY - HOME[1]) * hT, 4 + Math.sin(hT * Math.PI) * 12];
        trailPath = k.pathOf([at(HOME), at(ballPos)]);
      }
    }

    return {
      baseFill,
      baseSlab,
      baseInset,
      baseScrews,
      rulerSlab,
      ticks,
      posts,
      baselines,
      foulLeft,
      foulRight,
      outfieldArc,
      moundCyl,
      rubber,
      padHome,
      pad1B,
      pad2B,
      pad3B,
      ballPos,
      trailPath,
      HOME,
      B1,
      B2,
      B3,
      MOUND,
    };
  }, [P, playProgress, eventType, isHr, isK]);

  return (
    <div className="iso rounded-2xl overflow-hidden border border-white/10 bg-[#0d1117] text-slate-200 shadow-2xl space-y-0">
      
      {/* ── TOP HEADER (HUD + LIVE GAME CONTEXT) ── */}
      <div className="px-5 py-4 bg-[#161b22] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1.5 shadow-sm">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            3D МАТЧ-ТРЕКЕР (MLB API)
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">
                {game.teams.away.team.name} <span className="text-red-400">{awayScore}</span> : <span className="text-blue-400">{homeScore}</span> {game.teams.home.team.name}
              </h3>
              <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-white/5 border border-white/5">
                {inningStr}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xl">
              {desc}
            </p>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterHighlightsOnly(!filterHighlightsOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              filterHighlightsOnly
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Только голы & хайлайты</span>
          </button>
        </div>
      </div>

      {/* ── 3D ISOMETRIC STAGE ── */}
      <div className="relative bg-[#090d16] p-4 sm:p-6 flex items-center justify-center overflow-hidden min-h-[420px]">
        {/* Radial Pitch Glow */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, #38bdf8 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="iso-svg max-w-full h-auto drop-shadow-2xl select-none"
          style={{ maxHeight: '490px' }}
        >
          {/* Base Halo Shadow */}
          <path className="iso-halo" d={geometry.baseFill} />

          {/* Heavy Base Slab (Four-tone Shaded) */}
          <path className="iso-fill" d={geometry.baseSlab.fill} />
          {geometry.baseSlab.shades.map((d, s) => (
            <path key={s} className="iso-shade" data-shade={s} d={d} />
          ))}
          <path className="iso-top" d={geometry.baseSlab.top} />
          <path className="iso-line" data-tone="hi" d={geometry.baseSlab.outline} />

          {/* Base Inset Groove */}
          <path className="iso-line" data-tone="faint" d={geometry.baseInset} />

          {/* Corner Screws */}
          {geometry.baseScrews.map(([x, y], idx) => (
            <circle
              key={idx}
              cx={at([x, y, 0])[0]}
              cy={at([x, y, 0])[1]}
              r={1.8}
              fill="#e2e8f0"
              stroke="#475569"
              strokeWidth={0.5}
            />
          ))}

          {/* Calibrated Ruler Strip */}
          <path className="iso-fill" d={geometry.rulerSlab.fill} />
          <path className="iso-line" data-tone="lo" d={geometry.rulerSlab.outline} />
          <path className="iso-line" data-tone="lo" d={geometry.ticks.minor} />
          <path className="iso-line" data-tone="mid" d={geometry.ticks.major} />

          {/* Pillars */}
          {geometry.posts.map((post, idx) => (
            <g key={idx}>
              <path className="iso-fill" d={post.cyl.fill} />
              <path className="iso-line" data-tone="lo" d={post.cyl.outline} />
              <path className="iso-top" d={post.cyl.top} />
              <path className="iso-fill" d={post.cap.fill} />
              <path className="iso-line" data-tone="mid" d={post.cap.outline} />
            </g>
          ))}

          {/* Foul Lines & Outfield Wall Arc */}
          <path className="iso-line" data-tone="faint" data-dashed d={geometry.foulLeft} />
          <path className="iso-line" data-tone="faint" data-dashed d={geometry.foulRight} />
          <path className="iso-line" data-tone="mid" strokeWidth={1.4} d={geometry.outfieldArc} />

          {/* Baselines Diamond */}
          <path className="iso-line" data-tone="hi" strokeWidth={1.8} d={geometry.baselines} />

          {/* Mound and Pitcher Rubber */}
          <path className="iso-shade" data-shade="1" d={geometry.moundCyl.fill} />
          <path className="iso-line" data-tone="mid" d={geometry.moundCyl.outline} />
          <path className="iso-top" d={geometry.moundCyl.top} />
          <path className="iso-solid" data-lit d={geometry.rubber.fill} />
          <path className="iso-line" data-tone="hi" d={geometry.rubber.outline} />

          {/* Base Cushions */}
          <path className="iso-solid" data-lit d={geometry.padHome.fill} />
          <path className="iso-line" data-tone="hi" d={geometry.padHome.outline} />
          <path className="iso-solid" data-lit d={geometry.pad1B.fill} />
          <path className="iso-line" data-tone="hi" d={geometry.pad1B.outline} />
          <path className="iso-solid" data-lit d={geometry.pad2B.fill} />
          <path className="iso-line" data-tone="hi" d={geometry.pad2B.outline} />
          <path className="iso-solid" data-lit d={geometry.pad3B.fill} />
          <path className="iso-line" data-tone="hi" d={geometry.pad3B.outline} />

          {/* Base Labels */}
          <text x={at([geometry.B1[0] + 9, geometry.B1[1], 0])[0]} y={at([geometry.B1[0] + 9, geometry.B1[1], 0])[1]} fill="#94a3b8" fontSize={10} fontWeight="800">1B</text>
          <text x={at([geometry.B2[0], geometry.B2[1] - 9, 0])[0]} y={at([geometry.B2[0], geometry.B2[1] - 9, 0])[1]} fill="#94a3b8" fontSize={10} fontWeight="800">2B</text>
          <text x={at([geometry.B3[0] - 13, geometry.B3[1], 0])[0]} y={at([geometry.B3[0] - 13, geometry.B3[1], 0])[1]} fill="#94a3b8" fontSize={10} fontWeight="800">3B</text>
          <text x={at([geometry.HOME[0], geometry.HOME[1] + 12, 0])[0]} y={at([geometry.HOME[0], geometry.HOME[1] + 12, 0])[1]} fill="#10b981" fontSize={10} fontWeight="900">HOME</text>

          {/* Hit Trajectory Trail */}
          {geometry.trailPath && (
            <path
              className="iso-line"
              data-tone={isHr ? 'red' : isK ? 'blue' : 'green'}
              strokeWidth={2.4}
              d={geometry.trailPath}
            />
          )}

          {/* Live Flying Ball */}
          <g>
            <circle
              cx={at(geometry.ballPos)[0]}
              cy={at(geometry.ballPos)[1]}
              r={7}
              fill="#ffffff"
              stroke={isHr ? '#ef4444' : isK ? '#38bdf8' : '#10b981'}
              strokeWidth={1.5}
            />
            {/* Ground Shadow */}
            <ellipse
              cx={at([geometry.ballPos[0], geometry.ballPos[1], 0.2] as k.Point3)[0]}
              cy={at([geometry.ballPos[0], geometry.ballPos[1], 0.2] as k.Point3)[1]}
              rx={6}
              ry={3}
              fill="rgba(0,0,0,0.4)"
            />
          </g>

          {/* Home Run Celebration Firework Particles */}
          {isHr && playProgress > 0.4 && (
            <g className="animate-pulse">
              <circle cx={at([25, -95, 45] as k.Point3)[0]} cy={at([25, -95, 45] as k.Point3)[1]} r={20} fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.6} />
              <circle cx={at([25, -95, 45] as k.Point3)[0]} cy={at([25, -95, 45] as k.Point3)[1]} r={35} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.4} />
            </g>
          )}
        </svg>

        {/* ── TOP-RIGHT HUD (REAL API TELEMETRY) ── */}
        <div className="absolute top-4 right-4 bg-[#111827]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl pointer-events-none flex items-center gap-4 text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Тип броска</div>
            <div className="text-sm font-black text-cyan-400">{pitchType}</div>
          </div>
          <div className="w-[1px] h-7 bg-white/10" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Скорость</div>
            <div className="text-sm font-black text-white">{pitchSpeed}</div>
          </div>
          <div className="w-[1px] h-7 bg-white/10" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Событие</div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase block ${
                isHr
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                  : isScoring
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : isK
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {eventType.replace('_', ' ') || 'PLAY'}
            </span>
          </div>
        </div>

        {/* Current Matchup Overlay (Bottom Left) */}
        <div className="absolute bottom-4 left-4 bg-[#111827]/90 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 shadow-lg text-xs pointer-events-none flex items-center gap-3">
          <div>
            <span className="text-[10px] text-slate-400 block">Питчер</span>
            <span className="font-bold text-white text-xs">{currentPlay?.matchup?.pitcher?.fullName || 'Pitcher'}</span>
          </div>
          <span className="text-slate-600 font-mono">VS</span>
          <div>
            <span className="text-[10px] text-slate-400 block">Баттер</span>
            <span className="font-bold text-emerald-400 text-xs">{currentPlay?.matchup?.batter?.fullName || 'Batter'}</span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM PLAYBACK TIMELINE CONTROLS ── */}
      <div className="px-5 py-3.5 bg-[#161b22] border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
        {/* Play / Pause / Step Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsPlaying(!isPlaying);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md cursor-pointer active:scale-95"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Пауза' : 'Смотреть'}</span>
          </button>

          <button
            onClick={() => {
              setPlayIdx(0);
              setPlayProgress(0);
              onSelectPlayIndex?.(0);
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition border border-white/10 cursor-pointer"
            title="В начало матча"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              const curPos = eligibleIndices.indexOf(playIdx);
              if (curPos > 0) {
                const prevIdx = eligibleIndices[curPos - 1];
                setPlayIdx(prevIdx);
                setPlayProgress(0);
                onSelectPlayIndex?.(prevIdx);
              }
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition border border-white/10 cursor-pointer"
            title="Предыдущий розыгрыш"
          >
            <Rewind className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              const curPos = eligibleIndices.indexOf(playIdx);
              if (curPos < eligibleIndices.length - 1) {
                const nextIdx = eligibleIndices[curPos + 1];
                setPlayIdx(nextIdx);
                setPlayProgress(0);
                onSelectPlayIndex?.(nextIdx);
              }
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition border border-white/10 cursor-pointer"
            title="Следующий розыгрыш"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>

          {/* Speed switcher */}
          <div className="flex items-center gap-1 ml-2 text-[11px] font-mono font-bold text-slate-400">
            <span>Скорость:</span>
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-1.5 py-0.5 rounded transition ${
                  playbackSpeed === s ? 'bg-white/20 text-white' : 'hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex-1 min-w-[220px] flex items-center gap-3">
          <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap">
            Розыгрыш {playIdx + 1} / {allPlays.length}:
          </span>
          <input
            type="range"
            min={0}
            max={allPlays.length - 1}
            value={playIdx}
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              setPlayIdx(idx);
              setPlayProgress(0);
              setIsPlaying(false);
              onSelectPlayIndex?.(idx);
            }}
            className="flex-1 accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
