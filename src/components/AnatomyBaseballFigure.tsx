import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as k from './iso/iso-kit';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  Compass,
  Activity,
  Maximize2,
} from 'lucide-react';
import { sounds } from '../services/soundEffects';

export type RuleMode = 'diamond' | 'doubleplay' | 'strikezone' | 'pitchtypes';

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
    id: 'diamond',
    title: 'Бейсбольное поле & Базы (3D Стадион)',
    subtitle: 'Настоящее поле MLB: газон аутфилда, забор, грунтовый инфилд 90×90 ft, горка и базы',
    hint: 'Наблюдайте движение раннера по базам к дому против часовой стрелки',
    readoutLabel: 'Позиция раннера',
    badge: '3D BALLPARK',
    color: '#10b981',
  },
  {
    id: 'doubleplay',
    title: 'Дабл-плей 6-4-3 (Розыгрыш на поле)',
    subtitle: 'Удар по земле к шортстопу (6) ➔ пас на 2B (4) ➔ пушечный бросок на 1B (3) за 2.4 сек',
    hint: 'Реальная траектория мяча и расстановка полевых игроков на инфилде',
    readoutLabel: 'Тайминг передачи',
    badge: 'DOUBLE PLAY 6-4-3',
    color: '#f59e0b',
  },
  {
    id: 'strikezone',
    title: 'Страйк-зона & Подача (Batting View)',
    subtitle: 'Питчер бросает с горки (60.5 ft) в створ страйк-зоны над домом (17" ширина)',
    hint: '3D полёт мяча с горки в перчатку кэтчера с фиксацией попадания в зону',
    readoutLabel: 'Скорость & Зона',
    badge: 'BALL vs STRIKE',
    color: '#ef4444',
  },
  {
    id: 'pitchtypes',
    title: 'Арсенал подач & Вращение (Spin Physics)',
    subtitle: 'Фастбол (бэк-спин 2400 RPM), Слайдер (горизонтальный срез), Кёрвбол (падение 12-6)',
    hint: 'Переключайте типы подач и смотрите аэродинамический излом траектории мяча',
    readoutLabel: 'Траектория & Спин',
    badge: 'PITCH ARSENAL',
    color: '#06b6d4',
  },
];

export const AnatomyBaseballFigure: React.FC = () => {
  const [activeMode, setActiveMode] = useState<RuleMode>('diamond');
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
          const next = prev + delta * 0.42 * speed;
          if (next >= 1) {
            // Trigger sound on cycle repeat
            if (activeMode === 'diamond') sounds.playScoreChange();
            if (activeMode === 'doubleplay') sounds.playGloveCatch();
            if (activeMode === 'strikezone') sounds.playStrikeout();
            if (activeMode === 'pitchtypes') sounds.playGloveCatch();
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
  // We use azimuth 45° so Home is at bottom-center [0, 80] and Outfield fans out towards top
  const WIDTH = 920;
  const HEIGHT = 480;

  const P = useMemo(() => {
    return k.fitProjection(
      [
        [-130, -90, 0],
        [130, -90, 0],
        [0, 95, 0],
        [0, -100, 30],
        [-80, 80, 20],
        [80, 80, 20],
      ],
      WIDTH,
      HEIGHT,
      { pad: 32, azimuth: 45, elevation: 32 }
    );
  }, []);

  const at = (pt: k.Point3): k.Flat => k.iso(pt, P);

  // Dynamic live calculations based on mode and progress
  const readoutData = useMemo(() => {
    if (activeMode === 'diamond') {
      const phase =
        progress < 0.25
          ? 'Удар: бег к 1B'
          : progress < 0.5
          ? 'Поворот: спринт на 2B'
          : progress < 0.75
          ? 'Рывок: слайд на 3B'
          : 'Забегание в ДОМ!';
      const runs = progress > 0.88 ? '1 RUN (+1 очко!)' : '0 RUNS';
      return {
        val1: runs,
        label1: 'Очки атаки',
        val2: phase,
        label2: 'Фаза розыгрыша',
        status: progress > 0.88 ? 'SAFE AT HOME' : 'RUNNER IN MOTION',
        statusColor: '#10b981',
      };
    }
    if (activeMode === 'doubleplay') {
      const timeMs = (progress * 2.4).toFixed(2);
      const outs = progress < 0.35 ? '0 Outs' : progress < 0.65 ? '1 Out (на 2B)' : '2 Outs (на 1B)!';
      return {
        val1: outs,
        label1: 'Результат',
        val2: `${timeMs} сек`,
        label2: 'Тайминг',
        status: progress > 0.8 ? 'DOUBLE PLAY (6-4-3)' : 'IN PROGRESS',
        statusColor: '#f59e0b',
      };
    }
    if (activeMode === 'strikezone') {
      const distFt = (60.5 * (1 - progress)).toFixed(1);
      const speedMph = (98.4 - progress * 3.8).toFixed(1);
      const isStrike = progress > 0.85;
      return {
        val1: `${speedMph} mph`,
        label1: 'Скорость',
        val2: `${distFt} ft`,
        label2: 'До дома',
        status: isStrike ? 'CALLED STRIKE!' : 'PITCH IN FLIGHT',
        statusColor: '#ef4444',
      };
    }
    // pitchtypes
    const breakIn = selectedPitch === 'slider' ? '14.2" Horiz' : selectedPitch === 'curveball' ? '18.6" Drop' : '3.8" Rise';
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

  // Coordinates of baseball field landmarks in 3D world:
  // Home Plate at bottom: [0, 75, 0]
  // 1st Base (Right): [48, 27, 0]
  // 2nd Base (Top): [0, -21, 0]
  // 3rd Base (Left): [-48, 27, 0]
  // Pitcher's Mound: [0, 24, 0] (60.5 ft distance to Home)
  const HOME: k.Point3 = [0, 75, 0];
  const B1: k.Point3 = [48, 27, 0];
  const B2: k.Point3 = [0, -21, 0];
  const B3: k.Point3 = [-48, 27, 0];
  const MOUND: k.Point3 = [0, 24, 0];

  // Defensive player positions:
  const DEF_P: k.Point3 = [0, 24, 1];     // 1: Pitcher
  const DEF_C: k.Point3 = [0, 83, 1];     // 2: Catcher
  const DEF_1B: k.Point3 = [52, 23, 1];   // 3: First Baseman
  const DEF_2B: k.Point3 = [28, -2, 1];   // 4: Second Baseman
  const DEF_3B: k.Point3 = [-52, 23, 1];  // 5: Third Baseman
  const DEF_SS: k.Point3 = [-28, -2, 1];  // 6: Shortstop
  const DEF_LF: k.Point3 = [-75, -45, 1]; // 7: Left Fielder
  const DEF_CF: k.Point3 = [0, -75, 1];   // 8: Center Fielder
  const DEF_RF: k.Point3 = [75, -45, 1];  // 9: Right Fielder

  // Generate 3D Field & Mode Elements
  const fieldGeometry = useMemo(() => {
    // 1. Outfield Outer Wall Arc (from Left foul pole [-105, -30] through CF [0, -95] to Right foul pole [105, -30])
    const wallArcPoints: k.Point3[] = [];
    const WALL_R = 105;
    const WALL_CENTER_Y = 10;
    // Angle from 210° to 330° (or roughly around top semicircle)
    for (let i = 0; i <= 24; i++) {
      const angle = Math.PI * (1.18 + (i / 24) * 0.64);
      const wx = Math.sin(angle) * WALL_R;
      const wy = WALL_CENTER_Y + Math.cos(angle) * WALL_R;
      wallArcPoints.push([wx, wy, 0]);
    }

    // Outfield Grass surface polygon (Home -> Left Pole -> Wall Arc -> Right Pole -> Home)
    const grassPolygon2D = [
      at(HOME),
      ...wallArcPoints.map((pt) => at(pt)),
    ];

    // Outfield Wall 3D Extrusion (Vertical fence)
    const wallFenceBottom = wallArcPoints.map((pt) => at(pt));
    const wallFenceTop = wallArcPoints.map((pt) => at([pt[0], pt[1], 8] as k.Point3));

    // Foul Lines
    const foulLeft = [at(HOME), at(wallArcPoints[0]!)];
    const foulRight = [at(HOME), at(wallArcPoints[wallArcPoints.length - 1]!)];

    // 2. Infield Dirt Diamond (Arched cutout around bases)
    // Diamond path: Home -> 1B -> 2B -> 3B -> Home
    const baselines2D = [at(HOME), at(B1), at(B2), at(B3), at(HOME)];

    // Infield inner grass diamond (inside basepaths)
    const innerGrass = [
      at([0, 63, 0]),
      at([36, 27, 0]),
      at([0, -9, 0]),
      at([-36, 27, 0]),
    ];

    // 3. Pitcher's Mound (Raised 3D circle & rubber slab)
    const moundCyl = k.cylinder(MOUND[0], MOUND[1], 12, 0, 2.5, P, 24);
    const moundRubber = k.slabOf({ x: -4, y: 23, w: 8, d: 2, r: 0.2 }, 2.5, 0.6, P, 2);

    // 4. Bases: 1B, 2B, 3B, Home Plate
    const base1 = k.slabOf({ x: B1[0] - 2.5, y: B1[1] - 2.5, w: 5, d: 5, r: 0.5 }, 0, 1.4, P, 2);
    const base2 = k.slabOf({ x: B2[0] - 2.5, y: B2[1] - 2.5, w: 5, d: 5, r: 0.5 }, 0, 1.4, P, 2);
    const base3 = k.slabOf({ x: B3[0] - 2.5, y: B3[1] - 2.5, w: 5, d: 5, r: 0.5 }, 0, 1.4, P, 2);

    // Batter's boxes at Home
    const leftBatterBox = k.slabOf({ x: -9, y: 70, w: 4, d: 10, r: 0.5 }, 0, 0.4, P, 2);
    const rightBatterBox = k.slabOf({ x: 5, y: 70, w: 4, d: 10, r: 0.5 }, 0, 0.4, P, 2);

    return {
      grassPolygon2D,
      wallFenceBottom,
      wallFenceTop,
      foulLeft,
      foulRight,
      baselines2D,
      innerGrass,
      moundCyl,
      moundRubber,
      base1,
      base2,
      base3,
      leftBatterBox,
      rightBatterBox,
    };
  }, [P]);

  // Mode Specific Apparatus & Action Actors
  const modeApparatus = useMemo(() => {
    if (activeMode === 'diamond') {
      // Runner running counter-clockwise: Home -> 1B -> 2B -> 3B -> Home
      let runnerPt: k.Point3;
      let runnerPrev: k.Point3;
      if (progress < 0.25) {
        const t = progress / 0.25;
        runnerPt = [HOME[0] + (B1[0] - HOME[0]) * t, HOME[1] + (B1[1] - HOME[1]) * t, 2.5];
        runnerPrev = HOME;
      } else if (progress < 0.5) {
        const t = (progress - 0.25) / 0.25;
        runnerPt = [B1[0] + (B2[0] - B1[0]) * t, B1[1] + (B2[1] - B1[1]) * t, 2.5];
        runnerPrev = B1;
      } else if (progress < 0.75) {
        const t = (progress - 0.5) / 0.25;
        runnerPt = [B2[0] + (B3[0] - B2[0]) * t, B2[1] + (B3[1] - B2[1]) * t, 2.5];
        runnerPrev = B2;
      } else {
        const t = (progress - 0.75) / 0.25;
        runnerPt = [B3[0] + (HOME[0] - B3[0]) * t, B3[1] + (HOME[1] - B3[1]) * t, 2.5];
        runnerPrev = B3;
      }

      const rPos = at(runnerPt);

      return (
        <g>
          {/* Active Runner path glow */}
          <line
            x1={at(runnerPrev)[0]}
            y1={at(runnerPrev)[1]}
            x2={rPos[0]}
            y2={rPos[1]}
            stroke="#10b981"
            strokeWidth={3}
            strokeLinecap="round"
            filter="drop-shadow(0 0 6px #10b981)"
          />

          {/* Runner 3D Marker */}
          <g>
            {/* Ground shadow */}
            <ellipse cx={rPos[0]} cy={rPos[1] + 4} rx={6} ry={3} fill="rgba(0,0,0,0.4)" />
            {/* Speed pulse */}
            <circle cx={rPos[0]} cy={rPos[1]} r={12} fill="none" stroke="#10b981" strokeWidth={1} opacity={0.5} className="animate-ping" />
            {/* Runner Token */}
            <circle cx={rPos[0]} cy={rPos[1]} r={7} fill="#10b981" stroke="#ffffff" strokeWidth={1.8} />
            <text x={rPos[0]} y={rPos[1] + 3} textAnchor="middle" fill="#ffffff" fontSize={8} fontWeight="900">R</text>
          </g>

          {/* Batter at Home Swing simulation */}
          <g transform={`translate(${at([HOME[0] - 8, HOME[1] - 4, 1])[0]}, ${at([HOME[0] - 8, HOME[1] - 4, 1])[1]})`}>
            <circle cx={0} cy={0} r={5} fill="#f8fafc" stroke="#334155" strokeWidth={1} />
            <line x1={2} y1={0} x2={progress < 0.1 ? 16 : 8} y2={progress < 0.1 ? -8 : -14} stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        </g>
      );
    }

    if (activeMode === 'doubleplay') {
      // 6-4-3 Sequence on actual infield:
      // 1. Batter hits grounder from Home to SS (Node 6) [-28, -2] (t: 0..0.35)
      // 2. SS fields and flips to 2B (Node 4) [0, -21] (t: 0.35..0.65)
      // 3. 2B catches, steps on 2B (Out 1) and fires to 1B (Node 3) [48, 27] (t: 0.65..1.0)
      let ballCoord: k.Point3;
      if (progress < 0.35) {
        const t = progress / 0.35;
        ballCoord = [HOME[0] + (DEF_SS[0] - HOME[0]) * t, HOME[1] + (DEF_SS[1] - HOME[1]) * t, 1.5];
      } else if (progress < 0.65) {
        const t = (progress - 0.35) / 0.3;
        ballCoord = [DEF_SS[0] + (B2[0] - DEF_SS[0]) * t, DEF_SS[1] + (B2[1] - DEF_SS[1]) * t, 3 + Math.sin(t * Math.PI) * 7];
      } else {
        const t = (progress - 0.65) / 0.35;
        ballCoord = [B2[0] + (B1[0] - B2[0]) * t, B2[1] + (B1[1] - B2[1]) * t, 4 + Math.sin(t * Math.PI) * 9];
      }

      const bPos = at(ballCoord);

      return (
        <g>
          {/* Laser Passing Guides */}
          <line x1={at(HOME)[0]} y1={at(HOME)[1]} x2={at(DEF_SS)[0]} y2={at(DEF_SS)[1]} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6} />
          <line x1={at(DEF_SS)[0]} y1={at(DEF_SS)[1]} x2={at(B2)[0]} y2={at(B2)[1]} stroke="#f59e0b" strokeWidth={2} opacity={progress >= 0.35 ? 1 : 0.3} />
          <line x1={at(B2)[0]} y1={at(B2)[1]} x2={at(B1)[0]} y2={at(B1)[1]} stroke="#10b981" strokeWidth={2} opacity={progress >= 0.65 ? 1 : 0.3} />

          {/* Active Highlight rings around involved players */}
          {/* Shortstop (6) */}
          <circle cx={at(DEF_SS)[0]} cy={at(DEF_SS)[1]} r={13} fill="none" stroke="#38bdf8" strokeWidth={1.8} className={progress < 0.35 ? 'animate-pulse' : ''} />
          {/* 2nd Base (4) */}
          <circle cx={at(B2)[0]} cy={at(B2)[1]} r={13} fill="none" stroke="#f59e0b" strokeWidth={1.8} className={progress >= 0.35 && progress < 0.65 ? 'animate-pulse' : ''} />
          {/* 1st Base (3) */}
          <circle cx={at(B1)[0]} cy={at(B1)[1]} r={13} fill="none" stroke="#10b981" strokeWidth={1.8} className={progress >= 0.65 ? 'animate-pulse' : ''} />

          {/* Flying Baseball */}
          <circle cx={bPos[0]} cy={bPos[1]} r={6} fill="#ffffff" stroke="#ef4444" strokeWidth={1.5} filter="drop-shadow(0 0 6px #ffffff)" />
          <ellipse cx={bPos[0]} cy={bPos[1] + 10} rx={4} ry={2} fill="rgba(0,0,0,0.4)" />
        </g>
      );
    }

    if (activeMode === 'strikezone') {
      // Strike zone positioned directly above Home Plate [0, 75]
      // Mound at [0, 24]
      const SZ_W = 12;
      const SZ_H = 16;
      const SZ_Z = 6;
      const SZ_X = HOME[0];
      const SZ_Y = HOME[1] - 4;

      // Ball Trajectory from Mound rubber [0, 24, 6] to Home Plate strikezone [0, 71, 14]
      const t = progress;
      const ballX = MOUND[0] * (1 - t) + SZ_X * t;
      const ballY = (MOUND[1] + 2) * (1 - t) + SZ_Y * t;
      // Slight downward pitch angle
      const ballZ = 7 * (1 - t) + (SZ_Z + SZ_H / 2) * t + Math.sin(t * Math.PI) * 3;

      const ballFlat = at([ballX, ballY, ballZ]);

      // 3D Strike Zone Rectangular Wireframe over Home Plate
      const szTopLeft = at([SZ_X - SZ_W / 2, SZ_Y, SZ_Z + SZ_H]);
      const szTopRight = at([SZ_X + SZ_W / 2, SZ_Y, SZ_Z + SZ_H]);
      const szBotRight = at([SZ_X + SZ_W / 2, SZ_Y, SZ_Z]);
      const szBotLeft = at([SZ_X - SZ_W / 2, SZ_Y, SZ_Z]);

      return (
        <g>
          {/* 3D Strike Zone Target Window */}
          <polygon
            points={`${szTopLeft.join(',')} ${szTopRight.join(',')} ${szBotRight.join(',')} ${szBotLeft.join(',')}`}
            fill={progress > 0.85 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.12)'}
            stroke="#ef4444"
            strokeWidth={1.8}
            className={progress > 0.85 ? 'animate-pulse' : ''}
          />
          {/* Internal crosshairs */}
          <line
            x1={(szTopLeft[0] + szTopRight[0]) / 2}
            y1={(szTopLeft[1] + szTopRight[1]) / 2}
            x2={(szBotLeft[0] + szBotRight[0]) / 2}
            y2={(szBotLeft[1] + szBotRight[1]) / 2}
            stroke="#ef4444"
            strokeWidth={0.8}
            strokeDasharray="2 2"
          />
          <line
            x1={(szTopLeft[0] + szBotLeft[0]) / 2}
            y1={(szTopLeft[1] + szBotLeft[1]) / 2}
            x2={(szTopRight[0] + szBotRight[0]) / 2}
            y2={(szTopRight[1] + szBotRight[1]) / 2}
            stroke="#ef4444"
            strokeWidth={0.8}
            strokeDasharray="2 2"
          />

          {/* Guide Trajectory Line */}
          <line
            x1={at([MOUND[0], MOUND[1] + 2, 7])[0]}
            y1={at([MOUND[0], MOUND[1] + 2, 7])[1]}
            x2={at([SZ_X, SZ_Y, SZ_Z + SZ_H / 2])[0]}
            y2={at([SZ_X, SZ_Y, SZ_Z + SZ_H / 2])[1]}
            stroke="#38bdf8"
            strokeWidth={1.2}
            strokeDasharray="3 3"
            opacity={0.7}
          />

          {/* Fast Pitch Ball */}
          <circle cx={ballFlat[0]} cy={ballFlat[1]} r={6.5} fill="#ffffff" stroke="#ef4444" strokeWidth={1.4} filter="drop-shadow(0 0 6px #ef4444)" />
          {/* Ground shadow under ball */}
          <ellipse cx={at([ballX, ballY, 0.2])[0]} cy={at([ballX, ballY, 0.2])[1]} rx={5} ry={2.5} fill="rgba(0,0,0,0.35)" />
        </g>
      );
    }

    // pitchtypes (Spin physics)
    const t = progress;
    const PITCH_START: k.Point3 = [0, 24, 7];
    const PITCH_END: k.Point3 = [0, 71, 14];

    let breakX = 0;
    let breakZ = 0;
    if (selectedPitch === 'fastball') {
      // Backspin lift
      breakZ = Math.sin(t * Math.PI) * 4;
    } else if (selectedPitch === 'slider') {
      // Horizontal slide break to right
      breakX = t > 0.45 ? Math.pow(t - 0.45, 2) * 36 : 0;
      breakZ = -Math.pow(t, 2) * 3;
    } else {
      // 12-6 Curveball drop
      breakZ = t < 0.4 ? Math.sin(t * Math.PI) * 5 : -Math.pow(t, 2) * 14;
    }

    const curPitchX = PITCH_START[0] + (PITCH_END[0] - PITCH_START[0]) * t + breakX;
    const curPitchY = PITCH_START[1] + (PITCH_END[1] - PITCH_START[1]) * t;
    const curPitchZ = PITCH_START[2] + (PITCH_END[2] - PITCH_START[2]) * t + breakZ;

    const ballCoord = at([curPitchX, curPitchY, curPitchZ]);

    return (
      <g>
        {/* Spin Gyro at release point */}
        <circle cx={at(PITCH_START)[0]} cy={at(PITCH_START)[1]} r={12} fill="none" stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="3 3" className="animate-spin" />

        {/* Trajectory Laser Curve */}
        <path
          d={`M ${at(PITCH_START)[0]} ${at(PITCH_START)[1]} Q ${at([(PITCH_START[0] + curPitchX) / 2, (PITCH_START[1] + curPitchY) / 2, (PITCH_START[2] + curPitchZ) / 2 + 3])[0]} ${at([(PITCH_START[0] + curPitchX) / 2, (PITCH_START[1] + curPitchY) / 2, (PITCH_START[2] + curPitchZ) / 2 + 3])[1]} ${ballCoord[0]} ${ballCoord[1]}`}
          fill="none"
          stroke="#06b6d4"
          strokeWidth={2}
          filter="drop-shadow(0 0 6px #06b6d4)"
        />

        {/* Ball */}
        <circle cx={ballCoord[0]} cy={ballCoord[1]} r={6.5} fill="#ffffff" stroke="#06b6d4" strokeWidth={1.5} filter="drop-shadow(0 0 8px #06b6d4)" />
        <ellipse cx={at([curPitchX, curPitchY, 0.2])[0]} cy={at([curPitchX, curPitchY, 0.2])[1]} rx={5} ry={2.5} fill="rgba(0,0,0,0.35)" />
      </g>
    );
  }, [activeMode, progress, selectedPitch, HOME, B1, B2, B3, MOUND, DEF_SS]);

  const activeConf = MODES.find((m) => m.id === activeMode)!;

  return (
    <div className="iso rounded-2xl overflow-hidden border border-white/10 bg-[#0d1117] text-slate-200 shadow-2xl">
      {/* ── TOP ANATOMY BAR (Fig 1 + Title + Mode Switcher) ── */}
      <div className="px-5 py-3.5 border-b border-white/10 bg-[#161b22] flex flex-wrap items-center justify-between gap-3">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
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

      {/* ── 3D BASEBALL STADIUM & FIELD CANVAS (Accurate Diamond) ── */}
      <div className="relative bg-[#090d16] p-2 sm:p-4 flex items-center justify-center overflow-hidden min-h-[380px]">
        {/* Stadium Floodlight ambiance */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: 'radial-gradient(ellipse 65% 55% at 50% 65%, rgba(6, 78, 59, 0.45) 0%, rgba(2, 44, 34, 0.2) 60%, transparent 100%)',
          }}
        />

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="iso-svg max-w-full h-auto drop-shadow-2xl select-none"
          style={{ maxHeight: '460px' }}
        >
          <defs>
            {/* Field Grass Gradient */}
            <radialGradient id="field3dGrass" cx="50%" cy="80%" r="75%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="65%" stopColor="#044e39" />
              <stop offset="100%" stopColor="#022c22" />
            </radialGradient>

            {/* Infield Dirt Gradient */}
            <radialGradient id="field3dDirt" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="85%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>
          </defs>

          {/* 1. OUTFIELD GRASS FAN (Full Stadium Field) */}
          <polygon
            points={fieldGeometry.grassPolygon2D.map((p) => p.join(',')).join(' ')}
            fill="url(#field3dGrass)"
            stroke="#047857"
            strokeWidth={1}
          />

          {/* 2. OUTFIELD WALL & FENCE (3D Arc Wall) */}
          <polygon
            points={[
              ...fieldGeometry.wallFenceBottom.map((p) => p.join(',')),
              ...fieldGeometry.wallFenceTop.slice().reverse().map((p) => p.join(',')),
            ].join(' ')}
            fill="#0f172a"
            stroke="#334155"
            strokeWidth={1}
          />
          {/* Top Yellow Homerun Line on Wall */}
          <path
            d={k.pathOf(fieldGeometry.wallFenceTop)}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={1.6}
            strokeDasharray="4 2"
          />

          {/* 3. FOUL LINES (Left & Right extending to wall) */}
          <line
            x1={fieldGeometry.foulLeft[0]![0]}
            y1={fieldGeometry.foulLeft[0]![1]}
            x2={fieldGeometry.foulLeft[1]![0]}
            y2={fieldGeometry.foulLeft[1]![1]}
            stroke="#ffffff"
            strokeWidth={1.8}
            strokeOpacity={0.85}
          />
          <line
            x1={fieldGeometry.foulRight[0]![0]}
            y1={fieldGeometry.foulRight[0]![1]}
            x2={fieldGeometry.foulRight[1]![0]}
            y2={fieldGeometry.foulRight[1]![1]}
            stroke="#ffffff"
            strokeWidth={1.8}
            strokeOpacity={0.85}
          />

          {/* 4. INFIELD DIRT (Clay Diamond) */}
          <polygon
            points={fieldGeometry.baselines2D.map((p) => p.join(',')).join(' ')}
            fill="url(#field3dDirt)"
            stroke="#b45309"
            strokeWidth={1.8}
          />

          {/* 5. INNER GRASS DIAMOND */}
          <polygon
            points={fieldGeometry.innerGrass.map((p) => p.join(',')).join(' ')}
            fill="#065f46"
            stroke="#047857"
            strokeWidth={1}
          />

          {/* 6. BASELINE RUNNING PATHS */}
          <path
            d={k.pathOf(fieldGeometry.baselines2D, true)}
            fill="none"
            stroke="#fef08a"
            strokeWidth={1.8}
            strokeDasharray="3 2"
            strokeOpacity={0.7}
          />

          {/* 7. PITCHER'S MOUND (3D Cylinder & Rubber) */}
          <path className="iso-fill" d={fieldGeometry.moundCyl.fill} />
          {fieldGeometry.moundCyl.shades.map((d, s) => (
            <path key={s} className="iso-shade" data-shade={s} d={d} />
          ))}
          <path className="iso-top" d={fieldGeometry.moundCyl.top} />
          <path className="iso-line" data-tone="mid" d={fieldGeometry.moundCyl.outline} />
          {/* Pitcher's rubber slab */}
          <path className="iso-solid" data-lit d={fieldGeometry.moundRubber.fill} />
          <path className="iso-line" data-tone="hi" d={fieldGeometry.moundRubber.outline} />

          {/* 8. BASES (Cushions) */}
          {/* 1st Base */}
          <path className="iso-solid" data-lit d={fieldGeometry.base1.fill} />
          <path className="iso-line" data-tone="hi" d={fieldGeometry.base1.outline} />
          <text x={at(B1)[0] + 10} y={at(B1)[1] + 3} fill="#94a3b8" fontSize={9} fontWeight="900">1B</text>

          {/* 2nd Base */}
          <path className="iso-solid" data-lit d={fieldGeometry.base2.fill} />
          <path className="iso-line" data-tone="hi" d={fieldGeometry.base2.outline} />
          <text x={at(B2)[0]} y={at(B2)[1] - 8} textAnchor="middle" fill="#94a3b8" fontSize={9} fontWeight="900">2B</text>

          {/* 3rd Base */}
          <path className="iso-solid" data-lit d={fieldGeometry.base3.fill} />
          <path className="iso-line" data-tone="hi" d={fieldGeometry.base3.outline} />
          <text x={at(B3)[0] - 12} y={at(B3)[1] + 3} fill="#94a3b8" fontSize={9} fontWeight="900">3B</text>

          {/* Batter Boxes & Home Plate */}
          <path className="iso-line" data-tone="faint" data-dashed d={fieldGeometry.leftBatterBox.outline} />
          <path className="iso-line" data-tone="faint" data-dashed d={fieldGeometry.rightBatterBox.outline} />
          {/* Home Plate Pentagon */}
          <polygon
            points={`${at([HOME[0], HOME[1] - 3, 0.2]).join(',')} ${at([HOME[0] + 4, HOME[1], 0.2]).join(',')} ${at([HOME[0] + 4, HOME[1] + 4, 0.2]).join(',')} ${at([HOME[0] - 4, HOME[1] + 4, 0.2]).join(',')} ${at([HOME[0] - 4, HOME[1], 0.2]).join(',')}`}
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth={1}
          />
          <text x={at(HOME)[0]} y={at(HOME)[1] + 14} textAnchor="middle" fill="#10b981" fontSize={9} fontWeight="900">ДОМ</text>

          {/* 9. DEFENSIVE PLAYERS ON FIELD (All 9 Positions) */}
          {[
            { pos: DEF_P, label: 'P', num: 1, name: 'Питчер' },
            { pos: DEF_C, label: 'C', num: 2, name: 'Кэтчер' },
            { pos: DEF_1B, label: '1B', num: 3, name: '1-я база' },
            { pos: DEF_2B, label: '2B', num: 4, name: '2-я база' },
            { pos: DEF_3B, label: '3B', num: 5, name: '3-я база' },
            { pos: DEF_SS, label: 'SS', num: 6, name: 'Шортстоп' },
            { pos: DEF_LF, label: 'LF', num: 7, name: 'Левый аутфилд' },
            { pos: DEF_CF, label: 'CF', num: 8, name: 'Центральный' },
            { pos: DEF_RF, label: 'RF', num: 9, name: 'Правый аутфилд' },
          ].map((item) => {
            const pt = at(item.pos);
            return (
              <g key={item.num}>
                {/* Small player avatar token */}
                <circle cx={pt[0]} cy={pt[1]} r={7.5} fill="#0f172a" stroke="#38bdf8" strokeWidth={1.2} />
                <text x={pt[0]} y={pt[1] + 2.8} textAnchor="middle" fill="#38bdf8" fontSize={7.5} fontWeight="900" fontFamily="monospace">
                  {item.label}
                </text>
              </g>
            );
          })}

          {/* 10. ACTIVE MODE APPARATUS & LIVE ACTION ANIMATION */}
          {modeApparatus}
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

        {/* Pitch Types Selector (when mode == pitchtypes) */}
        {activeMode === 'pitchtypes' && (
          <div className="absolute top-4 left-4 flex gap-1.5 bg-black/60 p-1.5 rounded-xl border border-white/10">
            {(['fastball', 'slider', 'curveball'] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setSelectedPitch(p);
                  setProgress(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition uppercase cursor-pointer ${
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
                className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
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
