import { useEffect, useState, type ReactNode } from "react";
import {
  Users,
  Gamepad2,
  Loader2,
  BarChart2,
  CalendarDays,
  Check,
  Wallet,
  Clock,
  Trophy,
  Hexagon,
  TrendingDown,
  Crown,
  ShoppingBag,
  DollarSign,
  Star,
  Medal,
  Sparkles,
  Gem,
  Shield,
  Search,
  Bell,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Navigate, useLocation } from "react-router";
import api, {
  getCommonGames,
  getMyGamingSessions,
  getNotifications,
  cancelGamingSession,
  leaveGamingSession,
} from "../../lib/api";
import {
  SessionBooking,
  UpcomingSessions,
  type ScheduledSession,
  type SessionGame,
} from "../components/SessionBooking";
import { UserProfileLink } from "../components/UserProfileLink";

interface Friend {
  steamId: string;
  username: string;
  avatar: string;
  status: number;
  currentGame: string | null;
  friendSince?: number;
}

interface CommonGame extends SessionGame {
  owners: number;
  lastPlayed?: number;
}

interface SessionApiItem {
  _id: string;
  host?: {
    steamId?: string;
    username?: string;
    avatar?: string;
  };
  game: {
    appId?: number;
    appid?: number;
    name: string;
    headerImage?: string;
  };
  date: string;
  time: string;
  participants?: Array<{
    user?: {
      steamId?: string;
      username?: string;
      avatar?: string;
    };
    status?: "invited" | "accepted" | "declined";
  }>;
  status?: "scheduled" | "cancelled";
}

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  readAt?: string | null;
}

type Tab = "amigos" | "analitica" | "sesiones";

interface ComparePlayer {
  steamId: string;
  economy: {
    costPerHour: number;
    unplayedPct: number;
    libraryValue: number;
    totalGames: number;
    unplayed: number;
  };
  time: {
    totalHours: number;
    topGame: string;
    topGameHours: number;
    topGamePct: number;
  };
  achievements: {
    completionPct: number;
    totalAchievements: number;
    perfectGames: number;
    totalGames: number;
    rarestAchievement: string | null;
    rarestGame: string | null;
    rarityPct: number | null;
  };
  radar: {
    raw: Record<string, number>;
    scores: {
      volumen: number;
      dedicacion: number;
      rentabilidad: number;
      perfeccionismo: number;
      fidelidad: number;
    };
    average: number;
    archetype: string;
    archetypeEmoji: string;
    quote: string;
  };
}

interface AnalyticsPerson {
  steamId: string;
  name: string;
  color: string;
  economy: ComparePlayer["economy"];
  time: ComparePlayer["time"];
  achievements: ComparePlayer["achievements"];
  radar: ComparePlayer["radar"];
}

interface AuthUser {
  steamid?: string;
  personaname?: string;
}

const PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
];

type RadarAxisKey =
  | "volumen"
  | "dedicacion"
  | "rentabilidad"
  | "perfeccionismo"
  | "fidelidad";

const RADAR_AXES: {
  key: RadarAxisKey;
  emoji: string;
  label: string;
  description: string;
}[] = [
    {
      key: "volumen",
      emoji: "📚",
      label: "Volumen",
      description: "Tamano de la biblioteca",
    },
    {
      key: "dedicacion",
      emoji: "⏰",
      label: "Dedicacion",
      description: "Horas totales jugadas",
    },
    {
      key: "rentabilidad",
      emoji: "💰",
      label: "Rentabilidad",
      description: "Menor coste por hora",
    },
    {
      key: "perfeccionismo",
      emoji: "🏆",
      label: "Perfeccionismo",
      description: "Tasa de logros completados",
    },
    {
      key: "fidelidad",
      emoji: "❤️",
      label: "Fidelidad",
      description: "Horas concentradas en su top 1",
    },
  ];

function DonutChart({
  pct,
  color,
  size = 100,
}: {
  pct: number;
  color: string;
  size?: number;
}) {
  const safePct = Math.max(0, Math.min(100, pct));
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (safePct / 100) * c;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#1e293b"
        strokeWidth="10"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

type AnalyticsSubTab = "economia" | "tiempo" | "logros" | "radar";

function AnalyticsPanel({
  selectedFriends,
  user,
}: {
  selectedFriends: Friend[];
  user: AuthUser;
}) {
  const [subTab, setSubTab] = useState<AnalyticsSubTab>("economia");
  const [comparePlayers, setComparePlayers] = useState<ComparePlayer[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const loadCompareStats = async () => {
      if (!user?.steamid) return;

      const steamIds = [user.steamid, ...selectedFriends.map((f) => f.steamId)];

      setLoadingStats(true);
      try {
        const res = await api.post("/api/steam/stats/compare", { steamIds });
        setComparePlayers(res.data?.players || []);
      } catch (error) {
        console.error("Error loading compare stats:", error);
        setComparePlayers([]);
      } finally {
        setLoadingStats(false);
      }
    };

    loadCompareStats();
  }, [user?.steamid, selectedFriends]);

  const selectedMap = new Map(selectedFriends.map((f) => [f.steamId, f]));

  const people: AnalyticsPerson[] = comparePlayers.map((p, i) => {
    const isMe = p.steamId === user?.steamid;
    const friend = selectedMap.get(p.steamId);

    return {
      steamId: p.steamId,
      name: isMe ? user?.personaname || "Yo" : friend?.username || "Amigo",
      color: PALETTE[i] ?? PALETTE[PALETTE.length - 1],
      economy: p.economy,
      time: p.time,
      achievements: p.achievements,
      radar: p.radar,
    };
  });

  const rentSorted = [...people].sort(
    (a, b) => a.economy.costPerHour - b.economy.costPerHour,
  );
  const maxCost =
    Math.max(...people.map((p) => p.economy.costPerHour), 0.6) || 0.6;
  const bestRent = rentSorted[0]?.name || "-";

  const libSorted = [...people].sort(
    (a, b) => b.economy.libraryValue - a.economy.libraryValue,
  );
  const totalValue = people.reduce((s, p) => s + p.economy.libraryValue, 0);
  const bestLib = libSorted[0]?.name || "-";

  const peopleWithTime = [...people];
  const hoursSorted = [...peopleWithTime].sort(
    (a, b) => b.time.totalHours - a.time.totalHours,
  );
  const maxHours = Math.max(
    ...peopleWithTime.map((p) => p.time.totalHours),
    100,
  );
  const bestTime = hoursSorted[0]?.name || "-";
  const bestTimeDays = Math.floor((hoursSorted[0]?.time.totalHours || 0) / 24);
  const bestTimeYears = ((bestTimeDays || 0) / 365).toFixed(1);

  const subTabs: {
    id: AnalyticsSubTab;
    label: string;
    icon: ReactNode;
    activeClass: string;
  }[] = [
      {
        id: "economia",
        label: "Economía",
        icon: <Wallet size={16} />,
        activeClass: "bg-[#009966] shadow-[0px_10px_15px_0px_rgba(0,79,59,0.3)]",
      },
      {
        id: "tiempo",
        label: "Tiempo",
        icon: <Clock size={16} />,
        activeClass:
          "bg-[#155dfc] shadow-[0px_10px_15px_0px_rgba(28,57,142,0.3)]",
      },
      {
        id: "logros",
        label: "Logros",
        icon: <Trophy size={16} />,
        activeClass: "bg-[#e17100] shadow-[0px_10px_15px_0px_rgba(123,51,6,0.3)]",
      },
      {
        id: "radar",
        label: "Radar",
        icon: <Hexagon size={16} />,
        activeClass:
          "bg-[#005ad3] shadow-[0px_10px_15px_0px_rgba(0,90,211,0.35)]",
      },
    ];

  if (loadingStats) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );
  }

  if (!loadingStats && people.length === 0) {
    return (
      <div className="text-center py-16 text-[#90a1b9]">
        No hay estadísticas disponibles para comparar.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center p-2 gap-1 bg-[rgba(15,23,43,0.6)] border border-[#1d293d] rounded-[16px]">
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-2 flex-1 justify-center py-2.5 rounded-[14px] text-sm font-semibold transition-all ${subTab === t.id
              ? `${t.activeClass} text-white`
              : "text-[#90a1b9] hover:text-white"
              }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {subTab === "economia" && (
        <>
          <div
            className="flex items-center gap-4 px-6 py-5 rounded-[24px] border border-[rgba(0,188,125,0.2)]"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,79,59,0.3) 0%, rgba(13,84,43,0.2) 50%, rgba(11,79,74,0.3) 100%)",
            }}
          >
            <div className="w-[52px] h-[52px] shrink-0 bg-[rgba(0,188,125,0.2)] rounded-[16px] flex items-center justify-center">
              <Wallet size={28} className="text-[#00bc7d]" />
            </div>
            <div>
              <h2 className="text-[24px] font-bold text-white">
                Factor Económico
              </h2>
              <p className="text-[#90a1b9] text-[14px]">
                La cartera y la rentabilidad — ¿quién aprovecha mejor cada euro?
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[24px] p-6 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown size={20} className="text-[#62748e]" />
                    <h3 className="text-white font-bold text-[18px]">
                      Rentabilidad Máxima
                    </h3>
                  </div>
                  <p className="text-[#62748e] text-[12px] max-w-[200px] leading-relaxed">
                    Coste por hora jugada (€/h) — menor = mejor inversor
                  </p>
                </div>
                <div className="px-3 py-1 bg-[rgba(0,188,125,0.1)] border border-[rgba(0,188,125,0.2)] rounded-full flex items-center gap-1.5 shrink-0">
                  <Crown size={12} className="text-[#00d492]" />
                  <span className="text-[#00d492] text-[10px] font-bold">
                    {bestRent}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                {rentSorted.map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-[#94a3b8] text-[12px] w-20 text-right truncate shrink-0">
                      {p.name}
                    </span>
                    <div className="flex-1 h-4 bg-[#0f172b] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(p.economy.costPerHour / maxCost) * 100}%`,
                          backgroundColor: p.color,
                          transition: "width 0.7s ease",
                        }}
                      />
                    </div>
                    <span className="text-[#94a3b8] text-[11px] w-12 shrink-0">
                      {p.economy.costPerHour.toFixed(2)}€
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-3 pl-24 pr-10">
                {["0.00€", "0.15€", "0.30€", "0.45€", "0.60€"].map((v) => (
                  <span key={v} className="text-[#64748b] text-[10px]">
                    {v}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[24px] p-6 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag size={20} className="text-[#62748e]" />
                  <h3 className="text-white font-bold text-[18px]">
                    El "Diógenes Digital"
                  </h3>
                </div>
                <p className="text-[#62748e] text-[12px]">
                  El backlog de la vergüenza — % de juegos con 0 horas
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {people.map((p) => (
                  <div key={p.name} className="flex flex-col items-center">
                    <div
                      className="relative"
                      style={{ width: 100, height: 100 }}
                    >
                      <DonutChart
                        pct={p.economy.unplayedPct}
                        color={p.color}
                        size={100}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="font-black text-[20px]"
                          style={{ color: p.color }}
                        >
                          {p.economy.unplayedPct}%
                        </span>
                      </div>
                    </div>
                    <p className="text-white text-[12px] font-bold mt-1 text-center truncate w-full">
                      {p.name}
                    </p>
                    <p className="text-[#62748e] text-[10px] text-center">
                      {p.economy.unplayed} de {p.economy.totalGames} sin abrir
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[24px] p-6 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign size={20} className="text-[#62748e]" />
                  <h3 className="text-white font-bold text-[18px]">
                    Valor Total de la Biblioteca
                  </h3>
                </div>
                <p className="text-[#62748e] text-[12px]">
                  Valor estimado de todos los juegos (precio base, €)
                </p>
              </div>
              <div className="px-3 py-1 bg-[rgba(0,201,80,0.1)] border border-[rgba(0,201,80,0.2)] rounded-full flex items-center gap-1.5 shrink-0">
                <Crown size={12} className="text-[#05df72]" />
                <span className="text-[#05df72] text-[10px] font-bold">
                  {bestLib}
                </span>
              </div>
            </div>

            <div className="flex h-[220px] gap-[3px] rounded-[12px] overflow-hidden">
              {libSorted.slice(0, 3).map((p, idx) => (
                <div
                  key={p.name}
                  className="relative flex flex-col justify-end p-3 min-w-[55px] hover:brightness-110 transition-all cursor-default"
                  style={{
                    flex: p.economy.libraryValue,
                    background: `linear-gradient(180deg, ${p.color}1a 0%, ${p.color}44 100%)`,
                    border: `1px solid ${p.color}44`,
                    borderRadius: "8px",
                  }}
                >
                  <span
                    className="text-xs font-bold mb-0.5"
                    style={{ color: idx === 0 ? "#fbbf24" : "#94a3b8" }}
                  >
                    {idx === 0 ? "👑" : `#${idx + 1}`}
                  </span>
                  <p className="text-white font-bold text-[13px] truncate">
                    {p.name}
                  </p>
                  <p
                    className="font-black text-[15px]"
                    style={{ color: p.color }}
                  >
                    {p.economy.libraryValue.toLocaleString()}€
                  </p>
                  <p className="text-[#94a3b8] text-[9px]">
                    {totalValue > 0
                      ? ((p.economy.libraryValue / totalValue) * 100).toFixed(1)
                      : "0.0"}
                    % del total
                  </p>
                </div>
              ))}

              {libSorted.length > 3 && (
                <div
                  className="flex flex-col gap-[3px] min-w-[70px]"
                  style={{
                    flex: libSorted
                      .slice(3)
                      .reduce((s, p) => s + p.economy.libraryValue, 0),
                  }}
                >
                  {libSorted[3] && (
                    <div
                      className="relative flex flex-col justify-end p-2 hover:brightness-110 transition-all cursor-default"
                      style={{
                        flex: libSorted[3].economy.libraryValue,
                        background: `linear-gradient(180deg, ${libSorted[3].color}1a 0%, ${libSorted[3].color}44 100%)`,
                        border: `1px solid ${libSorted[3].color}44`,
                        borderRadius: "8px",
                      }}
                    >
                      <span className="text-[#94a3b8] text-[9px] font-bold">
                        #4
                      </span>
                      <p className="text-white font-bold text-[12px] truncate">
                        {libSorted[3].name}
                      </p>
                      <p
                        className="font-black text-[13px]"
                        style={{ color: libSorted[3].color }}
                      >
                        {libSorted[3].economy.libraryValue.toLocaleString()}€
                      </p>
                      <p className="text-[#94a3b8] text-[8px]">
                        {totalValue > 0
                          ? (
                            (libSorted[3].economy.libraryValue / totalValue) *
                            100
                          ).toFixed(1)
                          : "0.0"}
                        % del total
                      </p>
                    </div>
                  )}

                  {libSorted.length > 4 && (
                    <div
                      className="flex gap-[3px]"
                      style={{
                        flex: libSorted
                          .slice(4)
                          .reduce((s, p) => s + p.economy.libraryValue, 0),
                      }}
                    >
                      {libSorted.slice(4).map((p, idx) => (
                        <div
                          key={p.name}
                          className="relative flex flex-col justify-end p-2 hover:brightness-110 transition-all cursor-default min-w-0"
                          style={{
                            flex: p.economy.libraryValue,
                            background: `linear-gradient(180deg, ${p.color}1a 0%, ${p.color}44 100%)`,
                            border: `1px solid ${p.color}44`,
                            borderRadius: "8px",
                          }}
                        >
                          <span className="text-[#94a3b8] text-[9px] font-bold">
                            #{idx + 5}
                          </span>
                          <p className="text-white font-bold text-[10px] truncate">
                            {p.name}
                          </p>
                          <p
                            className="font-black text-[11px]"
                            style={{ color: p.color }}
                          >
                            {p.economy.libraryValue.toLocaleString()}€
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-[#62748e] text-[12px]">
                Valor total combinado:
              </span>
              <span className="text-[#05df72] font-black text-[14px]">
                {totalValue.toLocaleString()}€
              </span>
            </div>
          </div>
        </>
      )}

      {subTab === "tiempo" && (
        <>
          <div
            className="flex items-center gap-4 px-6 py-5 rounded-[24px] border border-[rgba(43,127,255,0.2)]"
            style={{
              background:
                "linear-gradient(90deg, rgba(28,57,142,0.3) 0%, rgba(49,44,133,0.2) 50%, rgba(16,78,100,0.3) 100%)",
            }}
          >
            <div className="w-[52px] h-[52px] shrink-0 bg-[rgba(43,127,255,0.2)] rounded-[16px] flex items-center justify-center">
              <Clock size={28} className="text-[#51a2ff]" />
            </div>
            <div>
              <h2 className="text-[24px] font-bold text-white">
                Factor Tiempo
              </h2>
              <p className="text-[#90a1b9] text-[14px]">
                Las horas de vuelo — el medidor definitivo de dedicación (o de
                falta de vida social)
              </p>
            </div>
          </div>

          <div className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[24px] p-6 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={20} className="text-[#62748e]" />
                  <h3 className="text-white font-bold text-[18px]">
                    El &quot;No Life&quot; Absoluto
                  </h3>
                </div>
                <p className="text-[#62748e] text-[12px]">
                  Total histórico de horas registradas en Steam
                </p>
              </div>
              <div className="px-3 py-1 bg-[rgba(43,127,255,0.1)] border border-[rgba(43,127,255,0.2)] rounded-full flex items-center gap-1.5 shrink-0">
                <Crown size={12} className="text-[#51a2ff]" />
                <span className="text-[#51a2ff] text-[10px] font-bold">
                  {bestTime}
                </span>
              </div>
            </div>

            <div className="relative" style={{ height: 280 }}>
              <div
                className="absolute left-0 top-0 flex flex-col justify-between"
                style={{ height: "calc(100% - 28px)" }}
              >
                {[
                  maxHours,
                  maxHours * 0.75,
                  maxHours * 0.5,
                  maxHours * 0.25,
                  0,
                ].map((v) => (
                  <span
                    key={v}
                    className="text-[#64748b] text-[10px] text-right w-9 leading-none"
                  >
                    {(v / 1000).toFixed(1)}k
                  </span>
                ))}
              </div>

              <div
                className="absolute left-11 right-0 top-0 flex flex-col justify-between"
                style={{ height: "calc(100% - 28px)" }}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="border-t border-[rgba(30,41,59,0.7)]"
                  />
                ))}
              </div>

              <div className="absolute left-11 right-0 top-0 bottom-0 flex items-end justify-around gap-3 px-4">
                {hoursSorted.map((p) => (
                  <div
                    key={p.name}
                    className="flex flex-col items-center justify-end gap-1.5 flex-1 h-full pb-7"
                  >
                    <div
                      className="w-full rounded-t-[8px] min-h-[4px] transition-all duration-700"
                      style={{
                        height: `${(p.time.totalHours / maxHours) * (280 - 28)}px`,
                        backgroundColor: p.color,
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute left-11 right-0 bottom-0 h-7 flex items-center justify-around px-4">
                {hoursSorted.map((p) => (
                  <span
                    key={p.name}
                    className="flex-1 text-center text-[#64748b] text-[10px] truncate px-1"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-[rgba(29,41,61,0.4)] rounded-[14px] py-3 px-4 mt-4 text-center text-[12px]">
              <span className="text-[#62748e]">{bestTime} lleva </span>
              <span className="text-white font-bold">{bestTimeDays} días</span>
              <span className="text-[#62748e]">
                {" "}
                completos jugando ({bestTimeYears} años)
              </span>
            </div>
          </div>

          <div className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[24px] p-6 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-2 mb-1">
              <Star size={20} className="text-[#62748e]" />
              <h3 className="text-white font-bold text-[18px]">
                Obsesión Monomática
              </h3>
            </div>
            <p className="text-[#62748e] text-[12px] mb-5">
              El Top 1 de cada jugador y su % sobre el total de horas
            </p>

            <div className="flex flex-col gap-4">
              {peopleWithTime.map((p) => {
                const pct =
                  p.time.totalHours > 0
                    ? Math.round(
                      (p.time.topGameHours / p.time.totalHours) * 100,
                    )
                    : 0;

                return (
                  <div
                    key={p.name}
                    className="bg-[rgba(29,41,61,0.4)] border border-[rgba(49,65,88,0.3)] rounded-[16px] px-4 pt-4 pb-3"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${p.color}22` }}
                        >
                          <span
                            className="font-black text-[12px]"
                            style={{ color: p.color }}
                          >
                            {p.name[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white font-bold text-[14px]">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-[#62748e] text-[10px]">
                        {p.time.totalHours.toLocaleString()}h totales
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#cad5e2] text-[12px] font-semibold">
                        {p.time.topGame}
                      </span>
                      <span
                        className="font-black text-[12px]"
                        style={{ color: p.color }}
                      >
                        {p.time.topGameHours}h
                      </span>
                    </div>

                    <div className="w-full h-3 bg-[#314158] rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${p.color}, ${p.color}66)`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#45556c] text-[10px]">0%</span>
                      <span
                        className="font-bold text-[10px]"
                        style={{ color: p.color }}
                      >
                        % del total
                      </span>
                      <span className="text-[#45556c] text-[10px]">100%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {subTab === "logros" &&
        (() => {
          const peopleWithLogros = [...people];
          const completionSorted = [...peopleWithLogros].sort(
            (a, b) =>
              b.achievements.completionPct - a.achievements.completionPct,
          );
          const bestCompletion = completionSorted[0]?.name || "-";
          const hallOfFame = [...peopleWithLogros].sort(
            (a, b) => b.achievements.perfectGames - a.achievements.perfectGames,
          );

          const medalBadge = (rank: number) => {
            if (rank === 0)
              return (
                <div
                  className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 shadow-[0px_4px_6px_0px_rgba(254,154,0,0.2)]"
                  style={{
                    background:
                      "linear-gradient(135deg,#fe9a00 0%,#d08700 100%)",
                  }}
                >
                  <span className="text-[18px]">👑</span>
                </div>
              );

            if (rank === 1)
              return (
                <div
                  className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg,#cad5e2 0%,#90a1b9 100%)",
                  }}
                >
                  <span className="font-black text-[18px] text-black">2</span>
                </div>
              );

            if (rank === 2)
              return (
                <div
                  className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg,#bb4d00 0%,#973c00 100%)",
                  }}
                >
                  <span className="font-black text-[18px] text-white">3</span>
                </div>
              );

            return (
              <div className="w-10 h-10 rounded-[14px] bg-[#314158] flex items-center justify-center shrink-0">
                <span className="font-black text-[18px] text-[#90a1b9]">
                  {rank + 1}
                </span>
              </div>
            );
          };

          return (
            <>
              <div
                className="flex items-center gap-4 px-6 py-5 rounded-[24px] border border-[rgba(254,154,0,0.2)]"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(123,51,6,0.3) 0%, rgba(115,62,10,0.2) 50%, rgba(126,42,12,0.3) 100%)",
                }}
              >
                <div className="w-[52px] h-[52px] shrink-0 bg-[rgba(254,154,0,0.2)] rounded-[16px] flex items-center justify-center">
                  <Trophy size={28} className="text-[#fe9a00]" />
                </div>
                <div>
                  <h2 className="text-[24px] font-bold text-white">
                    El Sudor y los Logros
                  </h2>
                  <p className="text-[#90a1b9] text-[14px]">
                    El &quot;Tryhardismo&quot; — tener muchos juegos no
                    significa ser bueno, ni terminarlos
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[24px] p-6 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Medal size={20} className="text-[#62748e]" />
                        <h3 className="text-white font-bold text-[18px]">
                          Tasa de Finalización
                        </h3>
                      </div>
                      <p className="text-[#62748e] text-[12px] leading-relaxed max-w-[220px]">
                        % medio de logros desbloqueados por juego empezado
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-[rgba(254,154,0,0.1)] border border-[rgba(254,154,0,0.2)] rounded-full flex items-center gap-1.5 shrink-0">
                      <Crown size={12} className="text-[#ffb900]" />
                      <span className="text-[#ffb900] text-[10px] font-bold">
                        {bestCompletion}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {completionSorted.map((p) => (
                      <div key={p.name} className="flex flex-col items-center">
                        <div
                          className="relative"
                          style={{ width: 100, height: 100 }}
                        >
                          <DonutChart
                            pct={p.achievements.completionPct}
                            color={p.color}
                            size={100}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span
                              className="font-black text-[20px]"
                              style={{ color: p.color }}
                            >
                              {p.achievements.completionPct}%
                            </span>
                          </div>
                        </div>
                        <p className="text-white text-[12px] font-bold mt-1 text-center truncate w-full">
                          {p.name}
                        </p>
                        <p className="text-[#62748e] text-[10px] text-center">
                          {p.achievements.totalAchievements} logros
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[24px] p-6 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={20} className="text-[#62748e]" />
                    <h3 className="text-white font-bold text-[18px]">
                      Salón de la Fama
                    </h3>
                  </div>
                  <p className="text-[#62748e] text-[12px] mb-5">
                    Juegos completados al 100% de logros
                  </p>

                  <div className="flex flex-col gap-3">
                    {hallOfFame.map((p, idx) => {
                      const perfectPct =
                        p.achievements.totalGames > 0
                          ? (
                            (p.achievements.perfectGames /
                              p.achievements.totalGames) *
                            100
                          ).toFixed(1)
                          : "0.0";

                      return (
                        <div
                          key={p.name}
                          className="bg-[rgba(29,41,61,0.4)] border border-[rgba(49,65,88,0.3)] rounded-[16px] px-4 py-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              {medalBadge(idx)}
                              <div>
                                <p className="text-white font-bold text-[14px]">
                                  {p.name}
                                </p>
                                <p className="text-[#62748e] text-[10px]">
                                  {p.achievements.totalAchievements} logros
                                  totales
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <Star
                                  size={14}
                                  className="text-[#f59e0b]"
                                  style={{ color: p.color }}
                                />
                                <span
                                  className="font-black text-[24px] leading-none"
                                  style={{ color: p.color }}
                                >
                                  {p.achievements.perfectGames}
                                </span>
                              </div>
                              <p className="text-[#62748e] text-[10px]">
                                perfectos de {p.achievements.totalGames}
                              </p>
                            </div>
                          </div>

                          <div className="w-full h-1.5 bg-[#314158] rounded-full overflow-hidden mb-1">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${perfectPct}%`,
                                background: `linear-gradient(90deg, ${p.color}, #fbbf24)`,
                              }}
                            />
                          </div>

                          <p className="text-[#45556c] text-[9px] text-right">
                            {perfectPct}% perfeccionados
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[24px] p-6 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2 mb-1">
                  <Gem size={20} className="text-[#62748e]" />
                  <h3 className="text-white font-bold text-[18px]">
                    El Cazatrofeos — Rareza Máxima
                  </h3>
                </div>
                <p className="text-[#62748e] text-[12px] mb-5">
                  El logro más raro que ha conseguido cada miembro del grupo
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {peopleWithLogros.map((p) => (
                    <div
                      key={p.name}
                      className="bg-[rgba(29,41,61,0.5)] border border-[rgba(0,188,125,0.2)] rounded-[16px] p-5"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${p.color}22` }}
                          >
                            <span
                              className="font-black text-[12px]"
                              style={{ color: p.color }}
                            >
                              {p.name[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="text-white font-bold text-[14px]">
                            {p.name}
                          </span>
                        </div>
                        <div className="bg-[rgba(0,188,125,0.1)] border border-[rgba(0,188,125,0.2)] rounded-full px-2 py-0.5">
                          <span className="text-[#00d492] text-[9px] font-black tracking-wider">
                            UNCOMMON
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <Shield size={14} className="text-[#62748e] shrink-0" />
                        <span className="text-white font-semibold text-[14px] truncate">
                          {p.achievements.rarestAchievement || "Sin datos"}
                        </span>
                      </div>

                      <p className="text-[#62748e] text-[10px] mb-3 pl-5">
                        {p.achievements.rarestGame || "Sin datos"}
                      </p>

                      <div className="w-full h-2 bg-[rgba(49,65,88,0.5)] rounded-full overflow-hidden mb-1.5">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${((p.achievements.rarityPct || 0) * 10).toFixed(1)}%`,
                            backgroundColor: p.color,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className="font-black text-[12px]"
                          style={{ color: p.color }}
                        >
                          {p.achievements.rarityPct ?? "-"}%
                        </span>
                        <span className="text-[#45556c] text-[9px]">
                          de jugadores globales
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

      {subTab === "radar" &&
        (() => {
          const radarPeople = [...people];

          const chartSize = 420;
          const cx = chartSize / 2;
          const cy = chartSize / 2;
          const outerRadius = 138;
          const rings = 5;
          const axisStep = (Math.PI * 2) / RADAR_AXES.length;

          const axisPoints = RADAR_AXES.map((axis, index) => {
            const angle = -Math.PI / 2 + axisStep * index;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            return {
              ...axis,
              angle,
              cos,
              sin,
              x: cx + cos * outerRadius,
              y: cy + sin * outerRadius,
              labelX: cx + cos * (outerRadius + 18),
              labelY: cy + sin * (outerRadius + 18),
            };
          });

          const ringPolygon = (ring: number) => {
            const factor = ring / rings;
            return axisPoints
              .map(
                (p) =>
                  `${cx + p.cos * outerRadius * factor},${cy + p.sin * outerRadius * factor}`,
              )
              .join(" ");
          };

          const seriesPolygon = (scores: Record<RadarAxisKey, number>) =>
            axisPoints
              .map((p) => {
                const value = Math.max(0, Math.min(10, scores[p.key]));
                const factor = value / 10;
                return `${cx + p.cos * outerRadius * factor},${cy + p.sin * outerRadius * factor}`;
              })
              .join(" ");

          return (
            <>
              <div
                className="flex items-center gap-4 px-6 py-5 rounded-[24px] border border-[rgba(109,40,217,0.35)]"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(36,11,89,0.7) 0%, rgba(55,17,106,0.45) 45%, rgba(108,14,74,0.55) 100%)",
                }}
              >
                <div className="w-[52px] h-[52px] shrink-0 bg-[rgba(109,40,217,0.2)] rounded-[16px] flex items-center justify-center">
                  <Hexagon size={26} className="text-[#8d73ff]" />
                </div>
                <div>
                  <h2 className="text-[36px] leading-[1.1] font-bold text-white">
                    Radar Definitivo
                  </h2>
                  <p className="text-[#90a1b9] text-[14px]">
                    El perfil completo de cada jugador de un solo vistazo - 5
                    ejes, puntuados del 1 al 10
                  </p>
                </div>
              </div>

              <div className="bg-[rgba(7,17,45,0.84)] border border-[#1d293d] rounded-[24px] p-6 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Hexagon size={20} className="text-[#8d73ff]" />
                      <h3 className="text-white font-bold text-[32px] leading-none">
                        Grafico de Arana Comparativo
                      </h3>
                    </div>
                    <div className="px-3 py-1.5 bg-[rgba(29,41,61,0.5)] border border-[rgba(49,65,88,0.6)] rounded-full flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#314158] text-[#90a1b9] text-[10px] leading-none flex items-center justify-center">
                        i
                      </span>
                      <span className="text-[#90a1b9] text-[10px]">
                        Puntuacion relativa dentro del grupo (1-10)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {RADAR_AXES.map((axis) => (
                      <div
                        key={axis.key}
                        className="bg-[rgba(29,41,61,0.65)] border border-[rgba(49,65,88,0.45)] rounded-full px-3 py-1 text-[11px] text-[#90a1b9]"
                      >
                        <span className="font-semibold text-[#cad5e2]">
                          {axis.emoji} {axis.label}:
                        </span>{" "}
                        {axis.description}
                      </div>
                    ))}
                  </div>

                  <div className="relative h-[420px] w-full overflow-hidden">
                    <svg
                      viewBox="0 0 720 420"
                      className="w-full h-full"
                      aria-label="Radar comparativo de jugadores"
                    >
                      {[1, 2, 3, 4, 5].map((ring) => (
                        <polygon
                          key={ring}
                          points={ringPolygon(ring)}
                          fill="none"
                          stroke={
                            ring === 5
                              ? "rgba(148,163,184,0.75)"
                              : "rgba(71,85,105,0.55)"
                          }
                          strokeWidth={ring === 5 ? 1.4 : 1}
                          strokeDasharray={ring === 5 ? undefined : "4 4"}
                        />
                      ))}

                      {axisPoints.map((p) => (
                        <line
                          key={`axis-${p.key}`}
                          x1={cx}
                          y1={cy}
                          x2={p.x}
                          y2={p.y}
                          stroke="rgba(148,163,184,0.45)"
                          strokeWidth={1}
                        />
                      ))}

                      {[0, 2, 4, 6, 8, 10].map((tick) => (
                        <text
                          key={tick}
                          x={cx + 6}
                          y={cy - (outerRadius * tick) / 10 + 4}
                          fill="#64748b"
                          fontSize="10"
                          fontWeight={500}
                        >
                          {tick}
                        </text>
                      ))}

                      {radarPeople.map((p) => (
                        <g key={p.name}>
                          <polygon
                            points={seriesPolygon(p.radar.scores)}
                            fill={`${p.color}26`}
                            stroke={p.color}
                            strokeWidth={2}
                          />
                          {axisPoints.map((axis) => {
                            const v = p.radar.scores[axis.key] / 10;
                            return (
                              <circle
                                key={`${p.name}-${axis.key}`}
                                cx={cx + axis.cos * outerRadius * v}
                                cy={cy + axis.sin * outerRadius * v}
                                r={3}
                                fill={p.color}
                                stroke="#0f172b"
                                strokeWidth={1.2}
                              />
                            );
                          })}
                        </g>
                      ))}

                      {axisPoints.map((p) => {
                        const anchor: "start" | "middle" | "end" =
                          p.cos > 0.25
                            ? "start"
                            : p.cos < -0.25
                              ? "end"
                              : "middle";

                        return (
                          <text
                            key={`label-${p.key}`}
                            x={p.labelX}
                            y={p.labelY}
                            fill="#90a1b9"
                            fontSize="13"
                            fontWeight={700}
                            textAnchor={anchor}
                            dominantBaseline="middle"
                          >
                            {p.emoji} {p.label}
                          </text>
                        );
                      })}
                    </svg>

                    <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2 pb-1">
                      {radarPeople.map((p) => (
                        <div
                          key={`legend-${p.name}`}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-[2px]"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="text-[12px] text-[#90a1b9]">
                            {p.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {radarPeople.map((p) => (
                  <div
                    key={`card-${p.name}`}
                    className="bg-[rgba(15,23,43,0.82)] border border-[#1d293d] rounded-[18px] p-4 shadow-[0px_12px_20px_0px_rgba(0,0,0,0.14)]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-[18px]"
                          style={{ backgroundColor: `${p.color}24` }}
                        >
                          {p.radar.archetypeEmoji}
                        </div>
                        <div>
                          <p className="text-white text-[26px] leading-none font-bold">
                            {p.name}
                          </p>
                          <p
                            className="text-[14px] font-semibold"
                            style={{ color: p.color }}
                          >
                            {p.radar.archetype}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-[38px] leading-none font-bold">
                          {p.radar.average.toFixed(1)}
                        </p>
                        <p className="text-[#62748e] text-[12px]">media</p>
                      </div>
                    </div>

                    <p className="text-[#62748e] text-[13px] italic mb-4">
                      {p.radar.quote}
                    </p>

                    <div className="space-y-2.5">
                      {RADAR_AXES.map((axis) => {
                        const score = p.radar.scores[axis.key];
                        const scoreLabel =
                          score % 1 === 0 ? `${score}` : score.toFixed(1);

                        return (
                          <div
                            key={`${p.name}-${axis.key}`}
                            className="flex items-center gap-2.5"
                          >
                            <span className="w-[96px] text-[11px] text-[#7d8ea9] truncate">
                              {axis.emoji} {axis.label}
                            </span>
                            <div className="flex-1 h-2 bg-[#314158] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${score * 10}%`,
                                  backgroundColor: p.color,
                                }}
                              />
                            </div>
                            <span className="w-7 text-right text-[12px] text-[#cad5e2] font-semibold">
                              {scoreLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
    </div>
  );
}