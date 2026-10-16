import React, { useState, useMemo } from 'react';
import { PlayItem } from '../services/mlbApi';
import { Flame, Target, Disc } from 'lucide-react';

interface SprayHit {
  x: number;
  y: number;
  cls: 'hr' | 'hit' | 'err' | 'out';
  desc: string;
  batter: string;
  batterId?: number;
  ev: number | null; // launch speed mph
  la: number | null; // launch angle
  dist: number | null; // distance ft
}

interface SprayChartWidgetProps {
  allPlays: PlayItem[];
  onSelectPlayer?: (playerId: number, playerName: string) => void;
}

export const SprayChartWidget: React.FC<SprayChartWidgetProps> = ({
  allPlays,
  onSelectPlayer,
}) => {
  const [selectedHitIdx, setSelectedHitIdx] = useState<number | null>(null);
  const [filterCls, setFilterCls] = useState<Record<string, boolean>>({
    hit: true,
    hr: true,
    err: true,
    out: true,
  });

  const hits = useMemo<SprayHit[]>(() => {
    const list: SprayHit[] = [];
    allPlays.forEach((p) => {
      (p.playEvents || []).forEach((pe: any) => {
        const hd = pe.hitData;
        if (hd && hd.coordinates && hd.coordinates.coordX != null) {
          const ev = (p.result?.eventType || p.result?.event || '').toLowerCase();
          let cls: 'hr' | 'hit' | 'err' | 'out' = 'out';
          if (ev === 'home_run') cls = 'hr';
          else if (['single', 'double', 'triple'].includes(ev)) cls = 'hit';
          else if (ev.includes('error')) cls = 'err';

          list.push({
            x: hd.coordinates.coordX,
            y: hd.coordinates.coordY,
            cls,
            desc: p.result?.description || '',
            batter: p.matchup?.batter?.fullName || 'Бьющий',
            batterId: p.matchup?.batter?.id,
            ev: hd.launchSpeed ?? null,
            la: hd.launchAngle ?? null,
            dist: hd.totalDistance ?? null,
          });
        }
      });
    });
    return list;
  }, [allPlays]);

  const toggleFilter = (cls: string) => {
    setFilterCls((prev) => ({ ...prev, [cls]: !prev[cls] }));
  };

  const hardestHit = useMemo(() => {
    return hits
      .filter((h) => h.ev != null)
      .sort((a, b) => (b.ev || 0) - (a.ev || 0))[0];
  }, [hits]);

  const longestHit = useMemo(() => {
    return hits
      .filter((h) => h.dist != null)
      .sort((a, b) => (b.dist || 0) - (a.dist || 0))[0];
  }, [hits]);

  if (!hits.length) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 rounded-xl bg-white/[0.02] border border-white/5">
        В этой игре пока нет зафиксированных ударов с координатами Statcast.
      </div>
    );
  }

  const oxp = 140;
  const oyp = 230;
  const scale = 0.92;

  const colorOf = (cls: string) => {
    switch (cls) {
      case 'hr':
        return '#ef4444';
      case 'hit':
        return '#10b981';
      case 'err':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const selectedHit = selectedHitIdx !== null ? hits[selectedHitIdx] : null;

  return (
    <div className="space-y-4">
      {/* Top Highlights Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {hardestHit && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-amber-300/80 uppercase font-bold">Самый сильный контакт</div>
              <div className="font-bold text-white truncate">
                {hardestHit.batter} — {hardestHit.ev} mph ({Math.round((hardestHit.ev || 0) * 1.60934)} км/ч)
              </div>
            </div>
          </div>
        )}
        {longestHit && (
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2.5">
            <Target className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-blue-300/80 uppercase font-bold">Самый дальний удар</div>
              <div className="font-bold text-white truncate">
                {longestHit.batter} — {longestHit.dist} ft ({Math.round((longestHit.dist || 0) * 0.3048)} м)
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Spray SVG */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/70 border border-white/10 shadow-inner">
          <svg viewBox="0 0 280 260" className="w-full max-w-[280px] h-auto select-none">
            {/* Outfield arc */}
            <path
              d={`M20 ${oyp} A160 160 0 0 1 260 ${oyp}`}
              fill="rgba(30, 41, 59, 0.25)"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="2"
            />
            {/* Infield dirt diamond */}
            <polygon
              points={`${oxp},${oyp} ${oxp - 45},${oyp - 45} ${oxp},${oyp - 90} ${oxp + 45},${oyp - 45}`}
              fill="rgba(180, 83, 9, 0.12)"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
            {/* Foul lines */}
            <path
              d={`M${oxp} ${oyp} L${oxp - 90} ${oyp - 90} M${oxp} ${oyp} L${oxp + 90} ${oyp - 90}`}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="1.5"
            />
            {/* Home Plate */}
            <polygon
              points={`${oxp - 7},${oyp} ${oxp},${oyp - 7} ${oxp + 7},${oyp} ${oxp + 5},${oyp + 5} ${oxp - 5},${oyp + 5}`}
              fill="rgba(255, 255, 255, 0.7)"
            />

            {/* Hit dots */}
            {hits.map((h, i) => {
              if (!filterCls[h.cls]) return null;
              const cx = oxp + (h.x - 125) * scale;
              const cy = oyp - (204 - h.y) * scale;
              const isSelected = selectedHitIdx === i;

              return (
                <circle
                  key={i}
                  cx={cx.toFixed(1)}
                  cy={cy.toFixed(1)}
                  r={isSelected ? 7.5 : 5.5}
                  fill={colorOf(h.cls)}
                  fillOpacity={isSelected ? 1 : 0.85}
                  stroke={isSelected ? '#ffffff' : '#000000'}
                  strokeWidth={isSelected ? 2 : 1}
                  className="cursor-pointer transition-all hover:scale-125"
                  onClick={() => setSelectedHitIdx(i)}
                />
              );
            })}
          </svg>

          {/* Filter badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-3 border-t border-white/5 w-full text-xs">
            <button
              onClick={() => toggleFilter('hit')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                !filterCls['hit'] ? 'opacity-40 border-white/5' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Хит ({hits.filter((h) => h.cls === 'hit').length})
            </button>
            <button
              onClick={() => toggleFilter('hr')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                !filterCls['hr'] ? 'opacity-40 border-white/5' : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Хоум-ран ({hits.filter((h) => h.cls === 'hr').length})
            </button>
            <button
              onClick={() => toggleFilter('err')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                !filterCls['err'] ? 'opacity-40 border-white/5' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Ошибка ({hits.filter((h) => h.cls === 'err').length})
            </button>
            <button
              onClick={() => toggleFilter('out')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                !filterCls['out'] ? 'opacity-40 border-white/5' : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              Аут ({hits.filter((h) => h.cls === 'out').length})
            </button>
          </div>
        </div>

        {/* Selected Hit Details Box */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3 min-h-[180px] flex flex-col justify-center">
          {selectedHit ? (
            <>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <button
                  onClick={() =>
                    selectedHit.batterId &&
                    onSelectPlayer?.(selectedHit.batterId, selectedHit.batter)
                  }
                  className="font-bold text-white hover:underline text-sm truncate"
                >
                  {selectedHit.batter}
                </button>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                  style={{
                    backgroundColor: `${colorOf(selectedHit.cls)}25`,
                    color: colorOf(selectedHit.cls),
                  }}
                >
                  {selectedHit.cls === 'hr'
                    ? 'Хоум-ран'
                    : selectedHit.cls === 'hit'
                    ? 'Хит'
                    : selectedHit.cls === 'err'
                    ? 'Ошибка'
                    : 'Аут в поле'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedHit.desc}</p>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
                <div className="p-2 rounded-lg bg-white/[0.02]">
                  <div className="text-[10px] text-slate-400">Скорость вылета</div>
                  <div className="font-bold text-white text-xs">
                    {selectedHit.ev ? `${selectedHit.ev} mph` : '—'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.02]">
                  <div className="text-[10px] text-slate-400">Угол запуска</div>
                  <div className="font-bold text-white text-xs">
                    {selectedHit.la != null ? `${selectedHit.la}°` : '—'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.02]">
                  <div className="text-[10px] text-slate-400">Дистанция</div>
                  <div className="font-bold text-white text-xs">
                    {selectedHit.dist ? `${selectedHit.dist} ft` : '—'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">
              Нажмите на точку на поле для просмотра параметров удара (скорость вылета, дистанция, угол).
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
