import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  respondToGamingSession,
} from "../../lib/api";
import { useAuth } from "./AuthContext";

export interface AppNotification {
  _id: string;
  type:
    | "session_invite"
    | "session_response"
    | "session_cancelled"
    | "session_updated"
    | "price_alert_triggered"
    | "list_mention";
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  session?: {
    _id: string;
    game: { appId: number; name: string; headerImage: string };
    date: string;
    time: string;
    status: string;
  };
  from?: {
    steamId: string;
    username: string;
    avatar: string;
  };
  data?: Record<string, unknown>;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  pendingInvites: AppNotification[];
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  respondInvite: (
    notificationId: string,
    sessionId: string,
    response: "accepted" | "declined"
  ) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

const POLL_INTERVAL_MS = 15_000; // 15 seconds

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track which invite IDs we've already shown as a toast
  const shownInviteIds = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getNotifications({ limit: 50 });
      const fetched: AppNotification[] = res.data?.notifications ?? [];
      setNotifications(fetched);
    } catch {
      // silently fail — no need to surface polling errors
    }
  }, [user]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchNotifications();
    setLoading(false);
  }, [fetchNotifications]);

  // Start / stop polling based on auth state
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      shownInviteIds.current.clear();
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    // Immediate first fetch
    refresh();

    // Then poll
    pollRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user, fetchNotifications, refresh]);

  const respondedIds = useRef<Set<string>>(new Set());

  const markRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => {
          if (n._id !== id) return n;
          // Don't set readAt locally for unresponded invites — it would hide
          // the toast on next render. The backend is updated but local state
          // keeps readAt null until the user explicitly responds/dismisses.
          if (n.type === "session_invite" && !respondedIds.current.has(id)) {
            return n;
          }
          return { ...n, readAt: new Date().toISOString() };
        })
      );
    } catch {
      // ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? now }))
      );
    } catch {
      // ignore
    }
  }, []);

  const respondInvite = useCallback(
    async (
      notificationId: string,
      sessionId: string,
      response: "accepted" | "declined"
    ) => {
      await respondToGamingSession(sessionId, response);
      // Mark as responded locally so the toast disappears immediately
      respondedIds.current.add(notificationId);
      shownInviteIds.current.add(notificationId);
      // Mark as read in backend too
      await markRead(notificationId);
    },
    [markRead]
  );

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  // Pending invites = session_invites that:
  // - Have no readAt (not yet read/responded, survives page reloads)
  // - Haven't been responded/dismissed in this session
  // readAt is set by the backend when the user responds, so it's the
  // reliable source of truth across reloads.
  // pendingInvites: usado por los toasts flotantes — excluye los ya mostrados
  // en esta sesión para evitar que reaparezcan al hacer polling.
  const pendingInvites = notifications.filter(
    (n) =>
      n.type === "session_invite" &&
      !n.readAt &&
      !respondedIds.current.has(n._id) &&
      !shownInviteIds.current.has(n._id)
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        pendingInvites,
        loading,
        markRead,
        markAllRead,
        respondInvite,
        refresh,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  return ctx;
}