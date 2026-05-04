import { Link, Outlet, useLocation } from "react-router";
import {
  ShoppingBag,
  Bell,
  Users,
  ListOrdered,
  User as UserIcon,
  Menu,
  X,
  Home,
  LogIn,
  LogOut,
  Shield,
  AlertTriangle,
  AlertOctagon,
  MessageSquareOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "motion/react";
import { AssistantModal } from "../ai/AssistantModal";
import { NotificationBell } from "../notifications/NotificationBell";
import { NotificationToasts } from "../notifications/NotificationToasts";
import { useAuth } from "../../context/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginNotices, setLoginNotices] = useState<
    { action: "warned" | "silenced"; reason: string }[]
  >([]);
  const [activeNoticeIndex, setActiveNoticeIndex] = useState(0);
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin" || user?.isAdmin === true;
  const warnedNotice = user?.notices?.find((item) => item.action === "warned");
  const silencedNotice = user?.notices?.find(
    (item) => item.action === "silenced",
  );
  const isWarnedUser =
    Boolean(warnedNotice) ||
    user?.status === "warned" ||
    Boolean(user?.warningReason?.trim());
  const isSilencedUser = Boolean(silencedNotice) || user?.status === "silenced";
  const warningTooltip =
    warnedNotice?.reason || user?.warningReason
      ? `Has sido advertido por: \"${warnedNotice?.reason || user?.warningReason || ""}\". Respeta las normas de la comunidad para no ser baneado por un administrador.`
      : "Has sido advertido por incumplir las normas de la comunidad. Respeta las normas de la comunidad para no ser baneado por un administrador.";
  const silencedTooltip = silencedNotice?.reason
    ? `Has sido silenciado por: \"${silencedNotice.reason}\". No puedes publicar ni comentar hasta que un administrador levante la sanción.`
    : "Has sido silenciado por incumplir las normas de la comunidad. No puedes publicar ni comentar hasta que un administrador levante la sanción.";
  const isLoginPage = location.pathname === "/login";
  const activeNotice = loginNotices[activeNoticeIndex] || null;

  useEffect(() => {
    if (!user) {
      setLoginNotices([]);
      setActiveNoticeIndex(0);
      return;
    }

    const pendingNotice = sessionStorage.getItem("steamates_login_notices");
    if (!pendingNotice) {
      return;
    }

    try {
      const parsed = JSON.parse(pendingNotice) as Array<{
        action?: "warned" | "silenced";
        reason?: string;
      }>;
      const notices = parsed
        .filter(
          (item): item is { action: "warned" | "silenced"; reason: string } =>
            item?.action === "warned" || item?.action === "silenced",
        )
        .map((item) => ({
          action: item.action,
          reason: typeof item.reason === "string" ? item.reason : "",
        }));

      setLoginNotices(notices);
      setActiveNoticeIndex(0);
    } catch {
      setLoginNotices([]);
      setActiveNoticeIndex(0);
    }

    sessionStorage.removeItem("steamates_login_notices");
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [location.pathname]);

  const closeActiveNotice = () => {
    if (activeNoticeIndex < loginNotices.length - 1) {
      setActiveNoticeIndex((current) => current + 1);
      return;
    }

    setLoginNotices([]);
    setActiveNoticeIndex(0);
  };

  const navItems = [
    { name: "Inicio", path: "/", icon: Home },
    { name: "Mercado", path: "/market", icon: ShoppingBag },
    { name: "Listas", path: "/lists", icon: ListOrdered },
    ...(user
      ? [
          { name: "Amigos", path: "/friends", icon: Users },
          { name: "Seguimiento", path: "/market/tracking", icon: Bell },
          { name: "Perfil", path: "/profile", icon: UserIcon },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 fixed h-full z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
            SteaMates
          </h1>
        </div>

        {user && (
          <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-800/50">
            <img
              src={user.avatarfull}
              alt={user.personaname}
              className="w-10 h-10 rounded-full ring-2 ring-blue-500/50"
            />
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate flex items-center gap-1.5">
                <span className="truncate">{user.personaname}</span>
                {isWarnedUser && (
                  <span
                    title={warningTooltip}
                    aria-label={warningTooltip}
                    className="inline-flex shrink-0"
                  >
                    <AlertOctagon size={14} className="text-amber-400" />
                  </span>
                )}
                {isSilencedUser && (
                  <span
                    title={silencedTooltip}
                    aria-label={silencedTooltip}
                    className="inline-flex shrink-0"
                  >
                    <MessageSquareOff size={14} className="text-orange-400" />
                  </span>
                )}
              </p>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>{" "}
                Online
              </p>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-blue-600/20 text-blue-400 font-medium border border-blue-600/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                )}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Notifications bell - only for logged in users */}
          {user && <NotificationBell />}

          {/* Admin Panel Link - Only for admins */}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mt-4 border-t border-slate-800 pt-4",
                location.pathname === "/admin"
                  ? "bg-red-600/20 text-red-400 font-medium border border-red-600/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
              )}
            >
              <Shield size={20} />
              <span>Admin Panel</span>
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800">
          {user ? (
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-xl transition-colors"
            >
              <LogOut size={20} />
              <span className="text-sm">Cerrar Sesión</span>
            </button>
          ) : !isLoginPage ? (
            <Link
              to="/login"
              className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-blue-600/20 rounded-xl transition-colors border border-dashed border-slate-700 hover:border-blue-500/50"
            >
              <LogIn size={20} />
              <span className="text-sm">Iniciar Sesión</span>
            </Link>
          ) : (
            <div
              aria-hidden="true"
              className="invisible flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-slate-700"
            >
              <LogIn size={20} />
              <span className="text-sm">Iniciar Sesión</span>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between p-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
          SteaMates
        </h1>
        <div className="flex items-center gap-4">
          {user && (
            <img src={user.avatarfull} className="w-8 h-8 rounded-full" />
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-300 hover:bg-slate-800 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-20 bg-slate-950 pt-20 px-4 md:hidden"
          >
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-4 rounded-xl text-lg",
                      isActive
                        ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                        : "text-slate-400 hover:bg-slate-800",
                    )}
                  >
                    <Icon size={24} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {/* Admin Panel Link - Mobile */}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-4 rounded-xl text-lg mt-4 border-t border-slate-800 pt-4",
                    location.pathname === "/admin"
                      ? "bg-red-600/20 text-red-400 border border-red-600/30"
                      : "text-slate-400 hover:bg-slate-800",
                  )}
                >
                  <Shield size={24} />
                  <span>Admin Panel</span>
                </Link>
              )}

              <div className="pt-8 border-t border-slate-800 mt-4">
                {user ? (
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-red-400 block p-4 text-center border border-slate-800 rounded-xl hover:bg-slate-900"
                  >
                    Cerrar Sesión
                  </button>
                ) : !isLoginPage ? (
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-blue-400 block p-4 text-center border border-blue-900/50 rounded-xl hover:bg-blue-900/20"
                  >
                    Iniciar Sesión con Steam
                  </Link>
                ) : (
                  <div
                    aria-hidden="true"
                    className="invisible block p-4 text-center border border-blue-900/50 rounded-xl"
                  >
                    Iniciar Sesión con Steam
                  </div>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 w-full pt-20 md:pt-0 p-4 md:p-8 overflow-x-hidden">
        <div
          className={cn(
            "w-full",
            location.pathname !== "/login" &&
              location.pathname !== "/" &&
              "mt-6",
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <AssistantModal />

      {/* Floating invite toasts */}
      <NotificationToasts />

      <AlertDialog
        open={Boolean(activeNotice)}
        onOpenChange={(open) => {
          if (!open && activeNotice) {
            closeActiveNotice();
          }
        }}
      >
        <AlertDialogContent className="border-amber-500/30 bg-slate-950 text-slate-100 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle size={18} />
              {activeNotice?.action === "silenced"
                ? "Cuenta silenciada"
                : "Cuenta advertida"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 leading-6">
              {activeNotice?.action === "silenced" ? (
                <>
                  {activeNotice.reason ? (
                    <>
                      Has sido silenciado por:{" "}
                      <span className="text-slate-100">
                        "{activeNotice.reason}"
                      </span>
                      .
                    </>
                  ) : (
                    <>
                      Has sido silenciado por incumplir las normas de la
                      comunidad.
                    </>
                  )}
                  <br />
                  No podrás publicar ni comentar hasta que un administrador
                  levante la sanción.
                </>
              ) : (
                <>
                  {activeNotice?.reason ? (
                    <>
                      Has sido advertido por:{" "}
                      <span className="text-slate-100">
                        "{activeNotice.reason}"
                      </span>
                      .
                    </>
                  ) : (
                    <>
                      Has sido advertido por incumplir las normas de la
                      comunidad.
                    </>
                  )}
                  <br />
                  Respeta las normas de la comunidad para no ser baneado por un
                  administrador.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-amber-500 text-slate-950 hover:bg-amber-400">
              {activeNoticeIndex < loginNotices.length - 1
                ? "Siguiente"
                : "Entendido"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
