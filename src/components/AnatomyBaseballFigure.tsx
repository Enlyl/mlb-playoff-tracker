import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as k from './iso/iso-kit';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { sounds } from '../services/soundEffects';

export type RuleMode = 'diamond' | 'doubleplay' | 'strikezone' | 'pitchtypes';

interface ModeConfig {
  id: RuleMode;
  tabLabel: string;
  badge: string;
  badgeColor: string;
  title: string;
  actionSummary: string; // Plain-language explanation of what is shown
  whatHappensNow: (p: number, extra?: string) => string; // Live action description based on progress
  stepsLegend: Array<{ step: string; desc: string; color: string }>;
  hint: string;
  readoutLabel: string;
  camera: { pad: number; azimuth: number; elevation: number };
}

const MODES: ModeConfig[] = [
  {
    id: 'diamond',
    tabLabel: '1. Бег по базам',
    badge: 'BASERUNNING',
    badgeColor: '#10b981',
    title: 'Движение раннера по базам (Зарабатывание очка)',
    actionSummary: 'После результативного удара бьющий бежит против часовой стрелки: Дом ➔ 1B ➔ 2B ➔ 3B ➔ Дом. Касание дома приносит команде 1 Run (очко).',
    whatHappensNow: (p: number) => {
      if (p < 0.25) return '💥 Бэттер отбивает мяч и бежит к первой базе (1B)!';
      if (p < 0.5) return '⚡ Спринт от первой базы ко второй (2B) в скоринг-позицию!';
      if (p < 0.75) return '🔥 Рывок со второй на третью базу (3B) — 27 метров до очка!';
      return '🎉 Финишный слайд в ДОМ! Очко засчитано (+1 RUN)!';
    },
    stepsLegend: [
      { step: 'ДОМ ➔ 1B', desc: 'Первый рывок после контакта биты с мячом', color: '#10b981' },
      { step: '1B ➔ 2B', desc: 'Вторая база (скоринг-позиция)', color: '#38bdf8' },
      { step: '2B ➔ 3B', desc: 'Третья база (Hot Corner)', color: '#f59e0b' },
      { step: '3B ➔ ДОМ', desc: 'Взятие очка (Run)', color: '#ec4899' },
    ],
    hint: 'Смотрите на движение зеленого бегуна с пульсацией против часовой стрелки',
    readoutLabel: 'Текущая фаза',
    camera: { pad: 40, azimuth: 45, elevation: 34 },
  },
  {
    id: 'doubleplay',
    tabLabel: '2. Дабл-плей 6-4-3',
    badge: 'DOUBLE PLAY',
    badgeColor: '#f59e0b',
    title: 'Двойной аут за 2.4 секунды: комбинация 6-4-3',
    actionSummary: 'Шортстоп (позиция №6) ловит мяч на лету или отскоке ➔ скидывает 2-му бейсмену (№4, Аут 1) ➔ бросок на 1-ю базу (№3, Аут 2). Оборона делает 2 аута одним ударом.',
    whatHappensNow: (p: number) => {
      if (p < 0.35) return '1️⃣ Удар низом в сторону шортстопа (№6). Приём мяча перчаткой.';
      if (p < 0.65) return '2️⃣ Шортстоп (6) быстро скидывает на 2B (№4). АУТ №1 на второй базе!';
      return '3️⃣ 2-й бейсмен (4) с разворота вколачивает на 1B (№3). АУТ №2! ДАБЛ-ПЛЕЙ!';
    },
    stepsLegend: [
      { step: 'Шаг 1 (6)', desc: 'Приём мяча шортстопом (SS)', color: '#38bdf8' },
      { step: 'Шаг 2 (4)', desc: 'Пас на 2-ю базу: Аут раннеру', color: '#f59e0b' },
      { step: 'Шаг 3 (3)', desc: 'Бросок на 1-ю базу: Аут бьющему', color: '#10b981' },
    ],
    hint: 'Следите за белым мячом, перелетающим между игроками 6 ➔ 4 ➔ 3',
    readoutLabel: 'Комбинация аутов',
    camera: { pad: 40, azimuth: 45, elevation: 34 },
  },
  {
    id: 'strikezone',
    tabLabel: '3. Страйк-зона',
    badge: 'STRIKE ZONE',
    badgeColor: '#ef4444',
    title: 'Бросок питчера и створ страйк-зоны',
    actionSummary: 'Питчер бросает с горки с дистанции 18.44 м (60.5 футов). Страйк-зона — невидимый прямоугольник над домом от колен до груди бьющего. Мяч внутри створа = СТРАЙК.',
    whatHappensNow: (p: number) => {
      if (p < 0.25) return '⚾ Замах и релиз мяча с питчерской горки (скорость ~98 mph)';
      if (p < 0.7) return '🚀 Мяч летит через 18.44 м прямо к дому на уровне пояса';
      return '🎯 Мяч прошивает створ страйк-зоны! Ловушка кэтчера: СТРАЙК!';
    },
    stepsLegend: [
      { step: 'Горка', desc: 'Старт броска (высота 25 см над полем)', color: '#f59e0b' },
      { step: 'Траектория', desc: '18.44 м прямого полёта со спадом ~5 см', color: '#38bdf8' },
      { step: 'Створ зоны', desc: 'Ширина 43.2 см (17"), высота по баттеру', color: '#ef4444' },
    ],
    hint: 'Красная сетка 3×3 над домом — это страйк-зона. Мяч попадает внутрь створа.',
    readoutLabel: 'Скорость броска',
    camera: { pad: 45, azimuth: 50, elevation: 30 },
  },
  {
    id: 'pitchtypes',
    tabLabel: '4. Физика подач',
    badge: 'SPIN PHYSICS',
    badgeColor: '#06b6d4',
    title: 'Типы кручёных подач и излом траектории (Break)',
    actionSummary: 'Питчер подкручивает мяч пальцами (эффект Магнуса): Фастбол сопротивляется гравитации, Слайдер резко уходит вправо, Кёрвбол ныряет вниз на 45 см.',
    whatHappensNow: (p: number, extra?: string) => {
      const type = extra || 'fastball';
      if (type === 'fastball') {
        return p < 0.5 ? '⚡ Фастбол 99 mph: мощное обратное вращение 2400 RPM' : '💥 Эффект «взлетающего» мяча прямо в верхний угол зоны!';
      }
      if (type === 'slider') {
        return p < 0.5 ? '🌪️ Слайдер 88 mph: гироскопический спин, летит как фастбол...' : '↪️ В последние 3 метра резко срезает вправо на 35 см!';
      }
      return p < 0.4 ? '🌈 Кёрвбол 80 mph: высокий дуговой вылет...' : '🤿 Топ-спин 2800 RPM: резкое падение на 45 см под биту!';
    },
    stepsLegend: [
      { step: 'Фастбол', desc: 'Прямой, бэк-спин, максимальная скорость', color: '#38bdf8' },
      { step: 'Слайдер', desc: 'Горизонтальный излом вправо перед домом', color: '#f59e0b' },
      { step: 'Кёрвбол', desc: 'Вертикальный обрыв вниз (12-к-6)', color: '#ec4899' },
    ],
    hint: 'Переключайте кнопки типов подачи вверху слева, чтобы видеть разницу',
    readoutLabel: 'Параметры спина',
    camera: { pad: 45, azimuth: 50, elevation: 30 },
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

  const activeConf = useMemo(() => MODES.find((m) => m.id === activeMode)!, [activeMode]);

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
          const next = prev + delta * 0.38 * speed;
          if (next >= 1) {
            // Sound on repeat
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

  // World dimensions
  const WIDTH = 920;
  const HEIGHT = 480;

  // Camera projection matched to active mode
  const P = useMemo(() => {
    const isPitchMode = activeMode === 'strikezone' || activeMode === 'pitchtypes';
    if (isPitchMode) {
      // Zoom closer into Mound -> Home Plate alley
      return k.fitProjection(
        [
          [-45, 10, 0],
          [45, 10, 0],
          [0, 88, 0],
          [0, 15, 25],
          [-25, 75, 25],
          [25, 75, 25],
        ],
        WIDTH,
        HEIGHT,
        { pad: activeConf.camera.pad, azimuth: activeConf.camera.azimuth, elevation: activeConf.camera.elevation }
      );
    }
    // Full infield view for Diamond & Double play
    return k.fitProjection(
      [
        [-95, -55, 0],
        [95, -55, 0],
        [0, 95, 0],
        [0, -70, 15],
        [-65, 35, 10],
        [65, 35, 10],
      ],
      WIDTH,
      HEIGHT,
      { pad: activeConf.camera.pad, azimuth: activeConf.camera.azimuth, elevation: activeConf.camera.elevation }
    );
  }, [activeMode, activeConf]);

  const at = (pt: k.Point3): k.Flat => k.iso(pt, P);

  // Field coordinates
  const HOME: k.Point3 = [0, 75, 0];
  const B1: k.Point3 = [48, 27, 0];
  const B2: k.Point3 = [0, -21, 0];
  const B3: k.Point3 = [-48, 27, 0];
  const MOUND: k.Point3 = [0, 24, 0];

  // Defensive positions
  const DEF_P: k.Point3 = [0, 24, 1];     // 1: Питчер
  const DEF_C: k.Point3 = [0, 84, 1];     // 2: Кэтчер
  const DEF_1B: k.Point3 = [50, 25, 1];   // 3: 1-я база
  const DEF_2B: k.Point3 = [24, -5, 1];   // 4: 2-я база
  const DEF_3B: k.Point3 = [-50, 25, 1];  // 5: 3-я база
  const DEF_SS: k.Point3 = [-24, -5, 1];  // 6: Шортстоп

  // Field geometry
  const fieldGeometry = useMemo(() => {
    // Infield dirt path: diamond Home -> 1B -> 2B -> 3B -> Home
    const baselines2D = [at(HOME), at(B1), at(B2), at(B3), at(HOME)];

    // Inner grass
    const innerGrass = [
      at([0, 63, 0]),
      at([36, 27, 0]),
      at([0, -9, 0]),
      at([-36, 27, 0]),
    ];

    // Bases
    const base1 = k.slabOf({ x: B1[0] - 3, y: B1[1] - 3, w: 6, d: 6, r: 0.8 }, 0, 1.6, P, 2);
    const base2 = k.slabOf({ x: B2[0] - 3, y: B2[1] - 3, w: 6, d: 6, r: 0.8 }, 0, 1.6, P, 2);
    const base3 = k.slabOf({ x: B3[0] - 3, y: B3[1] - 3, w: 6, d: 6, r: 0.8 }, 0, 1.6, P, 2);

    // Mound
    const moundCyl = k.cylinder(MOUND[0], MOUND[1], 11, 0, 2.2, P, 24);
    const moundRubber = k.slabOf({ x: -4, y: 23, w: 8, d: 2, r: 0.3 }, 2.2, 0.6, P, 2);

    return {
      baselines2D,
      innerGrass,
      base1,
      base2,
      base3,
      moundCyl,
      moundRubber,
    };
  }, [P]);

  // Live HUD readout values
  const readoutValues = useMemo(() => {
    if (activeMode === 'diamond') {
      const run = progress > 0.88 ? '1 RUN (ОЧКО!)' : '0 RUNS';
      const pos =
        progress < 0.25 ? 'ДОМ ➔ 1B' : progress < 0.5 ? '1B ➔ 2B' : progress < 0.75 ? '2B ➔ 3B' : '3B ➔ ДОМ';
      return { val1: run, val2: pos, status: progress > 0.88 ? 'SAFE!' : 'IN PLAY', color: '#10b981' };
    }
    if (activeMode === 'doubleplay') {
      const outs = progress < 0.35 ? '0 аутов' : progress < 0.65 ? '1 АУТ (на 2B)' : '2 АУТА (ДАБЛ-ПЛЕЙ!)';
      const time = `${(progress * 2.4).toFixed(2)} сек`;
      return { val1: outs, val2: time, status: progress >= 0.65 ? 'DOUBLE PLAY' : 'TURNING 6-4-3', color: '#f59e0b' };
    }
    if (activeMode === 'strikezone') {
      const speedMph = (98.5 - progress * 4.2).toFixed(1);
      const distFt = (60.5 * (1 - progress)).toFixed(1);
      return {
        val1: `${speedMph} mph`,
        val2: `${distFt} ft до дома`,
        status: progress > 0.85 ? 'STRIKE!' : 'PITCHING',
        color: '#ef4444',
      };
    }
    // pitchtypes
    const breakIn = selectedPitch === 'slider' ? '14.2" вправо' : selectedPitch === 'curveball' ? '18.6" вниз' : '3.8" подъём';
    const rpm = selectedPitch === 'slider' ? '2540 RPM' : selectedPitch === 'curveball' ? '2820 RPM' : '2380 RPM';
    return { val1: breakIn, val2: rpm, status: selectedPitch.toUpperCase(), color: '#06b6d4' };
  }, [activeMode, progress, selectedPitch]);

  // Mode animation actors
  const modeActors = useMemo(() => {
    // ── MODE 1: BASERUNNING (DIAMOND) ──
    if (activeMode === 'diamond') {
      let runnerPt: k.Point3;
      let legStart: k.Point3;
      let legEnd: k.Point3;
      let legName = '';

      if (progress < 0.25) {
        const t = progress / 0.25;
        runnerPt = [HOME[0] + (B1[0] - HOME[0]) * t, HOME[1] + (B1[1] - HOME[1]) * t, 2.5];
        legStart = HOME;
        legEnd = B1;
        legName = 'Бег к первой базе (1B)';
      } else if (progress < 0.5) {
        const t = (progress - 0.25) / 0.25;
        runnerPt = [B1[0] + (B2[0] - B1[0]) * t, B1[1] + (B2[1] - B1[1]) * t, 2.5];
        legStart = B1;
        legEnd = B2;
        legName = 'Спринт ко второй (2B)';
      } else if (progress < 0.75) {
        const t = (progress - 0.5) / 0.25;
        runnerPt = [B2[0] + (B3[0] - B2[0]) * t, B2[1] + (B3[1] - B2[1]) * t, 2.5];
        legStart = B2;
        legEnd = B3;
        legName = 'Рывок к третьей (3B)';
      } else {
        const t = (progress - 0.75) / 0.25;
        runnerPt = [B3[0] + (HOME[0] - B3[0]) * t, B3[1] + (HOME[1] - B3[1]) * t, 2.5];
        legStart = B3;
        legEnd = HOME;
        legName = 'Взятие дома (RUN!)';
      }

      const rPos = at(runnerPt);

      return (
        <g>
          {/* Active Leg Highlight Line with animated flow */}
          <line
            x1={at(legStart)[0]}
            y1={at(legStart)[1]}
            x2={at(legEnd)[0]}
            y2={at(legEnd)[1]}
            stroke="#10b981"
            strokeWidth={3}
            strokeDasharray="4 2"
            filter="drop-shadow(0 0 6px #10b981)"
          />

          {/* Completed legs */}
          {progress >= 0.25 && (
            <line x1={at(HOME)[0]} y1={at(HOME)[1]} x2={at(B1)[0]} y2={at(B1)[1]} stroke="#10b981" strokeWidth={2} opacity={0.6} />
          )}
          {progress >= 0.5 && (
            <line x1={at(B1)[0]} y1={at(B1)[1]} x2={at(B2)[0]} y2={at(B2)[1]} stroke="#10b981" strokeWidth={2} opacity={0.6} />
          )}
          {progress >= 0.75 && (
            <line x1={at(B2)[0]} y1={at(B2)[1]} x2={at(B3)[0]} y2={at(B3)[1]} stroke="#10b981" strokeWidth={2} opacity={0.6} />
          )}

          {/* Running player figure */}
          <g>
            {/* Shadow */}
            <ellipse cx={rPos[0]} cy={rPos[1] + 5} rx={7} ry={3} fill="rgba(0,0,0,0.5)" />
            {/* Pulse */}
            <circle cx={rPos[0]} cy={rPos[1]} r={14} fill="none" stroke="#10b981" strokeWidth={1.5} opacity={0.5} className="animate-ping" />
            {/* Body */}
            <circle cx={rPos[0]} cy={rPos[1]} r={8.5} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
            <text x={rPos[0]} y={rPos[1] + 3.2} textAnchor="middle" fill="#ffffff" fontSize={8} fontWeight="900">
              🏃
            </text>
            {/* Tooltip banner following runner */}
            <g transform={`translate(${rPos[0]}, ${rPos[1] - 18})`}>
              <rect x="-42" y="-10" width="84" height="15" rx="4" fill="rgba(15, 23, 42, 0.9)" stroke="#10b981" strokeWidth={1} />
              <text x="0" y="1" textAnchor="middle" fill="#6ee7b7" fontSize={8} fontWeight="700">
                {legName}
              </text>
            </g>
          </g>
        </g>
      );
    }

    // ── MODE 2: DOUBLE PLAY 6-4-3 ──
    if (activeMode === 'doubleplay') {
      let ballCoord: k.Point3;
      let phaseText = '';

      if (progress < 0.35) {
        const t = progress / 0.35;
        ballCoord = [HOME[0] + (DEF_SS[0] - HOME[0]) * t, HOME[1] + (DEF_SS[1] - HOME[1]) * t, 1.5];
        phaseText = '1. Удар к Шортстопу (№6)';
      } else if (progress < 0.65) {
        const t = (progress - 0.35) / 0.3;
        ballCoord = [DEF_SS[0] + (B2[0] - DEF_SS[0]) * t, DEF_SS[1] + (B2[1] - DEF_SS[1]) * t, 3 + Math.sin(t * Math.PI) * 7];
        phaseText = '2. Скидка на 2B (№4) — АУТ 1';
      } else {
        const t = (progress - 0.65) / 0.35;
        ballCoord = [B2[0] + (B1[0] - B2[0]) * t, B2[1] + (B1[1] - B2[1]) * t, 4 + Math.sin(t * Math.PI) * 8];
        phaseText = '3. Бросок на 1B (№3) — АУТ 2!';
      }

      const bPos = at(ballCoord);

      return (
        <g>
          {/* Passing lanes numbered */}
          {/* Lane 1: Home -> SS */}
          <line
            x1={at(HOME)[0]}
            y1={at(HOME)[1]}
            x2={at(DEF_SS)[0]}
            y2={at(DEF_SS)[1]}
            stroke="#94a3b8"
            strokeWidth={1.8}
            strokeDasharray="4 2"
            opacity={progress < 0.35 ? 1 : 0.3}
          />
          {/* Lane 2: SS -> 2B */}
          <line
            x1={at(DEF_SS)[0]}
            y1={at(DEF_SS)[1]}
            x2={at(B2)[0]}
            y2={at(B2)[1]}
            stroke="#f59e0b"
            strokeWidth={2.2}
            opacity={progress >= 0.35 && progress < 0.65 ? 1 : 0.3}
          />
          {/* Lane 3: 2B -> 1B */}
          <line
            x1={at(B2)[0]}
            y1={at(B2)[1]}
            x2={at(B1)[0]}
            y2={at(B1)[1]}
            stroke="#10b981"
            strokeWidth={2.5}
            opacity={progress >= 0.65 ? 1 : 0.3}
          />

          {/* Involved player circles */}
          {/* Shortstop (6) */}
          <g>
            <circle cx={at(DEF_SS)[0]} cy={at(DEF_SS)[1]} r={11} fill="#1e293b" stroke="#38bdf8" strokeWidth={2} />
            <text x={at(DEF_SS)[0]} y={at(DEF_SS)[1] + 3.5} textAnchor="middle" fill="#38bdf8" fontSize={9} fontWeight="900">
              6
            </text>
            <text x={at(DEF_SS)[0]} y={at(DEF_SS)[1] - 15} textAnchor="middle" fill="#93c5fd" fontSize={8.5} fontWeight="700">
              Шортстоп (SS)
            </text>
          </g>

          {/* 2nd Base (4) */}
          <g>
            <circle
              cx={at(B2)[0]}
              cy={at(B2)[1]}
              r={11}
              fill={progress >= 0.65 ? '#065f46' : '#1e293b'}
              stroke="#f59e0b"
              strokeWidth={2}
            />
            <text x={at(B2)[0]} y={at(B2)[1] + 3.5} textAnchor="middle" fill="#fcd34d" fontSize={9} fontWeight="900">
              4
            </text>
            <text x={at(B2)[0]} y={at(B2)[1] - 15} textAnchor="middle" fill="#fcd34d" fontSize={8.5} fontWeight="700">
              2B (Аут №1)
            </text>
          </g>

          {/* 1st Base (3) */}
          <g>
            <circle
              cx={at(B1)[0]}
              cy={at(B1)[1]}
              r={11}
              fill={progress >= 0.95 ? '#065f46' : '#1e293b'}
              stroke="#10b981"
              strokeWidth={2}
            />
            <text x={at(B1)[0]} y={at(B1)[1] + 3.5} textAnchor="middle" fill="#6ee7b7" fontSize={9} fontWeight="900">
              3
            </text>
            <text x={at(B1)[0] + 16} y={at(B1)[1] + 3} fill="#6ee7b7" fontSize={8.5} fontWeight="700">
              1B (Аут №2)
            </text>
          </g>

          {/* Flying Ball */}
          <g>
            <circle cx={bPos[0]} cy={bPos[1]} r={6.5} fill="#ffffff" stroke="#ef4444" strokeWidth={1.5} filter="drop-shadow(0 0 8px #ffffff)" />
            {/* Floating indicator */}
            <g transform={`translate(${bPos[0]}, ${bPos[1] - 16})`}>
              <rect x="-55" y="-10" width="110" height="15" rx="4" fill="rgba(15, 23, 42, 0.95)" stroke="#f59e0b" strokeWidth={1} />
              <text x="0" y="1" textAnchor="middle" fill="#fde68a" fontSize={8} fontWeight="700">
                {phaseText}
              </text>
            </g>
          </g>
        </g>
      );
    }

    // ── MODE 3: STRIKE ZONE ──
    if (activeMode === 'strikezone') {
      const SZ_W = 14;
      const SZ_H = 18;
      const SZ_Z = 6;
      const SZ_X = HOME[0];
      const SZ_Y = HOME[1] - 4;

      const t = progress;
      const ballX = MOUND[0] * (1 - t) + SZ_X * t;
      const ballY = (MOUND[1] + 2) * (1 - t) + SZ_Y * t;
      const ballZ = 7 * (1 - t) + (SZ_Z + SZ_H / 2) * t + Math.sin(t * Math.PI) * 2;
      const ballFlat = at([ballX, ballY, ballZ]);

      // 3D Wireframe rectangle
      const szTL = at([SZ_X - SZ_W / 2, SZ_Y, SZ_Z + SZ_H]);
      const szTR = at([SZ_X + SZ_W / 2, SZ_Y, SZ_Z + SZ_H]);
      const szBR = at([SZ_X + SZ_W / 2, SZ_Y, SZ_Z]);
      const szBL = at([SZ_X - SZ_W / 2, SZ_Y, SZ_Z]);

      return (
        <g>
          {/* Pitcher on mound */}
          <g>
            <circle cx={at(MOUND)[0]} cy={at(MOUND)[1]} r={11} fill="#1e293b" stroke="#38bdf8" strokeWidth={2} />
            <text x={at(MOUND)[0]} y={at(MOUND)[1] + 3.5} textAnchor="middle" fill="#38bdf8" fontSize={8.5} fontWeight="900">
              Питчер
            </text>
            <text x={at(MOUND)[0]} y={at(MOUND)[1] - 16} textAnchor="middle" fill="#94a3b8" fontSize={8} fontStyle="italic">
              Дистанция: 18.44 м
            </text>
          </g>

          {/* Guide laser line */}
          <line
            x1={at([MOUND[0], MOUND[1] + 2, 7])[0]}
            y1={at([MOUND[0], MOUND[1] + 2, 7])[1]}
            x2={at([SZ_X, SZ_Y, SZ_Z + SZ_H / 2])[0]}
            y2={at([SZ_X, SZ_Y, SZ_Z + SZ_H / 2])[1]}
            stroke="#38bdf8"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            opacity={0.6}
          />

          {/* 3x3 Strike Zone Box */}
          <polygon
            points={`${szTL.join(',')} ${szTR.join(',')} ${szBR.join(',')} ${szBL.join(',')}`}
            fill={progress > 0.85 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.15)'}
            stroke="#ef4444"
            strokeWidth={2}
            className={progress > 0.85 ? 'animate-pulse' : ''}
          />
          {/* 3x3 Cross grid */}
          <line x1={(szTL[0] * 2 + szTR[0]) / 3} y1={(szTL[1] * 2 + szTR[1]) / 3} x2={(szBL[0] * 2 + szBR[0]) / 3} y2={(szBL[1] * 2 + szBR[1]) / 3} stroke="#ef4444" strokeWidth={0.8} strokeDasharray="2 2" />
          <line x1={(szTL[0] + szTR[0] * 2) / 3} y1={(szTL[1] + szTR[1] * 2) / 3} x2={(szBL[0] + szBR[0] * 2) / 3} y2={(szBL[1] + szBR[1] * 2) / 3} stroke="#ef4444" strokeWidth={0.8} strokeDasharray="2 2" />
          <line x1={(szTL[0] * 2 + szBL[0]) / 3} y1={(szTL[1] * 2 + szBL[1]) / 3} x2={(szTR[0] * 2 + szBR[0]) / 3} y2={(szTR[1] * 2 + szBR[1]) / 3} stroke="#ef4444" strokeWidth={0.8} strokeDasharray="2 2" />
          <line x1={(szTL[0] + szBL[0] * 2) / 3} y1={(szTL[1] + szBL[1] * 2) / 3} x2={(szTR[0] + szBR[0] * 2) / 3} y2={(szTR[1] + szBR[1] * 2) / 3} stroke="#ef4444" strokeWidth={0.8} strokeDasharray="2 2" />

          {/* Label: STRIKE ZONE */}
          <text x={szTL[0]} y={szTL[1] - 8} fill="#f87171" fontSize={9} fontWeight="900">
            СТРАЙК-ЗОНА (17")
          </text>

          {/* Flying Ball */}
          <circle cx={ballFlat[0]} cy={ballFlat[1]} r={6.5} fill="#ffffff" stroke="#ef4444" strokeWidth={1.5} filter="drop-shadow(0 0 8px #ef4444)" />
          {/* Ground shadow */}
          <ellipse cx={at([ballX, ballY, 0.2])[0]} cy={at([ballX, ballY, 0.2])[1]} rx={5} ry={2.5} fill="rgba(0,0,0,0.4)" />

          {/* Callout if in zone */}
          {progress > 0.85 && (
            <g transform={`translate(${szTR[0] + 15}, ${szTR[1] + 10})`}>
              <rect x="0" y="-12" width="75" height="18" rx="4" fill="#ef4444" />
              <text x="37" y="0" textAnchor="middle" fill="#ffffff" fontSize={9} fontWeight="900">
                ✓ СТРАЙК!
              </text>
            </g>
          )}
        </g>
      );
    }

    // ── MODE 4: PITCH TYPES & SPIN ──
    const t = progress;
    const PITCH_START: k.Point3 = [0, 24, 7];
    const PITCH_END: k.Point3 = [0, 71, 14];

    let breakX = 0;
    let breakZ = 0;
    if (selectedPitch === 'fastball') {
      breakZ = Math.sin(t * Math.PI) * 3;
    } else if (selectedPitch === 'slider') {
      breakX = t > 0.4 ? Math.pow(t - 0.4, 2) * 40 : 0;
      breakZ = -Math.pow(t, 2) * 3;
    } else {
      breakZ = t < 0.35 ? Math.sin(t * Math.PI) * 4 : -Math.pow(t, 2) * 16;
    }

    const curPitchX = PITCH_START[0] + (PITCH_END[0] - PITCH_START[0]) * t + breakX;
    const curPitchY = PITCH_START[1] + (PITCH_END[1] - PITCH_START[1]) * t;
    const curPitchZ = PITCH_START[2] + (PITCH_END[2] - PITCH_START[2]) * t + breakZ;
    const ballCoord = at([curPitchX, curPitchY, curPitchZ]);

    return (
      <g>
        {/* Baseline straight path comparison */}
        <line
          x1={at(PITCH_START)[0]}
          y1={at(PITCH_START)[1]}
          x2={at(PITCH_END)[0]}
          y2={at(PITCH_END)[1]}
          stroke="#475569"
          strokeWidth={1.2}
          strokeDasharray="3 3"
        />
        <text x={at(PITCH_END)[0] + 12} y={at(PITCH_END)[1]} fill="#64748b" fontSize={7.5} fontStyle="italic">
          Прямая линия
        </text>

        {/* Curved actual path */}
        <path
          d={`M ${at(PITCH_START)[0]} ${at(PITCH_START)[1]} Q ${at([(PITCH_START[0] + curPitchX) / 2, (PITCH_START[1] + curPitchY) / 2, (PITCH_START[2] + curPitchZ) / 2 + 2])[0]} ${at([(PITCH_START[0] + curPitchX) / 2, (PITCH_START[1] + curPitchY) / 2, (PITCH_START[2] + curPitchZ) / 2 + 2])[1]} ${ballCoord[0]} ${ballCoord[1]}`}
          fill="none"
          stroke="#06b6d4"
          strokeWidth={2.4}
          filter="drop-shadow(0 0 6px #06b6d4)"
        />

        {/* Spin gyro ring */}
        <circle cx={at(PITCH_START)[0]} cy={at(PITCH_START)[1]} r={11} fill="none" stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="3 2" className="animate-spin" />

        {/* The Ball */}
        <circle cx={ballCoord[0]} cy={ballCoord[1]} r={7} fill="#ffffff" stroke="#06b6d4" strokeWidth={1.8} filter="drop-shadow(0 0 8px #06b6d4)" />
        <ellipse cx={at([curPitchX, curPitchY, 0.2])[0]} cy={at([curPitchX, curPitchY, 0.2])[1]} rx={5} ry={2.5} fill="rgba(0,0,0,0.4)" />

        {/* Pitch name following ball */}
        <g transform={`translate(${ballCoord[0]}, ${ballCoord[1] - 18})`}>
          <rect x="-38" y="-10" width="76" height="15" rx="4" fill="rgba(15, 23, 42, 0.95)" stroke="#06b6d4" strokeWidth={1} />
          <text x="0" y="1" textAnchor="middle" fill="#67e8f9" fontSize={8} fontWeight="700">
            {selectedPitch === 'fastball' ? 'Фастбол 99mph' : selectedPitch === 'slider' ? 'Слайдер 88mph' : 'Кёрвбол 80mph'}
          </text>
        </g>
      </g>
    );
  }, [activeMode, progress, selectedPitch, HOME, B1, B2, B3, MOUND, DEF_SS]);

  return (
    <div className="iso rounded-2xl overflow-hidden border border-white/10 bg-[#0d1117] text-slate-200 shadow-2xl space-y-0">
      {/* ── TOP BAR: TABS WITH CLEAR LABELS ── */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/10 bg-[#161b22] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase font-mono"
              style={{
                backgroundColor: `${activeConf.badgeColor}20`,
                color: activeConf.badgeColor,
                border: `1px solid ${activeConf.badgeColor}40`,
              }}
            >
              {activeConf.badge}
            </span>
            <span className="text-xs text-slate-400">• Интерактивная 3D-демонстрация</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">{activeConf.title}</h3>
        </div>

        {/* 4 Mode Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
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
                  border: isCur ? `1px solid ${mode.badgeColor}50` : '1px solid transparent',
                  color: isCur ? '#ffffff' : undefined,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mode.badgeColor }} />
                <span>{mode.tabLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ACTION SUMMARY EXPLAINER STRIP ── */}
      <div className="px-4 sm:px-6 py-2.5 bg-slate-900/90 border-b border-white/5 flex items-start gap-2.5 text-xs text-slate-300">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-bold text-white">Что здесь показано: </span>
          <span>{activeConf.actionSummary}</span>
        </div>
      </div>

      {/* ── LIVE ACTION STATUS BANNER (Dynamic subtitle describing current moment) ── */}
      <div className="px-4 sm:px-6 py-2 bg-black/50 border-b border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-semibold text-emerald-300 truncate">
            {activeConf.whatHappensNow(progress, selectedPitch)}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
          Фаза: {Math.round(progress * 100)}%
        </span>
      </div>

      {/* ── 3D CANVAS STAGE ── */}
      <div className="relative bg-[#090d16] p-2 sm:p-4 flex items-center justify-center overflow-hidden min-h-[380px]">
        {/* Subtle background glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: 'radial-gradient(ellipse 65% 55% at 50% 65%, rgba(6, 78, 59, 0.4) 0%, rgba(2, 44, 34, 0.1) 60%, transparent 100%)',
          }}
        />

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="iso-svg max-w-full h-auto drop-shadow-2xl select-none"
          style={{ maxHeight: '460px' }}
        >
          <defs>
            <radialGradient id="fieldGrassClean" cx="50%" cy="80%" r="75%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="65%" stopColor="#044e39" />
              <stop offset="100%" stopColor="#022c22" />
            </radialGradient>
            <radialGradient id="infieldDirtClean" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="85%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>
          </defs>

          {/* 1. Infield Dirt Diamond */}
          <polygon
            points={fieldGeometry.baselines2D.map((p) => p.join(',')).join(' ')}
            fill="url(#infieldDirtClean)"
            stroke="#b45309"
            strokeWidth={1.8}
          />

          {/* 2. Inner Grass Diamond */}
          <polygon
            points={fieldGeometry.innerGrass.map((p) => p.join(',')).join(' ')}
            fill="#065f46"
            stroke="#047857"
            strokeWidth={1}
          />

          {/* 3. Baseline Running Paths */}
          <path
            d={k.pathOf(fieldGeometry.baselines2D, true)}
            fill="none"
            stroke="#fef08a"
            strokeWidth={1.8}
            strokeDasharray="3 2"
            strokeOpacity={0.7}
          />

          {/* 4. Pitcher's Mound */}
          <path className="iso-fill" d={fieldGeometry.moundCyl.fill} />
          {fieldGeometry.moundCyl.shades.map((d, s) => (
            <path key={s} className="iso-shade" data-shade={s} d={d} />
          ))}
          <path className="iso-top" d={fieldGeometry.moundCyl.top} />
          <path className="iso-line" data-tone="mid" d={fieldGeometry.moundCyl.outline} />
          <path className="iso-solid" data-lit d={fieldGeometry.moundRubber.fill} />
          <path className="iso-line" data-tone="hi" d={fieldGeometry.moundRubber.outline} />

          {/* 5. Bases with clear text labels */}
          {/* 1B */}
          <path className="iso-solid" data-lit d={fieldGeometry.base1.fill} />
          <path className="iso-line" data-tone="hi" d={fieldGeometry.base1.outline} />
          <text x={at(B1)[0] + 10} y={at(B1)[1] + 3} fill="#fcd34d" fontSize={10} fontWeight="900">
            1B
          </text>

          {/* 2B */}
          <path className="iso-solid" data-lit d={fieldGeometry.base2.fill} />
          <path className="iso-line" data-tone="hi" d={fieldGeometry.base2.outline} />
          <text x={at(B2)[0]} y={at(B2)[1] - 8} textAnchor="middle" fill="#fcd34d" fontSize={10} fontWeight="900">
            2B
          </text>

          {/* 3B */}
          <path className="iso-solid" data-lit d={fieldGeometry.base3.fill} />
          <path className="iso-line" data-tone="hi" d={fieldGeometry.base3.outline} />
          <text x={at(B3)[0] - 12} y={at(B3)[1] + 3} fill="#fcd34d" fontSize={10} fontWeight="900">
            3B
          </text>

          {/* Home Plate */}
          <polygon
            points={`${at([HOME[0], HOME[1] - 3, 0.2]).join(',')} ${at([HOME[0] + 4.5, HOME[1], 0.2]).join(',')} ${at([HOME[0] + 4.5, HOME[1] + 4.5, 0.2]).join(',')} ${at([HOME[0] - 4.5, HOME[1] + 4.5, 0.2]).join(',')} ${at([HOME[0] - 4.5, HOME[1], 0.2]).join(',')}`}
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth={1}
          />
          <text x={at(HOME)[0]} y={at(HOME)[1] + 16} textAnchor="middle" fill="#10b981" fontSize={10} fontWeight="900">
            ДОМ
          </text>

          {/* 6. Active Mode Actors (Animation) */}
          {modeActors}
        </svg>

        {/* ── LIVE HUD OVERLAY (Top-Right) ── */}
        <div className="absolute top-4 right-4 bg-[#111827]/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl pointer-events-none flex items-center gap-4 text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{activeConf.readoutLabel}</div>
            <div className="text-sm font-black text-white">{readoutValues.val1}</div>
          </div>
          <div className="w-[1px] h-7 bg-white/10" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Параметр</div>
            <div className="text-sm font-black text-emerald-400">{readoutValues.val2}</div>
          </div>
          <div className="w-[1px] h-7 bg-white/10" />
          <span
            className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase"
            style={{
              backgroundColor: `${readoutValues.color}22`,
              color: readoutValues.color,
              border: `1px solid ${readoutValues.color}44`,
            }}
          >
            {readoutValues.status}
          </span>
        </div>

        {/* Pitch Types Selector (in Mode 4) */}
        {activeMode === 'pitchtypes' && (
          <div className="absolute top-4 left-4 flex gap-1.5 bg-black/75 p-1.5 rounded-xl border border-white/10 shadow-lg">
            {(['fastball', 'slider', 'curveball'] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setSelectedPitch(p);
                  setProgress(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition uppercase cursor-pointer ${
                  selectedPitch === p ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'fastball' ? '⚡ Фастбол' : p === 'slider' ? '↪️ Слайдер' : '🤿 Кёрвбол'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── STEPS / LEGEND BAR (Explaining each color/actor in the animation) ── */}
      <div className="px-4 sm:px-6 py-3 bg-[#111827] border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider font-mono">
            Этапы розыгрыша:
          </span>
          {activeConf.stepsLegend.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-bold text-white">{item.step}</span>
              <span className="text-slate-400 text-[11px]">({item.desc})</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM PLAYBACK & SCRUBBER CONTROLS ── */}
      <div className="px-4 sm:px-6 py-3 bg-[#161b22] border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Пауза' : 'Плей'}</span>
          </button>

          <button
            onClick={() => setProgress(0)}
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
          <span className="font-mono text-[11px] text-slate-400">Покадрово:</span>
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
