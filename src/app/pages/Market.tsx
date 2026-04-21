import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Search, ArrowUpDown, ChevronDown, Star, Sparkles, Loader2, RefreshCw,
  TrendingDown, Lock, Tag, X, SlidersHorizontal
} from "lucide-react";
import { DealCard, Deal } from "../components/market/DealCard";
import { useAuth } from "../context/AuthContext";
import api from "../../lib/api";

// ── helpers ──────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "Deal Rating",  label: "Mejor valorados" },
  { value: "Savings",      label: "Mayor descuento" },
  { value: "Price",        label: "Más barato" },
  { value: "Release",      label: "Más recientes"  },
];

const PRICE_PRESETS = [
  { label: "Gratis",  min: "0", max: "0"   },
  { label: "< $5",   min: "0", max: "5"   },
  { label: "< $15",  min: "0", max: "15"  },
  { label: "< $30",  min: "0", max: "30"  },
  { label: "Todos",  min: "0", max: ""    },
];

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
  const [search,         setSearch]         = useState("");
  const [sortBy,         setSortBy]         = useState("Deal Rating");
  const [minPrice,       setMinPrice]       = useState("0");
  const [maxPrice,       setMaxPrice]       = useState("");
  const [showPriceDD,    setShowPriceDD]    = useState(false);
  const priceRef = useRef<HTMLDivElement>(null);

  // close dropdown on outside click
  useEffect(() => {
    if (!showPriceDD) return;
    const handler = (e: MouseEvent) => {
      if (priceRef.current && !priceRef.current.contains(e.target as Node))
        setShowPriceDD(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPriceDD]);

  // fetch deals
  const fetchDeals = useCallback(async (pg = 0, append = false) => {
    if (append) setIsLoadingMore(true); else setLoading(true);
    try {
      const params: Record<string, string | number> = {
        storeID:    "1",
        pageSize:   40,
        pageNumber: pg,
        sortBy,
        desc:       1,
      };

      const min = parseFloat(minPrice) || 0;
      const max = maxPrice === "" ? null : parseFloat(maxPrice);

      // Solo precio gratis puro (sin búsqueda de texto)
      if (max === 0 && min === 0 && !search.trim()) {
        params.upperPrice = 0;
        params.lowerPrice = 0;
        delete params.desc;
      } else {
        if (min > 0) params.lowerPrice = min;
        if (max !== null) params.upperPrice = max;
      }

      if (search.trim()) params.title = search.trim();

      const res = await axios.get("https://www.cheapshark.com/api/1.0/deals", { params });
      const data: Deal[] = res.data ?? [];
      setHasMore(data.length === 40);
      setDeals(prev => append ? [...prev, ...data] : data);
    } catch {
      setDeals([]);
    } finally {
      setLoading(false); setIsLoadingMore(false);
    }
  }, [search, sortBy, minPrice, maxPrice]);

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

  const priceLabel = (() => {
    const hasMin = parseFloat(minPrice) > 0;
    const hasMax = maxPrice !== "";
    if (!hasMin && !hasMax) return "Precio";
    if (!hasMin && maxPrice === "0") return "Gratis";
    if (hasMin && hasMax) return `$${minPrice}–$${maxPrice}`;
    if (hasMin) return `> $${minPrice}`;
    return `< $${maxPrice}`;
  })();

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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar juego..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={13}/>
              </button>
            )}
          </div>

          {/* price dropdown */}
          <div className="relative" ref={priceRef}>
            <button
              onClick={() => setShowPriceDD(p => !p)}
              className={`flex items-center gap-2 bg-slate-900 border rounded-lg px-3 py-2 text-sm text-slate-200 hover:border-blue-500 transition-colors min-w-[130px] ${
                (parseFloat(minPrice) > 0 || maxPrice !== "") ? "border-blue-500 text-blue-400" : "border-slate-700"
              }`}
            >
              <SlidersHorizontal size={14} className="text-slate-500"/>
              <span className="flex-1 text-left">{priceLabel}</span>
              <ChevronDown size={13} className={`text-slate-500 transition-transform ${showPriceDD ? "rotate-180" : ""}`}/>
            </button>
            {showPriceDD && (
              <div className="absolute mt-2 left-0 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 space-y-4 min-w-[220px]">
                {/* Presets rápidos */}
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">Acceso rápido</p>
                  <div className="grid grid-cols-2 gap-1">
                    {PRICE_PRESETS.map(p => {
                      const active = minPrice === p.min && maxPrice === p.max;
                      return (
                        <button
                          key={p.label}
                          onClick={() => { setMinPrice(p.min); setMaxPrice(p.max); setShowPriceDD(false); }}
                          className={`px-2 py-1.5 rounded-lg text-xs transition-colors ${
                            active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rango personalizado */}
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">Rango personalizado</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 block mb-1">Mín ($)</label>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={minPrice}
                        onChange={e => setMinPrice(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <span className="text-slate-500 text-sm pt-4">–</span>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 block mb-1">Máx ($)</label>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={maxPrice}
                        onChange={e => setMaxPrice(e.target.value)}
                        placeholder="∞"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Limpiar */}
                {(parseFloat(minPrice) > 0 || maxPrice !== "") && (
                  <button
                    onClick={() => { setMinPrice("0"); setMaxPrice(""); setShowPriceDD(false); }}
                    className="w-full text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 py-1"
                  >
                    <X size={11}/> Limpiar filtro de precio
                  </button>
                )}
              </div>
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

      </div>

      {/* ── Results header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingDown size={20} className="text-emerald-400"/>
          {search ? `Resultados para "${search}"` : "Todas las ofertas"}
          {!loading && <span className="text-sm font-normal text-slate-500"> · {deals.length} juegos</span>}
        </h2>
      </div>

      {/* ── Game grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl h-52 animate-pulse"/>
          ))}
        </div>
      ) : deals.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {deals.map(d => <DealCard key={d.dealID} deal={d}/>) }
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
      ) : (
        <div className="text-center py-20 text-slate-500">
          <Star size={40} className="mx-auto mb-4 text-slate-700"/>
          <p className="text-lg">No se encontraron ofertas.</p>
          <button
            onClick={() => { setSearch(""); setMinPrice("0"); setMaxPrice(""); }}
            className="text-blue-400 text-sm mt-2 hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
