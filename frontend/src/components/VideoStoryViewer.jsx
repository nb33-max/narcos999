import { useEffect, useRef, useState } from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { t } from '../lib/i18n';

export default function VideoStoryViewer({ video, title, onClose }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.play().catch(() => {}); }
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, video?.secure_url]);

  if (!video) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center anim-fade" onClick={onClose}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/15">
        <div key={video.secure_url} className="h-full bg-crimson origin-left" style={{ animation: 'storyProgress 30s linear forwards' }} />
      </div>

      <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-canvas flex items-center justify-center hover:bg-white/20 transition-colors z-10"><X size={20} /></button>

      {title && <p className="absolute top-5 left-0 right-0 text-center text-canvas text-sm font-serif px-16 truncate z-10">{title}</p>}

      <video
        ref={videoRef}
        src={video.secure_url}
        poster={video.poster_url}
        muted={muted}
        loop
        playsInline
        controls={false}
        autoPlay
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[80vh] w-auto h-auto object-contain"
      />

      <button
        onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
        aria-label="Toggle sound"
        className="absolute bottom-6 right-6 w-11 h-11 rounded-full bg-white/10 text-canvas flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      <p className="absolute bottom-6 left-0 right-0 text-center text-canvas/60 text-[11px] uppercase tracking-widest">{t('tap_to_close')}</p>
    </div>
  );
}
