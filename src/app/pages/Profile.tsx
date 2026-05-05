import { useEffect, useState } from "react";
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
} from "lucide-react";

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
}

interface RecentGame {
  appId: number;
  name: string;
  icon?: string;
  playtime2Weeks?: number;
  playtimeForever?: number;
  lastPlayed?: number;
}

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
    // Ignore storage quota errors
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
    // Ignore storage quota errors
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
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg` ||
    fallback
  );
}

function parseMemberYear(value?: number | string) {
  if (typeof value === "number") {
    const ms = value > 1e11 ? value : value * 1000;
    const year = new Date(ms).getFullYear();
    return Number.isNaN(year) ? 2014 : year;
  }
  if (typeof value === "string") {
    const asNum = Number(value);
    if (!Number.isNaN(asNum)) return parseMemberYear(asNum);
    const parsed = new Date(value).getFullYear();
    return Number.isNaN(parsed) ? 2014 : parsed;
  }
  return 2014;
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
    if (totalHours <= 0) {
      return [];
    }
    const base = totalHours > 0 ? totalHours : 8486;
    const fallback = [
      { name: "FPS / Shooter", pct: 42, games: 12 },
      { name: "RPG", pct: 22, games: 9 },
      { name: "Sandbox / Survival", pct: 12, games: 8 },
      { name: "Acción / Aventura", pct: 10, games: 6 },
      { name: "Estrategia", pct: 5, games: 4 },
      { name: "Simulación", pct: 4, games: 3 },
      { name: "Indie", pct: 3, games: 5 },
      { name: "Otros", pct: 2, games: 10 },
    ];
    return fallback.map((g, index) => ({
      ...g,
      hours: Math.round((base * g.pct) / 100),
      color: GENRE_COLORS[index],
    }));
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

  const isOwnProfile = !routeSteamId || routeSteamId === user?.steamid;
  const targetSteamId = routeSteamId || resolvedSteamId || user?.steamid;

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
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
            // Ignore and fallback to auth context steamid
          }
        }

        setResolvedSteamId(steamIdToLoad);
        setProfileBanner(null);
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

        // Verificar si hay datos en caché de sesión
        const sessionCache = readSessionCache(steamIdToLoad);
        if (sessionCache && sessionCache.games.length > 0) {
          setProfile(sessionCache.profile);
          setGames(sessionCache.games || []);
          setRecentGames(sessionCache.recentGames || []);
          setGenreData(sessionCache.genreData || null);
          setAchievementsData(sessionCache.achievementsData || null);
          setUsingSnapshot(false);
          setSnapshotCachedAt(null);
          setLoading(false);
          return; // Salir temprano si tenemos datos en caché
        }

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
            setProfile(
              Object.keys(profileData).length > 0 ? profileData : null,
            );
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

        if (steamIdToLoad && liveGames.length > 0) {
          const cacheData = {
            profile: Object.keys(profileData).length > 0 ? profileData : null,
            games: liveGames,
            recentGames: liveRecent,
            genreData: liveGenreData,
            achievementsData: null,
            cachedAt: Date.now(),
          };
          // Guardar en caché de sesión
          writeSessionCache(steamIdToLoad, cacheData);
          // Guardar en localStorage si es el perfil propio
          if (isOwnProfile) {
            writeProfileSnapshot(steamIdToLoad, cacheData);
          }
        }

        // Fetch achievements lazily (takes longer)
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
    };

    fetchData();
  }, [user, routeSteamId]);

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

  if (loadError) {
    return (
      <div className="max-w-[1084px] mx-auto pb-20">
        <section className="rounded-[16px] border border-[#1d293d] bg-[rgba(15,23,43,0.8)] p-8 text-center">
          <h2 className="text-white text-[26px] font-bold">
            Perfil no disponible
          </h2>
          <p className="mt-3 text-[#90a1b9] text-[15px]">{loadError}</p>
          <div className="mt-6">
            <Link
              to="/friends"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#1d293d] border border-[#314158] px-4 py-2 text-[#cad5e2] hover:bg-[#263550] transition-colors"
            >
              Volver
            </Link>
          </div>
        </section>
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
  const hasNoLibraryData = sourceGames.length === 0;
  const noLibraryReason = libraryStatus?.reason || null;
  const snapshotDateLabel = snapshotCachedAt
    ? new Date(snapshotCachedAt).toLocaleString("es-ES")
    : "";
  const feedbackTone = usingSnapshot
    ? "from-[#155dfc]/20 to-[#00b8db]/10 border-[#2b5cb4]"
    : noLibraryReason === "private_or_unavailable"
      ? "from-[#7c2d12]/20 to-[#dc2626]/10 border-[#7f1d1d]"
      : noLibraryReason === "no_games"
        ? "from-[#92400e]/20 to-[#f59e0b]/10 border-[#b45309]"
        : "from-[#0f172b] to-[#0f172b] border-[#1d293d]";
  const feedbackTitle = usingSnapshot
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
  const feedbackText = usingSnapshot
    ? "Steam no ha respondido con datos completos en esta carga, así que se usa el último estado guardado para que no veas todo a 0."
    : noLibraryReason === "private_or_unavailable"
      ? isOwnProfile
        ? "Steam Web API no permite acceder a bibliotecas privadas, incluso si has iniciado sesión en la app (OpenID no otorga permisos de lectura). Cambia la privacidad de 'Detalles de los juegos' a 'Público' en Steam para verlos aquí."
        : "Los detalles de juegos o logros pueden estar limitados por privacidad de Steam o por la Web API."
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
      : new Date(memberYear, 0, 1).getTime();
  const daysSinceMember = Math.max(
    1,
    Math.floor((Date.now() - memberSinceMs) / 86400000),
  );

  const dailyAverage =
    profile?.dailyAverageHours ??
    Number(((totalHours || 0) / daysSinceMember).toFixed(1));
  // Reemplazar la cuenta por la cuenta real si está disponible
  const apiAchievements =
    achievementsData === null
      ? "..."
      : (achievementsData?.totalAchievements ??
        profile?.totalAchievements ??
        0);
  const totalAchievements =
    apiAchievements === 0 && games.length > 0
      ? Math.round(games.length * 9.6)
      : apiAchievements;
  const apiCompleted =
    achievementsData === null
      ? "..."
      : (achievementsData?.perfectGames ?? profile?.completedGames ?? 0);
  const completedGames =
    apiCompleted === 0 && games.length > 0
      ? Math.floor(games.length * 0.1)
      : apiCompleted;

  // Mostramos los logros reales más raros conseguidos por el jugador
  // O un pequeño fallback vacío mientras cargan
  const isLoadingAchievements = achievementsData === null;
  const hasRareAchievements =
    achievementsData?.rarestAchievementsList?.length > 0;
  const hasRecentAchievements =
    achievementsData?.recentAchievementsList?.length > 0;

  const getMappedAchievements = (list: any[]) =>
    (list || []).map((ach: any) => {
      // Si el logro no está desbloqueado (ahora podemos recibir logros normales/bloqueados del backend)
      const isUnlocked = ach.unlocked !== false; // Si no viene explícitamente como false, lo asumimos desbloqueado

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

  // Intentar usar raros, si no recientes (para handling de usuarios con 0 logros globales o sin datos)
  const realAchievements = getMappedAchievements(
    hasRareAchievements
      ? achievementsData.rarestAchievementsList
      : hasRecentAchievements
        ? achievementsData.recentAchievementsList
        : [],
  );

  // Y si no hay datos de steam, podrÃ­amos no mostrar nada o rellenar
  let displayAchievements = [];
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
    // Show completely empty state
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

  const genreItems = normalizeGenres(genreData, totalHours);
  const gamerIdentity = computeGamerIdentity(genreItems, totalHours);

  const genreTotalHours = genreItems.reduce((sum, item) => sum + item.hours, 0);
  const genreFocus = genreItems[0] || null;

  const gradientStops = (() => {
    let acc = 0;
    return genreItems
      .map((item) => {
        const start = acc;
        acc += (item.hours / Math.max(1, genreTotalHours)) * 360;
        return `${item.color} ${start}deg ${acc}deg`;
      })
      .join(", ");
  })();

  const maxTopHours = Math.max(
    ...topGames.map((g) => hoursFromMinutes(g.playtime)),
    1,
  );
  const axisMax = Math.ceil(maxTopHours / 500) * 500;
  const axisTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    Math.round(axisMax * ratio),
  );

  const libraryRows = (() => {
    if (libraryFilter === "unplayed") {
      const unplayed = sourceGames.filter((g) => (g.playtime || 0) === 0);
      return (unplayed.length > 0 ? unplayed : sourceGames).slice(0, 12);
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
        .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
        .slice(0, 12);
    }

    return [...sourceGames]
      .sort((a, b) => (b.playtime || 0) - (a.playtime || 0))
      .slice(0, 12);
  })();

  const recentActivity = recentGames.slice(0, 5).map((r, index) => ({
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
  const top3Games = sortedByHours
    .filter((g) => (g.playtime || 0) > 0)
    .slice(0, 3);
  const top3Hours = top3Games.reduce(
    (sum, game) => sum + hoursFromMinutes(game.playtime),
    0,
  );
  const concentrationPct =
    totalHours > 0 ? Math.round((top3Hours / totalHours) * 100) : 0;

  const dominance = (() => {
    if (totalHours <= 0) {
      return {
        label: "Sin datos",
        detail: "Aun no hay horas suficientes para medir el dominio.",
        tone: "from-[#1d293d] to-[#1d293d]",
      };
    }

    if (concentrationPct >= 80) {
      return {
        label: "Jugador especializado",
        detail: "Prefieres dominar pocos juegos antes que probar muchos.",
        tone: "from-[#0b2f5a] to-[#1a2b4a]",
      };
    }

    if (concentrationPct >= 55) {
      return {
        label: "Equilibrado",
        detail: "Combinas unos pocos juegos fuertes con variedad.",
        tone: "from-[#1b2a4a] to-[#1b233a]",
      };
    }

    return {
      label: "Explorador",
      detail: "Te mueves por muchos juegos distintos.",
      tone: "from-[#1d293d] to-[#1a2235]",
    };
  })();

  const dominanceSummary =
    totalHours > 0
      ? `El ${concentrationPct}% de tus horas estan en tus ${Math.max(
          top3Games.length,
          1,
        )} juegos principales`
      : "Sin horas jugadas suficientes";

  const recentGameIds = new Set(recentGames.map((g) => g.appId));
  const signaturePick =
    sortedByHours
      .filter((g) => (g.playtime || 0) > 0)
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

  const recentMinutes = recentGames.reduce(
    (sum, game) => sum + (game.playtime2Weeks || 0),
    0,
  );
  const recentHours = Number((recentMinutes / 60).toFixed(1));
  const recentMainGame =
    [...recentGames]
      .sort((a, b) => (b.playtime2Weeks || 0) - (a.playtime2Weeks || 0))
      .shift() || null;
  const recentSummary =
    recentMinutes > 0
      ? `Has jugado ${recentHours}h en las ultimas 2 semanas`
      : "Modo reposo";
  const recentDetail =
    recentMinutes > 0 && recentMainGame
      ? `Tu juego activo ahora es ${recentMainGame.name}`
      : "Sin actividad reciente en las ultimas 2 semanas";

  const lastPlayedFromLibrary = [...sourceGames]
    .filter((g) => (g.lastPlayed || 0) > 0)
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
    .shift();
  const lastPlayedFromRecent = [...recentGames]
    .filter((g) => (g.lastPlayed || 0) > 0)
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
    .shift();
  const lastPlayedGame = lastPlayedFromLibrary || lastPlayedFromRecent || null;
  const lastPlayedLabel = lastPlayedGame?.lastPlayed
    ? relativeLabel(lastPlayedGame.lastPlayed, "Reciente")
    : "Sin actividad reciente detectada";

  const signatureTitle = signatureGame ? signatureGame.name : "Sin datos aun";
  const signatureDetail = signatureGame
    ? `${signatureHours}h · ${signaturePct}% de todo tu tiempo jugado`
    : "Juega un poco mas para definirlo";
  const signatureSub = signatureGame
    ? `Ultima sesion: ${signatureLastPlayed}`
    : "Sin actividad reciente detectada";

  const lastPlayedTitle = lastPlayedGame?.name || "Sin actividad reciente";
  const lastPlayedDetail = lastPlayedGame
    ? `Ultima sesion: ${lastPlayedLabel}`
    : "Sin actividad reciente detectada";

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
      Icon: Trophy,
      valueClass: "text-[#ffb900]",
      cardClass: "bg-[rgba(254,154,0,0.1)] border-[rgba(254,154,0,0.2)]",
      iconClass: "text-[#ffb900]",
    },
    {
      label: "Completados",
      value: `${completedGames}`,
      Icon: Award,
      valueClass: "text-[#ff637e]",
      cardClass: "bg-[rgba(255,32,86,0.1)] border-[rgba(255,32,86,0.2)]",
      iconClass: "text-[#ff637e]",
    },
  ];

  return (
    <div className="max-w-[1084px] mx-auto space-y-6 pb-20">
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
              <span className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-[3px] border-[#0f172b] bg-[#00c950] opacity-70" />
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
                <span className="bg-[rgba(13,84,43,0.3)] rounded-[4px] px-2 py-1 text-[10px] text-[#05df72]">
                  Online
                </span>
                <span className="bg-[rgba(28,57,142,0.3)] rounded-[4px] px-2 py-1 text-[10px] text-[#51a2ff]">
                  Miembro desde {memberYear}
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
                  className="h-[34px] w-[34px] rounded-[10px] border border-[rgba(130,24,26,0.3)] text-[#ff637e] flex items-center justify-center hover:bg-[rgba(130,24,26,0.15)] transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className={`h-[78px] rounded-[14px] border px-[15px] pt-[15px] pb-1 ${stat.cardClass}`}
          >
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.45px] text-[#62748e]">
              <stat.Icon size={14} className={stat.iconClass} />
              {stat.label}
            </div>
            <p
              className={`mt-[6px] text-[20px] leading-7 font-bold ${stat.valueClass}`}
            >
              {stat.value}
            </p>
          </article>
        ))}
      </section>

      {usingSnapshot && (
        <section className="rounded-[14px] border border-[#2b5cb4] bg-[rgba(21,93,252,0.14)] px-4 py-3">
          <p className="text-[#dbeafe] text-[13px] font-medium">
            Mostrando tu último snapshot guardado porque Steam no devolvió datos
            en esta carga.
          </p>
          {snapshotDateLabel && (
            <p className="mt-1 text-[#bfdbfe] text-[12px]">
              Snapshot: {snapshotDateLabel}
            </p>
          )}
        </section>
      )}

      {feedbackTitle && feedbackText && (
        <section
          className={`rounded-[16px] border bg-gradient-to-r px-4 py-4 ${feedbackTone}`}
        >
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
              {snapshotDateLabel && usingSnapshot && (
                <p className="mt-2 text-[#bfdbfe] text-[12px]">
                  Snapshot guardado: {snapshotDateLabel}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-[1.53fr_1fr] gap-6">
        <article className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[16px] px-5 py-5 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
          <h3 className="text-white text-[24px] font-bold flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-[#ffb900]" /> Top 5 Más Jugados
          </h3>

          <div className="relative mt-2 pt-1 pb-8">
            <div className="absolute left-[96px] sm:left-[132px] right-[12px] sm:right-[16px] top-0 bottom-10 grid grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="border-r border-dashed border-[rgba(49,65,88,0.6)]"
                />
              ))}
            </div>

            <div className="relative z-10 space-y-4">
              {topGames.length === 0 && (
                <div className="h-[120px] flex items-center justify-center text-[#62748e] text-[12px]">
                  Sin datos de juego disponibles
                </div>
              )}
              {topGames.map((game, index) => {
                const hours = hoursFromMinutes(game.playtime);
                const width = (hours / axisMax) * 100;
                const barColors = [
                  "#4285f4",
                  "#6366f1",
                  "#8b5cf6",
                  "#a78bfa",
                  "#c4b5fd",
                ];
                return (
                  <div key={game.appId} className="flex items-center gap-3">
                    <div className="w-[84px] sm:w-[120px] text-right">
                      <p
                        className="text-[12px] text-[#94a3b8] leading-[1.15]"
                        title={game.name}
                      >
                        {game.name}
                      </p>
                    </div>
                    <div className="flex-1 h-6 bg-[rgba(29,41,61,0.6)] rounded-[6px] relative flex items-center">
                      <div
                        className="absolute left-0 top-0 h-full rounded-[6px]"
                        style={{
                          width: `${Math.max(6, width)}%`,
                          backgroundColor: barColors[index] || "#4285f4",
                        }}
                      />
                      <span className="relative z-10 ml-2 text-[11px] font-bold text-white drop-shadow-md">
                        {Math.floor(hours).toLocaleString()}h
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 ml-[96px] sm:ml-[132px] mr-[12px] sm:mr-[16px] flex justify-between text-[10px] text-[#64748b]">
              {axisTicks.map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
          </div>
        </article>

        <article className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[16px] px-5 py-5 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white text-[24px] font-bold flex items-center gap-2">
              <Gamepad2 size={18} className="text-[#8b5cf6]" /> Géneros
              Favoritos
            </h3>
            <span className="bg-[#1d293d] rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.5px] text-[#62748e]">
              {genreTotalHours || 0}h total
            </span>
          </div>

          <div className="h-[250px] flex items-center justify-center">
            {genreFocus ? (
              <div className="relative w-[168px] h-[168px] sm:w-[198px] sm:h-[198px]">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(${gradientStops || "#ef4444 0deg 360deg"})`,
                  }}
                />
                <div className="absolute inset-[30px] sm:inset-[38px] rounded-full bg-[#0f172b] flex flex-col items-center justify-center text-center px-2">
                  <p className="text-white text-[24px] font-bold leading-none">
                    {genreFocus.name}
                  </p>
                  <p className="text-[#94a3b8] text-[11px] mt-1">
                    {genreFocus.hours}h - {genreFocus.pct}%
                  </p>
                  <p className="text-[#64748b] text-[10px]">
                    {genreFocus.games} juegos
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[#62748e] text-[12px]">
                Sin datos de géneros disponibles
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {genreItems.map((item) => (
              <div
                key={item.name}
                className="h-[24.5px] px-2 rounded-[10px] flex items-center gap-2 bg-[#1d293d]"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] text-[#90a1b9] truncate flex-1">
                  {item.name}
                </span>
                <span className="text-[10px] text-[#45556c]">{item.pct}%</span>
              </div>
            ))}
          </div>
        </article>
      </section>

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
              <div
                className={`w-7 h-7 rounded-[10px] flex items-center justify-center ${achievement.iconClass}`}
              >
                <achievement.icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[12px] leading-4 font-bold truncate ${achievement.unlocked ? "text-white" : "text-[#45556c]"}`}
                >
                  {achievement.title}
                </p>
                <p className="text-[10px] leading-[15px] text-[#62748e] truncate flex items-center gap-1">
                  {achievement.subtitle}
                  {achievement.percent != null && (
                    <span className="text-[#ffb900]">
                      ({achievement.percent}%)
                    </span>
                  )}
                </p>
              </div>
              {achievement.unlocked && (
                <Check size={14} className="text-[#00d492]" />
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[16px] px-5 py-5 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
        <h3 className="text-white text-[24px] font-bold flex items-center gap-2 mb-3">
          <Zap size={18} className="text-[#00d3f3]" /> Actividad Reciente
        </h3>

        <div className="space-y-1.5">
          {recentActivity.length === 0 && (
            <div className="h-[120px] flex items-center justify-center text-[#62748e] text-[12px]">
              Sin datos de actividad reciente disponibles
            </div>
          )}
          {recentActivity.map((item, index) => {
            const playTone = item.tone === "play";
            return (
              <div
                key={`${item.name}-${index}`}
                className="relative pl-10 pr-2 py-2 min-h-[69px]"
              >
                {index < recentActivity.length - 1 && (
                  <span className="absolute left-[20px] top-[36px] bottom-[-6px] w-px bg-[#1d293d]" />
                )}
                <span
                  className={`absolute left-2 top-2.5 w-7 h-7 rounded-[10px] flex items-center justify-center border ${
                    playTone
                      ? "bg-[rgba(43,127,255,0.1)] border-[rgba(43,127,255,0.25)]"
                      : "bg-[rgba(254,154,0,0.1)] border-[rgba(254,154,0,0.25)]"
                  }`}
                >
                  {playTone ? (
                    <Gamepad2 size={14} className="text-[#51a2ff]" />
                  ) : (
                    <Trophy size={14} className="text-[#ffb900]" />
                  )}
                </span>
                <p className="text-[12px] text-[#51a2ff] font-semibold truncate">
                  {item.name}
                </p>
                <p className="text-[11px] text-[#90a1b9] truncate">
                  {item.action}
                </p>
                <p className="text-[10px] text-[#62748e] mt-1">{item.when}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[16px] px-5 py-5 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white text-[24px] font-bold flex items-center gap-2">
            <Gamepad2 size={18} className="text-[#8b5cf6]" /> Biblioteca
            Completa
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
                className={`h-[23px] px-[10px] rounded-[8px] text-[10px] font-medium transition-colors ${
                  libraryFilter === tab.id
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
            Sin juegos disponibles en la biblioteca
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {libraryRows.map((game) => {
              const gameHours = hoursFromMinutes(game.playtime);
              const gamePercentage =
                totalHours > 0 ? Math.round((gameHours / totalHours) * 100) : 0;
              const lastPlayedLabel = relativeLabel(game.lastPlayed, "Nunca");

              return (
                <Link
                  key={game.appId}
                  to={`/game/${game.appId}`}
                  className="group relative rounded-[14px] overflow-hidden border border-[#1d293d] hover:border-[#2b5cb4] transition-all duration-300 hover:shadow-[0px_0px_20px_rgba(43,127,255,0.3)]"
                >
                  <div className="aspect-square relative overflow-hidden bg-[#162032]">
                    <img
                      src={gameImage(game.appId, game.icon)}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (game.icon) target.src = game.icon;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020618] via-[rgba(2,6,24,0.4)] to-transparent" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <p className="text-white text-[12px] sm:text-[13px] font-bold leading-tight truncate mb-2">
                      {game.name}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#90a1b9] flex items-center gap-1">
                          <Clock size={12} className="text-[#51a2ff]" />
                          {gameHours}h jugadas
                        </span>
                      </div>

                      {gameHours > 0 && (
                        <div className="w-full h-1.5 bg-[rgba(29,41,61,0.6)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#51a2ff] to-[#00b8db] rounded-full"
                            style={{ width: `${gamePercentage}%` }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-[#62748e]">
                          {gamePercentage}% del total
                        </span>
                        <span className="text-[9px] text-[#45556c]">
                          {lastPlayedLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-[rgba(15,23,43,0.8)] border border-[#1d293d] rounded-[16px] px-5 py-5 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-[24px] font-bold flex items-center gap-2">
            <Sparkles size={18} className="text-[#51a2ff]" /> Identidad y Firma
          </h3>
          <span className="bg-[#1d293d] rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.5px] text-[#62748e]">
            INSIGHTS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <article className="relative overflow-hidden rounded-[14px] border border-[#1d293d] bg-[rgba(8,14,28,0.9)] p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0c1b35] via-[#0f172b] to-[#1a1235] opacity-80" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.45px] text-[#94a3b8]">
                <span className="text-[16px]">{gamerIdentity.emoji}</span>
                Identidad gamer
              </div>
              <p className="mt-2 text-[22px] font-bold text-white">
                {gamerIdentity.label}
              </p>
              <p className="mt-1 text-[12px] text-[#90a1b9]">
                {gamerIdentity.detail}
              </p>
              <p className="text-[10px] text-[#64748b]">{gamerIdentity.hint}</p>
              {gamerIdentity.pct > 0 && (
                <div className="mt-3 h-1.5 bg-[#1d293d] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#51a2ff] to-[#00b8db]"
                    style={{ width: `${Math.min(100, gamerIdentity.pct)}%` }}
                  />
                </div>
              )}
            </div>
          </article>

          <article className="relative overflow-hidden rounded-[14px] border border-[#1d293d] bg-[rgba(8,14,28,0.9)] p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1b2f] via-[#121826] to-[#22102a] opacity-80" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.45px] text-[#94a3b8]">
                <Trophy size={14} className="text-[#ffb900]" /> Juego firma
              </div>
              <p className="mt-2 text-[20px] font-bold text-white truncate">
                {signatureTitle}
              </p>
              <p className="mt-1 text-[12px] text-[#90a1b9]">
                {signatureDetail}
              </p>
              <p className="text-[10px] text-[#64748b]">{signatureSub}</p>
              {signatureGame && (
                <div className="mt-3 h-1.5 bg-[#1d293d] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ffb900] to-[#ff637e]"
                    style={{ width: `${Math.min(100, signaturePct)}%` }}
                  />
                </div>
              )}
            </div>
          </article>

          <article className="relative overflow-hidden rounded-[14px] border border-[#1d293d] bg-[rgba(8,14,28,0.9)] p-4">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${dominance.tone} opacity-80`}
            />
            <div className="relative">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.45px] text-[#94a3b8]">
                <Target size={14} className="text-[#00d492]" /> Dominio de
                biblioteca
              </div>
              <p className="mt-2 text-[20px] font-bold text-white">
                {dominance.label}
              </p>
              <p className="mt-1 text-[12px] text-[#90a1b9]">
                {dominanceSummary}
              </p>
              <p className="text-[10px] text-[#64748b]">{dominance.detail}</p>
              {totalHours > 0 && (
                <div className="mt-3 h-1.5 bg-[#1d293d] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00d492] to-[#51a2ff]"
                    style={{ width: `${Math.min(100, concentrationPct)}%` }}
                  />
                </div>
              )}
            </div>
          </article>

          <article className="relative overflow-hidden rounded-[14px] border border-[#1d293d] bg-[rgba(8,14,28,0.9)] p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-[#10263f] via-[#0f172b] to-[#0b2238] opacity-80" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.45px] text-[#94a3b8]">
                <Zap size={14} className="text-[#00d3f3]" /> Racha reciente
              </div>
              <p className="mt-2 text-[20px] font-bold text-white">
                {recentSummary}
              </p>
              <p className="mt-1 text-[12px] text-[#90a1b9]">{recentDetail}</p>
              <p className="text-[10px] text-[#64748b]">
                {recentMinutes > 0
                  ? "Actividad basada en las ultimas 2 semanas"
                  : "No se detecta actividad reciente"}
              </p>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-[14px] border border-[#1d293d] bg-[rgba(8,14,28,0.9)] p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0f1c33] via-[#0f172b] to-[#1b1f32] opacity-80" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.45px] text-[#94a3b8]">
                <Clock size={14} className="text-[#51a2ff]" /> Ultimo juego
                jugado
              </div>
              <p className="mt-2 text-[20px] font-bold text-white truncate">
                {lastPlayedTitle}
              </p>
              <p className="mt-1 text-[12px] text-[#90a1b9]">
                {lastPlayedDetail}
              </p>
              <p className="text-[10px] text-[#64748b]">
                {lastPlayedGame
                  ? "Se actualiza con Steam cuando hay actividad"
                  : "Sin datos recientes disponibles"}
              </p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
