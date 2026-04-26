import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, Link } from "react-router";
import {
  ArrowLeft, Bell, Heart, Loader2, ShoppingCart,
  TrendingDown, TrendingUp, Star, ExternalLink,
  Tag, Clock, Award, ChevronDown, ChevronUp, Info,
  Package
} from "lucide-react";
import axios from "axios";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Brush } from "recharts";
import { toast } from "sonner";
import api, {
  addWishlistItem,
  createPriceAlert,
  deletePriceAlert,
  getPriceAlerts,
  getWishlist,
  removeWishlistItem,
} from "../../lib/api";
import type { Deal } from "../components/market/DealCard";
import { useAuth } from "../context/AuthContext";

// ── types ─────────────────────────────────────────────────────────────────────

type CheapDeal = {
  storeID: string; gameID: string; dealID: string;
  salePrice: string; normalPrice: string; savings: string;
  lastChange: number; steamAppID?: string;
};
type CheapGame = {
  info:   { title: string; steamAppID: string; thumb: string };
  cheapestPriceEver?: { price: string; date: number };
  deals:  Array<{ storeID: string; dealID: string; price: string; retailPrice: string; savings: string }>;
};
type PricePoint = { date: Date; price: number; label: string };

// ── helpers ───────────────────────────────────────────────────────────────────

function toNum(v?: string | number | null) {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? 0));
  return isFinite(n) ? n : 0;
}
function fmt(v: number) { return `$${v.toFixed(2)}`; }

function buildHistoryFromPoints(pointsInput: PricePoint[], allTimeMin: number, current: number, normal: number): PricePoint[] {
  const sorted = [...pointsInput]
    .filter((p) => p?.date && toNum(p.price) >= 0) // Permitir 0 si es gratis
    // Filtrar precios anómalos (por ejemplo DLCs o bundles que cuestan mucho más que el juego base)
    .filter((p) => normal === 0 || p.price <= normal * 1.5)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sorted.length === 0) {
    const d = new Date();
    const dPast = new Date();
    dPast.setMonth(dPast.getMonth() - 12);
    return [
      { date: dPast, price: normal, label: dPast.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) },
      { date: d, price: current, label: d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) }
    ];
  }

  const uniqueDates = new Map<string, PricePoint>();
  sorted.forEach((p) => {
    // Override if we find a lower price on the same day/label
    const key = p.label;
    const prev = uniqueDates.get(key);
    if (!prev || p.price < prev.price) uniqueDates.set(key, p);
  });

  const result = Array.from(uniqueDates.values());

  const hasATL = result.some((p) => p.price <= allTimeMin * 1.01);
  if (!hasATL && allTimeMin < result[0].price) {
    result[0].price = allTimeMin;
  }

  // Ensure a long time range by prepending a base point 12 months ago if needed
  const oneYearAgo = new Date();
  oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);
  
  if (result.length > 0 && result[0].date > oneYearAgo) {
    result.unshift({
      date: oneYearAgo,
      price: normal,
      label: oneYearAgo.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }),
    });
  }

  // Always append today's price so the chart ends at the current day
  const today = new Date();
  const todayLabel = today.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  if (!uniqueDates.has(todayLabel)) {
    result.push({ date: today, price: current, label: todayLabel });
  }

  return result;
}

function buildHistory(deals: CheapDeal[], allTimeMin: number, current: number, normal: number): PricePoint[] {
  const pointsInput = [...deals]
    .filter(d => d.lastChange && toNum(d.salePrice) >= 0)
    .map(d => ({
    date:  new Date(d.lastChange * 1000),
    price: toNum(d.salePrice),
    label: new Date(d.lastChange * 1000).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }),
  }));
  return buildHistoryFromPoints(pointsInput, allTimeMin, current, normal);
}

// ── Price Chart ───────────────────────────────────────────────────────────────

function PriceChart({ points, current, atl, normal }: {
  points:  PricePoint[];
  current: number;
  atl:     number;
  normal:  number;
}) {
  const prices = points.map(p => p.price);
  const maxP = Math.max(...prices, normal, current);
  const minP = Math.max(0, Math.min(...prices, atl) * 0.9);

  return (
    <div className="w-full h-80 select-none -ml-4 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="label" 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            minTickGap={30}
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(val) => `$${val.toFixed(2)}`}
            domain={[0, maxP * 1.05]}
            width={45}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#020617", borderColor: "#334155", borderRadius: "0.75rem", color: "#fff" }}
            itemStyle={{ color: "#3b82f6", fontWeight: "bold" }}
            formatter={(value: number) => [fmt(value), "Precio"]}
            labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
            animationDuration={150}
          />
          {atl < maxP && atl >= minP && (
            <ReferenceLine y={atl} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1} label={{ position: "insideTopLeft", value: `Mínimo ${fmt(atl)}`, fill: "#22c55e", fontSize: 10 }} />
          )}
          {normal > current && (
            <ReferenceLine y={normal} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} label={{ position: "insideTopLeft", value: `Base ${fmt(normal)}`, fill: "#ef4444", fontSize: 10, opacity: 0.8 }} />
          )}
          <Area 
            type="stepAfter" 
            dataKey="price" 
            stroke="#3b82f6" 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            isAnimationActive={true}
            animationDuration={800}
          />
          {points.length > 2 && (
            <Brush 
              dataKey="label" 
              height={30} 
              stroke="#334155" 
              fill="#0f172a"
              tickFormatter={() => ""}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── main GameDetail ───────────────────────────────────────────────────────────

export function GameDetail() {
  const { user, login } = useAuth();
  const { id }           = useParams<{ id: string }>();
  const location         = useLocation();
  const dealFromState    = (location.state as { deal?: Deal } | null)?.deal;

  const [loading,        setLoading]        = useState(true);
  const [gameTitle,      setGameTitle]      = useState(dealFromState?.title ?? "");
  const [gameThumb,      setGameThumb]      = useState(dealFromState?.thumb ?? "");
  const [steamAppId,     setSteamAppId]     = useState<string | null>(null);
  const [cheapGameId,    setCheapGameId]    = useState<string | null>(dealFromState?.gameID ?? null);
  const [offers,         setOffers]         = useState<CheapDeal[]>([]);
  const [itadHistory,    setItadHistory]    = useState<PricePoint[]>([]);
  const [historySource,  setHistorySource]  = useState<"itad" | "cheapshark">("cheapshark");
  const [cheapestEver,   setCheapestEver]   = useState<{ price: string; date: number } | undefined>();
  const [steamGame,      setSteamGame]      = useState<any>(null);
  const [activePlayers,  setActivePlayers]  = useState<number | null>(null);
  const [expanded,       setExpanded]       = useState(false);
  const [loadError,      setLoadError]      = useState("");
  const [isWishlisted,   setIsWishlisted]   = useState(false);
  const [hasAlert,       setHasAlert]       = useState(false);
  const [wishlistBusy,   setWishlistBusy]   = useState(false);
  const [alertBusy,      setAlertBusy]      = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [targetPriceInput, setTargetPriceInput] = useState("");
  const [alertInputError, setAlertInputError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true); setLoadError("");
      try {
        let appId  = dealFromState?.steamAppID || id;
        let gameId = dealFromState?.gameID     || null;

        // fetch deals by steamAppID
        const dealsRes = await axios.get("https://www.cheapshark.com/api/1.0/deals", {
          params: { steamAppID: appId, pageSize: 60, storeID: "1" },
        });
        const allDeals: CheapDeal[] = dealsRes.data ?? [];
        if (!gameId && allDeals[0]?.gameID) gameId = allDeals[0].gameID;

        // fetch game metadata from CheapShark
        let meta: CheapGame | null = null;
        if (gameId) {
          try {
            const r = await axios.get(`https://www.cheapshark.com/api/1.0/games`, { params: { id: gameId } });
            meta = r.data;
            if (!appId && meta?.info?.steamAppID) appId = meta.info.steamAppID;
          } catch { /* ignore */ }
        }

        // widen history – also fetch by title
        if (meta?.info?.title) {
          try {
            const r2 = await axios.get("https://www.cheapshark.com/api/1.0/deals", {
              params: { title: meta.info.title, storeID: "1", pageSize: 60 },
            });
            const extra: CheapDeal[] = r2.data ?? [];
            const filteredExtra = extra.filter((deal) => {
              const sameSteamApp = appId && deal?.steamAppID && String(deal.steamAppID) === String(appId);
              const sameGameId = gameId && deal?.gameID && String(deal.gameID) === String(gameId);
              return Boolean(sameSteamApp || sameGameId);
            });
            const ids = new Set(allDeals.map(d => d.dealID));
            filteredExtra.forEach(d => { if (!ids.has(d.dealID)) allDeals.push(d); });
          } catch { /* ignore */ }
        }

        // fetch Steam metadata via backend
        let steam: any = null;
        if (appId) {
          try {
            const r = await api.get(`/api/steam/app/${appId}`);
            steam = r.data?.data ?? null;
          } catch { /* ignore */ }
        }

        let itadPoints: PricePoint[] = [];
        try {
          const historyRes = await api.get("/api/steam/itad/history", {
            params: {
              appId: appId || undefined,
              title: meta?.info?.title || dealFromState?.title || undefined,
              country: "ES",
            },
          });

          const rawPoints = Array.isArray(historyRes.data?.points)
            ? historyRes.data.points
            : [];

          itadPoints = rawPoints
            .map((p: any) => {
              const timestamp = Number(p?.timestamp);
              const price = toNum(p?.price);
              if (!Number.isFinite(timestamp) || price <= 0) return null;
              const d = new Date(timestamp);
              if (Number.isNaN(d.getTime())) return null;
              return {
                date: d,
                price,
                label: d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" }),
              } as PricePoint;
            })
            .filter(Boolean) as PricePoint[];
        } catch {
          // Fall back to CheapShark history when ITAD is unavailable.
        }

        let players = null;
        if (appId) {
          try {
            const pRes = await api.get(`/api/steam/players/${appId}`);
            if (pRes.data?.result === 1) players = pRes.data.player_count;
          } catch { /* ignore */ }
        }

        if (!cancelled) {
          const fallbackTitle = meta?.info?.title ?? dealFromState?.title ?? "Juego";
          const fallbackThumb = meta?.info?.thumb  ?? dealFromState?.thumb ?? "";
          setGameTitle(steam?.name       ?? fallbackTitle);
          setGameThumb(steam?.header_image ?? fallbackThumb);
          setSteamAppId(appId ?? meta?.info?.steamAppID ?? null);
          setCheapGameId(gameId ?? null);
          setOffers(allDeals);
          setItadHistory(itadPoints);
          setHistorySource(itadPoints.length > 0 ? "itad" : "cheapshark");
          setCheapestEver(meta?.cheapestPriceEver);
          setSteamGame(steam);
          setActivePlayers(players);
          if (!steam && !meta && !allDeals.length) setLoadError("No se pudo obtener información para este juego.");
        }
      } catch {
        if (!cancelled) setLoadError("Error al cargar la información del juego.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const currentPrice = useMemo(() => {
    if (offers.length) return Math.min(...offers.map(o => toNum(o.salePrice)));
    return toNum(dealFromState?.salePrice);
  }, [offers, dealFromState]);

  const normalPrice = useMemo(() => {
    if (offers.length) return Math.max(...offers.map(o => toNum(o.normalPrice)));
    return toNum(dealFromState?.normalPrice);
  }, [offers, dealFromState]);

  const atl = toNum(cheapestEver?.price) || currentPrice;

  const priceHistory = useMemo(() => {
    // Si el juego base es completamente gratis, el historial debe reflejar esto
    // y evitar picos de precios que corresponden a DLCs o Soundtracks.
    if (normalPrice === 0) {
      return [
        { date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), price: 0, label: "0" },
        { date: new Date(), price: 0, label: "0" }
      ];
    }
    
    if (itadHistory.length > 0) {
      return buildHistoryFromPoints(itadHistory, atl, currentPrice || 1, normalPrice || 1);
    }
    return buildHistory(offers, atl, currentPrice || 1, normalPrice || 1);
  }, [itadHistory, offers, atl, currentPrice, normalPrice]);

  const discount    = normalPrice > 0 ? Math.round(((normalPrice - currentPrice) / normalPrice) * 100) : 0;
  const atlDiscount = normalPrice > 0 ? Math.round(((normalPrice - atl) / normalPrice) * 100) : 0;

  const priceTrend = useMemo(() => {
    if (priceHistory.length < 3) return "stable";
    const recent = priceHistory.slice(-3).map(p => p.price);
    const first  = priceHistory.slice(0, 3).map(p => p.price);
    const avgR   = recent.reduce((a, b) => a + b, 0) / 3;
    const avgF   = first.reduce((a, b) => a + b, 0) / 3;
    if (avgR < avgF * 0.92) return "down";
    if (avgR > avgF * 1.08) return "up";
    return "stable";
  }, [priceHistory]);

  const recommendation = useMemo(() => {
    if (currentPrice <= atl * 1.03) return { label: "Compra ahora", color: "text-emerald-400", icon: <Award size={20} className="text-emerald-400" /> };
    if (discount >= 60)             return { label: "Gran oferta",  color: "text-emerald-400", icon: <Star size={20} className="text-emerald-400" /> };
    if (discount >= 30)             return { label: "Buen descuento", color: "text-blue-400",  icon: <Tag size={20} className="text-blue-400" /> };
    if (priceTrend === "down")      return { label: "Precio bajando", color: "text-yellow-400", icon: <TrendingDown size={20} className="text-yellow-400" /> };
    return { label: "Precio estable", color: "text-slate-400", icon: <Info size={20} className="text-slate-400" /> };
  }, [currentPrice, atl, discount, priceTrend]);

  const steamStoreUrl = steamAppId ? `https://store.steampowered.com/app/${steamAppId}` : undefined;
  const marketIdentity = String(steamAppId || cheapGameId || id || "").trim();
  const requestGameId = (cheapGameId || (!steamAppId ? String(id || "").trim() : "")) || undefined;

  useEffect(() => {
    if (!user || !marketIdentity) {
      setIsWishlisted(false);
      setHasAlert(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [wishlistRes, alertsRes] = await Promise.all([
          getWishlist({ live: false }),
          getPriceAlerts({ live: false }),
        ]);

        const wishlist = Array.isArray(wishlistRes.data?.wishlist) ? wishlistRes.data.wishlist : [];
        const alerts = Array.isArray(alertsRes.data?.alerts) ? alertsRes.data.alerts : [];

        const onWishlist = wishlist.some((item: any) =>
          String(item?.steamAppId || "") === marketIdentity || String(item?.gameId || "") === marketIdentity,
        );
        const onAlerts = alerts.some((item: any) =>
          String(item?.steamAppId || "") === marketIdentity || String(item?.gameId || "") === marketIdentity,
        );

        if (!cancelled) {
          setIsWishlisted(onWishlist);
          setHasAlert(onAlerts);
        }
      } catch {
        if (!cancelled) {
          setIsWishlisted(false);
          setHasAlert(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, marketIdentity]);

  const handleWishlist = async () => {
    if (!user) {
      toast.info("Inicia sesión para usar tu wishlist");
      login();
      return;
    }

    if (!marketIdentity) {
      toast.error("No se pudo identificar el juego");
      return;
    }

    setWishlistBusy(true);
    try {
      if (isWishlisted) {
        await removeWishlistItem(marketIdentity);
        setIsWishlisted(false);
        toast.success("Eliminado de tu wishlist");
      } else {
        await addWishlistItem({
          steamAppId: steamAppId || undefined,
          gameId: requestGameId,
          title: gameTitle,
          thumb: gameThumb,
        });
        setIsWishlisted(true);
        toast.success("Añadido a tu wishlist");
      }
    } catch (error: any) {
      const message = error?.response?.data?.error;
      toast.error(message || "No se pudo actualizar la wishlist");
    } finally {
      setWishlistBusy(false);
    }
  };

  const handlePriceAlert = async () => {
    if (!user) {
      toast.info("Inicia sesión para crear alertas de precio");
      login();
      return;
    }

    if (!marketIdentity) {
      toast.error("No se pudo identificar el juego");
      return;
    }

    if (hasAlert) {
      setAlertBusy(true);
      try {
        await deletePriceAlert(marketIdentity);
        setHasAlert(false);
        toast.success("Alerta eliminada");
      } catch (error: any) {
        const message = error?.response?.data?.error;
        toast.error(message || "No se pudo gestionar la alerta");
      } finally {
        setAlertBusy(false);
      }
      return;
    }

    const suggestedTarget = currentPrice > 0
      ? Math.max(0.5, currentPrice * 0.9).toFixed(2)
      : "1.00";

    setTargetPriceInput(suggestedTarget);
    setAlertInputError("");
    setShowAlertModal(true);
  };

  const closeAlertModal = () => {
    if (alertBusy) return;
    setShowAlertModal(false);
    setAlertInputError("");
  };

  const handleCreateAlert = async () => {
    const targetPrice = Number(targetPriceInput.replace(",", "."));
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      setAlertInputError("Ingresa un precio objetivo válido");
      return;
    }

    setAlertInputError("");
    setAlertBusy(true);

    try {
      await createPriceAlert({
        steamAppId: steamAppId || undefined,
        gameId: requestGameId,
        title: gameTitle,
        thumb: gameThumb,
        targetPrice,
      });
      setHasAlert(true);
      setShowAlertModal(false);
      toast.success("Alerta de precio creada", {
        description: `Te avisaremos cuando baje de ${fmt(targetPrice)}.`,
      });
    } catch (error: any) {
      const message = error?.response?.data?.error;
      toast.error(message || "No se pudo gestionar la alerta");
    } finally {
      setAlertBusy(false);
    }
  };

  useEffect(() => {
    if (!showAlertModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !alertBusy) {
        setShowAlertModal(false);
        setAlertInputError("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showAlertModal, alertBusy]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <Loader2 className="animate-spin text-blue-500 mx-auto mb-3" size={32}/>
        <p className="text-slate-400 text-sm">Cargando análisis…</p>
      </div>
    </div>
  );

  if (loadError) return (
    <div className="max-w-3xl mx-auto pb-20 pt-8">
      <Link to="/market" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm">
        <ArrowLeft size={16}/> Volver
      </Link>
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
        <p className="text-white text-xl font-bold mb-2">No se pudo cargar</p>
        <p className="text-slate-400 text-sm">{loadError}</p>
      </div>
    </div>
  );

  return (
    <div className="pb-20 max-w-6xl mx-auto">
      <Link to="/market" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8">
        <ArrowLeft size={16}/> Volver al Mercado
      </Link>

      {/* hero banner */}
      <div className="relative rounded-2xl overflow-hidden mb-8 h-52 md:h-64">
        {gameThumb ? (
          <img src={gameThumb} alt={gameTitle} className="w-full h-full object-cover"/>
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
            <Package size={48} className="text-slate-600"/>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-transparent"/>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent"/>
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{gameTitle}</h1>
            <div className="flex flex-wrap items-center gap-3">
              {discount > 0 && (
                <span className="bg-emerald-500 text-white text-sm font-bold px-2.5 py-0.5 rounded-lg">
                  -{discount}%
                </span>
              )}
              <span className="text-2xl font-black text-white">{fmt(currentPrice)}</span>
              {normalPrice > currentPrice && (
                <span className="text-slate-400 line-through text-sm">{fmt(normalPrice)}</span>
              )}
            </div>
          </div>
          
          {activePlayers !== null && activePlayers > 0 && (
            <div className="hidden sm:block text-right bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl px-4 py-2">
              <div className="flex items-center gap-2 justify-end mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Activos Ahora</div>
              </div>
              <div className="text-2xl font-black text-white leading-none">{activePlayers.toLocaleString('es-ES')}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">

        {/* ── left: price analysis ─────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* price history card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-white">Historial de Precios</h2>
              <span className="text-[11px] text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
                {historySource === "itad"
                  ? "últimos 12 meses · IsThereAnyDeal"
                  : "últimos 12 meses · CheapShark"}
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Pasa el ratón sobre la gráfica para ver el precio en cada fecha.
            </p>
            <PriceChart points={priceHistory} current={currentPrice} atl={atl} normal={normalPrice}/>
          </div>

          {/* stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Precio actual", value: fmt(currentPrice), color: "text-emerald-400", icon: <Tag size={16}/> },
              { label: "Precio base",   value: fmt(normalPrice),  color: "text-slate-300",   icon: <Package size={16}/> },
              { label: "Mínimo histórico", value: `${fmt(atl)} (-${atlDiscount}%)`, color: "text-green-400", icon: <Award size={16}/> },
              { label: "Tendencia",     value: priceTrend === "down" ? "Bajando ↓" : priceTrend === "up" ? "Subiendo ↑" : "Estable →",
                                        color: priceTrend === "down" ? "text-green-400" : priceTrend === "up" ? "text-red-400" : "text-slate-400",
                                        icon: priceTrend === "down" ? <TrendingDown size={16}/> : <TrendingUp size={16}/> },
            ].map(s => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1.5">{s.icon}{s.label}</div>
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* insight cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Info size={15} className="text-blue-400"/>
                <span className="text-sm text-slate-400">Recomendación IA</span>
              </div>
              <p className={`text-base font-bold ${recommendation.color}`}>
                {recommendation.icon} {recommendation.label}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {currentPrice <= atl * 1.03
                  ? "El precio está en su punto más bajo. Ideal para comprar."
                  : discount >= 60
                  ? `Descuento agresivo del ${discount}%. Muy por debajo del precio base.`
                  : discount >= 30
                  ? `${discount}% de descuento sobre el precio base.`
                  : priceTrend === "down"
                  ? "El precio ha bajado en los últimos meses. Podría bajar más."
                  : "El precio se mantiene estable. Espera una oferta mejor."}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={15} className="text-purple-400"/>
                <span className="text-sm text-slate-400">Mejor momento de compra</span>
              </div>
              <p className="text-base font-bold text-white">
                {currentPrice <= atl * 1.05 ? "Ahora mismo" :
                 "Próximas rebajas"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {atl < currentPrice
                  ? `El precio mínimo fue ${fmt(atl)}. Puedes ahorrar ${fmt(currentPrice - atl)} esperando.`
                  : "El precio actual está cerca del mínimo histórico."}
              </p>
            </div>
          </div>

          {/* price breakdown toggle */}
          {offers.length > 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(p => !p)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Star size={15} className="text-amber-400"/>
                  Historial de ofertas ({offers.length} registros)
                </span>
                {expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
              </button>
              {expanded && (
                <div className="divide-y divide-slate-800/60">
                  {[...offers]
                    .sort((a, b) => b.lastChange - a.lastChange)
                    .slice(0, 12)
                    .map(o => (
                      <div key={o.dealID} className="flex items-center justify-between px-5 py-2.5 text-xs">
                        <span className="text-slate-400">
                          {new Date(o.lastChange * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <div className="flex items-center gap-3">
                          {parseFloat(o.savings) > 5 && (
                            <span className="text-emerald-500 font-medium">-{Math.round(parseFloat(o.savings))}%</span>
                          )}
                          <span className="text-white font-bold">{fmt(toNum(o.salePrice))}</span>
                          <span className="text-slate-600 line-through">{fmt(toNum(o.normalPrice))}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── right: action sidebar ─────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* game thumb */}
          {gameThumb && (
            <img src={gameThumb} alt={gameTitle}
                 className="w-full rounded-xl border border-slate-800 hidden xl:block"/>
          )}

          {/* price card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-black text-emerald-400">{fmt(currentPrice)}</span>
                {normalPrice > currentPrice && (
                  <span className="text-slate-500 line-through text-sm pb-1">{fmt(normalPrice)}</span>
                )}
              </div>
              {discount > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded">
                    Ahorras {fmt(normalPrice - currentPrice)} ({discount}%)
                  </span>
                </div>
              )}
            </div>

            <a
              href={steamStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                steamStoreUrl
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              <ShoppingCart size={16}/>
              Ver en Steam
              <ExternalLink size={13}/>
            </a>

            <button
              onClick={handleWishlist}
              disabled={wishlistBusy}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60 ${
                isWishlisted
                  ? "border-rose-700/40 bg-rose-900/20 hover:bg-rose-900/30 text-rose-300"
                  : "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              {wishlistBusy ? <Loader2 size={15} className="animate-spin" /> : <Heart size={15}/>}
              {isWishlisted ? "Quitar de wishlist" : "Añadir a wishlist"}
            </button>

            <button
              onClick={handlePriceAlert}
              disabled={alertBusy}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60 ${
                hasAlert
                  ? "border-red-700/40 bg-red-900/20 hover:bg-red-900/40 text-red-300"
                  : "border-amber-700/40 bg-amber-900/20 hover:bg-amber-900/40 text-amber-400"
              }`}
            >
              {alertBusy ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15}/>}
              {hasAlert ? "Eliminar alerta" : "Crear alerta de precio"}
            </button>

            {user && (
              <Link
                to="/market/tracking"
                className="block text-center text-xs text-slate-400 hover:text-blue-400 transition-colors"
              >
                Gestionar wishlist y alertas
              </Link>
            )}
          </div>

          {/* price summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 text-sm">
            {[
              { label: "Precio actual",       value: fmt(currentPrice),            color: "text-emerald-400" },
              { label: "Precio base",          value: fmt(normalPrice),             color: "text-white" },
              { label: "Mínimo histórico",     value: fmt(atl),                     color: "text-green-400" },
              { label: "Ahorro máximo",        value: `-${atlDiscount}%`,           color: "text-green-400" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-slate-500">{row.label}</span>
                <span className={`font-semibold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* steam description */}
          {steamGame?.short_description && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-4">
                {steamGame.short_description}
              </p>
            </div>
          )}
        </div>
      </div>

      {showAlertModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeAlertModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Crear alerta de precio</h3>
            <p className="text-sm text-slate-400 mt-1">
              Te avisaremos cuando {gameTitle} baje de tu objetivo.
            </p>

            <div className="mt-4 space-y-2">
              <label htmlFor="target-price" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Precio objetivo (USD)
              </label>
              <input
                id="target-price"
                type="number"
                min="0.01"
                step="0.01"
                value={targetPriceInput}
                onChange={(event) => setTargetPriceInput(event.target.value)}
                placeholder="Ej: 9.99"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
              />
              {alertInputError && <p className="text-xs text-red-400">{alertInputError}</p>}
              <p className="text-xs text-slate-500">
                Precio actual: <span className="text-emerald-400 font-semibold">{fmt(currentPrice)}</span>
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeAlertModal}
                disabled={alertBusy}
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-sm hover:bg-slate-700 transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAlert}
                disabled={alertBusy}
                className="px-4 py-2 rounded-lg border border-blue-700/40 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-60 inline-flex items-center gap-2"
              >
                {alertBusy ? <Loader2 size={14} className="animate-spin" /> : null}
                {alertBusy ? "Guardando..." : "Guardar alerta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
