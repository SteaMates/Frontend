/**
 * Nombre del fichero: NotificationToasts.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gamepad2, Check, X, Clock, User } from "lucide-react";
import { useNotifications, AppNotification } from "../../context/NotificationsContext";
import { toast } from "sonner";

/**
 * Función: InviteToast
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * InviteToast. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
function InviteToast({ n, onDismiss }: { n: AppNotification; onDismiss: () => void }) {
  const { respondInvite } = useNotifications();
  const [responding, setResponding] = useState<"accepted" | "declined" | null>(null);

  const sessionId = n.session?._id ?? (n.data?.sessionId as string | undefined);
  const gameName = n.session?.game?.name ?? (n.data?.game as { name?: string })?.name ?? "sesión";
  const gameImage = n.session?.game?.headerImage ?? (n.data?.game as { headerImage?: string })?.headerImage;
  const date = n.session?.date ?? (n.data?.date as string | undefined);
  const time = n.session?.time ?? (n.data?.time as string | undefined);

  /**
                 * Función: handleRespond
         * Descripción: Manejador de eventos (handler) diseñado para responder a la acción de
         * respond. Captura la interacción del usuario o del sistema, valida el
         * contexto de ejecución y dispara las actualizaciones de estado necesarias
         * en la aplicación.
                 */
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

/**
 * Renders floating invite toasts in the bottom-right corner.
 * Place this once inside Layout — it reads from NotificationsContext.
 */
export function NotificationToasts() {
  const { pendingInvites } = useNotifications();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Visible = pending invites not yet dismissed locally in this tab
  const visible = pendingInvites.filter((n) => !dismissed.has(n._id));

  // Dismiss without responding (X button) — hide locally only.
  // We DO NOT mark as read, so the invite stays pending and the user can
  // still accept/decline it from the bell panel.
  /**
                 * Función: dismiss
         * Descripción: Función auxiliar de propósito general especializada en dismiss. Contiene
         * lógica específica para transformar datos, realizar cálculos o conectar
         * diferentes partes del sistema según los requisitos del módulo.
                 */
    const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
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