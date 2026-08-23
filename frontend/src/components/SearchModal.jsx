import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { apiGet } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { useApp } from '../store/AppContext';
import { t } from '../lib/i18n';

const QUICK_TAGS = [
  { value: 'Static Hash', key: 'tag_static_hash' },
  { value: 'Freeze Sift', key: 'tag_freeze_sift' },
  { value: 'Top Shelf', key: 'tag_top_shelf' },
  { value: 'Hybrid', key: 'strain_hybrid' },
  { value: 'Indica', key: 'strain_indica' },
];

export default function SearchModal({ open, onClose }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { settings, trackEvent } = useApp();

  useEffect(() => {
    if (!open) { setQ(''); setResults([]); return; }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiGet('/products', { search: q, limit: 12 });
        setResults(res);
        trackEvent('search', { metadata: { q } });
      } catch { setResults([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, trackEvent]);

  if (!open) return null;

  const go = (slug) => {
    onClose();
    navigate(`/product/${slug}`);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm anim-fade flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-canvas rounded-2xl shadow-lift anim-slide-right overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-stone px-5 py-4">
          <Search size={18} className="text-moss" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search')}
            className="flex-1 bg-transparent outline-none text-sm text-pine placeholder-moss/60"
          />
          <button onClick={onClose} className="p-1 text-moss hover:text-crimson"><X size={18} /></button>
        </div>

        <div className="px-5 py-3 flex flex-wrap gap-2">
          {QUICK_TAGS.map((tag) => (
            <button key={tag.value} onClick={() => setQ(tag.value)} className="text-[11px] font-semibold uppercase tracking-wider border border-stone rounded-full px-3 py-1.5 text-moss hover:border-crimson hover:text-crimson transition-colors">
              {t(tag.key)}
            </button>
          ))}
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-5 pb-5">
          {loading && <p className="text-sm text-moss py-6 text-center">{t('searching')}</p>}
          {!loading && q && results.length === 0 && <p className="text-sm text-moss py-6 text-center">{t('no_results').replace('{q}', q)}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {results.map((p) => (
              <button key={p.id} onClick={() => go(p.slug)} className="flex items-center gap-3 bg-white border border-stone/70 rounded-xl p-2.5 text-left hover:border-crimson/40 hover:shadow-soft transition-all">
                <img src={p.media?.[0]?.media_type === 'video' ? p.media?.[0]?.poster_url : p.media?.[0]?.secure_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-subcard shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pine truncate">{p.name}</p>
                  <p className="text-[11px] text-moss uppercase tracking-wider">{p.category_name || t('product')}</p>
                  <p className="text-xs font-bold text-crimson mt-0.5">{p.price_on_request ? t('price_on_request') : formatCurrency(p.price, settings)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
