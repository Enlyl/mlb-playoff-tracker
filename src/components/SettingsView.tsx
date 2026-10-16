import React from 'react';
import {
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Star,
  Settings,
  Info,
  Heart,
  Sun,
  Moon,
  Palette,
} from 'lucide-react';
import { MLB_TEAMS, getTeamLogoUrl } from '../services/mlbApi';
import { sounds } from '../services/soundEffects';
import { notifications } from '../services/notifications';

interface SettingsViewProps {
  favoriteTeamId: number | null;
  setFavoriteTeamId: (id: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  favoriteTeamId,
  setFavoriteTeamId,
  isMuted,
  setIsMuted,
  notificationsEnabled,
  setNotificationsEnabled,
  theme,
  setTheme,
}) => {
  const favoriteTeam = MLB_TEAMS.find((t) => t.id === favoriteTeamId);

  const handleToggleSound = () => {
    const nextMuted = sounds.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) sounds.playBatCrack();
  };

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await notifications.requestPermission();
      setNotificationsEnabled(granted);
      if (granted) {
        notifications.sendNotification('⚾ Уведомления включены!', {
          body: 'Вы будете получать оповещения о начале матчей.',
        });
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      
      {/* ── HEADER BAR ── */}
      <div className="glass-shell glass-card" style={{ padding: '1px' }}>
        <div className="glass-core p-5 rounded-[calc(1.5rem-1px)] flex items-center gap-3.5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center border"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <Settings className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="eyebrow" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8' }}>
                Параметры
              </span>
            </div>
            <h2 className="text-display text-white" style={{ fontSize: '1.25rem' }}>
              Настройки приложения
            </h2>
          </div>
        </div>
      </div>

      {/* ── THEME SELECTION ── */}
      <section className="glass-shell glass-card" style={{ padding: '1px' }}>
        <div className="glass-core p-5 rounded-[calc(1.5rem-1px)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span>Тема оформления</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {theme === 'dark' ? 'Тёмный режим' : 'Светлый режим'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Dark theme button */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                theme === 'dark'
                  ? 'border-indigo-500/60 bg-indigo-500/15 ring-1 ring-indigo-500/30'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                  <Moon className="w-4 h-4 text-indigo-400" />
                </div>
                {theme === 'dark' && (
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Активно</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-bold text-white">Тёмная тема</span>
                <span className="text-[11px] text-slate-400">Глубокий киберспортивный стиль с акцентами</span>
              </div>
            </button>

            {/* Light theme button */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                theme === 'light'
                  ? 'border-amber-500/60 bg-amber-500/15 ring-1 ring-amber-500/30'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center">
                  <Sun className="w-4 h-4 text-amber-600" />
                </div>
                {theme === 'light' && (
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Активно</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-bold text-white">Светлая тема</span>
                <span className="text-[11px] text-slate-400">Чистый светлый интерфейс для дневного просмотра</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ── FAVORITE TEAM ── */}
      <section className="glass-shell glass-card" style={{ padding: '1px' }}>
        <div className="glass-core p-5 rounded-[calc(1.5rem-1px)] space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            Любимая команда
          </div>

          {/* Current team display */}
          {favoriteTeam && (
            <div
              className="flex items-center gap-3.5 px-4 py-3 rounded-2xl border transition-all"
              style={{
                borderColor: `${favoriteTeam.color || '#3b82f6'}50`,
                background: `radial-gradient(ellipse at 0% 50%, ${favoriteTeam.color || '#3b82f6'}20 0%, rgba(15,18,26,0.8) 100%)`,
                boxShadow: `0 0 25px ${favoriteTeam.color || '#3b82f6'}15`,
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] p-1.5 flex items-center justify-center shrink-0">
                <img
                  src={getTeamLogoUrl(favoriteTeam.id)}
                  alt={favoriteTeam.name}
                  className="w-full h-full object-contain filter drop-shadow"
                />
              </div>
              <div>
                <p className="font-bold text-white text-sm tracking-tight">{favoriteTeam.name}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Акцент оформления: <span style={{ color: favoriteTeam.accentColor }}>{favoriteTeam.color}</span>
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
            {MLB_TEAMS.map((team) => {
              const isSelected = team.id === favoriteTeamId;
              return (
                <button
                  key={team.id}
                  onClick={() => setFavoriteTeamId(team.id)}
                  className="flex items-center gap-2 p-2 rounded-xl border text-left text-[11px] font-semibold transition-all duration-200"
                  style={{
                    background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    borderColor: isSelected ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#fcd34d' : 'rgba(226, 232, 240, 0.8)',
                    boxShadow: isSelected ? '0 0 16px rgba(245, 158, 11, 0.15)' : 'none',
                  }}
                >
                  <img
                    src={getTeamLogoUrl(team.id)}
                    alt={team.name}
                    className="w-5 h-5 object-contain shrink-0"
                  />
                  <span className="truncate leading-tight">{team.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SOUND ── */}
      <section className="glass-shell glass-card" style={{ padding: '1px' }}>
        <div className="glass-core p-5 rounded-[calc(1.5rem-1px)] space-y-3">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            Звуковые эффекты
          </p>
          <p className="text-xs text-slate-400">
            Удар биты, страйкаут, хоум-ран фанфары — синтез Web Audio API в браузере.
          </p>
          <button
            onClick={handleToggleSound}
            className="flex items-center justify-between w-full px-4 py-3 rounded-2xl border transition-all duration-300"
            style={{
              background: isMuted ? 'rgba(255, 255, 255, 0.02)' : 'rgba(16, 185, 129, 0.08)',
              borderColor: isMuted ? 'rgba(255, 255, 255, 0.06)' : 'rgba(16, 185, 129, 0.3)',
              color: isMuted ? 'rgba(148, 163, 184, 0.7)' : '#6ee7b7',
            }}
          >
            <div className="flex items-center gap-2.5">
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-slate-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
              <span className="font-semibold text-xs sm:text-sm">
                {isMuted ? 'Звук выключен' : 'Звук включён'}
              </span>
            </div>
            {/* Toggle pill */}
            <div
              className="w-10 h-5 rounded-full transition-all relative"
              style={{ background: isMuted ? 'rgba(255,255,255,0.1)' : '#10b981' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                style={{ left: isMuted ? '2px' : '22px' }}
              />
            </div>
          </button>
        </div>
      </section>

      {/* ── PUSH NOTIFICATIONS ── */}
      <section className="glass-shell glass-card" style={{ padding: '1px' }}>
        <div className="glass-core p-5 rounded-[calc(1.5rem-1px)] space-y-3">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            {notificationsEnabled ? (
              <Bell className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <BellOff className="w-3.5 h-3.5 text-slate-500" />
            )}
            Push-уведомления
          </p>
          <p className="text-xs text-slate-400">
            Оповещения браузера о начале матчей и смене счёта любимой команды.
          </p>
          <button
            onClick={handleToggleNotifications}
            className="flex items-center justify-between w-full px-4 py-3 rounded-2xl border transition-all duration-300"
            style={{
              background: notificationsEnabled ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              borderColor: notificationsEnabled ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.06)',
              color: notificationsEnabled ? '#fcd34d' : 'rgba(148, 163, 184, 0.7)',
            }}
          >
            <div className="flex items-center gap-2.5">
              {notificationsEnabled ? (
                <Bell className="w-4 h-4 text-amber-400" />
              ) : (
                <BellOff className="w-4 h-4 text-slate-500" />
              )}
              <span className="font-semibold text-xs sm:text-sm">
                {notificationsEnabled ? 'Push-уведомления активны' : 'Push-уведомления выключены'}
              </span>
            </div>
            <div
              className="w-10 h-5 rounded-full transition-all relative"
              style={{ background: notificationsEnabled ? '#f59e0b' : 'rgba(255,255,255,0.1)' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                style={{ left: notificationsEnabled ? '22px' : '2px' }}
              />
            </div>
          </button>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="glass-shell" style={{ padding: '1px' }}>
        <div className="glass-core p-4 sm:p-5 rounded-[calc(1.5rem-1px)] space-y-1.5 text-xs text-slate-500 leading-relaxed">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
            <Info className="w-3.5 h-3.5" />
            О приложении
          </div>
          <p>
            MLB Live Hub — трекер матчей, плей-офф и интерактивный справочник правил бейсбола.
            Данные: <span className="text-slate-400 font-mono">statsapi.mlb.com</span>. Сезон 2026.
          </p>
          <p className="text-[11px] text-slate-600 flex items-center gap-1 pt-1">
            Сделано с <Heart className="w-3 h-3 text-red-500 inline" /> для любителей бейсбола
          </p>
        </div>
      </section>

    </div>
  );
};
