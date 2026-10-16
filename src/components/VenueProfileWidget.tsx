import React, { useState, useEffect } from 'react';
import {
  VenueDetails,
  getVenueDetails,
  ROOF_TYPES_RU,
  TURF_TYPES_RU,
} from '../services/mlbApi';
import { MapPin, Users, Shield, Loader2, Compass } from 'lucide-react';

interface VenueProfileWidgetProps {
  venueId?: number;
  venueName?: string;
}

export const VenueProfileWidget: React.FC<VenueProfileWidgetProps> = ({
  venueId,
  venueName,
}) => {
  const [venue, setVenue] = useState<VenueDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!venueId) return;
    let isMounted = true;
    setLoading(true);

    getVenueDetails(venueId)
      .then((data) => {
        if (isMounted) setVenue(data);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [venueId]);

  const fi = venue?.fieldInfo;
  const loc = venue?.location;

  const pts = [
    { x: 34, y: 208, label: 'LF (Левый филд)', val: fi?.leftLine },
    { x: 72, y: 118, label: 'LCF', val: fi?.leftCenter },
    { x: 140, y: 74, label: 'CF (Центрфилд)', val: fi?.center },
    { x: 208, y: 118, label: 'RCF', val: fi?.rightCenter },
    { x: 246, y: 208, label: 'RF (Правый филд)', val: fi?.rightLine },
  ].filter((p) => p.val != null);

  const oxp = 140;
  const oyp = 230;

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-400 shrink-0" />
            <h3 className="text-base font-black text-white">
              {venue?.name || venueName || 'MLB Ballpark'}
            </h3>
          </div>
          {loc && (loc.city || loc.state) && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{[loc.city, loc.stateAbbrev || loc.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Stadium Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/5 text-xs">
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 block">Вместимость</span>
            <span className="text-sm font-bold text-white">
              {fi?.capacity ? Number(fi.capacity).toLocaleString('ru-RU') : '—'} зрителей
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 block">Тип крыши</span>
            <span className="text-sm font-bold text-white truncate block">
              {fi?.roofType ? ROOF_TYPES_RU[fi.roofType] || fi.roofType : 'Открытый'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 block">Покрытие поля</span>
            <span className="text-sm font-bold text-white truncate block">
              {fi?.turfType ? TURF_TYPES_RU[fi.turfType] || fi.turfType : 'Натуральный газон'}
            </span>
          </div>
        </div>
      </div>

      {/* Field Dimensions Diagram */}
      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/70 border border-white/10 shadow-inner">
        <div className="text-xs font-bold text-slate-300 mb-2">Габариты и дистанции забора (Field Dimensions)</div>
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : pts.length > 0 ? (
          <svg viewBox="0 0 280 260" className="w-full max-w-[300px] h-auto select-none">
            {/* Outfield arc */}
            <path
              d={`M20 ${oyp} A160 160 0 0 1 260 ${oyp}`}
              fill="rgba(30, 41, 59, 0.3)"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="2"
            />
            {/* Foul lines */}
            <path
              d={`M${oxp} ${oyp} L${oxp - 90} ${oyp - 90} M${oxp} ${oyp} L${oxp + 90} ${oyp - 90}`}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="1.5"
            />
            {/* Home Plate */}
            <polygon
              points={`${oxp - 7},${oyp} ${oxp},${oyp - 7} ${oxp + 7},${oyp} ${oxp + 5},${oyp + 5} ${oxp - 5},${oyp + 5}`}
              fill="rgba(255, 255, 255, 0.8)"
            />

            {/* Dimension markers */}
            {pts.map((p, idx) => (
              <g key={idx}>
                <circle cx={p.x} cy={p.y} r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                <text
                  x={p.x}
                  y={p.y - 8}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {p.val} ft
                </text>
                <text
                  x={p.x}
                  y={p.y - 19}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="8.5"
                >
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        ) : (
          <div className="py-8 text-xs text-slate-500 text-center">
            Точные геометрические замеры ограждения для этого боллпарка не предоставлены MLB.
          </div>
        )}
        <div className="text-[11px] text-slate-500 mt-2 text-center">
          1 фут (ft) = 0.3048 метра · Расстояния указаны от дома до внешнего ограждения
        </div>
      </div>
    </div>
  );
};
