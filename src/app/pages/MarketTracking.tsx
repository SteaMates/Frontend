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
                  <div className="aspect-[16/9] bg-slate-800">
                    {item.thumb ? (
                      <img src={item.thumb} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <div className="p-3 space-y-2 flex-grow flex flex-col">
                    {detailId ? (
                      <Link to={`/game/${detailId}`} className="font-medium text-sm text-slate-100 hover:text-blue-400 line-clamp-2">
                        {item.title}
                      </Link>
                    ) : (
                      <p className="font-medium text-sm text-slate-100 line-clamp-2">{item.title}</p>
                    )}

                    <div className="mt-auto pt-2">
                      <p className="text-slate-500 text-[10px]">Precio actual</p>
                      <div className="flex items-end gap-1.5 line-clamp-1">
                        <span className="text-emerald-400 text-base font-bold leading-none">{formatPrice(item.currentPrice)}</span>
                        {typeof item.normalPrice === "number" && item.normalPrice > (item.currentPrice || 0) && (
                          <span className="text-slate-500 line-through text-[10px] pb-0.5">
                            {formatPrice(item.normalPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {savings > 0 && (
                      <div className="inline-flex w-fit items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                        <TrendingDown size={10} /> {savings}% dto
                      </div>
                    )}

                    <button
                      onClick={() => onRemoveWishlist(item)}
                      className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                    >
                      <Trash2 size={12} /> Quitar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell size={18} className="text-amber-400" /> Alertas de precio
        </h2>

        {alerts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No tienes alertas activas. Crea una desde la vista detalle de un juego.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((item) => {
              const identity = getActionId(item);
              const detailId = getDetailId(item);
              const isTriggered = Boolean(item.triggered);

              return (
                <div
                  key={identity || `${item.title}-${item.updatedAt}`}
                  className={`rounded-xl border p-4 ${
                    isTriggered
                      ? "bg-emerald-900/10 border-emerald-500/30"
                      : "bg-slate-900 border-slate-800"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        {detailId ? (
                          <Link to={`/game/${detailId}`} className="text-white font-semibold hover:text-blue-400">
                            {item.title}
                          </Link>
                        ) : (
                          <p className="text-white font-semibold">{item.title}</p>
                        )}

                        {!item.enabled && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-600 text-slate-300">
                            Pausada
                          </span>
                        )}
                        {isTriggered && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
                            Objetivo alcanzado
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-sm text-slate-300 flex flex-wrap items-center gap-4">
                        <span>
                          Actual: <strong className="text-white">{formatPrice(item.currentPrice)}</strong>
                        </span>
                        <span>
                          Objetivo: <strong className="text-amber-300">{formatPrice(item.targetPrice ?? null)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onEditTarget(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition-colors"
                      >
                        <Pencil size={14} /> Editar objetivo
                      </button>

                      <button
                        onClick={() => onToggleAlert(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
                          item.enabled
                            ? "border-amber-700/40 bg-amber-900/20 hover:bg-amber-900/30 text-amber-300"
                            : "border-blue-700/40 bg-blue-900/20 hover:bg-blue-900/30 text-blue-300"
                        }`}
                      >
                        {item.enabled ? <BellOff size={14} /> : <Bell size={14} />}
                        {item.enabled ? "Pausar" : "Activar"}
                      </button>

                      <button
                        onClick={() => onDeleteAlert(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-700/40 bg-red-900/20 hover:bg-red-900/30 text-red-300 text-sm transition-colors"
                      >
                        <Trash2 size={14} /> Eliminar
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
