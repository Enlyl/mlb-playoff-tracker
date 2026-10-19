import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as k from './iso/iso-kit';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  Compass,
  Eye,
  Sliders,
  ChevronRight,
  Shield,
  Activity,
  Target,
} from 'lucide-react';
import { sounds } from '../services/soundEffects';

export type RuleMode = 'strikezone' | 'diamond' | 'doubleplay' | 'pitchtypes';

interface ModeConfig {
  id: RuleMode;
  title: string;
  subtitle: string;
  hint: string;
  readoutLabel: string;
  badge: string;
  color: string;
}

const MODES: ModeConfig[] = [
  {
    id: 'strikezone',
    title: 'Страйк-зона & Подача (3D Риг)',
    subtitle: 'Прямоугольник над домом: ширина 43.2 см (17"), высота от колен до груди бьющего',
    hint: 'Двигайте ползунок или нажмите Плей для броска с замером траектории',
    readoutLabel: 'Скорость & Зона',
    badge: 'BALL vs STRIKE',
    color: '#ef4444',
  },
  {
    id: 'diamond',
    title: 'Инфилд & Базы (Diamond Риг)',
    subtitle: 'Ромб 90×90 футов (27.43 м). Сиквенс движения раннеров по базам к дому',
    hint: 'Управляйте фазой атаки: контакт с битой, продвижение и взятие очка',
    readoutLabel: 'Позиция раннеров',
    badge: 'BASERUNNING',
    color: '#10b981',
  },
  {
    id: 'doubleplay',
    title: 'Дабл-плей 6-4-3 (Кинематика)',
    subtitle: 'Шортстоп (6) ➔ Вторая база (4) ➔ Первая база (3) за 2.4 секунды',
    hint: 'Наблюдайте 2 аута одним ударом через синхронный таймлайн',
    readoutLabel: 'Тайминг передачи',
    badge: 'DOUBLE PLAY',
    color: '#f59e0b',
  },
  {
    id: 'pitchtypes',
    title: 'Вращение & Типы подач (Spin Rig)',
    subtitle: 'Фастбол (бэк-спин 2400 RPM), Слайдер (горизонтальный слайд), Кёрвбол (топ-спин)',
    hint: 'Переключайте типы подач и наблюдайте физику излома траектории (Break)',
    readoutLabel: 'Траектория & Спин',
    badge: 'PITCH ARSENAL',
    color: '#06b6d4',
  },
];

export const AnatomyBaseballFigure: React.FC = () => {
  const [activeMode, setActiveMode] = useState<RuleMode>('strikezone');
  const [progress, setProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [selectedPitch, setSelectedPitch] = useState<'fastball' | 'slider' | 'curveball'>('fastball');
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastTimeRef.current !== null) {
        const delta = (now - lastTimeRef.current) / 1000;
        setProgress((prev) => {
          const next = prev + delta * 0.45 * speed;
          if (next >= 1) {
            // Trigger sound on cycle repeat
            if (activeMode === 'strikezone') sounds.playGloveCatch();
            if (activeMode === 'diamond') sounds.playBatCrack();
            if (activeMode === 'doubleplay') sounds.playGloveCatch();
            return 0;
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
  }, [isPlaying, speed, activeMode]);

  // World & Camera Projection
  const WIDTH = 920;
  const HEIGHT = 480;

  const P = useMemo(() => {
    return k.fitProjection(
      [
        [-140, -100, 0],
        [140, 100, 0],
        [0, 0, 160],
        [-100, 100, 80],
        [100, -100, 80],
      ],
      WIDTH,
      HEIGHT,
      { pad: 45, azimuth: 44, elevation: 32 }
    );
  }, []);

  const at = (pt: k.Point3): k.Flat => k.iso(pt, P);

  // Dynamic live calculations based on mode and progress
  const readoutData = useMemo(() => {
    if (activeMode === 'strikezone') {
      const distFt = (60.5 * (1 - progress)).toFixed(1);
      const speedMph = (98.4 - progress * 4.2).toFixed(1);
      const isStrike = progress > 0.85;
      return {
        val1: `${speedMph} mph`,
        label1: 'Скорость',
        val2: `${distFt} ft`,
        label2: 'Дистанция',
        status: isStrike ? 'STRIKE' : 'PITCHING',
        statusColor: '#ef4444',
      };
    }
    if (activeMode === 'diamond') {
      const phase = progress < 0.33 ? 'Бита: Контакт' : progress < 0.66 ? 'Бег: 1B ➔ 2B' : 'Забегание в Дом!';
      const runs = progress > 0.85 ? '1 RUN (+1)' : '0 RUNS';
      return {
        val1: runs,
        label1: 'Очки',
        val2: phase,
        label2: 'Фаза игры',
        status: progress > 0.85 ? 'SAFE IN HOME' : 'IN PLAY',
        statusColor: '#10b981',
      };
    }
    if (activeMode === 'doubleplay') {
      const timeMs = (progress * 2.4).toFixed(2);
      const outs = progress < 0.4 ? '0 Outs' : progress < 0.8 ? '1 Out (2B)' : '2 Outs (1B)!';
      return {
        val1: outs,
        label1: 'Результат',
        val2: `${timeMs} сек`,
        label2: 'Тайминг',
        status: progress > 0.8 ? 'DOUBLE PLAY!' : 'TURNING 6-4-3',
        statusColor: '#f59e0b',
      };
    }
    // pitchtypes
    const breakIn = selectedPitch === 'slider' ? '14.2"' : selectedPitch === 'curveball' ? '18.6"' : '4.1"';
    const rpm = selectedPitch === 'slider' ? '2540 RPM' : selectedPitch === 'curveball' ? '2820 RPM' : '2380 RPM';
    return {
      val1: breakIn,
      label1: 'Излом (Break)',
      val2: rpm,
      label2: 'Вращение',
      status: selectedPitch.toUpperCase(),
      statusColor: '#06b6d4',
    };
  }, [activeMode, progress, selectedPitch]);

  // SVG Geometry generation with solid parts & four-tone shading
  const geometry = useMemo(() => {
    // 1. Heavy Base Plate with feet & bevels
    const BASE_PLAN = { x: -130, y: -90, w: 260, d: 180, r: 12 };
    const BASE_H = 10;
    const FOOT_H = 5;

    const baseFill = k.haloOf(BASE_PLAN, -BASE_H - FOOT_H, BASE_H, P);
    const baseSlab = k.slabOf(BASE_PLAN, -BASE_H, BASE_H, P, 10, 1.4);
    const baseInset = k.planOutline(k.insetPlan(BASE_PLAN, 4), 0, P);
    const baseScrews = k.corners(BASE_PLAN, 8);

    // Front Ruler Strip
    const ruler = { x: -110, y: BASE_PLAN.y + BASE_PLAN.d - 12, w: 220, d: 6, r: 1 };
    const rulerSlab = k.slabOf(ruler, 0, 0.6, P, 2);
    const ticks = k.topTicks(ruler.x + 4, ruler.x + ruler.w - 4, 4, 5, ruler.y + 0.5, 0.6, [1.8, 3.2], P);

    // 2. Corner Posts & Guide Rails
    const postCoords: [number, number][] = [
      [-110, -70],
      [110, -70],
      [-110, 70],
      [110, 70],
    ];
    const posts = postCoords.map(([x, y]) => {
      return {
        cyl: k.cylinder(x, y, 4, 0, 14, P, 24),
        cap: k.cylinder(x, y, 4.8, 14, 2, P, 24),
      };
    });

    // 3. Central Apparatus based on mode
    let apparatus: React.ReactNode = null;

    if (activeMode === 'strikezone') {
      // Home Plate pentagon on ground
      // Mound at back-left, Plate at front-right
      const MOUND = [-65, -30];
      const PLATE = [45, 25];

      const moundCyl = k.cylinder(MOUND[0], MOUND[1], 24, 0, 6, P, 32);
      const rubberSlab = k.slabOf({ x: MOUND[0] - 6, y: MOUND[1] - 2, w: 12, d: 4, r: 0.5 }, 6, 0.8, P, 2);

      // Strike Zone Rig (Gantry frame + Wireframe Box)
      const SZ_W = 18;
      const SZ_H = 26;
      const SZ_Z = 16;
      const SZ_X = PLATE[0];
      const SZ_Y = PLATE[1];

      // Gantry vertical posts
      const szPostLeft = k.cylinder(SZ_X - 16, SZ_Y, 2.2, 0, 52, P, 16);
      const szPostRight = k.cylinder(SZ_X + 16, SZ_Y, 2.2, 0, 52, P, 16);
      const szCrossbar = k.slabOf({ x: SZ_X - 18, y: SZ_Y - 2, w: 36, d: 4, r: 1 }, 50, 3, P, 2);

      // Ball Trajectory curve (from Mound to Plate)
      const ballT = progress;
      const ballX = MOUND[0] + (SZ_X - MOUND[0]) * ballT;
      const ballY = MOUND[1] + (SZ_Y - MOUND[1]) * ballT;
      // Parabolic flight: starts at mound height 16, peaks at 28, lands at strikezone height 28
      const ballZ = 20 + Math.sin(ballT * Math.PI) * 14 + (1 - ballT) * 4;

      const ballCyl = k.cylinder(ballX, ballY, 3.2, ballZ, 3.2, P, 18);

      apparatus = (
        <g>
          {/* Pitcher Mound */}
          <path className="iso-shade" data-shade="1" d={moundCyl.fill} />
          <path className="iso-line" data-tone="mid" d={moundCyl.outline} />
          <path className="iso-top" d={moundCyl.top} />
          <path className="iso-solid" data-lit d={rubberSlab.fill} />
          <path className="iso-line" data-tone="hi" d={rubberSlab.outline} />

          {/* Gantry Posts */}
          <path className="iso-fill" d={szPostLeft.fill} />
          <path className="iso-line" data-tone="lo" d={szPostLeft.outline} />
          <path className="iso-fill" d={szPostRight.fill} />
          <path className="iso-line" data-tone="lo" d={szPostRight.outline} />
          <path className="iso-fill" d={szCrossbar.fill} />
          <path className="iso-line" data-tone="mid" d={szCrossbar.outline} />

          {/* Trajectory Guide Arc */}
          <path
            className="iso-line"
            data-tone="faint"
            data-dotted
            d={k.pathOf([
              at([MOUND[0], MOUND[1], 20]),
              at([(MOUND[0] + SZ_X) / 2, (MOUND[1] + SZ_Y) / 2, 34]),
              at([SZ_X, SZ_Y, 28]),
            ])}
          />

          {/* Strike Zone Window (Glass Box outline) */}
          <path
            className="iso-line"
            data-tone="red"
            strokeWidth={1.8}
            d={k.pathOf(
              [
                at([SZ_X - SZ_W / 2, SZ_Y, SZ_Z]),
                at([SZ_X + SZ_W / 2, SZ_Y, SZ_Z]),
                at([SZ_X + SZ_W / 2, SZ_Y, SZ_Z + SZ_H]),
                at([SZ_X - SZ_W / 2, SZ_Y, SZ_Z + SZ_H]),
              ],
              true
            )}
          />
          {/* Strike Zone Internal Crosshair */}
          <path
            className="iso-line"
            data-tone="lo"
            data-dashed
            d={k.pathOf([at([SZ_X - SZ_W / 2, SZ_Y, SZ_Z + SZ_H / 2]), at([SZ_X + SZ_W / 2, SZ_Y, SZ_Z + SZ_H / 2])])}
          />
          <path
            className="iso-line"
            data-tone="lo"
            data-dashed
            d={k.pathOf([at([SZ_X, SZ_Y, SZ_Z]), at([SZ_X, SZ_Y, SZ_Z + SZ_H])])}
          />

          {/* Home Plate Slab on floor */}
          <polygon
            points={`${at([SZ_X, SZ_Y - 4, 0.5]).join(',')} ${at([SZ_X + 6, SZ_Y, 0.5]).join(',')} ${at([SZ_X + 6, SZ_Y + 5, 0.5]).join(',')} ${at([SZ_X - 6, SZ_Y + 5, 0.5]).join(',')} ${at([SZ_X - 6, SZ_Y, 0.5]).join(',')}`}
            fill="#ffffff"
            stroke="#94a3b8"
            strokeWidth={0.8}
          />

          {/* The Live Ball */}
          <g>
            <circle
              cx={at([ballX, ballY, ballZ + 1.6])[0]}
              cy={at([ballX, ballY, ballZ + 1.6])[1]}
              r={7}
              fill="#ffffff"
              stroke="#ef4444"
              strokeWidth={1.2}
            />
            {/* Seams on ball */}
            <path
              d={`M ${at([ballX, ballY, ballZ + 1.6])[0] - 4} ${at([ballX, ballY, ballZ + 1.6])[1]} Q ${at([ballX, ballY, ballZ + 1.6])[0]} ${at([ballX, ballY, ballZ + 1.6])[1] - 4} ${at([ballX, ballY, ballZ + 1.6])[0] + 4} ${at([ballX, ballY, ballZ + 1.6])[1]}`}
              fill="none"
              stroke="#ef4444"
              strokeWidth={0.8}
              strokeDasharray="1.5 1.5"
            />
            {/* Ground shadow */}
            <ellipse
              cx={at([ballX, ballY, 0.2])[0]}
              cy={at([ballX, ballY, 0.2])[1]}
              rx={6}
              ry={3}
              fill="rgba(0,0,0,0.35)"
            />
          </g>
        </g>
      );
    } else if (activeMode === 'diamond') {
      // Infield Diamond layout
      // Home at [0, 45], 1B at [45, 0], 2B at [0, -45], 3B at [-45, 0]
      const HOME = [0, 45];
      const B1 = [45, 0];
      const B2 = [0, -45];
      const B3 = [-45, 0];
      const MOUND = [0, 0];

      // Base cushions
      const cushionHome = k.slabOf({ x: HOME[0] - 4, y: HOME[1] - 4, w: 8, d: 8, r: 1 }, 0, 1.2, P, 2);
      const cushion1B = k.slabOf({ x: B1[0] - 4, y: B1[1] - 4, w: 8, d: 8, r: 1.5 }, 0, 2.4, P, 2);
      const cushion2B = k.slabOf({ x: B2[0] - 4, y: B2[1] - 4, w: 8, d: 8, r: 1.5 }, 0, 2.4, P, 2);
      const cushion3B = k.slabOf({ x: B3[0] - 4, y: B3[1] - 4, w: 8, d: 8, r: 1.5 }, 0, 2.4, P, 2);

      // Baselines (running paths)
      const baselinesPath = k.pathOf([at([HOME[0], HOME[1], 0.2]), at([B1[0], B1[1], 0.2]), at([B2[0], B2[1], 0.2]), at([B3[0], B3[1], 0.2])], true);

      // Runner position on path
      // Cycle: Home -> 1B -> 2B -> 3B -> Home
      let runnerPos: k.Point3 = [0, 0, 0];
      if (progress < 0.25) {
        const t = progress / 0.25;
        runnerPos = [HOME[0] + (B1[0] - HOME[0]) * t, HOME[1] + (B1[1] - HOME[1]) * t, 3];
      } else if (progress < 0.5) {
        const t = (progress - 0.25) / 0.25;
        runnerPos = [B1[0] + (B2[0] - B1[0]) * t, B1[1] + (B2[1] - B1[1]) * t, 3];
      } else if (progress < 0.75) {
        const t = (progress - 0.5) / 0.25;
        runnerPos = [B2[0] + (B3[0] - B2[0]) * t, B2[1] + (B3[1] - B2[1]) * t, 3];
      } else {
        const t = (progress - 0.75) / 0.25;
        runnerPos = [B3[0] + (HOME[0] - B3[0]) * t, B3[1] + (HOME[1] - B3[1]) * t, 3];
      }

      apparatus = (
        <g>
          {/* Diamond Baselines */}
          <path className="iso-line" data-tone="mid" strokeWidth={1.5} d={baselinesPath} />

          {/* Dirt Cutout Ring */}
          <circle cx={at([MOUND[0], MOUND[1], 0.1])[0]} cy={at([MOUND[0], MOUND[1], 0.1])[1]} r={26} fill="rgba(180, 83, 9, 0.12)" stroke="#b45309" strokeDasharray="3 3" />

          {/* Bases */}
          <path className="iso-solid" data-lit d={cushionHome.fill} />
          <path className="iso-line" data-tone="hi" d={cushionHome.outline} />
          <path className="iso-solid" data-lit d={cushion1B.fill} />
          <path className="iso-line" data-tone="hi" d={cushion1B.outline} />
          <path className="iso-solid" data-lit d={cushion2B.fill} />
          <path className="iso-line" data-tone="hi" d={cushion2B.outline} />
          <path className="iso-solid" data-lit d={cushion3B.fill} />
          <path className="iso-line" data-tone="hi" d={cushion3B.outline} />

          {/* Base Labels */}
          <text x={at([B1[0] + 8, B1[1], 0])[0]} y={at([B1[0] + 8, B1[1], 0])[1]} fill="#94a3b8" fontSize={10} fontWeight="700">1B</text>
          <text x={at([B2[0], B2[1] - 8, 0])[0]} y={at([B2[0], B2[1] - 8, 0])[1]} fill="#94a3b8" fontSize={10} fontWeight="700">2B</text>
          <text x={at([B3[0] - 12, B3[1], 0])[0]} y={at([B3[0] - 12, B3[1], 0])[1]} fill="#94a3b8" fontSize={10} fontWeight="700">3B</text>
          <text x={at([HOME[0], HOME[1] + 12, 0])[0]} y={at([HOME[0], HOME[1] + 12, 0])[1]} fill="#10b981" fontSize={10} fontWeight="800">HOME</text>

          {/* Active Runner Marker (Cylinder Token) */}
          <g>
            <circle
              cx={at(runnerPos)[0]}
              cy={at(runnerPos)[1]}
              r={6.5}
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            {/* Speed pulse */}
            <circle
              cx={at(runnerPos)[0]}
              cy={at(runnerPos)[1]}
              r={12}
              fill="none"
              stroke="#10b981"
              strokeWidth={1}
              opacity={0.4}
              className="animate-ping"
            />
          </g>
        </g>
      );
    } else if (activeMode === 'doubleplay') {
      // 6-4-3 Double Play Sequence
      // Batter hits ground ball to SS [-20, -10]
      // SS fields and flips to 2B [0, -35] (Out 1)
      // 2B pivots and throws to 1B [45, 0] (Out 2)
      const BATTER_HOME = [0, 45];
      const SS_POS = [-24, -12];
      const B2_POS = [2, -38];
      const B1_POS = [45, 0];

      // Ball location along the 6-4-3 chain
      let ballCoord: k.Point3;
      if (progress < 0.35) {
        // Hit from Home to SS
        const t = progress / 0.35;
        ballCoord = [BATTER_HOME[0] + (SS_POS[0] - BATTER_HOME[0]) * t, BATTER_HOME[1] + (SS_POS[1] - BATTER_HOME[1]) * t, 1.5];
      } else if (progress < 0.65) {
        // Flip from SS to 2B
        const t = (progress - 0.35) / 0.3;
        ballCoord = [SS_POS[0] + (B2_POS[0] - SS_POS[0]) * t, SS_POS[1] + (B2_POS[1] - SS_POS[1]) * t, 5 + Math.sin(t * Math.PI) * 6];
      } else {
        // Laser throw from 2B to 1B
        const t = (progress - 0.65) / 0.35;
        ballCoord = [B2_POS[0] + (B1_POS[0] - B2_POS[0]) * t, B2_POS[1] + (B1_POS[1] - B2_POS[1]) * t, 6 + Math.sin(t * Math.PI) * 8];
      }

      apparatus = (
        <g>
          {/* Transmission Vectors */}
          <path
            className="iso-line"
            data-tone="faint"
            data-dashed
            d={k.pathOf([at([BATTER_HOME[0], BATTER_HOME[1], 1]), at([SS_POS[0], SS_POS[1], 1])])}
          />
          <path
            className="iso-line"
            data-tone="amber"
            strokeWidth={1.5}
            d={k.pathOf([at([SS_POS[0], SS_POS[1], 1]), at([B2_POS[0], B2_POS[1], 1])])}
          />
          <path
            className="iso-line"
            data-tone="amber"
            strokeWidth={1.5}
            d={k.pathOf([at([B2_POS[0], B2_POS[1], 1]), at([B1_POS[0], B1_POS[1], 1])])}
          />

          {/* Node 6: Shortstop */}
          <g>
            <circle cx={at([SS_POS[0], SS_POS[1], 2])[0]} cy={at([SS_POS[0], SS_POS[1], 2])[1]} r={9} fill="#1e293b" stroke="#38bdf8" strokeWidth={1.5} />
            <text x={at([SS_POS[0], SS_POS[1], 2])[0]} y={at([SS_POS[0], SS_POS[1], 2])[1] + 3.5} textAnchor="middle" fill="#38bdf8" fontSize={9} fontWeight="900">6</text>
            <text x={at([SS_POS[0], SS_POS[1], 2])[0]} y={at([SS_POS[0], SS_POS[1], 2])[1] - 12} textAnchor="middle" fill="#cbd5e1" fontSize={8} fontWeight="700">SS (Приём)</text>
          </g>

          {/* Node 4: 2nd Base */}
          <g>
            <circle cx={at([B2_POS[0], B2_POS[1], 2])[0]} cy={at([B2_POS[0], B2_POS[1], 2])[1]} r={9} fill={progress >= 0.65 ? '#10b981' : '#1e293b'} stroke="#f59e0b" strokeWidth={1.5} />
            <text x={at([B2_POS[0], B2_POS[1], 2])[0]} y={at([B2_POS[0], B2_POS[1], 2])[1] + 3.5} textAnchor="middle" fill="#f59e0b" fontSize={9} fontWeight="900">4</text>
            <text x={at([B2_POS[0], B2_POS[1], 2])[0]} y={at([B2_POS[0], B2_POS[1], 2])[1] - 12} textAnchor="middle" fill="#fcd34d" fontSize={8} fontWeight="700">2B (Аут 1)</text>
          </g>

          {/* Node 3: 1st Base */}
          <g>
            <circle cx={at([B1_POS[0], B1_POS[1], 2])[0]} cy={at([B1_POS[0], B1_POS[1], 2])[1]} r={9} fill={progress >= 0.95 ? '#10b981' : '#1e293b'} stroke="#10b981" strokeWidth={1.5} />
            <text x={at([B1_POS[0], B1_POS[1], 2])[0]} y={at([B1_POS[0], B1_POS[1], 2])[1] + 3.5} textAnchor="middle" fill="#10b981" fontSize={9} fontWeight="900">3</text>
            <text x={at([B1_POS[0], B1_POS[1], 2])[0] + 12} y={at([B1_POS[0], B1_POS[1], 2])[1] + 3} fill="#6ee7b7" fontSize={8} fontWeight="700">1B (Аут 2)</text>
          </g>

          {/* Ball */}
          <circle
            cx={at(ballCoord)[0]}
            cy={at(ballCoord)[1]}
            r={5.5}
            fill="#ffffff"
            stroke="#f59e0b"
            strokeWidth={1.2}
          />
        </g>
      );
    } else {
      // Pitch Types (Spin Rig)
      // Visualizing pitch trajectory variations: Fastball (straight), Slider (lateral cut), Curveball (12-6 plunge)
      const START: k.Point3 = [-50, -20, 22];
      const END: k.Point3 = [40, 20, 18];

      let devX = 0;
      let devZ = 0;
      const t = progress;

      if (selectedPitch === 'fastball') {
        // High, straight line, backspin lift
        devZ = Math.sin(t * Math.PI) * 6;
      } else if (selectedPitch === 'slider') {
        // Breaks sharply right in the last 30% of flight
        devX = t > 0.5 ? Math.pow(t - 0.5, 2) * 45 : 0;
        devZ = -Math.pow(t, 2) * 6;
      } else {
        // Curveball: rises slightly then plunges down 18 inches
        devZ = t < 0.4 ? Math.sin(t * Math.PI) * 10 : -Math.pow(t, 2) * 18;
      }

      const pX = START[0] + (END[0] - START[0]) * t + devX;
      const pY = START[1] + (END[1] - START[1]) * t;
      const pZ = START[2] + (END[2] - START[2]) * t + devZ;

      apparatus = (
        <g>
          {/* Gyro Spin Indicator Dial at Release Point */}
          <ellipse
            cx={at(START)[0]}
            cy={at(START)[1]}
            rx={16}
            ry={8}
            fill="none"
            stroke="#06b6d4"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            className="animate-spin"
            style={{ transformOrigin: `${at(START)[0]}px ${at(START)[1]}px` }}
          />

          {/* Projected Path */}
          <path
            className="iso-line"
            data-tone="blue"
            strokeWidth={2}
            d={k.pathOf([
              at(START),
              at([START[0] + 30 + devX * 0.4, START[1] + 15, START[2] + devZ * 0.5] as k.Point3),
              at([pX, pY, pZ] as k.Point3),
            ])}
          />

          {/* Plate Target */}
          <polygon
            points={`${at([END[0], END[1] - 4, 0.5] as k.Point3).join(',')} ${at([END[0] + 5, END[1], 0.5] as k.Point3).join(',')} ${at([END[0] + 5, END[1] + 5, 0.5] as k.Point3).join(',')} ${at([END[0] - 5, END[1] + 5, 0.5] as k.Point3).join(',')} ${at([END[0] - 5, END[1], 0.5] as k.Point3).join(',')}`}
            fill="#ffffff"
            stroke="#06b6d4"
            strokeWidth={1}
          />

          {/* Flying Ball */}
          <circle
            cx={at([pX, pY, pZ] as k.Point3)[0]}
            cy={at([pX, pY, pZ] as k.Point3)[1]}
            r={6.5}
            fill="#ffffff"
            stroke="#06b6d4"
            strokeWidth={1.5}
          />
        </g>
      );
    }

    return {
      baseFill,
      baseSlab,
      baseInset,
      baseScrews,
      rulerSlab,
      ticks,
      posts,
      apparatus,
    };
  }, [P, activeMode, progress, selectedPitch]);

  const activeConf = MODES.find((m) => m.id === activeMode)!;

  return (
    <div className="iso rounded-2xl overflow-hidden border border-white/10 bg-[#0d1117] text-slate-200 shadow-2xl">
      {/* ── TOP ANATOMY BAR (Fig 1 + Title + Mode Switcher) ── */}
      <div className="px-5 py-4 border-b border-white/10 bg-[#161b22] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            FIG. 1
          </span>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>{activeConf.title}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                {activeConf.badge}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{activeConf.subtitle}</p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/5 overflow-x-auto">
          {MODES.map((mode) => {
            const isCur = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => {
                  setActiveMode(mode.id);
                  setProgress(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  isCur ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                style={{
                  border: isCur ? `1px solid ${mode.color}40` : '1px solid transparent',
                  color: isCur ? '#ffffff' : undefined,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mode.color }} />
                <span>{mode.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── INTERACTIVE 3D ISOMETRIC STAGE ── */}
      <div className="relative bg-[#090d16] p-4 sm:p-6 flex items-center justify-center overflow-hidden min-h-[380px]">
        {/* Subtle Isometric Grid Background */}
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
          style={{ maxHeight: '460px' }}
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

          {/* Front Calibrated Ruler Strip */}
          <path className="iso-fill" d={geometry.rulerSlab.fill} />
          <path className="iso-line" data-tone="lo" d={geometry.rulerSlab.outline} />
          <path className="iso-line" data-tone="lo" d={geometry.ticks.minor} />
          <path className="iso-line" data-tone="mid" d={geometry.ticks.major} />

          {/* Corner Guide Columns */}
          {geometry.posts.map((post, idx) => (
            <g key={idx}>
              <path className="iso-fill" d={post.cyl.fill} />
              <path className="iso-line" data-tone="lo" d={post.cyl.outline} />
              <path className="iso-top" d={post.cyl.top} />
              <path className="iso-fill" d={post.cap.fill} />
              <path className="iso-line" data-tone="mid" d={post.cap.outline} />
            </g>
          ))}

          {/* Mode Apparatus Drawing */}
          {geometry.apparatus}
        </svg>

        {/* ── LIVE HUD OVERLAY (TOP-RIGHT READOUT) ── */}
        <div className="absolute top-4 right-4 bg-[#111827]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl pointer-events-none flex items-center gap-4 text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{readoutData.label1}</div>
            <div className="text-sm font-black text-white">{readoutData.val1}</div>
          </div>
          <div className="w-[1px] h-7 bg-white/10" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{readoutData.label2}</div>
            <div className="text-sm font-black text-emerald-400">{readoutData.val2}</div>
          </div>
          <div className="w-[1px] h-7 bg-white/10" />
          <div className="flex flex-col items-end">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase"
              style={{
                backgroundColor: `${readoutData.statusColor}22`,
                color: readoutData.statusColor,
                border: `1px solid ${readoutData.statusColor}44`,
              }}
            >
              {readoutData.status}
            </span>
          </div>
        </div>

        {/* Pitch Types Toggle (when mode == pitchtypes) */}
        {activeMode === 'pitchtypes' && (
          <div className="absolute top-4 left-4 flex gap-1.5 bg-black/60 p-1.5 rounded-xl border border-white/10">
            {(['fastball', 'slider', 'curveball'] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setSelectedPitch(p);
                  setProgress(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition uppercase ${
                  selectedPitch === p ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'fastball' ? 'Фастбол' : p === 'slider' ? 'Слайдер' : 'Кёрвбол'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM CONTROL & SCRUBBER BAR ── */}
      <div className="px-5 py-3.5 bg-[#161b22] border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsPlaying(!isPlaying);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Пауза' : 'Плей'}</span>
          </button>

          <button
            onClick={() => {
              setProgress(0);
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition border border-white/10 cursor-pointer"
            title="Сброс на начало"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed selector */}
          <div className="flex items-center gap-1 ml-2 text-[11px] font-mono font-bold text-slate-400">
            <span>Скорость:</span>
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 rounded transition ${
                  speed === s ? 'bg-white/20 text-white' : 'hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex-1 min-w-[200px] flex items-center gap-3">
          <span className="font-mono text-[11px] text-slate-400">Фаза:</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={progress}
            onChange={(e) => {
              setProgress(parseFloat(e.target.value));
              setIsPlaying(false);
            }}
            className="flex-1 accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="font-mono text-[11px] text-slate-300 w-10 text-right">
            {Math.round(progress * 100)}%
          </span>
        </div>

        {/* Interaction Hint */}
        <div className="text-xs text-slate-400 flex items-center gap-1.5 hidden md:flex">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{activeConf.hint}</span>
        </div>
      </div>
    </div>
  );
};
