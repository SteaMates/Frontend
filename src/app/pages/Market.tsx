import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Search, ArrowUpDown, Star, Sparkles, Loader2, RefreshCw,
  TrendingDown, Lock, Tag, X, SlidersHorizontal, ExternalLink
} from "lucide-react";
import { DealCard, Deal } from "../components/market/DealCard";
import { useAuth } from "../context/AuthContext";
import api from "../../lib/api";

// ── helpers ──────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "Deal Rating",  label: "Más populares" },
  { value: "Savings",      label: "Mayor descuento" },
  { value: "Price",        label: "Más barato" },
  { value: "Release",      label: "Más recientes"  },
];

// Maps CheapShark sortBy values → Steam Store sort_by param (used in free-games mode)
const STEAM_SORT_MAP: Record<string, string> = {
  "Deal Rating": "Reviews_DESC",
  "Savings":     "Reviews_DESC",
  "Price":       "Price_ASC",
  "Release":     "Released_DESC",
};

// ── AI recommendations component ─────────────────────────────────────────────

interface RecommendedDeal extends Deal {
  reason?: string;
}

function AIRecommendations({ steamId }: { steamId: string }) {
  const [deals,    setDeals]   = useState<RecommendedDeal[]>([]);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState("");
  const ranRef = useRef(false);

  const fetchRecs = useCallback(async () => {
    if (!steamId) return;
    setLoading(true); setError(""); setDeals([]);
    try {
      const res = await api.post("/api/chat/market-recommendations", {
        steamId,
        limit: 6,
      });
      const found: RecommendedDeal[] = res.data?.deals ?? [];
      setDeals(found);
    } catch (e) {
      setError("No se pudieron cargar las recomendaciones.");
    } finally {
      setLoading(false);
    }
  }, [steamId]);

  useEffect(() => {
    if (!ranRef.current && steamId) { ranRef.current = true; fetchRecs(); }
  }, [steamId, fetchRecs]);

  if (!steamId) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles size={20} className="text-amber-400"/>
          Recomendado para ti
          <span className="text-[11px] font-normal text-[#62748e] bg-[#1d293d] px-2 py-0.5 rounded-full">IA</span>
        </h2>
        {!loading && (
          <button
            onClick={() => { ranRef.current = false; fetchRecs(); }}
            className="flex items-center gap-1.5 text-[12px] text-[#62748e] hover:text-white transition-colors"
          >
            <RefreshCw size={13}/> Refrescar
          </button>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl h-52 animate-pulse"/>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4">{error}</p>
      )}

      {!loading && deals.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {deals.map(deal => (
            <div key={deal.dealID} className="relative group">
              <DealCard deal={deal}/>
              {deal.reason && (
                <div className="absolute top-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-slate-950/90 backdrop-blur rounded-lg px-2 py-1.5 text-[10px] text-slate-200 leading-tight">
                    {deal.reason}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── locked recommendations placeholder ───────────────────────────────────────

function LockedRecs({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/50">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 p-6 blur-sm opacity-40 pointer-events-none select-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-slate-800 rounded-xl h-52"/>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
        <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl text-center max-w-sm mx-4 shadow-2xl">
          <div className="w-14 h-14 bg-blue-900/30 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={26} className="text-blue-400"/>
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Recomendaciones personalizadas</h3>
          <p className="text-slate-400 text-sm mb-5">
            Conecta Steam y nuestra IA analizará tu biblioteca para encontrar las mejores ofertas según tus gustos.
          </p>
          <button
            onClick={onLogin}
            className="bg-[#171a21] hover:bg-[#2a475e] text-[#c5c3c0] hover:text-white font-bold py-2.5 px-5 rounded-xl transition-all border border-[#2a475e] text-sm flex items-center gap-2 mx-auto"
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" alt="" className="w-4 h-4"/>
            Iniciar sesión con Steam
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Steam fallback card ──────────────────────────────────────────────────────

interface SteamGame {
  id: string;
  title: string;
  price: string;
  isFree: boolean;
  image: string;
  steamAppID: string;
}

function SteamGameCard({ game }: { game: SteamGame }) {
  return (
    <a
      href={`https://store.steampowered.com/app/${game.steamAppID}/`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 flex flex-col h-full text-sm"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-800">
        <img
          src={game.image}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            if (!t.dataset.fb) { t.dataset.fb = "1"; t.src = `https://placehold.co/460x215/1e293b/94a3b8?text=${encodeURIComponent(game.title[0] ?? "?")}`;}
          }}
        />
        <div className="absolute top-1.5 left-1.5 bg-[#171a21]/90 backdrop-blur text-[#c5c3c0] text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
          <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" className="w-2.5 h-2.5" alt=""/> Steam
        </div>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-slate-100 line-clamp-1 mb-2 text-sm hover:text-blue-400 transition-colors" title={game.title}>
          {game.title}
        </h3>
        <div className="mt-auto flex items-center justify-between">
          <span className={`text-base font-bold ${game.isFree ? "text-emerald-400" : "text-slate-200"}`}>
            {game.price}
          </span>
          <div className="p-1.5 bg-[#171a21] hover:bg-[#2a475e] text-[#c5c3c0] rounded-md transition-colors">
            <ExternalLink size={14}/>
          </div>
        </div>
      </div>
    </a>
  );
}

// ── main Market component ─────────────────────────────────────────────────────

export function Market() {
  const { user, login } = useAuth();

  // deals state
  const [deals,          setDeals]          = useState<Deal[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [isLoadingMore,  setIsLoadingMore]  = useState(false);
  const [page,           setPage]           = useState(0);
  const [hasMore,        setHasMore]        = useState(true);

  // filters
  const [search,   setSearch]   = useState("");
  const [sortBy,   setSortBy]   = useState("Deal Rating");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // steam fallback (when CheapShark has 0 deals for a search term)
  const [steamGames,   setSteamGames]   = useState<SteamGame[]>([]);
  const [steamLoading, setSteamLoading] = useState(false);

  // steam fallback search via existing backend endpoint (returns only type=game)
  const fetchSteamFallback = useCallback(async (term: string) => {
    setSteamLoading(true);
    setSteamGames([]);
    try {
      const res = await api.get(`/api/steam/search?term=${encodeURIComponent(term)}`);
      const mapped: SteamGame[] = (res.data ?? []).map((item: any) => {
        const appId = item.appId?.toString() ?? "";
        // Backend now sends isFree (boolean) and price (number in dollars)
        const isFree = item.isFree === true || item.price === 0;
        const price = isFree ? "Gratis" : `$${Number(item.price).toFixed(2)}`;
        return {
          id: appId || item.name,
          title: item.name,
          price,
          isFree,
          image: appId
            ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
            : `https://placehold.co/460x215/1e293b/94a3b8?text=${encodeURIComponent(item.name?.[0] ?? "?")}`,
          steamAppID: appId,
        };
      });
      setSteamGames(mapped);
    } catch {
      setSteamGames([]);
    } finally {
      setSteamLoading(false);
    }
  }, []);

  // tags filtering
  const [tagMap, setTagMap] = useState<Record<string, string[]>>({});
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<{name: string, count: number}[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  // Derive visible games and appIds
  const currentItems = isFreeMode || (!search && sortBy === "Deal Rating") || (deals.length === 0 && search) ? steamGames : deals;
  const currentAppIds = currentItems.map(item => {
    if ('steamAppID' in item) return item.steamAppID;
    return item.steamAppID;
  }).filter(Boolean);

  // Fetch tags for current items
  useEffect(() => {
    if (currentAppIds.length === 0) return;
    
    // Check if we need to fetch new ones
    const missing = currentAppIds.filter(id => !tagMap[id]);
    if (missing.length === 0) {
      // Recompute available tags
      const counts: Record<string, number> = {};
      currentAppIds.forEach(id => {
        (tagMap[id] || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; });
      });
      const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => ({name, count}));
      setAvailableTags(sorted);
      return;
    }

    setTagsLoading(true);
    api.get(`/api/steam/tags?appIds=${missing.join(',')}`).then(res => {
      const data = res.data || {};
      setTagMap(prev => {
        const next = {...prev, ...data};
        // Recompute available tags
        const counts: Record<string, number> = {};
        currentAppIds.forEach(id => {
          (next[id] || []).forEach((t: string) => { counts[t] = (counts[t] || 0) + 1; });
        });
        const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => ({name, count}));
        setAvailableTags(sorted);
        return next;
      });
    }).finally(() => {
      setTagsLoading(false);
    });
  }, [currentAppIds.join(',')]); // run when appIds change

  // Apply tag filters locally
  const filteredDeals = deals.filter(d => {
    if (activeTags.length === 0) return true;
    const tags = tagMap[d.steamAppID] || [];
    return activeTags.every(t => tags.includes(t));
  });

  const filteredSteamGames = steamGames.filter(g => {
    if (activeTags.length === 0) return true;
    const tags = tagMap[g.steamAppID] || [];
    return activeTags.every(t => tags.includes(t));
  });

  const toggleTag = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // fetch deals — also handles "free games" and "popular paid" browse modes via Steam
  const fetchDeals = useCallback(async (pg = 0, append = false) => {
    const searchTerm  = search.trim();
    const isFreeMode  = maxPrice === "0" && minPrice === "" && !searchTerm;
    const isPopularMode = !searchTerm && sortBy === "Deal Rating";

    if (append) setIsLoadingMore(true); else setLoading(true);
    if (!append) { setSteamGames([]); setSteamLoading(false); }

    // ── STEAM MODES (Free or Popular) ────────────────────────────
    if (isFreeMode || isPopularMode) {
      try {
        const steamSort = STEAM_SORT_MAP[sortBy] ?? "Reviews_DESC";
        const endpoint = isFreeMode ? "/api/steam/free-games" : "/api/steam/popular-paid";
        const res = await api.get(`${endpoint}?sort=${steamSort}&page=${pg}`);
        const { games: raw = [], hasMore: more = false } = res.data ?? {};
        const mapped: SteamGame[] = raw.map((item: any) => ({
          id:        item.appId || item.name,
          title:     item.name,
          price:     "Gratis",
          isFree:    true,
          image:     item.appId
            ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.appId}/header.jpg`
            : item.tinyImage ?? `https://placehold.co/460x215/1e293b/94a3b8?text=?`,
          steamAppID: item.appId ?? "",
        }));
        setSteamGames(prev => append ? [...prev, ...mapped] : mapped);
        setHasMore(more);
        setDeals([]);
      } catch {
        setSteamGames([]);
      } finally {
        setLoading(false); setIsLoadingMore(false);
      }
      return;  // skip CheapShark entirely
    }

    // ── REGULAR MODE: CheapShark ──────────────────────────────────────────
    try {
      const params: Record<string, string | number> = {
        storeID:    "1",
        pageSize:   40,
        pageNumber: pg,
        sortBy,
      };
      
      // Fix bug: Cheapshark Price sort ascending gives cheapest first. 
      // Do not add desc: 1 for Price.
      if (sortBy !== "Price") {
        params.desc = 1;
      }

      if (searchTerm) {
        // No price filters when searching by title so free games aren't excluded
        params.title = searchTerm;
      } else {
        // Price filters only in browse mode
        const min = minPrice !== "" ? parseFloat(minPrice) : null;
        const max = maxPrice !== "" ? parseFloat(maxPrice) : null;
        if (min !== null && min === 0 && max !== null && max === 0) {
          params.upperPrice = 0; params.lowerPrice = 0; delete params.desc;
        } else {
          if (min !== null && min > 0) params.lowerPrice = min;
          if (max !== null)            params.upperPrice = max;
        }
      }

      const res = await axios.get("https://www.cheapshark.com/api/1.0/deals", { params });
      const data: Deal[] = res.data ?? [];
      setHasMore(data.length === 40);
      setDeals(prev => append ? [...prev, ...data] : data);

      // If CheapShark found nothing for a text search → try Steam fallback
      if (data.length === 0 && searchTerm && !append) {
        fetchSteamFallback(searchTerm);
      }
    } catch {
      setDeals([]);
      if (search.trim()) fetchSteamFallback(search.trim());
    } finally {
      setLoading(false); setIsLoadingMore(false);
    }
  }, [search, sortBy, minPrice, maxPrice, fetchSteamFallback]);

  // re-fetch on filter change (debounced for search)
  useEffect(() => {
    setPage(0);
    const id = setTimeout(() => fetchDeals(0, false), search ? 400 : 0);
    return () => clearTimeout(id);
  }, [search, sortBy, minPrice, maxPrice]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchDeals(next, true);
  };

  const hasPriceFilter = minPrice !== "" || maxPrice !== "";
  const isFreeMode     = maxPrice === "0" && minPrice === "" && !search.trim();
  const isPopularMode  = !search.trim() && sortBy === "Deal Rating";

  return (
    <div className="space-y-10 pb-20">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold text-white">Mercado</h1>
        <p className="text-slate-400 text-sm mt-1">
          Mejores ofertas de Steam · actualizadas en tiempo real
        </p>
      </div>

      {/* ── AI recommendations ── */}
      {user ? (
        <AIRecommendations steamId={user.steamid}/>
      ) : (
        <LockedRecs onLogin={login}/>
      )}

      {/* ── separator ── */}
      <div className="border-t border-slate-800"/>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">

          {/* search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar juego..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-9 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={13}/>
              </button>
            )}
          </div>

          {/* ── price range: always-visible inline inputs ── */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-slate-500 shrink-0"/>
            <span className="text-slate-500 text-xs hidden sm:block">Precio:</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none select-none">$</span>
              <input
                type="number"
                min="0"
                max="9999"
                step="0.01"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                placeholder="Mín"
                className="w-[76px] bg-slate-900 border border-slate-700 rounded-lg pl-5 pr-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <span className="text-slate-500 text-sm select-none">–</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none select-none">$</span>
              <input
                type="number"
                min="0"
                max="9999"
                step="0.01"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                placeholder="Máx"
                className="w-[76px] bg-slate-900 border border-slate-700 rounded-lg pl-5 pr-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {hasPriceFilter && (
              <button
                onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                className="text-slate-500 hover:text-white transition-colors"
                title="Limpiar precio"
              >
                <X size={14}/>
              </button>
            )}
          </div>

          {/* sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ArrowUpDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
          </div>
        </div>

        {/* active filter pills */}
        {(search || hasPriceFilter) && (
          <div className="flex items-center gap-2 flex-wrap">
            {search && (
              <span className="flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs px-2.5 py-1 rounded-full">
                <Search size={10}/> "{search}"
                <button onClick={() => setSearch("")} className="hover:text-white ml-0.5"><X size={10}/></button>
              </span>
            )}
            {hasPriceFilter && (
              <span className="flex items-center gap-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs px-2.5 py-1 rounded-full">
                <Tag size={10}/>
                {minPrice && maxPrice
                  ? `$${minPrice} – $${maxPrice}`
                  : minPrice
                  ? `> $${minPrice}`
                  : `< $${maxPrice}`}
                <button onClick={() => { setMinPrice(""); setMaxPrice(""); }} className="hover:text-white ml-0.5"><X size={10}/></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Results header ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingDown size={20} className="text-emerald-400"/>
            {isFreeMode ? "Juegos gratuitos en Steam" : isPopularMode ? "Juegos Populares" : search ? `Resultados para "${search}"` : "Todas las ofertas"}
            {!loading && !steamLoading && (
              <span className="text-sm font-normal text-slate-500">
                · {currentItems.length} juegos
                {(isFreeMode || isPopularMode || (deals.length === 0 && steamGames.length > 0)) && (
                  <span className="ml-1 text-[10px] text-[#62748e] bg-[#1d293d] px-2 py-0.5 rounded-full align-middle">Steam Store</span>
                )}
              </span>
            )}
          </h2>
        </div>

        {/* ── Dynamic Tags Filter ── */}
        {(availableTags.length > 0 || tagsLoading) && !loading && !steamLoading && (
          <div className="flex flex-wrap gap-2 items-center bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Tag size={12}/> Filtros rápidos
              {tagsLoading && <Loader2 size={10} className="animate-spin text-blue-400"/>}
            </span>
            <div className="w-px h-4 bg-slate-700 mx-1"/>
            {availableTags.map(({name, count}) => {
              const isActive = activeTags.includes(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleTag(name)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-all border flex items-center gap-1.5
                    ${isActive 
                      ? "bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.1)]" 
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"}`}
                >
                  {name} <span className="opacity-50 text-[10px]">{count}</span>
                </button>
              );
            })}
            {activeTags.length > 0 && (
              <button 
                onClick={() => setActiveTags([])}
                className="text-[11px] text-slate-400 hover:text-white ml-auto flex items-center gap-1"
              >
                Limpiar <X size={10}/>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Game grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl h-52 animate-pulse"/>
          ))}
        </div>
      ) : filteredDeals.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredDeals.map(d => <DealCard key={d.dealID} deal={d}/>)}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isLoadingMore ? <><Loader2 size={15} className="animate-spin"/> Cargando...</> : "Cargar más"}
              </button>
            </div>
          )}
        </>
      ) : steamLoading ? (
        // Steam loading skeleton (fallback or free-games mode)
        <div className="space-y-3">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin"/>
            {isFreeMode || isPopularMode ? "Cargando juegos de Steam..." : "Sin deals en CheapShark · buscando en Steam Store..."}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl h-48 animate-pulse"/>
            ))}
          </div>
        </div>
      ) : filteredSteamGames.length > 0 ? (
        // Steam Store results (free-games mode, popular mode or text-search fallback)
        <div className="space-y-3">
          {!isFreeMode && !isPopularMode && (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" className="w-3 h-3" alt=""/>
              Sin ofertas activas en CheapShark · mostrando resultados de Steam Store
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredSteamGames.map(g => <SteamGameCard key={g.id} game={g}/>)}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isLoadingMore ? <><Loader2 size={15} className="animate-spin"/> Cargando...</> : "Cargar más"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-500">
          <Star size={40} className="mx-auto mb-4 text-slate-700"/>
          <p className="text-lg">No se encontraron resultados.</p>
          <button
            onClick={() => { setSearch(""); setMinPrice(""); setMaxPrice(""); }}
            className="text-blue-400 text-sm mt-3 hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
