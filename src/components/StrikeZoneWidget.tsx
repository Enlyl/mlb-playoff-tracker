import React, { useState } from 'react';
import { PlayItem, PlayEvent, PITCH_NAMES_RU, CALL_NAMES_RU } from '../services/mlbApi';
import { Info, Disc } from 'lucide-react';

interface StrikeZoneWidgetProps {
  currentPlay: PlayItem | null;
  allPlays: PlayItem[];
  onSelectPlayer?: (playerId: number, playerName: string) => void;
}

export const StrikeZoneWidget: React.FC<StrikeZoneWidgetProps> = ({
  currentPlay,
  allPlays,
  onSelectPlayer,
}) => {
  const [selectedPitchNum, setSelectedPitchNum] = useState<number | null>(null);
  const [hiddenCalls, setHiddenCalls] = useState<Record<string, boolean>>({});

  // Find candidate play with pitches (currentPlay or last play with pitches)
  const targetPlay = React.useMemo(() => {
    if (currentPlay?.playEvents?.some((e) => (e as any).isPitch || e.pitchData)) {
      return currentPlay;
    }
    for (let i = allPlays.length - 1; i >= 0; i--) {
      const p = allPlays[i];
      if (p.playEvents?.some((e) => (e as any).isPitch || e.pitchData)) {
        return p;
      }
    }
    return currentPlay;
  }, [currentPlay, allPlays]);

  const pitches = (targetPlay?.playEvents || []).filter(
    (e) => (e as any).isPitch || e.pitchData
  );

  const toggleCallFilter = (callType: string) => {
    setHiddenCalls((prev) => ({ ...prev, [callType]: !prev[callType] }));
  };

  const getCallCategory = (e: PlayEvent): 'inplay' | 'ball' | 'strike' | 'other' => {
    if (e.details?.isInPlay) return 'inplay';
    if (e.details?.isBall) return 'ball';
    if (e.details?.isStrike) return 'strike';
    return 'other';
  };

  const getCallColor = (cat: 'inplay' | 'ball' | 'strike' | 'other') => {
    switch (cat) {
      case 'inplay':
        return '#10b981'; // green
      case 'ball':
        return '#0284c7'; // blue
      case 'strike':
        return '#ef4444'; // red
      default:
        return '#64748b'; // slate
    }
  };

  if (!targetPlay || !pitches.length) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 rounded-xl bg-white/[0.02] border border-white/5">
        Для текущего розыгрыша нет телеметрии зоны страйка MLB Statcast.
      </div>
    );
  }

  // Scaling constants
  const S = 70; // px per foot
  const CX = 150;
  const BASE = 310;

  const refPitch = pitches.find(
    (e: any) => e.pitchData?.strikeZoneTop && e.pitchData?.strikeZoneBottom
  ) as any;
  const top = refPitch?.pitchData.strikeZoneTop ?? 3.4;
  const bot = refPitch?.pitchData.strikeZoneBottom ?? 1.6;
  const half = 0.708; // half plate width (17 inches in feet)

  const zx = CX - half * S;
  const zw = 2 * half * S;
  const zy = BASE - top * S;
  const zh = (top - bot) * S;

  const batter = targetPlay.matchup?.batter;
  const pitcher = targetPlay.matchup?.pitcher;

  return (
    <div className="space-y-4">
      {/* Matchup Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Питчер:</span>
          <button
            onClick={() => pitcher && onSelectPlayer?.(pitcher.id, pitcher.fullName)}
            className="font-bold text-amber-300 hover:underline"
          >
            {pitcher?.fullName || 'Питчер'}
          </button>
          <span className="text-slate-500">→</span>
          <span className="text-slate-400">Бьющий:</span>
          <button
            onClick={() => batter && onSelectPlayer?.(batter.id, batter.fullName)}
            className="font-bold text-blue-300 hover:underline"
          >
            {batter?.fullName || 'Бьющий'}
          </button>
        </div>
        <div className="text-[11px] text-slate-400">
          Иннинг {targetPlay.about?.inning} ({targetPlay.about?.isTopInning ? 'Верх' : 'Низ'}) · {pitches.length} подач в схватке
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Strike Zone SVG */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/70 border border-white/10 shadow-inner">
          <svg className="w-full max-w-[280px] h-auto drop-shadow-md select-none" viewBox="0 0 300 340">
            {/* Background field outline */}
            <polygon points={`${CX},338 292,171 ${CX},4 8,171`} fill="rgba(30, 41, 59, 0.4)" stroke="rgba(255,255,255,0.05)" />

            {/* 9-box grid vertical lines */}
            <line x1={zx + zw / 3} y1={zy} x2={zx + zw / 3} y2={zy + zh} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={zx + (2 * zw) / 3} y1={zy} x2={zx + (2 * zw) / 3} y2={zy + zh} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />

            {/* 9-box grid horizontal lines */}
            <line x1={zx} y1={zy + zh / 3} x2={zx + zw} y2={zy + zh / 3} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={zx} y1={zy + (2 * zh) / 3} x2={zx + zw} y2={zy + (2 * zh) / 3} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />

            {/* Strike Zone Box */}
            <rect
              x={zx}
              y={zy}
              width={zw}
              height={zh}
              fill="rgba(59, 130, 246, 0.08)"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="2"
              rx="2"
            />

            {/* Home Plate */}
            <polygon
              points={`${CX - half * S},330 ${CX + half * S},330 ${CX + half * S},334 ${CX},339 ${CX - half * S},334`}
              fill="rgba(203, 213, 225, 0.9)"
            />

            {/* Pitch Dots */}
            {pitches.map((p: any, idx: number) => {
              const c = p.pitchData?.coordinates;
              const n = p.pitchNumber ?? idx + 1;
              const cat = getCallCategory(p);
              if (hiddenCalls[cat]) return null;

              // If exact pX/pZ coordinates are available
              let x = CX;
              let y = zy + zh / 2;
              if (c && c.pX != null && c.pZ != null) {
                x = CX + c.pX * S;
                y = BASE - c.pZ * S;
              } else if (p.pitchData?.zone) {
                // Fallback zone approximation
                const z = p.pitchData.zone;
                const col = ((z - 1) % 3);
                const row = Math.floor((z - 1) / 3);
                x = zx + (col + 0.5) * (zw / 3);
                y = zy + (row + 0.5) * (zh / 3);
              }

              const isSelected = selectedPitchNum === n;
              const col = getCallColor(cat);

              return (
                <g
                  key={idx}
                  className="cursor-pointer transition-all hover:scale-110"
                  onClick={() => setSelectedPitchNum(isSelected ? null : n)}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 13 : 10.5}
                    fill={col}
                    stroke={isSelected ? '#fbbf24' : '#ffffff'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="transition-all"
                  />
                  <text
                    x={x}
                    y={y + 3.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="800"
                    pointerEvents="none"
                  >
                    {n}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Filter badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-3 border-t border-white/5 w-full text-xs">
            <button
              onClick={() => toggleCallFilter('ball')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                hiddenCalls['ball']
                  ? 'opacity-40 border-white/5 bg-transparent'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              Болл
            </button>
            <button
              onClick={() => toggleCallFilter('strike')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                hiddenCalls['strike']
                  ? 'opacity-40 border-white/5 bg-transparent'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Страйк / Фол
            </button>
            <button
              onClick={() => toggleCallFilter('inplay')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                hiddenCalls['inplay']
                  ? 'opacity-40 border-white/5 bg-transparent'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              В игре
            </button>
          </div>
          <span className="text-[10px] text-slate-500 mt-2 text-center">
            Вид от кэтчера · Кликните на подачу для подробностей
          </span>
        </div>

        {/* Pitch List */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {pitches.map((p: any, idx: number) => {
            const n = p.pitchNumber ?? idx + 1;
            const cat = getCallCategory(p);
            if (hiddenCalls[cat]) return null;

            const isSelected = selectedPitchNum === n;
            const typeRaw = p.details?.type?.description || 'Подача';
            const typeRu = PITCH_NAMES_RU[typeRaw] || typeRaw;
            const callRaw = p.details?.call?.description || '';
            const callRu = CALL_NAMES_RU[callRaw] || callRaw;
            const mph = p.pitchData?.startSpeed;
            const kmh = mph ? Math.round(mph * 1.60934) : null;
            const spin = p.pitchData?.breaks?.spinRate;
            const brk = p.pitchData?.breaks?.breakLength;
            const countStr = p.count ? `${p.count.balls}-${p.count.strikes}` : '';
            const col = getCallColor(cat);

            return (
              <div
                key={idx}
                onClick={() => setSelectedPitchNum(isSelected ? null : n)}
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-md'
                    : 'bg-slate-900/50 hover:bg-slate-800/60 border-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0"
                    style={{ backgroundColor: col }}
                  >
                    {n}
                  </span>
                  <div className="min-w-0 truncate">
                    <div className="font-bold text-white truncate flex items-center gap-1.5">
                      <span>{typeRu}</span>
                      {mph && (
                        <span className="text-[11px] text-slate-400 font-mono font-normal">
                          {kmh} км/ч ({mph.toFixed(1)} mph)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {callRu}
                      {spin && ` · ${Math.round(spin)} об/мин`}
                      {brk && ` · излом ${brk.toFixed(1)}″`}
                    </div>
                  </div>
                </div>

                {countStr && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 shrink-0">
                    счёт {countStr}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
