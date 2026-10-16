import React, { useState } from 'react';
import { WinProbabilityItem, MLBTeam, getTeamLogoUrl } from '../services/mlbApi';
import { TrendingUp, Info } from 'lucide-react';

interface WinProbabilityChartProps {
  data: WinProbabilityItem[];
  homeTeam: MLBTeam;
  awayTeam: MLBTeam;
  onSelectPlay?: (atBatIndex: number) => void;
}

export const WinProbabilityChart: React.FC<WinProbabilityChartProps> = ({
  data,
  homeTeam,
  awayTeam,
  onSelectPlay,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <TrendingUp className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
        <p className="text-sm font-medium">График вероятности победы еще не сформирован для этого матча</p>
      </div>
    );
  }

  const width = 800;
  const height = 240;
  const padding = { top: 30, right: 30, bottom: 40, left: 55 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate points
  const points = data.map((d, index) => {
    const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
    // 100% home win prob is at top (y = padding.top)
    // 0% home win prob is at bottom (y = height - padding.bottom)
    const prob = Math.min(100, Math.max(0, d.homeTeamWinProbability));
    const y = padding.top + ((100 - prob) / 100) * chartHeight;
    return { x, y, prob, data: d, index };
  });

  const midY = padding.top + chartHeight / 2; // 50% line

  // Build SVG path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }

  // Area under line to 50% line
  let areaD = `M ${points[0].x} ${midY} L ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    areaD += ` L ${points[i].x} ${points[i].y}`;
  }
  areaD += ` L ${points[points.length - 1].x} ${midY} Z`;

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : points[points.length - 1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-base text-white">Вероятность победы (Win Probability)</h3>
        </div>

        {/* Current status display */}
        {activePoint && (
          <div className="flex items-center gap-3 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
            <div className="flex items-center gap-1.5">
              <img src={getTeamLogoUrl(awayTeam.id)} alt={awayTeam.name} className="w-4 h-4 object-contain" />
              <span className="font-semibold text-slate-300">{awayTeam.abbreviation}</span>
              <span className="font-mono font-bold text-white">
                {(100 - activePoint.prob).toFixed(1)}%
              </span>
            </div>
            <span className="text-slate-500 font-bold">vs</span>
            <div className="flex items-center gap-1.5">
              <img src={getTeamLogoUrl(homeTeam.id)} alt={homeTeam.name} className="w-4 h-4 object-contain" />
              <span className="font-semibold text-slate-300">{homeTeam.abbreviation}</span>
              <span className="font-mono font-bold text-emerald-400">
                {activePoint.prob.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="homeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="awayGradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Background grid lines */}
          {/* 100% Home */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={width - padding.right}
            y2={padding.top}
            stroke="#334155"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={padding.left - 8}
            y={padding.top + 4}
            textAnchor="end"
            className="fill-slate-400 text-[10px] font-semibold"
          >
            100% {homeTeam.abbreviation}
          </text>

          {/* 50% Equilibrium */}
          <line
            x1={padding.left}
            y1={midY}
            x2={width - padding.right}
            y2={midY}
            stroke="#64748b"
            strokeDasharray="2 2"
            strokeWidth="1.5"
          />
          <text
            x={padding.left - 8}
            y={midY + 4}
            textAnchor="end"
            className="fill-slate-400 text-[10px] font-mono"
          >
            50%
          </text>

          {/* 0% Home (100% Away) */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#334155"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={padding.left - 8}
            y={height - padding.bottom + 4}
            textAnchor="end"
            className="fill-slate-400 text-[10px] font-semibold"
          >
            100% {awayTeam.abbreviation}
          </text>

          {/* Inning demarcations along X axis */}
          {points.map((p, idx) => {
            const isFirstOfInning =
              idx === 0 ||
              p.data.about?.inning !== points[idx - 1].data.about?.inning;
            if (isFirstOfInning && p.data.about?.inning) {
              return (
                <g key={`inn-${idx}`}>
                  <line
                    x1={p.x}
                    y1={padding.top}
                    x2={p.x}
                    y2={height - padding.bottom}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text
                    x={p.x}
                    y={height - padding.bottom + 16}
                    textAnchor="middle"
                    className="fill-slate-400 text-[10px] font-bold"
                  >
                    Инн. {p.data.about.inning}
                  </text>
                </g>
              );
            }
            return null;
          })}

          {/* Filled Area */}
          <path d={areaD} fill="url(#homeGradient)" />

          {/* Main probability stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Invisible interactive hover rects */}
          {points.map((p) => (
            <rect
              key={`hover-rect-${p.index}`}
              x={p.x - 6}
              y={padding.top}
              width={12}
              height={chartHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => {
                setHoveredIdx(p.index);
                if (onSelectPlay) onSelectPlay(p.data.atBatIndex);
              }}
            />
          ))}

          {/* Active point indicator */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={padding.top}
                x2={activePoint.x}
                y2={height - padding.bottom}
                stroke="#facc15"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6"
                className="fill-amber-400 stroke-slate-900"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Tooltip / Details of currently hovered at-bat */}
      {activePoint && activePoint.data.result && (
        <div className="mt-3 bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold shrink-0">
              {activePoint.data.about?.halfInning === 'top' ? '▲ Верх' : '▼ Низ'}{' '}
              {activePoint.data.about?.inning}
            </span>
            <p className="text-slate-200 font-medium">
              {activePoint.data.result.description || 'Очередной розыгрыш'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto font-mono">
            <span className="text-slate-400">
              Счет: {activePoint.data.result.awayScore} - {activePoint.data.result.homeScore}
            </span>
            {activePoint.data.homeTeamWinProbabilityAdded !== undefined && (
              <span
                className={`font-bold ${
                  activePoint.data.homeTeamWinProbabilityAdded >= 0
                    ? 'text-emerald-400'
                    : 'text-blue-400'
                }`}
              >
                WPA:{' '}
                {activePoint.data.homeTeamWinProbabilityAdded > 0 ? '+' : ''}
                {activePoint.data.homeTeamWinProbabilityAdded.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Helper text */}
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>
          Линия выше 50% означает преимущество {homeTeam.name}, ниже 50% — {awayTeam.name}. Наведите курсор на график для просмотра каждого розыгрыша.
        </span>
      </div>
    </div>
  );
};
