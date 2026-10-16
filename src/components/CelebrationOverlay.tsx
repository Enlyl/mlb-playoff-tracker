import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { sounds } from '../services/soundEffects';
import { Flame, Zap, X } from 'lucide-react';

export interface CelebrationData {
  type: 'homerun' | 'strikeout';
  title?: string;
  playerName?: string;
  teamName?: string;
  details?: string;
}

interface CelebrationOverlayProps {
  celebration: CelebrationData | null;
  onClose: () => void;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ celebration, onClose }) => {
  const [strikeStep, setStrikeStep] = useState(0);

  useEffect(() => {
    if (!celebration) {
      setStrikeStep(0);
      return;
    }

    if (celebration.type === 'homerun') {
      sounds.playHomeRunCelebration();

      // Dual confetti canon bursts
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 9999,
      };

      function fire(particleRatio: number, opts: confetti.Options) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        colors: ['#ef4444', '#facc15', '#3b82f6', '#10b981'],
      });
      fire(0.2, {
        spread: 60,
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    } else if (celebration.type === 'strikeout') {
      sounds.playStrikeout();

      // Rapid sequence of 3 strikes
      setStrikeStep(1);
      const t1 = setTimeout(() => setStrikeStep(2), 200);
      const t2 = setTimeout(() => {
        setStrikeStep(3);

        // Electric sparks / sparks burst for strikeout 3rd strike
        confetti({
          particleCount: 70,
          spread: 80,
          startVelocity: 45,
          origin: { y: 0.5 },
          zIndex: 9999,
          colors: ['#ef4444', '#ffffff', '#f87171', '#dc2626'],
          shapes: ['square'],
          ticks: 120,
          gravity: 1.1,
          scalar: 0.9,
        });

        // Lateral sparks
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          zIndex: 9999,
          colors: ['#ef4444', '#ffffff'],
        });
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          zIndex: 9999,
          colors: ['#ef4444', '#ffffff'],
        });
      }, 450);

      const cleanupTimer = () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };

      // Auto-dismiss after 3.8s
      const timer = setTimeout(() => {
        onClose();
      }, 3800);

      return () => {
        cleanupTimer();
        clearTimeout(timer);
      };
    }

    // Auto-dismiss after 3.8s for homerun
    const timer = setTimeout(() => {
      onClose();
    }, 3800);

    return () => clearTimeout(timer);
  }, [celebration, onClose]);

  if (!celebration) return null;

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer select-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-lg w-full text-center"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/[0.08] text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          {celebration.type === 'homerun' ? (
            /* ── HOME RUN CELEBRATION ── */
            <div
              className="glass-shell p-[1px]"
              style={{
                borderColor: 'rgba(245, 158, 11, 0.5)',
                boxShadow: '0 0 60px rgba(245, 158, 11, 0.25)',
              }}
            >
              <div
                className="glass-core p-8 rounded-[calc(1.5rem-1px)] relative overflow-hidden"
                style={{
                  background: 'radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.25) 0%, rgba(15, 18, 26, 0.95) 75%)',
                }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
                    boxShadow: '0 0 40px rgba(239, 68, 68, 0.5)',
                  }}
                >
                  <Flame className="w-11 h-11 fill-white text-white animate-pulse" />
                </motion.div>

                <div className="space-y-1.5">
                  <span className="eyebrow mx-auto" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d' }}>
                    ★ ЭПИЧЕСКИЙ МОМЕНТ ★
                  </span>
                  <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-red-400 to-amber-300 tracking-tight">
                    ХОУМ-РАН!
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    HOME RUN • МЯЧ НА ТРИБУНАХ
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.08]">
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {celebration.playerName || 'Баттер'}
                  </h3>
                  <p className="text-xs text-amber-300/90 font-medium mt-0.5">
                    {celebration.teamName || 'Команда'} • {celebration.details || 'Прямо на трибуны!'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* ── STRIKEOUT CELEBRATION WITH SHOCKWAVE & IMPACT "K" ── */
            <div
              className="glass-shell p-[1px]"
              style={{
                borderColor: 'rgba(239, 68, 68, 0.6)',
                boxShadow: '0 0 70px rgba(239, 68, 68, 0.3)',
              }}
            >
              <div
                className="glass-core p-8 rounded-[calc(1.5rem-1px)] relative overflow-hidden"
                style={{
                  background: 'radial-gradient(ellipse at 50% 0%, rgba(239, 68, 68, 0.28) 0%, rgba(15, 18, 26, 0.96) 75%)',
                }}
              >
                {/* Expanding shockwave ring */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0.8 }}
                  animate={{ scale: [0.5, 2.2], opacity: [0.8, 0] }}
                  transition={{ duration: 1.2, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.5 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-2 border-red-500/50 pointer-events-none"
                />

                {/* The iconic baseball Strikeout "K" slammed down with spring physics */}
                <div className="relative inline-block mb-4">
                  <motion.div
                    initial={{ scale: 3.5, opacity: 0, rotate: -25, y: -40 }}
                    animate={{ scale: 1, opacity: 1, rotate: 2, y: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 20,
                      delay: 0.05,
                    }}
                    className="inline-flex items-center justify-center w-24 h-24 rounded-2xl text-white font-black font-mono text-6xl shadow-2xl relative z-10"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                      boxShadow: '0 0 45px rgba(239, 68, 68, 0.6), inset 0 1px 1px rgba(255,255,255,0.3)',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    K
                  </motion.div>

                  {/* Pulsing lightning sparks behind K */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.9, 0.4] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="absolute -inset-3 rounded-2xl bg-red-600/30 filter blur-xl -z-0"
                  />
                </div>

                {/* 3 Strike lights sequence */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  {[1, 2, 3].map((num) => {
                    const isLit = strikeStep >= num;
                    return (
                      <motion.div
                        key={num}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: isLit ? [1, 1.3, 1] : 1 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold transition-all duration-200"
                        style={{
                          background: isLit ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                          borderColor: isLit ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                          color: isLit ? '#fca5a5' : '#64748b',
                          boxShadow: isLit ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none',
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: isLit ? '#ef4444' : '#475569',
                            boxShadow: isLit ? '0 0 8px #ef4444' : 'none',
                          }}
                        />
                        <span>СТРАЙК {num}</span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Main text */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className="eyebrow"
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#fca5a5',
                      }}
                    >
                      <Zap className="w-3 h-3 text-red-400" />
                      3 СТРАЙКА ПОДРЯД
                    </span>
                  </div>

                  <motion.h2
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="text-4xl sm:text-5xl font-black text-white tracking-tight"
                  >
                    СТРАЙКАУТ!
                  </motion.h2>

                  <p className="text-xs sm:text-sm font-bold text-red-300 uppercase tracking-widest">
                    STRIKEOUT • БАТТЕР В АУТЕ
                  </p>
                </div>

                {/* Player details */}
                <div className="mt-6 pt-4 border-t border-white/[0.08]">
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {celebration.playerName || 'Питчер'}
                  </h3>
                  <p className="text-xs text-red-300/90 font-medium mt-0.5">
                    {celebration.teamName || 'Команда защиты'} • {celebration.details || 'Подача мимо биты!'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
