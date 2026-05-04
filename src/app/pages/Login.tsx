import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate, useLocation } from "react-router";
import {
  Gamepad2,
  Shield,
  Zap,
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

const heroImage =
  "https://www.figma.com/api/mcp/asset/dc41ab6e-19d1-44f5-9001-cf6d17001138";
const steamLogo =
  "https://store.akamai.steamstatic.com/public/shared/images/header/logo_steam.svg";

export function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [bannedReason, setBannedReason] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("error") !== "user_banned") {
      return;
    }

    setBannedReason(params.get("reason") || "");
    localStorage.removeItem("steamates_user");
    localStorage.removeItem("steamates_token");
    window.history.replaceState({}, "", window.location.pathname);
  }, [location.search, location.pathname]);

  if (user) {
    return <Navigate to="/profile" replace />;
  }

  const features = [
    {
      icon: DollarSign,
      title: "Ofertas inteligentes",
      desc: "Mínimos históricos y alertas de precio en tiempo real.",
      bg: "bg-[rgba(43,127,255,0.1)]",
      border: "border-[rgba(43,127,255,0.2)]",
      iconColor: "text-[#51a2ff]",
    },
    {
      icon: Users,
      title: "Juega con amigos",
      desc: "Organiza sesiones, compara bibliotecas y vota listas.",
      bg: "bg-[rgba(173,70,255,0.1)]",
      border: "border-[rgba(173,70,255,0.2)]",
      iconColor: "text-[#c27aff]",
    },
    {
      icon: TrendingUp,
      title: "Tu perfil gaming",
      desc: "Estadísticas, rentabilidad y tendencias de tu biblioteca.",
      bg: "bg-[rgba(0,188,125,0.1)]",
      border: "border-[rgba(0,188,125,0.2)]",
      iconColor: "text-[#00bc7d]",
    },
  ];

  const stats = [
    { value: "12K+", label: "Jugadores" },
    { value: "850K", label: "Horas rastreadas" },
    { value: "3.2K", label: "Listas creadas" },
  ];

  return (
    <div className="flex flex-col lg:flex-row -m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#020618]">
      {/* Left: Hero section */}
      <div className="flex-1 relative overflow-hidden min-h-[50vh] lg:min-h-screen">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#020618] via-[rgba(2,6,24,0.85)] to-[rgba(2,6,24,0.7)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020618] via-transparent to-[rgba(2,6,24,0.4)]" />
        {/* Colored blurs */}
        <div className="absolute top-20 left-20 w-80 h-80 bg-[rgba(43,127,255,0.08)] rounded-full blur-[120px]" />
        <div className="absolute bottom-40 right-10 w-60 h-60 bg-[rgba(173,70,255,0.06)] rounded-full blur-[100px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center h-full py-12 px-6 sm:px-10 lg:px-16">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div
              className="w-10 h-10 rounded-[14px] flex items-center justify-center shadow-[0px_10px_15px_0px_rgba(43,127,255,0.2),0px_4px_6px_0px_rgba(43,127,255,0.2)] rotate-3 shrink-0"
              style={{
                background: "linear-gradient(135deg, #00d3f3 0%, #155dfc 100%)",
              }}
            >
              <Gamepad2 size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              SteaMates
            </span>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              Tu vida gaming,
            </h1>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #51a2ff 0%, #c27aff 100%)",
              }}
            >
              mejor organizada
            </h1>
          </div>

          {/* Description */}
          <p className="text-[#90a1b9] text-base leading-relaxed max-w-[430px] mb-8">
            Conecta tu cuenta de Steam y descubre una nueva forma de gestionar
            tu biblioteca, encontrar ofertas y jugar con amigos.
          </p>

          {/* Features */}
          <div className="flex flex-col gap-4 mb-8">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="flex items-start gap-3">
                  <div
                    className={`w-[34px] h-[34px] shrink-0 rounded-[10px] border ${feat.bg} ${feat.border} flex items-center justify-center`}
                  >
                    <Icon size={16} className={feat.iconColor} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white leading-5">
                      {feat.title}
                    </p>
                    <p className="text-xs text-[#62748e] leading-4">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 sm:gap-8 pt-4 border-t border-[rgba(29,41,61,0.5)]">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-[#62748e] uppercase tracking-[0.5px]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login card */}
      <div className="flex items-center justify-center lg:w-[480px] shrink-0 px-6 py-12 lg:py-0">
        <div
          className="w-full max-w-[350px] rounded-[16px] border border-[#1d293d] shadow-[0px_25px_50px_0px_rgba(0,0,0,0.25)] p-10 flex flex-col gap-5"
          style={{ background: "rgba(15,23,43,0.5)" }}
        >
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Bienvenido</h2>
            <p className="text-[#62748e] text-sm leading-5">
              Inicia sesión para acceder a todas las funciones
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={login}
              className="w-full flex items-center justify-center gap-3 h-[58px] bg-[#171a21] border border-[#2a475e] rounded-[14px] text-[#c5c3c0] font-bold text-base hover:bg-[#1e2535] hover:border-[#3d6b8f] transition-colors shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
            >
              <img
                src={steamLogo}
                alt="Steam"
                className="w-6 h-6 brightness-200"
              />
              Iniciar Sesión con Steam
            </button>

            {/*
            <button
              onClick={login}
              className="w-full flex items-center gap-4 h-[82px] bg-[#171a21] border border-[#2a475e] rounded-[14px] px-6 text-[#c5c3c0] font-bold text-base hover:bg-[#1e2535] hover:border-[#3d6b8f] transition-colors shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
            >
              <img
                src={steamLogo}
                alt="Steam"
                className="w-6 h-6 brightness-200 shrink-0"
              />
              <span className="text-center flex-1 leading-6">
                Iniciar Sesión como
                <br />
                Administrador
              </span>
            </button>
            */}
          </div>

          {/* Info boxes */}
          <div className="flex flex-col gap-3">
            <div className="rounded-[10px] border border-[#1d293d] bg-[rgba(29,41,61,0.3)] p-3 flex items-start gap-3">
              <Shield size={14} className="text-[#45556c] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#45556c] leading-[1.625]">
                Usamos la autenticación oficial de Steam. Nunca almacenamos tu
                contraseña ni datos sensibles.
              </p>
            </div>

            <div
              className="rounded-[10px] p-3 flex items-start gap-3"
              style={{
                background: "rgba(43,127,255,0.05)",
                border: "1px solid rgba(43,127,255,0.2)",
              }}
            >
              <Zap size={14} className="text-[#51a2ff] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#51a2ff] leading-[1.625]">
                Al iniciar sesión podrás crear listas, votar y comentar en la
                comunidad.
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-[#314158] text-center leading-relaxed">
            Al continuar, aceptas los Términos de Servicio y la Política de
            Privacidad.
            <br />
            No estamos afiliados a Valve Corporation.
          </p>
        </div>
      </div>

      <AlertDialog open={Boolean(bannedReason)} onOpenChange={(open) => !open && setBannedReason("")}>
        <AlertDialogContent className="border-red-500/30 bg-slate-950 text-slate-100 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={18} /> Cuenta baneada
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 leading-6">
              {bannedReason ? (
                <>
                  Has sido baneado por: <span className="text-slate-100">"{bannedReason}"</span>.
                  No puedes iniciar sesión hasta que un administrador revise tu caso.
                </>
              ) : (
                <>
                  Has sido baneado por incumplir las normas de la comunidad.
                  No puedes iniciar sesión hasta que un administrador revise tu caso.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-red-500 text-white hover:bg-red-400">
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
