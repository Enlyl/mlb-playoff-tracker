import React, { useState, useEffect } from 'react';
import { X, Users, Loader2, ChevronRight, Shield } from 'lucide-react';
import {
  RosterPlayerItem,
  getTeamRoster,
  getTeamLogoUrl,
  getPlayerPhotoUrl,
} from '../services/mlbApi';

interface TeamRosterModalProps {
  teamId: number | null;
  teamName?: string;
  onClose: () => void;
  onSelectPlayer: (playerId: number, playerName: string) => void;
}

export const TeamRosterModal: React.FC<TeamRosterModalProps> = ({
  teamId,
  teamName,
  onClose,
  onSelectPlayer,
}) => {
  const [roster, setRoster] = useState<RosterPlayerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    let isMounted = true;
    setLoading(true);

    getTeamRoster(teamId)
      .then((data) => {
        if (isMounted) setRoster(data);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [teamId]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!teamId) return null;

  // Group players by position
  const groupOf = (code: string) => {
    if (code === '1') return 'P';
    if (code === '2') return 'C';
    if (['3', '4', '5', '6'].includes(code)) return 'IF';
    if (['7', '8', '9'].includes(code)) return 'OF';
    if (code === '10') return 'DH';
    return 'Other';
  };

  const groups: Record<string, RosterPlayerItem[]> = {
    P: [],
    C: [],
    IF: [],
    OF: [],
    DH: [],
    Other: [],
  };

  roster.forEach((r) => {
    const grp = groupOf(r.position?.code);
    if (groups[grp]) groups[grp].push(r);
    else groups.Other.push(r);
  });

  const groupTitles: Record<string, string> = {
    P: 'Питчеры (Pitchers)',
    C: 'Кэтчеры (Catchers)',
    IF: 'Инфилдеры (Infielders)',
    OF: 'Аутфилдеры (Outfielders)',
    DH: 'Назначенные бьющие (DH)',
    Other: 'Другие игроки',
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden text-slate-100 relative"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(10, 15, 29, 0.98))',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={getTeamLogoUrl(teamId)}
              alt={teamName || 'Team'}
              className="w-9 h-9 object-contain"
            />
            <div>
              <h3 className="text-base font-black text-white">{teamName}</h3>
              <div className="text-xs text-slate-400">Активный состав (Active Roster) · {roster.length} игроков</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs text-slate-400">Загрузка ростера команды…</span>
            </div>
          ) : (
            Object.entries(groups)
              .filter(([, list]) => list.length > 0)
              .map(([code, list]) => (
                <div key={code} className="space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-white/5 pb-1">
                    <span>{groupTitles[code]}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{list.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {list.map((r) => (
                      <div
                        key={r.person?.id}
                        onClick={() => onSelectPlayer(r.person?.id, r.person?.fullName)}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="w-6 text-center text-xs font-mono font-bold text-slate-400 group-hover:text-blue-400">
                            #{r.jerseyNumber || '—'}
                          </span>
                          <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                            {r.person?.fullName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 text-slate-400">
                            {r.position?.abbreviation}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};
