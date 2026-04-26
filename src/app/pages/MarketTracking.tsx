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

function getActionId(item: { id?: string; steamAppId?: string; gameId?: string }) {
  return String(item.id || item.steamAppId || item.gameId || "").trim();
}

function getDetailId(item: { steamAppId?: string; gameId?: string }) {
  return String(item.steamAppId || item.gameId || "").trim();
}

function formatPrice(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/D";
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

      setWishlist(Array.isArray(wishlistRes.data?.wishlist) ? wishlistRes.data.wishlist : []);
      setAlerts(Array.isArray(alertsRes.data?.alerts) ? alertsRes.data.alerts : []);
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
      setWishlist((prev) => prev.filter((entry) => getActionId(entry) !== identity));
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
      setAlerts((prev) => prev.filter((entry) => getActionId(entry) !== identity));
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
          <Loader2 className="animate-spin text-blue-500 mx-auto mb-3" size={32} />
          <p className="text-slate-400 text-sm">Cargando seguimiento de mercado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Seguimiento de mercado</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestiona tu wishlist y alertas de precio en tiempo real con datos de CheapShark.
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {refreshing ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Actualizando...
            </>
          ) : (
            <>
              <RefreshCw size={15} /> Actualizar precios
            </>
          )}
        </button>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Juegos en wishlist</p>
          <p className="text-2xl font-bold text-white">{wishlist.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Alertas activas</p>
          <p className="text-2xl font-bold text-blue-400">{activeAlerts}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Objetivos cumplidos</p>
          <p className="text-2xl font-bold text-emerald-400">{triggeredAlerts}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Heart size={18} className="text-rose-400" /> Wishlist
        </h2>

        {wishlist.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            Aún no tienes juegos en wishlist. Desde el detalle de cualquier juego puedes guardarlo.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {wishlist.map((item) => {
              const identity = getActionId(item);
              const detailId = getDetailId(item);
              const savings = typeof item.savings === "number" ? Math.round(item.savings) : 0;

              return (
                <div
                  key={identity || `${item.title}-${item.addedAt}`}
                  className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col"
                >
                  <Link 
                    to={`/game/${detailId}`}
                    state={{ deal: {
                      title: item.title,
                      steamAppID: item.steamAppId,
                      thumb: item.thumb,
                      salePrice: item.currentPrice,
                      normalPrice: item.normalPrice,
                      dealID: "",
                      gameID: item.gameId,
                      storeID: "1"
                    }}}
                    className="block relative aspect-video bg-slate-800 group"
                  >
                    {item.thumb ? (
                      <img src={item.thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                        Sin imagen
                      </div>
                    )}
                    {item.hasDiscount && savings > 0 && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
                        -{savings}%
                      </div>
                    )}
                  </Link>

                  <div className="p-3 flex flex-col flex-1">
                    <Link
                      to={`/game/${detailId}`}
                      className="font-semibold text-slate-100 line-clamp-1 mb-2 hover:text-blue-400 transition-colors text-sm"
                      title={item.title}
                    >
                      {item.title}
                    </Link>

                    <div className="mt-auto flex items-end justify-between">
                      <div className="flex flex-col">
                        {item.hasDiscount && item.normalPrice ? (
                          <span className="text-xs text-slate-500 line-through">
                            {formatPrice(item.normalPrice)}
                          </span>
                        ) : null}
                        <span className="text-base font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                          {formatPrice(item.currentPrice)}
                        </span>
                      </div>

                      <button
                        onClick={() => onRemoveWishlist(item)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        title="Quitar de wishlist"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingDown size={18} className="text-indigo-400" /> Alertas de Precio
        </h2>

        {alerts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No has configurado alertas de precio. Añade alertas desde el detalle de los juegos.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {alerts.map((item) => {
              const identity = getActionId(item);
              const detailId = getDetailId(item);
              const savings = typeof item.savings === "number" ? Math.round(item.savings) : 0;

              return (
                <div
                  key={identity || `alert-${item.title}`}
                  className={`bg-slate-900 border rounded-lg overflow-hidden flex flex-col transition-colors ${
                    item.triggered
                      ? "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      : "border-slate-800"
                  }`}
                >
                  <Link
                    to={`/game/${detailId}`}
                    state={{ deal: {
                      title: item.title,
                      steamAppID: item.steamAppId,
                      thumb: item.thumb,
                      salePrice: item.currentPrice,
                      normalPrice: item.normalPrice,
                      dealID: "",
                      gameID: item.gameId,
                      storeID: "1"
                    }}}
                    className="block relative aspect-video bg-slate-800 group"
                  >
                    {item.thumb ? (
                      <img src={item.thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                        Sin imagen
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      {item.hasDiscount && savings > 0 && (
                        <div className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg">
                          -{savings}%
                        </div>
                      )}
                      {item.triggered && (
                        <div className="bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          ¡OBJETIVO!
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-3 flex flex-col flex-1">
                    <Link
                      to={`/game/${detailId}`}
                      className="font-semibold text-slate-100 line-clamp-1 mb-2 hover:text-blue-400 transition-colors text-sm flex-1"
                      title={item.title}
                    >
                      {item.title}
                    </Link>

                    <div className="flex items-center justify-between py-2 border-t border-slate-800/50 mb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Actual</span>
                        <span className={`text-sm font-bold ${item.triggered ? "text-emerald-400" : "text-slate-200"}`}>
                          {formatPrice(item.currentPrice)}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-slate-800/50" />
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                          Objetivo 
                          <button onClick={() => onEditTarget(item)} className="hover:text-blue-400" title="Editar objetivo">
                            <Pencil size={10} />
                          </button>
                        </span>
                        <span className="text-sm font-bold text-indigo-400">
                          {formatPrice(item.targetPrice)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => onToggleAlert(item)}
                        className={`p-1.5 rounded-md transition-colors flex items-center justify-center flex-1 mr-2 ${
                          item.enabled
                            ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                            : "bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                        }`}
                        title={item.enabled ? "Desactivar alerta" : "Activar alerta"}
                      >
                        {item.enabled ? <Bell size={14} /> : <BellOff size={14} />}
                      </button>
                      <button
                        onClick={() => onDeleteAlert(item)}
                        className="p-1.5 text-slate-500 hover:text-red-400 bg-slate-800 hover:bg-red-500/10 rounded-md transition-colors"
                        title="Eliminar alerta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
