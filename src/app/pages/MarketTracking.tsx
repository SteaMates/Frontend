import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import {
  Bell,
  BellOff,
  Heart,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  TrendingDown,
  ExternalLink,
  Target
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  deletePriceAlert,
  getPriceAlerts,
  getWishlist,
  removeWishlistItem,
  updatePriceAlert,
} from "../../lib/api";

type LiveDeal = {
  dealID?: string;
  steamAppID?: string;
  gameID?: string;
  salePrice?: string;
  normalPrice?: string;
  savings?: string;
};

type WishlistItem = {
  id?: string;
  steamAppId?: string;
  gameId?: string;
  title: string;
  thumb?: string;
  addedAt?: string;
  currentPrice?: number | null;
  normalPrice?: number | null;
  savings?: number | null;
  hasDiscount?: boolean;
  liveDeal?: LiveDeal | null;
};

type PriceAlertItem = WishlistItem & {
  targetPrice?: number | null;
  enabled: boolean;
  updatedAt?: string;
  triggered?: boolean;
};

function getActionId(item: {
  id?: string;
  steamAppId?: string;
  gameId?: string;
}) {
  return String(item.id || item.steamAppId || item.gameId || "").trim();
}

function getDetailId(item: { steamAppId?: string; gameId?: string }) {
  return String(item.steamAppId || item.gameId || "").trim();
}

function formatPrice(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Sin precio";
  return `$${value.toFixed(2)}`;
}

export function MarketTracking() {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [alerts, setAlerts] = useState<PriceAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const activeAlerts = useMemo(
    () => alerts.filter((alert) => alert.enabled).length,
    [alerts],
  );

  const triggeredAlerts = useMemo(
    () => alerts.filter((alert) => alert.triggered).length,
    [alerts],
  );

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [wishlistRes, alertsRes] = await Promise.all([
        getWishlist({ live: true }),
        getPriceAlerts({ live: true }),
      ]);

      setWishlist(
        Array.isArray(wishlistRes.data?.wishlist)
          ? wishlistRes.data.wishlist
          : [],
      );
      setAlerts(
        Array.isArray(alertsRes.data?.alerts) ? alertsRes.data.alerts : [],
      );
    } catch {
      toast.error("No se pudo cargar tu seguimiento de mercado");
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const onRemoveWishlist = async (item: WishlistItem) => {
    const identity = getActionId(item);
    if (!identity) {
      toast.error("No se pudo identificar el juego");
      return;
    }

    try {
      await removeWishlistItem(identity);
      setWishlist((prev) =>
        prev.filter((entry) => getActionId(entry) !== identity),
      );
      toast.success("Juego eliminado de tu wishlist");
    } catch {
      toast.error("No se pudo eliminar de wishlist");
    }
  };

  const onDeleteAlert = async (item: PriceAlertItem) => {
    const identity = getActionId(item);
    if (!identity) {
      toast.error("No se pudo identificar la alerta");
      return;
    }

    try {
      await deletePriceAlert(identity);
      setAlerts((prev) =>
        prev.filter((entry) => getActionId(entry) !== identity),
      );
      toast.success("Alerta eliminada");
    } catch {
      toast.error("No se pudo eliminar la alerta");
    }
  };

  const onToggleAlert = async (item: PriceAlertItem) => {
    const identity = getActionId(item);
    if (!identity) {
      toast.error("No se pudo identificar la alerta");
      return;
    }

    try {
      const nextEnabled = !item.enabled;
      await updatePriceAlert(identity, { enabled: nextEnabled });
      setAlerts((prev) =>
        prev.map((entry) =>
          getActionId(entry) === identity
            ? {
                ...entry,
                enabled: nextEnabled,
                triggered:
                  nextEnabled &&
                  typeof entry.currentPrice === "number" &&
                  typeof entry.targetPrice === "number" &&
                  entry.targetPrice > 0 &&
                  entry.currentPrice <= entry.targetPrice,
              }
            : entry,
        ),
      );
      toast.success(nextEnabled ? "Alerta activada" : "Alerta desactivada");
    } catch {
      toast.error("No se pudo actualizar la alerta");
    }
  };

  const onEditTarget = async (item: PriceAlertItem) => {
    const identity = getActionId(item);
    if (!identity) {
      toast.error("No se pudo identificar la alerta");
      return;
    }

    const input = window.prompt(
      `Nuevo precio objetivo para ${item.title} (USD)`,
      typeof item.targetPrice === "number" && item.targetPrice > 0
        ? item.targetPrice.toFixed(2)
        : "1.00",
    );

    if (input === null) return;

    const next = Number(input.replace(",", "."));
    if (!Number.isFinite(next) || next <= 0) {
      toast.error("Ingresa un precio objetivo válido");
      return;
    }

    try {
      await updatePriceAlert(identity, { targetPrice: next, enabled: true });
      setAlerts((prev) =>
        prev.map((entry) =>
          getActionId(entry) === identity
            ? {
                ...entry,
                enabled: true,
                targetPrice: next,
                triggered:
                  typeof entry.currentPrice === "number"
                    ? entry.currentPrice <= next
                    : false,
              }
            : entry,
        ),
      );
      toast.success("Precio objetivo actualizado");
    } catch {
      toast.error("No se pudo actualizar el objetivo");
    }
  };

  if (loading) {
    return (
      <div className="h-[55vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="animate-spin text-[#51a2ff] mx-auto mb-3"
            size={32}
          />
          <p className="text-[#62748e] text-sm">
            Cargando seguimiento de mercado...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-[1400px] mx-auto">
      {/* HEADER SECTION */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pr-14 sm:pr-16">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <Target className="text-[#51a2ff]" size={28} />
            Seguimiento de mercado
          </h1>
          <p className="text-sm text-[#90a1b9] mt-2 max-w-xl">
            Gestiona tu wishlist y alertas de precio en tiempo real. Organiza tus compras y nunca te pierdas una oferta.
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#155dfc] hover:bg-[#2b7fff] text-white text-sm font-bold transition-all shadow-[0_0_15px_rgba(21,93,252,0.2)] disabled:opacity-50 shrink-0"
        >
          {refreshing ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Actualizando...
            </>
          ) : (
            <>
              <RefreshCw size={16} /> Actualizar precios
            </>
          )}
        </button>
      </section>

      {/* STATS CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0f172b] border border-[#1d293d] rounded-[12px] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[rgba(251,113,133,0.1)] flex items-center justify-center shrink-0">
            <Heart size={24} className="text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-[#62748e] font-bold uppercase tracking-wider mb-0.5">En Wishlist</p>
            <p className="text-2xl font-black text-white leading-none">{wishlist.length}</p>
          </div>
        </div>
        <div className="bg-[#0f172b] border border-[#1d293d] rounded-[12px] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[rgba(81,162,255,0.1)] flex items-center justify-center shrink-0">
            <Bell size={24} className="text-[#51a2ff]" />
          </div>
          <div>
            <p className="text-xs text-[#62748e] font-bold uppercase tracking-wider mb-0.5">Alertas Activas</p>
            <p className="text-2xl font-black text-[#51a2ff] leading-none">{activeAlerts}</p>
          </div>
        </div>
        <div className="bg-[#0f172b] border border-[#1d293d] rounded-[12px] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[rgba(0,212,146,0.1)] flex items-center justify-center shrink-0">
            <TrendingDown size={24} className="text-[#00d492]" />
          </div>
          <div>
            <p className="text-xs text-[#62748e] font-bold uppercase tracking-wider mb-0.5">Objetivos Cumplidos</p>
            <p className="text-2xl font-black text-[#00d492] leading-none">{triggeredAlerts}</p>
          </div>
        </div>
      </section>

      {/* WISHLIST SECTION */}
      <section className="space-y-4">
        <h2 className="text-[20px] font-bold text-white flex items-center gap-2 pb-2 border-b border-[#1d293d]">
          <Heart size={20} className="text-rose-400" /> Mi Wishlist
        </h2>

        {wishlist.length === 0 ? (
          <div className="bg-[#0f172b] border border-[#1d293d] rounded-[12px] p-10 text-center text-[#90a1b9] text-sm">
            Aún no tienes juegos en wishlist. Desde el detalle de cualquier juego puedes guardarlo.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {wishlist.map((item) => {
              const identity = getActionId(item);
              const detailId = getDetailId(item);
              const savings = typeof item.savings === "number" ? Math.round(item.savings) : 0;
              const linkState = { deal: { title: item.title, steamAppID: item.steamAppId, thumb: item.thumb, salePrice: item.currentPrice, normalPrice: item.normalPrice, dealID: "", gameID: item.gameId, storeID: "1" } };

              return (
                <div key={identity || `${item.title}-${item.addedAt}`} className="bg-[#0f172b] border border-[#1d293d] hover:border-[#314158] rounded-[12px] p-3 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors group">
                  {/* Thumbnail */}
                  <Link to={`/game/${detailId}`} state={linkState} className="relative w-full sm:w-[140px] h-[64px] rounded-[8px] overflow-hidden bg-[#1d293d] shrink-0 block">
                    {item.thumb ? (
                      <img src={item.thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#62748e] text-[10px]">Sin imagen</div>
                    )}
                    {item.hasDiscount && savings > 0 && (
                      <div className="absolute top-1.5 left-1.5 bg-[#00d492] text-[#0f172b] text-[10px] font-black px-1.5 py-0.5 rounded-[4px] shadow-lg">
                        -{savings}%
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <Link to={`/game/${detailId}`} state={linkState} className="font-bold text-white text-[16px] truncate hover:text-[#51a2ff] transition-colors" title={item.title}>
                      {item.title}
                    </Link>
                  </div>

                  {/* Pricing & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t border-[#1d293d] sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                    <div className="flex flex-col items-end">
                      {item.hasDiscount && item.normalPrice ? (
                        <span className="text-[11px] text-[#62748e] line-through font-medium">
                          {formatPrice(item.normalPrice)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-transparent select-none">-</span>
                      )}
                      <span className="text-[18px] font-black text-white">
                        {formatPrice(item.currentPrice)}
                      </span>
                    </div>

                    <div className="w-px h-8 bg-[#1d293d] hidden sm:block" />

                    <div className="flex items-center gap-2">
                      <button onClick={() => onRemoveWishlist(item)} className="h-9 w-9 flex items-center justify-center rounded-[8px] text-[#62748e] hover:text-[#ff6467] hover:bg-[rgba(255,100,103,0.1)] transition-colors" title="Quitar de wishlist">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* PRICE ALERTS SECTION */}
      <section className="space-y-4">
        <h2 className="text-[20px] font-bold text-white flex items-center gap-2 pb-2 border-b border-[#1d293d]">
          <TrendingDown size={20} className="text-[#00d492]" /> Alertas de Precio
        </h2>

        {alerts.length === 0 ? (
          <div className="bg-[#0f172b] border border-[#1d293d] rounded-[12px] p-10 text-center text-[#90a1b9] text-sm">
            No has configurado alertas de precio. Añade alertas desde el detalle de los juegos.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map((item) => {
              const identity = getActionId(item);
              const detailId = getDetailId(item);
              const linkState = { deal: { title: item.title, steamAppID: item.steamAppId, thumb: item.thumb, salePrice: item.currentPrice, normalPrice: item.normalPrice, dealID: "", gameID: item.gameId, storeID: "1" } };

              return (
                <div key={identity || `alert-${item.title}`} className={`relative bg-[#0f172b] border rounded-[12px] p-3 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors group ${item.triggered ? "border-[#00d492] shadow-[0_0_20px_rgba(0,212,146,0.15)]" : "border-[#1d293d] hover:border-[#314158]"}`}>
                  
                  {/* Thumbnail */}
                  <Link to={`/game/${detailId}`} state={linkState} className="relative w-full sm:w-[140px] h-[64px] rounded-[8px] overflow-hidden bg-[#1d293d] shrink-0 block">
                    {item.thumb ? (
                      <img src={item.thumb} alt={item.title} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${!item.enabled && "grayscale opacity-50"}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#62748e] text-[10px]">Sin imagen</div>
                    )}
                    {item.triggered && (
                      <div className="absolute top-0 left-0 w-full h-full bg-[rgba(0,212,146,0.2)] pointer-events-none" />
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={`/game/${detailId}`} state={linkState} className={`font-bold text-[16px] truncate hover:text-[#51a2ff] transition-colors ${!item.enabled ? "text-[#62748e]" : "text-white"}`} title={item.title}>
                        {item.title}
                      </Link>
                      {item.triggered && (
                        <span className="bg-[#00d492] text-[#0f172b] text-[9px] font-black px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider shrink-0">
                          ¡Objetivo Alcanzado!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing Dash (Current vs Target) */}
                  <div className={`flex items-center gap-4 sm:gap-6 shrink-0 bg-[rgba(2,6,24,0.5)] px-4 py-2 rounded-[8px] border ${item.triggered ? "border-[rgba(0,212,146,0.3)]" : "border-[#1d293d]"} mt-2 sm:mt-0`}>
                    <div className="flex flex-col items-center min-w-[60px]">
                      <span className="text-[10px] text-[#62748e] font-bold uppercase tracking-wider mb-0.5">Actual</span>
                      <span className={`text-[15px] font-black ${item.triggered ? "text-[#00d492]" : "text-white"}`}>
                        {formatPrice(item.currentPrice)}
                      </span>
                    </div>
                    
                    <div className="w-px h-6 bg-[#314158]" />
                    
                    <div onClick={() => onEditTarget(item)} className="flex flex-col items-center min-w-[60px] group/target cursor-pointer relative" title="Click para editar objetivo">
                      <span className="text-[10px] text-[#62748e] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        Objetivo
                        <Pencil size={10} className="text-[#51a2ff] opacity-0 group-hover/target:opacity-100 transition-opacity absolute -right-4" />
                      </span>
                      <span className="text-[15px] font-black text-[#51a2ff]">
                        {formatPrice(item.targetPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 shrink-0 border-t border-[#1d293d] sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                    <button 
                      onClick={() => onToggleAlert(item)} 
                      className={`h-9 px-3 flex items-center gap-1.5 rounded-[8px] text-[12px] font-bold transition-colors ${item.enabled ? "bg-[rgba(81,162,255,0.1)] text-[#51a2ff] hover:bg-[rgba(81,162,255,0.2)]" : "bg-[#1d293d] text-[#62748e] hover:text-white"}`}
                      title={item.enabled ? "Desactivar alerta" : "Activar alerta"}
                    >
                      {item.enabled ? <><Bell size={14} /> Activa</> : <><BellOff size={14} /> Pausada</>}
                    </button>
                    <button onClick={() => onDeleteAlert(item)} className="h-9 w-9 flex items-center justify-center rounded-[8px] text-[#62748e] hover:text-[#ff6467] hover:bg-[rgba(255,100,103,0.1)] transition-colors" title="Eliminar alerta">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}