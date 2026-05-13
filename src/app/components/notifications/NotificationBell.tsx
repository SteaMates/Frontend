import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Gamepad2,
  Check,
  X,
  Clock,
  User,
  BellDot,
  Bell,
  CheckCheck,
  Loader2,
} from "lucide-react";
import {
  useNotifications,
  AppNotification,
} from "../../context/NotificationsContext";
import { toast } from "sonner";

// ============================================================================
// COMPONENTES DE TOASTS FLOTANTES (INVITACIONES A SESIONES, ETC)
// ============================================================================

function InviteToast({ n, onDismiss }: { n: AppNotification; onDismiss: () => void }) {
  const { respondInvite } = useNotifications();
  const [responding, setResponding] = useState<"accepted" | "declined" | null>(null);

  const sessionId = n.session?._id ?? (n.data?.sessionId as string | undefined);
  const gameName = n.session?.game?.name ?? (n.data?.game as { name?: string })?.name ?? "sesión";
  const gameImage = n.session?.game?.headerImage ?? (n.data?.game as { headerImage?: string })?.headerImage;
  const date = n.session?.date ?? (n.data?.date as string | undefined);
  const time = n.session?.time ?? (n.data?.time as string | undefined);

  const handleRespond = async (response: "accepted" | "declined") => {
    if (!sessionId || responding) return;
    setResponding(response);
    try {
      await respondInvite(n._id, sessionId, response);
      if (response === "accepted") {
        toast.success(`¡Sesión aceptada! Nos vemos en ${gameName} 🎮`);
      } else {
        toast.info(`Invitación rechazada`);
      }
      onDismiss();
    } catch {
      toast.error("Error al responder la invitación");
      setResponding(null);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="w-80 bg-slate-900 border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Game banner */}
      {gameImage && (
        <div className="relative h-16 overflow-hidden">
          <img
            src={gameImage}
            alt={gameName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
            <Gamepad2 size={13} className="text-blue-400" />
            <span className="text-xs font-semibold text-white truncate max-w-[200px]">
              {gameName}
            </span>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Sender info */}
        <div className="flex items-center gap-2.5 mb-3">
          {n.from?.avatar ? (
            <img
              src={n.from.avatar}
              alt={n.from.username}
              className="w-8 h-8 rounded-full ring-2 ring-blue-500/40"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center ring-2 ring-slate-600">
              <User size={15} className="text-slate-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-100">
              {n.from?.username ?? "Un amigo"}
            </p>
            <p className="text-xs text-blue-400">Te ha invitado a jugar</p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="ml-auto p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Game / time info */}
        {!gameImage && (
          <p className="text-sm text-slate-200 font-medium mb-2 flex items-center gap-1.5">
            <Gamepad2 size={14} className="text-blue-400 shrink-0" />
            {gameName}
          </p>
        )}

        {date && time && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-4">
            <Clock size={12} className="shrink-0" />
            {date} a las {time}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleRespond("accepted")}
            disabled={!!responding}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {responding === "accepted" ? (
              <span className="animate-pulse">...</span>
            ) : (
              <>
                <Check size={15} />
                Aceptar
              </>
            )}
          </button>
          <button
            onClick={() => handleRespond("declined")}
            disabled={!!responding}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 text-sm font-semibold transition-colors"
          >
            {responding === "declined" ? (
              <span className="animate-pulse">...</span>
            ) : (
              <>
                <X size={15} />
                Rechazar
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------------
// TOAST CONTENEDOR GLOBAL
// ----------------------------------------------------------------------------

export function NotificationToasts() {
  const { pendingInvites, markRead } = useNotifications();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = pendingInvites.filter((n) => !dismissed.has(n._id));

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    markRead(id);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visible.map((n) => (
          <div key={n._id} className="pointer-events-auto">
            <InviteToast n={n} onDismiss={() => dismiss(n._id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// COMPONENTES DE LA CAMPANA (DROPDOWN Y ELEMENTOS DE LISTA)
// ============================================================================

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function NotificationItem({
  n,
  onRead,
  onClosePanel
}: {
  n: AppNotification;
  onRead: (id: string) => void;
  onClosePanel: () => void;
}) {
  const navigate = useNavigate();
  const isUnread = !n.readAt;

  const typeColors: Record<string, string> = {
    session_invite: "bg-blue-500",
    session_response: "bg-green-500",
    session_cancelled: "bg-red-500",
    session_updated: "bg-amber-500",
    price_alert_triggered: "bg-purple-500",
    list_mention: "bg-[#51a2ff]",
  };

  const handleClick = () => {
    if (isUnread) {
      onRead(n._id);
    }

    let didNavigate = false;

    if (n.type === "session_invite") {
      const sessionId = n.session?._id || n.data?.sessionId;
      navigate(`/friends${sessionId ? `#session-${sessionId}` : ""}`);
      didNavigate = true;
    } else if (n.type === "price_alert_triggered") {
      if (n.data?.gameId || n.data?.steamAppId) {
        navigate(`/game/${n.data.steamAppId || n.data.gameId}`);
        didNavigate = true;
      }
    } else if (n.type === "list_mention") {
      if (n.data?.listId) {
        const commentId = n.data?.commentId;
        navigate(`/lists/${n.data.listId}${commentId ? `#comment-${commentId}` : ""}`);
        didNavigate = true;
      }
    }

    if (didNavigate) {
      onClosePanel();
    }
  };

  return (
    <div
      className={`px-4 py-3 flex gap-3 items-start transition-colors hover:bg-slate-800/60 cursor-pointer ${isUnread ? "bg-slate-800/30" : ""
        }`}
      onClick={handleClick}
    >
      <div className="relative shrink-0 mt-0.5">
        {n.from?.avatar ? (
          <img
            src={n.from.avatar}
            alt={n.from.username}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            <Gamepad2 size={16} className="text-slate-400" />
          </div>
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${typeColors[n.type] ?? "bg-slate-500"
            }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100 leading-tight">
          {n.title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">
          {n.message}
        </p>
        <p className="text-xs text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
      </div>

      {isUnread && (
        <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-blue-400" />
      )}
    </div>
  );
}

export function NotificationBell({
  variant = "floating",
  buttonClassName,
}: {
  variant?: "floating" | "sidebar" | "mobile";
  buttonClassName?: string;
}) {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    loading,
    refresh,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const positionPanel = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const isMobile = variant === "mobile" || window.innerWidth < 768;
    const panelWidth = isMobile
      ? Math.max(260, Math.min(window.innerWidth - 32, 420))
      : 320;

    setOpenUpward(spaceBelow < 500 && !isMobile);

    let left = isMobile
      ? Math.max(16, Math.round((window.innerWidth - panelWidth) / 2))
      : Math.round(rect.right + 8);

    if (!isMobile && left + panelWidth > window.innerWidth - 12) {
      left = Math.max(12, Math.round(rect.left - panelWidth - 8));
    }

    const top = openUpward
      ? Math.round(rect.top - 8)
      : Math.round(rect.bottom + 8);

    setPanelStyle({
      left,
      top,
      width: panelWidth,
    });
  };

  const handleOpen = () => {
    if (!open) {
      positionPanel();
      refresh();
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;

    const handleResize = () => positionPanel();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [open, variant, openUpward]);

  return (
    <div ref={panelRef} className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={
          variant === "floating"
            ? `relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-blue-500/50 shadow-lg shadow-black/30 transition-all hover:scale-110 ${buttonClassName ?? ""}`
            : `relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-slate-200 w-full ${buttonClassName ?? ""}`
        }
        aria-label="Notificaciones"
      >
        <BellDot size={variant === "floating" ? 22 : 20} />
        {variant !== "floating" && <span>Notificaciones</span>}
        {unreadCount > 0 && (
          <span
            className={
              variant === "floating"
                ? "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none border-2 border-slate-950"
                : "ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold leading-none"
            }
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl z-50 overflow-hidden"
            style={{
              ...panelStyle,
              maxHeight: "480px",
              transform: openUpward ? "translateY(-100%)" : "translateY(0)",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="font-semibold text-slate-100 text-sm">
                Notificaciones
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs text-blue-400">
                    ({unreadCount} nuevas)
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {loading && (
                  <Loader2 size={14} className="animate-spin text-slate-500" />
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    title="Marcar todo como leído"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <CheckCheck size={15} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: "340px" }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Bell size={32} className="mb-3 opacity-30" />
                  <p className="text-sm">Sin notificaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {notifications.map((n) => (
                    <NotificationItem
                      key={n._id}
                      n={n}
                      onRead={markRead}
                      onClosePanel={() => setOpen(false)}
                    />
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t border-slate-800 px-4 py-2.5 flex justify-end">
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <Check size={12} />
                  Marcar todo como leído
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}