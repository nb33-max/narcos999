import { useEffect, useMemo, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play, ExternalLink, Heart, MessageCircle } from 'lucide-react';
import { t } from '../lib/i18n';
import { apiPost } from '../lib/api';
import { getSessionId } from '../store/AppContext.jsx';

const SEEN_IDS_KEY = 'nb_stories_seen_ids';

function getSeenIds() {
  try { return JSON.parse(localStorage.getItem(SEEN_IDS_KEY) || '[]'); } catch { return []; }
}
function markStorySeen(id) {
  const seen = getSeenIds();
  if (!seen.includes(id)) {
    seen.push(id);
    localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(seen));
  }
}

const ADMIN_TG_URL = 'https://t.me/narcosbay';

export default function StoriesRail({ stories = [] }) {
  const [openIndex, setOpenIndex] = useState(null);
  const [popup, setPopup] = useState(false);
  const [seen, setSeen] = useState(getSeenIds());
  const [likes, setLikes] = useState({});

  const active = useMemo(() => stories.filter((s) => s.media_url), [stories]);
  const unseenCount = active.filter((s) => !seen.includes(s.id)).length;

  useEffect(() => {
    if (!active.length) return;
    if (unseenCount > 0) {
      const timer = setTimeout(() => setPopup(true), 800);
      return () => clearTimeout(timer);
    }
  }, [active, unseenCount]);

  useEffect(() => {
    const initial = {};
    active.forEach((s) => { initial[s.id] = { count: s.likes || 0, liked: Boolean(s.liked) }; });
    setLikes(initial);
  }, [active]);

  if (!active.length) return null;

  const open = (i) => {
    setPopup(false);
    const s = active[i];
    markStorySeen(s.id);
    setSeen(getSeenIds());
    setOpenIndex(i);
  };

  const toggleLike = useCallback(async (s) => {
    const cur = likes[s.id] || { count: 0, liked: false };
    const next = { count: cur.count + (cur.liked ? -1 : 1), liked: !cur.liked };
    setLikes((prev) => ({ ...prev, [s.id]: next }));
    try {
      const res = await apiPost(`/stories/${s.id}/like`, { liker_key: getSessionId() });
      setLikes((prev) => ({ ...prev, [s.id]: res }));
    } catch {
      setLikes((prev) => ({ ...prev, [s.id]: cur }));
    }
  }, [likes]);

  const cur = openIndex !== null ? active[openIndex] : null;
  const curLike = cur ? (likes[cur.id] || { count: cur.likes || 0, liked: false }) : { count: 0, liked: false };

  return (
    <>
      {/* Rail */}
      <section className="max-w-7xl mx-auto px-4 pt-8">
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">{t('stories_kicker')}</p>
          <span className="h-px flex-1 bg-stone/60" />
        </div>
        <div className="flex gap-5 overflow-x-auto py-2 scrollbar-none">
          {active.map((s, i) => {
            const isSeen = seen.includes(s.id);
            return (
              <button key={s.id} onClick={() => open(i)} className="group flex flex-col items-center gap-2 shrink-0 w-[88px]">
                <div className={`relative w-[84px] h-[84px] rounded-full p-[3px] transition-transform group-hover:scale-105 ${isSeen ? 'ring-1 ring-stone/50' : 'ring-2 ring-crimson'}`}>
                  {!isSeen && <span className="story-ring-load" aria-hidden="true" />}
                  <div className="w-full h-full rounded-full overflow-hidden bg-subcard ring-1 ring-canvas">
                    {s.media_type === 'video' ? (
                      <span className="w-full h-full flex flex-col items-center justify-center gap-1 bg-pine text-canvas">
                        <Play size={22} fill="currentColor" />
                        <span className="text-[8px] font-bold uppercase tracking-widest">{t('stories')}</span>
                      </span>
                    ) : (
                      <img src={s.media_url} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>
                  {(likes[s.id]?.count || 0) > 0 && (
                    <span className="absolute -bottom-1 -right-1 flex items-center gap-0.5 bg-white rounded-full px-1.5 py-0.5 shadow-soft text-[10px] font-bold text-crimson">
                      <Heart size={10} fill="currentColor" /> {likes[s.id]?.count}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-pine truncate w-full text-center">{s.title}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Popup notification */}
      {popup && unseenCount > 0 && (
        <div className="fixed top-24 right-4 z-50 w-[300px] bg-white rounded-2xl shadow-2xl border border-stone/60 overflow-hidden animate-slide-in">
          <button onClick={() => setPopup(false)} className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
            <X size={14} />
          </button>
          <button onClick={() => open(active.findIndex((s) => !seen.includes(s.id)))} className="w-full text-left flex gap-3 p-3 group">
            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-subcard">
              {active[0].media_type === 'video'
                ? <span className="w-full h-full flex items-center justify-center bg-pine text-canvas"><Play size={20} fill="currentColor" /></span>
                : <img src={active[0].media_url} alt={active[0].title} className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-crimson">{t('story_new_popup')}</p>
              <p className="text-sm font-bold text-pine truncate mt-1">{active[0].title}</p>
              <p className="text-[11px] text-moss mt-0.5 line-clamp-2">{active[0].caption || t('story_popup_body')}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-crimson mt-1.5">{t('stories_view_now')} <ExternalLink size={11} /></span>
            </div>
          </button>
        </div>
      )}

      {/* Fullscreen viewer */}
      {cur && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={() => setOpenIndex(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/25" onClick={() => setOpenIndex(null)}>
            <X size={20} />
          </button>
          <button
            className="absolute left-3 md:left-8 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/25 disabled:opacity-30"
            disabled={openIndex === 0}
            onClick={(e) => { e.stopPropagation(); setOpenIndex((openIndex - 1 + active.length) % active.length); }}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="max-w-2xl w-full mx-4 md:mx-10" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl overflow-hidden bg-black max-h-[66vh] flex items-center justify-center">
              {cur.media_type === 'video'
                ? <video src={cur.media_url} className="max-h-[66vh] w-full object-contain" controls autoPlay playsInline />
                : <img src={cur.media_url} alt={cur.title} className="max-h-[66vh] w-full object-contain" />}
            </div>
            <div className="mt-4 text-center">
              <h3 className="font-serif text-lg font-bold text-white">{cur.title}</h3>
              {cur.caption && <p className="text-sm text-white/70 mt-1">{cur.caption}</p>}
              <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                <button
                  onClick={() => toggleLike(cur)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${curLike.liked ? 'bg-crimson text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  <Heart size={14} fill={curLike.liked ? 'currentColor' : 'none'} /> {curLike.liked ? t('story_liked') : t('story_like')} {curLike.count > 0 && `· ${curLike.count}`}
                </button>
                <a
                  href={ADMIN_TG_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-canvas text-pine text-xs font-bold uppercase tracking-[0.14em] px-5 py-2.5 hover:bg-stone transition-colors"
                >
                  <MessageCircle size={13} /> {t('contact_admin')}
                </a>
                {cur.link_url && (
                  <a href={cur.link_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-white/10 text-white text-xs font-bold uppercase tracking-[0.14em] px-5 py-2.5 rounded-full hover:bg-white/20 transition-colors">
                    <ExternalLink size={13} /> {t('stories_view_now')}
                  </a>
                )}
              </div>
            </div>
          </div>
          <button
            className="absolute right-3 md:right-8 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/25 disabled:opacity-30"
            disabled={openIndex === active.length - 1}
            onClick={(e) => { e.stopPropagation(); setOpenIndex((openIndex + 1) % active.length); }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </>
  );
}
