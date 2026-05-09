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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router";
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
            className={`flex items-center gap-2 flex-1 justify-center py-2.5 rounded-[14px] text-sm font-semibold transition-all ${
              subTab === t.id
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

export function Friends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Tab>("amigos");
  const [commonGames, setCommonGames] = useState<CommonGame[]>([]);
  const [loadingCommonGames, setLoadingCommonGames] = useState(false);
  const [bookingGame, setBookingGame] = useState<CommonGame | null>(null);
  const [scheduledSessions, setScheduledSessions] = useState<
    ScheduledSession[]
  >([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user?.steamid) return;

    const loadFriends = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/steam/friends/${user.steamid}`);
        setFriends(res.data?.friends || []);
      } catch (error) {
        console.error("Error loading friends:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, [user?.steamid]);

  useEffect(() => {
    const loadCommonGames = async () => {
      if (!user?.steamid || selectedIds.size === 0) {
        setCommonGames([]);
        return;
      }

      const steamIds = [user.steamid, ...Array.from(selectedIds)];

      setLoadingCommonGames(true);
      try {
        const res = await getCommonGames(steamIds);
        setCommonGames(res.data?.games || []);
      } catch (error) {
        console.error("Error loading common games:", error);
        setCommonGames([]);
      } finally {
        setLoadingCommonGames(false);
      }
    };

    loadCommonGames();
  }, [user?.steamid, selectedIds]);

  const normalizeSession = (session: SessionApiItem): ScheduledSession => {
    const participantFriends =
      session.participants?.map((p, index) => ({
        steamId: p.user?.steamId || `unknown-${index}`,
        username: p.user?.username || "Usuario",
        avatar: p.user?.avatar || "https://via.placeholder.com/64?text=U",
        status: p.status === "accepted" ? 1 : 0,
        participantStatus: p.status as
          | "invited"
          | "accepted"
          | "declined"
          | undefined,
      })) || [];

    // Determine if current user is the host using the host field from the API
    const isHost = session.host?.steamId === user?.steamid;

    // Find the current user's own participant entry to show their personal status
    const myEntry = !isHost
      ? session.participants?.find((p) => p.user?.steamId === user?.steamid)
      : undefined;
    const myParticipantStatus = myEntry?.status as
      | "invited"
      | "accepted"
      | "declined"
      | undefined;

    return {
      id: session._id,
      game: {
        appid: session.game?.appId || session.game?.appid || 0,
        name: session.game?.name || "Juego",
        headerImage: session.game?.headerImage,
      },
      date: session.date,
      time: session.time,
      friends: participantFriends,
      confirmed: session.status !== "cancelled",
      myParticipantStatus,
      isHost,
    };
  };

  // Devuelve true si la sesión es futura (fecha y hora no han pasado)
  // Devuelve true si la sesión es futura (fecha y hora no han pasado)
  const isFutureSession = (session: ScheduledSession) => {
    if (!session.date || !session.time) return false;
    const [year, month, day] = session.date.split("-").map(Number);
    const [hour, minute] = session.time.split(":").map(Number);
    const sessionDate = new Date(year, month - 1, day, hour, minute, 0, 0);
    const now = new Date();
    // Solo mostrar sesiones cuya fecha y hora sean posteriores a ahora
    return sessionDate.getTime() > now.getTime();
  };

  const loadSessions = async () => {
    if (!user?.steamid) return;

    setLoadingSessions(true);
    try {
      const res = await getMyGamingSessions();
      const sessions = (res.data?.sessions || [])
        .map(normalizeSession)
        // Oculta sesiones rechazadas y pasadas
        .filter(
          (s) => s.myParticipantStatus !== "declined" && isFutureSession(s),
        );
      setScheduledSessions(sessions);
    } catch (error) {
      console.error("Error loading sessions:", error);
      setScheduledSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadNotifications = async () => {
    if (!user?.steamid) return;

    setLoadingNotifications(true);
    try {
      const res = await getNotifications({ limit: 20 });
      setNotifications(res.data?.notifications || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (activeTab === "sesiones" && user?.steamid) {
      loadSessions();
      loadNotifications();
    }
  }, [activeTab, user?.steamid]);

  if (!user) return <Navigate to="/login" replace />;

  const getStatusText = (friend: Friend) => {
    if (friend.currentGame) return `playing ${friend.currentGame}`;
    switch (friend.status) {
      case 1:
        return "Online";
      case 2:
        return "Ocupado";
      case 3:
        return "Ausente";
      case 4:
        return "Durmiendo";
      default:
        return "Offline";
    }
  };

  const isOnline = (friend: Friend) =>
    friend.status > 0 || !!friend.currentGame;

  const isPlayingGame = (friend: Friend) => !!friend.currentGame;

  const getStatusDot = (friend: Friend) => {
    if (isPlayingGame(friend))
      return "bg-[#00c950] shadow-[0px_0px_8px_0px_rgba(34,197,94,0.6)]";
    if (isOnline(friend))
      return "bg-[#00c950] shadow-[0px_0px_8px_0px_rgba(34,197,94,0.6)]";
    return "bg-[#62748e]";
  };

  const getStatusTextColor = (friend: Friend) => {
    if (isPlayingGame(friend)) return "text-[#05df72]";
    if (isOnline(friend)) return "text-[#62748e]";
    return "text-[#62748e]";
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: "amigos", label: "Amigos", icon: <Users size={18} /> },
    { id: "analitica", label: "Analítica", icon: <BarChart2 size={18} /> },
    { id: "sesiones", label: "Sesiones", icon: <Gamepad2 size={18} /> },
  ];

  return (
    <div className="flex flex-col gap-10 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Centro Social
          </h1>
          <p className="text-[#90a1b9] text-sm sm:text-lg mt-2">
            Gestiona tus amigos, compara estadísticas y organiza partidas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(15,23,43,0.8)] border border-[#1d293d]">
              <Bell size={18} className="text-[#90a1b9]" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ef4444] text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center p-[7px] gap-1 bg-[#0f172b] border border-[#1d293d] rounded-[14px] shadow-sm self-start sm:self-auto w-full sm:w-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-5 py-2 rounded-[10px] text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#155dfc] text-white shadow-[0px_10px_15px_0px_rgba(28,57,142,0.2),0px_4px_6px_0px_rgba(28,57,142,0.2)]"
                    : "text-[#90a1b9] hover:text-white"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-[261px] shrink-0 bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[24px] p-4 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-[rgba(21,93,252,0.15)] flex items-center justify-center">
                <Users size={14} className="text-[#51a2ff]" />
              </div>
              <h3 className="text-white font-bold text-[15px]">Amigos</h3>
            </div>
            {selectedIds.size > 0 && (
              <span className="text-[11px] font-bold text-[#51a2ff] bg-[rgba(21,93,252,0.15)] px-2 py-0.5 rounded-full">
                {selectedIds.size} seleccionado
                {selectedIds.size !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#45556c]"
            />
            <input
              type="text"
              placeholder="Buscar amigos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#080f1f] border border-[#1d293d] rounded-[10px] pl-8 pr-3 py-2 text-[13px] text-white placeholder-[#45556c] focus:outline-none focus:border-[#155dfc] transition-colors"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="py-8 text-center">
              <Users size={32} className="text-[#314158] mx-auto mb-2" />
              <p className="text-[#62748e] text-xs">
                {friends.length === 0
                  ? "Lista vacía o privada"
                  : "No se encontraron amigos"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[480px] pr-1">
              {filteredFriends.map((friend) => {
                const isSelected = selectedIds.has(friend.steamId);
                const online = isOnline(friend);
                const playing = isPlayingGame(friend);
                return (
                  <button
                    key={friend.steamId}
                    onClick={() => toggleSelect(friend.steamId)}
                    className={`relative flex items-center gap-3 p-2.5 rounded-[12px] text-left transition-all duration-200 w-full group ${
                      isSelected
                        ? "bg-[rgba(21,93,252,0.12)] ring-1 ring-[rgba(21,93,252,0.5)]"
                        : "hover:bg-[rgba(29,41,61,0.5)]"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className={`rounded-full p-[2px] ${
                          isSelected
                            ? "bg-gradient-to-br from-[#155dfc] to-[#00b8db]"
                            : playing
                              ? "bg-gradient-to-br from-[#00c950] to-[#00d492]"
                              : online
                                ? "bg-[#314158]"
                                : "bg-[#1d293d]"
                        }`}
                      >
                        <img
                          src={friend.avatar}
                          alt={friend.username}
                          className="w-9 h-9 rounded-full object-cover block"
                        />
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f172b] ${getStatusDot(friend)}`}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#cad5e2] truncate leading-tight">
                        {friend.username}
                      </p>
                      <p
                        className={`text-[10px] truncate leading-tight mt-0.5 ${
                          playing
                            ? "text-[#05df72]"
                            : online
                              ? "text-[#62748e]"
                              : "text-[#3d4f63]"
                        }`}
                      >
                        {friend.currentGame
                          ? `🎮 ${friend.currentGame}`
                          : getStatusText(friend)}
                      </p>
                    </div>

                    {/* Checkbox */}
                    <div
                      className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-[#155dfc] border-[#155dfc]"
                          : "border-[#314158] group-hover:border-[#51a2ff]"
                      }`}
                    >
                      {isSelected && <Check size={11} className="text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick action buttons when friends selected */}
          {selectedIds.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("analitica")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] bg-[rgba(21,93,252,0.15)] border border-[rgba(21,93,252,0.3)] text-[#51a2ff] text-[11px] font-semibold hover:bg-[rgba(21,93,252,0.25)] transition-colors"
              >
                <BarChart2 size={13} /> Stats
              </button>
              <button
                onClick={() => setActiveTab("sesiones")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] bg-[rgba(89,22,139,0.15)] border border-[rgba(89,22,139,0.3)] text-[#c27aff] text-[11px] font-semibold hover:bg-[rgba(89,22,139,0.25)] transition-colors"
              >
                <CalendarDays size={13} /> Sesión
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 w-full">
          {activeTab === "amigos" && selectedIds.size === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-8">
                <div className="w-32 h-32 rounded-full bg-[rgba(15,23,43,0.4)] border border-[#1d293d] flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[rgba(43,127,255,0.1)] blur-[40px]" />
                  <Users size={64} className="text-[#51a2ff] relative z-10" />
                </div>
              </div>

              <h2 className="text-[24px] sm:text-[30px] font-bold text-white mb-4">
                Gestiona tu red de amigos
              </h2>
              <p className="text-[#90a1b9] text-sm sm:text-lg max-w-[476px] leading-relaxed mb-12">
                Utiliza las pestañas superiores para analizar estadísticas
                comparativas o encontrar juegos en común para tu próxima sesión.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-[672px]">
                <button
                  onClick={() => setActiveTab("analitica")}
                  className="bg-[#0f172b] border border-[#1d293d] rounded-[16px] p-8 flex flex-col items-center gap-3 hover:border-[rgba(21,93,252,0.4)] hover:bg-[rgba(21,93,252,0.05)] transition-all group"
                >
                  <div className="w-14 h-14 rounded-[16px] bg-[rgba(28,57,142,0.3)] flex items-center justify-center group-hover:bg-[rgba(28,57,142,0.5)] transition-colors">
                    <BarChart2 size={28} className="text-[#51a2ff]" />
                  </div>
                  <h3 className="text-white font-bold text-[20px]">
                    Comparar Stats
                  </h3>
                  <p className="text-[#62748e] text-[14px] text-center leading-5">
                    Analiza logros, tiempos de juego y bibliotecas
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab("sesiones")}
                  className="bg-[#0f172b] border border-[#1d293d] rounded-[16px] p-8 flex flex-col items-center gap-3 hover:border-[rgba(89,22,139,0.4)] hover:bg-[rgba(89,22,139,0.05)] transition-all group"
                >
                  <div className="w-14 h-14 rounded-[16px] bg-[rgba(89,22,139,0.3)] flex items-center justify-center group-hover:bg-[rgba(89,22,139,0.5)] transition-colors">
                    <CalendarDays size={28} className="text-[#c27aff]" />
                  </div>
                  <h3 className="text-white font-bold text-[20px]">
                    Planificar Sesión
                  </h3>
                  <p className="text-[#62748e] text-[14px] text-center leading-5">
                    Encuentra juegos en común para jugar ahora
                  </p>
                </button>
              </div>
            </div>
          )}

          {activeTab === "amigos" && selectedIds.size > 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[rgba(21,93,252,0.15)] border border-[rgba(21,93,252,0.3)] flex items-center justify-center mb-4">
                <Users size={32} className="text-[#51a2ff]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {selectedIds.size} amigo{selectedIds.size !== 1 ? "s" : ""}{" "}
                seleccionado{selectedIds.size !== 1 ? "s" : ""}
              </h2>
              <p className="text-[#90a1b9] mb-6">
                Elige una acción para continuar
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveTab("analitica")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#155dfc] text-white rounded-[12px] text-sm font-semibold hover:bg-[#1a6aff] transition-colors"
                >
                  <BarChart2 size={16} /> Comparar Stats
                </button>
                <button
                  onClick={() => setActiveTab("sesiones")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[rgba(89,22,139,0.3)] border border-[rgba(89,22,139,0.4)] text-[#c27aff] rounded-[12px] text-sm font-semibold hover:bg-[rgba(89,22,139,0.5)] transition-colors"
                >
                  <CalendarDays size={16} /> Planificar Sesión
                </button>
              </div>
            </div>
          )}

          {activeTab === "analitica" && (
            <AnalyticsPanel
              selectedFriends={friends.filter((f) =>
                selectedIds.has(f.steamId),
              )}
              user={user}
            />
          )}

          {activeTab === "sesiones" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 border border-slate-700/50 rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden mb-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="bg-white/10 p-3 rounded-2xl mb-4 backdrop-blur-md">
                    <Gamepad2 className="text-white w-8 h-8" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
                    ¿A qué jugamos hoy?
                  </h2>
                  <p className="text-slate-200 text-sm sm:text-lg max-w-xl">
                    {selectedIds.size > 0
                      ? `Hemos encontrado ${commonGames.length} juegos en común entre tú y ${selectedIds.size} amigos.`
                      : "Selecciona amigos de la barra lateral para encontrar juegos en común para vuestra sesión."}
                  </p>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[24px] p-5">
                  <h3 className="text-white font-bold text-lg mb-3">
                    Invitaciones y notificaciones
                  </h3>

                  {loadingNotifications ? (
                    <div className="flex justify-center py-10">
                      <Loader2
                        className="animate-spin text-blue-500"
                        size={24}
                      />
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="text-[#62748e] text-sm">
                      No tienes notificaciones.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                      {notifications.map((n) => (
                        <div
                          key={n._id}
                          className="rounded-[16px] border border-[rgba(49,65,88,0.35)] bg-[rgba(29,41,61,0.35)] p-4"
                        >
                          <p className="text-white text-sm font-semibold">
                            {n.title}
                          </p>
                          <p className="text-[#90a1b9] text-xs mt-1">
                            {n.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[24px] p-5">
                  <h3 className="text-white font-bold text-lg mb-3">
                    Sesiones donde participas
                  </h3>

                  {loadingSessions ? (
                    <div className="flex justify-center py-10">
                      <Loader2
                        className="animate-spin text-blue-500"
                        size={24}
                      />
                    </div>
                  ) : scheduledSessions.length === 0 ? (
                    <p className="text-[#62748e] text-sm">
                      No hay sesiones guardadas todavía.
                    </p>
                  ) : (
                    <UpcomingSessions
                      sessions={scheduledSessions}
                      currentUserSteamId={user?.steamid}
                      onRemove={async (id: string) => {
                        try {
                          await cancelGamingSession(id);
                          await loadSessions();
                          await loadNotifications();
                        } catch (error) {
                          console.error("Error cancelling session:", error);
                        }
                      }}
                      onLeave={async (id: string) => {
                        try {
                          // Remove immediately from UI for instant feedback
                          setScheduledSessions((prev) =>
                            prev.filter((s) => s.id !== id),
                          );
                          await leaveGamingSession(id);
                          // Then sync with backend
                          await loadSessions();
                        } catch (error) {
                          console.error("Error leaving session:", error);
                          // Revert on error
                          await loadSessions();
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              {selectedIds.size === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl">
                  <Users size={64} className="text-slate-700 mb-6" />
                  <h3 className="text-xl font-semibold text-slate-400 mb-2">
                    Comienza añadiendo amigos
                  </h3>
                  <p className="text-slate-500">
                    Selecciona al menos un amigo en el panel lateral
                  </p>
                </div>
              ) : loadingCommonGames ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="animate-spin text-blue-500" size={28} />
                </div>
              ) : commonGames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl">
                  <Gamepad2 size={64} className="text-slate-700 mb-6" />
                  <h3 className="text-xl font-semibold text-slate-400 mb-2">
                    No hay juegos en común visibles
                  </h3>
                  <p className="text-slate-500">
                    Puede que algún perfil sea privado o que no compartáis
                    biblioteca.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {commonGames.map((game, i) => (
                    <div
                      key={game.appid}
                      className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-4 flex gap-5 hover:border-blue-500/50 transition-all duration-300 group hover:shadow-lg hover:shadow-blue-500/5 items-center animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="relative w-32 h-20 rounded-xl overflow-hidden shadow-lg shrink-0">
                        <img
                          src={game.headerImage}
                          alt={game.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://via.placeholder.com/320x160?text=Game";
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                        <h4 className="font-bold text-lg text-white truncate group-hover:text-blue-400 transition-colors">
                          {game.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                            En común
                          </span>
                          <span className="text-xs text-slate-500">
                            {game.owners} miembros
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setBookingGame(game)}
                        className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                        title="Reservar sesión"
                      >
                        <CalendarDays size={16} />
                        <span className="text-xs font-bold hidden sm:inline">
                          Reservar
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {bookingGame && (
        <SessionBooking
          game={bookingGame}
          selectedFriends={friends.filter((f) => selectedIds.has(f.steamId))}
          onClose={() => setBookingGame(null)}
          onConfirm={async () => {
            await loadSessions();
            await loadNotifications();
            setBookingGame(null);
          }}
          existingSessions={scheduledSessions}
        />
      )}
    </div>
  );
}
