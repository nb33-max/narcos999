import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, LayoutGrid, Grid3X3, X, ArrowUpDown, Loader2 } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import { useApp } from '../store/AppContext.jsx';
import { apiGet } from '../lib/api';
import { t } from '../lib/i18n';

const SORTS = [
  { value: 'Featured', key: 'sort_featured' },
  { value: 'Price: Low to High', key: 'sort_price_asc' },
  { value: 'Price: High to Low', key: 'sort_price_desc' },
  { value: 'Newest Arrivals', key: 'sort_newest' },
  { value: 'Highest Rated', key: 'sort_rating' },
];
const STRAINS = [
  { value: 'Hybrid', key: 'strain_hybrid' },
  { value: 'Indica', key: 'strain_indica' },
  { value: 'Sativa', key: 'strain_sativa' },
];

export default function ShopPage() {
  const [params, setParams] = useSearchParams();
  const { categories, settings } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [sort, setSort] = useState('Featured');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(400);
  const [strain, setStrain] = useState('');
  const [inStock, setInStock] = useState(false);

  const category = params.get('category') || '';
  const featured = params.get('featured') === 'true';
  const newArrival = params.get('new_arrival') === 'true';

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiGet('/products', {
          category: category || undefined,
          featured: featured || undefined,
          new_arrival: newArrival || undefined,
          search: search || undefined,
          max_price: maxPrice < 400 ? maxPrice : undefined,
          strain: strain || undefined,
          in_stock: inStock || undefined,
          sort,
        });
        setProducts(res);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [category, featured, newArrival, search, maxPrice, strain, inStock, sort]);

  const activeCat = categories.find((c) => c.slug === category);

  const headerTitle = useMemo(() => {
    if (featured) return t('featured');
    if (newArrival) return t('new_arrivals');
    return activeCat ? activeCat.name.toUpperCase() : t('shop_collection_title');
  }, [featured, newArrival, activeCat]);

  const activeSort = SORTS.find((s) => s.value === sort);

  return (
    <div>
      <div className="bg-subcard border-b border-stone">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson mb-2">{settings?.store_name || 'Narcos Bay'}</p>
          <h1 className="font-serif text-3xl md:text-5xl font-bold uppercase tracking-[0.08em]">{headerTitle}</h1>
          <p className="text-moss text-sm mt-2 max-w-xl">{t('shop_sub')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white border border-stone rounded-full px-4 py-2.5 flex-1 min-w-[220px] max-w-md">
            <Search size={15} className="text-moss" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} className="bg-transparent outline-none text-sm flex-1" />
            {search && <button onClick={() => setSearch('')} className="text-moss/60 hover:text-crimson"><X size={14} /></button>}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button onClick={() => { const p = new URLSearchParams(params); p.delete('category'); setParams(p, { replace: true }); }}
              className={`whitespace-nowrap text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-full transition-colors ${!category ? 'bg-pine text-canvas' : 'bg-white border border-stone text-moss hover:text-pine'}`}>
              {t('all_products')}
            </button>
            {categories.map((c) => (
              <button key={c.id}
                onClick={() => { const p = new URLSearchParams(params); p.set('category', c.slug); setParams(p, { replace: true }); }}
                className={`whitespace-nowrap text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-full transition-colors ${category === c.slug ? 'bg-pine text-canvas' : 'bg-white border border-stone text-moss hover:text-pine'}`}>
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <button className="flex items-center gap-1.5 bg-white border border-stone rounded-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-pine hover:border-crimson transition-colors">
                <ArrowUpDown size={13} /> {activeSort ? t(activeSort.key) : sort}
              </button>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{t(s.key)}</option>)}
              </select>
            </div>
            <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-1.5 bg-white border border-stone rounded-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-pine hover:border-crimson transition-colors">
              <SlidersHorizontal size={13} /> {t('filters')}
            </button>
            <div className="flex border border-stone rounded-full overflow-hidden bg-white">
              <button onClick={() => setView('grid')} className={`p-2.5 ${view === 'grid' ? 'bg-pine text-canvas' : 'text-moss'}`}><LayoutGrid size={15} /></button>
              <button onClick={() => setView('space')} className={`p-2.5 ${view === 'space' ? 'bg-pine text-canvas' : 'text-moss'}`}><Grid3X3 size={15} /></button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin text-moss" /></div>
        ) : view === 'grid' ? (
          products.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-moss uppercase tracking-widest text-sm font-semibold">{t('no_products_match')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )
        ) : (
          <div className="space-y-8">
            {categories.map((cat) => {
              const catProducts = products.filter((p) => p.category_id === cat.id);
              if (!catProducts.length) return null;
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-2xl font-bold uppercase tracking-[0.1em]">{cat.name}</h2>
                    <Link to={`/shop?category=${cat.slug}`} className="btn-ghost">{t('view_all')}</Link>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {catProducts.map((p) => <ProductCard key={p.id} product={p} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-xs anim-fade" onClick={() => setDrawerOpen(false)}>
          <div className="w-full max-w-sm bg-canvas h-full ml-auto shadow-lift flex flex-col anim-slide-right" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone">
              <h3 className="font-serif font-semibold uppercase tracking-[0.12em]">{t('refine_filters')}</h3>
              <button onClick={() => setDrawerOpen(false)} className="p-2 text-moss hover:text-crimson"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              <div>
                <label className="label">{t('max_price').replace('{price}', `€${maxPrice}`)}</label>
                <input type="range" min={10} max={400} step={10} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-crimson" />
              </div>
              <div>
                <label className="label">{t('strain_type')}</label>
                <div className="flex flex-wrap gap-2">
                  {STRAINS.map((s) => (
                    <button key={s.value} onClick={() => setStrain(strain === s.value ? '' : s.value)} className={`text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-colors ${strain === s.value ? 'bg-crimson text-canvas' : 'bg-white border border-stone text-moss hover:text-pine'}`}>
                      {t(s.key)}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="w-4 h-4 accent-crimson" />
                <span className="text-sm font-semibold text-pine">{t('in_stock_only')}</span>
              </label>
            </div>
            <div className="px-5 py-4 border-t border-stone flex gap-3">
              <button onClick={() => { setMaxPrice(400); setStrain(''); setInStock(false); }} className="btn-outline flex-1 !py-2.5 text-[10px]">{t('reset')}</button>
              <button onClick={() => setDrawerOpen(false)} className="btn-primary flex-1 !py-2.5 text-[10px]">{t('apply')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
