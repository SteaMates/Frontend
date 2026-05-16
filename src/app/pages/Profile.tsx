/**
 * Nombre del fichero: Profile.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates. Perfil del jugador con analítica de biblioteca, logros y géneros.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate, Link, useParams } from "react-router";
import api from "../../lib/api";
import { ReportButton } from "../components/ReportButton";
import {
  Award,
  Check,
  ChevronRight,
  Clock,
  DollarSign,
  ExternalLink,
  Gamepad2,
  LogOut,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  Zap,
  RefreshCw,
  Flame,
  CalendarDays,
  Users
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface Game {
  appId: number;
  name: string;
  playtime: number;
  lastPlayed?: number;
  icon: string;
}

interface ProfileData {
  _id?: string;
  avatar?: string;
  username?: string;
  profileUrl?: string;
  memberSince?: number | string;
  level?: number;
  title?: string;
  xpCurrent?: number;
  xpTotal?: number;
  libraryValue?: number;
  dailyAverageHours?: number;
  totalAchievements?: number;
  completedGames?: number;
  status?: number;
}

interface RecentGame {
  appId: number;
  name: string;
  icon?: string;
  playtime2Weeks?: number;
  playtimeForever?: number;
  lastPlayed?: number;
}

type GameDetails = {
  appId?: number;
  name?: string;
  genres?: string[];
  headerImage?: string;
  isFree?: boolean;
  price?: number;
};

type GameDetailsMap = Record<string, GameDetails>;

type LibraryDataStatus = {
  hasData: boolean;
  reason: "no_games" | "private_or_unavailable" | null;
  gameCount: number;
};

type ProfileSnapshot = {
  profile: ProfileData | null;
  games: Game[];
  recentGames: RecentGame[];
  genreData: any;
  achievementsData: any;
  cachedAt: number;
};

type LibraryFilter = "top" | "recent" | "unplayed";

type GenreItem = {
  name: string;
  hours: number;
  games: number;
  color: string;
  pct: number;
};

type IdentityRule = {
  key: string;
  label: string;
  emoji: string;
  match: string[];
  minHours: number;
  minPct: number;
  detailLabel: string;
  hint: string;
};

type GamerIdentity = {
  label: string;
  emoji: string;
  pct: number;
  hours: number;
  detail: string;
  hint: string;
  keywords: string[];
  detailLabel: string;
};

const PROFILE_SNAPSHOT_PREFIX = "steamates_profile_snapshot_v1";
const PROFILE_SESSION_CACHE_PREFIX = "steamates_profile_session_cache_v1";

function snapshotKey(steamId: string) {
  return `${PROFILE_SNAPSHOT_PREFIX}:${steamId}`;
}

function sessionCacheKey(steamId: string) {
  return `${PROFILE_SESSION_CACHE_PREFIX}:${steamId}`;
}

function readProfileSnapshot(steamId: string): ProfileSnapshot | null {
  try {
    const raw = localStorage.getItem(snapshotKey(steamId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileSnapshot;
    if (!parsed || !Array.isArray(parsed.games)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeProfileSnapshot(steamId: string, snapshot: ProfileSnapshot) {
  try {
    localStorage.setItem(snapshotKey(steamId), JSON.stringify(snapshot));
  } catch {
    // Ignore
  }
}

function readSessionCache(steamId: string): ProfileSnapshot | null {
  try {
    const raw = sessionStorage.getItem(sessionCacheKey(steamId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileSnapshot;
    if (!parsed || !Array.isArray(parsed.games)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(steamId: string, snapshot: ProfileSnapshot) {
  try {
    sessionStorage.setItem(sessionCacheKey(steamId), JSON.stringify(snapshot));
  } catch {
    // Ignore
  }
}

const GENRE_COLORS = [
  "#ef4444",
  "#8b5cf6",
  "#10b981",
  "#3b82f6",
  "#06b6d4",
  "#f59e0b",
  "#ec4899",
  "#64748b",
];

function hoursFromMinutes(minutes = 0) {
  return Math.max(0, Math.round(minutes / 60));
}

function gameImage(appId: number, fallback = "") {
  return (
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`
  );
}

function parseMemberYear(value?: number | string): number | null {
  if (typeof value === "number") {
    const ms = value > 1e11 ? value : value * 1000;
    const year = new Date(ms).getFullYear();
    return Number.isNaN(year) ? null : year;
  }
  if (typeof value === "string") {
    const asNum = Number(value);
    if (!Number.isNaN(asNum)) return parseMemberYear(asNum);
    const parsed = new Date(value).getFullYear();
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function relativeLabel(lastPlayed?: number, fallback = "Reciente") {
  if (!lastPlayed) return fallback;
  const timestamp = lastPlayed > 1e11 ? lastPlayed : lastPlayed * 1000;
  const delta = Date.now() - timestamp;
  const hours = Math.floor(delta / 3_600_000);
  const days = Math.floor(delta / 86_400_000);
  if (hours < 24) return `Hace ${Math.max(1, hours)}h`;
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

function normalizeGenres(raw: any, totalHours: number): GenreItem[] {
  const candidate =
    (Array.isArray(raw?.genres) && raw.genres) ||
    (Array.isArray(raw?.data) && raw.data) ||
    (Array.isArray(raw) && raw) ||
    [];

  if (candidate.length === 0) {
    return [];
  }

  const rows = candidate
    .map((item: any, index: number) => {
      const hours = Number(item.hours ?? item.playtime ?? item.value ?? 0);
      return {
        name: String(item.name ?? item.genre ?? `Género ${index + 1}`),
        hours: Number.isFinite(hours) ? hours : 0,
        games: Number(item.games ?? item.count ?? 0) || 0,
      };
    })
    .filter((row: any) => row.hours > 0)
    .sort((a: any, b: any) => b.hours - a.hours)
    .slice(0, 8);

  const sum = rows.reduce((acc: number, row: any) => acc + row.hours, 0) || 1;
  return rows.map((row: any, index: number) => ({
    ...row,
    color: GENRE_COLORS[index % GENRE_COLORS.length],
    pct: Math.round((row.hours / sum) * 100),
  }));
}

const IDENTITY_RULES: IdentityRule[] = [
  {
    key: "racing",
    label: "Piloto competitivo",
    emoji: "🏎️",
    match: ["racing", "carreras"],
    minHours: 40,
    minPct: 0.3,
    detailLabel: "juegos de carreras",
    hint: "Velocidad, trazadas y precisión milimétrica.",
  },
  {
    key: "sim",
    label: "Simracer",
    emoji: "🛠️",
    match: ["simulation", "simuladores", "simulación"],
    minHours: 35,
    minPct: 0.25,
    detailLabel: "simuladores",
    hint: "Te gustan los detalles y el realismo.",
  },
  {
    key: "fps",
    label: "Tirador táctico",
    emoji: "🎯",
    match: ["fps", "shooter", "disparos"],
    minHours: 30,
    minPct: 0.25,
    detailLabel: "shooters",
    hint: "Reflejos, precisión y sangre fría.",
  },
  {
    key: "strategy",
    label: "Estratega",
    emoji: "🧠",
    match: ["strategy", "estrategia"],
    minHours: 25,
    minPct: 0.2,
    detailLabel: "estrategia",
    hint: "Planificas cada movimiento antes de jugarlo.",
  },
  {
    key: "rpg",
    label: "Aventurero épico",
    emoji: "🗺️",
    match: ["rpg"],
    minHours: 30,
    minPct: 0.22,
    detailLabel: "RPG",
    hint: "Historias largas y progresión a fuego lento.",
  },
  {
    key: "indie",
    label: "Curador indie",
    emoji: "✨",
    match: ["indie"],
    minHours: 20,
    minPct: 0.2,
    detailLabel: "indies",
    hint: "Te atrae lo creativo y lo distinto.",
  },
  {
    key: "horror",
    label: "Cazapesadillas",
    emoji: "👻",
    match: ["horror", "terror"],
    minHours: 15,
    minPct: 0.18,
    detailLabel: "terror",
    hint: "El susto es tu zona de confort.",
  },
  {
    key: "sports",
    label: "Atleta digital",
    emoji: "⚽",
    match: ["sports", "deportes"],
    minHours: 20,
    minPct: 0.2,
    detailLabel: "deportes",
    hint: "Competición directa y ritmo constante.",
  },
];

function computeGamerIdentity(
  genreItems: GenreItem[],
  totalHours: number,
): GamerIdentity {
  if (!genreItems.length || totalHours <= 0) {
    return {
      label: "Identidad en pausa",
      emoji: "🧭",
      pct: 0,
      hours: 0,
      detail: "Aún no hay suficientes datos para definirla.",
      hint: "Juega un poco más para revelar tu estilo.",
      keywords: [],
      detailLabel: "",
    };
  }

  const scored = IDENTITY_RULES.map((rule) => {
    const hours = genreItems.reduce((sum, item) => {
      const name = item.name.toLowerCase();
      const matches = rule.match.some((keyword) => name.includes(keyword));
      return matches ? sum + item.hours : sum;
    }, 0);
    const ratio = totalHours > 0 ? hours / totalHours : 0;
    return {
      rule,
      hours,
      ratio,
      pct: Math.round(ratio * 100),
    };
  }).filter((item) => item.hours > 0);

  if (scored.length > 0) {
    const best = scored.sort((a, b) => b.ratio - a.ratio)[0];
    if (best.hours >= best.rule.minHours && best.ratio >= best.rule.minPct) {
      return {
        label: best.rule.label,
        emoji: best.rule.emoji,
        pct: best.pct,
        hours: best.hours,
        detail: `${best.pct}% de tus horas estan en ${best.rule.detailLabel}`,
        hint: best.rule.hint,
        keywords: best.rule.match,
        detailLabel: best.rule.detailLabel,
      };
    }
  }

  const focus = genreItems[0];
  const focusPct = Math.round((focus.hours / Math.max(1, totalHours)) * 100);
  return {
    label: "Perfil versatil",
    emoji: "🧭",
    pct: focusPct,
    hours: focus.hours,
    detail: `${focusPct}% de tus horas estan en ${focus.name}`,
    hint: "Tu tiempo esta bastante repartido.",
    keywords: [focus.name.toLowerCase()],
    detailLabel: focus.name,
  };
}

export function Profile() {
  const { user, logout } = useAuth();
  const { steamId: routeSteamId } = useParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [genreData, setGenreData] = useState<any>(null);
  const [achievementsData, setAchievementsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedSteamId, setResolvedSteamId] = useState<string | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<LibraryDataStatus | null>(
    null,
  );
  const [usingSnapshot, setUsingSnapshot] = useState(false);
  const [snapshotCachedAt, setSnapshotCachedAt] = useState<number | null>(null);
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("top");
  const [profileBanner, setProfileBanner] = useState<string | null>(null);
  const [gameDetails, setGameDetails] = useState<GameDetailsMap>({});
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);

  const isOwnProfile = !routeSteamId || routeSteamId === user?.steamid;
  const targetSteamId = routeSteamId || resolvedSteamId || user?.steamid;

  const loadGameDetails = useCallback(async (gamesList: Game[]) => {
    const sorted = [...gamesList].sort(
      (a, b) => (b.playtime || 0) - (a.playtime || 0),
    );
    const appIds = [...new Set(sorted.map((g) => g.appId))].slice(0, 40);
    if (appIds.length === 0) return;

    try {
      const res = await api.post("/api/steam/games-info", { appIds });
      if (res?.data && typeof res.data === "object") {
        setGameDetails((prev) => ({
          ...prev,
          ...res.data,
        }));
      }
    } catch (error) {
      console.error("Error loading game details:", error);
    }
  }, []);

  const fetchFromApi = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setAchievementsData(null);

      let steamIdToLoad = routeSteamId || user.steamid;
      if (!routeSteamId) {
        try {
          const meRes = await api.get("/api/auth/me");
          if (meRes.data?.user?.steamId) {
            steamIdToLoad = meRes.data.user.steamId;
          }
        } catch {
          // Ignore
        }
      }

      setResolvedSteamId(steamIdToLoad);
      setProfileBanner(null);
      setGameDetails({});
      api
        .get(`/api/steam/profile-background/${steamIdToLoad}`)
        .then((res) => setProfileBanner(res?.data?.backgroundUrl || null))
        .catch(() => setProfileBanner(null));

      const useMeEndpoint = isOwnProfile;

      const profileEndpoint = useMeEndpoint
        ? "/api/steam/me/profile"
        : `/api/steam/profile/${steamIdToLoad}`;
      const gamesEndpoint = useMeEndpoint
        ? "/api/steam/me/games"
        : `/api/steam/games/${steamIdToLoad}`;
      const recentEndpoint = useMeEndpoint
        ? "/api/steam/me/recent"
        : `/api/steam/recent/${steamIdToLoad}`;
      const genresEndpoint = useMeEndpoint
        ? "/api/steam/stats/me/genres"
        : `/api/steam/stats/genres/${steamIdToLoad}`;
      const achievementsEndpoint = useMeEndpoint
        ? "/api/steam/stats/me/achievements"
        : `/api/steam/stats/achievements/${steamIdToLoad}`;

      const [profileRes, gamesRes, recentRes, genresRes] = await Promise.all([
        api.get(profileEndpoint),
        api.get(gamesEndpoint),
        api.get(recentEndpoint),
        api.get(genresEndpoint).catch(() => ({ data: null })),
      ]);

      const profileData = profileRes.data || {};
      if (gamesRes.data?.libraryValue !== undefined) {
        profileData.libraryValue = gamesRes.data.libraryValue;
      }

      const currentLibraryStatus: LibraryDataStatus | null =
        gamesRes.data?.dataStatus || null;

      setLibraryStatus(currentLibraryStatus);

      const liveGames: Game[] = gamesRes.data?.games || [];
      const liveRecent: RecentGame[] = recentRes.data?.games || [];
      const liveGenreData = genresRes?.data || null;

      if (isOwnProfile && steamIdToLoad && liveGames.length === 0) {
        const snapshot = readProfileSnapshot(steamIdToLoad);
        if (snapshot && snapshot.games.length > 0) {
          setProfile(
            snapshot.profile ||
            (Object.keys(profileData).length > 0 ? profileData : null),
          );
          setGames(snapshot.games || []);
          setRecentGames(snapshot.recentGames || []);
          setGenreData(snapshot.genreData || null);
          setAchievementsData(snapshot.achievementsData || null);
          setUsingSnapshot(true);
          setSnapshotCachedAt(snapshot.cachedAt || null);
        } else {
          setProfile(Object.keys(profileData).length > 0 ? profileData : null);
          setGames(liveGames);
          setRecentGames(liveRecent);
          setGenreData(liveGenreData);
          setUsingSnapshot(false);
          setSnapshotCachedAt(null);
        }
      } else {
        setProfile(Object.keys(profileData).length > 0 ? profileData : null);
        setGames(liveGames);
        setRecentGames(liveRecent);
        setGenreData(liveGenreData);
        setUsingSnapshot(false);
        setSnapshotCachedAt(null);
      }
      setLoading(false);
      void loadGameDetails(liveGames);

      if (steamIdToLoad && liveGames.length > 0) {
        const cacheData = {
          profile: Object.keys(profileData).length > 0 ? profileData : null,
          games: liveGames,
          recentGames: liveRecent,
          genreData: liveGenreData,
          achievementsData: null,
          cachedAt: Date.now(),
        };
        writeSessionCache(steamIdToLoad, cacheData);
        setSnapshotCachedAt(cacheData.cachedAt);
        if (isOwnProfile) {
          writeProfileSnapshot(steamIdToLoad, cacheData);
        }
      }

      api
        .get(achievementsEndpoint)
        .then((res) => {
          const nextAchievements = res.data || { empty: true };
          setAchievementsData(nextAchievements);

          if (steamIdToLoad && liveGames.length > 0) {
            const prevCache = readSessionCache(steamIdToLoad);
            if (prevCache) {
              const updatedCache = {
                ...prevCache,
                achievementsData: nextAchievements,
                cachedAt: Date.now(),
              };
              writeSessionCache(steamIdToLoad, updatedCache);
              if (isOwnProfile) {
                writeProfileSnapshot(steamIdToLoad, updatedCache);
              }
            }
          }
        })
        .catch((err) => {
          console.error("Error loading achievements:", err);
          setAchievementsData({ error: true });
        });
    } catch (error: any) {
      console.error("Error loading profile:", error);
      const status = error?.response?.status;
      if (status === 403) {
        setLoadError("Este perfil es privado en Steam.");
      } else if (status === 404) {
        setLoadError("No hemos encontrado este perfil.");
      } else {
        setLoadError("No se ha podido cargar el perfil.");
      }
      setLoading(false);
    }
  }, [routeSteamId, user, isOwnProfile]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      let steamIdToLoad = routeSteamId || user.steamid;
      if (!routeSteamId) {
        try {
          const meRes = await api.get("/api/auth/me");
          if (meRes.data?.user?.steamId) {
            steamIdToLoad = meRes.data.user.steamId;
          }
        } catch {
          // ignore
        }
      }

      const sessionCache = readSessionCache(steamIdToLoad);
      if (sessionCache && sessionCache.games.length > 0) {
        setProfile(sessionCache.profile);
        setGames(sessionCache.games || []);
        setRecentGames(sessionCache.recentGames || []);
        setGenreData(sessionCache.genreData || null);
        setAchievementsData(sessionCache.achievementsData || null);
        setSnapshotCachedAt(sessionCache.cachedAt || null);
        setUsingSnapshot(false);
        setLoading(false);
        void loadGameDetails(sessionCache.games || []);
        api
          .get(`/api/steam/profile-background/${steamIdToLoad}`)
          .then((res) => setProfileBanner(res?.data?.backgroundUrl || null))
          .catch(() => setProfileBanner(null));
        return;
      }

      if (isOwnProfile) {
        const snapshot = readProfileSnapshot(steamIdToLoad);
        if (snapshot && snapshot.games.length > 0) {
          setProfile(snapshot.profile || null);
          setGames(snapshot.games || []);
          setRecentGames(snapshot.recentGames || []);
          setGenreData(snapshot.genreData || null);
          setAchievementsData(snapshot.achievementsData || null);
          setSnapshotCachedAt(snapshot.cachedAt || null);
          setUsingSnapshot(true);
          setLoading(false);
          void loadGameDetails(snapshot.games || []);
          api
            .get(`/api/steam/profile-background/${steamIdToLoad}`)
            .then((res) => setProfileBanner(res?.data?.backgroundUrl || null))
            .catch(() => setProfileBanner(null));
          return;
        }
      } else {
        void fetchFromApi();
        return;
      }

      setLoading(false);
    })();
  }, [user, routeSteamId, isOwnProfile]);

  if (!user) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#51a2ff]/30 border-t-[#51a2ff] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#62748e]">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  const displayName =
    profile?.username || (isOwnProfile ? user.personaname : "Usuario");
  const displayAvatar =
    profile?.avatar || (isOwnProfile ? user.avatarfull : "");
  const displayProfileUrl =
    profile?.profileUrl || (isOwnProfile ? user.profileurl : "");
  const displaySteamId = targetSteamId || user.steamid;

  const sourceGames = games;
  const snapshotDateLabel = snapshotCachedAt
    ? new Date(snapshotCachedAt).toLocaleString("es-ES")
    : "";
  const noLibraryReason = libraryStatus?.reason || null;
  const feedbackTone = loadError
    ? "from-[#7c2d12]/20 to-[#dc2626]/10 border-[#7f1d1d]"
    : usingSnapshot
      ? "from-[#155dfc]/20 to-[#00b8db]/10 border-[#2b5cb4]"
      : noLibraryReason === "private_or_unavailable"
        ? "from-[#7c2d12]/20 to-[#dc2626]/10 border-[#7f1d1d]"
        : noLibraryReason === "no_games"
          ? "from-[#92400e]/20 to-[#f59e0b]/10 border-[#b45309]"
          : "from-[#0f172b] to-[#0f172b] border-[#1d293d]";
  const feedbackTitle = loadError
    ? "Perfil no disponible"
    : usingSnapshot
      ? "Mostrando tu último snapshot"
      : noLibraryReason === "private_or_unavailable"
        ? isOwnProfile
          ? "Tu biblioteca de Steam es privada"
          : "Steam no ha devuelto datos públicos"
        : noLibraryReason === "no_games"
          ? isOwnProfile
            ? "No tienes juegos visibles"
            : "Esta cuenta no muestra juegos visibles"
          : null;
  const feedbackText = loadError
    ? loadError
    : usingSnapshot
      ? "Steam no ha respondido con datos completos en esta carga, así que se usa el último estado guardado para que no veas todo a 0."
      : noLibraryReason === "private_or_unavailable"
        ? isOwnProfile
          ? "Steam Web API no permite acceder a bibliotecas privadas. Cambia la privacidad a 'Público' en Steam para verlos aquí."
          : "Los detalles de juegos o logros pueden estar limitados por privacidad."
        : noLibraryReason === "no_games"
          ? isOwnProfile
            ? "No hay juegos visibles en tu cuenta de Steam actualmente."
            : "No hay biblioteca visible para este perfil en este momento."
          : null;
  const totalHours = sourceGames.reduce(
    (acc, game) => acc + hoursFromMinutes(game.playtime),
    0,
  );
  const topGames = [...sourceGames]
    .filter((g) => g.playtime > 0)
    .sort((a, b) => (b.playtime || 0) - (a.playtime || 0))
    .slice(0, 5);

  const memberYear = parseMemberYear(profile?.memberSince);
  const level = profile?.level ?? 0;
  const xpCurrent = profile?.xpCurrent ?? 0;
  const xpTotal = profile?.xpTotal ?? 1;
  const xpProgress = Math.min(
    100,
    Math.max(0, (xpCurrent / Math.max(1, xpTotal)) * 100),
  );

  const libraryValue = profile?.libraryValue ?? 0;

  const memberSinceMs =
    typeof profile?.memberSince === "number"
      ? profile.memberSince > 1e11
        ? profile.memberSince
        : profile.memberSince * 1000
      : memberYear
        ? new Date(memberYear, 0, 1).getTime()
        : Date.now();
  const daysSinceMember = Math.max(
    1,
    Math.floor((Date.now() - memberSinceMs) / 86400000),
  );

  const dailyAverage =
    profile?.dailyAverageHours ??
    Number(((totalHours || 0) / daysSinceMember).toFixed(1));

  const apiAchievements =
    achievementsData === null
      ? "..."
      : (achievementsData?.totalAchievements ??
        profile?.totalAchievements ??
        0);
  const totalAchievements = apiAchievements;
  const achievementsEstimated =
    apiAchievements === 0 && games.length > 0 && achievementsData !== null;

  const apiCompleted =
    achievementsData === null
      ? "..."
      : (achievementsData?.perfectGames ?? profile?.completedGames ?? 0);
  const completedGames = apiCompleted;
  const completedEstimated =
    apiCompleted === 0 && games.length > 0 && achievementsData !== null;

  const isLoadingAchievements = achievementsData === null;
  const hasRareAchievements = achievementsData?.rarestAchievementsList?.length > 0;
  const hasRecentAchievements = achievementsData?.recentAchievementsList?.length > 0;

  const getMappedAchievements = (list: any[]) =>
    (list || []).map((ach: any) => {
      const isUnlocked = ach.unlocked !== false;
      return {
        title: ach.name,
        subtitle: ach.game,
        unlocked: isUnlocked,
        icon: isUnlocked ? Award : Zap,
        cardClass: isUnlocked
          ? "bg-[rgba(254,154,0,0.1)] border-[rgba(254,154,0,0.2)]"
          : "bg-[#162032] border-[#1d293d] opacity-60",
        iconClass: isUnlocked
          ? "bg-[rgba(254,154,0,0.1)] text-[#ffb900]"
          : "bg-transparent text-[#45556c]",
        percent: ach.globalPercent,
      };
    });

  const realAchievements = getMappedAchievements(
    hasRareAchievements
      ? achievementsData.rarestAchievementsList
      : hasRecentAchievements
        ? achievementsData.recentAchievementsList
        : [],
  );

  let displayAchievements: any[];
  if (isLoadingAchievements) {
    displayAchievements = [
      {
        title: "Cargando logros...",
        subtitle: "Examinando juegos...",
        unlocked: false,
        icon: Zap,
        cardClass: "bg-[#162032] border-[#1d293d] opacity-60",
        iconClass: "bg-transparent text-[#45556c]",
      },
    ];
  } else if (realAchievements.length > 0) {
    displayAchievements = realAchievements;
  } else {
    displayAchievements = [
      {
        title: "Sin datos",
        subtitle: "Sin datos de logros disponibles",
        unlocked: false,
        icon: Zap,
        cardClass: "bg-[#162032] border-[#1d293d] opacity-60",
        iconClass: "bg-transparent text-[#45556c]",
      },
    ];
  }

  const genreItems = normalizeGenres(genreData, totalHours).map((item) => {
    const gamesInGenre = sourceGames
      .filter((g) => {
        const details = gameDetails[String(g.appId)];
        return details?.genres?.some(
          (genre) => genre.toLowerCase() === item.name.toLowerCase(),
        );
      })
      .sort((a, b) => (b.playtime || 0) - (a.playtime || 0));
    return { ...item, gamesList: gamesInGenre };
  });

  const gamerIdentity = computeGamerIdentity(genreItems, totalHours);

  const genreTotalHours = genreItems.reduce((sum, item) => sum + item.hours, 0);
  const activeGenre =
    genreItems.find((i) => i.name === hoveredGenre) || genreItems[0] || null;

  // Ajustes del Gráfico de Recharts (Nombres adaptativos)
  const maxTopHours = Math.max(
    ...topGames.map((g) => hoursFromMinutes(g.playtime)),
    1,
  );

  // Transformar nombres largos para que no rompan el gráfico
  const formattedTopGames = topGames.map(g => ({
    name: g.name.length > 20 ? g.name.substring(0, 18) + "..." : g.name,
    fullName: g.name,
    hours: hoursFromMinutes(g.playtime)
  }));

  const libraryRows = (() => {
    if (libraryFilter === "unplayed") {
      return sourceGames.filter((g) => (g.playtime ?? 0) === 0).slice(0, 12);
    }
    if (libraryFilter === "recent") {
      if (recentGames.length > 0) {
        return recentGames
          .map((r) => ({
            appId: r.appId,
            name: r.name,
            playtime: (r.playtimeForever || r.playtime2Weeks || 0) as number,
            icon: r.icon || "",
            lastPlayed: r.lastPlayed,
          }))
          .slice(0, 12);
      }
      return [...sourceGames]
        .filter((game) => (game.lastPlayed ?? 0) > 0)
        .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0))
        .slice(0, 12);
    }

    return [...sourceGames]
      .sort((a, b) => (b.playtime || 0) - (a.playtime || 0))
      .slice(0, 12);
  })();

  const libraryEmptyMessage =
    libraryFilter === "recent"
      ? "Sin actividad reciente en la biblioteca"
      : libraryFilter === "unplayed"
        ? "No hay juegos sin jugar"
        : "Sin juegos disponibles en la biblioteca";

  const recentActivity = recentGames.slice(0, 5).map((r) => ({
    name: r.name,
    action:
      r.playtime2Weeks && r.playtime2Weeks > 0
        ? `Jugó ${(r.playtime2Weeks / 60).toFixed(1)}h`
        : `Jugó ${Math.max(1, Math.round((r.playtimeForever || 0) / 60))}h`,
    when: relativeLabel(r.lastPlayed, "Reciente"),
    tone: "play" as const,
  }));

  const sortedByHours = [...sourceGames].sort(
    (a, b) => (b.playtime || 0) - (a.playtime || 0),
  );
  const playedGames = sortedByHours.filter((g) => (g.playtime || 0) > 0);
  const top3Games = playedGames.slice(0, 3);

  // CÁLCULO DE LA LÍNEA DE TIEMPO (STEAM JOURNEY) - MEJORADO
  const getTimelineEras = () => {
    if (playedGames.length === 0) return [];

    // Crear un mapa de fechas recientes para mayor precisión
    const recentDateMap: Record<number, number> = {};
    recentGames.forEach(rg => {
      if (rg.lastPlayed) recentDateMap[rg.appId] = rg.lastPlayed;
    });

    // 1. Recopilar eras con fechas (Cruzando con datos recientes si falta en la biblioteca)
    const gameEras = playedGames
      .map(g => {
        const ts = recentDateMap[g.appId] || g.lastPlayed || 0;
        const year = ts > 0 ? new Date(ts > 1e11 ? ts : ts * 1000).getFullYear() : null;
        return { year, hours: hoursFromMinutes(g.playtime), name: g.name };
      })
      .filter(g => g.year && g.year >= 2003 && g.year <= new Date().getFullYear());

    const yearMap: Record<number, { hours: number, topGame: string, maxGameHours: number }> = {};
    gameEras.forEach(g => {
      const y = g.year!;
      if (!yearMap[y]) yearMap[y] = { hours: 0, topGame: g.name, maxGameHours: g.hours };
      yearMap[y].hours += g.hours;
      if (g.hours > yearMap[y].maxGameHours) {
        yearMap[y].topGame = g.name;
        yearMap[y].maxGameHours = g.hours;
      }
    });

    let results = Object.entries(yearMap)
      .map(([year, data]) => ({ year: Number(year), ...data }))
      .sort((a, b) => b.year - a.year);

    // 2. Fallback si no hay fechas: Usar el juego más jugado como hito atemporal
    if (results.length === 0 && topGames.length > 0) {
      const main = topGames[0];
      results.push({
        year: memberYear ? Number(memberYear) : new Date().getFullYear(),
        hours: totalHours,
        topGame: main.name,
        maxGameHours: hoursFromMinutes(main.playtime),
        isLegacy: true
      });
    }

    // 3. Añadir origen
    if (memberYear && !results.some(r => r.year === Number(memberYear))) {
      results.push({
        year: Number(memberYear),
        hours: 0,
        topGame: "Llegada a Steam",
        maxGameHours: 0,
        isOrigin: true
      });
    }

    return results.sort((a, b) => b.year - a.year).slice(0, 3);
  };

  const timelineEras = getTimelineEras();

  const recentGameIds = new Set(recentGames.map((g) => g.appId));
  const signaturePick =
    playedGames
      .map((game) => {
        const hours = hoursFromMinutes(game.playtime);
        const pctRatio = totalHours > 0 ? hours / totalHours : 0;
        const lastPlayedMs = game.lastPlayed
          ? game.lastPlayed > 1e11
            ? game.lastPlayed
            : game.lastPlayed * 1000
          : 0;
        const daysSince = lastPlayedMs
          ? (Date.now() - lastPlayedMs) / 86400000
          : Number.POSITIVE_INFINITY;
        const recencyBonus =
          daysSince <= 7 ? 40 : daysSince <= 14 ? 25 : daysSince <= 30 ? 10 : 0;
        const recentBonus = recentGameIds.has(game.appId) ? 20 : 0;
        const score = hours * 1.4 + pctRatio * 120 + recencyBonus + recentBonus;
        return {
          game,
          hours,
          pctRatio,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)[0] || null;

  const signatureGame = signaturePick?.game || null;
  const signatureHours = signaturePick?.hours || 0;
  const signaturePct = signaturePick
    ? Math.round(signaturePick.pctRatio * 100)
    : 0;
  const signatureLastPlayed = signatureGame?.lastPlayed
    ? relativeLabel(signatureGame.lastPlayed, "Reciente")
    : "Sin actividad reciente";

  const signatureTitle = signatureGame ? signatureGame.name : "Sin datos aun";
  const signatureDetail = signatureGame
    ? `${signatureHours}h · ${signaturePct}% de tu tiempo`
    : "Juega un poco mas para definirlo";
  const signatureSub = signatureGame
    ? `Última sesión: ${signatureLastPlayed}`
    : "Sin actividad reciente detectada";

  const resolveGameCover = (game: Game, fallback?: string) => {
    const detail = gameDetails[String(game.appId)];
    return detail?.headerImage || gameImage(game.appId, fallback || game.icon);
  };

  const resolveGameGenres = (game: Game) => {
    const detail = gameDetails[String(game.appId)];
    return (detail?.genres || []).map((g) => g.toLowerCase());
  };

  const identityKeywords = (gamerIdentity.keywords || [])
    .map((k) => k.toLowerCase())
    .filter(Boolean);
  const identityMatches =
    identityKeywords.length > 0
      ? playedGames.filter((game) => {
        const genres = resolveGameGenres(game);
        return identityKeywords.some((keyword) =>
          genres.some((genre) => genre.includes(keyword)),
        );
      })
      : [];
  const identityGames = (
    identityMatches.length > 0 ? identityMatches : topGames
  ).slice(0, 4);
  const identityNote =
    identityMatches.length > 0
      ? `Juegos que refuerzan tu rol de ${gamerIdentity.label}`
      : "Mostrando tus más jugados";

  const signatureCover = signatureGame ? resolveGameCover(signatureGame) : "";

  const stats = [
    {
      label: "Tiempo Total",
      value: `${totalHours}h`,
      Icon: Clock,
      valueClass: "text-[#51a2ff]",
      cardClass: "bg-[rgba(43,127,255,0.1)] border-[rgba(43,127,255,0.2)]",
      iconClass: "text-[#51a2ff]",
    },
    {
      label: "Juegos",
      value: `${sourceGames.length}`,
      Icon: Gamepad2,
      valueClass: "text-[#00d492]",
      cardClass: "bg-[rgba(0,188,125,0.1)] border-[rgba(0,188,125,0.2)]",
      iconClass: "text-[#00d492]",
    },
    {
      label: "Valor Biblioteca",
      value: `$${libraryValue.toLocaleString()}`,
      Icon: DollarSign,
      valueClass: "text-[#c27aff]",
      cardClass: "bg-[rgba(173,70,255,0.1)] border-[rgba(173,70,255,0.2)]",
      iconClass: "text-[#c27aff]",
    },
    {
      label: "Media/Día",
      value: `${dailyAverage}h`,
      Icon: TrendingUp,
      valueClass: "text-[#00d3f3]",
      cardClass: "bg-[rgba(0,184,219,0.1)] border-[rgba(0,184,219,0.2)]",
      iconClass: "text-[#00d3f3]",
    },
    {
      label: "Logros",
      value: `${totalAchievements}`,
      warning: achievementsEstimated
        ? "Steam no devolvió datos de logros"
        : undefined,
      Icon: Trophy,
      valueClass: "text-[#ffb900]",
      cardClass: "bg-[rgba(254,154,0,0.1)] border-[rgba(254,154,0,0.2)]",
      iconClass: "text-[#ffb900]",
    },
    {
      label: "Completados",
      value: `${completedGames}`,
      warning: completedEstimated
        ? "Steam no devolvió juegos completados"
        : undefined,
      Icon: Award,
      valueClass: "text-[#ff637e]",
      cardClass: "bg-[rgba(255,32,86,0.1)] border-[rgba(255,32,86,0.2)]",
      iconClass: "text-[#ff637e]",
    },
  ];

  return (
    <div className="space-y-6 pb-20 px-4 md:px-8">
      <section className="relative rounded-[16px] overflow-hidden shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <div className="relative h-[180px] sm:h-[224px]">
          {profileBanner ? (
            <img
              src={profileBanner}
              alt="Fondo de perfil"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0d1f3c] via-[#0f172b] to-[#1a0a2e]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020618] via-[rgba(2,6,24,0.6)] to-[rgba(2,6,24,0.2)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[rgba(21,93,252,0.1)] to-[rgba(152,16,250,0.1)]" />
        </div>

        <div className="relative bg-[#0f172b] border border-[#1d293d] pt-5 pb-4 px-4 sm:px-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
            <div className="relative -mt-16 sm:-mt-20 shrink-0">
              <div className="w-[96px] h-[96px] sm:w-[128px] sm:h-[128px] rounded-[16px] border-4 border-[#0f172b] shadow-[0px_0px_0px_2px_rgba(43,127,255,0.5),0px_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden bg-[#0b1225]">
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-[3px] border-[#0f172b] opacity-70 ${!profile?.status || profile.status === 0
                  ? "bg-[#62748e]"
                  : profile.status === 3 || profile.status === 4
                    ? "bg-[#f59e0b]"
                    : "bg-[#00c950]"
                }`} />
            </div>

            <div className="flex-1 pt-2 sm:pt-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2 -mt-1">
                <h1 className="text-[28px] sm:text-[36px] lg:text-[42px] xl:text-[48px] leading-[1.2] font-bold text-white break-words max-w-full">
                  {displayName}
                </h1>
                <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white bg-gradient-to-r from-[#51a2ff] to-[#00b8db] shrink-0">
                  Lv.{level}
                </span>
                <span className="text-[12px] text-[#62748e] shrink-0">
                  {profile?.title}
                </span>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 max-w-[520px]">
                <div className="w-full sm:flex-1 h-2 bg-[#1d293d] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#51a2ff] to-[#00b8db]"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#62748e] whitespace-nowrap">
                  {xpCurrent}/{xpTotal} XP
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="bg-[#1d293d] rounded-[4px] px-2 py-1 text-[10px] text-[#90a1b9] font-mono">
                  ID:{" "}
                  {displaySteamId ? `${displaySteamId.slice(0, 6)}...` : "-"}
                </span>
                {(() => {
                  const s = profile?.status;
                  if (s === 0 || s === null || s === undefined) {
                    return (
                      <span className="bg-[rgba(30,30,30,0.5)] rounded-[4px] px-2 py-1 text-[10px] text-[#62748e]">
                        Offline
                      </span>
                    );
                  }
                  const labels: Record<number, string> = {
                    1: "Online",
                    2: "Ocupado",
                    3: "Ausente",
                    4: "Durmiendo",
                    5: "Trading",
                    6: "Jugando",
                  };
                  return (
                    <span className="bg-[rgba(13,84,43,0.3)] rounded-[4px] px-2 py-1 text-[10px] text-[#05df72]">
                      {labels[s] ?? "Online"}
                    </span>
                  );
                })()}
                <span className="bg-[rgba(28,57,142,0.3)] rounded-[4px] px-2 py-1 text-[10px] text-[#51a2ff]">
                  {memberYear ? (
                    `Miembro desde ${memberYear}`
                  ) : (
                    <span title="Steam no devolvió fecha">
                      Miembro desde ⚠
                    </span>
                  )}
                </span>
                {!isOwnProfile && profile?._id && (
                  <ReportButton
                    targetId={profile._id}
                    targetType="user"
                    buttonLabel="Reportar perfil"
                    buttonClassName="inline-flex items-center gap-1.5 ml-2 text-[#90a1b9] text-[12px] hover:text-[#ff8a8c] transition-colors"
                  />
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-2 pt-2">
              <a
                href={displayProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-[34px] px-3 rounded-[10px] bg-[#1d293d] border border-[#314158] text-[#cad5e2] text-[12px] flex items-center gap-1.5 hover:bg-[#263550] transition-colors"
              >
                <ExternalLink size={13} /> Steam
              </a>
              {isOwnProfile && (
                <button
                  onClick={logout}
                  className="h-[34px] w-[34px] rounded-[10px] border border-[rgba(130,24,26,0.3)] text-[#ff637e] flex items-center justify-center hover:bg-[rgba(130,24,26,0.15)] transition-colors cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className={`h-[78px] rounded-[14px] border px-[15px] pt-[15px] pb-1 ${stat.cardClass}`}
          >
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.45px] text-[#62748e]">
              <stat.Icon size={14} className={stat.iconClass} />
              {stat.label}
            </div>
            <p className={`mt-[6px] text-[20px] leading-7 font-bold ${stat.valueClass}`}>
              {stat.value}
            </p>
          </article>
        ))}
      </section>

      <section className="flex justify-end items-center gap-3">
        <div className="flex items-center gap-3 mr-2">
          {snapshotDateLabel && (
            <div className="text-[#bfdbfe] text-[13px]">
              Última actualización:{" "}
              <span className="font-medium">{snapshotDateLabel}</span>
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            className="h-9 px-3 rounded-[10px] bg-[#155dfc] text-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-[#2b7fff] transition-colors"
            onClick={() => void fetchFromApi()}
          >
            <RefreshCw size={14} /> Refrescar
          </button>
        </div>
      </section>

      {feedbackTitle && feedbackText && (!usingSnapshot || loadError) && (
        <section className={`rounded-[16px] border bg-gradient-to-r px-4 py-4 ${feedbackTone}`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-9 w-9 shrink-0 rounded-[12px] bg-[#0f172b]/70 border border-white/10 flex items-center justify-center">
              <Sparkles size={16} className="text-[#f8fafc]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-[15px] leading-6">
                {feedbackTitle}
              </h3>
              <p className="mt-1 text-[#cbd5e1] text-[13px] leading-5">
                {feedbackText}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* BLOQUE MEJORADO: GRÁFICO DE BARRAS RESPONSIVE */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[16px] px-5 py-5 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)] flex flex-col">
          <h3 className="text-white text-[24px] font-bold flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-[#ffb900]" /> Top 5 Más Jugados
          </h3>

          <div className="flex-1 w-full mt-2 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={formattedTopGames}
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <XAxis type="number" hide domain={[0, 'dataMax']} />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  width={140}
                  tick={{ fill: "#cbd5e1", fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(81,162,255,0.1)", radius: 8 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0f172b]/95 backdrop-blur border border-[#314158] rounded-[12px] p-3 shadow-2xl">
                          <p className="text-white text-[13px] font-black mb-1">
                            {data.fullName}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-[#51a2ff]" />
                            <p className="text-[#51a2ff] text-[12px] font-bold">
                              {data.hours.toLocaleString()} horas jugadas
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="hours"
                  radius={[0, 6, 6, 0]}
                  barSize={32}
                  background={{ fill: "rgba(29, 41, 61, 0.3)", radius: 6 }}
                >
                  {formattedTopGames.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={[
                        "#3b82f6", // Blue
                        "#6366f1", // Indigo
                        "#8b5cf6", // Violet
                        "#a855f7", // Purple
                        "#d946ef", // Fuchsia
                      ][index % 5]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* GRÁFICO CIRCULAR DE GÉNEROS (Mantenido igual, funciona bien) */}
        <article className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[16px] px-5 py-5 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white text-[24px] font-bold flex items-center gap-2">
              <Gamepad2 size={18} className="text-[#8b5cf6]" /> Géneros Favoritos
            </h3>
            <span className="bg-[#1d293d] rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.5px] text-[#62748e]">
              {genreTotalHours || 0}h total
            </span>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-6 mt-2 min-h-[300px]">
            {/* Izquierda: Gráfico */}
            <div className="w-full lg:w-1/2 h-[280px] flex items-center justify-center relative group/pie">
              {activeGenre ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genreItems}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={105}
                        paddingAngle={4}
                        dataKey="hours"
                        stroke="none"
                        onMouseEnter={(_, index) => setHoveredGenre(genreItems[index].name)}
                        onMouseLeave={() => setHoveredGenre(null)}
                      >
                        {genreItems.map((item, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={item.color}
                            opacity={hoveredGenre === null || hoveredGenre === item.name ? 1 : 0.3}
                            style={{ transition: "all 0.3s ease" }}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
                    <p className="text-white text-[20px] font-black leading-tight">
                      {activeGenre.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="h-[18px] px-2 rounded-full bg-[#155dfc]/20 border border-[#155dfc]/30 text-[#51a2ff] text-[10px] font-black uppercase">
                        {activeGenre.pct}%
                      </span>
                      <p className="text-[#94a3b8] text-[12px] font-bold">
                        {activeGenre.hours}h
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-[#f59e0b] text-[12px] font-medium">
                    Sin datos de géneros disponibles
                  </span>
                </div>
              )}
            </div>

            {/* Derecha: Lista de Juegos */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center">
              {activeGenre && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <p className="text-[11px] uppercase tracking-wider text-[#62748e] mb-3 font-black flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeGenre.color }} />
                    Títulos de {activeGenre.name}
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {(activeGenre as any).gamesList?.slice(0, 10).map((g: any) => (
                      <div
                        key={g.appId}
                        className="group/gameitem relative aspect-[3/4] rounded-lg overflow-hidden border border-[#1d293d] hover:border-[#51a2ff] transition-all shadow-lg"
                        title={`${g.name} (${hoursFromMinutes(g.playtime)}h)`}
                      >
                        <img
                          src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appId}/library_600x900.jpg`}
                          alt={g.name}
                          className="w-full h-full object-cover grayscale-[0.2] group-hover/gameitem:grayscale-0 group-hover/gameitem:scale-110 transition-all duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = gameImage(g.appId, g.icon);
                          }}
                        />
                      </div>
                    ))}
                    {(activeGenre as any).gamesList?.length > 10 && (
                      <div className="aspect-[3/4] rounded-lg bg-[#1d293d]/50 border border-[#1d293d] flex items-center justify-center text-[11px] text-[#62748e] font-black">
                        +{(activeGenre as any).gamesList.length - 10}
                      </div>
                    )}
                  </div>
                  {(activeGenre as any).gamesList?.length === 0 && (
                    <p className="text-[12px] text-[#45556c] italic py-4">No se han detectado títulos específicos</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-4 pt-4 border-t border-[#1d293d]/30">
            {genreItems.slice(0, 6).map((item) => (
              <div
                key={item.name}
                onMouseEnter={() => setHoveredGenre(item.name)}
                onMouseLeave={() => setHoveredGenre(null)}
                className={`px-2.5 py-1 rounded-[8px] flex items-center gap-1.5 transition-all cursor-default ${hoveredGenre === item.name
                    ? "bg-[#2b5cb4] shadow-lg scale-105"
                    : "bg-[#1d293d] hover:bg-[#263550]"
                  }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-white font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* BLOQUE DE LOGROS */}
      <section className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[16px] px-5 py-5 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-[24px] font-bold flex items-center gap-2">
            <Award size={18} className="text-[#ffb900]" />{" "}
            {realAchievements.length > 0
              ? hasRareAchievements
                ? "Logros Más Destacados"
                : "Logros Recientes"
              : "Logros de Perfil"}
          </h3>
          <span className="bg-[#1d293d] rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.5px] text-[#62748e]">
            {isLoadingAchievements
              ? "CARGANDO..."
              : displayAchievements.length > 0
                ? `${displayAchievements.filter((a: any) => a.unlocked).length}/${displayAchievements.length} LOGROS`
                : "0 LOGROS"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {displayAchievements.map((achievement: any, i: number) => (
            <article
              key={`${achievement.title}-${i}`}
              className={`h-[53px] rounded-[14px] border px-[13px] flex items-center gap-3 ${achievement.cardClass}`}
            >
              <div className={`w-7 h-7 rounded-[10px] flex items-center justify-center ${achievement.iconClass}`}>
                <achievement.icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[12px] leading-4 font-bold truncate ${achievement.unlocked ? "text-white" : "text-[#45556c]"}`}>
                  {achievement.title}
                </p>
                <p className="text-[10px] leading-[15px] text-[#62748e] truncate flex items-center gap-1">
                  {achievement.subtitle}
                  {achievement.percent != null && (
                    <span className="text-[#ffb900]">({achievement.percent}%)</span>
                  )}
                </p>
              </div>
              {achievement.unlocked && <Check size={14} className="text-[#00d492]" />}
            </article>
          ))}
        </div>
      </section>

      {/* BLOQUE DE BIBLIOTECA COMPLETA */}
      <section className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[16px] px-5 py-5 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white text-[24px] font-bold flex items-center gap-2">
            <Gamepad2 size={18} className="text-[#8b5cf6]" /> Biblioteca ({sourceGames.length})
          </h3>
          <div className="bg-[#1d293d] rounded-[10px] p-[2px] flex items-center gap-1">
            {(
              [
                { id: "top", label: "Top" },
                { id: "recent", label: "Recientes" },
                { id: "unplayed", label: "Sin jugar" },
              ] as { id: LibraryFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLibraryFilter(tab.id)}
                className={`h-[23px] px-[10px] rounded-[8px] text-[10px] font-medium transition-colors ${libraryFilter === tab.id
                    ? "bg-[#155dfc] text-white"
                    : "text-[#90a1b9] hover:text-white"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {libraryRows.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-[#62748e] text-[12px]">
            {libraryEmptyMessage}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {libraryRows.map((game) => {
              const gameHours = hoursFromMinutes(game.playtime);
              const gamePercentage = totalHours > 0 ? Math.round((gameHours / totalHours) * 100) : 0;
              const lastPlayedLabel = relativeLabel(game.lastPlayed, "Nunca");

              return (
                <Link
                  key={game.appId}
                  to={`/game/${game.appId}`}
                  className="group relative rounded-[14px] overflow-hidden border border-[#1d293d] hover:border-[#2b5cb4] transition-all duration-300"
                >
                  <div className="aspect-[3/4] relative overflow-hidden bg-[#162032]">
                    <img
                      src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/library_600x900.jpg`}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Si falla la imagen vertical, usar el header apaisado centrado
                        target.src = gameImage(game.appId, game.icon);
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020618] via-[#020618]/50 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-[12px] font-bold leading-tight truncate mb-1">
                      {game.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#51a2ff] font-semibold">
                        {gameHours}h
                      </span>
                      <span className="text-[9px] text-[#62748e]">
                        {lastPlayedLabel}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* BLOQUE CURIOSIDADES MEJORADO (INSIGHTS) */}
      <section className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[16px] px-5 py-5 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-[24px] font-bold flex items-center gap-2">
            <Sparkles size={18} className="text-[#51a2ff]" /> Curiosidades del Perfil
          </h3>
          <span className="bg-[#1d293d] rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.5px] text-[#62748e]">
            INSIGHTS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Identidad Gamer */}
          <article className="relative overflow-hidden rounded-[20px] border border-[#1d293d] bg-gradient-to-br from-[#080e1c] to-[#0f172b] p-5 shadow-xl flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-3 opacity-5">
              <Users size={100} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[1px] font-black text-[#51a2ff]">
                <span className="text-[16px]">{gamerIdentity.emoji}</span> Identidad Principal
              </div>
              <p className="mt-3 text-[24px] font-black text-white leading-tight">
                {gamerIdentity.label}
              </p>
              <p className="mt-1 text-[12px] text-[#94a3b8]">
                {gamerIdentity.detail}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-[#1d293d]/50">
              <p className="text-[9px] uppercase tracking-wider text-[#45556c] mb-2 font-bold">Juegos que lo confirman</p>
              <div className="flex -space-x-2">
                {identityGames.slice(0, 4).map((game, i) => (
                  <img
                    key={game.appId}
                    src={game.icon || resolveGameCover(game)}
                    className="w-8 h-8 rounded-full border-2 border-[#0f172b] object-cover"
                    title={game.name}
                    style={{ zIndex: 10 - i }}
                  />
                ))}
              </div>
            </div>
          </article>

          {/* Juego Firma */}
          <article className="relative overflow-hidden rounded-[20px] border border-[#1d293d] bg-gradient-to-br from-[#1a1b2f] to-[#121826] p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[1px] font-black text-[#ffb900]">
                <Flame size={14} /> Tu Juego Firma
              </div>
              <p className="mt-3 text-[22px] font-black text-white leading-tight truncate">
                {signatureTitle}
              </p>
              <p className="mt-1 text-[12px] text-[#94a3b8]">
                {signatureDetail}
              </p>
            </div>

            <div className="mt-4">
              {signatureGame ? (
                <div className="h-[80px] w-full overflow-hidden rounded-[12px] border border-[#1d293d] relative">
                  <img
                    src={signatureCover}
                    alt={signatureTitle}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                    <span className="text-[10px] font-bold text-[#ffb900]">A esto le dedicas tu vida</span>
                  </div>
                </div>
              ) : (
                <div className="h-[80px] w-full rounded-[12px] border border-dashed border-[#314158] flex items-center justify-center text-[10px] text-[#62748e]">
                  Sigue jugando para descubrirlo
                </div>
              )}
            </div>
          </article>

          <article className="relative overflow-hidden rounded-[20px] border border-[#1d293d] bg-gradient-to-br from-[#0b2238] to-[#0f172b] p-5 shadow-xl flex flex-col">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[1px] font-black text-[#00d492]">
              <CalendarDays size={14} /> Steam Journey
            </div>
            <p className="mt-1 text-[11px] text-[#94a3b8] mb-4">
              Hitos y momentos clave de tu historia
            </p>

            <div className="flex-1 flex flex-col justify-center gap-3">
              {timelineEras.length > 0 ? timelineEras.map((era, idx) => (
                <div key={`${era.year}-${idx}`} className="flex items-center gap-3 relative">
                  {idx !== timelineEras.length - 1 && (
                    <div className="absolute left-[13px] top-[24px] w-0.5 h-6 bg-[#1d293d] z-0" />
                  )}
                  <div className={`w-7 h-7 rounded-full bg-[#0b1225] border-2 flex items-center justify-center z-10 shrink-0 ${era.isOrigin ? "border-[#51a2ff]" : "border-[#00d492]"}`}>
                    <span className={`text-[8px] font-black ${era.isOrigin ? "text-[#51a2ff]" : "text-[#00d492]"}`}>
                      {(era.year && era.year > 0) ? String(era.year).slice(2) + "'" : "∞"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 bg-[#162032]/50 border border-[#1d293d] rounded-lg p-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-white font-semibold truncate max-w-[120px]">
                      {(era as any).isOrigin ? "Origen" : era.topGame}
                    </span>
                    <span className="text-[9px] text-[#00d492] font-mono shrink-0">
                      {era.hours > 0 ? `${era.hours}h` : "Inicio"}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center text-[11px] text-[#62748e] py-4">
                  Sigue jugando para generar hitos.
                </div>
              )}
            </div>
          </article>

        </div>
      </section>

    </div>
  );
}