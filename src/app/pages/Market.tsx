/**
 * Nombre del fichero: Market.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router";
import {
  Search, ArrowUpDown, Star, Sparkles, Loader2, RefreshCw,
  TrendingDown, Lock, Tag, X, SlidersHorizontal, ExternalLink
} from "lucide-react";
import { DealCard, Deal } from "../components/market/DealCard";
import { useAuth } from "../context/AuthContext";
import api from "../../lib/api";

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Función: useDraggableScroll
 * Descripción: Hook personalizado de React que abstrae y gestiona la lógica relacionada con
 * draggable scroll. Este hook maneja los efectos secundarios, centraliza el
 * estado necesario y expone las propiedades y métodos esenciales para los
 * componentes que lo consuman.
 */
const DRAG_THRESHOLD = 5; // px de movimiento mínimo para activar el scroll

function useDraggableScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isMouseDown = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const stopDrag = () => {
    isMouseDown.current = false;
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const events = {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      isMouseDown.current = true;
      if (ref.current) {
        startXRef.current = e.pageX - ref.current.offsetLeft;
        scrollLeftRef.current = ref.current.scrollLeft;
      }
    },
    onMouseLeave: stopDrag,
    onMouseUp: stopDrag,
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isMouseDown.current || !ref.current) return;
      const x = e.pageX - ref.current.offsetLeft;
      const walk = x - startXRef.current;

      // Solo activar drag si el movimiento supera el umbral
      if (!isDragging && Math.abs(walk) <= DRAG_THRESHOLD) return;

      if (!isDragging) {
        // Resetear el punto de inicio al momento exacto en que se cruza el umbral
        // para evitar el salto inicial
        startXRef.current = x;
        scrollLeftRef.current = ref.current.scrollLeft;
        setIsDragging(true);
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        return;
      }

      e.preventDefault();
      ref.current.scrollLeft = scrollLeftRef.current - (x - startXRef.current) * 1.5;
    },
  };

  return { ref, events, isDragging };
}

const SORT_OPTIONS = [
  { value: "Popular", label: "Más populares" },
  { value: "Savings", label: "Mayor descuento" },
  { value: "Free", label: "Gratis" },
];

const STEAM_SORT_MAP: Record<string, string> = {
  "Popular": "_ASC",
  "Savings": "Reviews_DESC",
  "Free": "_ASC",
};

export const GLOBAL_TAGS = [
  { id: "19", name: "Acción" },
  { id: "21", name: "Aventura" },
  { id: "122", name: "RPG" },
  { id: "9", name: "Estrategia" },
  { id: "599", name: "Simulación" },
  { id: "701", name: "Deportes" },
  { id: "699", name: "Carreras" },
  { id: "492", name: "Indie" },
  { id: "128", name: "MMO" },
  { id: "597", name: "Casual" },
  { id: "1663", name: "FPS" },
  { id: "3859", name: "Mundo Abierto" },
  { id: "3871", name: "2D" },
  { id: "4182", name: "Un Jugador" },
  { id: "3843", name: "Multijugador" },
  { id: "1664", name: "Puzles" },
  { id: "1667", name: "Terror" },
  { id: "1625", name: "Plataformas" },
  { id: "1742", name: "Buena Trama" },
  { id: "1695", name: "Ciencia Ficción" },
  { id: "7332", name: "Simulador de ciudades" },
  { id: "1662", name: "Rogue-like" },
  { id: "1756", name: "Gran banda sonora" },
  { id: "1774", name: "Shooter" },
  { id: "1654", name: "Supervivencia" },
  { id: "4166", name: "Atmósferico" },
];

// ── AI recommendations component ─────────────────────────────────────────────

interface RecommendedDeal extends Deal {
  reason?: string;
}

/**
 * Función: AIRecommendations
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * AIRecommendations. Este elemento encapsula la lógica de presentación,
 * gestiona su propio estado interno y coordina la renderización de sus
 * componentes hijos según los datos recibidos.
 */
const AI_RECS_CACHE_KEY = "steamates_ai_recs_cache";
const AI_RECS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos (igual al límite del backend)

function AIRecommendations({ steamId }: { steamId: string }) {
  const [deals, setDeals] = useState<RecommendedDeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ranRef = useRef(false);
  const { ref: scrollRef, events: scrollEvents, isDragging } = useDraggableScroll();

  const fetchRecs = useCallback(async (forceRefresh = false) => {
    if (!steamId) return;

    // Intentar usar caché si no es un refresco forzado
    if (!forceRefresh) {
      try {
        const raw = sessionStorage.getItem(AI_RECS_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached.steamId === steamId && Date.now() - cached.timestamp < AI_RECS_CACHE_TTL) {
            setDeals(cached.deals);
            return;
          }
        }
      } catch { /* ignorar */ }
    }

    setLoading(true); setError(""); setDeals([]);
    try {
      const res = await api.post("/api/chat/market-recommendations", {
        steamId,
        limit: 12,
      });
      const found: RecommendedDeal[] = res.data?.deals ?? [];
      setDeals(found);
      try {
        sessionStorage.setItem(AI_RECS_CACHE_KEY, JSON.stringify({
          steamId,
          deals: found,
          timestamp: Date.now(),
        }));
      } catch { /* quota exceeded — ignorar */ }
    } catch (e: any) {
      const msg = e.response?.data?.error || "No se pudieron cargar las recomendaciones.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [steamId]);

  useEffect(() => {
    if (!ranRef.current && steamId) { ranRef.current = true; fetchRecs(false); }
  }, [steamId, fetchRecs]);

  if (!steamId) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles size={20} className="text-amber-400" />
          Recomendado para ti
          <span className="text-[11px] font-normal text-[#62748e] bg-[#1d293d] px-2 py-0.5 rounded-full">IA</span>
        </h2>
        {!loading && (
          <button
            onClick={() => {
              sessionStorage.removeItem(AI_RECS_CACHE_KEY);
              ranRef.current = false;
              fetchRecs(true);
            }}
            className="flex items-center gap-1.5 text-[12px] text-[#62748e] hover:text-white transition-colors"
          >
            <RefreshCw size={13} /> Refrescar
          </button>
        )}
      </div>

      {loading && (
        <div
          ref={scrollRef}
          {...scrollEvents}
          className={`flex overflow-x-auto pb-4 -mx-4 px-4 gap-4 cursor-grab custom-scrollbar ${isDragging ? "cursor-grabbing" : ""}`}

        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[240px] bg-slate-900 border border-slate-800 rounded-xl h-52 animate-pulse pointer-events-none" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4">{error}</p>
      )}

      {!loading && !error && deals.length === 0 && (
        <p className="text-sm text-slate-500 bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
          No se encontraron recomendaciones personalizadas. Tu perfil de Steam puede estar privado o aún no tienes suficientes juegos.
        </p>
      )}

      {!loading && deals.length > 0 && (
        <div
          ref={scrollRef}
          {...scrollEvents}
          className={`flex overflow-x-auto pb-4 -mx-4 px-4 gap-4 cursor-grab custom-scrollbar ${isDragging ? "cursor-grabbing" : ""}`}

        >
          {deals.map(deal => (
            <div key={deal.dealID} className={`flex-shrink-0 w-[240px] relative group ${isDragging ? "pointer-events-none" : ""}`}>
              <DealCard deal={deal} />
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

/**
 * Función: LockedRecs
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * LockedRecs. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
function LockedRecs({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/50">
      <div className="flex overflow-x-hidden gap-4 p-6 blur-sm opacity-40 pointer-events-none select-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[240px] bg-slate-800 rounded-xl h-52" />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
        <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl text-center max-w-sm mx-4 shadow-2xl">
          <div className="w-14 h-14 bg-blue-900/30 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={26} className="text-blue-400" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Recomendaciones personalizadas</h3>
          <p className="text-slate-400 text-sm mb-5">
            Conecta Steam y nuestra IA analizará tu biblioteca para encontrar las mejores ofertas según tus gustos.
          </p>
          <button
            onClick={onLogin}
            className="bg-[#171a21] hover:bg-[#2a475e] text-[#c5c3c0] hover:text-white font-bold py-2.5 px-5 rounded-xl transition-all border border-[#2a475e] text-sm flex items-center gap-2 mx-auto cursor-pointer"
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" alt="" className="w-4 h-4" />
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
  originalPrice?: string;
  discountPct?: number;
  isFree: boolean;
  image: string;
  steamAppID: string;
}

/**
 * Función: SteamGameCard
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * SteamGameCard. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
function SteamGameCard({ game }: { game: SteamGame }) {
  const saleP = game.price === "Gratis" ? "0.00" : game.price.replace("$", "");
  const normP = game.originalPrice
    ? game.originalPrice.replace("$", "")
    : saleP;

  const synthesizedDeal = {
    title: game.title,
    steamAppID: game.steamAppID,
    thumb: game.image,
    salePrice: saleP,
    normalPrice: normP,
    savings: game.discountPct ? game.discountPct.toString() : "0",
    dealID: "",
    gameID: "",
    storeID: "1"
  };

  const detailPath = `/game/${game.steamAppID || game.id}`;

  return (
    <div className="group relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 flex flex-col h-full text-sm">
      <Link
        to={detailPath}
        state={{ deal: synthesizedDeal }}
        className="block relative aspect-video overflow-hidden bg-slate-800"
      >
        <img
          src={game.image}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-slate-800"
          loading="lazy"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            if (!t.dataset.fb) { t.dataset.fb = "1"; t.src = `https://placehold.co/460x215/1e293b/94a3b8?text=${encodeURIComponent(game.title[0] ?? "?")}`; }
          }}
        />
        <div className="absolute top-1.5 left-1.5 bg-[#171a21]/90 backdrop-blur text-[#c5c3c0] text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-lg">
          <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" className="w-2.5 h-2.5" alt="" /> Steam
        </div>
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <Link to={detailPath} state={{ deal: synthesizedDeal }}>
          <h3
            className="font-semibold text-slate-100 line-clamp-1 mb-1 hover:text-blue-400 transition-colors text-sm"
            title={game.title}
          >
            {game.title}
          </h3>
        </Link>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex flex-col">
            {(game.discountPct || 0) > 0 && game.originalPrice && (
              <span className="text-[10px] line-through text-slate-500 font-medium">
                {game.originalPrice}
              </span>
            )}
            <span
              className={`text-base font-bold ${game.isFree ? "text-emerald-400" : "text-slate-200"}`}
            >
              {game.price}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(game.discountPct || 0) > 0 && (
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                -{game.discountPct}%
              </span>
            )}
            <a
              href={`https://store.steampowered.com/app/${game.steamAppID}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-[#171a21] hover:bg-[#2a475e] text-[#c5c3c0] rounded-md transition-colors z-10"
              title="Ver en Steam"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── main Market component ─────────────────────────────────────────────────────

/**
 * Función: Market
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * Market. Este elemento encapsula la lógica de presentación, gestiona su propio
 * estado interno y coordina la renderización de sus componentes hijos según los
 * datos recibidos.
 */
export function Market() {
  const { user, login } = useAuth();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("Popular");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [steamGames, setSteamGames] = useState<SteamGame[]>([]);
  const [steamLoading, setSteamLoading] = useState(false);

  const { ref: categoriesScrollRef, events: categoriesScrollEvents, isDragging: isCategoriesDragging } = useDraggableScroll();

  const fetchSteamFallback = useCallback(async (term: string) => {
    setSteamLoading(true);
    setSteamGames([]);
    try {
      const res = await api.get(`/api/steam/search?term=${encodeURIComponent(term)}`);
      const mapped: SteamGame[] = (res.data ?? []).map((item: any) => {
        const appId = item.appId?.toString() ?? "";
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

  const hasPriceFilter = minPrice !== "" || maxPrice !== "";
  const isFreeMode = sortBy === "Free";
  const isPopularMode = !search.trim() && sortBy === "Popular";

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  /**
                 * Función: toggleTag
         * Descripción: Función auxiliar de propósito general especializada en toggle tag.
         * Contiene lógica específica para transformar datos, realizar cálculos o
         * conectar diferentes partes del sistema según los requisitos del módulo.
                 */
    const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);
  };

  const fetchDeals = useCallback(async (pg = 0, append = false) => {
    const searchTerm = search.trim();

    if (append) setIsLoadingMore(true); else setLoading(true);
    if (!append) { setSteamGames([]); setSteamLoading(false); }

    const isSavingsMode = sortBy === "Savings";

    if (!isSavingsMode && !hasPriceFilter && (selectedTags.length > 0 || isFreeMode || isPopularMode)) {
      try {
        const steamSort = STEAM_SORT_MAP[sortBy] ?? "Reviews_DESC";
        let endpoint = "";

        if (selectedTags.length > 0) {
          endpoint = `/api/steam/by-tags?tags=${selectedTags.join(',')}&isFree=${isFreeMode}`;
        } else if (isFreeMode) {
          endpoint = "/api/steam/free-games";
        } else {
          endpoint = "/api/steam/most-played";
        }

        const connector = endpoint.includes('?') ? '&' : '?';
        const res = await api.get(`${endpoint}${connector}sort=${steamSort}&page=${pg}`);
        const { games: raw = [], hasMore: more = false } = res.data ?? {};

        const mapped: SteamGame[] = raw.map((item: any) => {
          const priceVal = item.price === "Gratis" ? "Gratis" : (item.price === 0 || isFreeMode ? "Gratis" : `$${Number(item.price).toFixed(2)}`);
          const origVal = item.originalPrice ? `$${Number(item.originalPrice).toFixed(2)}` : priceVal;
          return {
            id: item.appId || item.name,
            title: item.name,
            price: priceVal,
            originalPrice: origVal,
            discountPct: item.discountPct || 0,
            isFree: item.isFree || isFreeMode,
            image: item.appId
              ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.appId}/header.jpg`
              : item.tinyImage ?? `https://placehold.co/460x215/1e293b/94a3b8?text=?`,
            steamAppID: item.appId ?? "",
          };
        });
        setSteamGames(prev => append ? [...prev, ...mapped] : mapped);
        setHasMore(more);
        setDeals([]);
      } catch (err) {
        console.error(err);
        setSteamGames([]);
      } finally {
        setLoading(false); setIsLoadingMore(false);
      }
      return;
    }

    try {
      const params: Record<string, any> = {
        storeID: "1",
        pageSize: 40,
        pageNumber: pg,
        sortBy,
      };

      if (sortBy !== "Price" && sortBy !== "Free" && sortBy !== "Savings") {
        params.desc = 1;
      }

      if (searchTerm) {
        params.title = searchTerm;
      } else {
        const min = minPrice !== "" ? parseFloat(minPrice) : null;
        const max = maxPrice !== "" ? parseFloat(maxPrice) : null;
        if (min !== null && min === 0 && max !== null && max === 0) {
          params.upperPrice = 0; params.lowerPrice = 0; delete params.desc;
        } else {
          if (min !== null && min > 0) params.lowerPrice = min;
          if (max !== null) params.upperPrice = max;
        }
      }

      const res = await axios.get("https://www.cheapshark.com/api/1.0/deals", { params });
      const data: Deal[] = res.data ?? [];
      setHasMore(data.length === 40);
      setDeals(prev => append ? [...prev, ...data] : data);

      if (searchTerm && !append) {
        fetchSteamFallback(searchTerm);
      }
    } catch {
      setDeals([]);
      if (search.trim()) fetchSteamFallback(search.trim());
    } finally {
      setLoading(false); setIsLoadingMore(false);
    }
  }, [search, sortBy, minPrice, maxPrice, selectedTags, isFreeMode, isPopularMode, fetchSteamFallback]);

  useEffect(() => {
    setPage(0);
    const id = setTimeout(() => fetchDeals(0, false), search ? 400 : 0);
    return () => clearTimeout(id);
  }, [search, sortBy, minPrice, maxPrice, selectedTags, fetchDeals]);

  /**
                 * Función: loadMore
         * Descripción: Rutina de carga responsable de volcar los datos de more a la memoria. Se
         * utiliza típicamente durante las fases de inicialización para preparar el
         * entorno antes de la interacción del usuario.
                 */
    const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchDeals(next, true);
  };

  return (
    <div className="space-y-10 pb-20">

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Mercado</h1>
        <p className="text-slate-400 text-sm mt-1">
          Mejores ofertas de Steam · actualizadas en tiempo real
        </p>
      </div>

      {user ? (
        <AIRecommendations steamId={user.steamid} />
      ) : (
        <LockedRecs onLogin={login} />
      )}

      <div className="border-t border-slate-800" />

      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="text"
              placeholder="Buscar juego..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800/50 text-white pl-12 pr-4 py-3 rounded-xl border border-slate-700/50 
                         focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all
                         placeholder:text-slate-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
            {!isFreeMode && (
              <div className="flex flex-wrap items-center gap-2 bg-slate-800/50 rounded-xl p-2 border border-slate-700/50 w-full md:w-auto">
                <div className="flex items-center gap-2 px-3 text-xs sm:text-sm text-slate-400">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Precio:</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      placeholder="Mín"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-20 bg-slate-900/50 text-white pl-7 pr-3 py-1.5 rounded-lg border border-slate-700/50 
                               focus:border-cyan-500/50 focus:outline-none text-sm placeholder:text-slate-600"
                    />
                  </div>
                  <span className="text-slate-600">-</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      placeholder="Máx"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-20 bg-slate-900/50 text-white pl-7 pr-3 py-1.5 rounded-lg border border-slate-700/50 
                               focus:border-cyan-500/50 focus:outline-none text-sm placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="relative min-w-[180px] group flex-1 md:flex-none">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full appearance-none bg-slate-800/50 text-white pl-4 pr-10 py-3 rounded-xl 
                           border border-slate-700/50 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 
                           focus:outline-none transition-all cursor-pointer font-medium"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-800 py-2">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ArrowUpDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-cyan-400 transition-colors" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Tag className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold tracking-wide">
                Categorías {selectedTags.length > 0 && <span className="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-md text-xs">{selectedTags.length} seleccionadas</span>}
              </span>
            </div>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Limpiar filtros
              </button>
            )}
          </div>

          <div
            ref={categoriesScrollRef}
            {...categoriesScrollEvents}
            className={`flex overflow-x-auto pb-4 -mx-2 px-2 gap-2 cursor-grab custom-scrollbar ${isCategoriesDragging ? "cursor-grabbing" : ""}`}
          >
            {GLOBAL_TAGS.map(tag => {
              const isActive = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={(e) => {
                    if (isCategoriesDragging) {
                      e.preventDefault();
                      return;
                    }
                    toggleTag(tag.id)
                  }}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 select-none ${isActive
                    ? "bg-cyan-500 text-slate-950 border border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                    : "bg-slate-800/80 text-slate-300 border border-slate-700/50 hover:bg-slate-700 hover:text-white hover:border-slate-600"
                    }`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-cyan-400" />
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          {search ? (
            <>
              Resultados para "{search}"
              <span className="text-sm font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                {deals.length > 0 ? deals.length : steamGames.length}
              </span>
            </>
          ) : selectedTags.length > 0 ? (
            <>
              Juegos por Categoría
              <span className="text-sm font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                Steam Store
              </span>
            </>
          ) : isFreeMode ? (
            <>
              Juegos Gratuitos
              <span className="text-sm font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                Steam Store
              </span>
            </>
          ) : sortBy === "Savings" ? (
            <>
              Mayor Descuento
              <span className="text-sm font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                CheapShark
              </span>
            </>
          ) : (
            <>
              Juegos Populares
              <span className="text-sm font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                Steam Store
              </span>
            </>
          )}
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      ) : (deals.length > 0 || steamGames.length > 0) ? (
        <div className="space-y-12">

          {deals.length > 0 && (
            <div>
              {search && steamGames.length > 0 && <h3 className="text-lg text-slate-300 font-bold mb-4">Ofertas encontradas</h3>}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {deals.map(d => <DealCard key={d.dealID} deal={d} />)}
              </div>
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {isLoadingMore ? <><Loader2 size={15} className="animate-spin" /> Cargando...</> : "Cargar más"}
                  </button>
                </div>
              )}
            </div>
          )}

          {steamGames.length > 0 && (
            <div className="space-y-3">
              {search && deals.length > 0 && (
                <div className="border-t border-slate-800 pt-8 mt-8">
                  <h3 className="text-lg text-slate-300 font-bold mb-4">Catálogo Completo en Steam Store</h3>
                </div>
              )}
              {!isFreeMode && !isPopularMode && selectedTags.length === 0 && !search && (
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" className="w-3 h-3" alt="" />
                  Sin ofertas activas en CheapShark · mostrando resultados de Steam Store
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {steamGames.map(g => <SteamGameCard key={g.id} game={g} />)}
              </div>
              {hasMore && !search && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {isLoadingMore ? <><Loader2 size={15} className="animate-spin" /> Cargando...</> : "Cargar más"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-500">
          <Star size={40} className="mx-auto mb-4 text-slate-700" />
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