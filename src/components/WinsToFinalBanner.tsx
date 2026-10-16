import React from 'react';
import { Trophy, ArrowRight, Flame } from 'lucide-react';
import { MLB_TEAMS, getTeamLogoUrl } from '../services/mlbApi';

interface WinsToFinalBannerProps {
  favoriteTeamId: number | null;
  onOpenBracket?: () => void;
}

export const WinsToFinalBanner: React.FC<WinsToFinalBannerProps> = ({
  favoriteTeamId,
  onOpenBracket,
}) => {
  const team = MLB_TEAMS.find((t) => t.id === favoriteTeamId) || MLB_TEAMS[0];

  // In 2026:
  // Top 2 seeds with bye (7 wins to World Series final):
  // AL: Guardians (114), Rays (139)
  // NL: Dodgers (119), Brewers (158)
  const isTopSeedBye = [119, 114, 139, 158].includes(team.id);

  // Wild Card contenders in 2026 (9 wins to World Series final):
  const isWildCardTeam = [111, 147, 145, 117, 140, 112, 135, 143, 144, 109].includes(team.id);

  const winsNeeded = isTopSeedBye ? 7 : isWildCardTeam ? 9 : null;
  const primaryColor = team.color || '#3b82f6';
  const accentColor = team.accentColor || team.color || '#60a5fa';

  return (
    <div
      className="glass-shell glass-card"
      style={{
        padding: '1px',
        borderColor: `${primaryColor}40`,
        boxShadow: `0 0 35px ${primaryColor}20`,
      }}
    >
      <div
        className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)] relative overflow-hidden"
        style={{
          background: `radial-gradient(ellipse 600px 300px at 0% 0%, ${primaryColor}20 0%, rgba(15,18,26,0.92) 80%)`,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          
          {/* Left: Team & Status */}
          <div className="flex items-center gap-3.5">
            {/* Logo Double-Bezel */}
            <div
              className="glass-shell p-[1px] shrink-0"
              style={{
                borderRadius: '16px',
                borderColor: `${accentColor}50`,
                boxShadow: `0 0 20px ${accentColor}25`,
              }}
            >
              <div
                className="glass-core w-12 h-12 flex items-center justify-center p-2"
                style={{
                  borderRadius: '15px',
                  background: 'rgba(10, 13, 20, 0.9)',
                }}
              >
                <img
                  src={getTeamLogoUrl(team.id)}
                  alt={team.name}
                  className="w-full h-full object-contain filter drop-shadow"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="eyebrow"
                  style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#fcd34d',
                  }}
                >
                  <Flame className="w-2.5 h-2.5 text-amber-400" />
                  Плей-офф 2026
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {team.name}
                </span>
              </div>

              {winsNeeded ? (
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight tabular-nums">
                    {winsNeeded} ПОБЕД
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-400">
                    до финала Мировой Серии!
                  </span>
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-300">
                  Борьба за путёвку в плей-офф 2026
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                {isTopSeedBye ? (
                  <span>
                    Выход напрямую в Дивизионный раунд (Bye): <strong className="text-slate-200">3 победы</strong> в ALDS/NLDS + <strong className="text-slate-200">4 победы</strong> в Чемпионской серии
                  </span>
                ) : isWildCardTeam ? (
                  <span>
                    Путь через Wild Card: <strong className="text-slate-200">2 победы</strong> в WC + <strong className="text-slate-200">3 победы</strong> в серии дивизиона + <strong className="text-slate-200">4</strong> в финале лиги
                  </span>
                ) : (
                  <span>В решающем туре определяется путевка в зону Wild Card</span>
                )}
              </p>
            </div>
          </div>

          {/* Right: Nested Island CTA button with Button-in-Button arrow */}
          {onOpenBracket && (
            <div className="shrink-0 self-end md:self-auto">
              <button
                onClick={onOpenBracket}
                className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs font-bold text-white transition-all duration-300 active:scale-[0.98] shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}dd 0%, ${accentColor}cc 100%)`,
                  boxShadow: `0 8px 24px ${primaryColor}40, inset 0 1px 1px rgba(255,255,255,0.25)`,
                }}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Сетка турнира</span>
                {/* Nested trailing icon circle */}
                <div className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:scale-105">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
