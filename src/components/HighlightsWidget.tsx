import React, { useState, useEffect } from 'react';
import {
  HighlightItem,
  getGameHighlights,
} from '../services/mlbApi';
import { Play, ExternalLink, Loader2, X, Film } from 'lucide-react';

interface HighlightsWidgetProps {
  gamePk: number | string;
}

export const HighlightsWidget: React.FC<HighlightsWidgetProps> = ({ gamePk }) => {
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<HighlightItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getGameHighlights(gamePk)
      .then((items) => {
        if (isMounted) setHighlights(items);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [gamePk]);

  const formatDuration = (d?: string) => {
    if (!d) return '';
    const parts = d.split(':').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return d;
    const [h, m, s] = parts;
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
  };

  const getDirectVideoSrc = (item: HighlightItem): string | null => {
    const pb = item.playbacks || [];
    const mp4Avc = pb.find((p) => p.name === 'mp4Avc' && p.url);
    if (mp4Avc?.url) return mp4Avc.url;
    const highBit = pb.find((p) => p.name === 'highBit' && p.url);
    if (highBit?.url) return highBit.url;
    const anyMp4 = pb.find((p) => /\.mp4(\?|$)/.test(p.url || ''));
    if (anyMp4?.url) return anyMp4.url;
    return null;
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
        <span className="text-xs text-slate-400">Поиск официальных видео-хайлайтов MLB…</span>
      </div>
    );
  }

  if (!highlights.length) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
        <Film className="w-8 h-8 text-slate-600 mx-auto" />
        <p>Для этой игры MLB пока не опубликовал видео-нарезки ключевых моментов.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
        <span>Ключевые видео-моменты ({highlights.length})</span>
        <span className="text-[11px] text-slate-500">HD клипы MLB.com</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {highlights.slice(0, 18).map((item, idx) => {
          const title = item.headline || item.title || 'Видео розыгрыша';
          const cuts = (item.image?.cuts || [])
            .filter((c) => c.aspectRatio === '16:9')
            .sort((a, b) => (a.width || 0) - (b.width || 0));
          const thumb = cuts.find((c) => (c.width || 0) >= 320) || cuts[cuts.length - 1];
          const imgUrl = thumb?.src || '';
          const dur = formatDuration(item.duration);

          return (
            <div
              key={idx}
              onClick={() => setActiveVideo(item)}
              role="button"
              tabIndex={0}
              className="group flex flex-col rounded-xl overflow-hidden border border-white/10 bg-slate-900/60 hover:border-blue-500/40 hover:bg-slate-800/80 transition-all cursor-pointer shadow-sm hover:shadow-md"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-slate-950 overflow-hidden">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <Play className="w-10 h-10 fill-current opacity-30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-blue-600/90 group-hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
                {dur && (
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-white backdrop-blur-xs">
                    {dur}
                  </span>
                )}
              </div>

              {/* Title */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-white line-clamp-2 leading-snug">
                  {title}
                </h4>
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Playback Modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden bg-slate-950 text-slate-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white truncate pr-4">
                {activeVideo.headline || activeVideo.title || 'Видео клип'}
              </h3>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {getDirectVideoSrc(activeVideo) ? (
                <video
                  src={getDirectVideoSrc(activeVideo)!}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-6 text-center space-y-3">
                  <p className="text-xs text-slate-400">
                    Прямой видеопоток недоступен для встроенного воспроизведения (ограничение вещателя).
                  </p>
                  <a
                    href={activeVideo.slug ? `https://www.mlb.com/video/${activeVideo.slug}` : 'https://www.mlb.com/video'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
                  >
                    <span>Смотреть на MLB.com</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Description & Link */}
            <div className="p-4 flex items-center justify-between gap-3 text-xs text-slate-400 border-t border-white/10">
              <p className="line-clamp-2 min-w-0">
                {activeVideo.description || activeVideo.blurb}
              </p>
              <a
                href={activeVideo.slug ? `https://www.mlb.com/video/${activeVideo.slug}` : 'https://www.mlb.com/video'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold shrink-0 hover:underline"
              >
                <span>MLB.com</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
